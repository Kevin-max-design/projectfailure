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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = __importStar(require("dotenv"));
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
var SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
var PROJECT_REF = 'lhmlmxcerkfbsytohnza';
var COOKIE_NAME = "sb-".concat(PROJECT_REF, "-auth-token");
function getCookieHeader(session) {
    var cookieValue = encodeURIComponent(JSON.stringify(session));
    return "".concat(COOKIE_NAME, "=").concat(cookieValue);
}
function delay(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
        });
    });
}
function runValidation() {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, adminSupabase, emailA, emailB, password, listData, existingA, existingB, _a, userA, errCreateA, _b, patientA, errPatA, _c, userB, errCreateB, _d, patientB, errPatB, _e, sessionA, errLoginA, cookieA, _f, sessionB, errLoginB, cookieB, docPathA, docPathB, fileBytesA, fileBytesB, uploadDoc, docIdA, docIdB, triggerProcessing, pollStatus, auditDb, checkLabs, cbcLabs, biochemLabs, verifyReviewApi, targetLab, verifyRes, txt, timelineRes, timelineData, hasEventForDoc, askRag, ansA, ansB, ansC, answerLower, isAbsentResponse, viewRes, procRes, askResB, dataB;
        var _this = this;
        var _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    console.log('================================================================');
                    console.log('         MEDMEMORY FINAL REAL APPLICATION E2E VALIDATION        ');
                    console.log('================================================================\n');
                    supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
                        auth: { persistSession: false }
                    });
                    adminSupabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SERVICE_ROLE_KEY, {
                        auth: { persistSession: false }
                    });
                    emailA = 'real_app_test_user_a@medmemory.test';
                    emailB = 'real_app_test_user_b@medmemory.test';
                    password = 'Password123!';
                    // 1. Clean up & Create User A and User B
                    console.log('Step 1: Setting up clean test users (User A & User B)...');
                    return [4 /*yield*/, adminSupabase.auth.admin.listUsers()];
                case 1:
                    listData = (_j.sent()).data;
                    existingA = (_g = listData === null || listData === void 0 ? void 0 : listData.users) === null || _g === void 0 ? void 0 : _g.find(function (u) { return u.email === emailA; });
                    if (!existingA) return [3 /*break*/, 3];
                    console.log("  Deleting existing User A (".concat(existingA.id, ")"));
                    return [4 /*yield*/, adminSupabase.auth.admin.deleteUser(existingA.id)];
                case 2:
                    _j.sent();
                    _j.label = 3;
                case 3:
                    existingB = (_h = listData === null || listData === void 0 ? void 0 : listData.users) === null || _h === void 0 ? void 0 : _h.find(function (u) { return u.email === emailB; });
                    if (!existingB) return [3 /*break*/, 5];
                    console.log("  Deleting existing User B (".concat(existingB.id, ")"));
                    return [4 /*yield*/, adminSupabase.auth.admin.deleteUser(existingB.id)];
                case 4:
                    _j.sent();
                    _j.label = 5;
                case 5: return [4 /*yield*/, adminSupabase.auth.admin.createUser({
                        email: emailA,
                        password: password,
                        email_confirm: true
                    })];
                case 6:
                    _a = _j.sent(), userA = _a.data.user, errCreateA = _a.error;
                    if (errCreateA || !userA) {
                        throw new Error("Failed to create User A: ".concat(errCreateA === null || errCreateA === void 0 ? void 0 : errCreateA.message));
                    }
                    console.log("  Created User A: ".concat(userA.id));
                    return [4 /*yield*/, adminSupabase.from('patients').insert({
                            user_id: userA.id,
                            full_name: 'Arun Kumar (User A)',
                            date_of_birth: '1981-05-10',
                            gender: 'Male'
                        }).select().single()];
                case 7:
                    _b = _j.sent(), patientA = _b.data, errPatA = _b.error;
                    if (errPatA || !patientA) {
                        throw new Error("Failed to create Patient A: ".concat(errPatA === null || errPatA === void 0 ? void 0 : errPatA.message));
                    }
                    console.log("  Created Patient A profile: ".concat(patientA.id));
                    return [4 /*yield*/, adminSupabase.auth.admin.createUser({
                            email: emailB,
                            password: password,
                            email_confirm: true
                        })];
                case 8:
                    _c = _j.sent(), userB = _c.data.user, errCreateB = _c.error;
                    if (errCreateB || !userB) {
                        throw new Error("Failed to create User B: ".concat(errCreateB === null || errCreateB === void 0 ? void 0 : errCreateB.message));
                    }
                    console.log("  Created User B: ".concat(userB.id));
                    return [4 /*yield*/, adminSupabase.from('patients').insert({
                            user_id: userB.id,
                            full_name: 'Priya S. (User B)',
                            date_of_birth: '1988-08-15',
                            gender: 'Female'
                        }).select().single()];
                case 9:
                    _d = _j.sent(), patientB = _d.data, errPatB = _d.error;
                    if (errPatB || !patientB) {
                        throw new Error("Failed to create Patient B: ".concat(errPatB === null || errPatB === void 0 ? void 0 : errPatB.message));
                    }
                    console.log("  Created Patient B profile: ".concat(patientB.id));
                    return [4 /*yield*/, supabase.auth.signInWithPassword({
                            email: emailA,
                            password: password
                        })];
                case 10:
                    _e = _j.sent(), sessionA = _e.data.session, errLoginA = _e.error;
                    if (errLoginA || !sessionA) {
                        throw new Error("Failed to log in as User A: ".concat(errLoginA === null || errLoginA === void 0 ? void 0 : errLoginA.message));
                    }
                    cookieA = getCookieHeader(sessionA);
                    return [4 /*yield*/, supabase.auth.signInWithPassword({
                            email: emailB,
                            password: password
                        })];
                case 11:
                    _f = _j.sent(), sessionB = _f.data.session, errLoginB = _f.error;
                    if (errLoginB || !sessionB) {
                        throw new Error("Failed to log in as User B: ".concat(errLoginB === null || errLoginB === void 0 ? void 0 : errLoginB.message));
                    }
                    cookieB = getCookieHeader(sessionB);
                    // 2. Upload Document A (CBC) & Document B (Biochem) as User A
                    console.log('\nStep 2: Uploading problematic medical documents as User A...');
                    docPathA = path.join(process.cwd(), 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.10.jpeg');
                    docPathB = path.join(process.cwd(), 'tests/fixtures/WhatsApp_Image_2026-07-18_at_17.19.11.jpeg');
                    fileBytesA = fs.readFileSync(docPathA);
                    fileBytesB = fs.readFileSync(docPathB);
                    uploadDoc = function (filename, buffer, mime, category) { return __awaiter(_this, void 0, void 0, function () {
                        var formData, blob, res, errTxt, data;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    formData = new FormData();
                                    blob = new Blob([new Uint8Array(buffer)], { type: mime });
                                    formData.append('file', blob, filename);
                                    formData.append('category', category);
                                    return [4 /*yield*/, fetch('http://localhost:3000/api/documents/upload', {
                                            method: 'POST',
                                            headers: {
                                                'Cookie': cookieA
                                            },
                                            body: formData
                                        })];
                                case 1:
                                    res = _b.sent();
                                    if (!!res.ok) return [3 /*break*/, 3];
                                    return [4 /*yield*/, res.text()];
                                case 2:
                                    errTxt = _b.sent();
                                    throw new Error("Upload of ".concat(filename, " failed with status ").concat(res.status, ": ").concat(errTxt));
                                case 3: return [4 /*yield*/, res.json()];
                                case 4:
                                    data = _b.sent();
                                    return [2 /*return*/, data.documentId || ((_a = data.document) === null || _a === void 0 ? void 0 : _a.id) || data.id];
                            }
                        });
                    }); };
                    console.log('  Uploading Document A (CBC)...');
                    return [4 /*yield*/, uploadDoc('WhatsApp_Image_2026-07-18_at_17.19.10.jpeg', fileBytesA, 'image/jpeg', 'Lab Report')];
                case 12:
                    docIdA = _j.sent();
                    console.log("  Document A uploaded successfully. ID: ".concat(docIdA));
                    console.log('  Uploading Document B (Biochemistry)...');
                    return [4 /*yield*/, uploadDoc('WhatsApp_Image_2026-07-18_at_17.19.11.jpeg', fileBytesB, 'image/jpeg', 'Lab Report')];
                case 13:
                    docIdB = _j.sent();
                    console.log("  Document B uploaded successfully. ID: ".concat(docIdB));
                    // 3. Trigger Processing via POST API
                    console.log('\nStep 3: Triggering processing pipeline via actual API...');
                    triggerProcessing = function (docId) { return __awaiter(_this, void 0, void 0, function () {
                        var res, errTxt;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, fetch("http://localhost:3000/api/documents/".concat(docId, "/process"), {
                                        method: 'POST',
                                        headers: {
                                            'Cookie': cookieA
                                        }
                                    })];
                                case 1:
                                    res = _a.sent();
                                    if (!(res.status !== 202 && res.status !== 200)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, res.text()];
                                case 2:
                                    errTxt = _a.sent();
                                    throw new Error("Triggering process for ".concat(docId, " failed with status ").concat(res.status, ": ").concat(errTxt));
                                case 3:
                                    console.log("  Processing triggered successfully for ".concat(docId));
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, triggerProcessing(docIdA)];
                case 14:
                    _j.sent();
                    return [4 /*yield*/, triggerProcessing(docIdB)];
                case 15:
                    _j.sent();
                    pollStatus = function (docId) { return __awaiter(_this, void 0, void 0, function () {
                        var start, timeout, res, data, status_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    start = Date.now();
                                    timeout = 120000;
                                    _a.label = 1;
                                case 1:
                                    if (!(Date.now() - start < timeout)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, fetch("http://localhost:3000/api/documents/".concat(docId, "/status"), {
                                            method: 'GET',
                                            headers: {
                                                'Cookie': cookieA
                                            }
                                        })];
                                case 2:
                                    res = _a.sent();
                                    if (!res.ok) return [3 /*break*/, 4];
                                    return [4 /*yield*/, res.json()];
                                case 3:
                                    data = _a.sent();
                                    status_1 = data.status || data.processing_status;
                                    console.log("  Document ".concat(docId, " status: ").concat(status_1));
                                    if (status_1 === 'awaiting_review' || status_1 === 'completed') {
                                        return [2 /*return*/, true];
                                    }
                                    if (status_1 === 'failed') {
                                        throw new Error("Processing failed for document ".concat(docId, ": ").concat(data.error_message || data.safe_error_message));
                                    }
                                    return [3 /*break*/, 5];
                                case 4:
                                    console.warn("  Warning: status fetch failed with status ".concat(res.status));
                                    _a.label = 5;
                                case 5: return [4 /*yield*/, delay(3000)];
                                case 6:
                                    _a.sent();
                                    return [3 /*break*/, 1];
                                case 7: throw new Error("Timeout waiting for processing of document ".concat(docId));
                            }
                        });
                    }); };
                    console.log('  Polling status for Document A (CBC)...');
                    return [4 /*yield*/, pollStatus(docIdA)];
                case 16:
                    _j.sent();
                    console.log('  Polling status for Document B (Biochemistry)...');
                    return [4 /*yield*/, pollStatus(docIdB)];
                case 17:
                    _j.sent();
                    // 4. Verify Raw OCR Persistence & Skew/Rotation Metadata
                    console.log('\nStep 4: Auditing database persistence, rotation, skew & layout metadata...');
                    auditDb = function (docId, label) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, pages, error, page;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, adminSupabase
                                        .from('document_pages')
                                        .select('*')
                                        .eq('document_id', docId)];
                                case 1:
                                    _a = _b.sent(), pages = _a.data, error = _a.error;
                                    if (error || !pages || pages.length === 0) {
                                        throw new Error("Database verification failed: no pages found for ".concat(label, " (").concat(docId, ")"));
                                    }
                                    page = pages[0];
                                    console.log("  [".concat(label, "] Page count: ").concat(pages.length));
                                    console.log("  [".concat(label, "] OCR Provider used: ").concat(page.ocr_provider));
                                    console.log("  [".concat(label, "] Skew Angle: ").concat(page.deskew_angle, "\u00B0"));
                                    console.log("  [".concat(label, "] Rotation Angle: ").concat(page.rotation_angle, "\u00B0"));
                                    console.log("  [".concat(label, "] Image Dimensions: ").concat(page.width, "x").concat(page.height));
                                    console.log("  [".concat(label, "] Layout Blocks: ").concat(Array.isArray(page.layout_blocks) ? page.layout_blocks.length : 0, " blocks"));
                                    // Verify raw text is present and does not have placeholder text
                                    if (!page.ocr_text || page.ocr_text.length < 50) {
                                        throw new Error("Database verification failed: empty or tiny raw OCR text for ".concat(label));
                                    }
                                    console.log("  [".concat(label, "] Raw text size: ").concat(page.ocr_text.length, " chars"));
                                    // Check for demo data contamination
                                    if (page.ocr_text.includes('MM-LOCAL-OCR-71826') || page.ocr_text.includes('Pancreatitis')) {
                                        throw new Error("Database verification failed: Demo data contamination found in raw OCR text!");
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, auditDb(docIdA, 'Document A (CBC)')];
                case 18:
                    _j.sent();
                    return [4 /*yield*/, auditDb(docIdB, 'Document B (Biochem)')];
                case 19:
                    _j.sent();
                    // 5. Verify Structured Extraction
                    console.log('\nStep 5: Verifying structured lab results extraction...');
                    checkLabs = function (docId, label, expectedLabs) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, labs, error, names, _loop_1, _i, expectedLabs_1, expected, wbc, rbc, platelets;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, adminSupabase
                                        .from('lab_results')
                                        .select('*')
                                        .eq('source_document_id', docId)];
                                case 1:
                                    _a = _b.sent(), labs = _a.data, error = _a.error;
                                    if (error || !labs) {
                                        throw new Error("Failed to fetch lab results for ".concat(label, ": ").concat(error === null || error === void 0 ? void 0 : error.message));
                                    }
                                    console.log("  [".concat(label, "] Extracted structured lab records count: ").concat(labs.length));
                                    names = labs.map(function (l) { return l.test_name.toLowerCase(); });
                                    console.log("  [".concat(label, "] Labs: ").concat(labs.map(function (l) { return "".concat(l.test_name, ": ").concat(l.value, " ").concat(l.unit || ''); }).join(', ')));
                                    _loop_1 = function (expected) {
                                        var found = names.some(function (n) { return n.includes(expected.toLowerCase()); });
                                        if (!found) {
                                            throw new Error("Structured extraction failed: ".concat(expected, " was not extracted in ").concat(label, "!"));
                                        }
                                    };
                                    for (_i = 0, expectedLabs_1 = expectedLabs; _i < expectedLabs_1.length; _i++) {
                                        expected = expectedLabs_1[_i];
                                        _loop_1(expected);
                                    }
                                    console.log("  [".concat(label, "] \u2705 All expected labs successfully verified."));
                                    if (label.includes('CBC')) {
                                        wbc = labs.find(function (l) { return l.test_name.toLowerCase().includes('wbc'); });
                                        rbc = labs.find(function (l) { return l.test_name.toLowerCase().includes('rbc'); });
                                        platelets = labs.find(function (l) { return l.test_name.toLowerCase().includes('platelet'); });
                                        if (wbc) {
                                            console.log("    WBC Database record: value=\"".concat(wbc.value, "\", unit=\"").concat(wbc.unit, "\", raw_value=\"").concat(wbc.raw_value, "\", raw_unit=\"").concat(wbc.raw_unit, "\", norm_value=\"").concat(wbc.normalized_value, "\", norm_unit=\"").concat(wbc.normalized_unit, "\", status=\"").concat(wbc.normalization_status, "\""));
                                            if (wbc.normalization_status !== 'needs_review' || wbc.normalized_unit !== null) {
                                                throw new Error("WBC validation error: expected status needs_review, got ".concat(wbc.normalization_status));
                                            }
                                        }
                                        if (rbc) {
                                            console.log("    RBC Database record: value=\"".concat(rbc.value, "\", unit=\"").concat(rbc.unit, "\", raw_value=\"").concat(rbc.raw_value, "\", raw_unit=\"").concat(rbc.raw_unit, "\", norm_value=\"").concat(rbc.normalized_value, "\", norm_unit=\"").concat(rbc.normalized_unit, "\", status=\"").concat(rbc.normalization_status, "\""));
                                            if (rbc.normalization_status !== 'normalized' || rbc.normalized_unit !== 'Millions/cumm') {
                                                throw new Error("RBC validation error: expected status normalized and unit Millions/cumm, got status=".concat(rbc.normalization_status, ", unit=").concat(rbc.normalized_unit));
                                            }
                                        }
                                        if (platelets) {
                                            console.log("    Platelets Database record: value=\"".concat(platelets.value, "\", unit=\"").concat(platelets.unit, "\", raw_value=\"").concat(platelets.raw_value, "\", raw_unit=\"").concat(platelets.raw_unit, "\", norm_value=\"").concat(platelets.normalized_value, "\", norm_unit=\"").concat(platelets.normalized_unit, "\", status=\"").concat(platelets.normalization_status, "\""));
                                            if (platelets.normalization_status !== 'needs_review' || platelets.normalized_unit !== null) {
                                                throw new Error("Platelets validation error: expected status needs_review, got ".concat(platelets.normalization_status));
                                            }
                                        }
                                    }
                                    return [2 /*return*/, labs];
                            }
                        });
                    }); };
                    return [4 /*yield*/, checkLabs(docIdA, 'Document A (CBC)', ['Haemoglobin', 'RBC', 'WBC', 'Platelet'])];
                case 20:
                    cbcLabs = _j.sent();
                    return [4 /*yield*/, checkLabs(docIdB, 'Document B (Biochem)', ['Bilirubin', 'Cholesterol', 'HbA1c'])];
                case 21:
                    biochemLabs = _j.sent();
                    // 6. Verify Review UI & API Payload Responses
                    console.log('\nStep 6: Verifying Review UI payload endpoint & properties...');
                    verifyReviewApi = function (docId, label) { return __awaiter(_this, void 0, void 0, function () {
                        var res, data, ext, totalReadable, mapped, unmapped, unreadable, unaccounted, rawPayloadStr;
                        var _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0: return [4 /*yield*/, fetch("http://localhost:3000/api/documents/".concat(docId), {
                                        method: 'GET',
                                        headers: {
                                            'Cookie': cookieA
                                        }
                                    })];
                                case 1:
                                    res = _e.sent();
                                    if (!res.ok) {
                                        throw new Error("Fetching review payload for ".concat(label, " failed with status ").concat(res.status));
                                    }
                                    return [4 /*yield*/, res.json()];
                                case 2:
                                    data = _e.sent();
                                    ext = data.extraction;
                                    if (!ext) {
                                        throw new Error("Review API failed: missing extraction payload for ".concat(label));
                                    }
                                    console.log("  [".concat(label, "] Extraction type detected: ").concat(ext.documentType));
                                    totalReadable = ((_a = ext.coverageMetrics) === null || _a === void 0 ? void 0 : _a.totalReadableTextBlocks) || 0;
                                    mapped = ((_b = ext.coverageMetrics) === null || _b === void 0 ? void 0 : _b.mappedStructuredBlocks) || 0;
                                    unmapped = ((_c = ext.coverageMetrics) === null || _c === void 0 ? void 0 : _c.unmappedBlocks) || 0;
                                    unreadable = ((_d = ext.coverageMetrics) === null || _d === void 0 ? void 0 : _d.unreadableBlocks) || 0;
                                    unaccounted = totalReadable - (mapped + unmapped + unreadable);
                                    console.log("\n  [".concat(label, "] REPORT:"));
                                    console.log("    TOTAL OCR READABLE BLOCKS: ".concat(totalReadable));
                                    console.log("    MAPPED BLOCKS: ".concat(mapped));
                                    console.log("    UNMAPPED BLOCKS: ".concat(unmapped));
                                    console.log("    UNREADABLE BLOCKS: ".concat(unreadable));
                                    console.log("    UNACCOUNTED BLOCKS: ".concat(unaccounted, "\n"));
                                    if (unaccounted !== 0) {
                                        throw new Error("Coverage Invariant Failure: Unaccounted blocks must be exactly 0, got ".concat(unaccounted));
                                    }
                                    // Verify unmapped content exists and was preserved
                                    if (ext.unmappedDocumentedInformation && ext.unmappedDocumentedInformation.length > 0) {
                                        console.log("  [".concat(label, "] Unmapped items count: ").concat(ext.unmappedDocumentedInformation.length));
                                        console.log("  [".concat(label, "] Sample unmapped item: \"").concat(ext.unmappedDocumentedInformation[0].text.substring(0, 100), "...\""));
                                    }
                                    else {
                                        console.log("  [".concat(label, "] No unmapped content found."));
                                    }
                                    rawPayloadStr = JSON.stringify(ext);
                                    if (rawPayloadStr.includes('John Doe') || rawPayloadStr.includes('Sarah Connor') || rawPayloadStr.includes('Acute Gastritis')) {
                                        throw new Error("Demo contamination detected in structured extraction payload!");
                                    }
                                    console.log("  [".concat(label, "] \u2705 Review API response successfully validated."));
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, verifyReviewApi(docIdA, 'Document A (CBC)')];
                case 22:
                    _j.sent();
                    return [4 /*yield*/, verifyReviewApi(docIdB, 'Document B (Biochem)')];
                case 23:
                    _j.sent();
                    // 7. Verify Timeline Events via Verification POST
                    console.log('\nStep 7: Verifying timeline generation via verification sync...');
                    targetLab = cbcLabs[0];
                    console.log("  Confirming lab result: ".concat(targetLab.test_name, " (").concat(targetLab.record_id, ")"));
                    return [4 /*yield*/, fetch("http://localhost:3000/api/documents/".concat(docIdA, "/verify"), {
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
                        })];
                case 24:
                    verifyRes = _j.sent();
                    if (!!verifyRes.ok) return [3 /*break*/, 26];
                    return [4 /*yield*/, verifyRes.text()];
                case 25:
                    txt = _j.sent();
                    throw new Error("Lab confirmation verification request failed: ".concat(txt));
                case 26:
                    console.log('  Successfully confirmed lab result. Querying timeline...');
                    return [4 /*yield*/, fetch('http://localhost:3000/api/timeline', {
                            method: 'GET',
                            headers: {
                                'Cookie': cookieA
                            }
                        })];
                case 27:
                    timelineRes = _j.sent();
                    if (!timelineRes.ok) {
                        throw new Error("Fetching timeline failed: status ".concat(timelineRes.status));
                    }
                    return [4 /*yield*/, timelineRes.json()];
                case 28:
                    timelineData = _j.sent();
                    console.log("  Timeline events count: ".concat(timelineData.length));
                    if (timelineData.length === 0) {
                        throw new Error('Timeline generation failed: timeline is empty after confirming lab result!');
                    }
                    hasEventForDoc = timelineData.some(function (e) { return e.source_document_id === docIdA; });
                    if (!hasEventForDoc) {
                        throw new Error('Timeline event not found matching the confirmed document ID!');
                    }
                    console.log("  \u2705 Timeline event successfully generated for Document A: \"".concat(timelineData[0].title, "\""));
                    // 8. Verify RAG Question Answering (Document A & B)
                    console.log('\nStep 8: Verifying offline RAG question answering with grounded citations...');
                    askRag = function (question) { return __awaiter(_this, void 0, void 0, function () {
                        var askRes;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, fetch('http://localhost:3000/api/ask', {
                                        method: 'POST',
                                        headers: {
                                            'Cookie': cookieA,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ question: question })
                                    })];
                                case 1:
                                    askRes = _a.sent();
                                    if (!askRes.ok) {
                                        throw new Error("RAG query failed with status ".concat(askRes.status));
                                    }
                                    return [4 /*yield*/, askRes.json()];
                                case 2: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); };
                    // Question on Document A (CBC)
                    console.log('  Asking RAG about hemoglobin...');
                    return [4 /*yield*/, askRag('What is my hemoglobin level?')];
                case 29:
                    ansA = _j.sent();
                    console.log("    Answer: \"".concat(ansA.answer, "\""));
                    console.log("    Citations: ".concat(JSON.stringify(ansA.citations)));
                    if (!ansA.answer.toLowerCase().includes('13.2') && !ansA.answer.toLowerCase().includes('haemoglobin')) {
                        throw new Error('RAG hemoglobin answer seems incorrect or ungrounded!');
                    }
                    if (!ansA.citations || ansA.citations.length === 0) {
                        throw new Error('RAG answer is missing citations!');
                    }
                    // Question on Document B (Biochem)
                    console.log('  Asking RAG about bilirubin...');
                    return [4 /*yield*/, askRag('What is my total bilirubin level?')];
                case 30:
                    ansB = _j.sent();
                    console.log("    Answer: \"".concat(ansB.answer, "\""));
                    console.log("    Citations: ".concat(JSON.stringify(ansB.citations)));
                    if (!ansB.answer.toLowerCase().includes('0.4')) {
                        throw new Error('RAG bilirubin answer seems incorrect or ungrounded!');
                    }
                    // Question on absent topic (No hallucination test)
                    console.log('  Asking RAG about absent topic (thyroid / TSH)...');
                    return [4 /*yield*/, askRag('What is my TSH (thyroid) level?')];
                case 31:
                    ansC = _j.sent();
                    console.log("    Answer: \"".concat(ansC.answer, "\""));
                    answerLower = ansC.answer.toLowerCase();
                    isAbsentResponse = answerLower.includes('no information') ||
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
                    return [4 /*yield*/, fetch("http://localhost:3000/api/documents/".concat(docIdA), {
                            method: 'GET',
                            headers: {
                                'Cookie': cookieB
                            }
                        })];
                case 32:
                    viewRes = _j.sent();
                    console.log("  User B GET /api/documents/".concat(docIdA, ": status ").concat(viewRes.status));
                    if (viewRes.status !== 403 && viewRes.status !== 404) {
                        throw new Error("Security breach: User B accessed User A's document details (status ".concat(viewRes.status, ")!"));
                    }
                    return [4 /*yield*/, fetch("http://localhost:3000/api/documents/".concat(docIdA, "/process"), {
                            method: 'POST',
                            headers: {
                                'Cookie': cookieB
                            }
                        })];
                case 33:
                    procRes = _j.sent();
                    console.log("  User B POST /api/documents/".concat(docIdA, "/process: status ").concat(procRes.status));
                    if (procRes.status !== 403 && procRes.status !== 404) {
                        throw new Error("Security breach: User B triggered processing on User A's document (status ".concat(procRes.status, ")!"));
                    }
                    return [4 /*yield*/, fetch('http://localhost:3000/api/ask', {
                            method: 'POST',
                            headers: {
                                'Cookie': cookieB,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ question: 'What is my hemoglobin level?' })
                        })];
                case 34:
                    askResB = _j.sent();
                    if (!askResB.ok) return [3 /*break*/, 36];
                    return [4 /*yield*/, askResB.json()];
                case 35:
                    dataB = _j.sent();
                    console.log("  User B RAG query output: \"".concat(dataB.answer, "\""));
                    if (dataB.answer.includes('13.2') || dataB.answer.toLowerCase().includes('haemoglobin')) {
                        throw new Error("Security breach: User B RAG retrieved User A's private hemoglobin data!");
                    }
                    return [3 /*break*/, 37];
                case 36:
                    console.log("  User B RAG query response status: ".concat(askResB.status));
                    _j.label = 37;
                case 37:
                    console.log('  ✅ Patient Isolation Security successfully verified.');
                    console.log('\n================================================================');
                    console.log('         🎉 ALL FINAL REAL-APP E2E VALIDATIONS PASSED!          ');
                    console.log('================================================================');
                    console.log('VERDICT: COMPLETE EXTRACTION FIX VERIFIED');
                    return [2 /*return*/];
            }
        });
    });
}
runValidation().catch(function (err) {
    console.error('\n❌ E2E Validation failed:');
    console.error(err.stack || err.message || err);
    console.log('VERDICT: FAILED');
    process.exit(1);
});
