'use client';

import React, { useEffect, useState } from 'react';
import { 
  User, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Trash2, 
  Download,
  AlertTriangle,
  Mail,
  Heart
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { DEMO_PATIENT } from '@/lib/extraction/demo-data';
import { isDemoMode } from '@/lib/mode';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (isDemoMode()) {
        if (typeof window !== 'undefined') {
          const storedProfile = localStorage.getItem('medmemory_patient_profile');
          if (storedProfile) {
            setPatient(JSON.parse(storedProfile));
          } else {
            setPatient(DEMO_PATIENT);
          }
        }
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            router.push('/login');
            return;
          }

          const { data: patientData, error } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error || !patientData) {
            console.log('No patient record found for user in profile page, redirecting...');
            router.push('/app/onboarding');
            return;
          }

          setPatient({
            id: patientData.id,
            fullName: patientData.full_name,
            dateOfBirth: patientData.date_of_birth,
            gender: patientData.gender,
            bloodGroup: patientData.blood_group,
            phone: patientData.phone,
            emergencyContactName: patientData.emergency_contact_name,
            emergencyContactPhone: patientData.emergency_contact_phone,
            knownAllergies: patientData.known_allergies || [],
            knownChronicConditions: patientData.known_chronic_conditions || [],
            currentLongTermMedications: patientData.current_long_term_medications || [],
            createdAt: patientData.created_at,
            updatedAt: patientData.updated_at
          });
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      }
    };

    loadProfile();
  }, [router]);

  const handleExportData = () => {
    if (!patient) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patient, null, 2));
    const downloadAnchor = window.document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medmemory_export_${patient.fullName.replace(/\s+/g, '_')}.json`);
    window.document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteAccount = async () => {
    if (confirm('CAUTION: Are you sure you want to delete your MedMemory account? All uploaded medical documents and historical timeline records will be permanently deleted. This action cannot be undone.')) {
      if (isDemoMode()) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/register';
        }
      } else {
        try {
          const res = await fetch('/api/profile', { method: 'DELETE' });
          if (!res.ok) {
            const errData = await res.json();
            alert(errData.error || 'Failed to delete account.');
            return;
          }
          if (typeof window !== 'undefined') {
            localStorage.clear();
            window.location.href = '/register';
          }
        } catch (err) {
          console.error('Failed to delete account:', err);
          alert('Failed to delete account. Please try again.');
        }
      }
    }
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
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Profile / Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your personal profile, privacy settings, and data exports.
          </p>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center space-x-4 border-b border-slate-50 dark:border-slate-800 pb-5">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 dark:bg-teal-950/20 text-teal-650 flex items-center justify-center font-bold text-2xl">
              {patient.fullName.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{patient.fullName}</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Patient Owned Digital Record</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <h4 className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Personal Profile</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-semibold uppercase">Date of Birth</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{patient.dateOfBirth}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-semibold uppercase">Gender</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{patient.gender || 'Not specified'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Heart className="h-4.5 w-4.5 text-red-500" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-semibold uppercase">Blood Group</span>
                    <span className="font-bold text-slate-850 dark:text-white">{patient.bloodGroup || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] text-slate-405 uppercase tracking-wider font-bold">Contact Details</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-semibold uppercase">Phone Number</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{patient.phone || 'Not specified'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-semibold uppercase">Registered Email</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">arjun.rao@medmemory.demo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data & Privacy Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center">
            <ShieldCheck className="h-5 w-5 text-teal-650 mr-2" />
            Data Protection & Control Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export data */}
            <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Export Complete Health File</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Download your entire medical timeline, including verified diagnoses, allergies, and patient metadata, as a portable JSON file.
              </p>
              <button
                onClick={handleExportData}
                className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export Medical JSON
              </button>
            </div>

            {/* Account Deletion */}
            <div className="p-4 border border-red-100 dark:border-red-950/20 rounded-xl space-y-3">
              <h4 className="font-bold text-[#ef4444] text-xs">Delete MedMemory Account</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Deactivate and delete all personal health files, diagnostic summaries, and emergency QR links. This action cannot be reversed.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="inline-flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-[#ef4444] dark:bg-red-950/20 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-xs font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
