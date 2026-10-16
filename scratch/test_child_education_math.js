import assert from 'assert';

function calculateEducationCost(params) {
  const {
    currentAge,
    startAge,
    duration,
    baseAnnualCost,
    additionalAnnualCost,
    inflationRate, // e.g. 0.10 for 10%
    returnRate,    // e.g. 0.11 for 11%
    existingSavings,
    frequency      // 'monthly' or 'annual'
  } = params;

  const annualCostToday = Math.max(0, baseAnnualCost + additionalAnnualCost);
  const yearsUntilStart = Math.max(0, startAge - currentAge);
  const dur = Math.max(1, Math.min(20, Math.round(duration)));

  // Total cost in today's money
  const totalCostToday = annualCostToday * dur;

  // Year-by-year projected cash flows
  const yearlyCosts = [];
  let totalProjectedCost = 0;
  let firstYearCost = 0;

  for (let y = 1; y <= dur; y++) {
    const elapsedYears = yearsUntilStart + (y - 1);
    const inflatedCost = annualCostToday * Math.pow(1 + inflationRate, elapsedYears);
    yearlyCosts.push({
      yearIndex: y,
      childAge: startAge + (y - 1),
      elapsedYears,
      inflatedCost
    });
    totalProjectedCost += inflatedCost;
    if (y === 1) firstYearCost = inflatedCost;
  }

  // Future value of existing savings at the time education begins (Year T)
  const fvExistingSavingsAtStart = existingSavings * Math.pow(1 + returnRate, yearsUntilStart);

  // Present Value of the multi-year education expenses at the start of education (Year T)
  // Assuming fees are paid at the beginning of each academic year:
  // Year 1 fee is paid at Year T (discounted by (1+r)^0)
  // Year 2 fee is paid at Year T+1 (discounted by (1+r)^1), etc.
  let pvCorpusAtStart = 0;
  for (let y = 1; y <= dur; y++) {
    const discountYears = y - 1;
    if (returnRate === 0) {
      pvCorpusAtStart += yearlyCosts[y - 1].inflatedCost;
    } else {
      pvCorpusAtStart += yearlyCosts[y - 1].inflatedCost / Math.pow(1 + returnRate, discountYears);
    }
  }

  // Net target corpus needed at Year T
  const netCorpusGapAtStart = Math.max(0, pvCorpusAtStart - fvExistingSavingsAtStart);
  const isSurplus = fvExistingSavingsAtStart >= pvCorpusAtStart;
  const surplusAmount = isSurplus ? fvExistingSavingsAtStart - pvCorpusAtStart : 0;

  // Savings required during the accumulation phase (yearsUntilStart)
  let requiredMonthlySavings = 0;
  let requiredAnnualSavings = 0;

  if (netCorpusGapAtStart > 0) {
    if (yearsUntilStart === 0) {
      // Education starts immediately: fund across the duration or lump sum
      // If no lead time, monthly payment over duration of education
      const totalMonths = dur * 12;
      const monthlyRate = returnRate / 12;
      if (returnRate === 0) {
        requiredMonthlySavings = netCorpusGapAtStart / totalMonths;
        requiredAnnualSavings = netCorpusGapAtStart / dur;
      } else {
        requiredMonthlySavings = netCorpusGapAtStart * (monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1));
        requiredAnnualSavings = netCorpusGapAtStart * (returnRate / (Math.pow(1 + returnRate, dur) - 1));
      }
    } else {
      // Accumulation period before education begins
      const totalMonths = yearsUntilStart * 12;
      const monthlyRate = returnRate / 12;

      if (returnRate === 0) {
        requiredMonthlySavings = netCorpusGapAtStart / totalMonths;
        requiredAnnualSavings = netCorpusGapAtStart / yearsUntilStart;
      } else {
        requiredMonthlySavings = netCorpusGapAtStart * (monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1));
        requiredAnnualSavings = netCorpusGapAtStart * (returnRate / (Math.pow(1 + returnRate, yearsUntilStart) - 1));
      }
    }
  }

  // Out of pocket capital invested
  let totalOutOfPocket = existingSavings;
  if (yearsUntilStart > 0) {
    if (frequency === 'monthly') {
      totalOutOfPocket += requiredMonthlySavings * (yearsUntilStart * 12);
    } else {
      totalOutOfPocket += requiredAnnualSavings * yearsUntilStart;
    }
  } else {
    totalOutOfPocket += (frequency === 'monthly') ? requiredMonthlySavings * (dur * 12) : requiredAnnualSavings * dur;
  }

  // Investment growth = Total projected expenses funded - out of pocket capital
  const totalInvestmentGrowth = Math.max(0, totalProjectedCost - totalOutOfPocket);

  // Undiscounted savings gap (for user clarity: Total Cost - FV of existing savings)
  const undiscountedSavingsGap = Math.max(0, totalProjectedCost - fvExistingSavingsAtStart);

  return {
    totalCostToday,
    totalProjectedCost,
    firstYearCost,
    yearsUntilStart,
    duration: dur,
    fvExistingSavingsAtStart,
    pvCorpusAtStart,
    netCorpusGapAtStart,
    isSurplus,
    surplusAmount,
    requiredMonthlySavings,
    requiredAnnualSavings,
    totalOutOfPocket,
    totalInvestmentGrowth,
    undiscountedSavingsGap,
    yearlyCosts
  };
}

