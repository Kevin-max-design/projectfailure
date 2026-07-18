'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Heart, 
  FileText, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  UserCheck,
  HeartPulse
} from 'lucide-react';
import { BRAND_CONFIG } from '@/config/brand';

export default function LandingPage() {
  return (
    <div className="bg-[#f8fafc] text-[#0f172a] min-h-screen flex flex-col justify-between selection:bg-teal-500/20 selection:text-teal-900">
      
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-[#0d9488]" />
            <span className="text-xl font-black tracking-tight text-[#0f172a]">
              {BRAND_CONFIG.name}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-slate-655 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="inline-flex items-center px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-700 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          <HeartPulse className="h-4 w-4" />
          <span>Patient-Owned Lifetime Records</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
          {BRAND_CONFIG.tagline}
        </h1>

        <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {BRAND_CONFIG.shortDescription}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-[#0d9488] hover:bg-[#0f766e] text-white text-base font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all space-x-2 group"
          >
            <span>Create Your Health Memory</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white border border-[#e2e8f0] text-slate-700 hover:bg-slate-50 text-base font-semibold rounded-xl shadow-sm transition-colors"
          >
            See How It Works (Demo)
          </Link>
        </div>

        {/* Small safe disclaimer */}
        <p className="text-[10px] text-slate-400 max-w-md mx-auto pt-6 leading-relaxed">
          {BRAND_CONFIG.medicalDisclaimer}
        </p>
      </section>

      {/* Three Step Section */}
      <section className="bg-white py-20 border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-12">
            The Three-Step Patient Journey
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
              <span className="text-3xl font-black text-teal-650">01</span>
              <h3 className="text-md font-bold text-slate-850">Scan / Upload</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Drag-and-drop prescriptions, reports, scans, and handwritten consultation notes. Files are processed securely in a private document vault.
              </p>
            </div>

            <div className="space-y-3 p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
              <span className="text-3xl font-black text-teal-650">02</span>
              <h3 className="text-md font-bold text-slate-850">Verify Extracted Facts</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Audit raw AI/OCR extraction. Ground truth data remains editable. Mark fields as confirmed, rejected, or unreadable to enforce complete trace provenance.
              </p>
            </div>

            <div className="space-y-3 p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
              <span className="text-3xl font-black text-teal-650">03</span>
              <h3 className="text-md font-bold text-slate-850">Permanent Longitudinal Memory</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Search verified records, ask questions with RAG chat context, and generate tokenized emergency medical summary links with revocable QR codes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Intelligent Health Record Storage
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            MedMemory is designed around clinical safety, record provenance, and patient ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl inline-block">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Traceable Provenance</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Every medical fact link is backed by exact original source document pages, text snippets, and verification audit trails.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl inline-block">
              <Search className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Ask My Records</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Query your lifelong records using conversational AI. Citations are verified strictly against patient-uploaded evidence only.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl inline-block">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Emergency Portal</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Share revocable emergency summaries (allergies, medications) with caregivers via secure tokenized QR codes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl inline-block">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Privacy by Design</h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              We enforce strict data isolation, private buckets, and signed URLs. Patient records are never shared without explicit consent.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e8f0] py-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <Heart className="h-4 w-4 text-[#0d9488]" />
            <span className="font-extrabold text-slate-700">{BRAND_CONFIG.name}</span>
            <span>— Lifetime Health Memory Platform</span>
          </div>
          <p>© {new Date().getFullYear()} {BRAND_CONFIG.name}. All medical records are privately owned and controlled by their respective patients.</p>
        </div>
      </footer>

    </div>
  );
}
