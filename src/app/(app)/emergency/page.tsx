'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  QrCode, 
  RefreshCw, 
  Check, 
  Copy, 
  Plus, 
  X, 
  User, 
  Phone,
  FileText,
  AlertTriangle,
  ExternalLink,
  Save,
  CheckCircle,
  ToggleLeft,
  Settings
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb, DEMO_PATIENT } from '@/lib/supabase/service';
import { formatDate } from '@/lib/utils';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';

export default function EmergencySummaryPage() {
  const [patient, setPatient] = useState<any>(null);
  const [accessEnabled, setAccessEnabled] = useState(true);
  const [token, setToken] = useState('demo-active-token-12345');
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Disclosure config state
  const [config, setConfig] = useState({
    show_name: true,
    show_blood_group: true,
    show_allergies: true,
    show_conditions: true,
    show_medications: true,
    show_contact: true,
    show_surgeries: true,
    show_hospitalizations: true
  });

  // Manual inputs state
  const [manualBloodGroup, setManualBloodGroup] = useState('');
  const [manualAllergy, setManualAllergy] = useState('');
  const [manualCondition, setManualCondition] = useState('');
  const [manualMedication, setManualMedication] = useState('');
  const [manualContactName, setManualContactName] = useState('');
  const [manualContactPhone, setManualContactPhone] = useState('');

  // Save alerts
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadEmergencyData();
  }, []);

  const loadEmergencyData = async () => {
    if (isDemoMode()) {
      const storedProfile = localStorage.getItem('medmemory_patient_profile');
      const p = storedProfile ? JSON.parse(storedProfile) : DEMO_PATIENT;
      setPatient(p);

      // Load manual inputs
      setManualBloodGroup(p.bloodGroup || '');
      setManualContactName(p.emergencyContactName || '');
      setManualContactPhone(p.emergencyContactPhone || '');

      const enabled = localStorage.getItem('medmemory_emergency_enabled') !== 'false';
      setAccessEnabled(enabled);

      const savedToken = localStorage.getItem('medmemory_emergency_token') || 'demo-active-token-12345';
      setToken(savedToken);

      const localConfig = localStorage.getItem('medmemory_emergency_config');
      if (localConfig) {
        setConfig(JSON.parse(localConfig));
      }

      setLastUpdated(new Date().toISOString());
    } else {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).single();
          if (p) {
            setPatient({
              id: p.id,
              fullName: p.full_name,
              dateOfBirth: p.date_of_birth,
              gender: p.gender,
              bloodGroup: p.blood_group,
              phone: p.phone,
              emergencyContactName: p.emergency_contact_name,
              emergencyContactPhone: p.emergency_contact_phone,
              knownAllergies: p.known_allergies || [],
              knownChronicConditions: p.known_chronic_conditions || [],
              currentLongTermMedications: p.current_long_term_medications || []
            });
            setManualBloodGroup(p.blood_group || '');
            setManualContactName(p.emergency_contact_name || '');
            setManualContactPhone(p.emergency_contact_phone || '');
          }

          // Load token
          const { data: tok } = await supabase
            .from('emergency_access_tokens')
            .select('*')
            .eq('patient_id', p.id)
            .single();
          if (tok) {
            setToken(tok.token);
            setAccessEnabled(tok.is_enabled);
          }

          // Load config
          const { data: cfg } = await supabase
            .from('emergency_profile_config')
            .select('*')
            .eq('patient_id', p.id)
            .single();
          if (cfg) {
            setConfig({
              show_name: cfg.show_name,
              show_blood_group: cfg.show_blood_group,
              show_allergies: cfg.show_allergies,
              show_conditions: cfg.show_conditions,
              show_medications: cfg.show_medications,
              show_contact: cfg.show_contact,
              show_surgeries: cfg.show_surgeries,
              show_hospitalizations: cfg.show_hospitalizations
            });
          }
        }
      } catch (err) {
        console.error('Error loading emergency summary data:', err);
      }
    }
  };

  const handleToggleAccess = async () => {
    const newState = !accessEnabled;
    setAccessEnabled(newState);
    if (isDemoMode()) {
      localStorage.setItem('medmemory_emergency_enabled', newState.toString());
      mockDb.query('emergency_access_tokens').update({ is_enabled: newState }).eq('token', token);
    } else {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('emergency_access_tokens')
        .update({ is_enabled: newState })
        .eq('token', token);

      // Audit log
      await supabase.from('activity_logs').insert({
        patient_id: patient.id,
        action: newState ? 'emergency_access_enabled' : 'emergency_access_disabled'
      });
    }
  };

  const handleRegenerateToken = async () => {
    const newToken = `tok-${Math.random().toString(36).substring(2, 15)}`;
    setToken(newToken);
    if (isDemoMode()) {
      localStorage.setItem('medmemory_emergency_token', newToken);
      mockDb.query('emergency_access_tokens').insert({
        id: `tok-${Math.random().toString(36).substring(7)}`,
        patient_id: patient?.id || DEMO_PATIENT.id,
        token: newToken,
        is_enabled: accessEnabled,
        created_at: new Date().toISOString()
      });
    } else {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('emergency_access_tokens')
        .update({ token: newToken })
        .eq('patient_id', patient.id);

      // Audit log
      await supabase.from('activity_logs').insert({
        patient_id: patient.id,
        action: 'emergency_token_regenerated'
      });
    }
    setLastUpdated(new Date().toISOString());
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/emergency/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async () => {
    if (isDemoMode()) {
      localStorage.setItem('medmemory_emergency_config', JSON.stringify(config));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { error } = await supabase
          .from('emergency_profile_config')
          .upsert({
            patient_id: patient.id,
            show_name: config.show_name,
            show_blood_group: config.show_blood_group,
            show_allergies: config.show_allergies,
            show_conditions: config.show_conditions,
            show_medications: config.show_medications,
            show_contact: config.show_contact,
            show_surgeries: config.show_surgeries,
            show_hospitalizations: config.show_hospitalizations
          }, { onConflict: 'patient_id' });

        if (!error) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        }
      } catch (err) {
        console.error('Error saving emergency config:', err);
      }
    }
  };

  const handleAddManualItem = async (type: 'allergy' | 'condition' | 'medication') => {
    let updatedProfile = { ...patient };
    if (type === 'allergy' && manualAllergy.trim()) {
      updatedProfile.knownAllergies = [...(patient.knownAllergies || []), manualAllergy.trim()];
      setManualAllergy('');
    } else if (type === 'condition' && manualCondition.trim()) {
      updatedProfile.knownChronicConditions = [...(patient.knownChronicConditions || []), manualCondition.trim()];
      setManualCondition('');
    } else if (type === 'medication' && manualMedication.trim()) {
      updatedProfile.currentLongTermMedications = [...(patient.currentLongTermMedications || []), manualMedication.trim()];
      setManualMedication('');
    }

    setPatient(updatedProfile);

    if (isDemoMode()) {
      localStorage.setItem('medmemory_patient_profile', JSON.stringify(updatedProfile));
    } else {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('patients')
        .update({
          known_allergies: updatedProfile.knownAllergies,
          known_chronic_conditions: updatedProfile.knownChronicConditions,
          current_long_term_medications: updatedProfile.currentLongTermMedications
        })
        .eq('id', patient.id);
    }
  };

  const handleUpdateDemographics = async () => {
    let updatedProfile = { 
      ...patient,
      bloodGroup: manualBloodGroup,
      emergencyContactName: manualContactName,
      emergencyContactPhone: manualContactPhone
    };
    setPatient(updatedProfile);

    if (isDemoMode()) {
      localStorage.setItem('medmemory_patient_profile', JSON.stringify(updatedProfile));
      alert('Demographics updated successfully.');
    } else {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('patients')
        .update({
          blood_group: manualBloodGroup,
          emergency_contact_name: manualContactName,
          emergency_contact_phone: manualContactPhone
        })
        .eq('id', patient.id);
      alert('Demographics updated successfully.');
    }
  };

  const toggleConfig = (key: keyof typeof config) => {
    setConfig({
      ...config,
      [key]: !config[key]
    });
  };

  if (!patient) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Emergency Medical Identity</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Configure critical clinical summary records shared securely via emergency QR codes.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-start space-x-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-650 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 dark:text-red-400 leading-relaxed">
            <span className="font-bold">Privacy Guard:</span> Emergency information is generated from patient-approved critical summaries and may not represent the complete medical history. In an emergency, always consult qualified health professionals.
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Config & QR Code */}
          <div className="space-y-6">
            
            {/* Access Portal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-xs flex items-center uppercase tracking-wider">
                <QrCode className="h-4.5 w-4.5 text-teal-650 mr-2" />
                Emergency Access
              </h3>

              {/* Access Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Emergency Public Summary</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Allow scan access to emergency details</span>
                </div>
                <button
                  onClick={handleToggleAccess}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors ${
                    accessEnabled ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                    accessEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* QR Code and link actions */}
              {accessEnabled ? (
                <div className="flex flex-col items-center justify-center p-6 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                    <div className="h-36 w-36 bg-slate-100 flex items-center justify-center text-slate-400 relative">
                      <QrCode className="h-28 w-28 text-slate-800" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-3 font-semibold">Scan to load Emergency Medical ID</span>

                  <div className="flex space-x-2 mt-5 w-full">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 inline-flex items-center justify-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors space-x-1.5"
                    >
                      {copied ? <Check className="h-4 w-4 text-teal-650" /> : <Copy className="h-4 w-4" />}
                      <span>{copied ? 'Copied' : 'Copy Link'}</span>
                    </button>

                    <button
                      onClick={handleRegenerateToken}
                      className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-450"
                      title="Regenerate token (Revokes old QR)"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center bg-slate-50/50">
                  <ShieldAlert className="h-12 w-12 text-slate-350 dark:text-slate-650 mb-3" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Access Deactivated</span>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                    Enable the toggle above to configure public emergency scanning options.
                  </p>
                </div>
              )}
            </div>

            {/* Disclosure Preferences */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-slate-850 dark:text-slate-205 text-xs flex items-center uppercase tracking-wider">
                <Settings className="h-4.5 w-4.5 text-teal-650 mr-2" />
                Disclosure settings
              </h3>
              
              <div className="space-y-3 text-xs">
                {Object.keys(config).map((key) => {
                  const label = key.replace('show_', '').replace('_', ' ');
                  const checked = (config as any)[key];
                  return (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800 pb-2">
                      <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                      <button
                        onClick={() => toggleConfig(key as any)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                          checked ? 'bg-teal-600' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                          checked ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full mt-2 py-2 bg-teal-655 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle className="h-4.5 w-4.5 mr-1" />
                    <span>Preferences Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5 mr-1" />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Column 2: Clinical Summary Preferences & Manual entries */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active summary preview details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-805 dark:text-slate-200 text-xs flex items-center uppercase tracking-wider">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-600 mr-2 animate-pulse" />
                  Active Emergency Card summary
                </h3>
                {accessEnabled && (
                  <Link
                    href={`/emergency/${token}`}
                    target="_blank"
                    className="text-[10px] text-teal-650 hover:underline flex items-center font-bold"
                  >
                    Preview Portal
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                )}
              </div>

              {/* Demographics update form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Blood Group</label>
                  <select
                    value={manualBloodGroup}
                    onChange={(e) => setManualBloodGroup(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-xs"
                  >
                    <option value="">Unknown</option>
                    <option value="A Positive">A+</option>
                    <option value="A Negative">A-</option>
                    <option value="B Positive">B+</option>
                    <option value="B Negative">B-</option>
                    <option value="AB Positive">AB+</option>
                    <option value="AB Negative">AB-</option>
                    <option value="O Positive">O+</option>
                    <option value="O Negative">O-</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={manualContactName}
                      onChange={(e) => setManualContactName(e.target.value)}
                      placeholder="Name"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={manualContactPhone}
                      onChange={(e) => setManualContactPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-b border-slate-50 dark:border-slate-800 pb-4">
                <button
                  onClick={handleUpdateDemographics}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors"
                >
                  Save Demographics
                </button>
              </div>

              {/* Diagnostic data view with Manual entry additions */}
              <div className="space-y-6 text-xs">
                
                {/* 1. Critical Allergies */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Critical Allergies</span>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.knownAllergies?.map((alg: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-full font-bold flex items-center">
                        {alg}
                        <span className="text-[8px] ml-1 bg-slate-100 text-slate-500 dark:bg-slate-800 px-1 py-0.2 rounded font-normal uppercase">Patient Entered</span>
                      </span>
                    ))}
                    {!patient.knownAllergies?.length && <span className="text-slate-400 italic">None reported</span>}
                  </div>
                  <div className="flex space-x-2 pt-1 max-w-sm">
                    <input
                      type="text"
                      value={manualAllergy}
                      onChange={(e) => setManualAllergy(e.target.value)}
                      placeholder="Add manual allergy..."
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px]"
                    />
                    <button
                      onClick={() => handleAddManualItem('allergy')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 2. Chronic Conditions */}
                <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                  <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block">Chronic Conditions</span>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.knownChronicConditions?.map((cond: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full font-bold flex items-center">
                        {cond}
                        <span className="text-[8px] ml-1 bg-slate-100 text-slate-505 dark:bg-slate-800 px-1 py-0.2 rounded font-normal uppercase">Patient Entered</span>
                      </span>
                    ))}
                    {!patient.knownChronicConditions?.length && <span className="text-slate-400 italic">None reported</span>}
                  </div>
                  <div className="flex space-x-2 pt-1 max-w-sm">
                    <input
                      type="text"
                      value={manualCondition}
                      onChange={(e) => setManualCondition(e.target.value)}
                      placeholder="Add chronic condition..."
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px]"
                    />
                    <button
                      onClick={() => handleAddManualItem('condition')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 3. Critical medications */}
                <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Critical Medications</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {patient.currentLongTermMedications?.map((med: string, i: number) => (
                      <div key={i} className="p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg font-bold text-slate-705 dark:text-slate-350 flex justify-between items-center">
                        <span>{med}</span>
                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded font-normal uppercase">Patient Entered</span>
                      </div>
                    ))}
                    {!patient.currentLongTermMedications?.length && <span className="text-slate-400 italic">None reported</span>}
                  </div>
                  <div className="flex space-x-2 pt-2 max-w-sm">
                    <input
                      type="text"
                      value={manualMedication}
                      onChange={(e) => setManualMedication(e.target.value)}
                      placeholder="Add critical daily medication..."
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px]"
                    />
                    <button
                      onClick={() => handleAddManualItem('medication')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}