console.log('Running Child Education Cost Calculator Unit Tests...\n');

// Test 1: Standard Indian Undergraduate scenario
// Child Age 5, Start Age 18 (13 yrs to start), Duration 4 yrs, ₹4,50,000/yr, 10% inflation, 11% return, ₹2,00,000 savings
{
  const res = calculateEducationCost({
    currentAge: 5,
    startAge: 18,
    duration: 4,
    baseAnnualCost: 400000,
    additionalAnnualCost: 50000,
    inflationRate: 0.10,
    returnRate: 0.11,
    existingSavings: 200000,
    frequency: 'monthly'
  });

  console.log('Test 1 (India UG standard):');
  console.log('  Total cost today:', res.totalCostToday);
  console.log('  First year cost:', Math.round(res.firstYearCost));
  console.log('  Total projected cost:', Math.round(res.totalProjectedCost));
  console.log('  FV existing savings:', Math.round(res.fvExistingSavingsAtStart));
  console.log('  PV corpus at start:', Math.round(res.pvCorpusAtStart));
  console.log('  Required monthly SIP:', Math.round(res.requiredMonthlySavings));
  console.log('  Investment growth:', Math.round(res.totalInvestmentGrowth));

  assert.strictEqual(res.totalCostToday, 1800000);
  assert(res.firstYearCost > 1500000, 'Year 1 cost should be over 15 lakh after 13 years of 10% inflation');
  assert(res.totalProjectedCost > 7000000, 'Total cost should be over 70 lakh');
  assert(res.requiredMonthlySavings > 5000 && res.requiredMonthlySavings < 25000, 'Monthly SIP should be realistic');
  assert(!res.isSurplus, 'Should have a gap');
  console.log('  ✓ Test 1 Passed\n');
}

// Test 2: Zero investment return (r = 0)
{
  const res = calculateEducationCost({
    currentAge: 10,
    startAge: 18,
    duration: 4,
    baseAnnualCost: 100000,
    additionalAnnualCost: 0,
    inflationRate: 0.05,
    returnRate: 0,
    existingSavings: 50000,
    frequency: 'monthly'
  });

  console.log('Test 2 (Zero return r=0):');
  console.log('  Total projected cost:', Math.round(res.totalProjectedCost));
  console.log('  PV corpus at start:', Math.round(res.pvCorpusAtStart));
  console.log('  Net corpus gap:', Math.round(res.netCorpusGapAtStart));
  console.log('  Required monthly:', Math.round(res.requiredMonthlySavings));

  assert.strictEqual(Math.round(res.pvCorpusAtStart), Math.round(res.totalProjectedCost), 'PV corpus should equal total cost when r=0');
  assert.strictEqual(Math.round(res.fvExistingSavingsAtStart), 50000, 'FV existing savings should equal 50000 when r=0');
  const expectedMonthly = (res.totalProjectedCost - 50000) / (8 * 12);
  assert.strictEqual(Math.round(res.requiredMonthlySavings), Math.round(expectedMonthly), 'Monthly savings should be linear division when r=0');
  console.log('  ✓ Test 2 Passed\n');
}

