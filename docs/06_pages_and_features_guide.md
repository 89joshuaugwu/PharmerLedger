# Part 6: Page-by-Page Feature Guide

This guide details the layout, role requirements, components, and user actions for every page in the **PharmaLedger** application.

---

## 🔐 1. Staff Login Page (`/auth/login`)

- **Role Requirement**: Public access (No login needed).
- **Core Component**: `LoginPage` component.
- **Description**: Secure credential form. Staff enter their email and password.
- **Functionality**:
  - Validates active status before allowing dashboard entry.
  - Redirects users attempting to access dashboard routes back to their originally requested URL path via a `?redirect=` search query parameter.
  - Shows custom toast alerts if the account is deactivated (`"Your account is inactive. Contact admin."`) or if credentials are incorrect.

---

## 📊 2. Main Analytics Dashboard (`/dashboard`)

- **Role Requirement**: Authenticated & Active (`admin` or `attendant`).
- **Core Component**: `DashboardHome` overview.
- **Description**: The hub for pharmacy stats and operations.
- **Visual Features**:
  - **KPI Cards**: Four dashboard metrics displaying:
    1. **Total Revenue** (Calculated from OTC sales).
    2. **Prescriptions Filled** (Total completed sheets).
    3. **Low Stock Warnings** (Count of drugs below reorder levels).
    4. **Expiring Batches** (Count of batches expiring within the threshold window).
  - **Recent Activity Table**: Real-time listing of the latest 5 completed sales.
  - **Real-Time Notification Indicator**: Bell icon in the header showing active notifications.

---

## 📦 3. Inventory Management (`/dashboard/inventory`)

- **Role Requirement**:
  - **Read (Browse/Search)**: All staff.
  - **Write (Add Drug, Add Batch)**: **Admin Only**.

### sub-pages:
1. **Inventory Table View (`/dashboard/inventory`)**:
   - Lists drugs with fields: Drug Name, Generic Name, Category, Total Stock, Nearest Expiry, and Unit Price.
   - Status indicators dynamically flag stock warnings (`"Low Stock"`, `"Out of Stock"`) and expiry conditions (`"Expiring Soon"`).
2. **Add New Drug (`/dashboard/inventory/new`)**:
   - Admin form to add drugs (Commercial Name, Generic Name, Category, Form, Reorder Threshold, Supplier, and Selling Price).
3. **Drug Detail Page (`/dashboard/inventory/[drugId]`)**:
   - Displays metadata and historical logs.
   - Includes **Batch Table** showing a breakdown of inventory batches, sorting **earliest-expiry batches first**.
   - Includes the **Add Batch Form** (Admin-only) to receive new stock with quantity, cost price, and expiry date.

---

## 👤 4. Patient Directory (`/dashboard/patients`)

- **Role Requirement**: Authenticated & Active (`admin` or `attendant`).

### sub-pages:
1. **Patient Directory (`/dashboard/patients`)**:
   - Searchable table of registered patients. Displays patient name, phone number, and a list of registered allergies.
2. **Add Patient (`/dashboard/patients/new`)**:
   - Registration form capturing Name, Phone, Email, DOB, Gender, and an **Allergies list** (comma-separated terms).
3. **Patient Profile (`/dashboard/patients/[id]`)**:
   - Detailed patient card.
   - Displays prescription history and whether sheets are pending or fulfilled.

---

## 🛍️ 5. Point of Sale (POS) Checkout (`/dashboard/pos`)

- **Role Requirement**: Authenticated & Active (`admin` or `attendant`).
- **Core Component**: `POSCheckout` in `components/organisms/POSCheckout.tsx`.
- **Description**: The core sales register interface.

```
+------------------------------------------------------------+
|                       POS REGISTER                         |
+------------------------------------+-----------------------+
|  Add Drugs                         | Cart                  |
|  [ Search drug name...       ]     | - Paracetamol (x2)    |
|  * Paracetamol (100 units left)    | - Cough Syrup (x1)    |
|                                    |                       |
|  Patient Type                      | Total: NGN 4,500      |
|  (Walk-in)  [Registered Patient]   |                       |
|  [ Select Patient...         ]     | [ Payment Method v ]  |
|  ⚠️ Allergy: Penicillin Detected    |                       |
|                                    | [ Complete Checkout ] |
+------------------------------------+-----------------------+
```

### Key Workflows:
1. **Adding Items**: Type in the search input to filter active drugs. Click a search result to add it to the cart.
2. **Allergy Check**: If a registered patient is selected, adding a drug whose generic name matches an allergy flags the `AllergyWarningBanner`. The cart blocks checkout until the attendant acknowledges the warning.
3. **Stock Lock**: The checkout button is disabled if cart quantities exceed available non-expired stock.
4. **Receipt Printout**: Upon checkout, a modal displays a print-ready invoice. Attendants can capture payment receipts via scanner or upload images to Cloudinary.

---

## 📋 6. Prescriptions Hub (`/dashboard/prescriptions`)

- **Role Requirement**: Authenticated & Active (`admin` or `attendant`).

### sub-pages:
1. **Prescriptions Table (`/dashboard/prescriptions`)**:
   - Lists sheets with status indicators (`"pending"`, `"partially_fulfilled"`, or `"fulfilled"`).
2. **New Prescription (`/dashboard/prescriptions/new`)**:
   - Selection tool to search patients, specify drugs, quantities, and input doctor details.
3. **Prescription Detail & Fulfillment View (`/dashboard/prescriptions/[id]`)**:
   - Displays a checklist of requested drugs, showing:
     `[Requested Qty] · [Already Dispensed] · [Available In-Stock (excluding expired)]`
   - Includes the **Fulfill Prescription** button. Pressing this calls the fulfillment API, updates stock, prints invoices, and changes status.

---

## 📈 7. Reports & Alerts (`/dashboard/reports`)

- **Role Requirement**: Authenticated & Active (`admin` or `attendant`).
- **Core Component**: `ReportsDashboard` in `components/organisms/ReportsDashboard.tsx`.
- **Functionality**:
  - Displays **Sales Analytics** tracking weekly revenue trends.
  - Lists **Expired / Expiring Stock** reports grouping batches that have expired or are expiring soon, allowing staff to quickly clear shelves.
  - Lists **Low Stock Alert Reports** detailing drugs that need to be reordered from suppliers.

---

## ⚙️ 8. System Settings (`/dashboard/settings`)

- **Role Requirement**: **Admin Only**.
- **Functionality**:
  - Configures the global `thresholdDays` parameter (e.g. 30 days or 60 days) to flag expiring batches across reports and tables.

---

## 👥 9. Staff & Account Control (`/dashboard/users`)

- **Role Requirement**: **Admin Only**.
- **Core Component**: `StaffManagementTable` in `components/organisms/StaffManagementTable.tsx`.
- **Functionality**:
  - Displays all staff user accounts with name, email, role, and status.
  - Includes the **Add Staff Form** to create accounts via `/api/users/create`.
  - Includes a **Deactivate Toggle** that sets the user's `active` status in Firestore to `true` or `false`, granting admins immediate control to revoke access.
