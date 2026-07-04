# Part 5: API Endpoints Reference

All secure database operations are processed on the server via Next.js Serverless API routes. This document specifies the request payloads, database operations, and authorization checks for each endpoint.

---

## 🔒 Session Verification & Security Middleware

Each API route validates user permissions before running operations. This logic resides in `lib/api-auth.ts`:

1. **Active Check (`requireActiveUser(request)`)**:
   - Parses the request's `Authorization` header to extract the user's Firebase ID token (`Bearer <token>`).
   - Verifies the token using `adminAuth.verifyIdToken()`.
   - Queries the `/users/{uid}` profile document in Firestore.
   - If the token is invalid, expired, or the user profile has `active: false`, it throws an `UnauthorizedError` (HTTP 401).

2. **Role Check (`requireAdmin(user)`)**:
   - Checks the user's role from the verified Firestore document.
   - If the user's role is not `"admin"`, it throws an `UnauthorizedError` (HTTP 403 Forbidden).

---

## 🛍️ 1. POS Cart Checkout

### `POST /api/sales/checkout`

Deducts inventory across multiple batches and records a completed Over-The-Counter (OTC) sale or prescription checkout.

- **Access Level**: Authenticated + Active (`admin` or `attendant`).
- **Transactional Guarantee**: **Atomic (All-or-Nothing)**. If any requested item stock is short or expired, the entire transaction is rolled back and no database updates are made.

#### Request Headers:
```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

#### Request Payload Schema:
```json
{
  "items": [
    {
      "drugId": "9pGYvgcNtXRg5FTvqNJa",
      "drugName": "Benylin Cough Syrup",
      "sellingPrice": 2500,
      "quantity": 2
    }
  ],
  "patientId": "pt-12345",
  "patientName": "John Doe",
  "paymentMethod": "cash"
}
```
*Note: `patientId` and `patientName` are set to `null` for OTC/Walk-in checkouts.*

#### Database Flow:
1. Calls `deductStockFEFOMulti()` to deduct the quantities from the earliest expiring active batches inside a transaction.
2. Formats a list of sale lines mapping each deduction to its originating database `batchId` and `batchNumber`.
3. Creates a new immutable document in the `/sales` collection.
4. Triggers background checks to see if any drug's stock dropped below its `reorderThreshold`. If so, it creates warning alerts in the `/notifications` collection.

#### Response:
- **HTTP 200 (Success)**:
  ```json
  { "saleId": "sale-abc123xyz" }
  ```
- **HTTP 409 (Conflict - Insufficient Stock)**:
  ```json
  {
    "error": "Insufficient stock for one or more items.",
    "drugId": "9pGYvgcNtXRg5FTvqNJa",
    "available": 20,
    "requested": 25
  }
  ```

---

## 💊 2. Prescription Fulfillment

### `POST /api/prescriptions/[id]/fulfill`

Fulfills items on a clinical prescription sheet.

- **Access Level**: Authenticated + Active (`admin` or `attendant`).
- **Transactional Guarantee**: **Shortage-Tolerant (Partial Success)**. Runs stock deductions per item. If a drug is short or has expired, it fulfills the available active quantities and moves the prescription status to `"partially_fulfilled"`.

#### Request Headers:
```http
Authorization: Bearer <firebase_id_token>
```

#### Database Flow:
1. Reads the prescription document to ensure its status is not already `"fulfilled"`.
2. Loops through the prescription items. For each item:
   - Computes `stillNeeded = quantityRequested - quantityDispensed`.
   - Calls `deductStockFEFO()` to deduct the remaining quantity.
   - If stock is insufficient, it catches the error, calls `deductStockFEFO()` on whatever active stock remains, and flags a partial fill state.
3. Updates the prescription's `status` to `"fulfilled"` or `"partially_fulfilled"` and sets the item counts.
4. Creates a new `/sales` record of type `"prescription"` containing the fulfilled batches. The sales `total` is recorded as `0` because billing is handled separately.
5. Fires low-stock notification triggers.

#### Response:
- **HTTP 200 (Success)**:
  ```json
  { "status": "fulfilled" } // or "partially_fulfilled"
  ```
- **HTTP 404 (Not Found)**:
  ```json
  { "error": "Prescription not found." }
  ```

---

## 👥 3. Staff Account Creation

### `POST /api/users/create`

Creates a new Firebase Auth account and a corresponding Firestore profile.

- **Access Level**: **Admin Only** (`role == "admin"`).

#### Request Headers:
```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

#### Request Payload Schema:
```json
{
  "name": "Jane Smith",
  "email": "janesmith@pharmaledger.com",
  "tempPassword": "staffTempPassword123",
  "role": "attendant"
}
```

#### Database Flow:
1. Validates that all fields are present and that `tempPassword` is at least 6 characters.
2. Calls `adminAuth.createUser()` to register the user in Firebase Authentication.
3. Writes the corresponding profile document directly in the `/users/{uid}` collection with `active: true`.

#### Response:
- **HTTP 200 (Success)**:
  ```json
  { "uid": "auth-uid-abc-123" }
  ```
- **HTTP 409 (Conflict)**:
  ```json
  { "error": "A staff account with this email already exists." }
  ```
