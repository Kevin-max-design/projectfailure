"use strict";
/**
 * Dense Document OCR Audit Script
 *
 * Runs each fixture image through the local OCR service (Tesseract + PaddleOCR if available),
 * prints the full extracted text, block counts, and key medical-section coverage stats.
 *
 * Usage:
 *   npx tsx tests/audit_dense_document.ts
 *
 * Prerequisites:
 *   npm run ocr:start   (OCR service must be running on port 8001)
 */
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const OCR_SERVICE_URL = 'http://127.0.0.1:8001';
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
// Medical section keywords to check coverage
const MEDICAL_SECTIONS = [
    { name: 'Patient Name/ID', patterns: [/patient\s*name/i, /patient\s*id/i, /name\s*:/i, /mr\.?\s*no/i] },
    { name: 'Date of Admission/Birth', patterns: [/date\s*of\s*admission/i, /d\.?o\.?b/i, /date\s*of\s*birth/i, /admitted\s*on/i] },
    { name: 'Diagnosis', patterns: [/diagnos/i, /impression/i, /clinical\s*diagnosis/i] },
    { name: 'Chief Complaint', patterns: [/chief\s*complaint/i, /presenting\s*complaint/i, /c\/o/i] },
    { name: 'History / HPI', patterns: [/history\s*of\s*present/i, /h\/o/i, /presenting\s*history/i] },
    { name: 'Vitals', patterns: [/vital/i, /bp\s*:/i, /blood\s*pressure/i, /pulse\s*:/i, /temperature/i, /spo2/i, /oxygen\s*saturation/i] },
    { name: 'Examination Findings', patterns: [/examination/i, /on\s*exam/i, /physical\s*exam/i, /general\s*condition/i] },
    { name: 'Medications', patterns: [/medication/i, /drug/i, /tab\./i, /inj\./i, /capsule/i, /syrup/i, /prescription/i] },
    { name: 'Lab Results', patterns: [/lab\s*result/i, /investigation/i, /blood\s*test/i, /haemoglobin/i, /hemoglobin/i, /wbc/i, /rbc/i, /platelet/i, /creatinine/i, /glucose/i, /urea/i] },
    { name: 'Imaging', patterns: [/x.?ray/i, /ct\s*scan/i, /mri/i, /ultrasound/i, /ecg/i, /echo/i] },
    { name: 'Procedures', patterns: [/procedure/i, /surgery/i, /operation/i, /catheter/i, /biopsy/i, /endoscopy/i] },
    { name: 'Treatment / Plan', patterns: [/treatment/i, /management/i, /plan/i, /advised/i, /started\s*on/i] },
    { name: 'Discharge Summary', patterns: [/discharge/i, /discharged/i, /follow.?up/i, /review\s*after/i] },
    { name: 'Doctor / Hospital', patterns: [/dr\.?\s/i, /hospital/i, /clinic/i, /department/i, /ward/i] },
    { name: 'Allergies', patterns: [/allerg/i, /nkda/i, /no\s*known/i] },
];
async function runOcr(filePath, engine) {
    const fileBytes = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const formData = new FormData();
    const blob = new Blob([fileBytes], { type: 'image/jpeg' });
    formData.append('file', blob, fileName);
    formData.append('engine', engine);
    const resp = await fetch(`${OCR_SERVICE_URL}/ocr`, {
        method: 'POST',
        body: formData,
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`OCR service returned ${resp.status}: ${err}`);
    }
    return resp.json();
}
function checkSectionCoverage(fullText) {
    return MEDICAL_SECTIONS.map(section => {
        for (const pattern of section.patterns) {
            const match = fullText.match(pattern);
            if (match) {
                return { section: section.name, found: true, matchedPattern: match[0] };
            }
        }
        return { section: section.name, found: false };
    });
}
function computeStats(result) {
    const totalBlocks = result.pages.reduce((sum, p) => sum + p.blocks.length, 0);
    const totalChars = result.pages.reduce((sum, p) => sum + p.fullText.length, 0);
    const totalWords = result.pages.reduce((sum, p) => sum + p.fullText.split(/\s+/).filter(Boolean).length, 0);
    const avgConfidence = result.pages.reduce((sum, p) => {
        const pageAvg = p.blocks.length > 0
            ? p.blocks.reduce((s, b) => s + b.confidence, 0) / p.blocks.length
            : 0;
        return sum + pageAvg;
    }, 0) / Math.max(result.pages.length, 1);
    const fullText = result.pages.map(p => p.fullText).join('\n\n');
    return { totalBlocks, totalChars, totalWords, avgConfidence, fullText };
}
async function checkHealth() {
    const resp = await fetch(`${OCR_SERVICE_URL}/health`);
    return resp.json();
}
async function auditFixture(filePath, engines) {
    const fileName = path.basename(filePath);
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`FIXTURE: ${fileName}`);
    console.log(`${'═'.repeat(80)}`);
    const results = {};
    for (const engine of engines) {
        console.log(`\n  Running engine: ${engine.toUpperCase()}...`);
        try {
            const result = await runOcr(filePath, engine);
            const actualEngine = result.engine; // may differ if fallback triggered
            const stats = computeStats(result);
            const coverage = checkSectionCoverage(stats.fullText);
            results[engine] = { stats, coverage, timeMs: result.processingTimeMs };
            console.log(`  Engine used: ${actualEngine}`);
            console.log(`  Processing time: ${result.processingTimeMs}ms`);
            console.log(`  Pages: ${result.pages.length}`);
            console.log(`  Total blocks: ${stats.totalBlocks}`);
            console.log(`  Total chars: ${stats.totalChars}`);
            console.log(`  Total words: ${stats.totalWords}`);
            console.log(`  Avg confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
            const found = coverage.filter(c => c.found).length;
            console.log(`\n  Section Coverage: ${found}/${MEDICAL_SECTIONS.length} sections detected`);
            for (const c of coverage) {
                const icon = c.found ? '✓' : '✗';
                const match = c.matchedPattern ? ` (matched: "${c.matchedPattern}")` : '';
                console.log(`    ${icon} ${c.section}${match}`);
            }
            console.log(`\n  ─── FULL EXTRACTED TEXT (${engine.toUpperCase()}) ───`);
            console.log(stats.fullText || '  [NO TEXT EXTRACTED]');
        }
        catch (err) {
            console.error(`  ERROR running ${engine}: ${err.message}`);
        }
    }
    return results;
}
async function main() {
    console.log('═'.repeat(80));
    console.log('MEDMEMORY — DENSE DOCUMENT OCR AUDIT');
    console.log('═'.repeat(80));
    // Health check
    let health;
    try {
        health = await checkHealth();
        console.log(`\nOCR Service health: ${JSON.stringify(health)}`);
    }
    catch (_a) {
        console.error('\n❌ OCR service is not running! Please run: npm run ocr:start');
        process.exit(1);
    }
    const engines = ['tesseract'];
    if (health.paddleAvailable) {
        engines.unshift('paddleocr');
        console.log('PaddleOCR is available — will run both engines.');
    }
    else {
        console.log('PaddleOCR not installed — running Tesseract only.');
    }
    // Find fixture images
    if (!fs.existsSync(FIXTURES_DIR)) {
        console.error(`\n❌ Fixtures directory not found: ${FIXTURES_DIR}`);
        process.exit(1);
    }
    const fixtureFiles = fs.readdirSync(FIXTURES_DIR)
        .filter(f => /\.(jpe?g|png|tiff?|bmp|webp)$/i.test(f))
        .map(f => path.join(FIXTURES_DIR, f));
    if (fixtureFiles.length === 0) {
        console.error(`\n❌ No image fixtures found in ${FIXTURES_DIR}`);
        process.exit(1);
    }
    console.log(`\nFound ${fixtureFiles.length} fixture(s): ${fixtureFiles.map(f => path.basename(f)).join(', ')}`);
    // Collect all audit results for comparison report
    const allResults = {};
    for (const filePath of fixtureFiles) {
        const fileResults = await auditFixture(filePath, engines);
        allResults[path.basename(filePath)] = {};
        for (const [eng, res] of Object.entries(fileResults)) {
            allResults[path.basename(filePath)][eng] = res.stats;
        }
    }
    // Cross-engine comparison summary (if multiple engines ran)
    if (engines.length > 1) {
        console.log(`\n${'═'.repeat(80)}`);
        console.log('CROSS-ENGINE COMPARISON SUMMARY');
        console.log('═'.repeat(80));
        for (const [file, engineResults] of Object.entries(allResults)) {
            console.log(`\n  ${file}:`);
            for (const [eng, stats] of Object.entries(engineResults)) {
                const cov = checkSectionCoverage(stats.fullText).filter(c => c.found).length;
                console.log(`    ${eng.padEnd(12)} blocks=${stats.totalBlocks}  words=${stats.totalWords}  chars=${stats.totalChars}  sections=${cov}/${MEDICAL_SECTIONS.length}  conf=${(stats.avgConfidence * 100).toFixed(1)}%`);
            }
        }
    }
    console.log(`\n${'═'.repeat(80)}`);
    console.log('AUDIT COMPLETE');
    console.log('═'.repeat(80));
}
main().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
