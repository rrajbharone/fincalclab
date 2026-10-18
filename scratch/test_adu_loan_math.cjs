// Test ADU Loan Calculator Math
function calculateAduLoan({ projectCost, downPayment, annualRate, loanTermYears }) {
  const cost = Math.max(0, projectCost);
  const down = Math.max(0, Math.min(cost, downPayment));
  const downPct = cost > 0 ? (down / cost) * 100 : 0;
  const loanAmount = Math.max(0, cost - down);
  const termMonths = Math.max(1, loanTermYears * 12);
  const rate = Math.max(0, annualRate);

  let monthlyPayment = 0;
  let totalLoanRepayment = 0;
  let totalInterest = 0;

  if (loanAmount === 0) {
    monthlyPayment = 0;
    totalLoanRepayment = 0;
    totalInterest = 0;
  } else if (rate === 0) {
    monthlyPayment = loanAmount / termMonths;
    totalLoanRepayment = loanAmount;
    totalInterest = 0;
  } else {
    const monthlyRate = rate / (12 * 100);
    const compoundFactor = Math.pow(1 + monthlyRate, termMonths);
    monthlyPayment = loanAmount * (monthlyRate * compoundFactor) / (compoundFactor - 1);
    totalLoanRepayment = monthlyPayment * termMonths;
    totalInterest = Math.max(0, totalLoanRepayment - loanAmount);
  }

  const totalProjectCostWithInterest = down + totalLoanRepayment;

  return {
    projectCost: cost,
    downPayment: down,
    downPct,
    loanAmount,
    termMonths,
    monthlyPayment,
    totalInterest,
    totalLoanRepayment,
    totalProjectCostWithInterest
  };
}

// Test default case
console.log("DEFAULT CASE ($150k cost, $30k down, 7% rate, 20 yrs):");
const d = calculateAduLoan({ projectCost: 150000, downPayment: 30000, annualRate: 7.0, loanTermYears: 20 });
console.log(`Loan Amount: $${d.loanAmount.toLocaleString()}`);
console.log(`Down %: ${d.downPct.toFixed(1)}%`);
console.log(`Monthly Payment: $${d.monthlyPayment.toFixed(2)}`);
console.log(`Total Interest: $${d.totalInterest.toFixed(2)}`);
console.log(`Total Loan Repayment: $${d.totalLoanRepayment.toFixed(2)}`);
console.log(`Total Project Cost With Interest: $${d.totalProjectCostWithInterest.toFixed(2)}`);

// Test 0% rate
console.log("\n0% RATE CASE ($150k cost, $30k down, 0% rate, 20 yrs):");
const z = calculateAduLoan({ projectCost: 150000, downPayment: 30000, annualRate: 0, loanTermYears: 20 });
console.log(`Monthly Payment: $${z.monthlyPayment.toFixed(2)}`);
console.log(`Total Interest: $${z.totalInterest.toFixed(2)}`);

// Test 100% down payment
console.log("\n100% DOWN PAYMENT ($150k cost, $150k down, 7% rate, 20 yrs):");
const full = calculateAduLoan({ projectCost: 150000, downPayment: 150000, annualRate: 7.0, loanTermYears: 20 });
console.log(`Loan Amount: $${full.loanAmount}`);
console.log(`Monthly Payment: $${full.monthlyPayment}`);
console.log(`Total Interest: $${full.totalInterest}`);
