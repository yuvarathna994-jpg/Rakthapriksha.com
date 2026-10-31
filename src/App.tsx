import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ExternalLink,
  Gift,
  Globe,
  Lock,
  Moon,
  PhoneCall,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sun,
} from 'lucide-react';
import {
  ADMIN_DISPLAY_MOBILE,
  INITIAL_DIAGNOSTIC_CATALOG,
  INITIAL_PHLEBOTOMISTS,
  getLowestLabForTest,
} from './data/catalogData';
import {
  BookingRecord,
  DiagnosticTest,
  LabPartner,
  PhlebotomistPartner,
  TrackingStage,
} from './types/diagnostic';
import {
  buildCustomerCheckInWhatsAppUrl,
  buildReferralWhatsAppUrl,
} from './utils/whatsappAndQr';
import { CatalogPortal } from './components/CatalogPortal';
import { SingleScreenBookingForm } from './components/SingleScreenBookingForm';
import { LiveTrackerAndVaultPortal } from './components/LiveTrackerAndVaultPortal';
import { PhlebotomistPortal } from './components/PhlebotomistPortal';
import { AdminBackendPortal } from './components/AdminBackendPortal';
import { GeminiMedicalAdvisor } from './components/GeminiMedicalAdvisor';

type ActivePortalView = 'catalog_booking' | 'live_tracker' | 'phlebotomist' | 'admin';

