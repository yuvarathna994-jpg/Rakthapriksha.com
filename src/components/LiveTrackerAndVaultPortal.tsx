import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { INITIAL_FAMILY_PROFILES } from '../data/catalogData';
import {
  BookingRecord,
  FamilyMemberProfile,
  TrackingStage,
} from '../types/diagnostic';
import { downloadEncryptedReportOrReceiptHtml } from '../utils/whatsappAndQr';

interface LiveTrackerAndVaultPortalProps {
  bookings: BookingRecord[];
  activeBookingId: string;
  language: 'en' | 'te';
  onSelectBookingId: (id: string) => void;
  onAdvanceStage: (bookingId: string, stage: TrackingStage, etaMinutes?: number) => void;
}

const STAGE_LIST: {
  stage: TrackingStage;
  labelEn: string;
  labelTe: string;
  subEn: string;
}[] = [
  {
    stage: 1,
    labelEn: '1. Booking Confirmed',
    labelTe: '1. బుకింగ్ కన్ఫర్మ్',
    subEn: 'Zero extra fee invoice & AES-256 record sealed',
  },
  {
    stage: 2,
    labelEn: '2. Phlebotomist Assigned',
    labelTe: '2. ఫ్లెబోటమిస్ట్ కేటాయింపు',
    subEn: 'Certified DMLT / B.Sc MLT technician mapped',
  },
  {
    stage: 3,
    labelEn: '3. En Route to Home',
    labelTe: '3. మీ ఇంటికి బయలుదేరారు',
    subEn: 'Live GPS pin navigation & sterile vacutainer kit',
  },
  {
    stage: 4,
    labelEn: '4. Sample Collected',
    labelTe: '4. శాంపిల్ సేకరణ పూర్తయింది',
    subEn: 'Barcoded EDTA/SST tubes in 4°C cold-chain transit',
  },
  {
    stage: 5,
    labelEn: '5. Encrypted Report Ready',
    labelTe: '5. ల్యాబ్ రిపోర్ట్ సిద్ధం',
    subEn: 'MD Pathologist verified & AES-256-GCM encrypted',
  },
];

