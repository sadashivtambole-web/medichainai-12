# DrugChain — Medicine Authenticity & Drug Traceability Platform

An enterprise-grade, full-stack pharmaceutical traceability and anti-counterfeiting platform built with **React**, **Node.js / Express**, **MongoDB**, a custom **Proof-of-Authority (PoA) DrugChain blockchain**, **HMAC-SHA256 signed QR codes**, and **Google Gemini Multimodal AI & OCR verification**.

---

## 1. System Architecture

The platform operates on a single authoritative multi-layer architecture where all authenticity decisions, cryptographic hashing, and state transitions are validated by the backend engine:

```
                      ┌────────────────────────────────────────┐
                      │            React Frontend              │
                      │  (Role Portals + Public Scanner & POS) │
                      └───────────────────┬────────────────────┘
                                          │ Axios API Layer (Bearer JWT)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          Node.js / Express API         │
                      │   - Helmet, CORS, Rate Limiters        │
                      │   - JWT Auth & Role-Based RBAC         │
                      │   - Joi Schema Input Validators        │
                      │   - Multer Disk Storage & File Filters │
                      └──────┬──────────────────────────┬──────┘
                             │                          │
           ┌─────────────────▼─────────┐      ┌─────────▼─────────────────┐
           │     MongoDB Database      │      │    DrugChain Blockchain   │
           │  - Users & Approval State │      │  - Custom PoA Engine      │
           │  - Medicine Records       │      │  - SHA-256 Merkle Trees   │
           │  - Supply-Chain Custody   │      │  - Immutable Blocks       │
           │  - Verification Scan Logs │      │  - Genesis Root Authority │
           │  - AI Vision Analysis Log │      │  - Disk Persistence       │
           └───────────────────────────┘      └───────────────────────────┘
```

### Central Authenticity Verification Flow

```
                      Scanned QR / Entered Batch
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │ 1. QR Cryptographic Check│ ── HMAC-SHA256 Signature Validation
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │ 2. MongoDB Record Lookup │ ── Canonical Identity Matching
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │ 3. DrugChain Ledger Audit│ ── Deterministic SHA-256 Block Match
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │ 4. Supply-Chain Custody  │ ── 3-Tier Sequence (Mfr ➔ Dist ➔ Pharm)
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │ 5. Expiry Date Check     │ ── Deterministic Backend Date Audit
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │ 6. AI & OCR Visual Audit │ ── Gemini Vision / Graceful Fallback
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │ 7. Anti-Cloning Analysis │ ── Scan Frequency & Seal Tampering
                     └────────────┬─────────────┘
                                  ▼
                 Weighted Authenticity Score (0 – 100)
                 Authenticity Status: AUTHENTIC | REVIEW | SUSPICIOUS | LIKELY COUNTERFEIT
```

---

## 2. Technology Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 3, React Router 6, Axios, Lucide React, HTML5-QRCode, JSQR, QRCode.react, React Hot Toast.
- **Backend**: Node.js (ES Modules), Express 4, Mongoose 8 (MongoDB), Ethers 6 (crypto utilities), BcryptJS, JSONWebToken, Helmet, Express-Rate-Limit, Joi, Multer, Nodemailer.
- **Blockchain**: Custom Proof-of-Authority (PoA) `DrugChain` ledger with SHA-256 block hashing, Merkle trees, and disk persistence (`backend/blockchain/data/chain.json`).
- **AI & OCR**: Google Gemini Multimodal Vision API (`gemini-flash-latest`) with robust zero-crash fallback mode.

---

## 3. User Roles & Access Control (RBAC)

| Role | Permissions & Responsibilities | Approval Required? |
|---|---|---|
| **Creator / Admin** | Super-administrator; inspects blockchain audits, approves/rejects/suspends professional accounts, monitors network metrics. | Auto-provisioned on startup |
| **Manufacturer** | Registers new medicine batches, mints DrugChain registration blocks, generates HMAC-SHA256 signed QR codes. | **Yes** (Creator review) |
| **Distributor** | Views incoming transfers from manufacturers, confirms transit custody on-chain, forwards batches to verified pharmacies. | **Yes** (Creator review) |
| **Pharmacy** | Receives forwarded batches, confirms shelf receipt on-chain, performs point-of-sale verification before dispensing. | **Yes** (Creator review) |
| **Customer** | Scans QR codes or enters batch numbers publicly; views 6-layer authenticity breakdown and verification score. | **No** (Public access) |

---

## 4. Key Security Features

