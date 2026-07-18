export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  date: string;
  snippet: string;
}

export interface QAAnswer {
  answer: string;
  citations: Citation[];
}

export interface QuestionAnsweringProvider {
  askQuestion(
    question: string,
    patientId: string,
    contextChunks: { text: string; documentId: string; documentTitle: string; pageNumber: number; date: string }[],
    structuredRecords: any[]
  ): Promise<QAAnswer>;
}

export class DemoQuestionAnsweringProvider implements QuestionAnsweringProvider {
  async askQuestion(
    question: string,
    patientId: string,
    contextChunks: { text: string; documentId: string; documentTitle: string; pageNumber: number; date: string }[],
    structuredRecords: any[]
  ): Promise<QAAnswer> {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const q = question.toLowerCase();

    // Pancreatitis question
    if (q.includes("pancreatitis")) {
      return {
        answer: "Based on your records, you were hospitalized for Acute Pancreatitis on May 10, 2026, at Apollo Hospital. You were treated conservatively and discharged on May 12, 2026. The discharge summary lists Acute Pancreatitis as the primary diagnosis and notes that you should take Tab Pan 40 mg once daily before breakfast.",
        citations: [
          {
            documentId: "pancreatitis-discharge-2026",
            documentTitle: "Apollo Hospital Discharge Summary",
            pageNumber: 1,
            date: "2026-05-12",
            snippet: "Final Diagnosis: Acute Pancreatitis. Patient managed conservatively."
          },
          {
            documentId: "pancreatitis-discharge-2026",
            documentTitle: "Apollo Hospital Discharge Summary",
            pageNumber: 2,
            date: "2026-05-12",
            snippet: "Tab Pan 40 mg OD before breakfast for 2 weeks."
          }
        ]
      };
    }

    // HbA1c result
    if (q.includes("hba1c") || q.includes("sugar") || q.includes("diabetes")) {
      return {
        answer: "Your last documented HbA1c test result was 6.8% on May 10, 2026, which is flagged as abnormal (reference range is < 5.7%). You also have a history of Type 2 Diabetes Mellitus noted in your discharge summary.",
        citations: [
          {
            documentId: "pancreatitis-discharge-2026",
            documentTitle: "Apollo Hospital Discharge Summary",
            pageNumber: 1,
            date: "2026-05-12",
            snippet: "HbA1c: 6.8 % (Ref: < 5.7%). History of Type 2 Diabetes Mellitus."
          }
        ]
      };
    }

    // 2023 diagnoses
    if (q.includes("2023") || q.includes("dengue")) {
      return {
        answer: "In July 2023, you were diagnosed with Dengue Fever with Thrombocytopenia at Apollo Hospital. Your discharge summary dated July 18, 2023, shows that you had a low platelet count which resolved prior to discharge.",
        citations: [
          {
            documentId: "dengue-discharge-2023",
            documentTitle: "Apollo Hospital Discharge Summary (Dengue)",
            pageNumber: 1,
            date: "2023-07-18",
            snippet: "Discharge Diagnosis: Dengue fever with thrombocytopenia."
          }
        ]
      };
    }

    // Hospitals visited
    if (q.includes("hospital") || q.includes("where")) {
      return {
        answer: "Based on your uploaded medical records, you have visited Apollo Hospital (documented in your 2023 Dengue Discharge Summary and 2026 Pancreatitis Admission) and City Diagnostics Clinic (documented in your 2024 Lipid Profile report).",
        citations: [
          {
            documentId: "dengue-discharge-2023",
            documentTitle: "Apollo Hospital Discharge Summary",
            pageNumber: 1,
            date: "2023-07-18",
            snippet: "Apollo Health City, Jubilee Hills, Hyderabad."
          },
          {
            documentId: "lipid-profile-2024",
            documentTitle: "City Diagnostics Lab Report",
            pageNumber: 1,
            date: "2024-04-15",
            snippet: "City Diagnostics Clinic & Pathology Laboratory."
          }
        ]
      };
    }

    // Insulin changes
    if (q.includes("insulin")) {
      return {
        answer: "Your insulin dosage was modified during your follow-up checkup on November 10, 2025. According to the Diabetes Follow-up prescription, your dosage of Glargine (long-acting insulin) was increased from 10 units to 12 units at bedtime due to elevated fasting blood sugar.",
        citations: [
          {
            documentId: "diabetes-followup-2025",
            documentTitle: "Diabetes Clinic Prescription",
            pageNumber: 1,
            date: "2025-11-10",
            snippet: "Inj. Glargine: Increase dose to 12 units Subcutaneously at bedtime (was 10 units)."
          }
        ]
      };
    }

    // Default safety response when not found
    return {
      answer: "I couldn't find this information in your uploaded records.",
      citations: []
    };
  }
}
