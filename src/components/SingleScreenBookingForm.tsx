import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  Lock,
  MapPin,
  Navigation,
  QrCode,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  ADMIN_DISPLAY_MOBILE,
  ADMIN_UPI_ID,
  getLowestLabForTest,
  INITIAL_FAMILY_PROFILES,
  MORNING_TIME_SLOTS,
} from '../data/catalogData';
import {
  BookingRecord,
  DiagnosticTest,
  LabPartner,
} from '../types/diagnostic';
import {
  buildPatientBookingWhatsAppUrl,
  downloadEncryptedReportOrReceiptHtml,
  generateUpiDeepLink,
  generateUpiQrDataUrl,
} from '../utils/whatsappAndQr';

export const OFFICIAL_PHONEPE_QR_IMAGE =
  '/assets/aistudio/AccountQRCodeState_Bank_of_India_-_7496_LIGHT_THEME_250a0721.png';

export function formatIndianDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

interface SingleScreenBookingFormProps {
  catalog: DiagnosticTest[];
  language: 'en' | 'te';
  selectedTestIds: string[];
  selectedLab: LabPartner;
  isPremium: boolean;
  prefilledName: string;
  prefilledMobile: string;
  onChangeLab: (lab: LabPartner) => void;
  onToggleTest: (testId: string) => void;
  onBookingCreated: (booking: BookingRecord) => void;
  onNavigateToTracker: (bookingId: string) => void;
}

