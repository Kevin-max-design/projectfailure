'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { BRAND_CONFIG } from '@/config/brand';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate reset request
    await new Promise((resolve) => setTimeout(resolve, 800));

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-teal-50 dark:bg-teal-950/30 rounded-2xl text-teal-655 mb-4">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            We will send you instructions to recover your health account.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/30 text-teal-700 dark:text-teal-400 p-3 rounded-lg text-sm text-center">
              Password reset link has been sent to <span className="font-bold">{email}</span>. Please check your email inbox.
            </div>
            
            <Link
              href="/login"
              className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending Request...' : 'Send Password Reset Link'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </button>

              <Link
                href="/login"
                className="inline-flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mt-2 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
