// Test ADU Cost Calculator Math
function calculateAduCost({
  sizeSqFt,
  costPerSqFt,
  sitePrep,
  permitsFees,
  utilities,
  designFees,
  landscaping,
  contingencyPct
}) {
  const size = Math.max(0, sizeSqFt);
  const costSqFt = Math.max(0, costPerSqFt);
  const prep = Math.max(0, sitePrep);
  const permits = Math.max(0, permitsFees);
  const util = Math.max(0, utilities);
  const design = Math.max(0, designFees);
  const landscape = Math.max(0, landscaping);
  const contPct = Math.max(0, contingencyPct);

  const baseConstructionCost = size * costSqFt;
  const additionalProjectCosts = prep + permits + util + design + landscape;
  const subtotalBeforeContingency = baseConstructionCost + additionalProjectCosts;
  const contingencyAmount = subtotalBeforeContingency * (contPct / 100);
  const estimatedTotalCost = subtotalBeforeContingency + contingencyAmount;
  const totalCostPerSqFt = size > 0 ? estimatedTotalCost / size : 0;

  return {
    size,
    costSqFt,
    baseConstructionCost,
    sitePrep: prep,
    permitsFees: permits,
    utilities: util,
    designFees: design,
    landscaping: landscape,
    additionalProjectCosts,
    subtotalBeforeContingency,
    contingencyPct: contPct,
    contingencyAmount,
    estimatedTotalCost,
    totalCostPerSqFt
  };
}

console.log("=== DEFAULT VALUES ===");
const d = calculateAduCost({
  sizeSqFt: 600,
  costPerSqFt: 250,
  sitePrep: 5000,
  permitsFees: 3000,
  utilities: 5000,
  designFees: 5000,
  landscaping: 3000,
  contingencyPct: 10
});
console.log(`Base Construction Cost: $${d.baseConstructionCost.toLocaleString()}`);
console.log(`Additional Costs: $${d.additionalProjectCosts.toLocaleString()}`);
console.log(`Subtotal: $${d.subtotalBeforeContingency.toLocaleString()}`);
console.log(`Contingency (10%): $${d.contingencyAmount.toLocaleString()}`);
console.log(`Estimated Total ADU Cost: $${d.estimatedTotalCost.toLocaleString()}`);
console.log(`Total Cost / Sq Ft: $${d.totalCostPerSqFt.toFixed(2)}`);

console.log("\n=== ZERO VALUES / EDGE CASES ===");
const z = calculateAduCost({
  sizeSqFt: 0,
  costPerSqFt: 250,
  sitePrep: 0,
  permitsFees: 0,
  utilities: 0,
  designFees: 0,
  landscaping: 0,
  contingencyPct: 0
});
console.log(`Zero Size Total Cost: $${z.estimatedTotalCost}`);
console.log(`Zero Size Cost / Sq Ft: $${z.totalCostPerSqFt}`);
