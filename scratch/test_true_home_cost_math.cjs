// Test True Cost of Home Ownership Math
function calculateHomeownershipCost({
  purchasePrice,
  downPayment,
  interestRate,
  loanTermYears,
  annualPropertyTax,
  annualInsurance,
  monthlyHoa,
  monthlyMaintenance,
  monthlyUtilities,
  monthlyOther
}) {
  const price = Math.max(0, purchasePrice);
  const down = Math.max(0, Math.min(price, downPayment));
  const downPct = price > 0 ? (down / price) * 100 : 0;
  const loanPrincipal = Math.max(0, price - down);
  const termMonths = Math.max(1, loanTermYears * 12);
  const rate = Math.max(0, interestRate);

  let monthlyPi = 0;
  let totalLoanRepayment = 0;
  let totalInterest = 0;

  if (loanPrincipal === 0) {
    monthlyPi = 0;
    totalLoanRepayment = 0;
    totalInterest = 0;
  } else if (rate === 0) {
    monthlyPi = loanPrincipal / termMonths;
    totalLoanRepayment = loanPrincipal;
    totalInterest = 0;
  } else {
    const monthlyRate = rate / (12 * 100);
    const compound = Math.pow(1 + monthlyRate, termMonths);
    monthlyPi = loanPrincipal * (monthlyRate * compound) / (compound - 1);
    totalLoanRepayment = monthlyPi * termMonths;
    totalInterest = Math.max(0, totalLoanRepayment - loanPrincipal);
  }

  const monthlyTax = Math.max(0, annualPropertyTax) / 12;
  const monthlyInsurance = Math.max(0, annualInsurance) / 12;
  const hoa = Math.max(0, monthlyHoa);
  const maint = Math.max(0, monthlyMaintenance);
  const util = Math.max(0, monthlyUtilities);
  const other = Math.max(0, monthlyOther);

  const monthlyNonMortgage = monthlyTax + monthlyInsurance + hoa + maint + util + other;
  const totalMonthlyCost = monthlyPi + monthlyNonMortgage;
  const annualTotalCost = totalMonthlyCost * 12;

  // Over full mortgage term
  const totalNonMortgageOverTerm = monthlyNonMortgage * termMonths;
  const totalCostOverTerm = totalLoanRepayment + totalNonMortgageOverTerm;
  const totalAllInWithDown = down + totalCostOverTerm;

  return {
    price,
    down,
    downPct,
    loanPrincipal,
    rate,
    termMonths,
    monthlyPi,
    monthlyTax,
    monthlyInsurance,
    hoa,
    maint,
    util,
    other,
    monthlyNonMortgage,
    totalMonthlyCost,
    annualTotalCost,
    totalInterest,
    totalLoanRepayment,
    totalNonMortgageOverTerm,
    totalCostOverTerm,
    totalAllInWithDown
  };
}

console.log("=== DEFAULT VALUES ===");
const d = calculateHomeownershipCost({
  purchasePrice: 350000,
  downPayment: 70000,
  interestRate: 6.5,
  loanTermYears: 30,
  annualPropertyTax: 4200,
  annualInsurance: 1800,
  monthlyHoa: 0,
  monthlyMaintenance: 350,
  monthlyUtilities: 300,
  monthlyOther: 100
});

console.log(`Down Payment: $${d.down.toLocaleString()} (${d.downPct.toFixed(1)}%)`);
console.log(`Mortgage Principal: $${d.loanPrincipal.toLocaleString()}`);
console.log(`Monthly P&I: $${d.monthlyPi.toFixed(2)}`);
console.log(`Monthly Property Tax: $${d.monthlyTax.toFixed(2)}`);
console.log(`Monthly Insurance: $${d.monthlyInsurance.toFixed(2)}`);
console.log(`Monthly Non-Mortgage Costs: $${d.monthlyNonMortgage.toFixed(2)}`);
console.log(`Total Monthly Homeownership Cost: $${d.totalMonthlyCost.toFixed(2)}`);
console.log(`Annual Homeownership Cost: $${d.annualTotalCost.toFixed(2)}`);
console.log(`Total Mortgage Interest: $${d.totalInterest.toFixed(2)}`);
console.log(`Total Mortgage Payments (30y): $${d.totalLoanRepayment.toFixed(2)}`);
console.log(`Total Non-Mortgage Costs (30y): $${d.totalNonMortgageOverTerm.toFixed(2)}`);
console.log(`Total Homeownership Cost (30y ex down): $${d.totalCostOverTerm.toFixed(2)}`);
console.log(`Total All-In With Down: $${d.totalAllInWithDown.toFixed(2)}`);

console.log("\n=== 100% DOWN PAYMENT ===");
const full = calculateHomeownershipCost({
  purchasePrice: 350000,
  downPayment: 350000,
  interestRate: 6.5,
  loanTermYears: 30,
  annualPropertyTax: 4200,
  annualInsurance: 1800,
  monthlyHoa: 0,
  monthlyMaintenance: 350,
  monthlyUtilities: 300,
  monthlyOther: 100
});
console.log(`Monthly P&I: $${full.monthlyPi}`);
console.log(`Total Monthly Cost: $${full.totalMonthlyCost}`);
console.log(`Total Interest: $${full.totalInterest}`);
