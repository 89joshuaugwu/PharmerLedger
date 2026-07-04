# Part 1: Architecture & Tech Stack

This document details the technological foundations, project folder structure, design system, and deployment configuration of **PharmaLedger**.

---

## 🛠️ Technological Stack

PharmaLedger is built using a modern, fast, and $0-cost stack:

1. **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
   - Leverages React Server Components (RSC) for page structure and Serverless API Routes for database transactions.
   - Built using **Turbopack** for rapid local compilation.
2. **Database & Backend Services**: [Firebase (Firestore & Authentication)](https://firebase.google.com/)
   - **Firestore**: A real-time, NoSQL document database used to store all inventory, patient records, prescriptions, sales logs, settings, and notifications.
   - **Auth**: Fully managed identity service handling secure email/password credential storage, token validation, and password rules.
   - **Firebase Admin SDK**: Serverless wrapper used in Next.js API endpoints to bypass client security rules for high-integrity operations (like stock deduction and user creation) and perform multi-document Firestore transactions.
3. **Image & File Hosting**: [Cloudinary](https://cloudinary.com/)
   - Utilizes unsigned upload presets to post scanned prescription sheets and payment receipt proofs directly from the client without exposing secure private keys.
4. **Styling**: [Vanilla CSS & CSS Modules](https://developer.mozilla.org/en-US/docs/Web/CSS)
   - Tailwind-free design. Uses standard CSS variables (`app/globals.css` / `index.css`) to define cohesive color systems, layouts, glassmorphism, responsive grids, and micro-animations.
5. **Language**: [TypeScript (TS)](https://www.typescriptlang.org/)
   - Enforces strict contract structures (interfaces) for data models like `Drug`, `Patient`, `Prescription`, and `Sale` to catch errors at compilation time.

---

## 📁 Directory Structure

```
/
├── .env.local.example     # Reference list of required environment variables
├── adminsdk.json          # Firebase service account credentials (local testing)
├── firestore.rules        # Security rules uploaded directly to Firebase Console
├── firestore.indexes.json # Composite indexes needed for query optimization
├── next.config.ts         # Next.js bundler settings
├── tsconfig.json          # TypeScript compiler configurations
│
├── /app                   # Next.js Page & API Routing
│   ├── layout.tsx         # Root HTML layout and font loading
│   ├── middleware.ts      # Redirects users to login if session cookie is missing
│   │
│   ├── /(public)          # Publicly accessible routes (before logging in)
│   │   ├── auth/login     # Login Page Component
│   │   └── page.tsx       # Landing page (redirects to /dashboard if logged in)
│   │
│   ├── /(dashboard)       # Protected routes (requires authentication)
│   │   ├── dashboard      # Root layout containing the sidebar and sub-pages
│   │   │   ├── pos        # POS Checkout Page (cart, patient details, receipt)
│   │   │   ├── inventory  # Inventory Table & Drug addition forms
│   │   │   ├── patients   # Patient list and profile forms
│   │   │   ├── prescriptions # Prescription creator & fulfillment view
│   │   │   ├── reports    # Analytics graphs, expiry warnings, revenue logs
│   │   │   ├── staff      # User lists & role management forms (Admin-only)
│   │   │   └── settings   # Reorder thresholds and store config
│   │
│   └── /api               # Serverless Backend API Routes
│       ├── /sales/checkout        # Cart processing endpoint
│       ├── /prescriptions/[id]/fulfill # Prescription dispensing endpoint
│       └── /users/create          # Admin-restricted staff account creator
│
├── /components            # Reusable UI Component Library
│   ├── /ui                # Atoms: low-level design primitives (Button, Input, Select, Card)
│   ├── /molecules         # Composites: CartItem, PatientSearchBar, AllergyBanner, Receipt
│   ├── /organisms         # Layout templates: POSCheckout, InventoryTable, ReportsDashboard
│   └── /shells            # Navigation wrappers: AppShell (sidebar/nav), PublicShell
│
├── /lib                   # Business Logic & Infrastructure Layer
│   ├── auth.ts            # Client login/logout and session cookie setters
│   ├── AuthContext.tsx    # React Context tracking current logged-in user state
│   ├── firebase.ts        # Client Firebase SDK configuration
│   ├── firebase-admin.ts  # Server Firebase Admin SDK configuration
│   ├── fefo.ts            # Transactional First-Expired First-Out stock calculations
│   └── allergy.ts         # Substring-based allergy conflict detection
│
└── /types                 # Type Declarations
    ├── drug.ts            # Drug & Batch object contracts
    ├── patient.ts         # Patient document structure
    ├── prescription.ts    # Prescription document structure
    ├── sale.ts            # POS sales and cart structures
    └── user.ts            # User and Role declarations (admin vs attendant)
```

---

## 🎨 Design System & Styling (Tailwind-Free)

PharmaLedger implements a premium, modern design without relying on utility libraries like TailwindCSS. 

### Core CSS Architecture:
- **Global Variables (`app/globals.css`)**: Defines design tokens for light and dark modes, border radii, transitions, shadows, and fonts (Inter & Outfit).
- **Responsive Layout**: Achieved through standard CSS Flexbox and CSS Grids. Grids adjust automatically between desktop views (e.g. 5-column grid for POS) and mobile cards.
- **Glassmorphism**: Modals, cards, and dropdown lists employ transparent backgrounds, subtle borders, and `backdrop-filter: blur(...)` to look extremely premium.
- **Micro-Animations**: Hover animations on buttons and input focus rings utilize hardware-accelerated transitions (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).

---

## ☁️ Deployment Architecture

PharmaLedger is built to run serverless on platforms like Vercel. 

```
                                  +-------------------+
                                  |   Vercel Edge     |
                                  |   Middleware      |
                                  +---------+---------+
                                            |
                         +------------------+------------------+
                         | (Match /dashboard/* routes)         |
                         | Checks pl_session cookie            |
                         +------------------+------------------+
                                            |
                                  +---------v---------+
                                  |  Next.js Server   |
                                  | (Serverless APIs) |
                                  +----+-----+-----+--+
                                       |     |     |
      +--------------------------------+     |     +---------------------------------+
      |                                      |                                       |
+-----v-----+                          +-----v-----+                           +-----v-----+
| Firebase  |                          | Firestore |                           |Cloudinary |
| Auth      |                          | Database  |                           |  Media    |
+-----------+                          +-----------+                           +-----------+
```

### Necessary Configuration Steps:
1. **Middleware Check**: Vercel Edge Middleware reads requests targeting `/dashboard/*`. If a custom `pl_session` cookie is not present, it issues a 307 redirect to the login page immediately at the edge.
2. **Environment Configuration**: Set all credentials in the Vercel dashboard. The Admin Private Key is read from a environment variable (`FIREBASE_ADMIN_PRIVATE_KEY`) containing escaped newlines (`\n`). `lib/firebase-admin.ts` parses this string correctly at startup.
3. **Firestore Security Upload**: Ensure the rules in `firestore.rules` are published to Firestore so that direct client calls cannot alter critical system data.
