// Verify ADU ROI Calculator Complete Math
function calculateAduRoi({
  investmentCost,
  monthlyRent,
  monthlyExpenses,
  vacancyRate,
  rentIncrease,
  appreciationRate,
  years
}) {
  const cost = Math.max(0, investmentCost);
  const rent = Math.max(0, monthlyRent);
  const expenses = Math.max(0, monthlyExpenses);
  const vacRate = Math.max(0, Math.min(100, vacancyRate));
  const rentGrowth = Math.max(-50, Math.min(100, rentIncrease));
  const apprecRate = Math.max(-50, Math.min(100, appreciationRate));
  const termYears = Math.max(1, Math.min(50, Math.round(years)));

  // Year 1 Calculations
  const annualGrossRent = rent * 12;
  const vacancyLoss = annualGrossRent * (vacRate / 100);
  const effectiveAnnualRent = annualGrossRent - vacancyLoss;
  const annualExpenses = expenses * 12;
  const annualNoi = effectiveAnnualRent - annualExpenses;
  const monthlyNoi = annualNoi / 12;

  const cashOnCost = cost > 0 ? (annualNoi / cost) * 100 : 0;
  const paybackPeriod = annualNoi > 0 && cost > 0 ? cost / annualNoi : null;

  // Multi-Year Projections
  let cumulativeNoi = 0;
  let currRent = rent;
  const yearlyBreakdown = [];

  for (let t = 1; t <= termYears; t++) {
    const yrGross = currRent * 12;
    const yrVac = yrGross * (vacRate / 100);
    const yrEff = yrGross - yrVac;
    const yrNoi = yrEff - annualExpenses;
    cumulativeNoi += yrNoi;

    yearlyBreakdown.push({
      year: t,
      monthlyRent: currRent,
      grossRent: yrGross,
      noi: yrNoi,
      cumulativeNoi: cumulativeNoi
    });

    if (t < termYears) {
      currRent *= (1 + rentGrowth / 100);
    }
  }

  const projectedFinalYearMonthlyRent = currRent;
  const projectedFinalYearAnnualRent = currRent * 12;

  const futureAduValue = cost * Math.pow(1 + apprecRate / 100, termYears);
  const estimatedAppreciation = Math.max(0, futureAduValue - cost);

  const totalNetGain = cumulativeNoi + (futureAduValue - cost);
  const projectedTotalRoi = cost > 0 ? (totalNetGain / cost) * 100 : 0;

  return {
    cost,
    rent,
    expenses,
    annualGrossRent,
    vacancyLoss,
    effectiveAnnualRent,
    annualExpenses,
    annualNoi,
    monthlyNoi,
    cashOnCost,
    paybackPeriod,
    termYears,
    projectedFinalYearMonthlyRent,
    projectedFinalYearAnnualRent,
    futureAduValue,
    estimatedAppreciation,
    cumulativeNoi,
    totalNetGain,
    projectedTotalRoi,
    yearlyBreakdown
  };
}

// Test default
console.log("=== DEFAULT TEST ($150k cost, $1,800 rent, $300 expenses, 5% vac, 3% rent inc, 3% apprec, 10 yrs) ===");
const d = calculateAduRoi({
  investmentCost: 150000,
  monthlyRent: 1800,
  monthlyExpenses: 300,
  vacancyRate: 5,
  rentIncrease: 3,
  appreciationRate: 3,
  years: 10
});

console.log("Annual Gross Rent: $" + d.annualGrossRent.toLocaleString());
console.log("Vacancy Loss: $" + d.vacancyLoss.toLocaleString());
console.log("Effective Rent: $" + d.effectiveAnnualRent.toLocaleString());
console.log("Annual Expenses: $" + d.annualExpenses.toLocaleString());
console.log("Annual NOI: $" + d.annualNoi.toLocaleString());
console.log("Monthly NOI: $" + d.monthlyNoi.toLocaleString());
console.log("Cash-on-Cost: " + d.cashOnCost.toFixed(2) + "%");
console.log("Payback Period: " + d.paybackPeriod.toFixed(1) + " years");
console.log("10-Year Cumulative NOI: $" + d.cumulativeNoi.toLocaleString());
console.log("Projected Year 10 Monthly Rent: $" + d.projectedFinalYearMonthlyRent.toFixed(2));
console.log("Projected Year 10 Annual Rent: $" + d.projectedFinalYearAnnualRent.toFixed(2));
console.log("Estimated Future Value: $" + d.futureAduValue.toFixed(2));
console.log("Estimated Appreciation: $" + d.estimatedAppreciation.toFixed(2));
console.log("Total Net Gain: $" + d.totalNetGain.toFixed(2));
console.log("Projected Total ROI: " + d.projectedTotalRoi.toFixed(2) + "%");

// Test negative NOI
console.log("\n=== NEGATIVE NOI TEST ($150k cost, $200 rent, $500 expenses) ===");
const neg = calculateAduRoi({
  investmentCost: 150000,
  monthlyRent: 200,
  monthlyExpenses: 500,
  vacancyRate: 5,
  rentIncrease: 3,
  appreciationRate: 3,
  years: 10
});
console.log("Annual NOI: $" + neg.annualNoi);
console.log("Cash on Cost: " + neg.cashOnCost.toFixed(2) + "%");
console.log("Payback Period: " + neg.paybackPeriod);
