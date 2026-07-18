export type VerificationStatus = 'pending_review' | 'verified' | 'corrected' | 'rejected' | 'unreadable';
export type ConfidenceCategory = 'HIGH' | 'MEDIUM' | 'LOW';
export type DocumentCategory = 
  | 'Auto Detect'
  | 'Prescription'
  | 'Lab Report'
  | 'Discharge Summary'
  | 'Imaging Report'
  | 'Medical Certificate'
  | 'Vaccination Record'
  | 'Other';

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  knownAllergies?: string[];
  knownChronicConditions?: string[];
  currentLongTermMedications?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  patientId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string; // Layer 1 (Private bucket path)
  processedStoragePath?: string; // Optional processed version path
  category: DocumentCategory;
  processingStatus: 'queued' | 'preprocessing' | 'ocr_processing' | 'extracting' | 'awaiting_review' | 'completed' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SourceProvenance {
  patientId: string;
  sourceDocumentId: string;
  sourcePage?: number;
  sourceText?: string; // Original snippet
  extractionMethod: 'demo' | 'ai_openai' | 'ocr_only' | 'manual_patient';
  confidenceScore: number;
  verificationStatus: VerificationStatus;
  verifiedBy?: string; // user id
  verifiedAt?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  documentId?: string;
  recordType: 'diagnosis' | 'medication' | 'lab_result' | 'procedure' | 'other';
  title: string;
  eventDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Diagnosis extends SourceProvenance {
  id: string;
  patientId: string;
  recordId: string;
  name: string;
  onsetWeeks?: number;
  isChronic?: boolean;
  notes?: string;
}

export interface Medication extends SourceProvenance {
  id: string;
  patientId: string;
  recordId: string;
  medicineName: string;
  genericName?: string;
  strength?: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface LabResult extends SourceProvenance {
  id: string;
  patientId: string;
  recordId: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: boolean; // inferable if value out of referenceRange
  testDate: string;
}

export interface Procedure extends SourceProvenance {
  id: string;
  patientId: string;
  recordId: string;
  name: string;
  date: string;
  surgeonName?: string;
  notes?: string;
}

export interface MedicalEvent {
  id: string;
  patientId: string;
  eventDate: string;
  eventType: 'Diagnosis' | 'Hospital Admission' | 'Doctor Visit' | 'Prescription' | 'Medication Start' | 'Medication Change' | 'Lab Test' | 'Imaging' | 'Procedure' | 'Surgery' | 'Vaccination' | 'Discharge';
  title: string;
  hospitalName?: string;
  doctorName?: string;
  summary?: string;
  sourceDocumentId?: string;
  sourceDocumentName?: string;
  verificationStatus: VerificationStatus;
}

export interface EmergencySummary {
  patientName: string;
  age: number;
  dateOfBirth: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  criticalAllergies: string[];
  chronicConditions: string[];
  currentImportantMedications: string[];
  majorPreviousSurgeries: string[];
  importantPriorHospitalizations: string[];
  relevantEmergencyNotes?: string;
  lastUpdated: string;
  emergencyAccessEnabled: boolean;
}

export interface EmergencyAccessToken {
  id: string;
  patientId: string;
  token: string;
  isEnabled: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface AuditLog {
  id: string;
  patientId: string;
  action: string; // 'document_uploaded' | 'document_viewed' | 'document_deleted' | 'extraction_completed' | 'record_edited' | 'emergency_access_enabled' | 'emergency_token_regenerated'
  metadata?: Record<string, any>;
  createdAt: string;
}
