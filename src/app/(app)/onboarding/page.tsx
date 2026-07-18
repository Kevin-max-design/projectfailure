'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight, ArrowLeft, Plus, X, HeartPulse } from 'lucide-react';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form Fields
  const [fullName, setFullName] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_name') || '' : ''
  );
  const [dob, setDob] = useState('1985-05-12');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O Positive');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [emergencyName, setEmergencyName] = useState('Priya Rao');
  const [emergencyPhone, setEmergencyPhone] = useState('+1 (555) 019-2835');

  // Multi-value list states
  const [allergies, setAllergies] = useState<string[]>(['Penicillin']);
  const [newAllergy, setNewAllergy] = useState('');
  
  const [chronicConditions, setChronicConditions] = useState<string[]>(['Type 2 Diabetes Mellitus']);
  const [newCondition, setNewCondition] = useState('');

  const [medications, setMedications] = useState<string[]>(['Metformin 500mg twice daily']);
  const [newMedication, setNewMedication] = useState('');

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    if (newCondition.trim() && !chronicConditions.includes(newCondition.trim())) {
      setChronicConditions([...chronicConditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const handleRemoveCondition = (index: number) => {
    setChronicConditions(chronicConditions.filter((_, i) => i !== index));
  };

  const handleAddMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()]);
      setNewMedication('');
    }
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleCompleteOnboarding = async () => {
    if (submitting) return;
    setSubmitting(true);

    if (isDemoMode()) {
      // Save details locally in mock database format
      if (typeof window !== 'undefined') {
        const patientProfile = {
          id: '00000000-0000-0000-0000-000000000001',
          fullName: fullName || 'Arjun Rao',
          dateOfBirth: dob,
          gender,
          bloodGroup,
          phone,
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
          knownAllergies: allergies,
          knownChronicConditions: chronicConditions,
          currentLongTermMedications: medications,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('medmemory_patient_profile', JSON.stringify(patientProfile));
        localStorage.setItem('medmemory_patient_name', patientProfile.fullName);
        localStorage.setItem('medmemory_onboarded', 'true');
      }

      router.push('/app/dashboard');
    } else {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // 1. Insert patient profile
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .insert({
            user_id: user.id,
            full_name: fullName || user.user_metadata?.full_name || 'Patient',
            date_of_birth: dob,
            gender,
            blood_group: bloodGroup,
            phone,
            emergency_contact_name: emergencyName,
            emergency_contact_phone: emergencyPhone,
            known_allergies: allergies,
            known_chronic_conditions: chronicConditions,
            current_long_term_medications: medications
          })
          .select('id')
          .single();

        if (patientError) {
          console.error('Error inserting patient profile:', patientError);
          alert('Failed to save profile: ' + patientError.message);
          setSubmitting(false);
          return;
        }

        // 2. Initialize emergency profile configuration in DB
        const { error: configError } = await supabase
          .from('emergency_profile_config')
          .insert({
            patient_id: patient.id,
            show_name: true,
            show_blood_group: true,
            show_allergies: true,
            show_conditions: true,
            show_medications: true,
            show_contact: true,
            show_surgeries: true,
            show_hospitalizations: true
          });

        if (configError) {
          console.error('Error creating emergency profile config:', configError);
        }

        // 3. Save details locally
        if (typeof window !== 'undefined') {
          localStorage.setItem('medmemory_patient_id', patient.id);
          localStorage.setItem('medmemory_patient_name', fullName);
          localStorage.setItem('medmemory_onboarded', 'true');
        }

        router.push('/app/dashboard');
      } catch (err: any) {
        console.error('Onboarding submission error:', err);
        alert('An unexpected error occurred: ' + err.message);
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl"></div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mb-8">
          <div 
            className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Logo / Header */}
        <div className="flex items-center space-x-2 text-teal-600 mb-6">
          <HeartPulse className="h-6 w-6" />
          <span className="font-bold tracking-wider uppercase text-xs">Profile Setup — Step {step} of 3</span>
        </div>

        {/* Step 1: Personal Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Basic Information</h2>
              <p className="text-slate-500 text-sm mt-1">Let's start with your standard health profile details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                  placeholder="Arjun Rao"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gender (Optional)</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Blood Group (Optional)</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                >
                  <option value="A Positive">A+</option>
                  <option value="A Negative">A-</option>
                  <option value="B Positive">B+</option>
                  <option value="B Negative">B-</option>
                  <option value="AB Positive">AB+</option>
                  <option value="AB Negative">AB-</option>
                  <option value="O Positive">O+</option>
                  <option value="O Negative">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                  placeholder="+1 (555) 019-2834"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Emergency Contact */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Emergency Contacts</h2>
              <p className="text-slate-500 text-sm mt-1">This will be prominently displayed on your emergency summary page.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                  placeholder="Priya Rao"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact Phone Number</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
                  placeholder="+1 (555) 019-2835"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Medical Summary */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Current Health Conditions</h2>
              <p className="text-slate-500 text-sm mt-1">Manually entered details are tracked as "patient_reported" source type.</p>
            </div>

            <div className="space-y-4">
              {/* Allergies */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Known Allergies</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
                    className="block flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="e.g. Penicillin, Peanuts"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((allergy, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold">
                      {allergy}
                      <button type="button" onClick={() => handleRemoveAllergy(i)} className="ml-1 text-red-500 hover:text-red-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {allergies.length === 0 && <span className="text-xs text-slate-400">No allergies listed.</span>}
                </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chronic/Known Conditions</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition())}
                    className="block flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="e.g. Hypertension, Asthma"
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {chronicConditions.map((cond, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold">
                      {cond}
                      <button type="button" onClick={() => handleRemoveCondition(i)} className="ml-1 text-amber-500 hover:text-amber-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {chronicConditions.length === 0 && <span className="text-xs text-slate-400">No chronic conditions listed.</span>}
                </div>
              </div>

              {/* Long term medications */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Long-term Medications</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedication())}
                    className="block flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="e.g. Metformin 500mg daily"
                  />
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {medications.map((med, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{med}</span>
                      <button type="button" onClick={() => handleRemoveMedication(i)} className="text-slate-400 hover:text-[#ef4444] transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {medications.length === 0 && <span className="text-xs text-slate-400">No long-term medications listed.</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-10 border-t border-slate-100 dark:border-slate-800 pt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-teal-500/10"
            >
              Next Step
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCompleteOnboarding}
              disabled={submitting}
              className="inline-flex items-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-teal-500/10 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Complete Setup'}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
