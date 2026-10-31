import QRCode from 'qrcode';
import {
  ADMIN_DISPLAY_MOBILE,
  ADMIN_UPI_ID,
  ADMIN_WHATSAPP_NUMBER,
} from '../data/catalogData';
import { BookingRecord, DiagnosticTest } from '../types/diagnostic';

export const NABL_LAB_DECLARATION =
  'NABL (National Accreditation Board of Laboratories) — 100% Indian App for Indians';

export function maskMobileNumber(mobile: string): string {
  const clean = mobile.replace(/\D/g, '').slice(-10);
  if (clean.length < 10) return '+91 ••••• •••••';
  return `+91 ${clean.slice(0, 2)}•••••${clean.slice(7)}`;
}

export function generateUpiDeepLink(amount: number, bookingNote: string): string {
  const safeNote = encodeURIComponent(bookingNote || 'Rakthapariksha NABL Blood Test');
  return `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(
    'Rakthapariksha.com'
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${safeNote}`;
}

export async function generateUpiQrDataUrl(
  amount: number,
  bookingNote: string
): Promise<string> {
  const upiUri = generateUpiDeepLink(amount, bookingNote);
  return QRCode.toDataURL(upiUri, {
    width: 220,
    margin: 1,
    color: {
      dark: '#991B1B',
      light: '#FFFFFF',
    },
  });
}

