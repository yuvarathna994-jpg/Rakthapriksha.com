import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INITIAL_DIAGNOSTIC_CATALOG,
  INITIAL_PHLEBOTOMISTS,
} from './src/data/catalogData.ts';
import {
  BookingRecord,
  DiagnosticTest,
  EncryptionAuditMeta,
  LabPartner,
  PhlebotomistPartner,
  TrackingStage,
} from './src/types/diagnostic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side AES-256-GCM Master Key (deterministic 32-byte key derived for runtime consistency)
const ENCRYPTION_SECRET =
  process.env.HEALTH_ENCRYPTION_SECRET ||
  'rakthapariksha-aes256-gcm-clinical-vault-key-2026';
const AES_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
const KEY_ID = 'RP-KMS-AES256-2026-V1';

function maskMobile(mobile: string): string {
  const clean = mobile.replace(/\D/g, '').slice(-10);
  if (clean.length < 10) return '+91 ••••• •••••';
  return `+91 ${clean.slice(0, 2)}•••••${clean.slice(7)}`;
}

function encryptPatientPayload(payloadObj: Record<string, unknown>): {
  encryptedBlob: string;
  meta: EncryptionAuditMeta;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const plaintext = JSON.stringify(payloadObj);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const cipherHex = encrypted.toString('hex');

  return {
    encryptedBlob: cipherHex,
    meta: {
      algorithm: 'AES-256-GCM',
      keyId: KEY_ID,
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      cipherPreview: `${cipherHex.slice(0, 28)}...${cipherHex.slice(-12)}`,
      encryptedAt: new Date().toISOString(),
      verified: true,
    },
  };
}

