# Part 2: Database Schema & Security Rules

PharmaLedger stores its data in **Google Cloud Firestore**, a real-time NoSQL document database. This guide details document schemas and the security rules enforcing role-based access control (RBAC).

---

## 🗃️ Firestore Schema Reference

### 1. `users` Collection
Stores user profiles and roles. Document IDs are set to match the user's Firebase Auth `UID`.
- `uid` (string): Unique identifier from Firebase Authentication.
- `email` (string): User's primary login email.
- `displayName` (string): User's full name.
- `role` (string): Roles can be `"admin"` or `"attendant"`.
- `active` (boolean): Flag to disable/enable user logins instantly.
- `createdAt` (timestamp): Profile creation timestamp.

---

### 2. `drugs` Collection
Main inventory container. It uses denormalized sum fields (`totalStock` and `nearestExpiry`) for fast queries.
- `name` (string): Commercial drug name (e.g., `"Benylin Cough Syrup"`).
- `genericName` (string): Active drug substance (e.g., `"Diphenhydramine"`).
- `category` (string): Section (e.g., `"Syrup"`, `"Analgesics"`, `"Antibiotics"`).
- `form` (string): Type (e.g., `"tablet"`, `"syrup"`, `"injection"`, `"ointment"`).
- `reorderThreshold` (number): Stock level at which warnings fire (e.g., `15`).
- `sellingPrice` (number): Unit selling price in Naira (e.g., `2500`).
- `supplier` (string): Supplier name.
- `totalStock` (number): Sum of **non-expired** units remaining in active batches.
- `nearestExpiry` (timestamp | null): Expiry timestamp of the earliest expiring **non-expired** batch with stock > 0.
- `createdAt` (timestamp): Creation timestamp.
- `updatedAt` (timestamp): Last edit timestamp.

#### ↳ `batches` Subcollection (`/drugs/{drugId}/batches/{batchId}`)
Each drug has nested batch documents tracking production groups.
- `batchNumber` (string): Exporter/Supplier identifier (e.g., `"COUGH-OK"`).
- `expiryDate` (timestamp): Official expiry date of this batch.
- `quantity` (number): Number of units currently available in this specific batch.
- `costPrice` (number): Unit cost paid to suppliers in Naira (used for profit calculations).
- `receivedAt` (timestamp): Timestamp of stock receipt.

---

### 3. `patients` Collection
Contains medical records and allergies used for safety checks during checkout.
- `name` (string): Full name.
- `email` (string): Patient's email (optional).
- `phone` (string): Telephone number.
- `gender` (string): `"male"` or `"female"`.
- `dateOfBirth` (string): Patient date of birth (`YYYY-MM-DD`).
- `allergies` (array of strings): Known allergy terms (e.g., `["penicillin", "aspirin"]`).
- `createdAt` (timestamp): Date of profile registration.
- `updatedAt` (timestamp): Last profile modification time.

---

### 4. `prescriptions` Collection
Tracks clinical prescription orders.
- `patientId` (string): Parent patient document ID.
- `patientName` (string): Cached patient name for display.
- `doctorName` (string): Name of the doctor who issued the prescription.
- `notes` (string): Optional dosage instructions or guidelines.
- `status` (string): Can be `"pending"`, `"partially_fulfilled"`, or `"fulfilled"`.
- `createdAt` (timestamp): Date prescription was registered.
- `fulfilledAt` (timestamp | null): Date prescription was completed.
- `items` (array of maps):
  - `drugId` (string): Referenced drug doc ID.
  - `drugName` (string): Cached drug name.
  - `quantityRequested` (number): Total units prescribed.
  - `quantityDispensed` (number): Units already handed out.

---

### 5. `sales` Collection
Financial transaction audit logs. Document records in this collection are strictly **immutable**.
- `type` (string): Can be `"otc"` (Over-The-Counter) or `"prescription"`.
- `prescriptionId` (string | null): Linked prescription document ID if filled.
- `patientId` (string | null): Patient reference if registered.
- `patientName` (string | null): Cached name or `"Walk-in Customer"`.
- `total` (number): Total sale revenue in Naira.
- `paymentMethod` (string): `"cash"`, `"card"`, or `"transfer"`.
- `soldBy` (string): Attendant's user UID.
- `soldByName` (string): Attendant's display name.
- `receiptUrl` (string | null): Uploaded Cloudinary scan of the paper receipt.
- `createdAt` (number): Epoch timestamp (ms) of the checkout transaction.
- `items` (array of maps):
  - `drugId` (string): Referenced drug doc ID.
  - `drugName` (string): Cached name.
  - `batchId` (string): Document ID of the batch stock was pulled from.
  - `batchNumber` (string): Batch code.
  - `quantity` (number): Units sold.
  - `unitPrice` (number): Price sold at.
  - `costPrice` (number): Cost price of stock (retained to compute margin reports).

---

### 6. `notifications` Collection (`/notifications/{uid}/items/{notifId}`)
Per-user alert mailboxes.
- `title` (string): Short alarm title (e.g. `"Low Stock Warning"`).
- `message` (string): Description.
- `type` (string): `"low_stock"`, `"expiry_warning"`, or `"system"`.
- `read` (boolean): Flag marking read/unread state.
- `createdAt` (timestamp): Alert generation timestamp.

---

### 7. `settings` Collection (`settings/global`)
Configuration parameters.
- `thresholdDays` (number): Target threshold buffer to warn for expiring batches (default `30` days).

---

## 🔒 Security Rules (`firestore.rules`)

Role-Based Access Control is enforced natively in the database. Client calls bypass client logic and query this rules file directly.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    function isActive() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.active == true;
    }
    
    ...
```

### Access Control Rules Matrix:

| Collection | Read Rule | Write Rule | Notes |
| :--- | :--- | :--- | :--- |
| `/users/{uid}` | Authenticated + Active | Admin Only | Prevents staff from changing roles or enabling disabled accounts. |
| `/drugs/{drugId}` | Authenticated + Active | Admin Only | Attendants can search inventory, but cannot edit drug details. |
| `/drugs/{id}/batches/*` | Authenticated + Active | Admin Only (Client) | **Attendants cannot write directly on batches.** Stock reductions go through APIs using Admin SDK. |
| `/patients/*` | Authenticated + Active | Authenticated + Active | All staff can register or update patient files. |
| `/prescriptions/*` | Authenticated + Active | Authenticated + Active | All staff can create and edit prescriptions. |
| `/sales/*` | Authenticated + Active | Authenticated + Active (Create only) | Sales documents are **create-only**; editing or deleting sales is forbidden. |
| `/notifications/{uid}/*` | Owning User Only | Owning User (Read/Update) | Secure personal alert mailboxes. |
| `/settings/*` | Authenticated + Active | Admin Only | Only administrators can modify global alert rules. |