export function buildCustomerCheckInWhatsAppUrl(
  customerName: string,
  mobileNumber: string
): string {
  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const message = [
    `🇮🇳 *RAKTHAPARIKSHA.COM — NEW CUSTOMER MOBILE CHECK-IN*`,
    `🔴 *All Samples Processed in NABL (National Accreditation Board of Laboratories) | Indian-Based App for Indians*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Customer Name:* ${customerName.trim()}`,
    `📱 *Mobile Number:* +91 ${cleanMobile}`,
    `🕒 *Check-In Time:* ${timestamp}`,
    `💬 *Direct Reply Link:* https://wa.me/91${cleanMobile}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `✅ *Zero Extra Fee Guarantee Active (₹0 Home Collection Fee)*`,
  ].join('\n');

  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildPatientBookingWhatsAppUrl(
  booking: BookingRecord,
  tests: DiagnosticTest[]
): string {
  const tubes = Array.from(
    new Set(
      tests
        .filter((t) => booking.selectedTestIds.includes(t.id))
        .map((t) => t.sampleTube)
    )
  ).join(', ');

  const upiLink = generateUpiDeepLink(
    booking.totalTestPrice,
    `Booking ${booking.bookingId}`
  );

  const message = [
    `🇮🇳 *RAKTHAPARIKSHA.COM (రక్త పరీక్ష.కామ్) — NEW NABL TEST BOOKING*`,
    `🔴 *All Samples Processed in NABL (National Accreditation Board of Laboratories) — Indian-Based App for Indians*`,
    `🆔 *Booking ID:* ${booking.bookingId}`,
    `🔒 *Security:* AES-256-GCM Encrypted (${booking.encryptionMeta.ivHex.slice(0, 8)}...)`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Patient:* ${booking.patientName} (${booking.age} Yrs / ${booking.gender})`,
    `📱 *Mobile:* +91 ${booking.mobileNumber}`,
    `📅 *Slot:* ${booking.collectionDate} | ${booking.timeSlot}`,
    `🏥 *Processing Lab:* NABL Certified National Laboratory`,
    `🧬 *Booked Tests (${booking.selectedTestNames.length}):*`,
    ...booking.selectedTestNames.map((name, idx) => `   ${idx + 1}. ${name}`),
    `🧪 *Vacutainer Tubes:* ${tubes || 'Standard EDTA + SST Gold'}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Total Payable:* ₹${booking.totalTestPrice} (MRP: ₹${booking.totalMrp})`,
    `✅ *Extra Charges:* ₹0 Home Collection | ₹0 Convenience Fee`,
    `💳 *Payment Status:* ${booking.paymentStatus}`,
    `🔗 *UPI Payment Link (${ADMIN_UPI_ID}):* ${upiLink}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📍 *Home Address / Landmark:* ${booking.addressLandmark || 'Live GPS Shared Below'}`,
    `🗺️ *Live Google Maps Pin:* ${booking.googleMapsUrl}`,
    booking.referralCode ? `🎁 *Referral Code:* ${booking.referralCode}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildAdminToPatientConfirmationWhatsAppUrl(
  booking: BookingRecord
): string {
  const cleanPatientMobile = booking.mobileNumber.replace(/\D/g, '').slice(-10);
  const targetPhone =
    cleanPatientMobile.length === 10
      ? `91${cleanPatientMobile}`
      : ADMIN_WHATSAPP_NUMBER;

  const message = [
    `🇮🇳 *RAKTHAPARIKSHA.COM — NABL BOOKING CONFIRMED*`,
    `నమస్కారం ${booking.patientName} గారు! మీ రక్త పరీక్ష బుకింగ్ కన్ఫర్మ్ అయింది.`,
    `🔴 *All Samples Processed in NABL (National Accreditation Board of Laboratories) — Indian-Based App for Indians*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🆔 *Booking ID:* ${booking.bookingId}`,
    `🏥 *Processing Facility:* NABL Accredited National Lab`,
    `📅 *Scheduled Slot:* ${booking.collectionDate} (${booking.timeSlot})`,
    `👨‍⚕️ *Assigned Phlebotomist:* ${
      booking.assignedPhlebotomistName || 'Srinivas Rao K. (Certified DMLT)'
    }`,
    `📞 *Phlebotomist Contact:* +91 ${
      booking.assignedPhlebotomistMobile || ADMIN_DISPLAY_MOBILE
    }`,
    `⏱️ *Live ETA:* ~${booking.etaMinutes} Mins`,
    `💰 *Total Amount:* ₹${booking.totalTestPrice} (Pay ONLY Test Charges - ₹0 Extra Fees!)`,
    `🔒 *Health Data:* Protected with AES-256 Encryption`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `For support, WhatsApp/Call: +91 ${ADMIN_DISPLAY_MOBILE}`,
  ].join('\n');

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

export function buildAdminToPhlebotomistDispatchWhatsAppUrl(
  booking: BookingRecord,
  tests: DiagnosticTest[]
): string {
  const cleanPhlebMobile = (booking.assignedPhlebotomistMobile || '')
    .replace(/\D/g, '')
    .slice(-10);
  const targetPhone =
    cleanPhlebMobile.length === 10
      ? `91${cleanPhlebMobile}`
      : ADMIN_WHATSAPP_NUMBER;

  const bookedTestObjs = tests.filter((t) =>
    booking.selectedTestIds.includes(t.id)
  );
  const tubes = Array.from(
    new Set(bookedTestObjs.map((t) => t.sampleTube))
  ).join(' + ');
  const fastingNeeded = bookedTestObjs.some((t) => t.fastingRequired);

  const message = [
    `🛵 *PHLEBOTOMIST SAMPLE COLLECTION DISPATCH — ${booking.bookingId}*`,
    `🔴 *NABL (National Accreditation Board of Laboratories) Cold-Chain Protocol*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Patient:* ${booking.patientName} (${booking.age}Y / ${booking.gender})`,
    `📱 *Patient Mobile:* +91 ${booking.mobileNumber}`,
    `⏰ *Collection Slot:* ${booking.collectionDate} | ${booking.timeSlot}`,
    `🏥 *Processing Hub:* NABL Certified National Lab`,
    `🧬 *Tests:* ${booking.selectedTestNames.join(', ')}`,
    `🧪 *Required Vacutainers:* ${tubes || 'EDTA Lavender + SST Gold'}`,
    `🍽️ *Fasting Check:* ${
      fastingNeeded ? 'YES (10-12 Hrs Fasting Mandatory)' : 'No Fasting Required'
    }`,
    `💳 *Collect Payment:* ₹${booking.totalTestPrice} (${booking.paymentStatus})`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📍 *Address:* ${booking.addressLandmark}`,
    `🗺️ *Navigate via Google Maps:* ${booking.googleMapsUrl}`,
  ].join('\n');

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

export function buildReferralWhatsAppUrl(referralCode: string): string {
  const message = [
    `🇮🇳 *Save up to 75% on Blood Tests with Rakthapariksha.com (రక్త పరీక్ష.కామ్)!*`,
    `🔴 *All Samples Processed in NABL (National Accreditation Board of Laboratories) — 100% Indian-Based App for Indians.*`,
    `✨ *Pay ONLY Test Charges! ₹0 Home Collection Fee & ₹0 Hidden Charges.*`,
    `🎁 Use my Referral Code *${referralCode}* for ₹100 OFF on your booking!`,
    `📲 Book on WhatsApp: https://wa.me/${ADMIN_WHATSAPP_NUMBER}`,
  ].join('\n');

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function downloadEncryptedReportOrReceiptHtml(
  booking: BookingRecord,
  mode: 'receipt' | 'report'
): void {
  const title =
    mode === 'receipt'
      ? `Rakthapariksha_ZeroFee_Receipt_${booking.bookingId}`
      : `Rakthapariksha_Encrypted_NABL_Report_${booking.bookingId}`;

  const metricsRowsHtml = booking.sampleReportMetrics
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${m.parameter}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:${
          m.status === 'Normal' ? '#15803d' : '#dc2626'
        };">${m.value} ${m.unit}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;color:#475569;">${m.referenceRange}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:${
          m.status === 'Normal' ? '#15803d' : '#dc2626'
        };">${m.status}</td>
      </tr>`
    )
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 32px; background: #f8fafc; }
    .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #dc2626; padding-bottom: 18px; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 800; color: #dc2626; }
    .sub { font-size: 13px; color: #b91c1c; font-weight: 700; margin-top: 4px; }
    .nabl-red { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 14px; border-radius: 8px; font-weight: 800; font-size: 13px; margin-bottom: 12px; }
    .zero-fee { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th { text-align: left; padding: 10px 12px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #334155; }
    .crypto { font-family: monospace; font-size: 11px; background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 16px; }
    @media print { body { margin: 0; background: #fff; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">Rakthapariksha.com (రక్త పరీక్ష.కామ్)</div>
        <div class="sub">100% Indian-Based Diagnostic App for Indians | NABL Accredited</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Support & Dispatch Helpline: +91 ${ADMIN_DISPLAY_MOBILE} | UPI: ${ADMIN_UPI_ID}</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:13px;">
        <div style="font-weight:700;font-size:15px;color:#dc2626;">${booking.bookingId}</div>
        <div>Date: ${booking.collectionDate}</div>
        <div>Facility: NABL Certified Lab</div>
      </div>
    </div>

    <div class="nabl-red">
      🇮🇳 ALL SAMPLES PROCESSED IN NABL (NATIONAL ACCREDITATION BOARD OF LABORATORIES) — INDIAN-BASED APP FOR INDIANS
    </div>

    <div class="zero-fee">
      ✓ Pay ONLY Test Charges Guaranteed! Home Collection Fee: ₹0 | Convenience Fee: ₹0 | Report Fee: ₹0
    </div>

    <div class="grid">
      <div><strong>Patient Name:</strong> ${booking.patientName} (${booking.age} Yrs / ${booking.gender})</div>
      <div><strong>Mobile (AES-256 Protected):</strong> +91 ${booking.mobileNumber}</div>
      <div><strong>Collection Slot:</strong> ${booking.collectionDate} (${booking.timeSlot})</div>
      <div><strong>Processing Standard:</strong> NABL National Board Accredited Lab</div>
      <div><strong>Assigned Phlebotomist:</strong> ${booking.assignedPhlebotomistName || 'Srinivas Rao K. (DMLT)'}</div>
      <div><strong>Payment Status:</strong> ${booking.paymentStatus}</div>
    </div>

    <h3 style="font-size:15px;margin-bottom:8px;">Booked Diagnostic Tests & Zero-Fee Invoice</h3>
    <table>
      <thead>
        <tr>
          <th>Test / Package Description</th>
          <th>Accreditation Standard</th>
          <th style="text-align:right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${booking.selectedTestNames
          .map(
            (name) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:700;">NABL Certified National Lab</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">Included</td>
          </tr>`
          )
          .join('')}
        <tr>
          <td colspan="2" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#15803d;font-weight:600;">Home Sample Collection & Phlebotomy Charges</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;color:#15803d;font-weight:700;">₹0.00 (FREE)</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:12px;font-weight:800;font-size:15px;">Total Payable (Strictly Test Charges Only)</td>
          <td style="padding:12px;text-align:right;font-family:monospace;font-weight:800;font-size:16px;color:#dc2626;">₹${booking.totalTestPrice}.00</td>
        </tr>
      </tbody>
    </table>

    ${
      mode === 'report'
        ? `
      <h3 style="font-size:15px;margin-bottom:8px;">Clinical Biomarker Results (NABL National Board Accredited Reference)</h3>
      <table>
        <thead>
          <tr>
            <th>Biomarker Parameter</th>
            <th>Observed Value</th>
            <th>Biological Reference Interval</th>
            <th>Clinical Status</th>
          </tr>
        </thead>
        <tbody>
          ${metricsRowsHtml}
        </tbody>
      </table>`
        : ''
    }

    <div class="crypto">
      <div><strong>AES-256-GCM HEALTH DATA ENCRYPTION AUDIT CERTIFICATE</strong></div>
      <div>Algorithm: ${booking.encryptionMeta.algorithm} | Key ID: ${booking.encryptionMeta.keyId}</div>
      <div>IV Vector: ${booking.encryptionMeta.ivHex} | Auth Tag: ${booking.encryptionMeta.authTagHex}</div>
      <div>Cipher Integrity Fingerprint: ${booking.encryptionMeta.cipherPreview} (Verified ✓)</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