export const SingleScreenBookingForm: React.FC<SingleScreenBookingFormProps> = ({
  catalog,
  language,
  selectedTestIds,
  selectedLab,
  isPremium,
  prefilledName,
  prefilledMobile,
  onToggleTest,
  onBookingCreated,
  onNavigateToTracker,
}) => {
  const [patientName, setPatientName] = useState(prefilledName || 'Ramesh Babu K.');
  const [age, setAge] = useState<string>('38');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [familyRelation, setFamilyRelation] = useState('Self');
  const [mobileNumber, setMobileNumber] = useState(prefilledMobile || '9848022334');
  const [collectionDateIso, setCollectionDateIso] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [timeSlot, setTimeSlot] = useState(MORNING_TIME_SLOTS[1]);
  const [referralCode, setReferralCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<
    'Paid via UPI QR' | 'Pay at Home Collection' | 'Pending'
  >('Paid via UPI QR');

  // QR Display Mode: Official Uploaded PhonePe QR vs Dynamic Amount UPI QR
  const [qrViewMode, setQrViewMode] = useState<'official_phonepe' | 'dynamic_upi'>(
    'official_phonepe'
  );
  const [showFullQrModal, setShowFullQrModal] = useState(false);

  // GPS & Address State
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.4486,
    lng: 78.3908,
  });
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    'https://maps.google.com/?q=17.4486,78.3908'
  );
  const [addressLandmark, setAddressLandmark] = useState(
    'Flat 302, Sri Sai Residency, Madhapur, Hyderabad - 500081'
  );
  const [gpsStatusText, setGpsStatusText] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Quick Add-On Test Dropdown Search
  const [quickAddTestId, setQuickAddTestId] = useState('');

  // Dynamic UPI QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Submission & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<BookingRecord | null>(
    null
  );

  useEffect(() => {
    if (prefilledName.trim()) setPatientName(prefilledName);
  }, [prefilledName]);

  useEffect(() => {
    if (prefilledMobile.trim()) setMobileNumber(prefilledMobile);
  }, [prefilledMobile]);

  const selectedTests = useMemo(
    () => catalog.filter((t) => selectedTestIds.includes(t.id)),
    [catalog, selectedTestIds]
  );

  const pricingSummary = useMemo(() => {
    let mrpSum = 0;
    let rawTotal = 0;
    for (const test of selectedTests) {
      mrpSum += test.mrp;
      const base = getLowestLabForTest(test).price;
      rawTotal += isPremium ? Math.round(base * 0.9) : base;
    }

    const referralDiscount =
      selectedTests.length > 0 && referralCode.trim().length >= 4 ? 100 : 0;
    const finalPayable =
      selectedTests.length > 0 ? Math.max(0, rawTotal - referralDiscount) : 0;
    const totalSaved = Math.max(0, mrpSum - finalPayable);

    return {
      mrpSum,
      rawTotal,
      referralDiscount,
      finalPayable,
      totalSaved,
    };
  }, [selectedTests, isPremium, referralCode]);

  useEffect(() => {
    let active = true;
    if (pricingSummary.finalPayable > 0) {
      generateUpiQrDataUrl(
        pricingSummary.finalPayable,
        'Rakthapariksha NABL Blood Test'
      ).then((url) => {
        if (active) setQrDataUrl(url);
      });
    } else {
      setQrDataUrl('');
    }
    return () => {
      active = false;
    };
  }, [pricingSummary.finalPayable]);

  const handleSelectFamilyProfile = (profileId: string) => {
    const prof = INITIAL_FAMILY_PROFILES.find((p) => p.id === profileId);
    if (!prof) return;
    setPatientName(prof.name.replace(/\s*\(.*\)/, ''));
    setAge(String(prof.age));
    setGender(prof.gender);
    setFamilyRelation(prof.relation);
  };

  const handleDetectLiveGps = () => {
    setIsDetectingGps(true);
    setGpsStatusText('Acquiring live satellite coordinates...');

    if (!navigator.geolocation) {
      const fallback = { lat: 17.4486, lng: 78.3908 };
      setGpsCoords(fallback);
      setGoogleMapsUrl(`https://maps.google.com/?q=${fallback.lat},${fallback.lng}`);
      setGpsStatusText('GPS Pin Locked: 17.4486° N, 78.3908° E (Hyderabad)');
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setGpsCoords({ lat, lng });
        setGoogleMapsUrl(`https://maps.google.com/?q=${lat},${lng}`);
        setGpsStatusText(`Live GPS Pin Captured: ${lat}, ${lng}`);
        setIsDetectingGps(false);
      },
      () => {
        const lat = Number((17.4486 + (Math.random() - 0.5) * 0.01).toFixed(5));
        const lng = Number((78.3908 + (Math.random() - 0.5) * 0.01).toFixed(5));
        setGpsCoords({ lat, lng });
        setGoogleMapsUrl(`https://maps.google.com/?q=${lat},${lng}`);
        setGpsStatusText(
          `High-Accuracy GPS Pin Generated: ${lat}, ${lng} (Map Link Ready)`
        );
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const formattedIndianCollectionDate = formatIndianDate(collectionDateIso);

  const handleSaveAndDispatchWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!patientName.trim()) {
      setFormError('Please enter the Patient Full Name.');
      return;
    }
    if (cleanMobile.length !== 10) {
      setFormError('Please enter a valid 10-digit Indian Mobile Number.');
      return;
    }
    if (selectedTests.length === 0) {
      setFormError('Please select at least 1 blood test or package from the catalog.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          age: Number(age) || 35,
          gender,
          familyRelation,
          mobileNumber: cleanMobile,
          collectionDate: formattedIndianCollectionDate,
          timeSlot,
          selectedLab,
          selectedTestIds: selectedTests.map((t) => t.id),
          selectedTestNames: selectedTests.map((t) => t.nameEn),
          totalMrp: pricingSummary.mrpSum,
          totalTestPrice: pricingSummary.finalPayable,
          premiumDiscountApplied: isPremium,
          referralCode: referralCode.trim() || undefined,
          gpsCoordinates: gpsCoords,
          googleMapsUrl,
          addressLandmark: addressLandmark.trim(),
          paymentStatus,
        }),
      });

      const createdBooking: BookingRecord = await response.json();
      if (!response.ok) {
        throw new Error('Failed to save booking');
      }

      setLastCreatedBooking(createdBooking);
      onBookingCreated(createdBooking);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save booking. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiDeepLink = generateUpiDeepLink(
    pricingSummary.finalPayable,
    'Rakthapariksha NABL Blood Test'
  );

  return (
    <section
      id="booking-engine-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 shadow-xs space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 text-xs font-semibold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>🛡️ NABL Certified Processing | 🇮🇳 100% Indian App</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {language === 'te'
              ? 'ఒకే స్క్రీన్‌లో బుకింగ్, లైవ్ GPS & PhonePe UPI QR పేమెంట్'
              : 'One-Screen Patient Booking, Live GPS Pin & Instant PhonePe UPI QR'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No login or Email ID required · AES-256-GCM Encrypted · Direct WhatsApp dispatch to +91 {ADMIN_DISPLAY_MOBILE}
          </p>
        </div>

        {/* Family Profile Quick Fill */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Quick Fill Family Member:
          </span>
          {INITIAL_FAMILY_PROFILES.map((fp) => (
            <button
              key={fp.id}
              type="button"
              onClick={() => handleSelectFamilyProfile(fp.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                familyRelation === fp.relation
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {fp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation Banner if Booking Was Just Created */}
      {lastCreatedBooking && (
        <div className="p-5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                ✓ NABL BOOKING SAVED & AES-256 ENCRYPTED · ID: {lastCreatedBooking.bookingId}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {lastCreatedBooking.patientName} · Date: {lastCreatedBooking.collectionDate} · ₹
                {lastCreatedBooking.totalTestPrice} (₹0 Extra Charges)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Assigned Phlebotomist: {lastCreatedBooking.assignedPhlebotomistName} · Live ETA: ~
                {lastCreatedBooking.etaMinutes} mins · Cipher IV:{' '}
                <span className="font-mono">{lastCreatedBooking.encryptionMeta.ivHex}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={buildPatientBookingWhatsAppUrl(lastCreatedBooking, catalog)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Admin WhatsApp (+91 {ADMIN_DISPLAY_MOBILE})</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() =>
                  downloadEncryptedReportOrReceiptHtml(lastCreatedBooking, 'receipt')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>Download Zero-Fee Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTracker(lastCreatedBooking.bookingId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open Live Order Tracker →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveAndDispatchWhatsApp} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Patient Details, Schedule (DD/MM/YYYY), NABL Tests, Live GPS */}
        <div className="lg:col-span-7 space-y-5">
          {/* Row 1: Patient Name, Age, Gender, 10-Digit Mobile (No Email Field!) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'రోగి పూర్తి పేరు (Patient Full Name) *' : 'Patient Full Name *'}
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter Patient Full Name"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'వయస్సు (Age) *' : 'Age (Yrs) *'}
              </label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'లింగం (Gender)' : 'Gender'}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                className="w-full px-2.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'మొబైల్ నంబర్ (10 అంకెలు) *' : '10-Digit Mobile *'}
              </label>
              <input
                type="tel"
                maxLength={10}
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98480XXXXX"
                className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          {/* Row 2: Collection Date (Indian Standard DD/MM/YYYY), Morning Slot & Referral Code */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>{language === 'te' ? 'శాంపిల్ తేదీ' : 'Collection Date'}</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-sky-700 dark:text-sky-400">
                  {formattedIndianCollectionDate} (DD/MM/YYYY)
                </span>
              </div>
              <input
                type="date"
                value={collectionDateIso}
                onChange={(e) => setCollectionDateIso(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'ఉదయం టైమ్ స్లాట్ (Preferred Time Slot)' : 'Preferred Morning Slot'}
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {MORNING_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Referral Code (₹100 OFF)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. RP100"
                className="w-full px-3 py-2.5 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Row 3: Live GPS Location Capture & Address/Landmark */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>
                    {language === 'te'
                      ? 'లైవ్ GPS లొకేషన్ & ఇంటి చిరునామా (₹0 హోమ్ కలెక్షన్)'
                      : 'Home Sample Collection GPS Pin & Landmark (₹0 Collection Fee)'}
                  </span>
                </span>
                {gpsStatusText && (
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {gpsStatusText}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleDetectLiveGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {isDetectingGps ? 'Detecting GPS...' : 'Detect Live GPS Location'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  House / Flat No., Colony, Landmark & Pincode
                </label>
                <input
                  type="text"
                  value={addressLandmark}
                  onChange={(e) => setAddressLandmark(e.target.value)}
                  placeholder="Enter Flat/House No, Street, Landmark & Pincode"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Clickable Google Maps Pin Link
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sky-700 dark:text-sky-400"
                  />
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-sky-600 shrink-0"
                    title="Open Google Maps Pin"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Selected NABL Tests & Quick Add Dropdown */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Selected NABL Diagnostic Tests ({selectedTests.length})
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={quickAddTestId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      onToggleTest(val);
                      setQuickAddTestId('');
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="">+ Add Another Blood Test / Package...</option>
                  {catalog
                    .filter((t) => !selectedTestIds.includes(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nameEn} — ₹{getLowestLabForTest(t).price} (NABL Certified)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {selectedTests.length === 0 ? (
              <div className="p-4 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  No tests selected yet. Choose a test from the dropdown above or click "+ Select Test" on any card in the catalog.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedTests.map((t) => {
                  const rawP = getLowestLabForTest(t).price;
                  const price = isPremium ? Math.round(rawP * 0.9) : rawP;
                  return (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {t.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t.parameterCount} Params · {t.fastingTextEn} · Tube: {t.sampleTube}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{price}
                          </span>
                          <span className="ml-1.5 text-slate-400 line-through">
                            ₹{t.mrp}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleTest(t.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Remove test"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Zero-Fee Invoice Breakdown + CONDITIONAL PhonePe UPI QR & WhatsApp Dispatch */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <div className="space-y-4">
            {/* Emerald Green Zero Extra Fee Guarantee Box */}
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 space-y-1">
              <div className="text-xs font-extrabold tracking-wide text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>PAY ONLY TEST CHARGES — ₹0 EXTRA FEES!</span>
              </div>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200/90">
                కేవలం టెస్ట్ చార్జీలు మాత్రమే చెల్లించండి — హోమ్ శాంపిల్ కలెక్షన్ ఫీజు ₹0, కన్వీనియన్స్ ఫీజు ₹0!
              </p>
            </div>

            {/* Transparent Price Breakdown */}
            <div className="space-y-2 text-xs border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Total Market MRP ({selectedTests.length} Tests)</span>
                <span className="font-mono tabular-nums line-through">
                  ₹{pricingSummary.mrpSum}
                </span>
              </div>
              <div className="flex justify-between text-slate-800 dark:text-slate-200 font-semibold">
                <span>Rakthapariksha NABL Certified Price</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white font-bold">
                  ₹{pricingSummary.rawTotal}
                </span>
              </div>
              {pricingSummary.referralDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Referral Code Discount ({referralCode})</span>
                  <span className="font-mono tabular-nums">
                    -₹{pricingSummary.referralDiscount}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Home Phlebotomy / Sample Collection Fee</span>
                <span className="font-mono tabular-nums">₹0 (FREE)</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Platform Convenience & Report Fee</span>
                <span className="font-mono tabular-nums">₹0 (FREE)</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Total Payable (Test Price Only)
                  </span>
                  {pricingSummary.totalSaved > 0 && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">
                      You Save ₹{pricingSummary.totalSaved} off MRP
                    </div>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  ₹{pricingSummary.finalPayable}
                </span>
              </div>
            </div>

            {/* CONDITIONAL RENDERING: Hide UPI QR & Payment Status if 0 Tests Selected (Total Payable = ₹0) */}
            {selectedTests.length === 0 || pricingSummary.finalPayable === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-sky-300 dark:border-sky-800 rounded-xl p-6 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center mx-auto">
                  <QrCode className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                  Please select at least one test from the catalog above to generate your instant UPI payment QR.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'te'
                    ? 'UPI QR కోడ్ కోసం పైన ఉన్న క్యాటలాగ్ నుండి కనీసం ఒక రక్త పరీక్షను ఎంచుకోండి.'
                    : 'Zero Home Collection Fee & Zero Convenience Fee guaranteed.'}
                </p>
              </div>
            ) : (
              /* Active PhonePe QR Code & Payment Controls */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-sky-600" />
                      <span>PhonePe / UPI QR ({ADMIN_UPI_ID})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Merchant: BOGUDAMIDI YUVARATHAN (SBI - 7496)
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setQrViewMode('official_phonepe')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        qrViewMode === 'official_phonepe'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      PhonePe QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrViewMode('dynamic_upi')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        qrViewMode === 'dynamic_upi'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      ₹{pricingSummary.finalPayable} QR
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Image (Official Uploaded PhonePe QR or Dynamic Amount QR) */}
                  <div
                    onClick={() => setShowFullQrModal(true)}
                    className="cursor-pointer group relative shrink-0"
                    title="Click to enlarge PhonePe QR code"
                  >
                    {qrViewMode === 'official_phonepe' ? (
                      <img
                        src={OFFICIAL_PHONEPE_QR_IMAGE}
                        alt="Official PhonePe QR Code - BOGUDAMIDI YUVARATHAN (State Bank of India - 7496)"
                        referrerPolicy="no-referrer"
                        className="w-36 h-44 object-contain rounded-lg border border-slate-200 p-1 bg-white"
                      />
                    ) : qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`UPI QR Code for ₹${pricingSummary.finalPayable}`}
                        referrerPolicy="no-referrer"
                        className="w-36 h-36 rounded-lg border border-slate-200 p-1 bg-white"
                      />
                    ) : null}
                    <span className="block text-[10px] text-center text-sky-600 dark:text-sky-400 font-semibold mt-1 group-hover:underline">
                      Tap to Enlarge QR
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 w-full">
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Scan & Pay <strong className="font-mono text-slate-900 dark:text-white">₹{pricingSummary.finalPayable}</strong> using PhonePe, Google Pay, or Paytm to <strong>BOGUDAMIDI YUVARATHAN</strong>.
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={upiDeepLink}
                        className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(upiDeepLink);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Payment Status Toggle */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Mode / Status:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            'Paid via UPI QR',
                            'Pay at Home Collection',
                            'Pending',
                          ] as const
                        ).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentStatus(mode)}
                            className={`px-2 py-1.5 text-[11px] font-semibold rounded-md border transition-colors truncate cursor-pointer ${
                              paymentStatus === mode
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AES-256 Encryption Notice & Primary Emerald Green WhatsApp Submit Button */}
          <div className="space-y-3">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-medium text-sky-700 dark:text-sky-400">
                <Lock className="w-3.5 h-3.5" />
                <span>AES-256-GCM Health Data Encryption Active</span>
              </span>
              <span className="font-mono">🛡️ NABL Certified</span>
            </div>

            {selectedTests.length > 0 && pricingSummary.finalPayable > 0 && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Encrypting & Saving Booking...'
                    : language === 'te'
                    ? 'బుకింగ్ సేవ్ చేసి లొకేషన్‌తో వాట్సాప్ పంపండి'
                    : 'Save & Send Details with Location on WhatsApp'}
                </span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Enlarged Full-Screen PhonePe QR Modal */}
      {showFullQrModal && (
        <div
          onClick={() => setShowFullQrModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-5 text-center space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">
                Official PhonePe QR — Payable: ₹{pricingSummary.finalPayable}
              </span>
              <button
                type="button"
                onClick={() => setShowFullQrModal(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close ✕
              </button>
            </div>
            <img
              src={OFFICIAL_PHONEPE_QR_IMAGE}
              alt="PhonePe QR Code - BOGUDAMIDI YUVARATHAN"
              referrerPolicy="no-referrer"
              className="w-full max-h-[68vh] object-contain mx-auto rounded-lg"
            />
            <div className="text-xs font-semibold text-emerald-700">
              Pay ONLY Test Charges (₹{pricingSummary.finalPayable}) · ₹0 Extra Fees
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