export const LiveTrackerAndVaultPortal: React.FC<LiveTrackerAndVaultPortalProps> = ({
  bookings,
  activeBookingId,
  language,
  onSelectBookingId,
  onAdvanceStage,
}) => {
  const [maskPii, setMaskPii] = useState(true);
  const [decryptionAuditResult, setDecryptionAuditResult] = useState<{
    bookingId: string;
    verified: boolean;
    decryptedJson: string;
  } | null>(null);
  const [isVerifyingCrypto, setIsVerifyingCrypto] = useState(false);

  // Family Biomarker Trend State
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(
    INITIAL_FAMILY_PROFILES[0].id
  );
  const [selectedBiomarkerId, setSelectedBiomarkerId] = useState<string>('bm-hba1c');

  const activeBooking: BookingRecord | undefined = useMemo(
    () => bookings.find((b) => b.bookingId === activeBookingId) || bookings[0],
    [bookings, activeBookingId]
  );

  const activeFamilyProfile: FamilyMemberProfile = useMemo(
    () =>
      INITIAL_FAMILY_PROFILES.find((f) => f.id === selectedFamilyId) ||
      INITIAL_FAMILY_PROFILES[0],
    [selectedFamilyId]
  );

  const activeBiomarker = useMemo(
    () =>
      activeFamilyProfile.biomarkers.find((b) => b.id === selectedBiomarkerId) ||
      activeFamilyProfile.biomarkers[0],
    [activeFamilyProfile, selectedBiomarkerId]
  );

  const handleVerifyEncryptionOnServer = async (bookingId: string) => {
    setIsVerifyingCrypto(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/verify-encryption`);
      const data = await res.json();
      if (res.ok) {
        setDecryptionAuditResult({
          bookingId,
          verified: Boolean(data.verified),
          decryptedJson: JSON.stringify(data.decryptedPayload, null, 2),
        });
      }
    } finally {
      setIsVerifyingCrypto(false);
    }
  };

  if (!activeBooking) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No active bookings found. Book any blood test to track live sample collection!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: REAL-TIME ORDER TRACKING & PHLEBOTOMIST ETA */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              🛡️ REAL-TIME WEBSOCKET ORDER TRACKING & NABL PHLEBOTOMIST DISPATCH
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {language === 'te'
                ? 'లైవ్ ఆర్డర్ ట్రాకింగ్ & ఫ్లెబోటమిస్ట్ రాక సమయం (ETA)'
                : 'Live Sample Collection Tracker & Phlebotomist ETA'}
            </h2>
          </div>

          {/* Booking Selector & PII Privacy Masking Switch */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={activeBooking.bookingId}
              onChange={(e) => {
                onSelectBookingId(e.target.value);
                setDecryptionAuditResult(null);
              }}
              className="px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {bookings.map((b) => (
                <option key={b.bookingId} value={b.bookingId}>
                  {b.bookingId} — {b.patientName} (NABL Certified Lab · Stage {b.trackingStage}/5)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setMaskPii((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {maskPii ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Reveal Masked PII</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mask Patient PII</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5-Stage Live Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {STAGE_LIST.map((item) => {
            const completed = activeBooking.trackingStage >= item.stage;
            const isCurrent = activeBooking.trackingStage === item.stage;
            return (
              <div
                key={item.stage}
                onClick={() =>
                  onAdvanceStage(
                    activeBooking.bookingId,
                    item.stage,
                    item.stage === 3 ? 12 : item.stage >= 4 ? 0 : 20
                  )
                }
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-600 dark:border-sky-500'
                    : completed
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isCurrent
                        ? 'text-sky-800 dark:text-sky-300'
                        : completed
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {language === 'te' ? item.labelTe : item.labelEn}
                  </span>
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      completed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {item.subEn}
                </p>
              </div>
            );
          })}
        </div>

        {/* Live Phlebotomist Card + GPS Pin + Timeline Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Columns: Assigned Phlebotomist, Live ETA & Map Pin */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  ASSIGNED CERTIFIED PHLEBOTOMIST
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>
                    {activeBooking.assignedPhlebotomistName || 'Srinivas Rao K.'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  DMLT / B.Sc MLT Certified · NABL Cold-Chain Vacutainer Kit Verified
                </p>
              </div>

              <div className="text-right font-mono tabular-nums">
                <div className="text-xs text-slate-500 dark:text-slate-400">Live ETA</div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {activeBooking.trackingStage >= 4
                      ? 'Completed'
                      : `${activeBooking.etaMinutes} mins`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Patient Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {activeBooking.patientName} ({activeBooking.age}Y / {activeBooking.gender})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Patient Mobile (PII Protected):
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {maskPii
                    ? activeBooking.maskedMobile
                    : `+91 ${activeBooking.mobileNumber}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Processing Lab:</span>
                <span className="font-bold text-sky-700 dark:text-sky-400">
                  🛡️ NABL Certified Lab (₹{activeBooking.totalTestPrice} · ₹0 Extra)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Scheduled Slot:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {activeBooking.collectionDate} · {activeBooking.timeSlot.split('(')[0]}
                </span>
              </div>
            </div>

            {/* GPS Pin & Contact Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <a
                href={activeBooking.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>View Live GPS Pin on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={`https://wa.me/91${
                  activeBooking.assignedPhlebotomistMobile || '8333821121'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Tech</span>
              </a>
            </div>
          </div>

          {/* Right 7 Columns: Timestamped Tracking Event Log & Instant Receipt/Report Download */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Live Diagnostic Pipeline Chronology
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click any stage card above to simulate live WebSocket progression
                </span>
              </div>

              <div className="space-y-2.5">
                {activeBooking.trackingHistory.map((ev) => (
                  <div
                    key={`${ev.stage}-${ev.timestamp}`}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {language === 'te' ? ev.titleTe : ev.titleEn}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        {ev.note}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {ev.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Download official zero-fee receipt or NABL encrypted biomarker report:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadEncryptedReportOrReceiptHtml(activeBooking, 'receipt')
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600" />
                  <span>Download Booking Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadEncryptedReportOrReceiptHtml(activeBooking, 'report')
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Encrypted Lab Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: AES-256-GCM PATIENT HEALTH DATA ENCRYPTION & CLINICAL REPORT INSPECTOR */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>CRYPTOGRAPHIC PATIENT PRIVACY & AES-256-GCM VAULT</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {language === 'te'
                ? 'AES-256 ఎన్‌క్రిప్టెడ్ హెల్త్ రికార్డ్స్ & ల్యాబ్ రిపోర్ట్ వ్యూయర్'
                : 'AES-256-GCM Encrypted Health Vault & Verified Biomarker Report'}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => handleVerifyEncryptionOnServer(activeBooking.bookingId)}
            disabled={isVerifyingCrypto}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-sky-700 hover:bg-sky-800 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-sky-200" />
            <span>
              {isVerifyingCrypto
                ? 'Verifying AES-256-GCM Auth Tag...'
                : 'Verify Server AES-256-GCM Decryption Integrity'}
            </span>
          </button>
        </div>

        {/* Cryptographic Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Cipher Algorithm</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{activeBooking.encryptionMeta.algorithm}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Key Management ID</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1 truncate">
              {activeBooking.encryptionMeta.keyId}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">Initialization Vector (IV)</div>
            <div className="font-bold text-teal-700 dark:text-teal-400 mt-1 truncate">
              {activeBooking.encryptionMeta.ivHex}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">GCM Authentication Tag</div>
            <div className="font-bold text-sky-700 dark:text-sky-400 mt-1 truncate">
              {activeBooking.encryptionMeta.authTagHex}
            </div>
          </div>
        </div>

        {decryptionAuditResult && (
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>
                ✓ AES-256-GCM AUTHENTICATED DECRYPTION VERIFIED FOR{' '}
                {decryptionAuditResult.bookingId}
              </span>
              <span>Integrity: 100% Authentic</span>
            </div>
            <pre className="overflow-x-auto text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg">
              {decryptionAuditResult.decryptedJson}
            </pre>
          </div>
        )}

        {/* Encrypted Lab Report Biomarker Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 font-bold">Biomarker Parameter</th>
                <th className="py-3 px-4 font-bold text-right">Observed Value</th>
                <th className="py-3 px-4 font-bold">NABL Reference Interval</th>
                <th className="py-3 px-4 font-bold">Clinical Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeBooking.sampleReportMetrics.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {row.parameter}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {row.value} <span className="text-slate-500 font-normal">{row.unit}</span>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {row.referenceRange}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span
                      className={
                        row.status === 'Normal'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }
                    >
                      {row.status === 'Normal' ? '✓ Normal Range' : '▲ Borderline — Monitor'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: FAMILY MEMBER PROFILES & HISTORICAL BIOMARKER TREND CHARTS */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>LONGITUDINAL FAMILY HEALTH & BIOMARKER ANALYTICS</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {language === 'te'
                ? 'కుటుంబ సభ్యుల ఆరోగ్య ప్రొఫైల్స్ & రిపోర్ట్ ట్రెండ్ చార్ట్స్'
                : 'Family Member Profiles & Longitudinal Biomarker Trends'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {INITIAL_FAMILY_PROFILES.map((fp) => (
              <button
                key={fp.id}
                type="button"
                onClick={() => {
                  setSelectedFamilyId(fp.id);
                  setSelectedBiomarkerId(fp.biomarkers[0]?.id || 'bm-hba1c');
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  selectedFamilyId === fp.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {fp.name} · {fp.bloodGroup}
              </button>
            ))}
          </div>
        </div>

        {/* Biomarker Selector & Visual Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Select Biomarker to Inspect 4-Quarter Trend:
            </div>
            {activeFamilyProfile.biomarkers.map((bm) => {
              const latest = bm.points[bm.points.length - 1];
              const isNormal =
                latest.value >= bm.normalMin && latest.value <= bm.normalMax;
              const active = activeBiomarker.id === bm.id;

              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => setSelectedBiomarkerId(bm.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between cursor-pointer ${
                    active
                      ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-600'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {language === 'te' ? bm.nameTe : bm.nameEn}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Normal: {bm.normalMin} – {bm.normalMax} {bm.unit}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {latest.value} {bm.unit}
                    </div>
                    <div
                      className={`text-[11px] font-semibold ${
                        isNormal
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isNormal ? 'Optimal' : 'Borderline'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 8 Columns: Clean SVG Trend Graph */}
          <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeFamilyProfile.name} — {activeBiomarker.nameEn}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Reference Target Range: {activeBiomarker.normalMin} to{' '}
                  {activeBiomarker.normalMax} {activeBiomarker.unit}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                Latest ({activeBiomarker.points[activeBiomarker.points.length - 1].date}):{' '}
                {activeBiomarker.points[activeBiomarker.points.length - 1].value}{' '}
                {activeBiomarker.unit}
              </span>
            </div>

            {/* SVG Line Chart */}
            {(() => {
              const pts = activeBiomarker.points;
              const vals = pts.map((p) => p.value);
              const minVal = Math.min(...vals, activeBiomarker.normalMin) * 0.85;
              const maxVal = Math.max(...vals, activeBiomarker.normalMax) * 1.1;
              const span = Math.max(1, maxVal - minVal);

              const width = 560;
              const height = 170;
              const padX = 48;
              const padY = 24;

              const coords = pts.map((p, i) => {
                const x =
                  padX +
                  (i / Math.max(1, pts.length - 1)) * (width - padX * 2);
                const y =
                  height -
                  padY -
                  ((p.value - minVal) / span) * (height - padY * 2);
                return { x, y, ...p };
              });

              const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

              return (
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-44 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                  >
                    {/* Reference horizontal grid lines */}
                    <line
                      x1={padX}
                      y1={padY}
                      x2={width - padX}
                      y2={padY}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <line
                      x1={padX}
                      y1={height / 2}
                      x2={width - padX}
                      y2={height / 2}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <line
                      x1={padX}
                      y1={height - padY}
                      x2={width - padX}
                      y2={height - padY}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />

                    {/* Trend Line */}
                    <polyline
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3"
                      points={polylinePoints}
                    />

                    {/* Data Points & Labels */}
                    {coords.map((c, idx) => (
                      <g key={idx}>
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r="5"
                          fill="#0d9488"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={c.x}
                          y={c.y - 10}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="#0f172a"
                          className="dark:fill-slate-100 font-mono"
                        >
                          {c.value}
                        </text>
                        <text
                          x={c.x}
                          y={height - 6}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#64748b"
                          className="font-mono"
                        >
                          {c.date}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>
        </div>
      </section>
    </div>
  );
};
