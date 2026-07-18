'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  FileText, 
  MessageSquare, 
  ShieldAlert, 
  User, 
  Menu, 
  X, 
  LogOut, 
  Heart,
  Plus,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [patientName, setPatientName] = useState('Patient');

  useEffect(() => {
    const fetchName = async () => {
      if (isDemoMode()) {
        if (typeof window !== 'undefined') {
          const storedProfile = localStorage.getItem('medmemory_patient_profile');
          if (storedProfile) {
            try {
              const parsed = JSON.parse(storedProfile);
              if (parsed.fullName) setPatientName(parsed.fullName);
            } catch {}
          }
        }
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: patient } = await supabase
              .from('patients')
              .select('full_name')
              .eq('user_id', user.id)
              .single();
            if (patient?.full_name) {
              setPatientName(patient.full_name);
            } else if (user.user_metadata?.full_name) {
              setPatientName(user.user_metadata.full_name);
            }
          }
        } catch (err) {
          console.error('Error fetching patient name for AppShell:', err);
        }
      }
    };
    fetchName();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'P';
  };

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Timeline', href: '/app/timeline', icon: Clock },
    { name: 'Documents', href: '/app/documents', icon: FileText },
    { name: 'Ask My Records', href: '/app/ask', icon: MessageSquare },
    { name: 'Get Medical Help', href: '/app/help', icon: Activity },
    { name: 'Doctor Briefs', href: '/app/doctor-brief', icon: FileText },
    { name: 'Emergency Summary', href: '/app/emergency', icon: ShieldAlert },
    { name: 'Profile / Settings', href: '/app/profile', icon: User },
  ];

  const handleLogout = async () => {
    // Clear all client-side cached data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medmemory_logged_in');
      localStorage.removeItem('medmemory_patient_id');
      localStorage.removeItem('medmemory_patient_name');
      localStorage.removeItem('medmemory_patient_email');
      localStorage.removeItem('medmemory_onboarded');
      localStorage.removeItem('medmemory_patient_profile');
      localStorage.removeItem('medmemory_seeded');
    }

    if (!isDemoMode()) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during sign out:', err);
      }
    }

    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] dark:bg-[#0f172a] dark:text-[#f8fafc] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-[#1e293b] border-r border-[#e2e8f0] dark:border-[#334155]">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center px-6 flex-shrink-0 space-x-2">
            <Heart className="h-6 w-6 text-[#0d9488]" />
            <span className="text-xl font-bold tracking-tight text-[#0f172a] dark:text-white">
              {BRAND_CONFIG.name}
            </span>
          </div>

          {/* Navigation links */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    active
                      ? 'bg-[#f0fdfa] text-[#0d9488] dark:bg-[#115e59]/30 dark:text-[#14b8a6]'
                      : 'text-[#64748b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] hover:text-[#0f172a] dark:hover:text-white',
                    'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors'
                  )}
                >
                  <item.icon
                    className={cn(
                      active ? 'text-[#0d9488] dark:text-[#14b8a6]' : 'text-[#94a3b8] group-hover:text-[#64748b]',
                      'mr-3 flex-shrink-0 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* CTA: Upload Document */}
          <div className="px-4 mb-4">
            <Link
              href="/app/documents"
              className="w-full flex items-center justify-center px-4 py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium rounded-lg shadow-sm transition-colors space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Record</span>
            </Link>
          </div>

          {/* User profile section at the bottom */}
          <div className="flex-shrink-0 flex border-t border-[#e2e8f0] dark:border-[#334155] p-4">
            <div className="flex items-center w-full justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-[#ccfbf1] dark:bg-[#115e59] flex items-center justify-center font-bold text-[#0d9488] dark:text-[#14b8a6]">
                  {getInitials(patientName)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0f172a] dark:text-white max-w-[120px] truncate">{patientName}</p>
                  <p className="text-xs text-[#64748b]">Patient Profile</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155] px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-[#0d9488]" />
          <span className="text-lg font-bold tracking-tight text-[#0f172a] dark:text-white">
            {BRAND_CONFIG.name}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-[#64748b] hover:text-[#0f172a] dark:hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="w-64 bg-white dark:bg-[#1e293b] h-full flex flex-col p-5 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2 border-b border-[#e2e8f0] dark:border-[#334155] pb-4">
              <Heart className="h-6 w-6 text-[#0d9488]" />
              <span className="text-xl font-bold tracking-tight text-[#0f172a] dark:text-white">
                {BRAND_CONFIG.name}
              </span>
            </div>

            <nav className="flex-1 space-y-1">
              {navigation.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      active
                        ? 'bg-[#f0fdfa] text-[#0d9488] dark:bg-[#115e59]/30 dark:text-[#14b8a6]'
                        : 'text-[#64748b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] hover:text-[#0f172a] dark:hover:text-white',
                      'group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors'
                    )}
                  >
                    <item.icon
                      className={cn(
                        active ? 'text-[#0d9488] dark:text-[#14b8a6]' : 'text-[#94a3b8] group-hover:text-[#64748b]',
                        'mr-3 flex-shrink-0 h-6 w-6'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#e2e8f0] dark:border-[#334155] pt-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-9 w-9 rounded-full bg-[#ccfbf1] dark:bg-[#115e59] flex items-center justify-center font-bold text-[#0d9488] dark:text-[#14b8a6]">
                  {getInitials(patientName)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0f172a] dark:text-white max-w-[120px] truncate">{patientName}</p>
                  <p className="text-xs text-[#64748b]">Patient Profile</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2 bg-red-50 dark:bg-red-950/20 text-[#ef4444] text-sm font-medium rounded-lg hover:bg-red-100 transition-colors space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 flex flex-col min-w-0">
        <div className="flex-grow p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation (Always pinned for mobile comfort) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1e293b] border-t border-[#e2e8f0] dark:border-[#334155] flex justify-around py-2 px-1 z-20 shadow-lg">
          {navigation.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 text-center py-1 rounded-md transition-colors',
                  active ? 'text-[#0d9488] dark:text-[#14b8a6]' : 'text-[#94a3b8]'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 max-w-[70px] truncate">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
