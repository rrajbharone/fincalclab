// Test calculation math for Fat FIRE Calculator

function calculateFatFire({
  currentAge = 35,
  yearsToRetire = 15,
  monthlyExpenses = 10000,
  currentPortfolio = 500000,
  annualReturn = 8.0,
  annualInflation = 2.5,
  swr = 3.5,
  monthlyContribution = 3000
}) {
  // Safe parsing
  const n = Math.max(0, Number(yearsToRetire) || 0);
  const expMonthlyToday = Math.max(0, Number(monthlyExpenses) || 0);
  const expAnnualToday = expMonthlyToday * 12;
  const swrDec = Math.max(0.001, (Number(swr) || 3.5) / 100);
  const rAnnual = (Number(annualReturn) || 0) / 100;
  const infAnnual = (Number(annualInflation) || 0) / 100;
  const pv = Math.max(0, Number(currentPortfolio) || 0);
  const pmt = Math.max(0, Number(monthlyContribution) || 0);

  // 1. Today's FIRE target
  const fireTargetToday = expAnnualToday / swrDec;

  // 2. Future expenses & target at retirement
  const futureAnnualExp = expAnnualToday * Math.pow(1 + infAnnual, n);
  const futureMonthlyExp = futureAnnualExp / 12;
  const fireTargetFuture = futureAnnualExp / swrDec;

  // 3. Monthly compounding for portfolio
  const m = n * 12;
  const i = rAnnual / 12;

  let fvExisting = 0;
  let fvContrib = 0;

  if (m === 0) {
    fvExisting = pv;
    fvContrib = 0;
  } else if (i === 0) {
    fvExisting = pv;
    fvContrib = pmt * m;
  } else {
    fvExisting = pv * Math.pow(1 + i, m);
    fvContrib = pmt * ((Math.pow(1 + i, m) - 1) / i);
  }

  const fvTotal = fvExisting + fvContrib;

  // 4. Surplus or shortfall
  const netDiff = fvTotal - fireTargetFuture;
  const isSurplus = netDiff >= 0;
  const surplusOrShortfall = Math.abs(netDiff);

  // 5. Total monthly contribution required to reach future target
  let requiredMonthlyContrib = 0;
  let additionalMonthlyRequired = 0;

  if (fvExisting >= fireTargetFuture) {
    requiredMonthlyContrib = 0;
    additionalMonthlyRequired = 0;
  } else if (m > 0) {
    const deficit = fireTargetFuture - fvExisting;
    if (i === 0) {
      requiredMonthlyContrib = deficit / m;
    } else {
      requiredMonthlyContrib = (deficit * i) / (Math.pow(1 + i, m) - 1);
    }
    additionalMonthlyRequired = Math.max(0, requiredMonthlyContrib - pmt);
  } else {
    // m === 0 and pv < target
    requiredMonthlyContrib = fireTargetFuture - pv;
    additionalMonthlyRequired = requiredMonthlyContrib;
  }

  // 6. Percentage funded
  const fundedPctToday = fireTargetToday > 0 ? (pv / fireTargetToday) * 100 : 0;
  const fundedPctFuture = fireTargetFuture > 0 ? (fvTotal / fireTargetFuture) * 100 : 0;

  const retirementAge = currentAge ? Number(currentAge) + n : null;

  return {
    expAnnualToday,
    fireTargetToday,
    futureAnnualExp,
    futureMonthlyExp,
    fireTargetFuture,
    fvExisting,
    fvContrib,
    fvTotal,
    netDiff,
    isSurplus,
    surplusOrShortfall,
    requiredMonthlyContrib,
    additionalMonthlyRequired,
    fundedPctToday,
    fundedPctFuture,
    retirementAge
  };
}

console.log('--- Standard Test ---');
console.log(calculateFatFire({}));

console.log('--- Zero Return Test ---');
console.log(calculateFatFire({ annualReturn: 0 }));

console.log('--- Zero Inflation Test ---');
console.log(calculateFatFire({ annualInflation: 0 }));

console.log('--- Zero Years Test ---');
console.log(calculateFatFire({ yearsToRetire: 0 }));

console.log('--- Already Reached Target Test ---');
console.log(calculateFatFire({ currentPortfolio: 10000000, monthlyContribution: 0 }));
