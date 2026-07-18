export const BRAND_CONFIG = {
  name: 'MedMemory',
  tagline: 'Your health history. Never lost.',
  shortDescription: 'Securely digitize prescriptions, reports, and hospital files into one intelligent, searchable health timeline.',
  emergencyDisclaimer: 'Emergency information is generated from patient-approved critical summaries and may not represent the complete medical history. In an emergency, always consult qualified health professionals.',
  medicalDisclaimer: 'This information is generated from your uploaded medical records and may contain extraction errors. It is not a substitute for professional medical advice.',
  fileLimits: {
    maxSizeMB: 20,
    maxSizeBytes: 20 * 1024 * 1024,
    supportedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  }
};
