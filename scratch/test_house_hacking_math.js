// scratch/test_house_hacking_math.js

function calcMortgage(principal, annualRatePct, years) {
  if (principal <= 0) return 0;
  const n = years * 12;
  if (n <= 0) return 0;
  const r = (annualRatePct / 100) / 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function runHouseHackingCalc(inputs) {
  const purchasePrice = inputs.purchasePrice || 0;
  const downPaymentPct = inputs.downPaymentPct || 0;
  const downPayment = purchasePrice * (downPaymentPct / 100);
  const closingCosts = inputs.closingCosts || 0;
  const initialRepairs = inputs.initialRepairs || 0;
  const initialCashRequired = downPayment + closingCosts + initialRepairs;

  const principal = Math.max(0, purchasePrice - downPayment);
  const mortgageMonthly = calcMortgage(principal, inputs.interestRate || 0, inputs.termYears || 30);

  // Rental income
  const unitRents = inputs.unitRents || [];
  const otherIncome = inputs.otherIncome || 0;
  const grossRent = unitRents.reduce((sum, r) => sum + (Number(r) || 0), 0) + otherIncome;
  const vacancyPct = inputs.vacancyPct || 0;
  const vacancyLoss = grossRent * (vacancyPct / 100);
  const effectiveRent = grossRent - vacancyLoss;

  // Operating expenses
  const propTaxes = inputs.propTaxes || 0;
  const insurance = inputs.insurance || 0;
  const pmi = inputs.pmi || 0;
  const maintenance = inputs.maintenance || 0;
  const management = inputs.management || 0;
  const utilities = inputs.utilities || 0;
  const hoa = inputs.hoa || 0;

  const totalMonthlyOpEx = propTaxes + insurance + pmi + maintenance + management + utilities + hoa;
  const totalMonthlyExpenses = mortgageMonthly + totalMonthlyOpEx;

  // Monthly Out-of-Pocket Housing Cost
  const outOfPocket = totalMonthlyExpenses - effectiveRent;

  // Monthly Property Cash Flow
  const monthlyCashFlow = effectiveRent - totalMonthlyExpenses;

  // Rental Coverage %
  const coveragePct = totalMonthlyExpenses > 0 ? (effectiveRent / totalMonthlyExpenses) * 100 : 0;

  // Comparison with current housing cost
  const currentCost = inputs.currentCost || 0;
  let monthlySavings = 0;
  let annualSavings = 0;
  if (currentCost > 0) {
    monthlySavings = currentCost - outOfPocket;
    annualSavings = monthlySavings * 12;
  }

  // Returns
  const annualCashFlow = monthlyCashFlow * 12;
  let cashOnCash = null;
  if (initialCashRequired > 0 && annualCashFlow > 0) {
    cashOnCash = (annualCashFlow / initialCashRequired) * 100;
  }

  let savingsROI = null;
  if (initialCashRequired > 0 && annualSavings > 0) {
    savingsROI = (annualSavings / initialCashRequired) * 100;
  }

  return {
    downPayment,
    initialCashRequired,
    principal,
    mortgageMonthly,
    grossRent,
    vacancyLoss,
    effectiveRent,
    totalMonthlyOpEx,
    totalMonthlyExpenses,
    outOfPocket,
    monthlyCashFlow,
    coveragePct,
    monthlySavings,
    annualSavings,
    annualCashFlow,
    cashOnCash,
    savingsROI
  };
}

// Test Case 1: Standard Owner-Occupied Duplex
// Price $450k, 5% down ($22,500), $10k closing, $7.5k repairs -> Initial cash $40k
// Mortgage: $427,500 @ 6.5%, 30 yrs -> M = $2,702.09
// Rent: 1 unit @ $1,800 + $50 laundry = $1,850 gross
// Vacancy: 5% = $92.50 -> Effective rent = $1,757.50
// Expenses: Taxes $400, Ins $150, PMI $180, Maint $200, Utils $150, Mgmt $0, HOA $0 = $1,080 OpEx
// Total Expenses: $2,702.09 + $1,080 = $3,782.09
// Out of pocket: $3,782.09 - $1,757.50 = $2,024.59
// Current rent: $2,500 -> Savings = $475.41/mo ($5,704.92/yr)
console.log('--- TEST 1: Standard Duplex ---');
const t1 = runHouseHackingCalc({
  purchasePrice: 450000,
  downPaymentPct: 5,
  closingCosts: 10000,
  initialRepairs: 7500,
  interestRate: 6.5,
  termYears: 30,
  unitRents: [1800],
  otherIncome: 50,
  vacancyPct: 5,
  propTaxes: 400,
  insurance: 150,
  pmi: 180,
  maintenance: 200,
  management: 0,
  utilities: 150,
  hoa: 0,
  currentCost: 2500
});
console.log(`Mortgage: $${t1.mortgageMonthly.toFixed(2)} (Expected ~2702.09)`);
console.log(`Effective Rent: $${t1.effectiveRent.toFixed(2)} (Expected 1757.50)`);
console.log(`Total Expenses: $${t1.totalMonthlyExpenses.toFixed(2)} (Expected ~3782.09)`);
console.log(`Out of Pocket: $${t1.outOfPocket.toFixed(2)} (Expected ~2024.59)`);
console.log(`Monthly Savings: $${t1.monthlySavings.toFixed(2)} (Expected ~475.41)`);
console.log(`Coverage %: ${t1.coveragePct.toFixed(1)}% (Expected ~46.5%)`);

// Test Case 2: Fourplex with positive cash flow
// Price $600k, 3.5% down ($21k), 3 rental units @ $1500 each = $4,500 gross
// Vacancy 5% = $225 -> Effective = $4,275
// Mortgage: $579k @ 6.0%, 30 yr -> M = $3,471.38
// OpEx: $1,200 -> Total = $4,671.38
// Out of pocket: $4,671.38 - $4,275 = $396.38
console.log('\n--- TEST 2: Fourplex ---');
const t2 = runHouseHackingCalc({
  purchasePrice: 600000,
  downPaymentPct: 3.5,
  closingCosts: 12000,
  initialRepairs: 5000,
  interestRate: 6.0,
  termYears: 30,
  unitRents: [1500, 1500, 1500],
  otherIncome: 100,
  vacancyPct: 5,
  propTaxes: 500,
  insurance: 200,
  pmi: 250,
  maintenance: 300,
  management: 0,
  utilities: 200,
  hoa: 0,
  currentCost: 2200
});
console.log(`Effective Rent: $${t2.effectiveRent.toFixed(2)}`);
console.log(`Total Expenses: $${t2.totalMonthlyExpenses.toFixed(2)}`);
console.log(`Out of Pocket: $${t2.outOfPocket.toFixed(2)}`);
console.log(`Monthly Savings: $${t2.monthlySavings.toFixed(2)}`);

// Test Case 3: Zero Interest Edge Case
console.log('\n--- TEST 3: Zero Interest ---');
const t3 = runHouseHackingCalc({
  purchasePrice: 300000,
  downPaymentPct: 20,
  interestRate: 0,
  termYears: 30,
  unitRents: [1200],
  vacancyPct: 0
});
console.log(`Zero Rate Mortgage: $${t3.mortgageMonthly.toFixed(2)} (Expected 240,000 / 360 = 666.67)`);
