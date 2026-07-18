'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Trash2,
  Filter,
  Plus,
  AlertTriangle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mockDb } from '@/lib/supabase/service';
import { getDemoExtractionForFile } from '@/lib/extraction/demo-data';
import { formatBytes, formatDate } from '@/lib/utils';
import { BRAND_CONFIG } from '@/config/brand';
import { isDemoMode } from '@/lib/mode';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload and drag states
  const [uploading, setUploading] = useState(false);
  const [currentUploadedName, setCurrentUploadedName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Duplicate alert modal states
  const [duplicateDoc, setDuplicateDoc] = useState<{ id: string; name: string; file: File } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    if (isDemoMode()) {
      const res = mockDb.query('documents').select().order('created_at', { ascending: false });
      setDocuments(res.data.filter((d: any) => !d.is_deleted));
    } else {
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
            const { data: docs } = await supabase
              .from('documents')
              .select('*')
              .eq('patient_id', patient.id)
              .eq('is_deleted', false)
              .order('created_at', { ascending: false });
            
            // Map backend snake_case properties to frontend camelCase if needed,
            // but the original code references 'doc.file_name', 'doc.file_size', etc.
            setDocuments(docs || []);
          }
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processUploadedFile(files[0]);
  };

  const processUploadedFile = async (file: File, bypassDuplicate = false) => {
    // Check file size limits (20MB)
    if (file.size > BRAND_CONFIG.fileLimits.maxSizeBytes) {
      alert(`File size exceeds the limit of ${BRAND_CONFIG.fileLimits.maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setCurrentUploadedName(file.name);
    setUploadStatus('Uploading file securely...');

    if (isDemoMode()) {
      // Step 1: Uploading
      await new Promise(resolve => setTimeout(resolve, 800));

      const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
      const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';

      const newDocId = `doc-${Math.random().toString(36).substring(7)}`;
      const newDoc = {
        id: newDocId,
        patient_id: patientId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        storage_path: `documents/${newDocId}`,
        category: 'Auto Detect',
        processing_status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false
      };

      mockDb.query('documents').insert(newDoc);
      loadDocuments();

      // Start background processing simulation
      simulateProcessing(newDocId, file.name);
    } else {
      // Production upload path
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'Auto Detect');
        if (bypassDuplicate) {
          formData.append('bypass_duplicate', 'true');
        }

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });

        if (response.status === 409) {
          const conflictData = await response.json();
          setDuplicateDoc({
            id: conflictData.existingDocumentId,
            name: file.name,
            file: file
          });
          setUploading(false);
          return;
        }

        if (!response.ok) {
          const errData = await response.json();
          alert(errData.error || 'Upload failed');
          setUploading(false);
          return;
        }

        const result = await response.json();
        const documentId = result.documentId;
        
        loadDocuments();
        
        // Trigger server processing
        setUploadStatus('Document registered. Initializing AI extraction pipeline...');
        const procResponse = await fetch(`/api/documents/${documentId}/process`, {
          method: 'POST'
        });

        if (!procResponse.ok) {
          alert('Failed to trigger background document processing pipeline.');
          setUploading(false);
          return;
        }

        // Start polling status
        pollJobStatus(documentId);

      } catch (err: any) {
        console.error('File upload failed:', err);
        alert('Upload failed: server connection issue.');
        setUploading(false);
      }
    }
  };

  const pollJobStatus = async (documentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/status`);
        if (!response.ok) return;

        const data = await response.json();
        
        // Update client status message
        if (data.status === 'preprocessing') {
          setUploadStatus('Enhancing document contrast and page alignments...');
        } else if (data.status === 'ocr_processing') {
          setUploadStatus('Reading text using optical character recognition...');
        } else if (data.status === 'extracting') {
          setUploadStatus('Extracting medical diagnoses, dosages, and lab tests...');
        } else if (data.status === 'awaiting_review' || data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setUploading(false);
          loadDocuments();
          
          if (data.status === 'failed') {
            alert(`Processing failed: ${data.errorMessage || 'Unknown AI extraction error'}`);
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 2000);
  };

  const simulateProcessing = async (docId: string, fileName: string) => {
    const steps = [
      { status: 'preprocessing', label: 'Enhancing document contrast...' },
      { status: 'ocr_processing', label: 'Extracting text using OCR...' },
      { status: 'extracting', label: 'Running AI medical entity extraction...' },
      { status: 'awaiting_review', label: 'Ready for human verification' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      mockDb.query('documents').update({ processing_status: step.status }).eq('id', docId);
      loadDocuments();
    }

    // Populate Layer 2 and Layer 3 data
    const extraction = getDemoExtractionForFile(fileName);
    const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
    const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';

    // Insert Raw Extraction (Layer 2)
    mockDb.query('raw_extractions').insert({
      id: `raw-${docId}`,
      document_id: docId,
      patient_id: patientId,
      raw_payload: extraction,
      extraction_method: 'demo',
      created_at: new Date().toISOString()
    });

    // Insert structured medical records (Layer 3 - pending review)
    // Diagnoses
    extraction.diagnoses.forEach((dx, i) => {
      const recordId = `rec-dx-${docId}-${i}`;
      mockDb.query('medical_records').insert({
        id: recordId,
        patient_id: patientId,
        document_id: docId,
        record_type: 'diagnosis',
        title: dx.name,
        event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
      });

      mockDb.query('diagnoses').insert({
        id: `dx-${docId}-${i}`,
        patient_id: patientId,
        record_id: recordId,
        name: dx.name,
        onset_weeks: dx.onsetWeeks,
        is_chronic: dx.isChronic,
        notes: dx.notes,
        source_document_id: docId,
        source_page: dx.page || 1,
        source_text: dx.sourceText,
        extraction_method: 'demo',
        confidence_score: dx.confidence,
        verification_status: 'pending_review'
      });
    });

    // Medications
    extraction.medications.forEach((med, i) => {
      const recordId = `rec-med-${docId}-${i}`;
      mockDb.query('medical_records').insert({
        id: recordId,
        patient_id: patientId,
        document_id: docId,
        record_type: 'medication',
        title: med.medicineName,
        event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
      });

      mockDb.query('medications').insert({
        id: `med-${docId}-${i}`,
        patient_id: patientId,
        record_id: recordId,
        medicine_name: med.medicineName,
        generic_name: med.genericName,
        strength: med.strength,
        dosage: med.dosage,
        route: med.route,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
        start_date: med.startDate,
        end_date: med.endDate,
        reason: med.reason,
        source_document_id: docId,
        source_page: med.page || 1,
        source_text: med.sourceText,
        extraction_method: 'demo',
        confidence_score: med.confidence,
        verification_status: 'pending_review'
      });
    });

    // Lab Results
    extraction.labResults.forEach((lab, i) => {
      const recordId = `rec-lab-${docId}-${i}`;
      mockDb.query('medical_records').insert({
        id: recordId,
        patient_id: patientId,
        document_id: docId,
        record_type: 'lab_result',
        title: lab.testName,
        event_date: lab.date || extraction.documentDate.value || new Date().toISOString().split('T')[0]
      });

      mockDb.query('lab_results').insert({
        id: `lab-${docId}-${i}`,
        patient_id: patientId,
        record_id: recordId,
        test_name: lab.testName,
        value: lab.value,
        unit: lab.unit,
        reference_range: lab.referenceRange,
        abnormal_flag: lab.abnormalFlag,
        test_date: lab.date || extraction.documentDate.value || new Date().toISOString().split('T')[0],
        source_document_id: docId,
        source_page: lab.page || 1,
        source_text: lab.sourceText,
        extraction_method: 'demo',
        confidence_score: lab.confidence,
        verification_status: 'pending_review'
      });
    });

    // Insert Document Page (OCR raw text indexer)
    mockDb.query('document_pages').insert({
      id: `page-${docId}-1`,
      document_id: docId,
      page_number: 1,
      ocr_text: `Demo OCR text content retrieved from parsing ${fileName}. This document describes a patient checkup and diagnoses.`
    });

    // Insert unverified timeline event
    const eventDate = extraction.documentDate.value || new Date().toISOString().split('T')[0];
    mockDb.query('medical_events').insert({
      id: `ev-visit-${docId}`,
      patient_id: patientId,
      event_date: eventDate,
      event_type: extraction.documentType === 'Discharge Summary' ? 'Hospital Admission' : 'Doctor Visit',
      title: extraction.documentTitle.value || `Medical Record Uploaded`,
      hospital_name: extraction.hospitalName.value,
      doctor_name: extraction.doctorName.value,
      summary: `Document processed. Contains ${extraction.diagnoses?.length || 0} diagnoses, ${extraction.medications?.length || 0} medications.`,
      source_document_id: docId,
      verification_status: 'pending_review'
    });

    setUploading(false);
    loadDocuments();
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm('Are you sure you want to delete this document? All associated medical records and events will be deleted.')) {
      if (isDemoMode()) {
        mockDb.query('documents').update({ is_deleted: true }).eq('id', id);
        loadDocuments();
      } else {
        try {
          const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const errData = await res.json();
            alert(errData.error || 'Failed to delete document.');
            return;
          }
          loadDocuments();
        } catch (err) {
          console.error('Failed to delete document:', err);
        }
      }
    }
  };

  // Filter & Search Logic
  const filteredDocuments = documents.filter((doc: any) => {
    const filename = doc.file_name || doc.fileName || '';
    const matchesSearch = filename.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Pending Review' && doc.processing_status === 'awaiting_review') ||
      (statusFilter === 'Completed' && doc.processing_status === 'completed') ||
      (statusFilter === 'Processing' && !['completed', 'awaiting_review', 'failed'].includes(doc.processing_status));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Document Vault</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Digitize, store, and manage your private medical files.
            </p>
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
            />
          </div>
        </div>

        {/* Upload status indicator */}
        {uploading && (
          <div className="bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 rounded-2xl p-5 flex items-center space-x-4 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-teal-400">Processing: {currentUploadedName}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{uploadStatus || 'Analyzing document layouts...'}</p>
            </div>
          </div>
        )}

        {/* Duplicate Alert Modal */}
        {duplicateDoc && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-6">
              <div className="flex items-center space-x-3 text-amber-600">
                <AlertTriangle className="h-6 w-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Duplicate Document Detected</h3>
              </div>
              <p className="text-sm text-slate-650 dark:text-slate-400">
                The document <strong>"{duplicateDoc.name}"</strong> appears to have already been uploaded to your vault. What would you like to do?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => setDuplicateDoc(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <Link
                  href={`/app/documents/${duplicateDoc.id}`}
                  className="px-4 py-2 bg-teal-550/10 hover:bg-teal-550/20 text-teal-650 dark:text-teal-450 text-xs font-semibold rounded-lg text-center"
                >
                  View Existing
                </Link>
                <button
                  onClick={() => {
                    const file = duplicateDoc.file;
                    setDuplicateDoc(null);
                    processUploadedFile(file, true);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg"
                >
                  Upload Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
            isDragging 
              ? 'border-teal-550 bg-teal-550/5 scale-[0.99] shadow-inner'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
          }`}
        >
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="p-4 bg-teal-50 dark:bg-slate-800 rounded-full text-teal-600 mb-4">
              <Upload className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Drag & Drop your medical record here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Supports PDF, PNG, JPG, or WEBP up to 20MB. You can also upload directly from your mobile camera.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:shadow-sm transition-shadow"
            >
              Browse files
            </button>
          </div>
        </div>

        {/* Toolbar (Filters + Search) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Prescription">Prescriptions</option>
              <option value="Lab Report">Lab Reports</option>
              <option value="Discharge Summary">Discharge Summaries</option>
              <option value="Imaging Report">Imaging Reports</option>
              <option value="Medical Certificate">Certificates</option>
              <option value="Vaccination Record">Vaccinations</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Verified</option>
            </select>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const fileName = doc.file_name || doc.fileName || 'Document';
            const fileSize = doc.file_size || doc.fileSize || 0;
            const createdAt = doc.created_at || doc.createdAt || '';
            const processingStatus = doc.processing_status || doc.processingStatus || 'completed';

            const statusLabel = 
              processingStatus === 'completed' ? 'Verified' :
              processingStatus === 'awaiting_review' ? 'Needs Review' :
              processingStatus === 'failed' ? 'Failed' : 'Processing...';

            return (
              <div 
                key={doc.id} 
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-xl">
                      <FileText className="h-6 w-6" />
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      processingStatus === 'completed'
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400'
                        : processingStatus === 'awaiting_review'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        : processingStatus === 'failed'
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                        : 'bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate" title={fileName}>
                    {fileName}
                  </h3>
                  <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-400 mt-2 font-medium">
                    <span>{formatBytes(fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 mt-5 pt-3.5">
                  <div className="text-[10px] font-bold text-teal-650 tracking-wide">
                    {doc.category}
                  </div>

                  <div className="flex space-x-2">
                    {processingStatus === 'awaiting_review' && (
                      <Link
                        href={`/app/documents/${doc.id}/review`}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md transition-colors text-xs font-semibold flex items-center space-x-1"
                      >
                        <Clock className="h-4 w-4" />
                        <span>Verify</span>
                      </Link>
                    )}
                    <Link
                      href={`/app/documents/${doc.id}`}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-md transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-[#ef4444] rounded-md transition-colors"
                      title="Delete File"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredDocuments.length === 0 && (
            <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
              <div className="inline-flex p-4 bg-slate-50 dark:bg-slate-800 text-slate-450 rounded-2xl mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No medical records yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                Your medical timeline starts here. Drag or click to upload prescriptions, lab tests, or discharge summaries.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Upload your first medical record
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