export default function App() {
  const [activeView, setActiveView] = useState<ActivePortalView>('catalog_booking');
  const [language, setLanguage] = useState<'en' | 'te'>('en');
  const [isDark, setIsDark] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);

  // Server & WebSocket Synchronized State
  const [catalog, setCatalog] = useState<DiagnosticTest[]>(INITIAL_DIAGNOSTIC_CATALOG);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [phlebotomists, setPhlebotomists] = useState<PhlebotomistPartner[]>(
    INITIAL_PHLEBOTOMISTS
  );
  const [activeTrackingBookingId, setActiveTrackingBookingId] =
    useState<string>('RP-2026-4812');

  // Booking Selection State
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([
    'pkg-aarogyam-c',
  ]);
  const [selectedLab, setSelectedLab] = useState<LabPartner>('Thyrocare');
  const [cardLabOverrides, setCardLabOverrides] = useState<
    Record<string, LabPartner>
  >({});

  // Quick Customer Mobile Check-In State (Placed inside Live Tracker & Phlebotomist tabs)
  const [checkInName, setCheckInName] = useState('');
  const [checkInMobile, setCheckInMobile] = useState('');
  const [checkedInCustomer, setCheckedInCustomer] = useState<{
    name: string;
    mobile: string;
    referralCode: string;
  } | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Initial State Fetch + Real-Time WebSocket Connection
  useEffect(() => {
    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.catalog)) setCatalog(data.catalog);
        if (Array.isArray(data.bookings) && data.bookings.length > 0) {
          setBookings(data.bookings);
          setActiveTrackingBookingId(data.bookings[0].bookingId);
        }
        if (Array.isArray(data.phlebotomists)) {
          setPhlebotomists(data.phlebotomists);
        }
      })
      .catch(() => {
        // Fallback to pre-loaded catalog if server is starting
      });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'init' && msg.payload) {
            if (Array.isArray(msg.payload.catalog)) setCatalog(msg.payload.catalog);
            if (Array.isArray(msg.payload.bookings)) setBookings(msg.payload.bookings);
            if (Array.isArray(msg.payload.phlebotomists)) {
              setPhlebotomists(msg.payload.phlebotomists);
            }
          } else if (msg.type === 'booking:created' && msg.payload) {
            const newB: BookingRecord = msg.payload;
            setBookings((prev) =>
              prev.some((b) => b.bookingId === newB.bookingId)
                ? prev
                : [newB, ...prev]
            );
          } else if (msg.type === 'booking:updated' && msg.payload) {
            const updated: BookingRecord = msg.payload;
            setBookings((prev) =>
              prev.map((b) =>
                b.bookingId === updated.bookingId ? updated : b
              )
            );
          } else if (msg.type === 'phlebotomist:created' && msg.payload) {
            const newP: PhlebotomistPartner = msg.payload;
            setPhlebotomists((prev) =>
              prev.some((p) => p.id === newP.id) ? prev : [newP, ...prev]
            );
          } else if (msg.type === 'catalog:updated' && Array.isArray(msg.payload)) {
            setCatalog(msg.payload);
          }
        } catch {
          // Ignore malformed WS packets
        }
      };
    } catch {
      // WebSocket reconnect optional
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const handleToggleTest = (testId: string, preferredLab?: LabPartner) => {
    if (preferredLab) {
      setSelectedLab(preferredLab);
    }
    setSelectedTestIds((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const handleChangeCardLab = (testId: string, lab: LabPartner) => {
    setCardLabOverrides((prev) => ({ ...prev, [testId]: lab }));
    setSelectedLab(lab);
  };

  const handleQuickCustomerCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInError(null);
    const cleanPhone = checkInMobile.replace(/\D/g, '');
    if (!checkInName.trim() || cleanPhone.length !== 10) {
      setCheckInError('Enter your Name and 10-digit Mobile Number.');
      return;
    }
    const referralCode = `RP${cleanPhone.slice(-4)}`;
    setCheckedInCustomer({
      name: checkInName.trim(),
      mobile: cleanPhone,
      referralCode,
    });
  };

  const handleUpdateBooking = async (
    bookingId: string,
    updates: {
      assignedPhlebotomistId?: string;
      trackingStage?: TrackingStage;
      etaMinutes?: number;
      paymentStatus?: BookingRecord['paymentStatus'];
    }
  ) => {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated: BookingRecord = await res.json();
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === updated.bookingId ? updated : b))
      );
    }
  };

  const scrollToBookingSection = () => {
    setActiveView('catalog_booking');
    setTimeout(() => {
      document
        .getElementById('booking-engine-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // Compute cart total for sticky bottom cart bar & header button
  const cartSummary = useMemo(() => {
    const selectedObjects = catalog.filter((t) => selectedTestIds.includes(t.id));
    const rawTotal = selectedObjects.reduce(
      (sum, t) => sum + getLowestLabForTest(t).price,
      0
    );
    const finalPayable = isPremium ? Math.round(rawTotal * 0.9) : rawTotal;
    return {
      count: selectedObjects.length,
      total: finalPayable,
    };
  }, [catalog, selectedTestIds, isPremium]);

  const activeReferralCode = checkedInCustomer?.referralCode || 'RP2026';

  // Reusable Check-In Alert Block (Moved inside Live Tracker & Phlebotomist Join tabs per user request)
  const renderCustomerCheckInCard = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 no-print">
      {checkedInCustomer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">
              Checked-In Profile: {checkedInCustomer.name} (+91 {checkedInCustomer.mobile})
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-sky-700 dark:text-sky-400 font-mono font-semibold">
              Referral Code: {checkedInCustomer.referralCode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildCustomerCheckInWhatsAppUrl(
                checkedInCustomer.name,
                checkedInCustomer.mobile
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                Send Check-In Alert to Admin WhatsApp (+91 {ADMIN_DISPLAY_MOBILE})
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={() => setCheckedInCustomer(null)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Change Mobile
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleQuickCustomerCheckIn}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          <div className="text-xs">
            <span className="font-bold text-sky-700 dark:text-sky-400">
              {language === 'te'
                ? '1-స్టెప్ మొబైల్ చెక్-ఇన్ (లాగిన్ / ఇమెయిల్ అవసరం లేదు): '
                : 'Quick Dispatch & Tracker Check-In (No Password or Email Needed): '}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Enter Name & 10-Digit Mobile to send a live check-in alert to Admin WhatsApp (+91 {ADMIN_DISPLAY_MOBILE}).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={checkInName}
              onChange={(e) => setCheckInName(e.target.value)}
              placeholder={language === 'te' ? 'మీ పూర్తి పేరు (Your Name)' : 'Full Name'}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
            <input
              type="tel"
              maxLength={10}
              value={checkInMobile}
              onChange={(e) =>
                setCheckInMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
              }
              placeholder="10-Digit Mobile Number"
              className="px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 w-40"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Send Check-In Alert to Admin WhatsApp
            </button>
            {checkInError && (
              <span className="text-xs text-red-600 font-medium">
                {checkInError}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-20">
      {/* CLEAN STICKY TOP HEADER: Brand Logo (Left), Nav Tabs (Center), Language Toggle + Cart/Book Summary Button (Right) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 no-print shadow-xs">
        {/* Left: Brand Logo in Crimson Red (#DC2626) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('catalog_booking');
            }}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-red-600 dark:text-red-500 whitespace-nowrap"
          >
            Rakthapariksha.com
          </a>
          <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            🛡️ NABL Certified | 🇮🇳 100% Indian App
          </span>
        </div>

        {/* Center: 4 Navigation Links with Crimson Red Active Indicator */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveView('catalog_booking')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'catalog_booking'
                ? 'text-red-600 dark:text-red-400 font-bold border-b-2 border-red-600'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'te' ? 'రక్త పరీక్షల క్యాటలాగ్' : 'Blood Test Catalog'}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('live_tracker')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'live_tracker'
                ? 'text-red-600 dark:text-red-400 font-bold border-b-2 border-red-600'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'te' ? 'లైవ్ ఆర్డర్ ట్రాకర్' : 'Live Tracker & Vault'}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('phlebotomist')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'phlebotomist'
                ? 'text-red-600 dark:text-red-400 font-bold border-b-2 border-red-600'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'te' ? 'ఫ్లెబోటమిస్ట్ రిజిస్ట్రేషన్' : 'Phlebotomist Join'}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'admin'
                ? 'text-red-600 dark:text-red-400 font-bold border-b-2 border-red-600'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'te' ? 'అడ్మిన్ పోర్టల్' : 'Admin Portal'}
          </button>
        </nav>

        {/* Right: Compact Language Toggle + Cart / Book Test Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLanguage((prev) => (prev === 'en' ? 'te' : 'en'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>{language === 'en' ? 'తెలుగు' : 'English'}</span>
          </button>

          <button
            type="button"
            onClick={scrollToBookingSection}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {cartSummary.count > 0
                ? `Book Test (${cartSummary.count} • ₹${cartSummary.total})`
                : language === 'te'
                ? 'టెస్ట్ బుక్ చేయండి'
                : 'Book Test'}
            </span>
          </button>
        </div>
      </header>

      {/* MOBILE PORTAL SWITCHER BAR */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-print">
        {[
          { id: 'catalog_booking', label: 'Catalog & Book' },
          { id: 'live_tracker', label: 'Live Tracker & Vault' },
          { id: 'phlebotomist', label: 'Phlebotomist Join' },
          { id: 'admin', label: 'Admin (RP2026)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id as ActivePortalView)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === tab.id
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-6 space-y-8">
        {activeView === 'catalog_booking' && (
          <>
            {/* ABOVE-THE-FOLD COMPACT HERO BANNER (SEARCH IMMEDIATELY BELOW) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      <span>🛡️ NABL Certified Laboratories | 🇮🇳 100% Indian App for Indians</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ✓ ₹0 Home Collection Fee · ₹0 Extra Charges
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {language === 'te'
                      ? 'కేవలం టెస్ట్ చార్జీలు మాత్రమే చెల్లించండి — అదనపు చార్జీలు లేవు! (NABL సర్టిఫైడ్ ల్యాబ్స్)'
                      : 'Pay ONLY Test Charges! ₹0 Extra Fees — All Blood Samples Processed in NABL Certified Labs.'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {language === 'te'
                      ? 'క్రింద మీ బ్లడ్ టెస్ట్ వెతకండి, ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి లేదా తెలుగు వాయిస్ సెర్చ్ ఉపయోగించండి.'
                      : 'Search 28+ blood tests & packages in English or తెలుగు below, use Voice Search, or upload a prescription for AI auto-selection.'}
                  </p>
                </div>

                {/* Compact Value Controls: Premium Toggle, WhatsApp Refer & Theme */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPremium((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                      isPremium
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {isPremium
                        ? '✓ Premium Active (-10% OFF)'
                        : 'Extra 10% OFF (Premium)'}
                    </span>
                  </button>

                  <a
                    href={buildReferralWhatsAppUrl(activeReferralCode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Refer & Earn ₹100</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsDark((prev) => !prev)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    aria-label="Toggle theme"
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </section>

            {/* PORTAL 1A: SEARCH-FIRST 28+ NABL BLOOD TEST CATALOG (IMMEDIATELY BELOW HERO HEADLINE) */}
            <CatalogPortal
              catalog={catalog}
              language={language}
              selectedTestIds={selectedTestIds}
              selectedLab={selectedLab}
              cardLabOverrides={cardLabOverrides}
              isPremium={isPremium}
              onToggleTest={handleToggleTest}
              onChangeCardLab={handleChangeCardLab}
              onApplyPrescriptionMatch={(ids, recLab) => {
                setSelectedTestIds(ids);
                setSelectedLab(recLab);
                scrollToBookingSection();
              }}
              onScrollToBooking={scrollToBookingSection}
            />

            {/* PORTAL 1B: SINGLE-SCREEN BOOKING, LIVE GPS, OFFICIAL PHONEPE QR & WHATSAPP DISPATCH */}
            <SingleScreenBookingForm
              catalog={catalog}
              language={language}
              selectedTestIds={selectedTestIds}
              selectedLab={selectedLab}
              isPremium={isPremium}
              prefilledName={checkedInCustomer?.name || ''}
              prefilledMobile={checkedInCustomer?.mobile || ''}
              onChangeLab={setSelectedLab}
              onToggleTest={(id) => handleToggleTest(id)}
              onBookingCreated={(newBooking) => {
                setBookings((prev) =>
                  prev.some((b) => b.bookingId === newBooking.bookingId)
                    ? prev
                    : [newBooking, ...prev]
                );
                setActiveTrackingBookingId(newBooking.bookingId);
              }}
              onNavigateToTracker={(bookingId) => {
                setActiveTrackingBookingId(bookingId);
                setActiveView('live_tracker');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* TRUST REINFORCEMENT SECTION BELOW CATALOG & BOOKING: SWADESHI DIAGNOSTIC MISSION & 4-GRID FEATURE CARDS */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    <span>🇮🇳 SWADESHI DIAGNOSTIC MISSION · ISO / NABL STANDARD</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                    {language === 'te'
                      ? 'అన్ని శాంపిల్స్ NABL (నేషనల్ అక్రిడిటేషన్ బోర్డ్ ఆఫ్ లాబొరేటరీస్) ల్యాబ్‌లలో పరీక్షించబడతాయి'
                      : 'All Samples Processed in NABL (National Accreditation Board of Laboratories)'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {language === 'te'
                      ? 'భారతీయుల కోసం రూపొందించబడిన 100% భారతీయ యాప్ (Indian-Based App for Indians). ఎలాంటి మధ్యవర్తిత్వ కమీషన్లు లేదా అదనపు హోమ్ కలెక్షన్ చార్జీలు లేవు.'
                      : '100% Indian-Based App Built for Indians. Direct national laboratory testing with barcoded cold-chain vacutainers, DMLT certified home phlebotomists, and MD Pathologist verified reports.'}
                  </p>
                </div>

                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
                  {[
                    {
                      label: 'Laboratory Standard',
                      val: '🛡️ NABL National Board Certified',
                      color: 'text-sky-700 dark:text-sky-400',
                    },
                    {
                      label: 'Platform Identity',
                      val: '🇮🇳 100% Indian App for Indians',
                      color: 'text-sky-700 dark:text-sky-400',
                    },
                    {
                      label: 'Home Sample Collection Fee',
                      val: '₹0 (100% FREE)',
                      color: 'text-emerald-700 dark:text-emerald-400',
                    },
                    {
                      label: 'Convenience & Report Fee',
                      val: '₹0 (Pay ONLY Test Price)',
                      color: 'text-emerald-700 dark:text-emerald-400',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {item.label}
                      </span>
                      <span className={`font-extrabold font-mono ${item.color}`}>
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4-Grid Feature Cards Below Catalog */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="font-extrabold text-sky-700 dark:text-sky-400 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>NABL Certified</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    National Accreditation Board of Laboratories verified testing & barcoded tubes.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="font-extrabold text-sky-700 dark:text-sky-400 text-sm">
                    🇮🇳 100% Indian App
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Built for Indian households with full bilingual English & తెలుగు voice support.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                    ₹0 Extra Fees
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    ₹0 Home Phlebotomy Fee · ₹0 Slot Fee · ₹0 Report Generation Fee.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="font-extrabold text-teal-700 dark:text-teal-400 text-sm flex items-center gap-1.5">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>AES-256 Privacy</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Authenticated AES-256-GCM encryption with PII masking & live GPS tracking.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'live_tracker' && (
          <div className="space-y-6">
            {renderCustomerCheckInCard()}
            <LiveTrackerAndVaultPortal
              bookings={bookings}
              activeBookingId={activeTrackingBookingId}
              language={language}
              onSelectBookingId={setActiveTrackingBookingId}
              onAdvanceStage={(bookingId, stage, etaMinutes) =>
                handleUpdateBooking(bookingId, { trackingStage: stage, etaMinutes })
              }
            />
          </div>
        )}

        {activeView === 'phlebotomist' && (
          <div className="space-y-6">
            {renderCustomerCheckInCard()}
            <PhlebotomistPortal
              phlebotomists={phlebotomists}
              language={language}
              onPhlebotomistRegistered={(newPhleb) =>
                setPhlebotomists((prev) =>
                  prev.some((p) => p.id === newPhleb.id) ? prev : [newPhleb, ...prev]
                )
              }
            />
          </div>
        )}

        {activeView === 'admin' && (
          <AdminBackendPortal
            bookings={bookings}
            phlebotomists={phlebotomists}
            catalog={catalog}
            language={language}
            onUpdateBooking={handleUpdateBooking}
            onAddOrUpdateCatalogTest={(newTest) => {
              setCatalog((prev) => {
                const idx = prev.findIndex((t) => t.id === newTest.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = newTest;
                  return copy;
                }
                return [newTest, ...prev];
              });
            }}
          />
        )}
      </main>

      {/* SLEEK STICKY BOTTOM CART BAR WHEN >= 1 TEST IS SELECTED */}
      {cartSummary.count > 0 && activeView === 'catalog_booking' && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 shadow-lg no-print">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-extrabold font-mono">
                {cartSummary.count} {cartSummary.count === 1 ? 'Test' : 'Tests'} Selected
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm sm:text-base">
                • Total: ₹{cartSummary.total}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                (₹0 Extra Fees · ₹0 Home Collection Fee)
              </span>
              <button
                type="button"
                onClick={() => setSelectedTestIds([])}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>

            <button
              type="button"
              onClick={scrollToBookingSection}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>
                {language === 'te'
                  ? 'బుకింగ్ పూర్తి చేయండి (Proceed to Book)'
                  : 'Proceed to Book'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* COMPACT FLOATING GEMINI AI MEDICAL ADVISOR BUTTON & DRAWER */}
      <GeminiMedicalAdvisor
        catalog={catalog}
        language={language}
        isOpen={isAiAdvisorOpen}
        onToggleOpen={() => setIsAiAdvisorOpen((prev) => !prev)}
        onSelectTestFromAi={(testId) => {
          if (!selectedTestIds.includes(testId)) {
            setSelectedTestIds((prev) => [...prev, testId]);
          }
          scrollToBookingSection();
        }}
      />

      {/* CLEAN CLINICAL FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-6 mt-8 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-extrabold text-red-600 dark:text-red-500">
              Rakthapariksha.com (రక్త పరీక్ష.కామ్)
            </span>{' '}
            ·{' '}
            <strong className="text-sky-700 dark:text-sky-400">
              🛡️ All Samples Processed in NABL Certified Laboratories — 🇮🇳 100% Indian-Based App for Indians
            </strong>{' '}
            · Pay ONLY Test Charges! ₹0 Extra Fees.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`https://wa.me/91${ADMIN_DISPLAY_MOBILE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>WhatsApp Support: +91 {ADMIN_DISPLAY_MOBILE}</span>
            </a>
            <span className="font-mono">UPI: 8333821121@ybl</span>
            <span className="text-sky-700 dark:text-sky-400 font-semibold">
              AES-256-GCM Encrypted
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
