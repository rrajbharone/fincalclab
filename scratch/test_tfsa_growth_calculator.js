// scratch/test_tfsa_growth_calculator.js
function calculateTfsaGrowth({
  initialBalance = 0,
  regularContribution = 0,
  frequency = 'monthly', // 'monthly' | 'biweekly' | 'weekly' | 'annually'
  expectedReturnPct = 0,
  years = 0,
  annualIncreasePct = 0
}) {
  const P0 = Math.max(0, Number(initialBalance) || 0);
  const PMT = Math.max(0, Number(regularContribution) || 0);
  const r = Math.max(0, Number(expectedReturnPct) || 0) / 100;
  const Y = Math.max(0, Number(years) || 0);
  const g = Math.max(0, Number(annualIncreasePct) || 0) / 100;

  const freqMap = {
    monthly: 12,
    biweekly: 26,
    weekly: 52,
    annually: 1
  };
  const m = freqMap[frequency] || 12;
  const totalPeriods = Math.round(Y * m);
  const i = r / m;

  let balance = P0;
  let totalContrib = 0;
  let totalGrowth = 0;

  const yearlyRows = [];
  const fullYears = Math.ceil(Y);

  let currentYearStartBal = P0;
  let currentYearContrib = 0;
  let currentYearGrowth = 0;

  for (let k = 1; k <= totalPeriods; k++) {
    const y = Math.floor((k - 1) / m) + 1;
    const pmt_k = PMT * Math.pow(1 + g, y - 1);
    const periodInterest = balance * i;

    balance += periodInterest + pmt_k;
    totalContrib += pmt_k;
    totalGrowth += periodInterest;

    currentYearContrib += pmt_k;
    currentYearGrowth += periodInterest;

    // End of year or end of total periods
    const isYearEnd = (k % m === 0) || (k === totalPeriods);
    if (isYearEnd) {
      yearlyRows.push({
        year: y,
        startBalance: currentYearStartBal,
        contributions: currentYearContrib,
        growth: currentYearGrowth,
        endBalance: balance
      });
      currentYearStartBal = balance;
      currentYearContrib = 0;
      currentYearGrowth = 0;
    }
  }

  // Handle case where totalPeriods == 0 (e.g. years = 0)
  if (totalPeriods === 0) {
    yearlyRows.push({
      year: 0,
      startBalance: P0,
      contributions: 0,
      growth: 0,
      endBalance: P0
    });
  }

  const finalBalance = balance;
  const totalCapitalDeposited = P0 + totalContrib;
  const growthPctOfFinal = finalBalance > 0 ? (totalGrowth / finalBalance) * 100 : 0;
  const capitalPctOfFinal = finalBalance > 0 ? (totalCapitalDeposited / finalBalance) * 100 : 0;

  return {
    initialBalance: P0,
    totalContributions: totalContrib,
    totalGrowth,
    finalBalance,
    totalCapitalDeposited,
    growthPctOfFinal,
    capitalPctOfFinal,
    yearlyRows
  };
}

