// Soft-warning allergy conflict check — per CONTEXT.md Section 4.
//
// This is intentionally a simple substring match against free-text allergy
// tags, NOT a clinical drug-interaction database (e.g. RxNorm-style). Flag
// this explicitly to the panel if asked: a production pharmacy system would
// integrate a real interaction database, which is out of scope for a
// $0-cost final-year build. The UI still enforces an explicit
// "Acknowledge and proceed" click before checkout/prescription-add proceeds,
// so the safety-relevant UX behavior is real even though the matching logic
// underneath it is simplified.
export function checkAllergyConflict(
  patientAllergies: string[],
  drug: { name: string; category: string; genericName: string }
): boolean {
  const drugTerms = [drug.name, drug.category, drug.genericName]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  return patientAllergies.some((allergy) => {
    const a = allergy.toLowerCase().trim();
    if (!a) return false;
    return drugTerms.some((term) => term.includes(a) || a.includes(term));
  });
}
