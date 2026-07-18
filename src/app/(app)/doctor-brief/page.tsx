'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  ArrowRight, 
  Clock, 
  ShieldAlert, 
  ChevronRight,
  Printer
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb } from '@/lib/supabase/service';
import { formatDate } from '@/lib/utils';
import { isDemoMode } from '@/lib/mode';

export default function DoctorBriefsListPage() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBriefs();
  }, []);

  const loadBriefs = async () => {
    if (isDemoMode()) {
      const res = mockDb.query('doctor_briefs').select().order('generated_at', { ascending: false });
      setBriefs(res.data || []);
      setLoading(false);
    } else {
      try {
        const res = await fetch('/api/doctor-brief');
        if (res.ok) {
          const data = await res.json();
          setBriefs(data || []);
        }
      } catch (err) {
        console.error('Failed to load doctor briefs:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Doctor Briefs & Handoffs</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Concise summaries of your medical history prepared for new health professionals.
            </p>
          </div>
          <Link
            href="/app/help"
            className="inline-flex items-center px-4 py-2.5 bg-teal-655 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Handoff Brief
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {briefs.map((brief) => {
              const content = brief.structured_content;
              const reason = content?.currentReason?.category || 'Routine checkup';
              const date = brief.generated_at || brief.created_at;

              return (
                <Link
                  key={brief.id}
                  href={`/app/doctor-brief/${brief.id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl hover:border-teal-500/50 shadow-sm flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-xl">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 transition-colors">
                        Brief for: {reason}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Generated on {formatDate(date)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              );
            })}

            {briefs.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 shadow-sm">
                <FileText className="h-12 w-12 text-slate-350 dark:text-slate-650 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">No Doctor Briefs yet</h3>
                  <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
                    Generate a doctor brief by outlining your current symptoms in the help portal.
                  </p>
                </div>
                <Link
                  href="/app/help"
                  className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Generate First Brief
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
