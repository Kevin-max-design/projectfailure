'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Activity, 
  ShieldAlert, 
  CheckCircle,
  Clock,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb, DEMO_PATIENT } from '@/lib/supabase/service';
import { isDemoMode } from '@/lib/mode';

export default function HelpIntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState<string>('');

  // Form State
  const [reasonCategory, setReasonCategory] = useState('Sudden illness');
  const [problemLocation, setProblemLocation] = useState('Abdomen');
  const [onset, setOnset] = useState('1–6 hours');
  const [severity, setSeverity] = useState('Moderate');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [patientDescription, setPatientDescription] = useState('');
  const [customOnset, setCustomOnset] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  useEffect(() => {
    if (isDemoMode()) {
      setPatientId(DEMO_PATIENT.id);
    } else {
      resolvePatient();
    }
  }, []);

  const resolvePatient = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (patient) {
          setPatientId(patient.id);
        }
      }
    } catch (err) {
      console.error('Error resolving patient for help intake:', err);
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleSkipToEmergency = () => {
    // Redirect directly to the emergency QR code/ID portal
    router.push('/app/emergency');
  };

  const handleSubmit = async () => {
    setLoading(true);
    const finalLocation = problemLocation === 'Other' ? customLocation : problemLocation;
    const finalOnset = onset === 'Custom' ? customOnset : onset;

    const payload = {
      reason_category: reasonCategory,
      problem_location: finalLocation || null,
      onset: finalOnset || 'Unknown',
      severity: severity,
      patient_description: patientDescription,
      selected_symptoms: selectedSymptoms,
      language: 'en'
    };

    if (isDemoMode()) {
      // 1. Save to mockDb help sessions
      const sessionResult = mockDb.query('medical_help_sessions').insert({
        id: `sess-${Math.random().toString(36).substring(2, 10)}`,
        patient_id: patientId || DEMO_PATIENT.id,
        started_at: new Date().toISOString(),
        status: 'completed',
        ...payload
      });

      const session = sessionResult.data[0];

      // 2. Fetch relevant history deterministically from mock DB
      // Simulate retrieving prior records
      const diagnoses = mockDb.query('diagnoses').select().eq('patient_id', patientId || DEMO_PATIENT.id).data || [];
      const medications = mockDb.query('medications').select().eq('patient_id', patientId || DEMO_PATIENT.id).data || [];
      const labResults = mockDb.query('lab_results').select().eq('patient_id', patientId || DEMO_PATIENT.id).data || [];
      const procedures = mockDb.query('procedures').select().eq('patient_id', patientId || DEMO_PATIENT.id).data || [];

      // Heuristic relevant selector for demo/mock
      const searchString = `${payload.reason_category} ${payload.problem_location || ''} ${payload.selected_symptoms.join(' ')} ${payload.patient_description}`.toLowerCase();
      const isAbdomen = searchString.includes('abdomen') || searchString.includes('pancreas') || searchString.includes('stomach') || searchString.includes('vomit') || searchString.includes('digest');
      const isChest = searchString.includes('chest') || searchString.includes('heart') || searchString.includes('breath') || searchString.includes('lung') || searchString.includes('cough');
      
      const filteredDx = diagnoses.filter((d: any) => {
        const txt = d.name.toLowerCase();
        if (isAbdomen && (txt.includes('pancrea') || txt.includes('diabet'))) return true;
        if (isChest && (txt.includes('hyper') || txt.includes('heart') || txt.includes('lung'))) return true;
        return false;
      });

      const filteredMeds = medications.filter((m: any) => {
        const isHistorical = m.end_date && new Date(m.end_date) < new Date();
        if (isHistorical) return false;
        return true; // Keep active
      });

      const filteredLabs = labResults.filter((l: any) => {
        const txt = l.test_name.toLowerCase();
        if (isAbdomen && (txt.includes('amylase') || txt.includes('lipase') || txt.includes('hba1c'))) return true;
        return false;
      });

      const filteredProcs = procedures.filter((p: any) => {
        const txt = p.name.toLowerCase();
        if (isAbdomen && txt.includes('ct abdomen')) return true;
        return false;
      });

      const structuredRecords = [
        ...filteredDx.map(d => ({
          title: d.name,
          date: d.event_date || '2026-05-12',
          details: d.notes || 'Prior documentation.',
          relevanceExplanation: 'Retrieved because this prior record involves the abdomen.',
          sourceDocumentId: d.source_document_id || 'pancreatitis-discharge-2026',
          sourcePage: d.source_page || 1,
          sourceText: d.source_text || 'Final Diagnosis: Acute Pancreatitis'
        })),
        ...filteredProcs.map(p => ({
          title: p.name,
          date: p.date || '2026-05-10',
          details: p.notes || 'Procedure details.',
          relevanceExplanation: 'Retrieved because this imaging involved the abdominal cavities.',
          sourceDocumentId: p.source_document_id || 'pancreatitis-discharge-2026',
          sourcePage: p.source_page || 1,
          sourceText: p.source_text || 'CECT Abdomen: Pancreas'
        }))
      ];

      const medicationsList = filteredMeds.map(m => ({
        name: m.medicine_name,
        details: `${m.strength || ''} ${m.dosage || ''} ${m.frequency || ''}`.trim(),
        provenance: 'verified' as const
      }));

      const labsList = filteredLabs.map(l => ({
        title: l.test_name,
        date: l.test_date || '2026-05-10',
        details: `Value: ${l.value} ${l.unit || ''} (Ref: ${l.reference_range || ''})`,
        sourceDocumentId: l.source_document_id || 'pancreatitis-discharge-2026'
      }));

      const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
      const patient = storedProfile ? JSON.parse(storedProfile) : DEMO_PATIENT;
      const allergiesList = (patient.knownAllergies || []).map((a: string) => ({
        name: a,
        provenance: 'patient-entered' as const
      }));

      const mockBrief = {
        patientSummary: `Patient reported ${payload.reason_category} starting ${payload.onset} near ${payload.problem_location || 'unspecified'}. Symptoms: ${payload.selected_symptoms.join(', ') || 'none'}.`,
        currentReason: {
          category: payload.reason_category,
          onset: payload.onset,
          severity: payload.severity,
          location: payload.problem_location,
          description: payload.patient_description,
          symptoms: payload.selected_symptoms
        },
        relevantHistory: structuredRecords,
        currentMedications: medicationsList,
        allergies: allergiesList,
        relevantInvestigations: labsList,
        limitations: 'This brief summarizes information available in the patient’s MedMemory records and patient-reported information. It may not represent the patient’s complete medical history.'
      };

      // 3. Save to mockDb doctor briefs
      const briefId = `brf-${Math.random().toString(36).substring(2, 10)}`;
      mockDb.query('doctor_briefs').insert({
        id: briefId,
        patient_id: patientId || DEMO_PATIENT.id,
        medical_help_session_id: session.id,
        generated_at: new Date().toISOString(),
        structured_content: mockBrief,
        source_snapshot: structuredRecords.map(r => ({ documentId: r.sourceDocumentId, pageNumber: r.sourcePage, snippet: r.sourceText })),
        generation_method: 'deterministic'
      });

      // Update session with generated brief id
      mockDb.query('medical_help_sessions').update({ generated_brief_id: briefId }).eq('id', session.id);

      // Add activity log
      mockDb.query('activity_logs').insert({
        patient_id: patientId || DEMO_PATIENT.id,
        action: 'doctor_brief_generated',
        metadata: { brief_id: briefId }
      });

      router.push(`/app/doctor-brief/${briefId}`);
    } else {
      try {
        // Create help session
        const resSession = await fetch('/api/help-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (resSession.ok) {
          const session = await resSession.json();

          // Create doctor brief snapshot
          const resBrief = await fetch('/api/doctor-brief', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medical_help_session_id: session.id })
          });

          if (resBrief.ok) {
            const brief = await resBrief.json();
            router.push(`/app/doctor-brief/${brief.id}`);
          } else {
            const err = await resBrief.json();
            alert(`Error generating brief: ${err.error || 'Server error'}`);
          }
        } else {
          const err = await resSession.json();
          alert(`Error saving triage session: ${err.error || 'Server error'}`);
        }
      } catch (err) {
        console.error('Error submitting help request:', err);
        alert('An unexpected network error occurred.');
      }
    }
    setLoading(false);
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const categories = [
    'Sudden illness',
    'Pain',
    'Breathing problem',
    'Accident / Injury',
    'Existing condition getting worse',
    'Other'
  ];

  const locations = [
    'Head',
    'Chest',
    'Abdomen',
    'Back',
    'Arm',
    'Leg',
    'Whole body',
    'Other'
  ];

  const onsets = [
    'Just now',
    'Less than 1 hour',
    '1–6 hours',
    'Today',
    '1–3 days',
    'More than 3 days',
    'Custom'
  ];

  const severities = ['Mild', 'Moderate', 'Severe'];

  const symptomsList = [
    'Vomiting',
    'Fever',
    'Dizziness',
    'Difficulty breathing',
    'Loss of consciousness',
    'Bleeding',
    'Weakness',
    'Other'
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center md:justify-start">
            <Activity className="h-8 w-8 text-teal-650 mr-2.5" />
            I Need Medical Help
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Describe what you are experiencing to organize your relevant history for a doctor.
          </p>
        </div>

        {/* Global Urgent Notice */}
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/30 rounded-2xl p-5 flex items-start space-x-3.5 shadow-sm">
          <ShieldAlert className="h-6 w-6 text-red-650 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="text-xs font-bold text-red-800 dark:text-red-400">
              Emergency Safety Alert
            </p>
            <p className="text-xs text-red-750 dark:text-red-300 leading-relaxed">
              If you believe this may be a life-threatening medical emergency, seek emergency care immediately or contact your local emergency services. Do not delay care by filling out this form.
            </p>
            <button
              onClick={handleSkipToEmergency}
              className="inline-flex items-center text-xs font-bold text-red-650 hover:underline mt-1.5"
            >
              Skip and Show Emergency Medical ID
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-teal-600 h-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-3xl shadow-sm">
          
          {/* Step 1: What is happening? */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Step 1: What is happening?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setReasonCategory(cat)}
                    className={`p-4 rounded-xl border text-left text-xs font-bold transition-all ${
                      reasonCategory === cat
                        ? 'border-teal-500 bg-teal-50/50 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400'
                        : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Where are you feeling it? */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Step 2: Where is the problem located?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setProblemLocation(loc)}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                      problemLocation === loc
                        ? 'border-teal-500 bg-teal-50/50 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400'
                        : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              {problemLocation === 'Other' && (
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Specify Location</label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="e.g. Lower jaw, left knee"
                    className="w-full p-3 bg-slate-55 border border-slate-100 dark:bg-slate-850 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: When did it start? */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Step 3: When did it start?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {onsets.map((ons) => (
                  <button
                    key={ons}
                    type="button"
                    onClick={() => setOnset(ons)}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                      onset === ons
                        ? 'border-teal-500 bg-teal-50/50 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400'
                        : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {ons}
                  </button>
                ))}
              </div>

              {onset === 'Custom' && (
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Specify Onset Time</label>
                  <input
                    type="text"
                    value={customOnset}
                    onChange={(e) => setCustomOnset(e.target.value)}
                    placeholder="e.g. 4 hours ago, since Tuesday morning"
                    className="w-full p-3 bg-slate-55 border border-slate-100 dark:bg-slate-850 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Severity */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Step 4: How severe is the discomfort?</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                {severities.map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`flex-1 p-5 rounded-2xl border text-center text-sm font-bold transition-all ${
                      severity === sev
                        ? 'border-teal-500 bg-teal-50/50 text-teal-800 dark:bg-teal-950/20 dark:text-teal-400 shadow-sm'
                        : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Symptoms checkboxes */}
          {step === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Step 5: Any associated symptoms?</h3>
              <div className="grid grid-cols-2 gap-3">
                {symptomsList.map((sym) => {
                  const active = selectedSymptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleSymptomToggle(sym)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center space-x-2.5 ${
                        active
                          ? 'border-teal-500 bg-teal-55/30 text-teal-800 dark:bg-teal-950/20 dark:text-teal-455'
                          : 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                        active ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white dark:bg-slate-950'
                      }`}>
                        {active && <span className="text-[9px]">✓</span>}
                      </span>
                      <span>{sym}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 6: Description */}
          {step === 6 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Step 6: Anything else you want to share?</h3>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description & Context</label>
                <textarea
                  value={patientDescription}
                  onChange={(e) => setPatientDescription(e.target.value)}
                  placeholder="Describe details, triggers, or specific sensations in your own words..."
                  rows={5}
                  className="w-full p-4 bg-slate-50 border border-slate-100 dark:bg-slate-850 dark:border-slate-800 rounded-2xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Wizard Footer controls */}
          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-6 mt-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-slate-205 text-slate-600 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-4.5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Next Step
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800/40 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <span>Compile Handoff Brief</span>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </AppShell>
  );
}