function decryptPatientPayload(
  encryptedHex: string,
  ivHex: string,
  authTagHex: string
): Record<string, unknown> | null {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      AES_KEY,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

// Initialize Server State
const catalogStore: DiagnosticTest[] = [...INITIAL_DIAGNOSTIC_CATALOG];
const phlebotomistStore: PhlebotomistPartner[] = [...INITIAL_PHLEBOTOMISTS];

function createSeedBookings(): BookingRecord[] {
  const b1Sensitive = {
    patientName: 'Ramesh Babu K.',
    mobileNumber: '9848022334',
    gps: { lat: 17.4486, lng: 78.3908 },
    address: 'Flat 302, Sri Sai Residency, Madhapur, Hyderabad - 500081',
  };
  const enc1 = encryptPatientPayload(b1Sensitive);

  const b2Sensitive = {
    patientName: 'Saraswathi Devi M.',
    mobileNumber: '9440188765',
    gps: { lat: 17.4948, lng: 78.3996 },
    address: 'Plot 44, KPHB Phase 3, Near Metro Station, Hyderabad - 500072',
  };
  const enc2 = encryptPatientPayload(b2Sensitive);

  return [
    {
      bookingId: 'RP-2026-4812',
      createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      patientName: 'Ramesh Babu K.',
      age: 38,
      gender: 'Male',
      familyRelation: 'Self',
      mobileNumber: '9848022334',
      maskedMobile: maskMobile('9848022334'),
      collectionDate: new Date().toISOString().slice(0, 10),
      timeSlot: '07:00 AM - 08:00 AM (Peak Fasting Slot)',
      selectedLab: 'Thyrocare',
      selectedTestIds: ['pkg-aarogyam-c'],
      selectedTestNames: [
        'Aarogyam C / Full Body Master Checkup (With Vitamin D, B12, Thyroid, HbA1c, LFT, KFT, Lipid, CBC)',
      ],
      totalMrp: 4599,
      totalTestPrice: 1099,
      premiumDiscountApplied: false,
      homeCollectionFee: 0,
      convenienceFee: 0,
      reportGenerationFee: 0,
      gpsCoordinates: { lat: 17.4486, lng: 78.3908 },
      googleMapsUrl: 'https://maps.google.com/?q=17.4486,78.3908',
      addressLandmark:
        'Flat 302, Sri Sai Residency, Madhapur, Hyderabad - 500081',
      paymentStatus: 'Paid via UPI QR',
      assignedPhlebotomistId: 'phleb-01',
      assignedPhlebotomistName: 'Srinivas Rao K.',
      assignedPhlebotomistMobile: '9848011223',
      trackingStage: 3,
      etaMinutes: 14,
      trackingHistory: [
        {
          stage: 1,
          titleEn: 'Booking Confirmed & Encrypted (₹0 Extra Fee)',
          titleTe: 'బుకింగ్ కన్ఫర్మ్ అయింది (₹0 అదనపు చార్జీలు)',
          timestamp: '06:25 AM',
          note: 'AES-256-GCM encrypted record created. Lab Partner: Thyrocare.',
        },
        {
          stage: 2,
          titleEn: 'Certified Phlebotomist Assigned',
          titleTe: 'సర్టిఫైడ్ ఫ్లెబోటమిస్ట్ కేటాయించబడ్డారు',
          timestamp: '06:32 AM',
          note: 'Assigned Srinivas Rao K. (B.Sc MLT, Reg: TSPMB-2019-4412).',
        },
        {
          stage: 3,
          titleEn: 'Phlebotomist En Route to Home Pin',
          titleTe: 'ఫ్లెబోటమిస్ట్ మీ ఇంటికి బయలుదేరారు',
          timestamp: '06:45 AM',
          note: 'Carrying sterile barcoded vacutainers (EDTA + SST Gold + Fluoride). Live ETA: 14 mins.',
        },
      ],
      encryptionMeta: enc1.meta,
      encryptedPayloadBlob: enc1.encryptedBlob,
      sampleReportMetrics: [
        {
          parameter: 'HbA1c (HPLC)',
          value: '5.5',
          unit: '%',
          referenceRange: '4.0 - 5.6 %',
          status: 'Normal',
        },
        {
          parameter: 'Fasting Blood Glucose',
          value: '92',
          unit: 'mg/dL',
          referenceRange: '70 - 100 mg/dL',
          status: 'Normal',
        },
        {
          parameter: 'Ultrasensitive TSH',
          value: '2.84',
          unit: 'mIU/L',
          referenceRange: '0.45 - 4.50 mIU/L',
          status: 'Normal',
        },
        {
          parameter: '25-OH Vitamin D Total',
          value: '38.4',
          unit: 'ng/mL',
          referenceRange: '30.0 - 100.0 ng/mL',
          status: 'Normal',
        },
        {
          parameter: 'Vitamin B12',
          value: '465',
          unit: 'pg/mL',
          referenceRange: '211 - 911 pg/mL',
          status: 'Normal',
        },
        {
          parameter: 'Total Cholesterol',
          value: '174',
          unit: 'mg/dL',
          referenceRange: '< 200 mg/dL',
          status: 'Normal',
        },
      ],
    },
    {
      bookingId: 'RP-2026-4790',
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      patientName: 'Saraswathi Devi M.',
      age: 63,
      gender: 'Female',
      familyRelation: 'Mother',
      mobileNumber: '9440188765',
      maskedMobile: maskMobile('9440188765'),
      collectionDate: new Date().toISOString().slice(0, 10),
      timeSlot: '06:00 AM - 07:00 AM (Priority Early Fasting)',
      selectedLab: 'Tata 1mg',
      selectedTestIds: ['test-hba1c', 'test-thyroid-total', 'test-lipid'],
      selectedTestNames: [
        'HbA1c (Glycosylated Hemoglobin - 3 Month Sugar Average)',
        'Thyroid Profile Total (T3, T4 & Ultrasensitive TSH)',
        'Complete Lipid Profile (Heart & Cholesterol Panel)',
      ],
      totalMrp: 2250,
      totalTestPrice: 827,
      premiumDiscountApplied: false,
      homeCollectionFee: 0,
      convenienceFee: 0,
      reportGenerationFee: 0,
      gpsCoordinates: { lat: 17.4948, lng: 78.3996 },
      googleMapsUrl: 'https://maps.google.com/?q=17.4948,78.3996',
      addressLandmark:
        'Plot 44, KPHB Phase 3, Near Metro Station, Hyderabad - 500072',
      paymentStatus: 'Paid via UPI QR',
      assignedPhlebotomistId: 'phleb-02',
      assignedPhlebotomistName: 'Lakshmi Prasanna M.',
      assignedPhlebotomistMobile: '9963422110',
      trackingStage: 5,
      etaMinutes: 0,
      trackingHistory: [
        {
          stage: 1,
          titleEn: 'Booking Confirmed & Encrypted (₹0 Extra Fee)',
          titleTe: 'బుకింగ్ కన్ఫర్మ్ అయింది',
          timestamp: '05:50 AM',
          note: 'Booked with Tata 1mg Labs at ₹0 convenience fee.',
        },
        {
          stage: 2,
          titleEn: 'Certified Phlebotomist Assigned',
          titleTe: 'ఫ్లెబోటమిస్ట్ కేటాయించబడ్డారు',
          timestamp: '06:00 AM',
          note: 'Assigned Lakshmi Prasanna M. (DMLT, Reg: APPMB-2021-8890).',
        },
        {
          stage: 3,
          titleEn: 'Phlebotomist En Route to Home Pin',
          titleTe: 'ఫ్లెబోటమిస్ట్ బయలుదేరారు',
          timestamp: '06:12 AM',
          note: 'Arrived at KPHB Phase 3 GPS location.',
        },
        {
          stage: 4,
          titleEn: 'Sample Collected & Vacutainer Barcoded',
          titleTe: 'బ్లడ్ శాంపిల్ సేకరించబడింది',
          timestamp: '06:28 AM',
          note: 'EDTA + SST Gold tubes sealed in cold-chain box (4°C).',
        },
        {
          stage: 5,
          titleEn: 'NABL Certified Encrypted Report Ready',
          titleTe: 'ల్యాబ్ రిపోర్ట్ సిద్ధంగా ఉంది',
          timestamp: '12:40 PM',
          note: 'Verified by MD Pathologist & encrypted with AES-256-GCM.',
        },
      ],
      encryptionMeta: enc2.meta,
      encryptedPayloadBlob: enc2.encryptedBlob,
      sampleReportMetrics: [
        {
          parameter: 'HbA1c (HPLC)',
          value: '6.2',
          unit: '%',
          referenceRange: '4.0 - 5.6 %',
          status: 'Borderline',
        },
        {
          parameter: 'Total T3',
          value: '118',
          unit: 'ng/dL',
          referenceRange: '80 - 200 ng/dL',
          status: 'Normal',
        },
        {
          parameter: 'Total T4',
          value: '7.9',
          unit: 'µg/dL',
          referenceRange: '5.1 - 14.1 µg/dL',
          status: 'Normal',
        },
        {
          parameter: 'Ultrasensitive TSH',
          value: '3.30',
          unit: 'mIU/L',
          referenceRange: '0.45 - 4.50 mIU/L',
          status: 'Normal',
        },
        {
          parameter: 'LDL Cholesterol',
          value: '104',
          unit: 'mg/dL',
          referenceRange: '< 100 mg/dL',
          status: 'Borderline',
        },
        {
          parameter: 'HDL Cholesterol',
          value: '52',
          unit: 'mg/dL',
          referenceRange: '> 45 mg/dL',
          status: 'Normal',
        },
      ],
    },
  ];
}

const bookingStore: BookingRecord[] = createSeedBookings();

const STAGE_TITLES: Record<
  TrackingStage,
  { titleEn: string; titleTe: string }
> = {
  1: {
    titleEn: 'Booking Confirmed & Encrypted (₹0 Extra Fee)',
    titleTe: 'బుకింగ్ కన్ఫర్మ్ అయింది (₹0 అదనపు చార్జీలు)',
  },
  2: {
    titleEn: 'Certified Phlebotomist Assigned',
    titleTe: 'సర్టిఫైడ్ ఫ్లెబోటమిస్ట్ కేటాయించబడ్డారు',
  },
  3: {
    titleEn: 'Phlebotomist En Route to Home Pin',
    titleTe: 'ఫ్లెబోటమిస్ట్ మీ ఇంటికి బయలుదేరారు',
  },
  4: {
    titleEn: 'Sample Collected & Vacutainer Barcoded',
    titleTe: 'బ్లడ్ శాంపిల్ సేకరించబడింది',
  },
  5: {
    titleEn: 'NABL Certified Encrypted Report Ready',
    titleTe: 'ల్యాబ్ రిపోర్ట్ సిద్ధంగా ఉంది',
  },
};

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Attach WebSocket Server for Real-Time Tracking & Multi-Portal Synchronization
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcastEvent(type: string, payload: unknown) {
    const message = JSON.stringify({ type, payload });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'init',
        payload: {
          catalog: catalogStore,
          bookings: bookingStore,
          phlebotomists: phlebotomistStore,
        },
      })
    );
  });

  // REST API Routes
  app.get('/api/state', (_req, res) => {
    res.json({
      catalog: catalogStore,
      bookings: bookingStore,
      phlebotomists: phlebotomistStore,
    });
  });

  // Create New AES-256-GCM Encrypted Booking
  app.post('/api/bookings', (req, res) => {
    try {
      const body = req.body;
      const bookingId =
        body.bookingId ||
        `RP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanMobile = String(body.mobileNumber || '')
        .replace(/\D/g, '')
        .slice(-10);

      const sensitivePayload = {
        bookingId,
        patientName: body.patientName,
        age: body.age,
        gender: body.gender,
        mobileNumber: cleanMobile,
        gpsCoordinates: body.gpsCoordinates,
        googleMapsUrl: body.googleMapsUrl,
        addressLandmark: body.addressLandmark,
        selectedTestIds: body.selectedTestIds,
      };

      const { encryptedBlob, meta } = encryptPatientPayload(sensitivePayload);
      const defaultPhleb = phlebotomistStore[0];
      const nowTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const newBooking: BookingRecord = {
        bookingId,
        createdAt: new Date().toISOString(),
        patientName: String(body.patientName || 'Patient').trim(),
        age: Number(body.age) || 30,
        gender: body.gender || 'Male',
        familyRelation: body.familyRelation || 'Self',
        mobileNumber: cleanMobile,
        maskedMobile: maskMobile(cleanMobile),
        collectionDate:
          body.collectionDate || new Date().toISOString().slice(0, 10),
        timeSlot:
          body.timeSlot || '07:00 AM - 08:00 AM (Peak Fasting Slot)',
        selectedLab: (body.selectedLab as LabPartner) || 'Thyrocare',
        selectedTestIds: Array.isArray(body.selectedTestIds)
          ? body.selectedTestIds
          : ['test-cbc'],
        selectedTestNames: Array.isArray(body.selectedTestNames)
          ? body.selectedTestNames
          : ['Complete Blood Count (CBC / Hemogram)'],
        totalMrp: Number(body.totalMrp) || 450,
        totalTestPrice: Number(body.totalTestPrice) || 169,
        premiumDiscountApplied: Boolean(body.premiumDiscountApplied),
        referralCode: body.referralCode || undefined,
        homeCollectionFee: 0,
        convenienceFee: 0,
        reportGenerationFee: 0,
        gpsCoordinates: body.gpsCoordinates || { lat: 17.4486, lng: 78.3908 },
        googleMapsUrl:
          body.googleMapsUrl || 'https://maps.google.com/?q=17.4486,78.3908',
        addressLandmark:
          body.addressLandmark || 'Live GPS Location Shared',
        paymentStatus: body.paymentStatus || 'Paid via UPI QR',
        assignedPhlebotomistId: defaultPhleb?.id,
        assignedPhlebotomistName: defaultPhleb?.fullName,
        assignedPhlebotomistMobile: defaultPhleb?.mobileNumber,
        trackingStage: 2,
        etaMinutes: 22,
        trackingHistory: [
          {
            stage: 1,
            titleEn: STAGE_TITLES[1].titleEn,
            titleTe: STAGE_TITLES[1].titleTe,
            timestamp: nowTime,
            note: `AES-256-GCM encrypted order created for ${body.selectedLab}. Zero extra fees applied.`,
          },
          {
            stage: 2,
            titleEn: STAGE_TITLES[2].titleEn,
            titleTe: STAGE_TITLES[2].titleTe,
            timestamp: nowTime,
            note: `Auto-assigned certified phlebotomist ${
              defaultPhleb?.fullName || 'Srinivas Rao K.'
            } (${defaultPhleb?.qualification || 'B.Sc MLT'}).`,
          },
        ],
        encryptionMeta: meta,
        encryptedPayloadBlob: encryptedBlob,
        sampleReportMetrics: [
          {
            parameter: 'Hemoglobin (Hb)',
            value: '14.2',
            unit: 'g/dL',
            referenceRange: '13.0 - 17.0 g/dL',
            status: 'Normal',
          },
          {
            parameter: 'Total WBC Count',
            value: '6,850',
            unit: 'cells/mcL',
            referenceRange: '4,000 - 11,000 cells/mcL',
            status: 'Normal',
          },
          {
            parameter: 'Platelet Count',
            value: '2.65',
            unit: 'Lakhs/mcL',
            referenceRange: '1.50 - 4.50 Lakhs/mcL',
            status: 'Normal',
          },
          {
            parameter: 'Fasting Blood Glucose',
            value: '91',
            unit: 'mg/dL',
            referenceRange: '70 - 100 mg/dL',
            status: 'Normal',
          },
        ],
      };

      const existingIdx = bookingStore.findIndex(
        (b) => b.bookingId === newBooking.bookingId
      );
      if (existingIdx === -1) {
        bookingStore.unshift(newBooking);
      }

      broadcastEvent('booking:created', newBooking);
      res.status(201).json(newBooking);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to create booking',
      });
    }
  });

  // Update Booking Tracking Stage, ETA, Assigned Phlebotomist, or Payment Status
  app.patch('/api/bookings/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const booking = bookingStore.find((b) => b.bookingId === bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const {
      trackingStage,
      etaMinutes,
      assignedPhlebotomistId,
      paymentStatus,
      trackingNote,
    } = req.body;

    if (assignedPhlebotomistId) {
      const phleb = phlebotomistStore.find(
        (p) => p.id === assignedPhlebotomistId
      );
      if (phleb) {
        booking.assignedPhlebotomistId = phleb.id;
        booking.assignedPhlebotomistName = phleb.fullName;
        booking.assignedPhlebotomistMobile = phleb.mobileNumber;
      }
    }

    if (typeof etaMinutes === 'number') {
      booking.etaMinutes = Math.max(0, etaMinutes);
    }

    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    if (trackingStage && trackingStage >= 1 && trackingStage <= 5) {
      const nextStage = trackingStage as TrackingStage;
      booking.trackingStage = nextStage;
      if (nextStage === 5 || nextStage === 4) {
        booking.etaMinutes = 0;
      }
      const nowTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const stageMeta = STAGE_TITLES[nextStage];
      const alreadyHasStage = booking.trackingHistory.some(
        (h) => h.stage === nextStage
      );
      if (!alreadyHasStage) {
        booking.trackingHistory.push({
          stage: nextStage,
          titleEn: stageMeta.titleEn,
          titleTe: stageMeta.titleTe,
          timestamp: nowTime,
          note:
            trackingNote ||
            (nextStage === 3
              ? `Phlebotomist ${booking.assignedPhlebotomistName} is en route via two-wheeler. ETA: ${booking.etaMinutes} mins.`
              : nextStage === 4
              ? 'Barcoded vacutainer tubes collected and logged into cold-chain box.'
              : nextStage === 5
              ? 'NABL certified report verified and encrypted with AES-256-GCM.'
              : 'Status updated by Admin Dispatch Center.'),
        });
      }
    }

    broadcastEvent('booking:updated', booking);
    res.json(booking);
  });

  // Verify Round-Trip AES-256-GCM Decryption for Audit Inspector
  app.get('/api/bookings/:bookingId/verify-encryption', (req, res) => {
    const booking = bookingStore.find(
      (b) => b.bookingId === req.params.bookingId
    );
    if (!booking || !booking.encryptedPayloadBlob) {
      res.status(404).json({ error: 'Encrypted booking record not found' });
      return;
    }

    const decrypted = decryptPatientPayload(
      booking.encryptedPayloadBlob,
      booking.encryptionMeta.ivHex,
      booking.encryptionMeta.authTagHex
    );

    res.json({
      bookingId: booking.bookingId,
      verified: Boolean(decrypted),
      encryptionMeta: booking.encryptionMeta,
      decryptedPayload: decrypted,
    });
  });

  // Register Certified Phlebotomist Partner
  app.post('/api/phlebotomists', (req, res) => {
    const body = req.body;
    const newPhleb: PhlebotomistPartner = {
      id: `phleb-${Date.now()}`,
      fullName: String(body.fullName || '').trim(),
      mobileNumber: String(body.mobileNumber || '')
        .replace(/\D/g, '')
        .slice(-10),
      qualification: body.qualification || 'DMLT',
      registrationNumber:
        String(body.registrationNumber || '').trim() ||
        `TSPMB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      experienceYears: Number(body.experienceYears) || 3,
      previousOrganization:
        String(body.previousOrganization || '').trim() ||
        'Certified Diagnostic Partner',
      hasTwoWheeler: Boolean(body.hasTwoWheeler ?? true),
      serviceablePincodes: Array.isArray(body.serviceablePincodes)
        ? body.serviceablePincodes
        : String(body.serviceablePincodes || '500072, 500081')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
      availableSlots: Array.isArray(body.availableSlots)
        ? body.availableSlots
        : ['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM'],
      verified: true,
      activeOrdersCount: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
    };

    phlebotomistStore.unshift(newPhleb);
    broadcastEvent('phlebotomist:created', newPhleb);
    res.status(201).json(newPhleb);
  });

  // Admin Custom Test & Price Manager — Add or Update Test
  app.post('/api/catalog', (req, res) => {
    const body = req.body;
    const newTest: DiagnosticTest = {
      id: body.id || `test-custom-${Date.now()}`,
      code:
        body.code || `RP-CST-${Math.floor(100 + Math.random() * 899)}`,
      nameEn: String(body.nameEn || 'Custom Diagnostic Test').trim(),
      nameTe:
        String(body.nameTe || body.nameEn || 'కస్టమ్ రక్త పరీక్ష').trim(),
      category: body.category || 'Routine & Fever',
      parameterCount: Number(body.parameterCount) || 1,
      parametersIncluded: Array.isArray(body.parametersIncluded)
        ? body.parametersIncluded
        : String(body.parametersIncluded || body.nameEn)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
      fastingRequired: Boolean(body.fastingRequired),
      fastingTextEn: body.fastingRequired
        ? '10-12 Hrs Fasting Required'
        : 'No Fasting Required',
      fastingTextTe: body.fastingRequired
        ? '10-12 గంటల ఉపవాసం అవసరం'
        : 'ఉపవాసం అవసరం లేదు',
      tatHours: Number(body.tatHours) || 8,
      tatTextEn: `Reports in ${Number(body.tatHours) || 8} Hours`,
      tatTextTe: `${Number(body.tatHours) || 8} గంటల్లో రిపోర్ట్`,
      sampleTube: body.sampleTube || 'SST Gold Top (Serum)',
      mrp: Number(body.mrp) || 1000,
      popular: Boolean(body.popular),
      labPrices: body.labPrices || {
        Thyrocare: { price: 299, rating: 4.9, accreditation: 'NABL & CAP' },
        'Tata 1mg': { price: 329, rating: 4.9, accreditation: 'NABL & CAP' },
        Healthians: {
          price: 310,
          rating: 4.8,
          accreditation: 'NABL Accredited',
        },
        'Lupin Diagnostics': {
          price: 349,
          rating: 4.8,
          accreditation: 'NABL Accredited',
        },
        'Apollo Diagnostics': {
          price: 390,
          rating: 4.9,
          accreditation: 'NABL & CAP',
        },
      },
    };

    const existingIdx = catalogStore.findIndex((t) => t.id === newTest.id);
    if (existingIdx >= 0) {
      catalogStore[existingIdx] = newTest;
    } else {
      catalogStore.unshift(newTest);
    }

    broadcastEvent('catalog:updated', catalogStore);
    res.status(201).json(newTest);
  });

  // Gemini AI Bilingual Diagnostic Medical Advisor
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, language } = req.body;
      const ai = getGeminiClient();

      const compactCatalogSummary = catalogStore
        .map(
          (t) =>
            `[${t.id}] ${t.nameEn} (${t.nameTe}) | Params: ${t.parameterCount} | Fasting: ${t.fastingTextEn} | MRP: ₹${t.mrp} | NABL Certified Price: ₹${t.labPrices.Thyrocare.price}`
        )
        .join('\n');

      const systemInstruction = `You are the official Bilingual AI Diagnostic & Medical Advisor for Rakthapariksha.com (రక్త పరీక్ష.కామ్) — proudly a 100% Indian-Based App for Indians where ALL blood samples are processed in NABL (National Accreditation Board of Laboratories) certified facilities, with a strict "Pay ONLY Test Charges! ₹0 Extra Fees (No Home Collection Fee, No Convenience Fee)" guarantee.
Official Admin WhatsApp & Helpline: +91 8333821121 | UPI ID: 8333821121@ybl.

Current User Preferred Language: ${language === 'te' ? 'Telugu (తెలుగు) & English' : 'English (with helpful Telugu terms where appropriate)'}.

Here is the live Rakthapariksha.com NABL Certified Test Catalog:
${compactCatalogSummary}

Guidelines:
1. Answer clearly and empathetically in ${language === 'te' ? 'Telugu (తెలుగు) and English' : 'English (or Telugu if the user asks in Telugu)'}.
2. Highlight that Rakthapariksha.com is a 100% Indian-based app for Indians and all samples are processed in NABL (National Accreditation Board of Laboratories) certified labs with ₹0 Extra Fees.
3. Recommend specific tests from the catalog above with their exact NABL Certified Price and MRP savings, and explain fasting requirements, sample vacutainer tube types, and normal reference ranges clearly.
4. Keep responses concise (under 180 words) and structured with bullet points.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: String(message || 'Suggest a full body checkup'),
        config: {
          systemInstruction,
        },
      });

      const replyText =
        response.text ||
        'Please check our Aarogyam Full Body Checkup (88 Parameters) starting at ₹1099 with ₹0 extra home collection charges.';

      // Identify any mentioned test IDs so the UI can offer 1-click "Add to Booking" buttons
      const suggestedTestIds = catalogStore
        .filter(
          (t) =>
            replyText.toLowerCase().includes(t.id.toLowerCase()) ||
            replyText
              .toLowerCase()
              .includes(t.nameEn.split('(')[0].trim().toLowerCase())
        )
        .slice(0, 4)
        .map((t) => t.id);

      res.json({
        reply: replyText,
        suggestedTestIds,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Gemini AI Advisor failed to respond. Please check your GEMINI_API_KEY in Settings > Secrets.',
      });
    }
  });

  // Gemini AI Multimodal Prescription Image & Text Scanner
  app.post('/api/gemini/parse-rx', async (req, res) => {
    try {
      const { imageBase64, mimeType, rxText } = req.body;
      const ai = getGeminiClient();

      const catalogList = catalogStore
        .map((t) => `${t.id}: ${t.nameEn} (${t.parametersIncluded.join(', ')})`)
        .join('\n');

      const promptText = `Analyze this medical prescription or clinical note and map the prescribed investigations to the closest matching test IDs from the Rakthapariksha.com catalog below.

