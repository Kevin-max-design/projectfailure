"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = 'lhmlmxcerkfbsytohnza';
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
function getCookieHeader(session) {
    const cookieValue = encodeURIComponent(JSON.stringify(session));
    return `${COOKIE_NAME}=${cookieValue}`;
}
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function runValidation() {
    console.log('================================================================');
    console.log('         MEDMEMORY FINAL REAL APPLICATION E2E VALIDATION        ');
    console.log('================================================================\n');
    const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
    });
    const adminSupabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
    // User details
    const emailA = 'real_app_test_user_a@medmemory.test';
    const emailB = 'real_app_test_user_b@medmemory.test';
    const password = 'Password123!';
    // 1. Clean up & Create User A and User B
    console.log('Step 1: Setting up clean test users (User A & User B)...');
    const { data: listData } = await adminSupabase.auth.admin.listUsers();
    const existingA = listData === null || listData === void 0 ? void 0 : listData.users.find(u => u.email === emailA);
    if (existingA) {
        console.log(`  Deleting existing User A (${existingA.id})`);
        await adminSupabase.auth.admin.deleteUser(existingA.id);
    }
    const existingB = listData === null || listData === void 0 ? void 0 : listData.users.find(u => u.email === emailB);
    if (existingB) {
        console.log(`  Deleting existing User B (${existingB.id})`);
        await adminSupabase.auth.admin.deleteUser(existingB.id);
    }
    // Create User A
    const { data: { user: userA }, error: errCreateA } = await adminSupabase.auth.admin.createUser({
        email: emailA,
        password,
        email_confirm: true
    });
    if (errCreateA || !userA) {
        throw new Error(`Failed to create User A: ${errCreateA === null || errCreateA === void 0 ? void 0 : errCreateA.message}`);
    }
    console.log(`  Created User A: ${userA.id}`);
    // Create Patient A profile
    const { data: patientA, error: errPatA } = await adminSupabase.from('patients').insert({
        user_id: userA.id,
        full_name: 'Arun Kumar (User A)',
        date_of_birth: '1981-05-10',
        gender: 'Male'
    }).select().single();
    if (errPatA || !patientA) {
        throw new Error(`Failed to create Patient A: ${errPatA === null || errPatA === void 0 ? void 0 : errPatA.message}`);
    }
    console.log(`  Created Patient A profile: ${patientA.id}`);
    // Create User B
    const { data: { user: userB }, error: errCreateB } = await adminSupabase.auth.admin.createUser({
        email: emailB,
        password,
        email_confirm: true
    });
    if (errCreateB || !userB) {
        throw new Error(`Failed to create User B: ${errCreateB === null || errCreateB === void 0 ? void 0 : errCreateB.message}`);
    }
    console.log(`  Created User B: ${userB.id}`);
    // Create Patient B profile
    const { data: patientB, error: errPatB } = await adminSupabase.from('patients').insert({
        user_id: userB.id,
        full_name: 'Priya S. (User B)',
        date_of_birth: '1988-08-15',
        gender: 'Female'
    }).select().single();
    if (errPatB || !patientB) {
        throw new Error(`Failed to create Patient B: ${errPatB === null || errPatB === void 0 ? void 0 : errPatB.message}`);
    }
    console.log(`  Created Patient B profile: ${patientB.id}`);
    // Login as User A to get session cookie
    const { data: { session: sessionA }, error: errLoginA } = await supabase.auth.signInWithPassword({
        email: emailA,
        password
    });
    if (errLoginA || !sessionA) {
        throw new Error(`Failed to log in as User A: ${errLoginA === null || errLoginA === void 0 ? void 0 : errLoginA.message}`);
    }
    const cookieA = getCookieHeader(sessionA);
    // Login as User B to get session cookie
    const { data: { session: sessionB }, error: errLoginB } = await supabase.auth.signInWithPassword({
        email: emailB,
        password
    });
    if (errLoginB || !sessionB) {
        throw new Error(`Failed to log in as User B: ${errLoginB === null || errLoginB === void 0 ? void 0 : errLoginB.message}`);
    }
    const cookieB = getCookieHeader(sessionB);
    // 2. Upload Document A (CBC) & Document B (Biochem) as User A
    console.log('\nStep 2: Uploading problematic medical documents as User A...');
    const docPathA = path.join(process.cwd(), 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.10.jpeg');
    const docPathB = path.join(process.cwd(), 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.11.jpeg');
    const fileBytesA = fs.readFileSync(docPathA);
    const fileBytesB = fs.readFileSync(docPathB);
    // Helper to upload using fetch
    const uploadDoc = async (filename, buffer, mime, category) => {
        var _a;
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: mime });
        formData.append('file', blob, filename);
        formData.append('category', category);
        const res = await fetch('http://localhost:3000/api/documents/upload', {
            method: 'POST',
            headers: {
                'Cookie': cookieA
            },
            body: formData
        });
        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`Upload of ${filename} failed with status ${res.status}: ${errTxt}`);
        }
        const data = await res.json();
        return data.documentId || ((_a = data.document) === null || _a === void 0 ? void 0 : _a.id) || data.id;
    };
    console.log('  Uploading Document A (CBC)...');
    const docIdA = await uploadDoc('WhatsApp_Image_2026-07-18_at_17.19.10.jpeg', fileBytesA, 'image/jpeg', 'Lab Report');
    console.log(`  Document A uploaded successfully. ID: ${docIdA}`);
    console.log('  Uploading Document B (Biochemistry)...');
    const docIdB = await uploadDoc('WhatsApp_Image_2026-07-18_at_17.19.11.jpeg', fileBytesB, 'image/jpeg', 'Lab Report');
    console.log(`  Document B uploaded successfully. ID: ${docIdB}`);
    // 3. Trigger Processing via POST API
    console.log('\nStep 3: Triggering processing pipeline via actual API...');
    const triggerProcessing = async (docId) => {
        const res = await fetch(`http://localhost:3000/api/documents/${docId}/process`, {
            method: 'POST',
            headers: {
                'Cookie': cookieA
            }
        });
        if (res.status !== 202 && res.status !== 200) {
            const errTxt = await res.text();
            throw new Error(`Triggering process for ${docId} failed with status ${res.status}: ${errTxt}`);
        }
        console.log(`  Processing triggered successfully for ${docId}`);
    };
    await triggerProcessing(docIdA);
    await triggerProcessing(docIdB);
    // Poll until both are completed
    const pollStatus = async (docId) => {
        const start = Date.now();
        const timeout = 120000; // 2 minutes timeout
        while (Date.now() - start < timeout) {
            const res = await fetch(`http://localhost:3000/api/documents/${docId}/status`, {
                method: 'GET',
                headers: {
                    'Cookie': cookieA
                }
            });
            if (res.ok) {
                const data = await res.json();
                const status = data.status || data.processing_status;
                console.log(`  Document ${docId} status: ${status}`);
                if (status === 'awaiting_review' || status === 'completed') {
                    return true;
                }
                if (status === 'failed') {
                    throw new Error(`Processing failed for document ${docId}: ${data.error_message || data.safe_error_message}`);
                }
            }
            else {
                console.warn(`  Warning: status fetch failed with status ${res.status}`);
            }
            await delay(3000);
        }
        throw new Error(`Timeout waiting for processing of document ${docId}`);
    };
    console.log('  Polling status for Document A (CBC)...');
    await pollStatus(docIdA);
    console.log('  Polling status for Document B (Biochemistry)...');
    await pollStatus(docIdB);
    // 4. Verify Raw OCR Persistence & Skew/Rotation Metadata
    console.log('\nStep 4: Auditing database persistence, rotation, skew & layout metadata...');
    const auditDb = async (docId, label) => {
        const { data: pages, error } = await adminSupabase
            .from('document_pages')
            .select('*')
            .eq('document_id', docId);
        if (error || !pages || pages.length === 0) {
            throw new Error(`Database verification failed: no pages found for ${label} (${docId})`);
        }
        const page = pages[0];
        console.log(`  [${label}] Page count: ${pages.length}`);
        console.log(`  [${label}] OCR Provider used: ${page.ocr_provider}`);
        console.log(`  [${label}] Skew Angle: ${page.deskew_angle}°`);
        console.log(`  [${label}] Rotation Angle: ${page.rotation_angle}°`);
        console.log(`  [${label}] Image Dimensions: ${page.width}x${page.height}`);
        console.log(`  [${label}] Layout Blocks: ${Array.isArray(page.layout_blocks) ? page.layout_blocks.length : 0} blocks`);
        // Verify raw text is present and does not have placeholder text
        if (!page.ocr_text || page.ocr_text.length < 50) {
            throw new Error(`Database verification failed: empty or tiny raw OCR text for ${label}`);
        }
        console.log(`  [${label}] Raw text size: ${page.ocr_text.length} chars`);
        // Check for demo data contamination
        if (page.ocr_text.includes('MM-LOCAL-OCR-71826') || page.ocr_text.includes('Pancreatitis')) {
            throw new Error(`Database verification failed: Demo data contamination found in raw OCR text!`);
        }
    };
    await auditDb(docIdA, 'Document A (CBC)');
    await auditDb(docIdB, 'Document B (Biochem)');
    // 5. Verify Structured Extraction
    console.log('\nStep 5: Verifying structured lab results extraction...');
    const checkLabs = async (docId, label, expectedLabs) => {
        const { data: labs, error } = await adminSupabase
            .from('lab_results')
            .select('*')
            .eq('source_document_id', docId);
        if (error || !labs) {
            throw new Error(`Failed to fetch lab results for ${label}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        console.log(`  [${label}] Extracted structured lab records count: ${labs.length}`);
        const names = labs.map((l) => l.test_name.toLowerCase());
        console.log(`  [${label}] Labs: ${labs.map((l) => `${l.test_name}: ${l.value} ${l.unit || ''}`).join(', ')}`);
        for (const expected of expectedLabs) {
            const found = names.some((n) => n.includes(expected.toLowerCase()));
            if (!found) {
                throw new Error(`Structured extraction failed: ${expected} was not extracted in ${label}!`);
            }
        }
        console.log(`  [${label}] ✅ All expected labs successfully verified.`);
        if (label.includes('CBC')) {
            const wbc = labs.find((l) => l.test_name.toLowerCase().includes('wbc'));
            const rbc = labs.find((l) => l.test_name.toLowerCase().includes('rbc'));
            const platelets = labs.find((l) => l.test_name.toLowerCase().includes('platelet'));
            if (wbc) {
                console.log(`    WBC Database record: value="${wbc.value}", unit="${wbc.unit}", raw_value="${wbc.raw_value}", raw_unit="${wbc.raw_unit}", norm_value="${wbc.normalized_value}", norm_unit="${wbc.normalized_unit}", status="${wbc.normalization_status}"`);
                if (wbc.normalization_status !== 'needs_review' || wbc.normalized_unit !== null) {
                    throw new Error(`WBC validation error: expected status needs_review, got ${wbc.normalization_status}`);
                }
            }
            if (rbc) {
                console.log(`    RBC Database record: value="${rbc.value}", unit="${rbc.unit}", raw_value="${rbc.raw_value}", raw_unit="${rbc.raw_unit}", norm_value="${rbc.normalized_value}", norm_unit="${rbc.normalized_unit}", status="${rbc.normalization_status}"`);
                if (rbc.normalization_status !== 'normalized' || rbc.normalized_unit !== 'Millions/cumm') {
                    throw new Error(`RBC validation error: expected status normalized and unit Millions/cumm, got status=${rbc.normalization_status}, unit=${rbc.normalized_unit}`);
                }
            }
            if (platelets) {
                console.log(`    Platelets Database record: value="${platelets.value}", unit="${platelets.unit}", raw_value="${platelets.raw_value}", raw_unit="${platelets.raw_unit}", norm_value="${platelets.normalized_value}", norm_unit="${platelets.normalized_unit}", status="${platelets.normalization_status}"`);
                if (platelets.normalization_status !== 'needs_review' || platelets.normalized_unit !== null) {
                    throw new Error(`Platelets validation error: expected status needs_review, got ${platelets.normalization_status}`);
                }
            }
        }
        return labs;
    };
    // Expected CBC labs
    const cbcLabs = await checkLabs(docIdA, 'Document A (CBC)', ['Haemoglobin', 'RBC', 'WBC', 'Platelet']);
    // Expected Biochem labs
    const biochemLabs = await checkLabs(docIdB, 'Document B (Biochem)', ['Bilirubin', 'Cholesterol', 'HbA1c']);
    // 6. Verify Review UI & API Payload Responses
    console.log('\nStep 6: Verifying Review UI payload endpoint & properties...');
    const verifyReviewApi = async (docId, label) => {
        var _a, _b, _c, _d;
        const res = await fetch(`http://localhost:3000/api/documents/${docId}`, {
            method: 'GET',
            headers: {
                'Cookie': cookieA
            }
        });
        if (!res.ok) {
            throw new Error(`Fetching review payload for ${label} failed with status ${res.status}`);
        }
        const data = await res.json();
        const ext = data.extraction;
        if (!ext) {
            throw new Error(`Review API failed: missing extraction payload for ${label}`);
        }
        console.log(`  [${label}] Extraction type detected: ${ext.documentType}`);
        // Check extraction metadata properties
        const totalReadable = ((_a = ext.coverageMetrics) === null || _a === void 0 ? void 0 : _a.totalReadableTextBlocks) || 0;
        const mapped = ((_b = ext.coverageMetrics) === null || _b === void 0 ? void 0 : _b.mappedStructuredBlocks) || 0;
        const unmapped = ((_c = ext.coverageMetrics) === null || _c === void 0 ? void 0 : _c.unmappedBlocks) || 0;
        const unreadable = ((_d = ext.coverageMetrics) === null || _d === void 0 ? void 0 : _d.unreadableBlocks) || 0;
        const unaccounted = totalReadable - (mapped + unmapped + unreadable);
        console.log(`\n  [${label}] REPORT:`);
        console.log(`    TOTAL OCR READABLE BLOCKS: ${totalReadable}`);
        console.log(`    MAPPED BLOCKS: ${mapped}`);
        console.log(`    UNMAPPED BLOCKS: ${unmapped}`);
        console.log(`    UNREADABLE BLOCKS: ${unreadable}`);
        console.log(`    UNACCOUNTED BLOCKS: ${unaccounted}\n`);
        if (unaccounted !== 0) {
            throw new Error(`Coverage Invariant Failure: Unaccounted blocks must be exactly 0, got ${unaccounted}`);
        }
        // Verify unmapped content exists and was preserved
        if (ext.unmappedDocumentedInformation && ext.unmappedDocumentedInformation.length > 0) {
            console.log(`  [${label}] Unmapped items count: ${ext.unmappedDocumentedInformation.length}`);
            console.log(`  [${label}] Sample unmapped item: "${ext.unmappedDocumentedInformation[0].text.substring(0, 100)}..."`);
        }
        else {
            console.log(`  [${label}] No unmapped content found.`);
        }
        // Check for demo data contamination in the payload
        const rawPayloadStr = JSON.stringify(ext);
        if (rawPayloadStr.includes('John Doe') || rawPayloadStr.includes('Sarah Connor') || rawPayloadStr.includes('Acute Gastritis')) {
            throw new Error(`Demo contamination detected in structured extraction payload!`);
        }
        console.log(`  [${label}] ✅ Review API response successfully validated.`);
    };
    await verifyReviewApi(docIdA, 'Document A (CBC)');
    await verifyReviewApi(docIdB, 'Document B (Biochem)');
    // 7. Verify Timeline Events via Verification POST
    console.log('\nStep 7: Verifying timeline generation via verification sync...');
    // Confirm first lab result for Document A (CBC)
    const targetLab = cbcLabs[0];
    console.log(`  Confirming lab result: ${targetLab.test_name} (${targetLab.record_id})`);
    const verifyRes = await fetch(`http://localhost:3000/api/documents/${docIdA}/verify`, {
        method: 'POST',
        headers: {
            'Cookie': cookieA,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            recordId: targetLab.record_id,
            entityType: 'lab_results',
            action: 'confirm',
            fieldName: 'test_name',
            oldValue: 'pending_review',
            newValue: 'verified'
        })
    });
    if (!verifyRes.ok) {
        const txt = await verifyRes.text();
        throw new Error(`Lab confirmation verification request failed: ${txt}`);
    }
    console.log('  Successfully confirmed lab result. Querying timeline...');
    // Query timeline
    const timelineRes = await fetch('http://localhost:3000/api/timeline', {
        method: 'GET',
        headers: {
            'Cookie': cookieA
        }
    });
    if (!timelineRes.ok) {
        throw new Error(`Fetching timeline failed: status ${timelineRes.status}`);
    }
    const timelineData = await timelineRes.json();
    console.log(`  Timeline events count: ${timelineData.length}`);
    if (timelineData.length === 0) {
        throw new Error('Timeline generation failed: timeline is empty after confirming lab result!');
    }
    const hasEventForDoc = timelineData.some((e) => e.source_document_id === docIdA);
    if (!hasEventForDoc) {
        throw new Error('Timeline event not found matching the confirmed document ID!');
    }
    console.log(`  ✅ Timeline event successfully generated for Document A: "${timelineData[0].title}"`);
    // 8. Verify RAG Question Answering (Document A & B)
    console.log('\nStep 8: Verifying offline RAG question answering with grounded citations...');
    const askRag = async (question) => {
        const askRes = await fetch('http://localhost:3000/api/ask', {
            method: 'POST',
            headers: {
                'Cookie': cookieA,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });
        if (!askRes.ok) {
            throw new Error(`RAG query failed with status ${askRes.status}`);
        }
        return await askRes.json();
    };
    // Question on Document A (CBC)
    console.log('  Asking RAG about hemoglobin...');
    const ansA = await askRag('What is my hemoglobin level?');
    console.log(`    Answer: "${ansA.answer}"`);
    console.log(`    Citations: ${JSON.stringify(ansA.citations)}`);
    if (!ansA.answer.toLowerCase().includes('13.2') && !ansA.answer.toLowerCase().includes('haemoglobin')) {
        throw new Error('RAG hemoglobin answer seems incorrect or ungrounded!');
    }
    if (!ansA.citations || ansA.citations.length === 0) {
        throw new Error('RAG answer is missing citations!');
    }
    // Question on Document B (Biochem)
    console.log('  Asking RAG about bilirubin...');
    const ansB = await askRag('What is my total bilirubin level?');
    console.log(`    Answer: "${ansB.answer}"`);
    console.log(`    Citations: ${JSON.stringify(ansB.citations)}`);
    if (!ansB.answer.toLowerCase().includes('0.4')) {
        throw new Error('RAG bilirubin answer seems incorrect or ungrounded!');
    }
    // Question on absent topic (No hallucination test)
    console.log('  Asking RAG about absent topic (thyroid / TSH)...');
    const ansC = await askRag('What is my TSH (thyroid) level?');
    console.log(`    Answer: "${ansC.answer}"`);
    const answerLower = ansC.answer.toLowerCase();
    const isAbsentResponse = answerLower.includes('no information') ||
        answerLower.includes('do not find') ||
        answerLower.includes('not mention') ||
        answerLower.includes('unable to find') ||
        answerLower.includes('not found') ||
        answerLower.includes('not available') ||
        answerLower.includes("couldn't find") ||
        answerLower.includes("could not find");
    if (!isAbsentResponse) {
        throw new Error('RAG hallucinated: expected a clean missing response for TSH, but got an answer!');
    }
    console.log('  ✅ RAG Hallucination Guard Verified.');
    // 9. Verify Patient Isolation (Cross-Patient Leakage)
    console.log('\nStep 9: Testing cross-patient data leakage protection (User B accessing User A)...');
    // User B tries to view User A's document details
    const viewRes = await fetch(`http://localhost:3000/api/documents/${docIdA}`, {
        method: 'GET',
        headers: {
            'Cookie': cookieB
        }
    });
    console.log(`  User B GET /api/documents/${docIdA}: status ${viewRes.status}`);
    if (viewRes.status !== 403 && viewRes.status !== 404) {
        throw new Error(`Security breach: User B accessed User A's document details (status ${viewRes.status})!`);
    }
    // User B tries to trigger processing on User A's document
    const procRes = await fetch(`http://localhost:3000/api/documents/${docIdA}/process`, {
        method: 'POST',
        headers: {
            'Cookie': cookieB
        }
    });
    console.log(`  User B POST /api/documents/${docIdA}/process: status ${procRes.status}`);
    if (procRes.status !== 403 && procRes.status !== 404) {
        throw new Error(`Security breach: User B triggered processing on User A's document (status ${procRes.status})!`);
    }
    // User B queries RAG asking about User A's hemoglobin
    const askResB = await fetch('http://localhost:3000/api/ask', {
        method: 'POST',
        headers: {
            'Cookie': cookieB,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: 'What is my hemoglobin level?' })
    });
    if (askResB.ok) {
        const dataB = await askResB.json();
        console.log(`  User B RAG query output: "${dataB.answer}"`);
        if (dataB.answer.includes('13.2') || dataB.answer.toLowerCase().includes('haemoglobin')) {
            throw new Error(`Security breach: User B RAG retrieved User A's private hemoglobin data!`);
        }
    }
    else {
        console.log(`  User B RAG query response status: ${askResB.status}`);
    }
    console.log('  ✅ Patient Isolation Security successfully verified.');
    console.log('\n================================================================');
    console.log('         🎉 ALL FINAL REAL-APP E2E VALIDATIONS PASSED!          ');
    console.log('================================================================');
    console.log('VERDICT: COMPLETE EXTRACTION FIX VERIFIED');
}
runValidation().catch(err => {
    console.error('\n❌ E2E Validation failed:');
    console.error(err.stack || err.message || err);
    console.log('VERDICT: FAILED');
    process.exit(1);
});
