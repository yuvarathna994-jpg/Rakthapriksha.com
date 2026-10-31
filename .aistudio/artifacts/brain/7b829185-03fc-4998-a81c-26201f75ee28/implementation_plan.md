# Rakthapariksha.com (రక్త పరీక్ష.కామ్) — Next-Gen Transparent Diagnostic Aggregator & Encrypted Health Platform

Rakthapariksha.com is a bilingual (English / తెలుగు), zero-hidden-fee Indian diagnostic blood test aggregator and home collection platform that lets patients compare real-time prices across five NABL/CAP-accredited labs (Thyrocare, Tata 1mg, Healthians, Lupin Diagnostics, and Apollo Diagnostics), book on a single screen with live GPS and instant UPI QR payment (`8333821121@ybl`), track orders in real time with assigned phlebotomist ETAs, and safeguard health records with AES-256 encryption.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product decisions have been finalized based on your requirements and responses:

- **Direct Instant Access & Zero Email Requirement**: The website opens directly into the live 28+ test catalog and single-screen booking workspace without any login gate or Email ID fields anywhere in the patient, check-in, or phlebotomist flows.
- **1-Tap Customer Mobile Check-In with Instant Admin WhatsApp Alert**: Visitors can optionally enter their Full Name and 10-Digit Mobile Number in the quick check-in bar to unlock referral rewards, family health profiles, and immediately trigger a structured WhatsApp notification to Admin (`+91 8333821121`).
- **Confirmed — Live Status Tracker with Phlebotomist Assignment, ETA & Map Pin**: Real-time WebSocket-synchronized order tracking displays a 5-stage live progress tracker (`Booking Confirmed` → `Phlebotomist Assigned` → `En Route to Home` → `Sample Collected (Vacutainer Logged)` → `Lab Report Ready`), showing the assigned technician's qualification, live ETA countdown, and interactive GPS map pin.
- **Confirmed — AES-256 Encrypted Health Records & PII Masking**: All sensitive patient health records, mobile numbers, GPS coordinates, and diagnostic biomarker values are encrypted using authenticated AES-256-GCM encryption at rest and in transit, paired with automatic PII masking (`+91 98•••••210`) in public/shared views and cryptographic integrity verification badges.
- **Confirmed — Full Suite of Smart Diagnostic Features**:
  1. **Instant Downloadable PDF Booking Receipt & Encrypted Report Viewer**: Printable/downloadable official tax-free diagnostic invoice and encrypted clinical report viewer with normal reference range gauges.
  2. **Bilingual Voice Search (English & తెలుగు)**: Web Speech API voice recognition allowing patients to speak test names or symptoms in Telugu or English to filter the catalog immediately.
  3. **Smart Prescription Image Upload (Gemini AI)**: Patients can upload or snap a photo of a doctor's handwritten or printed prescription; server-side `gemini-3.8-flash` extracts recommended blood tests and automatically populates the best-priced lab cart.
  4. **Family Member Profiles & Historical Biomarker Trend Charts**: Multi-member profiles (Self, Parents, Spouse, Children) with visual longitudinal trend charts for HbA1c, Fasting Blood Sugar, TSH, Vitamin D, and Lipid levels.

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates hidden phlebotomy, home collection, and report generation fees by aggregating 28+ essential blood tests and master health packages across India's top 5 diagnostic networks. Patients compare exact MRP vs. Rakthapariksha prices per lab, upload prescriptions for AI test matching, book on a single screen with live GPS and dynamic UPI QR (`8333821121@ybl`), track sample collection in real time, and manage encrypted family health records.
- **Target Audience / Persona**:
  - **Patients & Families**: Indian households seeking transparent, affordable NABL-certified home blood sample collection with full support for both English and Telugu (`తెలుగు`).
  - **Certified Phlebotomists**: DMLT / B.Sc MLT technicians onboarding for local home sample collection slots.
  - **Dispatch & Lab Administrators**: Operations leads managing bookings, phlebotomist assignments, live tracking updates, and WhatsApp dispatches (`+91 8333821121`).