// Run test suite
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`✓ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`✗ FAIL: ${message}`);
  }
}

// Test 1: Standard 20-year monthly scenario
const t1 = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 500,
  frequency: 'monthly',
  expectedReturnPct: 6,
  years: 20,
  annualIncreasePct: 0
});
assert(Math.abs(t1.finalBalance - 264122.49) < 0.1, `Standard 20-yr monthly balance ~$264,122.49 (got ${t1.finalBalance.toFixed(2)})`);
assert(Math.abs(t1.totalContributions - 120000) < 0.01, `Total contributions = $120k (got ${t1.totalContributions.toFixed(2)})`);
assert(Math.abs(t1.totalGrowth - 134122.49) < 0.1, `Total growth = $134,122.49 (got ${t1.totalGrowth.toFixed(2)})`);
assert(Math.abs(t1.initialBalance + t1.totalContributions + t1.totalGrowth - t1.finalBalance) < 0.01, `Initial + Contrib + Growth == Final Balance`);
assert(t1.yearlyRows.length === 20, `Generates 20 yearly rows`);

// Test 2: 0% return rate
const t2 = calculateTfsaGrowth({
  initialBalance: 15000,
  regularContribution: 400,
  frequency: 'monthly',
  expectedReturnPct: 0,
  years: 10,
  annualIncreasePct: 0
});
assert(t2.totalGrowth === 0, `0% return produces 0 growth`);
assert(t2.finalBalance === 15000 + 400 * 120, `0% return final balance is initial + deposits ($63,000) (got ${t2.finalBalance})`);

// Test 3: $0 Initial Balance
const t3 = calculateTfsaGrowth({
  initialBalance: 0,
  regularContribution: 583.33,
  frequency: 'monthly',
  expectedReturnPct: 7,
  years: 25,
  annualIncreasePct: 0
});
assert(t3.initialBalance === 0, `Handles $0 initial balance`);
assert(t3.finalBalance > 450000, `Final balance over $450k (got ${t3.finalBalance.toFixed(2)})`);

// Test 4: $0 Regular Contributions
const t4 = calculateTfsaGrowth({
  initialBalance: 50000,
  regularContribution: 0,
  frequency: 'monthly',
  expectedReturnPct: 8,
  years: 15,
  annualIncreasePct: 0
});
assert(t4.totalContributions === 0, `Handles $0 contribution`);
const expectedLumpSum = 50000 * Math.pow(1 + 0.08 / 12, 180);
assert(Math.abs(t4.finalBalance - expectedLumpSum) < 0.1, `Pure lump sum compounding matches formula (got ${t4.finalBalance.toFixed(2)}, expected ${expectedLumpSum.toFixed(2)})`);

// Test 5: Biweekly contributions
const t5 = calculateTfsaGrowth({
  initialBalance: 5000,
  regularContribution: 200,
  frequency: 'biweekly',
  expectedReturnPct: 6.5,
  years: 10,
  annualIncreasePct: 0
});
assert(t5.totalContributions === 200 * 260, `Biweekly total contributions = 200 * 26 * 10 = $52,000 (got ${t5.totalContributions})`);
assert(t5.finalBalance > 75000, `Biweekly final balance > $75k`);

// Test 6: Annual contributions
const t6 = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 7000,
  frequency: 'annually',
  expectedReturnPct: 6,
  years: 5,
  annualIncreasePct: 0
});
assert(t6.totalContributions === 35000, `Annual 5 yrs = $35,000 deposits`);
assert(t6.yearlyRows.length === 5, `5 yearly rows`);

// Test 7: Annual contribution escalation (e.g. 3% raise increase)
const t7Base = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 500,
  frequency: 'monthly',
  expectedReturnPct: 6,
  years: 10,
  annualIncreasePct: 0
});
const t7 = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 500,
  frequency: 'monthly',
  expectedReturnPct: 6,
  years: 10,
  annualIncreasePct: 3
});
assert(t7.totalContributions > 60000, `3% escalation increases total contributions over base $60k (got ${t7.totalContributions.toFixed(2)})`);
assert(t7.finalBalance > t7Base.finalBalance + 10000, `3% escalation boosts final balance by >$10k over base ($110,771 vs $100,094) (got ${t7.finalBalance.toFixed(2)})`);

// Test 8: Decimal / Fractional years (e.g. 2.5 years)
const t8 = calculateTfsaGrowth({
  initialBalance: 5000,
  regularContribution: 500,
  frequency: 'monthly',
  expectedReturnPct: 5,
  years: 2.5,
  annualIncreasePct: 0
});
assert(t8.totalContributions === 500 * 30, `2.5 yrs monthly = 30 contributions = $15,000 (got ${t8.totalContributions})`);
assert(t8.yearlyRows.length === 3, `2.5 yrs spans 3 year-summary rows`);

// Test 9: Zero years edge case
const t9 = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 500,
  frequency: 'monthly',
  expectedReturnPct: 6,
  years: 0,
  annualIncreasePct: 0
});
assert(t9.finalBalance === 10000, `0 years produces initial balance`);
assert(t9.totalGrowth === 0, `0 years produces 0 growth`);

// Test 10: Comparison / boost scenario (+ $100/mo)
const baseScenario = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 500,
  frequency: 'monthly',
  expectedReturnPct: 6,
  years: 20
});
const boostScenario = calculateTfsaGrowth({
  initialBalance: 10000,
  regularContribution: 600,
  frequency: 'monthly',
  expectedReturnPct: 6,
  years: 20
});
const diffBalance = boostScenario.finalBalance - baseScenario.finalBalance;
const diffContrib = boostScenario.totalContributions - baseScenario.totalContributions;
const diffGrowth = boostScenario.totalGrowth - baseScenario.totalGrowth;
assert(diffContrib === 24000, `Extra $100/mo over 20 yrs is $24,000 extra contributions`);
assert(diffGrowth > 20000, `Extra growth is over $22,000 tax-free (got ${diffGrowth.toFixed(2)})`);
assert(Math.abs(diffBalance - (diffContrib + diffGrowth)) < 0.01, `Difference in balance equals extra contrib + extra growth`);

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
