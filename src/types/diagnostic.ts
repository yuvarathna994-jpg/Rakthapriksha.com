export type LabPartner =
  | 'Thyrocare'
  | 'Tata 1mg'
  | 'Healthians'
  | 'Lupin Diagnostics'
  | 'Apollo Diagnostics';

export const LAB_PARTNERS: LabPartner[] = [
  'Thyrocare',
  'Tata 1mg',
  'Healthians',
  'Lupin Diagnostics',
  'Apollo Diagnostics',
];

export type DiagnosticCategory =
  | 'All'
  | 'Routine & Fever'
  | 'Diabetes Monitoring'
  | 'Thyroid Profile'
  | 'Organ Function'
  | 'Vitamins & Bone'
  | 'Hormones & Fertility'
  | 'Cardiac & Cancer Markers'
  | 'Master Health Packages';

export const DIAGNOSTIC_CATEGORIES: {
  id: DiagnosticCategory;
  labelEn: string;
  labelTe: string;
}[] = [
  { id: 'All', labelEn: 'All 28+ Tests & Packages', labelTe: 'అన్ని టెస్టులు & ప్యాకేజీలు' },
  { id: 'Routine & Fever', labelEn: 'Routine & Fever Panels', labelTe: 'జ్వరం & సాధారణ పరీక్షలు' },
  { id: 'Diabetes Monitoring', labelEn: 'Diabetes Monitoring', labelTe: 'షుగర్ / డయాబెటిస్' },
  { id: 'Thyroid Profile', labelEn: 'Thyroid Profile', labelTe: 'థైరాయిడ్ పరీక్షలు' },
  { id: 'Organ Function', labelEn: 'Liver, Kidney & Lipid', labelTe: 'లివర్, కిడ్నీ & కొలెస్ట్రాల్' },
  { id: 'Vitamins & Bone', labelEn: 'Vitamins, Iron & Bone', labelTe: 'విటమిన్లు & ఎముకల ఆరోగ్యం' },
  { id: 'Hormones & Fertility', labelEn: 'Hormone & PCOD Panels', labelTe: 'హార్మోన్ & ఫెర్టిలిటీ' },
  { id: 'Cardiac & Cancer Markers', labelEn: 'Cardiac & Cancer Markers', labelTe: 'గుండె & క్యాన్సర్ మార్కర్స్' },
  { id: 'Master Health Packages', labelEn: 'Partner Master Packages', labelTe: 'ఫుల్ బాడీ మాస్టర్ ప్యాకేజీలు' },
];

export interface LabPricingInfo {
  price: number;
  rating: number;
  accreditation: 'NABL & CAP' | 'NABL Accredited';
  tatOverride?: string;
}

export interface DiagnosticTest {
  id: string;
  code: string;
  nameEn: string;
  nameTe: string;
  category: Exclude<DiagnosticCategory, 'All'>;
  parameterCount: number;
  parametersIncluded: string[];
  fastingRequired: boolean;
  fastingTextEn: string;
  fastingTextTe: string;
  tatHours: number;
  tatTextEn: string;
  tatTextTe: string;
  sampleTube: string;
  mrp: number;
  labPrices: Record<LabPartner, LabPricingInfo>;
  popular?: boolean;
  clinicalNotesEn?: string;
}

export type TrackingStage = 1 | 2 | 3 | 4 | 5;

export interface TrackingStageEvent {
  stage: TrackingStage;
  titleEn: string;
  titleTe: string;
  timestamp: string;
  note: string;
}

export interface EncryptionAuditMeta {
  algorithm: 'AES-256-GCM';
  keyId: string;
  ivHex: string;
  authTagHex: string;
  cipherPreview: string;
  encryptedAt: string;
  verified: boolean;
}

export interface BiomarkerResultRow {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'Borderline' | 'High' | 'Low';
}

export interface BookingRecord {
  bookingId: string;
  createdAt: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  familyRelation: string;
  mobileNumber: string;
  maskedMobile: string;
  collectionDate: string;
  timeSlot: string;
  selectedLab: LabPartner;
  selectedTestIds: string[];
  selectedTestNames: string[];
  totalMrp: number;
  totalTestPrice: number;
  premiumDiscountApplied: boolean;
  referralCode?: string;
  homeCollectionFee: 0;
  convenienceFee: 0;
  reportGenerationFee: 0;
  gpsCoordinates?: { lat: number; lng: number };
  googleMapsUrl: string;
  addressLandmark: string;
  paymentStatus: 'Pending' | 'Paid via UPI QR' | 'Pay at Home Collection';
  assignedPhlebotomistId?: string;
  assignedPhlebotomistName?: string;
  assignedPhlebotomistMobile?: string;
  trackingStage: TrackingStage;
  etaMinutes: number;
  trackingHistory: TrackingStageEvent[];
  encryptionMeta: EncryptionAuditMeta;
  encryptedPayloadBlob?: string;
  sampleReportMetrics: BiomarkerResultRow[];
}

export interface PhlebotomistPartner {
  id: string;
  fullName: string;
  mobileNumber: string;
  qualification: 'DMLT' | 'B.Sc MLT' | 'Paramedical Board Certified';
  registrationNumber: string;
  experienceYears: number;
  previousOrganization: string;
  hasTwoWheeler: boolean;
  serviceablePincodes: string[];
  availableSlots: string[];
  verified: boolean;
  activeOrdersCount: number;
  joinedAt: string;
}

export interface BiomarkerHistoryPoint {
  date: string;
  value: number;
}

export interface BiomarkerSeries {
  id: string;
  nameEn: string;
  nameTe: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  points: BiomarkerHistoryPoint[];
}

export interface FamilyMemberProfile {
  id: string;
  name: string;
  relation: 'Self' | 'Father' | 'Mother' | 'Spouse' | 'Child';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  lastCheckupDate: string;
  biomarkers: BiomarkerSeries[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedTestIds?: string[];
}

export interface RxParseResult {
  matchedTestIds: string[];
  clinicalSummaryEn: string;
  clinicalSummaryTe: string;
  recommendedLab: LabPartner;
  doctorNotesExtracted: string;
}
