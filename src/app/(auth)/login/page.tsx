'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Lock, Mail, ArrowRight } from 'lucide-react';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('arjun.rao@medmemory.demo');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Artificial delay to simulate network call
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!email || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (isDemoMode()) {
      // Demo Mode Auto Login
      if (typeof window !== 'undefined') {
        localStorage.setItem('medmemory_logged_in', 'true');
        localStorage.setItem('medmemory_patient_id', '00000000-0000-0000-0000-000000000001');
      }

      // Direct user to onboarding first or straight to dashboard if already onboarded
      const onboarded = typeof window !== 'undefined' ? localStorage.getItem('medmemory_onboarded') : null;
      if (onboarded === 'true') {
        router.push('/app/dashboard');
      } else {
        router.push('/app/onboarding');
      }
    } else {
      // Real Supabase Auth Login
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        // Check if user has an existing patient profile
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (patient) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('medmemory_logged_in', 'true');
            localStorage.setItem('medmemory_patient_id', patient.id);
            localStorage.setItem('medmemory_onboarded', 'true');
          }
          router.push('/app/dashboard');
        } else {
          if (typeof window !== 'undefined') {
            localStorage.setItem('medmemory_logged_in', 'true');
            localStorage.setItem('medmemory_onboarded', 'false');
          }
          router.push('/app/onboarding');
        }
      } catch (err: any) {
        console.error('Login error:', err);
        setError(err.message || 'An unexpected error occurred during login.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-teal-50 dark:bg-teal-950/30 rounded-2xl text-teal-600 mb-4">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome to {BRAND_CONFIG.name}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your digital medical memory.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-xs text-teal-600 hover:text-teal-700 font-medium">
              Demo Credentials Pre-filled
            </div>
            <Link
              href="/forgot-password"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-slate-400 mt-6 border-t border-slate-100 dark:border-slate-850 pt-4">
          Don't have an account?{' '}
          <Link href="/register" className="text-teal-600 font-semibold hover:text-teal-750">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
