# Part 4: FEFO Stock Management & Concurrency

This document describes the inventory logic: **First-Expired, First-Out (FEFO)** stock allocation, concurrency safeguards, expired batch exclusion, and the transactional database models in `lib/fefo.ts`.

---

## 📅 The FEFO Principle (First-Expired, First-Out)

To minimize drug waste, PharmaLedger automatically dispenses stock from the **earliest expiring batch first**, regardless of the order in which the batches were added to the pharmacy's shelves.

When an attendant checks out a drug or fulfills a prescription, the system:
1. Queries the `/drugs/{drugId}/batches` subcollection for all batches with `quantity > 0` ordered by `expiryDate` ascending.
2. Skips any batches that are expired.
3. Deducts the required units from the earliest expiring batch first.
4. If that batch's quantity is fully consumed, it rolls over to the next batch in the sorted list.
5. Commits the changes to the database.

---

## ⚖️ Walk-in Checkout vs. Prescription Fulfillment

There is a deliberate structural difference in how walk-in sales and prescriptions handle stock shortages:

### 1. POS Walk-In Checkout (Atomic Multi-Item)
- **Code Function**: `deductStockFEFOMulti()` in `lib/fefo.ts`.
- **Behavior**: Strict transactional block. If a cashier enters 5 different drugs in a single cart, and **even one** drug is short by a single unit, the entire sale is rejected. No documents are updated, and no sale record is created.
- **Rationale**: An over-the-counter customer cannot walk away with half-filled items.

### 2. Prescription Fulfillment (Per-Item Partial Fill)
- **Code Function**: `deductStockFEFO()` in `lib/fefo.ts`.
- **Behavior**: Shortage-tolerant. If a prescription requests 30 tablets of Amoxicillin but only 20 active units are in stock, the system dispenses those 20 units, reduces the stock of those batches, and marks the prescription's status as `"partially_fulfilled"`.
- **Rationale**: Patients often receive partial prescriptions when a pharmacy is low on stock, returning later to collect the remainder.

---

## 🚫 Exclusion of Expired Batches

Expired drugs are unsafe and must never be sold or counted. To guarantee this:
- **Transaction Filters**: In `deductStockFEFO()`, `deductStockFEFOMulti()`, and `previewFEFO()`, the code checks:
  ```typescript
  const expiryMs = (batch.expiryDate as Timestamp).toMillis();
  if (expiryMs <= Date.now()) {
    continue; // Skip expired batches entirely
  }
  ```
  This locks expired units out of sales and prevents them from appearing in cart previews.
- **Inventory Caches**: When an administrator adds a new batch via `addBatch()`, or when checkout modifies quantities, the system recomputes `totalStock` and `nearestExpiry` on the parent `drug` document. It **ignores** expired batches during this process. Consequently, a drug's cached `totalStock` field reflects only the quantity of active, sellable stock.

---

## 🔄 Concurrency Control & Firestore Transactions

In a busy pharmacy, two attendants might try to check out the last 10 units of a drug at the exact same moment. If unchecked, both transactions might read the stock as 10, write changes, and end up selling 20 units total—driving the stock into a negative state.

PharmaLedger solves this using **Firestore Transactions**:
- When a transaction is executed, Firestore locks the documents being read.
- If a document is updated by another client while the transaction is running, Firestore aborts the transaction and runs it again with the updated data.
- The transaction only commits if no concurrent edits interfere.

### The Firestore Read-Before-Write Constraint:
Firestore transactions enforce a strict rule: **All read operations (`tx.get`) must happen before any write operations (`tx.update`, `tx.set`, `tx.delete`) are executed.**

```
 INCORRECT (Causes Crash):
 [READ batches] -> [WRITE batch quantity] -> [READ totals (recomputeTotalsInTx)] -> [WRITE drug document]
                                             ^----- FAILURE! Read after Write.

 CORRECT (Current Design):
 [READ drug & all batches] -> [CALCULATE updates in memory] -> [WRITE batch quantities] -> [WRITE drug totals]
```

To resolve this constraint, PharmaLedger performs all checks and totals in memory:
1. **Reads**: The transaction fetches the parent `drug` and all its `batches` first.
2. **In-Memory Logic**: It iterates over the batches, determines deductions, and calculates the new `totalStock` and `nearestExpiry` in variables.
3. **Writes**: Only after calculations are complete does it write the updates. This ensures the transaction executes successfully.
4. **Shortage Rejection**: If the in-memory calculation determines that the active stock is insufficient, it throws an `InsufficientStockError`. This rolls back the transaction, leaving the database unmodified.
