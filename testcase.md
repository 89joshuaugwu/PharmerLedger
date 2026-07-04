# PharmaLedger Testing Playbook & Test Cases

This document provides a comprehensive suite of test cases to verify the features, workflows, and business rules of the **PharmaLedger** application. 

> [!NOTE]
> All dates are relative to the current local time **July 2026**. 
> All database writes to inventory quantities are handled server-side under strict transactional integrity (FEFO) in [fefo.ts](file:///c:/Users/JOSHUA%20ZAZA/Downloads/pharmaledger/lib/fefo.ts).

---

## Table of Contents
1. [User Authentication & Bootstrapping](#1-user-authentication--bootstrapping)
2. [Staff Management & RBAC](#2-staff-management--rbac)
3. [Inventory & FEFO (First-Expiry-First-Out)](#3-inventory--fefo-first-expiry-first-out)
4. [Patient Profiles & Allergy Check](#4-patient-profiles--allergy-check)
5. [Prescriptions & Partial Fulfillment](#5-prescriptions--partial-fulfillment)
6. [POS Checkout & Concurrency Controls](#6-pos-checkout--concurrency-controls)
7. [Reports & Analytics Dashboard](#7-reports--analytics-dashboard)

---

## 1. User Authentication & Bootstrapping

Since there is no public signup page, the first administrator must be manually bootstrapped in the Firebase console.

### Test Case 1.1: Admin Bootstrapping & Login
*   **Objective:** Bootstrapping the first admin account and successfully logging into the dashboard.
*   **Setup Steps:**
    1. Go to your **Firebase Console** -> **Authentication** -> **Users** -> Click **Add User**.
    2. Enter the following details:
        *   **Email:** `admin@pharmaledger.com`
        *   **Password:** `AdminPassword123!`
    3. Copy the generated **User UID** (e.g., `abc123xyz`).
    4. Go to **Firestore Database** -> Create a collection named `users`.
    5. Add a document with **Document ID** = `<the User UID>` and fields:
        ```json
        {
          "uid": "abc123xyz",
          "email": "admin@pharmaledger.com",
          "displayName": "Lead Admin",
          "role": "admin",
          "active": true,
          "createdAt": 1783151800000 
        }
        ```
*   **Verification Steps:**
    1. Navigate to `/auth/login`.
    2. Enter `admin@pharmaledger.com` and `AdminPassword123!`.
    3. Click **Login**.
    4. **Expected Result:** Redirected successfully to `/dashboard`. Sidebar navigation shows all tabs: *POS*, *Inventory*, *Prescriptions*, *Patients*, *Sales*, *Staff (Users)*, *Reports*, and *Settings*.

---

## 2. Staff Management & RBAC

Verify that admins can manage staff and that roles (`admin` vs `attendant`) correctly limit permissions.

### Test Case 2.1: Add Staff Member (Admin Only)
*   **Objective:** Add a new staff member with the `attendant` role.
*   **Setup Steps:**
    1. Log in as `admin@pharmaledger.com`.
    2. Navigate to `/dashboard/users` (Staff Management).
    3. Click **Add Staff** and fill in:
        *   **Display Name:** `Jane Attendant`
        *   **Email:** `jane@pharmaledger.com`
        *   **Role:** `attendant`
        *   **Password:** `JanePassword123!`
    4. Save the user.
*   **Verification Steps:**
    1. Log out of the admin account.
    2. Log in using `jane@pharmaledger.com` and `JanePassword123!`.
    3. **Expected Result:** Login succeeds. Accessing the dashboard is functional, but administrative-only paths (such as the *Staff (Users)* configuration panel) are hidden or blocked, conforming to Role-Based Access Control (RBAC).

---

## 3. Inventory & FEFO (First-Expiry-First-Out)

This section tests the core inventory and batching system. Drugs must be dispensed based on the earliest expiry date first (FEFO).

### Mock Data: Test Drugs & Batches

Use the following tables to add drugs and their batches in **Dashboard -> Inventory -> Add Drug / Add Batch**.

#### Drug 1: Paracetamol (FEFO Batch Deduction Test)
*   **Name:** `Paracetamol 500mg`
*   **Generic Name:** `Acetaminophen`
*   **Category:** `Analgesics`
*   **Form:** `tablet`
*   **Reorder Threshold:** `50`
*   **Selling Price:** `50`
*   **Supplier:** `Emzor Pharmaceuticals`

| Batch Number | Expiry Date | Quantity | Cost Price | Expiry Status (July 2026) |
| :--- | :--- | :--- | :--- | :--- |
| `PARA-26-07` | **2026-07-20** (e.g. 1784505600000) | `50` | `20` | **Expiring Soon** (< 30 days) |
| `PARA-27-12` | **2027-12-31** (e.g. 1830211200000) | `150` | `18` | **Active / OK** |

#### Drug 2: Amoxicillin (Allergy & Low Stock Alert Test)
*   **Name:** `Amoxicillin 250mg`
*   **Generic Name:** `Amoxicillin Trihydrate`
*   **Category:** `Penicillins`
*   **Form:** `capsule`
*   **Reorder Threshold:** `100`
*   **Selling Price:** `150`
*   **Supplier:** `Fidson Healthcare`

| Batch Number | Expiry Date | Quantity | Cost Price | Expiry Status (July 2026) |
| :--- | :--- | :--- | :--- | :--- |
| `AMOX-27-06` | **2027-06-30** (e.g. 1814313600000) | `40` | `80` | **Active / OK** |

*Note: The total stock of Amoxicillin is 40, which is below its Reorder Threshold of 100.*

#### Drug 3: Cough Syrup (Expired Stock Filter Test)
*   **Name:** `Benylin Cough Syrup`
*   **Generic Name:** `Diphenhydramine`
*   **Category:** `Antihistamines`
*   **Form:** `syrup`
*   **Reorder Threshold:** `10`
*   **Selling Price:** `1200`
*   **Supplier:** `Juhel Nigeria`

| Batch Number | Expiry Date | Quantity | Cost Price | Expiry Status (July 2026) |
| :--- | :--- | :--- | :--- | :--- |
| `COUGH-EXP` | **2026-05-15** (e.g. 1778889600000) | `30` | `500` | **Expired** (as of July 2026) |
| `COUGH-OK`  | **2027-08-15** (e.g. 1818288000000) | `20` | `600` | **Active / OK** |

---

### Test Case 3.1: Expiry Ordering (FEFO Layout)
*   **Objective:** Ensure that batches are listed with the earliest expiry first.
*   **Verification Steps:**
    1. Navigate to **Inventory**.
    2. Click on `Paracetamol 500mg` to open details.
    3. View the **BatchTable**.
    4. **Expected Result:** `PARA-26-07` (expiring soonest) is listed **first** in the batch table, preceding `PARA-27-12`.

### Test Case 3.2: Low Stock and Expiry Dashboard Alerts
*   **Objective:** Confirm alerts fire for low stock and expiring items.
*   **Verification Steps:**
    1. View the **Alert Bell** in the header or the alerts panel.
    2. Check the notifications listed.
    3. **Expected Results:**
        *   An alert is present for `Amoxicillin 250mg` showing **Low Stock** (Stock = 40, Threshold = 100).
        *   An alert is present for `Paracetamol 500mg` batch `PARA-26-07` indicating **Expiring Soon**.
        *   An alert is present for `Benylin Cough Syrup` batch `COUGH-EXP` indicating **Expired**.

---

## 4. Patient Profiles & Allergy Check

Tests patient records creation and soft-warning triggers for known allergies when adding items to checkout or prescriptions.

### Mock Data: Test Patients

Add these patients in **Dashboard -> Patients -> Add Patient**:

#### Patient 1: Chinedu Okafor (Allergic Patient)
*   **Name:** `Chinedu Okafor`
*   **Phone:** `08031234567`
*   **DOB:** `1990-05-14`
*   **Address:** `12 Chime Avenue, New Haven, Enugu`
*   **Allergies:** `Penicillin`, `Aspirin`

#### Patient 2: Amina Bello (Non-allergic Patient)
*   **Name:** `Amina Bello`
*   **Phone:** `09055554433`
*   **DOB:** `1995-11-20`
*   **Address:** `45 Independence Layout, Enugu`
*   **Allergies:** `None`

---

### Test Case 4.1: Allergy Conflict Warning in POS
*   **Objective:** Verify the system triggers allergy warning banners and blocks silent checkout items.
*   **Verification Steps:**
    1. Navigate to **POS**.
    2. Select **Patient:** `Chinedu Okafor`.
    3. Search and try to add `Amoxicillin 250mg` (generic name contains *Amoxicillin Trihydrate* and category is *Penicillins*, triggering a substring match against patient allergy *Penicillin*).
    4. **Expected Result:** An `AllergyWarningBanner` appears in the UI stating that the patient is allergic to an ingredient/class in Amoxicillin.
    5. The item should NOT be added silently. The user must click **"Acknowledge and proceed"** to add the item to the cart.

---

## 5. Prescriptions & Partial Fulfillment

Prescriptions can be partially filled if stock is insufficient. This is unlike OTC transactions which are all-or-nothing.

### Test Case 5.1: Allergy Safeguard on Prescription Creation
*   **Objective:** Trigger allergy warnings when compiling a doctor's prescription.
*   **Verification Steps:**
    1. Go to **Prescriptions -> Create Prescription**.
    2. Select Patient `Chinedu Okafor`.
    3. Add `Amoxicillin 250mg` to the prescription list.
    4. **Expected Result:** The interface displays a warning banner about the allergy conflict. Fulfilling or finalizing requires acknowledgment.

### Test Case 5.2: Partial Fulfillment Flow
*   **Objective:** Verify that prescriptions are marked `partially_fulfilled` when stock is short, permitting dispensing of available units without blocking.
*   **Verification Steps:**
    1. Go to **Prescriptions -> Create Prescription**.
    2. Select Patient `Amina Bello`.
    3. Doctor Name: `Dr. C. Okorie`.
    4. Add `Amoxicillin 250mg`, **Quantity: 50**. (Note: Total stock in inventory is only `40`).
    5. Click **Create**.
    6. View the newly created prescription, and click **Fulfill / Dispense**.
    7. **Expected Result:**
        *   The fulfillment dialog displays that requested quantity is `50` but only `40` units are available.
        *   Proceed with fulfillment.
        *   The prescription status updates to `partially_fulfilled`.
        *   The drug batch `AMOX-27-06` quantity drops from `40` to `0`.
        *   The prescription details show `40` dispensed and `10` remaining to be fulfilled in a future visit.

---

## 6. POS Checkout & Concurrency Controls

Tests transactional purchases and race conditions.

### Test Case 6.1: FEFO Deduction Checkout Verification
*   **Objective:** Confirm POS checkout correctly deducts from the earliest-expiry batch first.
*   **Verification Steps:**
    1. Ensure `Paracetamol 500mg` has:
        *   `PARA-26-07` (Expiry: July 2026): **50 units**
        *   `PARA-27-12` (Expiry: Dec 2027): **150 units**
    2. Go to **POS**. Select patient `Amina Bello` (or leave as Walk-in OTC).
    3. Add **60 units** of `Paracetamol 500mg` to the cart.
    4. Choose **Payment Method:** `Cash`.
    5. Click **Complete Sale**.
    6. Review the generated **Receipt Preview**.
    7. Navigate to **Inventory -> Paracetamol 500mg -> Batches**.
    8. **Expected Result:**
        *   `PARA-26-07` quantity is now **0** (50 units fully deducted).
        *   `PARA-27-12` quantity is now **140** (10 units deducted).
        *   Total Stock displays **140**.
        *   The receipt lists the batch numbers used in the deduction.

### Test Case 6.2: Expired Batch Exclusion
*   **Objective:** Confirm expired stock is hidden/filtered from sales checkout.
*   **Verification Steps:**
    1. Review `Benylin Cough Syrup` inventory. It has `COUGH-EXP` (30 units, Expired) and `COUGH-OK` (20 units, Active).
    2. Go to **POS** and search for `Benylin Cough Syrup`.
    3. Try to buy **25 units**.
    4. **Expected Result:** The cart blocks checkout or states that only **20 units** are available, ensuring the 30 expired units in `COUGH-EXP` are completely locked out of POS transactions.

### Test Case 6.3: Concurrency Conflict (409 Simulation)
*   **Objective:** Validate that concurrent checkouts for a drug with low stock prevent double-selling.
*   **Verification Steps:**
    1. Find a drug with limited stock, e.g., `Benylin Cough Syrup` (20 units remaining in active stock).
    2. Open two separate browser tabs/windows (or use two different logged-in staff browsers).
    3. Navigate to **POS** on both.
    4. Add **15 units** of `Benylin Cough Syrup` to the cart on **both** browsers.
    5. Click **Complete Sale** on **Browser 1**, then immediately click **Complete Sale** on **Browser 2**.
    6. **Expected Result:**
        *   **Browser 1** succeeds: checkout completes, stock is reduced to `5`, and receipt is issued.
        *   **Browser 2** fails: The server transaction returns a `409 Conflict` (or standard `InsufficientStockError`), aborting the second sale instead of allowing a negative stock balance. An error message appears: *"Insufficient stock available"*.

---

## 7. Reports & Analytics Dashboard

Tests that stock transactions correctly update reports and metrics.

### Test Case 7.1: Reports Accuracy Check
*   **Objective:** Verify that sales metrics, expiring alerts, and low stock calculations update dynamically.
*   **Verification Steps:**
    1. Complete a sale of `Paracetamol 500mg` (total total price: `60 units * 50 = 3000`).
    2. Navigate to **Dashboard -> Reports**.
    3. **Expected Result:**
        *   **Total Revenue** reflects the `3000` increase.
        *   **Transaction Volume** increments by 1.
        *   **Low Stock / Out of Stock List** accurately includes `Amoxicillin 250mg` (and `Benylin Cough Syrup` if stock falls below threshold).
        *   **Expired/Expiring soon reports** list batches `PARA-26-07` and `COUGH-EXP` accordingly.
