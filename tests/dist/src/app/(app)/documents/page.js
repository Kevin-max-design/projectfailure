"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocumentsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const demo_data_1 = require("@/lib/extraction/demo-data");
const utils_1 = require("@/lib/utils");
const brand_1 = require("@/config/brand");
const mode_1 = require("@/lib/mode");
function DocumentsPage() {
    const [documents, setDocuments] = (0, react_1.useState)([]);
    const [search, setSearch] = (0, react_1.useState)('');
    const [categoryFilter, setCategoryFilter] = (0, react_1.useState)('All');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('All');
    const fileInputRef = (0, react_1.useRef)(null);
    // Upload and drag states
    const [uploading, setUploading] = (0, react_1.useState)(false);
    const [currentUploadedName, setCurrentUploadedName] = (0, react_1.useState)('');
    const [uploadStatus, setUploadStatus] = (0, react_1.useState)('');
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    // Duplicate alert modal states
    const [duplicateDoc, setDuplicateDoc] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadDocuments();
    }, []);
    const loadDocuments = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const res = service_1.mockDb.query('documents').select().order('created_at', { ascending: false });
            setDocuments(res.data.filter((d) => !d.is_deleted));
        }
        else {
            try {
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
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
            }
            catch (err) {
                console.error('Failed to load documents:', err);
            }
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => {
        setIsDragging(false);
    };
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await processUploadedFile(files[0]);
        }
    };
    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0)
            return;
        await processUploadedFile(files[0]);
    };
    const processUploadedFile = async (file, bypassDuplicate = false) => {
        // Check file size limits (20MB)
        if (file.size > brand_1.BRAND_CONFIG.fileLimits.maxSizeBytes) {
            alert(`File size exceeds the limit of ${brand_1.BRAND_CONFIG.fileLimits.maxSizeMB}MB.`);
            return;
        }
        setUploading(true);
        setCurrentUploadedName(file.name);
        setUploadStatus('Uploading file securely...');
        if ((0, mode_1.isDemoMode)()) {
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
            service_1.mockDb.query('documents').insert(newDoc);
            loadDocuments();
            // Start background processing simulation
            simulateProcessing(newDocId, file.name);
        }
        else {
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
                    const errData = await procResponse.json().catch(() => ({}));
                    alert(errData.message || 'Failed to trigger background document processing pipeline.');
                    setUploading(false);
                    return;
                }
                // Start polling status
                pollJobStatus(documentId);
            }
            catch (err) {
                console.error('File upload failed:', err);
                alert('Upload failed: server connection issue.');
                setUploading(false);
            }
        }
    };
    const pollJobStatus = async (documentId) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/documents/${documentId}/status`);
                if (!response.ok)
                    return;
                const data = await response.json();
                // Update client status message
                if (data.status === 'preprocessing') {
                    setUploadStatus('Enhancing document contrast and page alignments...');
                }
                else if (data.status === 'ocr_processing') {
                    setUploadStatus('Reading text using optical character recognition...');
                }
                else if (data.status === 'extracting') {
                    setUploadStatus('Extracting medical diagnoses, dosages, and lab tests...');
                }
                else if (data.status === 'awaiting_review' || data.status === 'completed' || data.status === 'failed') {
                    clearInterval(interval);
                    setUploading(false);
                    loadDocuments();
                    if (data.status === 'failed') {
                        alert(`Processing failed: ${data.errorMessage || 'Unknown AI extraction error'}`);
                    }
                }
            }
            catch (err) {
                console.error('Polling status error:', err);
            }
        }, 2000);
    };
    const simulateProcessing = async (docId, fileName) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const steps = [
            { status: 'preprocessing', label: 'Enhancing document contrast...' },
            { status: 'ocr_processing', label: 'Extracting text using OCR...' },
            { status: 'extracting', label: 'Running AI medical entity extraction...' },
            { status: 'awaiting_review', label: 'Ready for human verification' }
        ];
        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            service_1.mockDb.query('documents').update({ processing_status: step.status }).eq('id', docId);
            loadDocuments();
        }
        // Populate Layer 2 and Layer 3 data
        const extraction = (0, demo_data_1.getDemoExtractionForFile)(fileName);
        const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
        const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';
        // Insert Raw Extraction (Layer 2)
        service_1.mockDb.query('raw_extractions').insert({
            id: `raw-${docId}`,
            document_id: docId,
            patient_id: patientId,
            raw_payload: extraction,
            extraction_method: 'demo',
            created_at: new Date().toISOString()
        });
        // Insert structured medical records (Layer 3 - pending review)
        // Diagnoses
        (_a = extraction.diagnoses) === null || _a === void 0 ? void 0 : _a.forEach((dx, i) => {
            const recordId = `rec-dx-${docId}-${i}`;
            service_1.mockDb.query('medical_records').insert({
                id: recordId,
                patient_id: patientId,
                document_id: docId,
                record_type: 'diagnosis',
                title: dx.name,
                event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
            });
            service_1.mockDb.query('diagnoses').insert({
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
        (_b = extraction.medications) === null || _b === void 0 ? void 0 : _b.forEach((med, i) => {
            const recordId = `rec-med-${docId}-${i}`;
            service_1.mockDb.query('medical_records').insert({
                id: recordId,
                patient_id: patientId,
                document_id: docId,
                record_type: 'medication',
                title: med.medicineName,
                event_date: extraction.documentDate.value || new Date().toISOString().split('T')[0]
            });
            service_1.mockDb.query('medications').insert({
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
        (_c = extraction.labResults) === null || _c === void 0 ? void 0 : _c.forEach((lab, i) => {
            const recordId = `rec-lab-${docId}-${i}`;
            service_1.mockDb.query('medical_records').insert({
                id: recordId,
                patient_id: patientId,
                document_id: docId,
                record_type: 'lab_result',
                title: lab.testName,
                event_date: lab.date || extraction.documentDate.value || new Date().toISOString().split('T')[0]
            });
            service_1.mockDb.query('lab_results').insert({
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
        service_1.mockDb.query('document_pages').insert({
            id: `page-${docId}-1`,
            document_id: docId,
            page_number: 1,
            ocr_text: `Demo OCR text content retrieved from parsing ${fileName}. This document describes a patient checkup and diagnoses.`
        });
        // Insert unverified timeline event
        const eventDate = extraction.documentDate.value || new Date().toISOString().split('T')[0];
        service_1.mockDb.query('medical_events').insert({
            id: `ev-visit-${docId}`,
            patient_id: patientId,
            event_date: eventDate,
            event_type: extraction.documentType === 'Discharge Summary' ? 'Hospital Admission' : 'Doctor Visit',
            title: extraction.documentTitle.value || `Medical Record Uploaded`,
            hospital_name: ((_d = extraction.hospitalName) === null || _d === void 0 ? void 0 : _d.value) || null,
            doctor_name: ((_e = extraction.doctorName) === null || _e === void 0 ? void 0 : _e.value) || null,
            summary: `Document processed. Contains ${((_f = extraction.diagnoses) === null || _f === void 0 ? void 0 : _f.length) || 0} diagnoses, ${((_g = extraction.medications) === null || _g === void 0 ? void 0 : _g.length) || 0} medications.`,
            source_document_id: docId,
            verification_status: 'pending_review'
        });
        setUploading(false);
        loadDocuments();
    };
    const handleDeleteDocument = async (id) => {
        if (confirm('Are you sure you want to delete this document? All associated medical records and events will be deleted.')) {
            if ((0, mode_1.isDemoMode)()) {
                service_1.mockDb.query('documents').update({ is_deleted: true }).eq('id', id);
                loadDocuments();
            }
            else {
                try {
                    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                    if (!res.ok) {
                        const errData = await res.json();
                        alert(errData.error || 'Failed to delete document.');
                        return;
                    }
                    loadDocuments();
                }
                catch (err) {
                    console.error('Failed to delete document:', err);
                }
            }
        }
    };
    // Filter & Search Logic
    const filteredDocuments = documents.filter((doc) => {
        const filename = doc.file_name || doc.fileName || '';
        const matchesSearch = filename.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' ||
            (statusFilter === 'Pending Review' && doc.processing_status === 'awaiting_review') ||
            (statusFilter === 'Completed' && doc.processing_status === 'completed') ||
            (statusFilter === 'Processing' && !['completed', 'awaiting_review', 'failed'].includes(doc.processing_status));
        return matchesSearch && matchesCategory && matchesStatus;
    });
    return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-extrabold text-slate-900 dark:text-white", children: "Document Vault" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-sm mt-1", children: "Digitize, store, and manage your private medical files." })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, className: "inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Upload, { className: "h-4 w-4 mr-2" }), "Upload Document"] }), (0, jsx_runtime_1.jsx)("input", { type: "file", ref: fileInputRef, onChange: handleFileUpload, className: "hidden", accept: ".pdf,.png,.jpg,.jpeg,.webp" })] })] }), uploading && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 rounded-2xl p-5 flex items-center space-x-4 shadow-sm", children: [(0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h4", { className: "text-sm font-bold text-slate-800 dark:text-teal-400", children: ["Processing: ", currentUploadedName] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: uploadStatus || 'Analyzing document layouts...' })] })] })), duplicateDoc && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3 text-amber-600", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-6 w-6 flex-shrink-0" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-bold text-slate-900 dark:text-white", children: "Duplicate Document Detected" })] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-slate-650 dark:text-slate-400", children: ["The document ", (0, jsx_runtime_1.jsxs)("strong", { children: ["\"", duplicateDoc.name, "\""] }), " appears to have already been uploaded to your vault. What would you like to do?"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row gap-3 sm:justify-end", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setDuplicateDoc(null), className: "px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-semibold rounded-lg", children: "Cancel" }), (0, jsx_runtime_1.jsx)(link_1.default, { href: `/app/documents/${duplicateDoc.id}`, className: "px-4 py-2 bg-teal-550/10 hover:bg-teal-550/20 text-teal-650 dark:text-teal-450 text-xs font-semibold rounded-lg text-center", children: "View Existing" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                            const file = duplicateDoc.file;
                                            setDuplicateDoc(null);
                                            processUploadedFile(file, true);
                                        }, className: "px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg", children: "Upload Anyway" })] })] }) })), (0, jsx_runtime_1.jsx)("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, className: `border-2 border-dashed rounded-3xl p-8 text-center transition-all ${isDragging
                        ? 'border-teal-550 bg-teal-550/5 scale-[0.99] shadow-inner'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-md mx-auto flex flex-col items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4 bg-teal-50 dark:bg-slate-800 rounded-full text-teal-600 mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Upload, { className: "h-6 w-6 animate-pulse" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-sm text-slate-800 dark:text-slate-200", children: "Drag & Drop your medical record here" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1.5", children: "Supports PDF, PNG, JPG, or WEBP up to 20MB. You can also upload directly from your mobile camera." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, className: "mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:shadow-sm transition-shadow", children: "Browse files" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1 w-full", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "absolute inset-y-0 left-3 h-4 w-4 my-auto text-slate-400" }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Search documents by file name...", value: search, onChange: (e) => setSearch(e.target.value), className: "block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-4 w-full md:w-auto", children: [(0, jsx_runtime_1.jsxs)("select", { value: categoryFilter, onChange: (e) => setCategoryFilter(e.target.value), className: "px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none", children: [(0, jsx_runtime_1.jsx)("option", { value: "All", children: "All Categories" }), (0, jsx_runtime_1.jsx)("option", { value: "Prescription", children: "Prescriptions" }), (0, jsx_runtime_1.jsx)("option", { value: "Lab Report", children: "Lab Reports" }), (0, jsx_runtime_1.jsx)("option", { value: "Discharge Summary", children: "Discharge Summaries" }), (0, jsx_runtime_1.jsx)("option", { value: "Imaging Report", children: "Imaging Reports" }), (0, jsx_runtime_1.jsx)("option", { value: "Medical Certificate", children: "Certificates" }), (0, jsx_runtime_1.jsx)("option", { value: "Vaccination Record", children: "Vaccinations" })] }), (0, jsx_runtime_1.jsxs)("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none", children: [(0, jsx_runtime_1.jsx)("option", { value: "All", children: "All Statuses" }), (0, jsx_runtime_1.jsx)("option", { value: "Pending Review", children: "Pending Review" }), (0, jsx_runtime_1.jsx)("option", { value: "Processing", children: "Processing" }), (0, jsx_runtime_1.jsx)("option", { value: "Completed", children: "Verified" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [filteredDocuments.map((doc) => {
                            const fileName = doc.file_name || doc.fileName || 'Document';
                            const fileSize = doc.file_size || doc.fileSize || 0;
                            const createdAt = doc.created_at || doc.createdAt || '';
                            const processingStatus = doc.processing_status || doc.processingStatus || 'completed';
                            const statusLabel = processingStatus === 'completed' ? 'Verified' :
                                processingStatus === 'awaiting_review' ? 'Needs Review' :
                                    processingStatus === 'failed' ? 'Failed' : 'Processing...';
                            return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-650 rounded-xl", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-6 w-6" }) }), (0, jsx_runtime_1.jsx)("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${processingStatus === 'completed'
                                                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400'
                                                            : processingStatus === 'awaiting_review'
                                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                                                : processingStatus === 'failed'
                                                                    ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                                                                    : 'bg-slate-100 text-slate-650 dark:bg-slate-850 dark:text-slate-400'}`, children: statusLabel })] }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-slate-800 dark:text-slate-200 text-sm truncate", title: fileName, children: fileName }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-400 mt-2 font-medium", children: [(0, jsx_runtime_1.jsx)("span", { children: (0, utils_1.formatBytes)(fileSize) }), (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { children: (0, utils_1.formatDate)(createdAt) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-t border-slate-50 dark:border-slate-800 mt-5 pt-3.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-bold text-teal-650 tracking-wide", children: doc.category }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2", children: [processingStatus === 'awaiting_review' && ((0, jsx_runtime_1.jsxs)(link_1.default, { href: `/app/documents/${doc.id}/review`, className: "p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md transition-colors text-xs font-semibold flex items-center space-x-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Verify" })] })), (0, jsx_runtime_1.jsx)(link_1.default, { href: `/app/documents/${doc.id}`, className: "p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-md transition-colors", title: "View Details", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleDeleteDocument(doc.id), className: "p-1.5 text-slate-400 hover:text-[#ef4444] rounded-md transition-colors", title: "Delete File", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-4 w-4" }) })] })] })] }, doc.id));
                        }), filteredDocuments.length === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "col-span-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm", children: [(0, jsx_runtime_1.jsx)("div", { className: "inline-flex p-4 bg-slate-50 dark:bg-slate-800 text-slate-450 rounded-2xl mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-8 w-8" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-slate-800 dark:text-slate-200", children: "No medical records yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto", children: "Your medical timeline starts here. Drag or click to upload prescriptions, lab tests, or discharge summaries." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, className: "mt-4 inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors", children: "Upload your first medical record" })] }))] })] }) }));
}
