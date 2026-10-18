// Test script to verify Coast FIRE formulas and edge cases

function calcCoastFire({
  currentAge,
  retirementAge,
  currentInvestments,
  annualExpenses,
  expectedReturn,
  expectedInflation,
  swr
}) {
  const years = Math.max(0, retirementAge - currentAge);
  const swrDecimal = Math.max(0.001, swr / 100);
  const fullFire = annualExpenses / swrDecimal;

  const nominalRate = expectedReturn / 100;
  const inflationRate = expectedInflation / 100;
  
  // Exact Fisher equation
  let realReturn = 0;
  if (1 + inflationRate > 0) {
    realReturn = ((1 + nominalRate) / (1 + inflationRate)) - 1;
  } else {
    realReturn = nominalRate - inflationRate;
  }

  let growthFactor = 1;
  if (years > 0) {
    if (Math.abs(realReturn) < 1e-9) {
      growthFactor = 1;
    } else {
      growthFactor = Math.pow(1 + realReturn, years);
    }
  }

  let coastFireNumber = 0;
  if (growthFactor > 0) {
    coastFireNumber = fullFire / growthFactor;
  } else {
    coastFireNumber = fullFire;
  }

  const projectedPortfolio = currentInvestments * growthFactor;
  const surplusShortfall = currentInvestments - coastFireNumber;
  const hasReached = surplusShortfall >= 0;

  return {
    years,
    swrDecimal,
    fullFire,
    nominalRate,
    inflationRate,
    realReturn,
    growthFactor,
    coastFireNumber,
    projectedPortfolio,
    surplusShortfall,
    hasReached
  };
}

// Test case 1: Standard baseline
// Age 30 to 65 (35 years)
// Current investments: $100,000
// Annual expenses: $50,000
// Expected Return: 8.0%, Inflation: 2.5%, SWR: 4.0%
const tc1 = calcCoastFire({
  currentAge: 30,
  retirementAge: 65,
  currentInvestments: 100000,
  annualExpenses: 50000,
  expectedReturn: 8.0,
  expectedInflation: 2.5,
  swr: 4.0
});
console.log('TC1 Standard:', {
  years: tc1.years,
  fullFire: tc1.fullFire,
  realReturnPct: (tc1.realReturn * 100).toFixed(3) + '%',
  growthFactor: tc1.growthFactor.toFixed(4),
  coastFireNumber: Math.round(tc1.coastFireNumber),
  projectedPortfolio: Math.round(tc1.projectedPortfolio),
  surplusShortfall: Math.round(tc1.surplusShortfall),
  hasReached: tc1.hasReached
});

// Test case 2: Zero real return (Return = Inflation = 3%)
const tc2 = calcCoastFire({
  currentAge: 30,
  retirementAge: 60,
  currentInvestments: 500000,
  annualExpenses: 40000,
  expectedReturn: 3.0,
  expectedInflation: 3.0,
  swr: 4.0
});
console.log('\nTC2 Zero Real Return:', {
  growthFactor: tc2.growthFactor,
  coastFireNumber: tc2.coastFireNumber,
  fullFire: tc2.fullFire,
  isEqual: tc2.coastFireNumber === tc2.fullFire
});

// Test case 3: Zero inflation (Nominal 7%, Inflation 0%)
const tc3 = calcCoastFire({
  currentAge: 35,
  retirementAge: 60,
  currentInvestments: 200000,
  annualExpenses: 60000,
  expectedReturn: 7.0,
  expectedInflation: 0.0,
  swr: 4.0
});
console.log('\nTC3 Zero Inflation:', {
  realReturnPct: (tc3.realReturn * 100).toFixed(3) + '%',
  coastFireNumber: Math.round(tc3.coastFireNumber),
  projectedPortfolio: Math.round(tc3.projectedPortfolio)
});

// Test case 4: User has reached Coast FIRE (Current > Target)
const tc4 = calcCoastFire({
  currentAge: 30,
  retirementAge: 65,
  currentInvestments: 250000,
  annualExpenses: 50000,
  expectedReturn: 8.0,
  expectedInflation: 2.5,
  swr: 4.0
});
console.log('\nTC4 Reached Coast FIRE:', {
  coastFireNumber: Math.round(tc4.coastFireNumber),
  currentInvestments: 250000,
  surplus: Math.round(tc4.surplusShortfall),
  hasReached: tc4.hasReached
});
