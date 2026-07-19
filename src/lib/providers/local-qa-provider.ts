import { QuestionAnsweringProvider, QAAnswer, Citation } from './question-answering-provider';
import OpenAI from 'openai';

export class LocalQAProvider implements QuestionAnsweringProvider {
  private localLlmBaseUrl: string;
  private localLlmModel: string;

  constructor() {
    this.localLlmBaseUrl = process.env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:11434';
    this.localLlmModel = process.env.LOCAL_LLM_MODEL || '';
  }

  async askQuestion(
    question: string,
    patientId: string,
    contextChunks: { text: string; documentId: string; documentTitle: string; pageNumber: number; date: string }[],
    structuredRecords: any[],
    compressedMemory?: string,
    copilotContext?: any
  ): Promise<QAAnswer> {
    
    // 1. Try local LLM (Ollama) if a model is configured and online
    if (this.localLlmModel) {
      try {
        const healthRes = await fetch(`${this.localLlmBaseUrl}/api/tags`, { signal: AbortSignal.timeout(1500) });
        if (healthRes.ok) {
          const client = new OpenAI({
            apiKey: 'local-ollama',
            baseURL: `${this.localLlmBaseUrl}/v1`
          });

          const chunkContext = contextChunks
            .map(
              (chunk, idx) =>
                `[Document Citation ID: ${idx}]
Title: ${chunk.documentTitle} (Page: ${chunk.pageNumber}, Date: ${chunk.date || 'N/A'})
Text Snippet:
"""
${chunk.text}
"""`
            )
            .join('\n\n');

          const recordsContext = structuredRecords
            .map((record) => {
              if (record.type === 'diagnosis') {
                return `- Diagnosis: ${record.name} (Onset: ${record.onset_weeks || 'N/A'} weeks, Chronic: ${record.is_chronic || 'N/A'}, Notes: ${record.notes || 'N/A'}, Verification: ${record.verification_status})`;
              } else if (record.type === 'medication') {
                return `- Medication: ${record.medicine_name} (Generic: ${record.generic_name || 'N/A'}, Strength: ${record.strength || 'N/A'}, Dose: ${record.dosage || 'N/A'}, Frequency: ${record.frequency || 'N/A'}, Duration: ${record.duration || 'N/A'}, Verification: ${record.verification_status})`;
              } else if (record.type === 'lab_result') {
                return `- Lab Result: ${record.test_name} = ${record.value} ${record.unit || ''} (Range: ${record.reference_range || 'N/A'}, Abnormal: ${record.abnormal_flag || 'N/A'}, Date: ${record.test_date || 'N/A'}, Verification: ${record.verification_status})`;
              } else if (record.type === 'procedure') {
                return `- Procedure: ${record.name} (Date: ${record.date || 'N/A'}, Notes: ${record.notes || 'N/A'}, Verification: ${record.verification_status})`;
              }
              return `- Record: ${record.title} (${record.record_type})`;
            })
            .join('\n');

          const prompt = `You are a precise local medical assistant chatbot.
Your goal is to answer the patient's questions about their medical records.
CRITICAL SAFETY RULE: You are not a doctor. You must NEVER formulate clinical diagnoses, suggest treatments, prescribe medications, or state causation of symptoms. Keep all explanations strictly objective.
CRITICAL EVIDENCE RULE: Answer the question ONLY based on the provided document text chunks and structured medical records below. Do not assume or invent details.
If the context does not contain evidence to answer the question, or if a user asks about a condition not documented in their records, you MUST reply:
"I couldn't find verified information answering that question in the available records."
Do not state "You do not have kidney disease" or "You are healthy".

Context - Uploaded Document Text Chunks:
${chunkContext || 'No raw document text available.'}

Context - Structured Medical Records:
${recordsContext || 'No structured records available.'}

Patient Question: "${question}"

Format your final output as a JSON object matching this schema:
{
  "answer": "Your detailed textual answer...",
  "citations": [
    {
      "documentId": "the Document Citation ID matching the chunk used (e.g., '0' or '1')",
      "documentTitle": "the title of the document matching the chunk used",
      "pageNumber": page number (integer),
      "date": "document date (YYYY-MM-DD)",
      "snippet": "the exact text snippet from the document that verifies this fact"
    }
  ]
}`;

          const response = await client.chat.completions.create({
            model: this.localLlmModel,
            messages: [
              {
                role: 'system',
                content: 'You are a precise citation-backed medical QA engine. Output ONLY a valid JSON object matching the requested schema.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' }
          });

          const responseText = response.choices[0]?.message?.content || '{}';
          const parsed = JSON.parse(responseText);
          const citations: Citation[] = (parsed.citations || []).map((cit: any, idx: number) => {
            const docIdx = parseInt(cit.documentId);
            const matchingChunk = !isNaN(docIdx) && contextChunks[docIdx] ? contextChunks[docIdx] : null;
            return {
              documentId: matchingChunk ? matchingChunk.documentId : (cit.documentId || `doc-${idx}`),
              documentTitle: matchingChunk ? matchingChunk.documentTitle : (cit.documentTitle || 'Medical Document'),
              pageNumber: matchingChunk ? matchingChunk.pageNumber : (cit.pageNumber || 1),
              date: matchingChunk ? matchingChunk.date : (cit.date || ''),
              snippet: cit.snippet || ''
            };
          });

          return {
            answer: parsed.answer || "I couldn't find verified information answering that question in the available records.",
            citations
          };
        }
      } catch (err) {
        console.warn("Local LLM QA query failed or server offline. Falling back to deterministic retrieval.", err);
      }
    }

    // 2. Deterministic Structured QA Fallback Engine (No LLM required)
    console.log("Executing offline local QA deterministic retrieval...");
    return this.retrieveDeterministically(question, contextChunks, structuredRecords);
  }

  private retrieveDeterministically(
    question: string,
    contextChunks: { text: string; documentId: string; documentTitle: string; pageNumber: number; date: string }[],
    structuredRecords: any[]
  ): QAAnswer {
    const q = question.toLowerCase().trim();
    const citations: Citation[] = [];
    let answerText = '';

    // 0. Absent Topic Hallucination Guard
    const genericWords = new Set([
      'what', 'is', 'my', 'level', 'test', 'result', 'lab', 'blood', 'range', 'show', 
      'me', 'values', 'report', 'document', 'have', 'history', 'record', 'records', 
      'medical', 'patient', 'please', 'find', 'get', 'list', 'any', 'diagnostic', 
      'clinical', 'findings', 'summary', 'about', 'imaging'
    ]);

    const normalizeMedicalTerm = (w: string) => {
      let term = w.toLowerCase();
      if (term.includes('hemo') || term.includes('haemo')) return 'hemoglob';
      return term;
    };

    const queryWords = q
      .replace(/[?:!.,;()]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !genericWords.has(w));

    if (queryWords.length > 0) {
      const wordInRecords = structuredRecords.some(r => {
        const text = (r.name || r.medicine_name || r.test_name || r.title || r.notes || '').toLowerCase();
        return queryWords.some(w => {
          const normW = normalizeMedicalTerm(w);
          const normText = normalizeMedicalTerm(text);
          return normText.includes(normW) || normW.includes(normText) || text.includes(w);
        });
      });

      const wordInChunks = contextChunks.some(c => {
        const text = c.text.toLowerCase();
        return queryWords.some(w => {
          const normW = normalizeMedicalTerm(w);
          const normText = normalizeMedicalTerm(text);
          return normText.includes(normW) || normW.includes(normText) || text.includes(w);
        });
      });

      if (!wordInRecords && !wordInChunks) {
        return {
          answer: "I couldn't find verified information answering that question in the available records.",
          citations: []
        };
      }
    }

    // Direct helper to match words
    const matchesKeyword = (target: string, query: string) => {
      const words = query.split(/\s+/).filter(w => w.length > 3);
      if (words.length === 0) return target.toLowerCase().includes(query.toLowerCase());
      return words.some(w => target.toLowerCase().includes(w));
    };

    // Helper to find citation for a record
    const getCitationForRecord = (record: any): Citation => {
      const matchingChunk = contextChunks.find(c => c.documentId === record.source_document_id || c.documentId === record.document_id);
      return {
        documentId: record.source_document_id || record.document_id || 'doc-1',
        documentTitle: matchingChunk ? matchingChunk.documentTitle : 'Medical Document',
        pageNumber: record.source_page || record.page || (matchingChunk ? matchingChunk.pageNumber : 1),
        date: record.test_date || record.date || (matchingChunk ? matchingChunk.date : ''),
        snippet: record.source_text || `${record.name || record.medicine_name || record.test_name || record.title || ''}`
      };
    };

    // Check query intent categories
    const isMedsQuery = q.includes('med') || q.includes('medication') || q.includes('medicine') || q.includes('pill') || q.includes('tablet') || q.includes('prescription') || q.includes('drug') || q.includes('take') || q.includes('dose') || q.includes('rx');
    const isDiagQuery = q.includes('diagnos') || q.includes('condition') || q.includes('disease') || q.includes('illness') || q.includes('sick') || q.includes('have') || q.includes('history');
    const isLabsQuery = q.includes('lab') || q.includes('test') || q.includes('result') || q.includes('blood') || q.includes('hba1c') || q.includes('level') || q.includes('sugar') || q.includes('amylase') || q.includes('lipase') || q.includes('range');
    const isProcQuery = q.includes('procedure') || q.includes('surgery') || q.includes('operation') || q.includes('surgical') || q.includes('surgeon');
    const isHospQuery = q.includes('hospital') || q.includes('clinic') || q.includes('where') || q.includes('visit') || q.includes('doctor') || q.includes('practitioner') || q.includes('dr.');

    // 1. Specific Keyword Matching against structured records (e.g. "what is my HbA1c?")
    const matchingRecords = structuredRecords.filter((r: any) => {
      const recordName = (r.name || r.medicine_name || r.test_name || r.title || '').toLowerCase();
      if (!recordName) return false;
      // Exact word match or substring
      return q.includes(recordName) || recordName.split(/\s+/).some((word: string) => word.length > 3 && q.includes(word));
    });

    if (matchingRecords.length > 0) {
      answerText = "Based on your records, we found the following specific matching information:\n";
      for (const r of matchingRecords) {
        const cit = getCitationForRecord(r);
        citations.push(cit);
        
        if (r.type === 'medication') {
          answerText += `- Medication: ${r.medicine_name} ${r.strength ? `(${r.strength})` : ''} - Dosage: ${r.dosage || 'N/A'}, Frequency: ${r.frequency || 'N/A'}, Instructions: ${r.instructions || 'N/A'} (Status: ${r.verification_status})\n`;
        } else if (r.type === 'diagnosis') {
          answerText += `- Diagnosis: ${r.name} - Chronic: ${r.is_chronic ? 'Yes' : 'No'}, Notes: ${r.notes || 'N/A'} (Status: ${r.verification_status})\n`;
        } else if (r.type === 'lab_result') {
          answerText += `- Lab Result: ${r.test_name} = ${r.value} ${r.unit || ''} (Reference Range: ${r.reference_range || 'N/A'}, Date: ${r.test_date || 'N/A'}, Status: ${r.verification_status})\n`;
        } else if (r.type === 'procedure') {
          answerText += `- Procedure: ${r.name} - Date: ${r.date || 'N/A'}, Notes: ${r.notes || 'N/A'} (Status: ${r.verification_status})\n`;
        }
      }
    }
    // 2. General medications query
    else if (isMedsQuery) {
      const meds = structuredRecords.filter(r => r.type === 'medication');
      if (meds.length > 0) {
        answerText = "Your records contain the following medications:\n";
        for (const m of meds) {
          citations.push(getCitationForRecord(m));
          answerText += `- ${m.medicine_name} ${m.strength ? `(${m.strength})` : ''} - Dosage: ${m.dosage || 'N/A'}, Frequency: ${m.frequency || 'N/A'}, Instructions: ${m.instructions || 'N/A'} [Status: ${m.verification_status}]\n`;
        }
      } else {
        answerText = "I couldn't find any medications documented in your records.\n";
      }
    }
    // 3. General diagnoses query
    else if (isDiagQuery) {
      const diags = structuredRecords.filter(r => r.type === 'diagnosis');
      if (diags.length > 0) {
        answerText = "Your records document the following diagnoses/conditions:\n";
        for (const d of diags) {
          citations.push(getCitationForRecord(d));
          answerText += `- ${d.name} ${d.is_chronic ? '(Chronic)' : ''} - Notes: ${d.notes || 'None'} [Status: ${d.verification_status}]\n`;
        }
      } else {
        answerText = "I couldn't find any medical diagnoses documented in your records.\n";
      }
    }
    // 4. General labs query
    else if (isLabsQuery) {
      const labs = structuredRecords.filter(r => r.type === 'lab_result');
      if (labs.length > 0) {
        answerText = "Your records contain the following lab test results:\n";
        for (const l of labs) {
          citations.push(getCitationForRecord(l));
          answerText += `- ${l.test_name}: ${l.value} ${l.unit || ''} (Date: ${l.test_date || 'N/A'}, Ref Range: ${l.reference_range || 'N/A'}) [Status: ${l.verification_status}]\n`;
        }
      } else {
        answerText = "I couldn't find any laboratory test results in your records.\n";
      }
    }
    // 5. General procedures query
    else if (isProcQuery) {
      const procs = structuredRecords.filter(r => r.type === 'procedure');
      if (procs.length > 0) {
        answerText = "Your records list the following procedures/surgeries:\n";
        for (const p of procs) {
          citations.push(getCitationForRecord(p));
          answerText += `- ${p.name} (Date: ${p.date || 'N/A'}, Notes: ${p.notes || 'None'}) [Status: ${p.verification_status}]\n`;
        }
      } else {
        answerText = "I couldn't find any medical procedures or surgeries documented in your records.\n";
      }
    }
    // 6. Hospital / practitioner visits
    else if (isHospQuery) {
      const visits = new Set<string>();
      const doctors = new Set<string>();
      
      // Look through context chunks for hospital names
      for (const chunk of contextChunks) {
        if (chunk.text.toLowerCase().includes('hospital') || chunk.text.toLowerCase().includes('clinic')) {
          const lines = chunk.text.split('\n');
          for (const line of lines) {
            if (line.toLowerCase().includes('hospital') || line.toLowerCase().includes('clinic') || line.toLowerCase().includes('medical center')) {
              if (line.length < 60) visits.add(line.trim());
            }
            if (line.toLowerCase().includes('dr.') || line.toLowerCase().includes('doctor')) {
              if (line.length < 50) doctors.add(line.trim());
            }
          }
        }
      }

      if (visits.size > 0 || doctors.size > 0) {
        answerText = "According to your records, you visited the following healthcare facilities or practitioners:\n";
        if (visits.size > 0) {
          answerText += "\nHospitals/Clinics:\n";
          visits.forEach(v => { answerText += `- ${v}\n`; });
        }
        if (doctors.size > 0) {
          answerText += "\nPractitioners:\n";
          doctors.forEach(d => { answerText += `- ${d}\n`; });
        }
        // Add a general citation to first chunk
        if (contextChunks.length > 0) {
          citations.push({
            documentId: contextChunks[0].documentId,
            documentTitle: contextChunks[0].documentTitle,
            pageNumber: contextChunks[0].pageNumber,
            date: contextChunks[0].date,
            snippet: "Encounter metadata headers"
          });
        }
      } else {
        answerText = "I couldn't find any specific healthcare facility visits or doctor names in the available records.\n";
      }
    }
    // 7. General search matching raw context chunks (if no structured matched)
    else {
      let matchedChunk = null;
      for (const chunk of contextChunks) {
        if (matchesKeyword(chunk.text, q)) {
          matchedChunk = chunk;
          break;
        }
      }

      if (matchedChunk) {
        // Extract paragraph containing matching word
        const paragraphs = matchedChunk.text.split('\n').map(p => p.trim()).filter(p => p.length > 10);
        let snippet = '';
        for (const p of paragraphs) {
          if (matchesKeyword(p, q)) {
            snippet = p;
            break;
          }
        }
        if (!snippet && paragraphs.length > 0) snippet = paragraphs[0];

        answerText = `I found a mention in your document "${matchedChunk.documentTitle}" (Page ${matchedChunk.pageNumber}):\n\n"${snippet}"`;
        citations.push({
          documentId: matchedChunk.documentId,
          documentTitle: matchedChunk.documentTitle,
          pageNumber: matchedChunk.pageNumber,
          date: matchedChunk.date,
          snippet: snippet
        });
      } else {
        // Default safe answer
        answerText = "I couldn't find verified information answering that question in the available records.";
      }
    }

    return {
      answer: answerText.trim(),
      citations
    };
  }
}
