import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Resolve emergency token
    const { data: accessToken, error: tokenErr } = await supabase
      .from('emergency_access_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenErr || !accessToken) {
      return NextResponse.json({ error: 'Emergency access token invalid' }, { status: 404 });
    }

    // 2. Check activation state and expiration
    const isExpired = accessToken.expires_at && new Date(accessToken.expires_at) < new Date();
    if (!accessToken.is_enabled || isExpired) {
      return NextResponse.json({ error: 'Emergency access is deactivated or expired' }, { status: 403 });
    }

    // 3. Fetch patient profile details
    const { data: patient, error: patientErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', accessToken.patient_id)
      .single();

    if (patientErr || !patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // 4. Fetch patient disclosure config
    const { data: config } = await supabase
      .from('emergency_profile_config')
      .select('*')
      .eq('patient_id', accessToken.patient_id)
      .single();

    // Default configuration if missing
    const showConfig = config || {
      show_name: true,
      show_blood_group: true,
      show_allergies: true,
      show_conditions: true,
      show_medications: true,
      show_contact: true
    };

    // 5. Build response details with explicit provenance
    const responseData: Record<string, any> = {
      lastUpdated: patient.updated_at,
      dateOfBirth: patient.date_of_birth
    };

    // Name
    if (showConfig.show_name) {
      responseData.fullName = patient.full_name;
    } else {
      responseData.fullName = 'Redacted / Hidden';
    }

    // Emergency contact
    if (showConfig.show_contact) {
      responseData.emergencyContactName = patient.emergency_contact_name;
      responseData.emergencyContactPhone = patient.emergency_contact_phone;
    }

    // Blood Group (check for conflicts between manual entry and verified labs if available)
    if (showConfig.show_blood_group) {
      const manualBloodGroup = patient.blood_group;
      
      // Fetch any verified lab result that mentions blood group or ABO
      const { data: bloodLabs } = await supabase
        .from('lab_results')
        .select('value')
        .eq('patient_id', patient.id)
        .eq('verification_status', 'verified')
        .or('test_name.ilike.%blood type%,test_name.ilike.%abo%,test_name.ilike.%blood group%');

      const verifiedBloodGroup = bloodLabs && bloodLabs.length > 0 ? bloodLabs[0].value : null;

      if (manualBloodGroup && verifiedBloodGroup && manualBloodGroup.trim().toLowerCase() !== verifiedBloodGroup.trim().toLowerCase()) {
        // Conflict detected!
        responseData.bloodGroup = {
          value: `${manualBloodGroup} (Manual) / ${verifiedBloodGroup} (Lab)`,
          provenance: 'conflict',
          message: 'Conflict warning: Patient-reported and lab-verified blood types do not match.'
        };
      } else if (verifiedBloodGroup) {
        responseData.bloodGroup = {
          value: verifiedBloodGroup,
          provenance: 'document-verified'
        };
      } else if (manualBloodGroup) {
        responseData.bloodGroup = {
          value: manualBloodGroup,
          provenance: 'patient-entered'
        };
      } else {
        responseData.bloodGroup = {
          value: 'Unknown',
          provenance: 'unknown'
        };
      }
    } else {
      responseData.bloodGroup = {
        value: 'Redacted / Hidden',
        provenance: 'redacted'
      };
    }

    // Allergies
    if (showConfig.show_allergies) {
      // In MedMemory, allergies are recorded in patients.known_allergies
      const manualAllergies = patient.known_allergies || [];
      responseData.knownAllergies = manualAllergies.map((alg: string) => ({
        value: alg,
        provenance: 'patient-entered'
      }));
    } else {
      responseData.knownAllergies = [];
    }

    // Chronic Conditions
    if (showConfig.show_conditions) {
      const manualConditions = patient.known_chronic_conditions || [];
      const list = manualConditions.map((cond: string) => ({
        value: cond,
        provenance: 'patient-entered'
      }));

      // Append verified chronic diagnoses
      const { data: verifiedDx } = await supabase
        .from('diagnoses')
        .select('name')
        .eq('patient_id', patient.id)
        .eq('verification_status', 'verified')
        .eq('is_chronic', true);

      if (verifiedDx) {
        verifiedDx.forEach((dx: any) => {
          if (!manualConditions.includes(dx.name)) {
            list.push({
              value: dx.name,
              provenance: 'document-verified'
            });
          }
        });
      }

      responseData.knownChronicConditions = list;
    } else {
      responseData.knownChronicConditions = [];
    }

    // Medications (Only return active daily medications, filter historical)
    if (showConfig.show_medications) {
      const manualMeds = patient.current_long_term_medications || [];
      const list = manualMeds.map((med: string) => ({
        value: med,
        provenance: 'patient-entered'
      }));

      // Fetch verified medications
      const { data: verifiedMeds } = await supabase
        .from('medications')
        .select('medicine_name, strength, dosage, end_date')
        .eq('patient_id', patient.id)
        .eq('verification_status', 'verified');

      if (verifiedMeds) {
        verifiedMeds.forEach((med: any) => {
          // Check if active
          const isHistorical = med.end_date && new Date(med.end_date) < new Date();
          if (!isHistorical) {
            const medDesc = `${med.medicine_name} ${med.strength || ''}`.trim();
            if (!manualMeds.includes(med.medicine_name) && !manualMeds.includes(medDesc)) {
              list.push({
                value: medDesc,
                provenance: 'document-verified'
              });
            }
          }
        });
      }

      responseData.currentLongTermMedications = list;
    } else {
      responseData.currentLongTermMedications = [];
    }

    // 6. Log audit log
    await supabase.from('activity_logs').insert({
      patient_id: accessToken.patient_id,
      action: 'emergency_profile_viewed',
      details: { token_id: accessToken.id }
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error in public emergency resolver:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
