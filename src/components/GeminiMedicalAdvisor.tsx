import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ChatMessage, DiagnosticTest } from '../types/diagnostic';
import { getLowestLabForTest } from '../data/catalogData';

interface GeminiMedicalAdvisorProps {
  catalog: DiagnosticTest[];
  language: 'en' | 'te';
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectTestFromAi: (testId: string) => void;
}

const SAMPLE_PROMPTS = [
  {
    labelEn: 'నాకు నీరసంగా ఉంది, ఏ బ్లడ్ టెస్ట్ చేయించుకోవాలి?',
    labelTe: 'నాకు నీరసంగా ఉంది, ఏ బ్లడ్ టెస్ట్ చేయించుకోవాలి?',
    query:
      'నాకు చాలా నీరసంగా, అలసటగా మరియు జుట్టు రాలే సమస్య ఉంది. ఏ NABL బ్లడ్ టెస్ట్ చేయించుకోవాలి?',
  },
  {
    labelEn: 'Thyroid & Vitamin D NABL Test Price?',
    labelTe: 'థైరాయిడ్ & విటమిన్ D NABL ధర ఎంత?',
    query:
      'What is the NABL certified price for Thyroid Profile and Vitamin D + B12 combo on Rakthapariksha.com?',
  },
  {
    labelEn: 'Fasting rules for Lipid & HbA1c?',
    labelTe: 'లిపిడ్ & షుగర్ పరీక్షకు ఉపవాసం నియమాలు?',
    query:
      'What are the exact fasting hours and sample vacutainer tube requirements for Complete Lipid Profile and HbA1c?',
  },
  {
    labelEn: 'Full Body Checkup (88 Params) Details',
    labelTe: 'ఆరోగ్యం ఫుల్ బాడీ ప్యాకేజీ (88 పారామీటర్లు)',
    query:
      'Explain the 88 parameters included in the Full Body Master Checkup processed in NABL certified laboratories with ₹0 home collection fee.',
  },
];

export const GeminiMedicalAdvisor: React.FC<GeminiMedicalAdvisorProps> = ({
  catalog,
  language,
  isOpen,
  onToggleOpen,
  onSelectTestFromAi,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        language === 'te'
          ? '🇮🇳 నమస్కారం! నేను Rakthapariksha.com AI హెల్త్ అడ్వైజర్‌ని. మాది భారతీయుల కోసం రూపొందించబడిన 100% భారతీయ యాప్. అన్ని రక్త నమూనాలు NABL (National Accreditation Board of Laboratories) సర్టిఫైడ్ ల్యాబ్‌లలో మాత్రమే పరీక్షించబడతాయి. (₹0 హోమ్ కలెక్షన్ ఫీజు!)'
          : '🇮🇳 Namaskaram! I am the Rakthapariksha.com Bilingual AI Medical Advisor. Proudly a 100% Indian-Based App for Indians — all blood samples are processed in NABL (National Accreditation Board of Laboratories) certified facilities with ₹0 Extra Charges!',
      timestamp: 'Just now',
      suggestedTestIds: ['pkg-aarogyam-c', 'test-thyroid-total', 'test-vit-combo'],
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendQuery = async (customQuery?: string) => {
    const text = (customQuery !== undefined ? customQuery : inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customQuery === undefined) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language,
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply ||
          data.error ||
          'Please check our 28+ NABL certified tests in the catalog with ₹0 extra fees.',
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        suggestedTestIds: data.suggestedTestIds || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'Unable to reach Gemini AI right now. You can still browse all 28+ NABL blood tests and book directly with ₹0 extra fees.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label="Open AI Health Advisor (EN / తెలుగు)"
        title="Ask AI Health Advisor (EN / తెలుగు)"
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 px-3 py-2.5 rounded-full bg-sky-700 hover:bg-sky-800 text-white shadow-lg border border-sky-500/40 transition-transform hover:scale-105 cursor-pointer no-print"
      >
        <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </span>
        <span className="px-2 py-0.5 rounded-full bg-sky-900/90 text-[11px] font-extrabold tracking-tight text-sky-100 whitespace-nowrap">
          AI / తెలుగు
        </span>
      </button>
    );
  }

  return (
    <aside className="fixed bottom-20 right-4 z-50 w-[92vw] sm:w-[400px] max-h-[78vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden no-print">
      {/* Header in Trustworthy Medical Blue/Teal */}
      <div className="p-3.5 bg-sky-700 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-900/80 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold tracking-tight flex items-center gap-1">
              <span>Rakthapariksha NABL AI Advisor</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </h3>
            <p className="text-[11px] text-sky-100">
              🛡️ NABL Certified Guidance · EN / తెలుగు
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-1.5 rounded-lg text-sky-100 hover:text-white hover:bg-sky-800 transition-colors cursor-pointer"
          aria-label="Close AI Advisor"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Bilingual Prompt Starters */}
      <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        {SAMPLE_PROMPTS.map((sp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendQuery(sp.query)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-sky-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'te' ? sp.labelTe : sp.labelEn}
          </button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[380px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-sky-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {msg.content}
            </div>

            {/* 1-Click Add Suggested Tests from AI Response */}
            {msg.suggestedTestIds && msg.suggestedTestIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                {msg.suggestedTestIds.map((tid) => {
                  const t = catalog.find((item) => item.id === tid);
                  if (!t) return null;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => onSelectTestFromAi(tid)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>
                        + Select {t.nameEn.split('(')[0].trim()} (₹
                        {getLowestLabForTest(t).price})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="text-xs text-sky-700 dark:text-sky-400 font-medium">
            Gemini AI Advisor is preparing NABL clinical guidance...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={
            language === 'te'
              ? 'తెలుగు లేదా ఇంగ్లీష్‌లో అడగండి...'
              : 'Ask in English or తెలుగు about any blood test...'
          }
          className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </aside>
  );
};