1. **HMAC-SHA256 Signed QR Tokens**: Every generated QR code contains a cryptographically signed payload (`{mId, bId, ts}.signature`). Forged or altered signatures are immediately detected and flagged as `INVALID_SIGNATURE`.
2. **Strict RBAC & Account Lifecycle**: Professional users are initialized with `accountStatus: "PENDING"`. Any attempt to log in or access endpoints while pending, rejected, or suspended results in `403 Forbidden`.
3. **Deterministic Blockchain Hashing**: Altering even a single character in a medicine's name, batch ID, or expiry date invalidates the block hash (`CHAIN_INVALID` / `DATA_INTEGRITY_MISMATCH`).
4. **Supply-Chain Custody Anomaly Detection**: Direct custody jumps (e.g. Manufacturer direct to Pharmacy skipping Distributor) are automatically caught and flagged as `UNAUTHORIZED_CUSTODY_HOP`.
5. **Anti-Cloning Scan Frequency Counter**: Verification scans increment an internal scan counter. If a batch is scanned more than 15 times, it is flagged with `HIGH` QR reuse risk, preventing mass packaging duplication.
6. **Zero-Secret Leakage**:
   - `UserSchema.methods.toSafeObject()` strips passwords before returning responses.
   - `.env` files are tracked in `.gitignore` and sanitized.
   - Gemini API keys and JWT secrets are strictly kept backend-only.
7. **Malicious File Upload Protection**: Multer filters strictly forbid executable extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, etc.) and enforce a 10MB limit.

---

## 5. Automated Test Suites & Regression Verification

The platform contains **5 comprehensive test suites** covering unit, integration, adversarial, and end-to-end master workflows:

```bash
cd backend
npm test
```

### Verified Test Summary

| Test Suite | Purpose | Tests | Status |
|---|---|:---:|:---:|
| `test-drugchain.js` | Genesis block, SHA-256 Merkle root, PoA consensus, tamper detection, persistence | 30 | **30 PASSED / 0 FAILED** |
| `test-verification-engine.js` | 6-layer multi-signal scoring, signed QR tokens, tamper detection, expiry rules | 25 | **25 PASSED / 0 FAILED** |
| `test-ai-module.js` | Gemini vision, image pre-flight checks, OCR normalization, zero-crash fallback | 36 | **36 PASSED / 0 FAILED** |
| `test-frontend-integration.js` | Full API contract verification, role routing, lifecycle transition, frontend mocks removed | 41 | **41 PASSED / 0 FAILED** |
| `test-part5-master-audit.js` | Master end-to-end integration, RBAC 403 enforcement, adversarial checks, upload security | 89 | **89 PASSED / 0 FAILED** |
| **TOTAL** | **Entire Platform Integration & Quality Audit** | **221** | **221 PASSED / 0 FAILED (100%)** |

---

## 6. How to Run the Platform Locally

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally on `mongodb://localhost:27017`

### Step 1: Start Backend API

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment (copy example if not present)
cp .env.example .env

# 3. Start development server with live reload
npm run dev
# The API will be available at http://localhost:5000/api
```

### Step 2: Start Frontend Client

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
# The Web App will be available at http://localhost:5173
```

### Step 3: Run Full Automated Test Suite

```bash
cd backend
npm test
```

---

## 7. End-to-End Demonstration Walkthrough

1. **Creator Setup**: Log in as `sadashivtambole@gmail.com` / `Shiva@123` at `/login`. View the dashboard and audit the DrugChain ledger.
2. **Manufacturer Onboarding**: Register an account with role `Manufacturer` at `/register`. Account is marked `PENDING`. Log back in as Creator, open the *Approvals* tab, and click **Approve**.
3. **Medicine Registration**: Log in as the approved Manufacturer, navigate to the dashboard, and click **Register Medicine**. Enter batch details (e.g. `Amoxicillin 500mg`, batch `BATCH-2026-001`). Click **Register**. A DrugChain block is minted and an HMAC-SHA256 QR code is generated.
4. **Distributor Custody**: Register and approve a Distributor. Log in as the Distributor, find the batch in *Incoming Transfers*, click **Confirm Receipt** (records block #2), then click **Forward to Pharmacy** (records block #3).
5. **Pharmacy Stocking**: Register and approve a Pharmacy. Log in as Pharmacy, locate the batch, and click **Confirm Shelf Stocking** (records block #4).
6. **Customer Verification**:
   - Open `/customer` or `/verify`.
   - Scan or enter the signed QR code / batch ID.
   - Observe the real-time **6-Layer Multi-Signal Audit**:
     - Layer 1 (QR HMAC): `VERIFIED`
     - Layer 2 (Database): `MATCHED`
     - Layer 3 (DrugChain): `VERIFIED`
     - Layer 4 (Supply Chain): `VALID`
     - Layer 5 (Expiry): `VALID`
     - Authenticity Score: `100%` (Status: `AUTHENTIC`)
7. **Negative / Adversarial Verification**:
   - Scan a modified or fake QR string (e.g. `FAKE-BATCH-999`).
   - The platform cleanly reports `LIKELY COUNTERFEIT`, Score `0%`, with clear explainable risk reasons.

---

## 8. License

Developed for Academic Research & Demonstration in Pharmaceutical Traceability & Anti-Counterfeit Technologies.
