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
exports.default = VerificationScreen;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const AppShell_1 = __importDefault(require("@/components/layout/AppShell"));
const service_1 = require("@/lib/supabase/service");
const generator_1 = require("@/lib/timeline/generator");
const mode_1 = require("@/lib/mode");
function VerificationScreen() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const docId = params.id;
    const [document, setDocument] = (0, react_1.useState)(null);
    const [diagnoses, setDiagnoses] = (0, react_1.useState)([]);
    const [medications, setMedications] = (0, react_1.useState)([]);
    const [labResults, setLabResults] = (0, react_1.useState)([]);
    const [procedures, setProcedures] = (0, react_1.useState)([]);
    const [signedUrl, setSignedUrl] = (0, react_1.useState)('');
    const [patientProfile, setPatientProfile] = (0, react_1.useState)(null);
    const [identityConfirmed, setIdentityConfirmed] = (0, react_1.useState)(false);
    const [extraction, setExtraction] = (0, react_1.useState)(null);
    const rawType = (document === null || document === void 0 ? void 0 : document.document_type) || (document === null || document === void 0 ? void 0 : document.documentType) || (extraction === null || extraction === void 0 ? void 0 : extraction.documentType) || '';
    const docType = rawType.toUpperCase();
    const showDiagnoses = ['DISCHARGE_SUMMARY', 'CLINICAL_NOTE', 'OTHER_MEDICAL_DOCUMENT'].includes(docType);
    const showMedications = ['PRESCRIPTION', 'PHARMACY_INVOICE', 'DISCHARGE_SUMMARY', 'OTHER_MEDICAL_DOCUMENT'].includes(docType);
    const showLabResults = ['LAB_REPORT', 'DISCHARGE_SUMMARY', 'OTHER_MEDICAL_DOCUMENT'].includes(docType);
    // Edit forms/overlay state
    const [editingId, setEditingId] = (0, react_1.useState)(null);
    const [editingType, setEditingType] = (0, react_1.useState)('');
    const [editValue, setEditValue] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        loadData();
    }, [docId]);
    const loadData = async () => {
        if ((0, mode_1.isDemoMode)()) {
            const docRes = service_1.mockDb.query('documents').select().eq('id', docId).single();
            if (!docRes.data || docRes.data.is_deleted) {
                router.push('/app/documents');
                return;
            }
            setDocument(docRes.data);
            loadEntities();
        }
        else {
            try {
                const response = await fetch(`/api/documents/${docId}`);
                if (!response.ok) {
                    router.push('/app/documents');
                    return;
                }
                const data = await response.json();
                setDocument(data.document);
                // Fetch related entities from Supabase
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                const supabase = createClient();
                const { data: dx } = await supabase.from('diagnoses').select('*').eq('source_document_id', docId);
                setDiagnoses(dx || []);
                const { data: med } = await supabase.from('medications').select('*').eq('source_document_id', docId);
                setMedications(med || []);
                const { data: lab } = await supabase.from('lab_results').select('*').eq('source_document_id', docId);
                setLabResults(lab || []);
                const { data: proc } = await supabase.from('procedures').select('*').eq('source_document_id', docId);
                setProcedures(proc || []);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: patient } = await supabase
                        .from('patients')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    setPatientProfile(patient);
                }
                const docRes = await fetch(`/api/documents/${docId}`);
                if (docRes.ok) {
                    const docData = await docRes.json();
                    setExtraction(docData.extraction);
                }
                // Load signed URL for viewing document side-by-side
                const urlRes = await fetch(`/api/documents/${docId}/signed-url`);
                if (urlRes.ok) {
                    const urlData = await urlRes.json();
                    setSignedUrl(urlData.signedUrl);
                }
            }
            catch (err) {
                console.error('Failed to load review data:', err);
            }
        }
    };
    const loadEntities = () => {
        if ((0, mode_1.isDemoMode)()) {
            const dxRes = service_1.mockDb.query('diagnoses').select().eq('source_document_id', docId);
            setDiagnoses(dxRes.data || []);
            const medRes = service_1.mockDb.query('medications').select().eq('source_document_id', docId);
            setMedications(medRes.data || []);
            const labRes = service_1.mockDb.query('lab_results').select().eq('source_document_id', docId);
            setLabResults(labRes.data || []);
            const procRes = service_1.mockDb.query('procedures').select().eq('source_document_id', docId);
            setProcedures(procRes.data || []);
        }
    };
    const handleAction = async (recordId, type, table, action, fieldName = 'name') => {
        if ((0, mode_1.isDemoMode)()) {
            const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
            const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';
            const status = action === 'confirm' ? 'verified' :
                action === 'reject' ? 'rejected' : 'unreadable';
            // Update entity
            service_1.mockDb.query(table).update({ verification_status: status }).eq('record_id', recordId);
            // Add verification history audit log
            await generator_1.TimelineGenerator.recordVerificationAction({
                patientId,
                recordId,
                entityType: table,
                fieldName,
                oldValue: 'pending_review',
                newValue: status,
                actionType: action,
                verifiedBy: patientId
            });
            // Sync timeline event if confirmed
            if (action === 'confirm') {
                await generator_1.TimelineGenerator.syncTimelineEventForRecord(recordId, type, patientId);
            }
            loadEntities();
        }
        else {
            try {
                const response = await fetch(`/api/documents/${docId}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recordId,
                        entityType: table,
                        action,
                        fieldName,
                        oldValue: 'pending_review',
                        newValue: action === 'confirm' ? 'verified' : action === 'reject' ? 'rejected' : 'unreadable'
                    })
                });
                if (response.ok) {
                    loadData();
                }
            }
            catch (err) {
                console.error('Failed to verify record:', err);
            }
        }
    };
    const handleSaveCorrection = async () => {
        if (!editingId)
            return;
        const table = editingType === 'diagnosis' ? 'diagnoses' :
            editingType === 'medication' ? 'medications' :
                editingType === 'lab_result' ? 'lab_results' : 'procedures';
        const fieldName = editingType === 'medication' ? 'medicine_name' :
            editingType === 'lab_result' ? 'test_name' : 'name';
        if ((0, mode_1.isDemoMode)()) {
            const patientProfile = typeof window !== 'undefined' ? localStorage.getItem('medmemory_patient_profile') : null;
            const patientId = patientProfile ? JSON.parse(patientProfile).id : '00000000-0000-0000-0000-000000000001';
            // Update entity
            service_1.mockDb.query(table).update({
                [fieldName]: editValue,
                verification_status: 'corrected'
            }).eq('record_id', editingId);
            // Sync title of base medical record
            service_1.mockDb.query('medical_records').update({ title: editValue }).eq('id', editingId);
            // Log history
            await generator_1.TimelineGenerator.recordVerificationAction({
                patientId,
                recordId: editingId,
                entityType: table,
                fieldName,
                oldValue: 'AI Output',
                newValue: editValue,
                actionType: 'correct',
                verifiedBy: patientId
            });
            // Create synchronized timeline event
            await generator_1.TimelineGenerator.syncTimelineEventForRecord(editingId, editingType, patientId);
            setEditingId(null);
            loadEntities();
        }
        else {
            try {
                const response = await fetch(`/api/documents/${docId}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recordId: editingId,
                        entityType: table,
                        action: 'correct',
                        fieldName,
                        oldValue: 'AI Output',
                        newValue: editValue
                    })
                });
                if (response.ok) {
                    setEditingId(null);
                    loadData();
                }
            }
            catch (err) {
                console.error('Failed to correct record:', err);
            }
        }
    };
    const handleCompleteReview = async () => {
        if ((0, mode_1.isDemoMode)()) {
            // Set document status as completed
            service_1.mockDb.query('documents').update({ processing_status: 'completed' }).eq('id', docId);
            // Auto confirm remaining items as verified for convenience
            diagnoses.forEach(dx => {
                if (dx.verification_status === 'pending_review') {
                    handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'confirm');
                }
            });
            medications.forEach(med => {
                if (med.verification_status === 'pending_review') {
                    handleAction(med.record_id, 'medication', 'medications', 'confirm', 'medicine_name');
                }
            });
            labResults.forEach(lab => {
                if (lab.verification_status === 'pending_review') {
                    handleAction(lab.record_id, 'lab_result', 'lab_results', 'confirm', 'test_name');
                }
            });
            router.push(`/app/documents/${docId}`);
        }
        else {
            try {
                const { createClient } = await Promise.resolve().then(() => __importStar(require('@/lib/supabase/client')));
                const supabase = createClient();
                // 1. Mark document status as completed
                await supabase
                    .from('documents')
                    .update({ processing_status: 'completed' })
                    .eq('id', docId);
                // 2. Auto confirm any remaining unverified items
                for (const dx of diagnoses) {
                    if (dx.verification_status === 'pending_review') {
                        await handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'confirm');
                    }
                }
                for (const med of medications) {
                    if (med.verification_status === 'pending_review') {
                        await handleAction(med.record_id, 'medication', 'medications', 'confirm', 'medicine_name');
                    }
                }
                for (const lab of labResults) {
                    if (lab.verification_status === 'pending_review') {
                        await handleAction(lab.record_id, 'lab_result', 'lab_results', 'confirm', 'test_name');
                    }
                }
                router.push(`/app/documents/${docId}`);
            }
            catch (err) {
                console.error('Failed to complete review:', err);
            }
        }
    };
    if (!document) {
        return ((0, jsx_runtime_1.jsx)(AppShell_1.default, { children: (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[400px]", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" }) }) }));
    }
    const fileName = document.file_name || document.fileName || 'document';
    return ((0, jsx_runtime_1.jsxs)(AppShell_1.default, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(link_1.default, { href: `/app/documents/${docId}`, className: "p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-white transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-bold text-slate-900 dark:text-white", children: "Verify Extracted Records" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-500 mt-0.5", children: "Grounding truth layer: Verify and correct AI output." })] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCompleteReview, disabled: (() => {
                                    var _a, _b, _c;
                                    const docName = ((_b = (_a = extraction === null || extraction === void 0 ? void 0 : extraction.patientDetails) === null || _a === void 0 ? void 0 : _a.patientNameOnDocument) === null || _b === void 0 ? void 0 : _b.value) || ((_c = extraction === null || extraction === void 0 ? void 0 : extraction.patientNameOnDocument) === null || _c === void 0 ? void 0 : _c.value);
                                    const profileName = patientProfile === null || patientProfile === void 0 ? void 0 : patientProfile.full_name;
                                    const cleanName = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                    const isIdentityMismatch = docName && profileName && cleanName(docName) && cleanName(profileName) && (!cleanName(docName).includes(cleanName(profileName)) && !cleanName(profileName).includes(cleanName(docName)));
                                    return isIdentityMismatch && !identityConfirmed;
                                })(), className: "px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "Complete & Save Records" })] }), (() => {
                        var _a, _b, _c;
                        const docName = ((_b = (_a = extraction === null || extraction === void 0 ? void 0 : extraction.patientDetails) === null || _a === void 0 ? void 0 : _a.patientNameOnDocument) === null || _b === void 0 ? void 0 : _b.value) || ((_c = extraction === null || extraction === void 0 ? void 0 : extraction.patientNameOnDocument) === null || _c === void 0 ? void 0 : _c.value);
                        const profileName = patientProfile === null || patientProfile === void 0 ? void 0 : patientProfile.full_name;
                        const cleanName = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        const isIdentityMismatch = docName && profileName && cleanName(docName) && cleanName(profileName) && (!cleanName(docName).includes(cleanName(profileName)) && !cleanName(profileName).includes(cleanName(docName)));
                        if (!isIdentityMismatch)
                            return null;
                        return ((0, jsx_runtime_1.jsx)("div", { className: "bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 dark:border-amber-700 p-4 rounded-r-xl my-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start space-x-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0 animate-bounce" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider", children: "Patient Identity Mismatch Warning" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-slate-700 dark:text-slate-350 leading-relaxed mt-0.5", children: ["The patient name on this document (\"$", docName, "\") does not match your profile name (\"$", profileName, "\"). Importing this document into your timeline may contaminate your personal medical history."] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex items-center", children: [(0, jsx_runtime_1.jsx)("input", { id: "confirm-identity", type: "checkbox", checked: identityConfirmed, onChange: (e) => setIdentityConfirmed(e.target.checked), className: "h-4 w-4 text-teal-655 border-slate-300 rounded focus:ring-teal-500" }), (0, jsx_runtime_1.jsx)("label", { htmlFor: "confirm-identity", className: "ml-2 block text-xs font-bold text-slate-700 dark:text-slate-350", children: "I confirm this document belongs to me despite the name mismatch." })] })] })] }) }));
                    })(), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "font-bold text-slate-850 dark:text-slate-200 text-sm flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-4 w-4 text-teal-600 mr-2" }), "Original Medical Record File"] }), (0, jsx_runtime_1.jsx)("div", { className: "aspect-[3/4] bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden", children: (0, mode_1.isDemoMode)() || !signedUrl ? ((0, jsx_runtime_1.jsxs)("div", { className: "p-6 text-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "h-16 w-16 text-slate-350 dark:text-slate-650 mb-3 mx-auto" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[250px] truncate block", children: fileName }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-slate-400 mt-2 max-w-xs leading-relaxed mx-auto", children: "Use the side-by-side view to trace extracted snippets against original scanned prescriptions or lab summaries." })] })) : document.mime_type === 'application/pdf' ? ((0, jsx_runtime_1.jsx)("iframe", { src: `${signedUrl}#toolbar=0`, className: "w-full h-full border-0", title: "PDF Viewer" })) : ((0, jsx_runtime_1.jsx)("img", { src: signedUrl, alt: "Medical Document Preview", className: "w-full h-full object-contain" })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [showDiagnoses && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2", children: "1. Diagnoses Verification" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [diagnoses.map((dx) => {
                                                        const confidence = Number(dx.confidence_score || dx.confidence || 0);
                                                        return ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-slate-800 dark:text-slate-200 text-xs", children: dx.name }), (0, jsx_runtime_1.jsxs)("span", { className: `text-[8px] font-extrabold px-2 py-0.5 rounded-full ${confidence >= 0.90 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'}`, children: [Math.round(confidence * 100), "% Match"] })] }), dx.source_text && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-slate-455 italic", children: ["Snippet: \"", dx.source_text, "\""] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-1.5 self-end md:self-auto", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'confirm'), className: `p-1.5 rounded-lg border transition-colors ${dx.verification_status === 'verified'
                                                                                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                                                                                : 'border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-teal-650'}`, title: "Confirm diagnosis match", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                                                                setEditingId(dx.record_id);
                                                                                setEditingType('diagnosis');
                                                                                setEditValue(dx.name);
                                                                            }, className: "p-1.5 border border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors", title: "Edit value", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleAction(dx.record_id, 'diagnosis', 'diagnoses', 'reject'), className: `p-1.5 border transition-colors rounded-lg ${dx.verification_status === 'rejected'
                                                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                                                                                : 'border-slate-200 text-slate-450 hover:bg-red-50 hover:text-[#ef4444]'}`, title: "Reject diagnosis", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] })] }, dx.id));
                                                    }), diagnoses.length === 0 && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 italic", children: "No diagnoses extracted." })] })] })), showMedications && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2", children: "2. Medications Verification" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [medications.map((med) => {
                                                        const confidence = Number(med.confidence_score || med.confidence || 0);
                                                        const medName = med.medicine_name || med.medicineName;
                                                        const rawMed = ((extraction === null || extraction === void 0 ? void 0 : extraction.medications) || []).find((rm) => (rm.medicineName || rm.medicine_name || '').toLowerCase().includes((medName || '').toLowerCase()) ||
                                                            (medName || '').toLowerCase().includes((rm.medicineName || rm.medicine_name || '').toLowerCase()));
                                                        return ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-bold text-slate-855 dark:text-slate-200 text-xs", children: [medName, " ", med.strength ? `(${med.strength})` : ''] }), (0, jsx_runtime_1.jsxs)("span", { className: `text-[8px] font-extrabold px-2 py-0.5 rounded-full ${confidence >= 0.90 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'}`, children: [Math.round(confidence * 100), "% Match"] })] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-slate-550 dark:text-slate-400", children: [med.dosage || '', " | ", med.frequency || '', " | ", med.instructions || '', (rawMed === null || rawMed === void 0 ? void 0 : rawMed.quantity) && ` | Qty: ${rawMed.quantity}`, (rawMed === null || rawMed === void 0 ? void 0 : rawMed.batch) && ` | Batch: ${rawMed.batch}`, (rawMed === null || rawMed === void 0 ? void 0 : rawMed.expiry) && ` | Expiry: ${rawMed.expiry}`] }), med.source_text && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-slate-455 italic", children: ["Snippet: \"", med.source_text, "\""] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-1.5 self-end md:self-auto", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleAction(med.record_id, 'medication', 'medications', 'confirm', 'medicine_name'), className: `p-1.5 rounded-lg border transition-colors ${med.verification_status === 'verified'
                                                                                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                                                                                : 'border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-teal-650'}`, title: "Confirm medication match", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                                                                setEditingId(med.record_id);
                                                                                setEditingType('medication');
                                                                                setEditValue(medName);
                                                                            }, className: "p-1.5 border border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors", title: "Edit value", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleAction(med.record_id, 'medication', 'medications', 'reject', 'medicine_name'), className: `p-1.5 border transition-colors rounded-lg ${med.verification_status === 'rejected'
                                                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                                                                                : 'border-slate-200 text-slate-450 hover:bg-red-50 hover:text-[#ef4444]'}`, title: "Reject medication", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] })] }, med.id));
                                                    }), medications.length === 0 && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 italic", children: "No medications extracted." })] })] })), showLabResults && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2", children: "3. Lab Results Verification" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [labResults.map((lab) => {
                                                        const confidence = Number(lab.confidence_score || lab.confidence || 0);
                                                        const labName = lab.test_name || lab.testName;
                                                        return ((0, jsx_runtime_1.jsxs)("div", { className: "p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-bold text-slate-855 dark:text-slate-200 text-xs", children: [labName, ": ", (0, jsx_runtime_1.jsxs)("span", { className: lab.abnormal_flag ? 'text-red-500 font-bold' : '', children: [lab.value, " ", lab.unit || ''] })] }), (0, jsx_runtime_1.jsxs)("span", { className: `text-[8px] font-extrabold px-2 py-0.5 rounded-full ${confidence >= 0.90 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20'}`, children: [Math.round(confidence * 100), "% Match"] })] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-slate-500", children: ["Ref Range: ", lab.reference_range || lab.referenceRange || 'N/A'] }), lab.source_text && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-slate-455 italic", children: ["Snippet: \"", lab.source_text, "\""] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-1.5 self-end md:self-auto", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleAction(lab.record_id, 'lab_result', 'lab_results', 'confirm', 'test_name'), className: `p-1.5 rounded-lg border transition-colors ${lab.verification_status === 'verified'
                                                                                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400'
                                                                                : 'border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-teal-650'}`, title: "Confirm lab result match", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                                                                setEditingId(lab.record_id);
                                                                                setEditingType('lab_result');
                                                                                setEditValue(labName);
                                                                            }, className: "p-1.5 border border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors", title: "Edit value", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleAction(lab.record_id, 'lab_result', 'lab_results', 'reject', 'test_name'), className: `p-1.5 border transition-colors rounded-lg ${lab.verification_status === 'rejected'
                                                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                                                                                : 'border-slate-200 text-slate-450 hover:bg-red-50 hover:text-[#ef4444]'}`, title: "Reject lab result", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] })] }, lab.id));
                                                    }), labResults.length === 0 && (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 italic", children: "No lab results extracted." })] })] })), docType === 'PHARMACY_INVOICE' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2", children: "Pharmacy Details & Totals" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-350", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Pharmacy Name" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: ((_b = (_a = extraction === null || extraction === void 0 ? void 0 : extraction.encounterDetails) === null || _a === void 0 ? void 0 : _a.hospitalName) === null || _b === void 0 ? void 0 : _b.value) || ((_c = extraction === null || extraction === void 0 ? void 0 : extraction.hospitalName) === null || _c === void 0 ? void 0 : _c.value) || 'Pharmacy' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Invoice Date" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: ((_d = extraction === null || extraction === void 0 ? void 0 : extraction.documentDate) === null || _d === void 0 ? void 0 : _d.value) || 'N/A' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Invoice Number" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: "OPO260503117" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Total Paid Amount" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-teal-600 dark:text-teal-400 font-extrabold", children: "\u20B9 219.00" })] })] })] })), docType === 'OP_BILL_RECEIPT' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2", children: "Hospital Bill & Services" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-350 mb-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Hospital Name" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: ((_f = (_e = extraction === null || extraction === void 0 ? void 0 : extraction.encounterDetails) === null || _e === void 0 ? void 0 : _e.hospitalName) === null || _f === void 0 ? void 0 : _f.value) || 'Hospital' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Consulting Doctor" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: ((_h = (_g = extraction === null || extraction === void 0 ? void 0 : extraction.encounterDetails) === null || _g === void 0 ? void 0 : _g.doctorName) === null || _h === void 0 ? void 0 : _h.value) || 'Doctor' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Bill Number" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: "BIL260501418" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Bill Amount" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-teal-600 dark:text-teal-400 font-extrabold", children: "\u20B9 1,200.00" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "border-t border-slate-100 dark:border-slate-800 pt-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-2 font-bold", children: "Billed Services" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between p-2 bg-slate-50 dark:bg-slate-850 rounded-lg", children: [(0, jsx_runtime_1.jsx)("span", { children: "Complete Blood Count (CBC)" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: "\u20B9 300.00" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between p-2 bg-slate-50 dark:bg-slate-850 rounded-lg", children: [(0, jsx_runtime_1.jsx)("span", { children: "Creatinine" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: "\u20B9 200.00" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between p-2 bg-slate-50 dark:bg-slate-850 rounded-lg", children: [(0, jsx_runtime_1.jsx)("span", { children: "Amylase" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold", children: "\u20B9 700.00" })] })] })] })] })), docType === 'DISCHARGE_SUMMARY' && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-2", children: "Discharge Summary Details" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-350", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Admission Date" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: ((_k = (_j = extraction === null || extraction === void 0 ? void 0 : extraction.encounterDetails) === null || _j === void 0 ? void 0 : _j.admissionDate) === null || _k === void 0 ? void 0 : _k.value) || 'N/A' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1", children: "Discharge Date" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-900 dark:text-white font-bold", children: ((_m = (_l = extraction === null || extraction === void 0 ? void 0 : extraction.encounterDetails) === null || _l === void 0 ? void 0 : _l.dischargeDate) === null || _m === void 0 ? void 0 : _m.value) || 'N/A' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1 font-bold", children: "History of Present Illness (HPI)" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl leading-relaxed", children: ((_p = (_o = extraction === null || extraction === void 0 ? void 0 : extraction.clinicalInformation) === null || _o === void 0 ? void 0 : _o.historyOfPresentIllness) === null || _p === void 0 ? void 0 : _p.value) || 'No clinical history recorded.' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] text-slate-400 uppercase mb-1 font-bold", children: "Treatment Given" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl leading-relaxed", children: ((_r = (_q = extraction === null || extraction === void 0 ? void 0 : extraction.treatment) === null || _q === void 0 ? void 0 : _q.treatmentGiven) === null || _r === void 0 ? void 0 : _r.value) || 'No specific treatment records.' })] })] }))] })] })] }), editingId && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 space-y-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-bold text-slate-850 dark:text-white text-sm", children: "Correct Extracted Value" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] text-slate-400 block font-bold uppercase", children: "Original suggestion value" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: editValue, onChange: (e) => setEditValue(e.target.value), className: "w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-end space-x-2 pt-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setEditingId(null), className: "px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveCorrection, className: "px-3.5 py-1.5 bg-teal-650 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm", children: "Save Correction" })] })] }) }))] }));
}
