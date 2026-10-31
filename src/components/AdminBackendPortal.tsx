import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  PlusCircle,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  ADMIN_DISPLAY_MOBILE,
  ADMIN_SECRET_PASSCODE,
} from '../data/catalogData';
import {
  BookingRecord,
  DIAGNOSTIC_CATEGORIES,
  DiagnosticCategory,
  DiagnosticTest,
  LabPartner,
  PhlebotomistPartner,
  TrackingStage,
} from '../types/diagnostic';
import {
  buildAdminToPatientConfirmationWhatsAppUrl,
  buildAdminToPhlebotomistDispatchWhatsAppUrl,
} from '../utils/whatsappAndQr';

interface AdminBackendPortalProps {
  bookings: BookingRecord[];
  phlebotomists: PhlebotomistPartner[];
  catalog: DiagnosticTest[];
  language: 'en' | 'te';
  onUpdateBooking: (
    bookingId: string,
    updates: {
      assignedPhlebotomistId?: string;
      trackingStage?: TrackingStage;
      etaMinutes?: number;
      paymentStatus?: BookingRecord['paymentStatus'];
    }
  ) => void;
  onAddOrUpdateCatalogTest: (newTest: DiagnosticTest) => void;
}

export const AdminBackendPortal: React.FC<AdminBackendPortalProps> = ({
  bookings,
  phlebotomists,
  catalog,
  onUpdateBooking,
  onAddOrUpdateCatalogTest,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [revealPii, setRevealPii] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<
    'bookings' | 'catalog_manager'
  >('bookings');

  // Custom Test & Price Manager State
  const [testNameEn, setTestNameEn] = useState('');
  const [testNameTe, setTestNameTe] = useState('');
  const [testCategory, setTestCategory] =
    useState<Exclude<DiagnosticCategory, 'All'>>('Routine & Fever');
  const [paramCount, setParamCount] = useState('4');
  const [paramsList, setParamsList] = useState(
    'Total Bilirubin, Direct Bilirubin, SGOT, SGPT'
  );
  const [fastingReq, setFastingReq] = useState(false);
  const [tatHours, setTatHours] = useState('8');
  const [sampleTube, setSampleTube] = useState('SST Gold Top (Serum)');
  const [mrpPrice, setMrpPrice] = useState('1200');
  const [priceThyrocare, setPriceThyrocare] = useState('349');
  const [priceTata, setPriceTata] = useState('399');
  const [priceHealthians, setPriceHealthians] = useState('369');
  const [priceLupin, setPriceLupin] = useState('420');
  const [priceApollo, setPriceApollo] = useState('460');
  const [catalogSaveSuccess, setCatalogSaveSuccess] = useState<string | null>(
    null
  );

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim().toUpperCase() === ADMIN_SECRET_PASSCODE) {
      setIsUnlocked(true);
      setPasscodeError(null);
    } else {
      setPasscodeError('Invalid Admin Access Code. Default Demo Passcode: RP2026');
    }
  };

  const handleCreateCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNameEn.trim()) return;

    const payload = {
      nameEn: testNameEn.trim(),
      nameTe: testNameTe.trim() || testNameEn.trim(),
      category: testCategory,
      parameterCount: Number(paramCount) || 1,
      parametersIncluded: paramsList
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      fastingRequired: fastingReq,
      tatHours: Number(tatHours) || 8,
      sampleTube,
      mrp: Number(mrpPrice) || 1000,
      labPrices: {
        Thyrocare: {
          price: Number(priceThyrocare) || 299,
          rating: 4.9,
          accreditation: 'NABL & CAP',
        },
        'Tata 1mg': {
          price: Number(priceTata) || 349,
          rating: 4.9,
          accreditation: 'NABL & CAP',
        },
        Healthians: {
          price: Number(priceHealthians) || 329,
          rating: 4.8,
          accreditation: 'NABL Accredited',
        },
        'Lupin Diagnostics': {
          price: Number(priceLupin) || 379,
          rating: 4.8,
          accreditation: 'NABL Accredited',
        },
        'Apollo Diagnostics': {
          price: Number(priceApollo) || 419,
          rating: 4.9,
          accreditation: 'NABL & CAP',
        },
      } as Record<
        LabPartner,
        {
          price: number;
          rating: number;
          accreditation: 'NABL & CAP' | 'NABL Accredited';
        }
      >,
    };

    const res = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created: DiagnosticTest = await res.json();
      onAddOrUpdateCatalogTest(created);
      setCatalogSaveSuccess(
        `Added "${created.nameEn}" across all 5 Partner Labs in real time!`
      );
      setTestNameEn('');
      setTestNameTe('');
    }
  };

  if (!isUnlocked) {
    return (
      <section className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1 text-center">
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-5 h-5 text-sky-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Credential-Protected Admin Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter the Admin Secret Access Code to manage live bookings, phlebotomist assignments, WhatsApp dispatches (+91 {ADMIN_DISPLAY_MOBILE}), and NABL test pricing.
          </p>
        </div>

        <form onSubmit={handleUnlockAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Admin Access Passcode (Demo Code: <span className="font-mono font-bold text-sky-600">RP2026</span>)
            </label>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Enter RP2026"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {passcodeError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 text-xs text-red-700 dark:text-red-300">
              {passcodeError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Unlock Admin Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setPasscodeInput('RP2026');
                setIsUnlocked(true);
              }}
              className="py-2.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              1-Tap Demo Unlock (RP2026)
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin Control Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>🛡️ NABL NATIONAL BOARD OF LABORATORIES · ADMIN DISPATCH CENTER (RP2026)</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            Live Bookings, Phlebotomist Assignment & WhatsApp Dispatch Center
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveAdminTab('bookings')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeAdminTab === 'bookings'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Live Bookings & Dispatch ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('catalog_manager')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeAdminTab === 'catalog_manager'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            + Add / Edit NABL Tests ({catalog.length})
          </button>

          <button
            type="button"
            onClick={() => setRevealPii((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {revealPii ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Mask PII</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>Decrypt PII</span>
              </>
            )}
          </button>
        </div>
      </div>

      {activeAdminTab === 'bookings' ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <article
              key={booking.bookingId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="font-extrabold text-sky-700 dark:text-sky-400 text-sm">
                      {booking.bookingId}
                    </span>
                    <span>·</span>
                    <span className="text-slate-500">
                      Booked: {new Date(booking.createdAt).toLocaleString('en-IN')}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400">
                      <Lock className="w-3 h-3" />
                      <span>AES-256-GCM ({booking.encryptionMeta.ivHex.slice(0, 10)})</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {booking.patientName} ({booking.age}Y / {booking.gender}) —{' '}
                    <span className="font-mono text-sky-700 dark:text-sky-400">
                      {revealPii ? `+91 ${booking.mobileNumber}` : booking.maskedMobile}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Slot: <strong className="font-mono">{booking.collectionDate} | {booking.timeSlot}</strong> · Processing Facility:{' '}
                    <strong className="text-sky-700 dark:text-sky-400">🛡️ NABL Certified National Lab (🇮🇳 100% Indian App)</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                      ₹{booking.totalTestPrice}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      {booking.paymentStatus} · ₹0 Extra Fee
                    </div>
                  </div>

                  <a
                    href={booking.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>Open GPS Map Pin</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Booked Tests & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Booked Tests ({booking.selectedTestNames.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                    {booking.selectedTestNames.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    Collection Address & Live GPS Coordinates:
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {booking.addressLandmark}
                  </p>
                  <p className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                    {booking.googleMapsUrl}
                  </p>
                </div>
              </div>

              {/* Admin Assignment & Live Tracking Stage Controls + 1-Click WhatsApp Dispatches */}
              <div className="pt-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Registered Phlebotomist:
                  </label>
                  <select
                    value={booking.assignedPhlebotomistId || ''}
                    onChange={(e) =>
                      onUpdateBooking(booking.bookingId, {
                        assignedPhlebotomistId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {phlebotomists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.qualification} · +91 {p.mobileNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Live Order Tracking Stage (WebSocket Push):
                  </label>
                  <select
                    value={booking.trackingStage}
                    onChange={(e) =>
                      onUpdateBooking(booking.bookingId, {
                        trackingStage: Number(e.target.value) as TrackingStage,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value={1}>Stage 1: Booking Confirmed</option>
                    <option value={2}>Stage 2: Phlebotomist Assigned</option>
                    <option value={3}>Stage 3: Phlebotomist En Route</option>
                    <option value={4}>Stage 4: Sample Collected (Barcoded)</option>
                    <option value={5}>Stage 5: Encrypted Lab Report Ready</option>
                  </select>
                </div>

                {/* One-Click WhatsApp Dispatch Buttons */}
                <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
                  <a
                    href={buildAdminToPatientConfirmationWhatsAppUrl(booking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Patient Confirmation</span>
                  </a>

                  <a
                    href={buildAdminToPhlebotomistDispatchWhatsAppUrl(
                      booking,
                      catalog
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Order to Phlebotomist</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Custom Test & Lab Price Manager */
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-teal-600" />
              <span>Custom Diagnostic Test & Real-Time Price Manager</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dynamically add new blood tests or packages to the NABL certified catalog in real time.
            </p>
          </div>

          {catalogSaveSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{catalogSaveSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomTest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={testNameEn}
                  onChange={(e) => setTestNameEn(e.target.value)}
                  placeholder="e.g. Magnesium & Zinc Trace Mineral Panel"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Name (తెలుగు / Telugu)
                </label>
                <input
                  type="text"
                  value={testNameTe}
                  onChange={(e) => setTestNameTe(e.target.value)}
                  placeholder="e.g. మెగ్నీషియం & జింక్ పరీక్ష"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Diagnostic Category
                </label>
                <select
                  value={testCategory}
                  onChange={(e) =>
                    setTestCategory(
                      e.target.value as Exclude<DiagnosticCategory, 'All'>
                    )
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {DIAGNOSTIC_CATEGORIES.filter((c) => c.id !== 'All').map(
                    (c) => (
                      <option key={c.id} value={c.id}>
                        {c.labelEn}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parameter Count
                </label>
                <input
                  type="number"
                  min={1}
                  value={paramCount}
                  onChange={(e) => setParamCount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Report TAT (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  value={tatHours}
                  onChange={(e) => setTatHours(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vacutainer Tube Type
                </label>
                <input
                  type="text"
                  value={sampleTube}
                  onChange={(e) => setSampleTube(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fasting Required?
                </label>
                <select
                  value={fastingReq ? 'yes' : 'no'}
                  onChange={(e) => setFastingReq(e.target.value === 'yes')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="no">No Fasting Required</option>
                  <option value="yes">Yes (10-12 Hrs Fasting)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Included Parameters (Comma Separated)
              </label>
              <input
                type="text"
                value={paramsList}
                onChange={(e) => setParamsList(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Pricing Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Market MRP (₹)
                </label>
                <input
                  type="number"
                  value={mrpPrice}
                  onChange={(e) => setMrpPrice(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1">
                  NABL Rate 1 (₹)
                </label>
                <input
                  type="number"
                  value={priceThyrocare}
                  onChange={(e) => setPriceThyrocare(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1">
                  NABL Rate 2 (₹)
                </label>
                <input
                  type="number"
                  value={priceTata}
                  onChange={(e) => setPriceTata(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1">
                  NABL Rate 3 (₹)
                </label>
                <input
                  type="number"
                  value={priceHealthians}
                  onChange={(e) => setPriceHealthians(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1">
                  NABL Rate 4 (₹)
                </label>
                <input
                  type="number"
                  value={priceLupin}
                  onChange={(e) => setPriceLupin(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1">
                  NABL Rate 5 (₹)
                </label>
                <input
                  type="number"
                  value={priceApollo}
                  onChange={(e) => setPriceApollo(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Publish Test to Live NABL Catalog
            </button>
          </form>
        </section>
      )}
    </div>
  );
};
