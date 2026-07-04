# PharmaLedger Documentation Hub

Welcome to the **PharmaLedger** documentation hub. This repository contains the complete codebase of the PharmaLedger Pharmacy Management & POS System. 

This documentation suite is written in a detailed, clear, and logical format so that **anyone**—including non-technical stakeholders, project examiners, and future developers—can easily understand how the application works, how its data flows, and how to maintain or transfer the project.

---

## 📖 Table of Contents

Navigate through the project documentation using the guides below:

### 1. [System Architecture & Tech Stack](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/01_architecture_and_tech_stack.md)
*Overview of the software stack (Next.js 16, TypeScript, Firebase, Tailwind-Free CSS), directory structure, styling system, and deployment configurations.*

### 2. [Database Schema & Security Rules](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/02_database_schema_and_rules.md)
*Detailed documentation of the Firestore collection schemas (users, drugs, batches, patients, prescriptions, sales, notifications, settings) and how Firestore Security Rules enforce access control.*

### 3. [Authentication & Routing Flow](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/03_authentication_and_routing.md)
*Step-by-step description of the user sessions, login/logout mechanisms, the client-side authentication context, and how the Edge Middleware guards protected routes.*

### 4. [FEFO Stock Management & Concurrency](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/04_fefo_and_concurrency.md)
*A deep dive into the system's most load-bearing feature: First-Expired, First-Out (FEFO) stock deduction, transaction isolation, strict exclusion of expired units, and how database locking prevents negative stock.*

### 5. [API Endpoints Reference](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/05_api_endpoints.md)
*Technical specifications for the application's backend serverless API routes, request payloads, response structures, and authorization checks.*

### 6. [Page-by-Page Feature Guide](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/06_pages_and_features_guide.md)
*An operational guide detailing every view in the application (Inventory, Patients, POS Checkout, Prescriptions, Reports/Analytics, Settings, and Staff Management), including role requirements and user interactions.*

---

## 🚀 Transferring the Project to Another Person
To hand over this project to a new developer or examiner, they will need:
1. **GitHub Access**: Transfer or share the repository code.
2. **Firebase Console Access**: Add their email to the Firebase project or create a new Firebase project and configure the `.env.local` parameters as detailed in [Architecture & Tech Stack](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/docs/01_architecture_and_tech_stack.md).
3. **Cloudinary Access**: Configure an unsigned upload preset for receipts as explained in [README.md](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/README.md).
