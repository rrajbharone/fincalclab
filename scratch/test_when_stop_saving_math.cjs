// Test simulation math for "When Can I Stop Saving for Retirement Calculator"

function simulateStopSavingAge({
  currentAge,
  retireAge,
  currentInvestments,
  annualExpenses,
  annualContributions,
  nominalReturn,
  inflationRate,
  swr
}) {
  const yearsTotal = retireAge - currentAge;
  if (yearsTotal <= 0) {
    return { error: 'Retirement age must be greater than current age' };
  }

  const totalMonths = yearsTotal * 12;
  const swrDecimal = Math.max(0.001, swr / 100);
  const targetPortfolio = annualExpenses / swrDecimal;

  const rNom = nominalReturn / 100;
  const rInf = inflationRate / 100;
  let rRealAnnual = 0;
  if (1 + rInf > 0) {
    rRealAnnual = ((1 + rNom) / (1 + rInf)) - 1;
  } else {
    rRealAnnual = rNom - rInf;
  }

  // Monthly real return
  let rMonthly = 0;
  if (rRealAnnual > -1) {
    rMonthly = Math.pow(1 + rRealAnnual, 1 / 12) - 1;
  }

  const monthlyContrib = Math.max(0, annualContributions / 12);

  // Check month 0 (Stopping immediately at current age)
  // Growth of existing investments for totalMonths without any additional contributions:
  const projIfStopNow = currentInvestments * Math.pow(1 + rMonthly, totalMonths);
  if (projIfStopNow >= targetPortfolio) {
    return {
      status: 'CAN_STOP_NOW',
      stopAgeYears: currentAge,
      stopAgeMonths: 0,
      monthsUntilStop: 0,
      targetPortfolio,
      projectedAtRetirement: projIfStopNow,
      surplus: projIfStopNow - targetPortfolio,
      rRealAnnual,
      totalMonths
    };
  }

  // Month-by-month search from month 1 to totalMonths
  let runningBalance = currentInvestments;
  let foundMonth = null;

  for (let m = 1; m <= totalMonths; m++) {
    // Contribute at end of month m
    runningBalance = runningBalance * (1 + rMonthly) + monthlyContrib;

    // If we stop contributing after month m, portfolio grows for (totalMonths - m) months
    const remainingMonths = totalMonths - m;
    const finalProjected = runningBalance * Math.pow(1 + rMonthly, remainingMonths);

    if (finalProjected >= targetPortfolio) {
      foundMonth = m;
      return {
        status: 'FEASIBLE',
        stopMonth: m,
        stopAgeYears: currentAge + Math.floor(m / 12),
        stopAgeMonths: m % 12,
        monthsUntilStop: m,
        targetPortfolio,
        balanceAtStop: runningBalance,
        projectedAtRetirement: finalProjected,
        surplus: finalProjected - targetPortfolio,
        rRealAnnual,
        totalMonths
      };
    }
  }

  // If even after contributing until retirement (m = totalMonths), target is not reached:
  const finalProjectedAtRetire = runningBalance;
  return {
    status: 'NEEDS_MORE_SAVINGS',
    stopAgeYears: null,
    targetPortfolio,
    projectedAtRetirement: finalProjectedAtRetire,
    shortfall: targetPortfolio - finalProjectedAtRetire,
    rRealAnnual,
    totalMonths
  };
}

// Test Case 1: Baseline defaults
// Age 30 -> 65 (35 yrs = 420 mos)
// Current investments: $100,000
// Annual expenses: $50,000
// Annual contributions: $12,000 ($1,000/mo)
// Nominal: 8.0%, Inflation: 2.5%, SWR: 4.0%
const res1 = simulateStopSavingAge({
  currentAge: 30,
  retireAge: 65,
  currentInvestments: 100000,
  annualExpenses: 50000,
  annualContributions: 12000,
  nominalReturn: 8.0,
  inflationRate: 2.5,
  swr: 4.0
});
console.log('Test Case 1 (Baseline):', res1);

// Test Case 2: Already Coast FIRE (Current investments $250,000)
const res2 = simulateStopSavingAge({
  currentAge: 30,
  retireAge: 65,
  currentInvestments: 250000,
  annualExpenses: 50000,
  annualContributions: 12000,
  nominalReturn: 8.0,
  inflationRate: 2.5,
  swr: 4.0
});
console.log('\nTest Case 2 (Already met):', res2);

// Test Case 3: Needs More Savings (Low contributions, high expenses)
const res3 = simulateStopSavingAge({
  currentAge: 50,
  retireAge: 60,
  currentInvestments: 50000,
  annualExpenses: 80000,
  annualContributions: 6000,
  nominalReturn: 6.0,
  inflationRate: 3.0,
  swr: 4.0
});
console.log('\nTest Case 3 (Shortfall):', res3);