- **Key Value**: Guaranteed **₹0 Extra Charges** (Pay ONLY Test Charges), 40%–75% savings across accredited labs, frictionless single-screen booking without mandatory accounts or email addresses, and clinical-grade AES-256 data privacy.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Zero-Friction Landing & Bilingual Voice/AI Search**:
   - User lands directly on the web application. A sticky high-contrast banner highlights: *"Pay ONLY Test Charges! ₹0 Extra Fees. No Hidden Charges, No Phlebotomy/Home Collection Extra Fees (కేవలం టెస్ట్ చార్జీలు మాత్రమే చెల్లించండి - అదనపు చార్జీలు లేవు!)"*.
   - Below the hero split, a **Quick Mobile Check-In Bar** lets customers enter their Name and 10-Digit Mobile Number to notify Admin on WhatsApp (`+91 8333821121`) in one click.
   - Users search 28+ blood tests via text, category tabs, **Bilingual Voice Search (English / తెలుగు)**, or **AI Prescription Scanner** (upload a prescription image to auto-select matching tests).
2. **Multi-Lab Comparison & Single-Screen Booking**:
   - Each card in the responsive grid displays Test Name, Parameter Count, included biomarkers, Fasting Requirement, Report Turnaround Time (TAT), Vacutainer Tube type, and an interactive **Partner Lab Selector Dropdown** comparing Thyrocare, Tata 1mg, Healthians, Lupin Diagnostics, and Apollo Diagnostics (highlighting MRP, Rakthapariksha Price, `% Saved`, and `★ LOWEST` badge).
   - Selecting tests updates the **Single-Screen Booking & Payment Engine**: Patient Name, Age, Gender, Family Member selector, 10-Digit Mobile Number, Collection Date, Morning Time Slot (`6:00 AM - 7:00 AM` through `11:00 AM - 12:00 PM`), **Detect Live GPS Location** (generating `https://maps.google.com/?q=lat,lng`), and an instant **Dynamic UPI QR Code** (`upi://pay?pa=8333821121@ybl&...`) with strictly ₹0 convenience fees.
   - Clicking **"Save & Send Details with Location on WhatsApp"** encrypts and saves the booking (`RP-2026-XXXX`), broadcasts the new order via WebSockets to the Admin Portal and Live Tracker, generates an instant downloadable **PDF Booking Receipt**, and opens WhatsApp (`+91 8333821121`) with a formatted dispatch message and clickable GPS map pin.
3. **Real-Time Order Tracking & Encrypted Health Vault**:
   - Patients switch to the **Live Order Tracker & Family Health** view to inspect real-time progress of their booking (`Booking Confirmed` → `Phlebotomist Assigned` → `Phlebotomist En Route` → `Sample Collected` → `Encrypted Report Ready`), view assigned phlebotomist credentials, live ETA, GPS pin link, and inspect longitudinal biomarker charts (HbA1c, TSH, Lipid, Vitamin D) with AES-256 encryption verification and one-click PDF report download.
4. **Phlebotomist Onboarding & Credential-Protected Admin Portal (`RP2026`)**:
   - Certified technicians register via the **Phlebotomist Partner Portal** (Name, 10-Digit Mobile, Qualification, Experience, Two-Wheeler status, Serviceable Pincodes, Morning Slots—no Email required).
   - Admin unlocks the **Admin Backend Dashboard** using passcode `RP2026` to view live bookings, toggle PII masking/decryption, assign registered phlebotomists, update live tracking stages & ETAs (instantly pushed to patients via WebSocket), trigger 1-click WhatsApp dispatches to patients or phlebotomists, and add/edit custom tests and lab prices.

### Visual Identity & Theme
- **Aesthetic Direction**: Clinical Precision meets Consumer Fintech Clarity—clean, high-trust medical surfaces with crisp data density and zero visual clutter.
- **Color Palette & Mood** (60-30-10 Distribution):
  - **60% Dominant Neutral Canvas**: Crisp Alabaster White (`#F8FAFC` / `bg-slate-50`) and pure clinical white (`#FFFFFF` / `bg-white`) in light posture; deep slate (`#0F172A`) in dark mode.
  - **30% Structural Surfaces & Typography**: Deep Medical Navy (`#0F172A` / `text-slate-900`) for primary headlines, Cool Slate (`#475569` / `text-slate-600`) for secondary metadata, and subtle 1px hairline borders (`#E2E8F0` / `border-slate-200`).
  - **10% Accent Budget**: Medical Trust Teal (`#0D9488` / `teal-600`) for primary actions, Royal Diagnostic Blue (`#1D4ED8` / `blue-700`) for lab comparisons and encryption verification, and Energetic Savings Green (`#15803D` / `emerald-700`) strictly for ₹0 Extra Fee highlights, lowest-price indicators, and WhatsApp dispatch triggers.
