import React, { useState } from 'react';
import {
  Award,
  Bike,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import {
  ADMIN_DISPLAY_MOBILE,
  ADMIN_WHATSAPP_NUMBER,
  MORNING_TIME_SLOTS,
} from '../data/catalogData';
import { PhlebotomistPartner } from '../types/diagnostic';

interface PhlebotomistPortalProps {
  phlebotomists: PhlebotomistPartner[];
  language: 'en' | 'te';
  onPhlebotomistRegistered: (phleb: PhlebotomistPartner) => void;
}

export const PhlebotomistPortal: React.FC<PhlebotomistPortalProps> = ({
  phlebotomists,
  language,
  onPhlebotomistRegistered,
}) => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [qualification, setQualification] = useState<
    'DMLT' | 'B.Sc MLT' | 'Paramedical Board Certified'
  >('DMLT');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('4');
  const [previousOrganization, setPreviousOrganization] = useState(
    'Ex-Thyrocare / Apollo Diagnostics'
  );
  const [hasTwoWheeler, setHasTwoWheeler] = useState(true);
  const [serviceablePincodes, setServiceablePincodes] = useState(
    '500072, 500081, 500032'
  );
  const [selectedSlots, setSelectedSlots] = useState<string[]>([
    '06:00 AM - 07:00 AM (Priority Early Fasting)',
    '07:00 AM - 08:00 AM (Peak Fasting Slot)',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] =
    useState<PhlebotomistPartner | null>(null);

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!fullName.trim()) {
      setErrorMsg('Please enter your Full Name.');
      return;
    }
    if (cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/phlebotomists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          mobileNumber: cleanMobile,
          qualification,
          registrationNumber: registrationNumber.trim(),
          experienceYears: Number(experienceYears) || 3,
          previousOrganization: previousOrganization.trim(),
          hasTwoWheeler,
          serviceablePincodes: serviceablePincodes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          availableSlots: selectedSlots,
        }),
      });
      const created: PhlebotomistPartner = await res.json();
      if (!res.ok) throw new Error('Registration failed');

      setRegisteredSuccess(created);
      onPhlebotomistRegistered(created);
      setFullName('');
      setMobileNumber('');
      setRegistrationNumber('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to submit registration.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Columns: Registration Form (No Email Field Required) */}
      <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            CERTIFIED PHLEBOTOMIST PARTNER ONBOARDING PORTAL
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {language === 'te'
              ? 'సర్టిఫైడ్ ఫ్లెబోటమిస్ట్ రిజిస్ట్రేషన్ (DMLT / B.Sc MLT)'
              : 'Join as Certified Phlebotomist (ఫ్లెబోటమిస్ట్ రిజిస్ట్రేషన్)'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Direct instant onboarding into the Admin Dispatch Pool. No Email ID required. Earn per-collection payouts with morning slot flexibility.
          </p>
        </div>

        {registeredSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Onboarded into Live Admin Assignment Pool! Partner ID:{' '}
                {registeredSuccess.id}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {registeredSuccess.fullName} ({registeredSuccess.qualification}) is now available for live order assignment in the Admin Dashboard.
            </p>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `👨‍⚕️ *NEW PHLEBOTOMIST REGISTERED ON RAKTHAPARIKSHA.COM*\nName: ${registeredSuccess.fullName}\nMobile: +91 ${registeredSuccess.mobileNumber}\nQualification: ${registeredSuccess.qualification} (${registeredSuccess.registrationNumber})\nExperience: ${registeredSuccess.experienceYears} Yrs (${registeredSuccess.previousOrganization})\nPincodes: ${registeredSuccess.serviceablePincodes.join(', ')}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <span>Send Onboarding Confirmation to Admin WhatsApp (+91 {ADMIN_DISPLAY_MOBILE})</span>
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'పూర్తి పేరు (Full Name) *' : 'Technician Full Name *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Venkat Rao P."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'te' ? 'మొబైల్ నంబర్ (10-Digit Mobile) *' : '10-Digit Mobile Number *'}
              </label>
              <input
                type="tel"
                maxLength={10}
                required
                value={mobileNumber}
                onChange={(e) =>
                  setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="98480XXXXX"
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Qualification *
              </label>
              <select
                value={qualification}
                onChange={(e) =>
                  setQualification(
                    e.target.value as
                      | 'DMLT'
                      | 'B.Sc MLT'
                      | 'Paramedical Board Certified'
                  )
                }
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="DMLT">DMLT (Diploma in Medical Lab Tech)</option>
                <option value="B.Sc MLT">B.Sc MLT (Medical Lab Technology)</option>
                <option value="Paramedical Board Certified">
                  Paramedical Board Reg. Technician
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paramedical Board Reg. No.
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. TSPMB-2022-5510"
                className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Previous Diagnostic Lab Experience (e.g., Ex-Thyrocare, Apollo, Tenet, Tata 1mg)
              </label>
              <input
                type="text"
                value={previousOrganization}
                onChange={(e) => setPreviousOrganization(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Two-Wheeler Available?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHasTwoWheeler(true)}
                  className={`py-2 text-xs font-bold rounded-lg border ${
                    hasTwoWheeler
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Yes (Bike/Scooter)
                </button>
                <button
                  type="button"
                  onClick={() => setHasTwoWheeler(false)}
                  className={`py-2 text-xs font-bold rounded-lg border ${
                    !hasTwoWheeler
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Serviceable Areas / Pincodes (Comma Separated)
            </label>
            <input
              type="text"
              value={serviceablePincodes}
              onChange={(e) => setServiceablePincodes(e.target.value)}
              placeholder="500072, 500081, 500032, 520010..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Available Morning / Evening Sample Collection Slots:
            </label>
            <div className="flex flex-wrap gap-2">
              {MORNING_TIME_SLOTS.map((slot) => {
                const active = selectedSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {slot.split('(')[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Registering Phlebotomist...'
                : 'Complete Phlebotomist Registration & Join Live Dispatch Pool'}
            </span>
          </button>
        </form>
      </section>

      {/* Right 5 Columns: Active Verified Phlebotomist Pool */}
      <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            VERIFIED COLLECTION NETWORK ({phlebotomists.length} ACTIVE PARTNERS)
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
            Active Certified Phlebotomists
          </h3>
        </div>

        <div className="space-y-3">
          {phlebotomists.map((tech) => (
            <div
              key={tech.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{tech.fullName}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </h4>
                  <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold">
                    {tech.qualification} · Reg: {tech.registrationNumber}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  {tech.experienceYears} Yrs Exp
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{tech.previousOrganization}</span>
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-700">
                <span className="inline-flex items-center gap-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pincodes: {tech.serviceablePincodes.join(', ')}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tech.hasTwoWheeler ? '2-Wheeler Ready' : 'Transit'}</span>
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  +91 {tech.mobileNumber}
                </span>
                <a
                  href={`https://wa.me/91${tech.mobileNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  <Phone className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
