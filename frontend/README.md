# Fake Drug Detection System — frontend

React + Vite client for the medicine traceability platform: role-based portals for
Creator, Manufacturer, Distributor, Pharmacy and Customer, with QR scanning,
AI/OCR label checks and blockchain-backed verification.

Stack: React 19, Vite 6, React Router 6, Tailwind CSS 3, axios, lucide-react,
react-hot-toast, html5-qrcode / jsqr, qrcode.react.

## Running it

The frontend expects the Express API in `../backend` to be running.

```bash
# terminal 1 — API
cd backend
npm install
cp .env.example .env      # then fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev               # http://localhost:5000

# terminal 2 — frontend
cd frontend
npm install
npm run dev               # http://localhost:5173
```

`src/services/api.js` reads `VITE_API_URL` and falls back to
`http://localhost:5000/api`. Copy `.env.example` to `.env` to override it.

## Routes

| Route                | Access                | Page              |
| -------------------- | --------------------- | ----------------- |
| `/`, `/home`         | public                | Home (role picker) |
| `/login`             | public                | Login             |
| `/register`          | public                | Register          |
| `/change-password`   | after first login     | ChangePassword    |
| `/profile`           | any approved user     | Profile           |
| `/verify/:id`        | any approved user     | VerifyResult      |
| `/creator/*`         | Creator               | Creator console   |
| `/manufacturer`      | Manufacturer          | Manufacturer      |
| `/distributor`       | Distributor           | Distributor       |
| `/pharmacy`          | Pharmacy              | Pharmacy          |
| `/customer`          | Customer              | Customer          |

`/creator/*` covers the console's tabs (`/creator/approvals`, `/creator/users`,
`/creator/medicines`, `/creator/transfers`) — `Creator.jsx` derives the active tab
from the URL. Access control lives in `components/layout/ProtectedRoute.jsx`, which
also redirects users to their own dashboard if they hit someone else's.

## Project layout

```
frontend/
  index.html                 shell, mounts #root, loads /src/main.jsx
  vite.config.js             Vite + React plugin
  tailwind.config.js         Tailwind content globs
  postcss.config.js          Tailwind + Autoprefixer
  src/
    main.jsx                 entry: ErrorBoundary > BrowserRouter > AppProvider
    App.jsx                  route table only
    index.css                design system (CSS variables, .btn-* helpers, fonts)
    context/AppContext.jsx   session, medicines, transfers, blockchain status
    services/                api.js (axios + JWT interceptors) and per-domain services
    pages/                   Home, Login, Register, Profile, ChangePassword,
                             Creator, Manufacturer, Distributor, Pharmacy,
                             Customer, VerifyResult
    components/
      layout/                Header, Background, ProtectedRoute
      ui/                    RoleCard, StatusBadge, QRDisplay, TransferTimeline,
                             BlockchainStatus, ApproverBar
      forms/                 CameraScanner, QRImageUpload, FileUpload,
                             AIVerificationPanel
      common/ErrorBoundary.jsx
```

Each page renders its own `<Toaster />`, so there is deliberately no global one in
`main.jsx`.

## Housekeeping

Leftovers from the original Vite starter that are no longer imported and can be
deleted: `src/main.ts`, `src/counter.ts`, `src/style.css`, `src/assets/`,
`tsconfig.json`, `public/icons.svg`, and the stale `dist/` folder.