- **Typography & Hierarchy**:
  - **Display & Headings**: `Plus Jakarta Sans` (600/700 weight, `text-wrap: balance`) for crisp structural headings and bilingual Telugu/English legibility.
  - **Body Prose**: `DM Sans` (400/500 weight) for comfortable reading across test descriptions and clinical preparation notes.
  - **Data, Pricing & Encryption Hashes**: `JetBrains Mono` (`font-mono tabular-nums`) for all ₹ prices, % savings, Booking IDs (`RP-2026-XXXX`), timestamps, GPS coordinates, and AES-256-GCM cipher fingerprints.
- **Component Styling & Layout**:
  - Full 1440px desktop presence with a clean 3-zone Top Bar Contract (Wordmark on left, concise single-line navigation tabs in center, Primary Action on right).
  - Secondary workspace controls (English / తెలుగు toggle, Premium 10% Savings toggle, Refer & Earn ₹100 WhatsApp trigger, Quick Mobile Check-In bar) organized cleanly in a dedicated utility bar below the header.
  - Single-elevation cards with subtle hairline borders and unboxed metadata separated by `·` dividers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Synchronized Real-Time Order Tracking via WebSockets + Express Backend**
  - *Chosen Approach*: Attach a WebSocket server (`ws`) to the Express HTTP server on port 3000 alongside persistent server-side state and local storage synchronization.
  - *Why*: When an Admin assigns a phlebotomist or advances an order stage (`En Route`, `Sample Collected`, `Report Ready`), the patient's Live Tracker updates instantaneously without page refreshes or fake timers.
  - *Alternatives Considered*: Client-only `localStorage` polling, which fails to demonstrate multi-portal real-time synchronization between Admin and Patient tabs.
- **Decision 2: Authenticated AES-256-GCM Encryption for Patient Health Data**
  - *Chosen Approach*: Implement real cryptographic encryption using Node's `crypto` module (`aes-256-gcm` with authenticated IV and auth tag) on the backend combined with Web Crypto API verification on the client, displaying verifiable cipher metadata and interactive PII masking (`+91 98•••••210`) with authorized reveal.
  - *Why*: Protects sensitive patient diagnostic records and mobile/GPS data while giving users and administrators transparent proof of encryption and privacy controls.
- **Decision 3: Server-Side Gemini AI (`gemini-3.8-flash`) for Prescription OCR & Bilingual Medical Advisor**
  - *Chosen Approach*: Route all multimodal prescription image analysis and bilingual English/తెలుగు medical advisor chat requests through Express `/api/gemini/*` endpoints using `@google/genai` (`gemini-3.8-flash`) with structured JSON schemas for prescription-to-test matching.
  - *Why*: Keeps API keys strictly server-side, guarantees accurate mapping from uploaded prescription photos to catalog test IDs, and provides fast bilingual guidance.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                        Rakthapariksha.com Client (React 19 + Vite)                   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar (3-Zone Contract) + Bilingual Utility & Quick Mobile Check-In Bar      │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│         │                        │                         │                │        │