// Test 3: Large existing savings (Surplus scenario)
{
  const res = calculateEducationCost({
    currentAge: 10,
    startAge: 18,
    duration: 4,
    baseAnnualCost: 50000,
    additionalAnnualCost: 0,
    inflationRate: 0.05,
    returnRate: 0.08,
    existingSavings: 500000, // Enough to cover everything
    frequency: 'monthly'
  });

  console.log('Test 3 (Surplus Scenario):');
  console.log('  Total projected cost:', Math.round(res.totalProjectedCost));
  console.log('  PV corpus at start:', Math.round(res.pvCorpusAtStart));
  console.log('  FV existing savings:', Math.round(res.fvExistingSavingsAtStart));
  console.log('  Is surplus:', res.isSurplus);
  console.log('  Surplus amount:', Math.round(res.surplusAmount));
  console.log('  Required monthly:', res.requiredMonthlySavings);

  assert.strictEqual(res.isSurplus, true);
  assert.strictEqual(res.requiredMonthlySavings, 0);
  assert.strictEqual(res.requiredAnnualSavings, 0);
  console.log('  ✓ Test 3 Passed\n');
}

// Test 4: Immediate start (Child age = Start age, T = 0)
{
  const res = calculateEducationCost({
    currentAge: 18,
    startAge: 18,
    duration: 3,
    baseAnnualCost: 100000,
    additionalAnnualCost: 0,
    inflationRate: 0.06,
    returnRate: 0.08,
    existingSavings: 0,
    frequency: 'monthly'
  });

  console.log('Test 4 (Immediate Start T=0):');
  console.log('  Years until start:', res.yearsUntilStart);
  console.log('  Total projected cost:', Math.round(res.totalProjectedCost));
  console.log('  PV corpus:', Math.round(res.pvCorpusAtStart));
  console.log('  Required monthly:', Math.round(res.requiredMonthlySavings));

  assert.strictEqual(res.yearsUntilStart, 0);
  assert(res.requiredMonthlySavings > 0);
  console.log('  ✓ Test 4 Passed\n');
}

// Test 5: UAE Scenario (AED)
{
  const res = calculateEducationCost({
    currentAge: 3,
    startAge: 18,
    duration: 4,
    baseAnnualCost: 75000,
    additionalAnnualCost: 15000,
    inflationRate: 0.05,
    returnRate: 0.07,
    existingSavings: 50000,
    frequency: 'monthly'
  });

  console.log('Test 5 (UAE Private College):');
  console.log('  Total projected cost (AED):', Math.round(res.totalProjectedCost));
  console.log('  Required monthly (AED):', Math.round(res.requiredMonthlySavings));
  assert(res.totalProjectedCost > 700000);
  console.log('  ✓ Test 5 Passed\n');
}

// Test 6: Singapore Scenario (SGD)
{
  const res = calculateEducationCost({
    currentAge: 2,
    startAge: 19,
    duration: 4,
    baseAnnualCost: 9500, // NUS Citizen subsidized
    additionalAnnualCost: 6000, // living + hall
    inflationRate: 0.04,
    returnRate: 0.06,
    existingSavings: 10000,
    frequency: 'monthly'
  });

  console.log('Test 6 (Singapore Autonomous Uni Citizen):');
  console.log('  Total projected cost (S$):', Math.round(res.totalProjectedCost));
  console.log('  Required monthly (S$):', Math.round(res.requiredMonthlySavings));
  assert(res.totalProjectedCost > 100000);
  console.log('  ✓ Test 6 Passed\n');
}

console.log('ALL TESTS PASSED SUCCESSFULLY!');
