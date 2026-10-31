import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  FlaskConical,
  Mic,
  MicOff,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Utensils,
  X,
} from 'lucide-react';
import {
  DIAGNOSTIC_CATEGORIES,
  DiagnosticCategory,
  DiagnosticTest,
  LabPartner,
  RxParseResult,
} from '../types/diagnostic';
import {
  getLowestLabForTest,
  SAMPLE_PRESCRIPTION_SCENARIOS,
} from '../data/catalogData';

interface CatalogPortalProps {
  catalog: DiagnosticTest[];
  language: 'en' | 'te';
  selectedTestIds: string[];
  selectedLab: LabPartner;
  cardLabOverrides: Record<string, LabPartner>;
  isPremium: boolean;
  onToggleTest: (testId: string, preferredLab?: LabPartner) => void;
  onChangeCardLab: (testId: string, lab: LabPartner) => void;
  onApplyPrescriptionMatch: (testIds: string[], recommendedLab: LabPartner) => void;
  onScrollToBooking: () => void;
}

export const CatalogPortal: React.FC<CatalogPortalProps> = ({
  catalog,
  language,
  selectedTestIds,
  isPremium,
  onToggleTest,
  onApplyPrescriptionMatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DiagnosticCategory>('All');
  const [sortBy, setSortBy] = useState<'savings' | 'price_asc' | 'params_desc'>('savings');
  const [expandedParamsIds, setExpandedParamsIds] = useState<Record<string, boolean>>({});
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string | null>(null);

  // Smart Prescription AI Scanner Modal State
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxInputText, setRxInputText] = useState('');
  const [rxImagePreview, setRxImagePreview] = useState<string | null>(null);
  const [rxImageBase64, setRxImageBase64] = useState<string | null>(null);
  const [rxMimeType, setRxMimeType] = useState<string>('image/jpeg');
  const [isParsingRx, setIsParsingRx] = useState(false);
  const [rxParseResult, setRxParseResult] = useState<RxParseResult | null>(null);
  const [rxError, setRxError] = useState<string | null>(null);

  const handleStartVoiceSearch = (voiceLang: 'en-IN' | 'te-IN') => {
    const SpeechRecognitionApi =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setVoiceStatusMessage(
        language === 'te'
          ? 'వాయిస్ సెర్చ్ అందుబాటులో లేదు — క్రింది త్వరిత వాయిస్ చిప్స్ ఎంచుకోండి.'
          : 'Browser speech API unavailable in this frame — tap a quick search chip below.'
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognitionApi as any)();
      recognition.lang = voiceLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListeningVoice(true);
      setVoiceStatusMessage(
        voiceLang === 'te-IN'
          ? 'తెలుగులో మాట్లాడండి... (ఉదా: "థైరాయిడ్", "షుగర్", "జ్వరం", "విటమిన్ డి")'
          : 'Listening in English... Speak a test or symptom (e.g. "Thyroid", "HbA1c", "Vitamin D")'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setSearchQuery(transcript);
        setIsListeningVoice(false);
        setVoiceStatusMessage(`Heard: "${transcript}"`);
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
        setVoiceStatusMessage(
          'Microphone permission blocked in preview — use a quick search chip below.'
        );
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleRxFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRxMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setRxImagePreview(dataUrl);
      const base64Part = dataUrl.split(',')[1] || '';
      setRxImageBase64(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePrescription = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : rxInputText;
    if (!textToSend.trim() && !rxImageBase64) {
      setRxError('Please upload a prescription image or select/enter doctor notes.');
      return;
    }

    setIsParsingRx(true);
    setRxError(null);
    try {
      const response = await fetch('/api/gemini/parse-rx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: rxImageBase64,
          mimeType: rxMimeType,
          rxText: textToSend,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse prescription');
      }
      setRxParseResult(data);
    } catch (err) {
      setRxError(
        err instanceof Error ? err.message : 'Unable to analyze prescription right now.'
      );
    } finally {
      setIsParsingRx(false);
    }
  };

  const filteredAndSortedTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = catalog.filter((test) => {
      const matchesCat = activeCategory === 'All' || test.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;

      const inNameEn = test.nameEn.toLowerCase().includes(q);
      const inNameTe = test.nameTe.toLowerCase().includes(q);
      const inCode = test.code.toLowerCase().includes(q);
      const inParams = test.parametersIncluded.some((p) => p.toLowerCase().includes(q));
      return inNameEn || inNameTe || inCode || inParams;
    });

    return [...filtered].sort((a, b) => {
      const bestA = getLowestLabForTest(a);
      const bestB = getLowestLabForTest(b);
      if (sortBy === 'savings') {
        return bestB.savingsPercent - bestA.savingsPercent;
      }
      if (sortBy === 'price_asc') {
        return bestA.price - bestB.price;
      }
      return b.parameterCount - a.parameterCount;
    });
  }, [catalog, searchQuery, activeCategory, sortBy]);

  return (
    <section id="catalog-section" className="space-y-5">
      {/* ABOVE-THE-FOLD SEARCH FIRST BAR (Immediately Below Hero Headline) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'te'
                  ? '28+ NABL రక్త పరీక్షలను వెతకండి (ఉదా: CBC, HbA1c, Thyroid, Vitamin D, జ్వరం)...'
                  : 'Search 28+ NABL blood tests, parameters, or symptoms (e.g., CBC, HbA1c, Thyroid, Vitamin D, Fever)...'
              }
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bilingual Voice Search + AI Prescription Scanner Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleStartVoiceSearch('en-IN')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isListeningVoice
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isListeningVoice ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-sky-600" />
              )}
              <span>Voice Search (EN)</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartVoiceSearch('te-IN')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-teal-600" />
              <span>తెలుగు వాయిస్ సెర్చ్</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRxModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {language === 'te'
                  ? 'ప్రిస్క్రిప్షన్ అప్‌లోడ్ (AI Auto-Select)'
                  : 'Upload Prescription (AI Auto-Select)'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Bilingual Search Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {language === 'te' ? 'త్వరిత సెర్చ్:' : 'Quick Bilingual Search:'}
            </span>
            {[
              { label: 'Full Body / ఆరోగ్యం', query: 'Aarogyam' },
              { label: 'Thyroid / థైరాయిడ్', query: 'Thyroid' },
              { label: 'Sugar / HbA1c', query: 'HbA1c' },
              { label: 'Vitamin D & B12', query: 'Vitamin' },
              { label: 'Fever / జ్వరం', query: 'Fever' },
              { label: 'PCOD / హార్మోన్', query: 'PCOD' },
            ].map((chip) => (
              <button
                key={chip.query}
                type="button"
                onClick={() => setSearchQuery(chip.query)}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {voiceStatusMessage && (
            <span className="text-sky-700 dark:text-sky-400 font-medium">
              {voiceStatusMessage}
            </span>
          )}
        </div>

        {/* Category Filter Tabs (Crimson Red #DC2626 for active tab indicator) & Sort Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {DIAGNOSTIC_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'te' ? cat.labelTe : cat.labelEn}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Sort by:
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {[
                { id: 'savings', label: 'Highest % Savings' },
                { id: 'price_asc', label: 'Lowest Price ₹' },
                { id: 'params_desc', label: 'Most Parameters' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id as 'savings' | 'price_asc' | 'params_desc')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sortBy === opt.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calm Clinical Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Showing <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{filteredAndSortedTests.length}</strong> NABL Certified Tests & Packages
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Pay ONLY Test Charges (₹0 Home Collection Fee)
          </span>
        </div>
      </div>

      {/* COMPACT & SCANNABLE 2-COLUMN TEST CATALOG GRID */}
      {filteredAndSortedTests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No blood tests matched "{searchQuery}"
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try searching for CBC, HbA1c, Thyroid, Vitamin D, Lipid, or reset filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('All');
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Reset Catalog Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedTests.map((test) => {
            const lowestInfo = getLowestLabForTest(test);
            const basePrice = lowestInfo.price;
            const effectivePrice = isPremium ? Math.round(basePrice * 0.9) : basePrice;
            const savedAmount = Math.max(0, test.mrp - effectivePrice);
            const savedPercent = Math.round((savedAmount / test.mrp) * 100);
            const isSelected = selectedTestIds.includes(test.id);
            const isExpanded = Boolean(expandedParamsIds[test.id]);

            return (
              <article
                key={test.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-colors ${
                  isSelected
                    ? 'border-emerald-600 dark:border-emerald-500 ring-1 ring-emerald-600/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Row: Sleek Single-Line Medical Blue/Teal NABL Badge + Emerald Discount Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 text-[11px] font-semibold">
                      <span>🛡️ NABL Certified | 🇮🇳 100% Indian App</span>
                    </span>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] font-bold font-mono tabular-nums">
                      Save {savedPercent}% (₹{savedAmount} OFF)
                    </span>
                  </div>

                  {/* Primary Title (English + Telugu) */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {language === 'te' ? test.nameTe : test.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'te' ? test.nameEn : test.nameTe}
                  </p>

                  {/* Clean Clinical Details (Parameters, Fasting, Turnaround Time, Vacutainer Tube) */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400 font-mono tabular-nums">
                      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {test.parameterCount} {test.parameterCount === 1 ? 'Param' : 'Params'}
                      </span>
                    </span>

                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>

                    <span
                      className={`inline-flex items-center gap-1 ${
                        test.fastingRequired
                          ? 'font-medium text-amber-700 dark:text-amber-400'
                          : 'text-teal-700 dark:text-teal-400 font-medium'
                      }`}
                    >
                      <Utensils className="w-3 h-3 shrink-0" />
                      <span>
                        {language === 'te' ? test.fastingTextTe : test.fastingTextEn}
                      </span>
                    </span>

                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>

                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>
                        {language === 'te' ? test.tatTextTe : test.tatTextEn}
                      </span>
                    </span>
                  </div>

                  {/* Tube Specification & Expandable Parameters */}
                  <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                    <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                      Vacutainer Tube: <span className="font-mono">{test.sampleTube}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Includes:{' '}
                      </span>
                      {isExpanded
                        ? test.parametersIncluded.join(' · ')
                        : test.parametersIncluded.slice(0, 3).join(' · ')}
                      {test.parametersIncluded.length > 3 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedParamsIds((prev) => ({
                              ...prev,
                              [test.id]: !prev[test.id],
                            }))
                          }
                          className="ml-1.5 inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <span>Show less</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>+{test.parametersIncluded.length - 3} more</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & "+ Select Test" -> Green "✓ Added" CTA Row */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                        ₹{effectivePrice}
                      </span>
                      <span className="text-xs text-slate-400 line-through font-mono tabular-nums">
                        MRP ₹{test.mrp}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹0 Home Collection Fee · Pay ONLY Test Price
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleTest(test.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{language === 'te' ? '✓ చేర్చబడింది' : '✓ Added'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{language === 'te' ? '+ టెస్ట్ ఎంచుకోండి' : '+ Select Test'}</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* AI Prescription Image & Doctor Note Scanner Modal */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-600" />
                  <span>
                    {language === 'te'
                      ? 'AI డాక్టర్ ప్రిస్క్రిప్షన్ స్కానర్ (Gemini AI)'
                      : 'Smart Prescription Scanner & NABL Test Matcher'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Upload a photo of a handwritten/printed prescription or try a clinical sample below to auto-select NABL certified tests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRxModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Image Input */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Upload Prescription Photo (JPG / PNG)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-200">
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>Choose Prescription Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRxFileUpload}
                    className="hidden"
                  />
                </label>
                {rxImagePreview && (
                  <div className="flex items-center gap-2">
                    <img
                      src={rxImagePreview}
                      alt="Uploaded prescription preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Prescription image attached
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Instant Clinical Sample Prescriptions */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                2. Or Test Immediately with a Sample Doctor Prescription:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {SAMPLE_PRESCRIPTION_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setRxInputText(sc.rxText);
                      handleAnalyzePrescription(sc.rxText);
                    }}
                    className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-sky-600 dark:hover:border-sky-500 bg-slate-50 dark:bg-slate-800/50 transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>{language === 'te' ? sc.titleTe : sc.titleEn}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      {sc.rxText}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Notes Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Prescription Text / Symptoms (Editable):
              </label>
              <textarea
                rows={3}
                value={rxInputText}
                onChange={(e) => setRxInputText(e.target.value)}
                placeholder="Paste doctor's advised investigations (e.g., Adv: CBC, HbA1c, Lipid Profile, TSH, Vitamin D)..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleAnalyzePrescription()}
                disabled={isParsingRx}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
              >
                {isParsingRx ? 'Analyzing Prescription via Gemini AI...' : 'Scan & Match NABL Blood Tests'}
              </button>
            </div>

            {rxError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {rxError}
              </div>
            )}

            {rxParseResult && (
              <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
                    ✓ Gemini AI Matched {rxParseResult.matchedTestIds.length} NABL Diagnostic Tests
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    🛡️ NABL Certified
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  {language === 'te'
                    ? rxParseResult.clinicalSummaryTe
                    : rxParseResult.clinicalSummaryEn}
                </p>
                <div className="space-y-1.5">
                  {rxParseResult.matchedTestIds.map((id) => {
                    const t = catalog.find((item) => item.id === id);
                    if (!t) return null;
                    const price = getLowestLabForTest(t).price;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {t.nameEn}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ₹{price} (MRP ₹{t.mrp})
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onApplyPrescriptionMatch(
                      rxParseResult.matchedTestIds,
                      rxParseResult.recommendedLab
                    );
                    setShowRxModal(false);
                  }}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Apply All {rxParseResult.matchedTestIds.length} Matched Tests & Proceed to Booking →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