│         ▼                        ▼                         ▼                ▼        │
│  ┌────────────────┐     ┌──────────────────┐     ┌──────────────────┐  ┌──────────┐  │
│  │ Portal 1:      │     │ Portal 2:        │     │ Portal 3:        │  │ Portal 4:│  │
│  │ Test Catalog & │     │ Live Order       │     │ Phlebotomist     │  │ Admin    │  │
│  │ Single-Screen  │     │ Tracker, Family  │     │ Partner          │  │ Dispatch │  │
│  │ Booking Engine │     │ Trends & AES-256 │     │ Onboarding       │  │ Center   │  │
│  │ • 28+ Tests    │     │ Health Vault     │     │ • DMLT/MLT Reg   │  │ (RP2026) │  │
│  │ • 5-Lab Select │     │ • 5-Stage Live   │     │ • Pincode &      │  │ • Assign │  │
│  │ • Voice Search │     │   Status & ETA   │     │   Slot Mapping   │  │   Tech   │  │
│  │ • Rx AI Upload │     │ • PDF Receipt &  │     │ • Instant Pool   │  │ • Update │  │
│  │ • Live GPS Pin │     │   Report Viewer  │     │   Sync           │  │   ETA    │  │
│  │ • Dynamic UPI  │     │ • Biomarker      │     │                  │  │ • Custom │  │
│  │   QR (83338..) │     │   Trend Charts   │     │                  │  │   Catalog│  │
│  └───────┬────────┘     └────────┬─────────┘     └────────┬─────────┘  └────┬─────┘  │
│          │                       │                        │                 │        │
│          └───────────────────────┴───────────┬────────────┴─────────────────┘        │
│                                              │                                       │
│                        ┌─────────────────────▼─────────────────────┐                 │
│                        │ Dockable Gemini AI Medical Advisor Drawer │                 │
│                        │ (English / తెలుగు Chat + Rx Image Parser) │                 │
│                        └─────────────────────┬─────────────────────┘                 │
└──────────────────────────────────────────────┼───────────────────────────────────────┘
                                               │ HTTP REST (`/api/*`) + WebSocket (`/ws`)
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                     Express + WebSocket Server (`server.ts` : 3000)                  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  • `/api/catalog`          : 28+ Multi-Lab Tests & Custom Admin Test Management      │
│  • `/api/bookings`         : AES-256-GCM Encrypted Bookings + Live Status Broadcast  │
│  • `/api/phlebotomists`    : Certified Phlebotomist Pool & Assignment Engine         │
│  • `/api/gemini/chat`      : Bilingual Medical Advisor (`gemini-3.8-flash`)          │
│  • `/api/gemini/parse-rx`  : Multimodal Prescription Image-to-Test Matcher           │
│  • `WebSocket Server`      : Real-time `booking:created`, `booking:updated`,         │
│                              `tracking:eta_updated`, `catalog:updated` events        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **`DiagnosticTest`**: `id`, `code`, `nameEn`, `nameTe`, `category` (8 core categories), `parameterCount`, `parametersIncluded[]`, `fastingRequired`, `fastingHours`, `tatHours`, `sampleTube` (`EDTA Lavender Top`, `SST Gold Top`, `Fluoride Grey Top`), `mrp`, and `labPrices` mapped across `Thyrocare`, `Tata 1mg`, `Healthians`, `Lupin Diagnostics`, and `Apollo Diagnostics`.
- **`EncryptedBooking`**: `bookingId` (`RP-2026-XXXX`), `createdAt`, `patientName`, `age`, `gender`, `familyMemberRelation`, `mobileNumber` (with masked view + AES-256-GCM encrypted payload), `collectionDate`, `timeSlot`, `selectedLab`, `selectedTests[]`, `totalTestPrice` (`convenienceFee: 0`, `homeCollectionFee: 0`), `gpsCoordinates`, `googleMapsUrl`, `addressLandmark`, `paymentStatus`, `assignedPhlebotomist`, `trackingStage` (1 to 5), `etaMinutes`, `trackingHistory[]`, `encryptionMetadata` (`algorithm: 'AES-256-GCM'`, `ivHash`, `cipherPreview`, `verified: true`), and `sampleReportMetrics[]`.
- **`PhlebotomistPartner`**: `id`, `fullName`, `mobileNumber`, `qualification`, `registrationNumber`, `experienceYears`, `previousLab`, `hasTwoWheeler`, `serviceablePincodes[]`, `availableSlots[]`, `verified`.
- **`FamilyMemberProfile`**: `id`, `name`, `relation`, `age`, `gender`, `biomarkerHistory` (time-series points for `HbA1c`, `FBS`, `TSH`, `Vitamin D`, `Total Cholesterol`).

### Interactive Component & State Mapping
- **Per-Card Lab Price Selector**: Changing the selected lab dropdown on any test card recalculates the displayed price, `% Saved`, `₹ Saved off MRP`, and updates the cart total if the test is already selected.
- **Voice Search & AI Prescription Upload**:
  - Clicking the Voice Search mic starts `webkitSpeechRecognition` / `SpeechRecognition` in `en-IN` or `te-IN` and filters the catalog live.
  - Uploading a prescription image (or selecting a sample clinical prescription) calls `/api/gemini/parse-rx`, highlights matched tests with clinical reasoning, and lets the user add all matched tests at the lowest combined lab price in one click.
- **Single-Screen Booking, GPS & UPI QR**:
  - Clicking **"Detect Live GPS Location"** invokes `navigator.geolocation.getCurrentPosition` (with an instant Hyderabad/Secunderabad high-accuracy fallback if browser location permission is blocked in the preview iframe) to populate `https://maps.google.com/?q=lat,lng`.
  - The UPI QR Canvas dynamically renders a scannable QR code for `upi://pay?pa=8333821121@ybl&pn=Rakthapariksha&am=${total}&cu=INR`.
  - Submitting the form stores the AES-256 encrypted record on the server, broadcasts `booking:created` over WebSocket, opens the downloadable PDF Receipt modal, and launches `https://wa.me/918333821121?text=...`.
- **Real-Time Tracking & Admin Dispatch (`RP2026`)**:
  - Admin updates to phlebotomist assignment, tracking stage, or ETA broadcast `booking:updated` over WebSocket, updating the patient's progress stepper, ETA badge, and map pin in real time.
