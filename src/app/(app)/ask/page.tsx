'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  FileText, 
  HelpCircle, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { RAGEngine } from '@/lib/rag/engine';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: {
    documentId: string;
    documentTitle: string;
    pageNumber: number;
    date: string;
    snippet: string;
  }[];
}

export default function AskMyRecordsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('00000000-0000-0000-0000-000000000001');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProfile = localStorage.getItem('medmemory_patient_profile');
      if (storedProfile) {
        setPatientId(JSON.parse(storedProfile).id);
      }
    }
  }, []);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `msg-user-${Math.random().toString(36).substring(7)}`,
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let answer: string;
      let citations: any[];

      if (isDemoMode()) {
        const engine = new RAGEngine();
        const res = await engine.answerPatientQuestion(patientId, textToSend);
        answer = res.answer;
        citations = res.citations;
      } else {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: textToSend })
        });
        if (!res.ok) {
          throw new Error('API request failed');
        }
        const data = await res.json();
        answer = data.answer;
        citations = data.citations;
      }

      const assistantMsg: Message = {
        id: `msg-ai-${Math.random().toString(36).substring(7)}`,
        sender: 'assistant',
        text: answer,
        citations: citations
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('RAG engine query failed:', err);
      const errorMsg: Message = {
        id: `msg-error-${Math.random().toString(36).substring(7)}`,
        sender: 'assistant',
        text: "I encountered an error querying your medical records. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "What was I diagnosed with during my 2026 hospital admission?",
    "Which medicines was I given for pancreatitis?",
    "What was my last HbA1c result?",
    "When did my doctor change my insulin?",
    "Which hospitals have I visited?"
  ];

  return (
    <AppShell>
      <div className="h-[calc(100vh-140px)] flex flex-col justify-between space-y-6">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Ask My Records</h1>
            <p className="text-xs text-slate-500 mt-0.5">Conversational AI trained strictly on your uploaded files.</p>
          </div>
          
          <div className="flex items-center text-teal-650 bg-teal-50 dark:bg-teal-950/20 px-3 py-1.5 rounded-lg border border-teal-150/40 text-xs font-semibold">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Verified Records Only
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-grow overflow-y-auto space-y-6 pr-2">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 space-y-8">
              {/* Empty state */}
              <div className="text-center space-y-3">
                <div className="inline-flex p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-3xl">
                  <MessageSquare className="h-8 w-8 animate-bounce" />
                </div>
                <h2 className="text-lg font-bold text-slate-850 dark:text-slate-200">Interactive Medical Memory</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                  Ask details about your diagnoses, medications, blood tests, or hospitals. Answers are strictly grounded in your documents with full citations.
                </p>
              </div>

              {/* Sample questions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center">
                  <HelpCircle className="h-4 w-4 text-teal-600 mr-2" />
                  Suggested Questions
                </h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-850 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-teal-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all flex justify-between items-center group"
                    >
                      <span>{q}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${
                    msg.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Citations block */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="border-t border-slate-50 dark:border-slate-800 mt-4 pt-3 space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Source Citations:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.citations.map((cit, i) => (
                            <Link
                              key={i}
                              href={`/app/documents/${cit.documentId}`}
                              className="block p-2 bg-slate-50 hover:bg-teal-50 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-teal-200 rounded-lg text-[10px] transition-all"
                            >
                              <div className="flex items-center text-teal-650 font-bold truncate">
                                <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{cit.documentTitle}</span>
                              </div>
                              <div className="text-slate-450 mt-1 font-medium">
                                Page {cit.pageNumber} • {cit.date}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                  <span>Searching your documents for answers...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 max-w-3xl w-full mx-auto pb-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder="Ask a question about your health records..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="block w-full pl-4 pr-12 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2.5 bg-teal-605 hover:bg-teal-700 text-white rounded-xl shadow-md shadow-teal-500/10 transition-colors disabled:opacity-40 disabled:hover:bg-teal-600"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-450 mt-2">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
            <span>Answers generated solely from patient-reported and verified document-extracted evidence.</span>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