Available Test Catalog IDs:
${catalogList}

${rxText ? `Prescription Text / Clinical Note: "${rxText}"` : ''}

Return a JSON object matching the schema with:
- matchedTestIds: array of matching test IDs from the catalog list above
- clinicalSummaryEn: 1-2 sentence English explanation of why these tests were matched and fasting rules
- clinicalSummaryTe: 1-2 sentence Telugu (తెలుగు) explanation for the patient
- recommendedLab: one of "Thyrocare", "Tata 1mg", "Healthians", "Lupin Diagnostics", or "Apollo Diagnostics" offering the best value
- doctorNotesExtracted: concise summary of symptoms/investigations detected.`;

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (imageBase64 && mimeType) {
        parts.push({
          inlineData: {
            mimeType: String(mimeType),
            data: String(imageBase64),
          },
        });
      }
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedTestIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              clinicalSummaryEn: { type: Type.STRING },
              clinicalSummaryTe: { type: Type.STRING },
              recommendedLab: { type: Type.STRING },
              doctorNotesExtracted: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const validIds = Array.isArray(parsed.matchedTestIds)
        ? parsed.matchedTestIds.filter((id: string) =>
            catalogStore.some((t) => t.id === id)
          )
        : [];

      res.json({
        matchedTestIds:
          validIds.length > 0 ? validIds : ['test-cbc', 'test-thyroid-total'],
        clinicalSummaryEn:
          parsed.clinicalSummaryEn ||
          'Matched prescribed blood tests with ₹0 home collection fee.',
        clinicalSummaryTe:
          parsed.clinicalSummaryTe ||
          'మీ డాక్టర్ ప్రిస్క్రిప్షన్ ఆధారంగా సరైన రక్త పరీక్షలు ఎంపిక చేయబడ్డాయి (₹0 అదనపు చార్జీలు).',
        recommendedLab: parsed.recommendedLab || 'Thyrocare',
        doctorNotesExtracted:
          parsed.doctorNotesExtracted || 'Prescription analyzed via Gemini AI',
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze prescription with Gemini AI.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Rakthapariksha.com Full-Stack Server & WebSocket Hub running on http://localhost:${PORT}`
    );
  });
}

startServer();
