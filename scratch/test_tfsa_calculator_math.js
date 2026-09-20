import assert from 'assert';

const TFSA_ANNUAL_LIMITS = {
  2009: 5000,
  2010: 5000,
  2011: 5000,
  2012: 5000,
  2013: 5500,
  2014: 5500,
  2015: 10000,
  2016: 5500,
  2017: 5500,
  2018: 5500,
  2019: 6000,
  2020: 6000,
  2021: 6000,
  2022: 6000,
  2023: 6500,
  2024: 7000,
  2025: 7000,
  2026: 7000
};

function calculateTfsaRoom(params) {
  const {
    year = 2026,
    unusedRoom = 0,
    prevYearWithdrawals = 0,
    contributionsMadeThisYear = 0,
    plannedContribution = 0
  } = params;

  const currentLimit = TFSA_ANNUAL_LIMITS[year] || 7000;
  const cleanUnused = Math.max(0, Number(unusedRoom) || 0);
  const cleanPrevWithdrawals = Math.max(0, Number(prevYearWithdrawals) || 0);
  const cleanContributedThisYear = Math.max(0, Number(contributionsMadeThisYear) || 0);
  const cleanPlanned = Math.max(0, Number(plannedContribution) || 0);

  // Available room for current year
  const availableRoom = currentLimit + cleanUnused + cleanPrevWithdrawals - cleanContributedThisYear;

  // Remaining room after planned contribution
  const netAfterPlanned = availableRoom - cleanPlanned;
  const remainingRoom = Math.max(0, netAfterPlanned);
  const overContribution = netAfterPlanned < 0 ? Math.abs(netAfterPlanned) : 0;

  return {
    year,
    currentLimit,
    unusedRoom: cleanUnused,
    prevYearWithdrawals: cleanPrevWithdrawals,
    contributionsMadeThisYear: cleanContributedThisYear,
    availableRoom,
    plannedContribution: cleanPlanned,
    remainingRoom,
    overContribution,
    isOverContributed: overContribution > 0
  };
}

function estimateCumulativeRoom(turned18Year, residentYear, targetYear = 2026, pastContributions = 0) {
  // Room starts accumulating in the later of 2009, year turned 18, or year became resident
  const effectiveStart = Math.max(2009, Math.max(Number(turned18Year) || 2009, Number(residentYear) || 2009));
  let totalCumulative = 0;

  for (let y = effectiveStart; y <= targetYear; y++) {
    if (TFSA_ANNUAL_LIMITS[y]) {
      totalCumulative += TFSA_ANNUAL_LIMITS[y];
    }
  }

  const cleanPast = Math.max(0, Number(pastContributions) || 0);
  const estimatedUnusedRoom = Math.max(0, totalCumulative - cleanPast);

  return {
    effectiveStart,
    targetYear,
    totalCumulative,
    pastContributions: cleanPast,
    estimatedUnusedRoom
  };
}

console.log('--- RUNNING TFSA CALCULATOR MATH TESTS ---');

// Test 1: Standard 2026 fresh contribution
const t1 = calculateTfsaRoom({ year: 2026, plannedContribution: 5000 });
assert.strictEqual(t1.currentLimit, 7000);
assert.strictEqual(t1.availableRoom, 7000);
assert.strictEqual(t1.remainingRoom, 2000);
assert.strictEqual(t1.overContribution, 0);
console.log('Test 1 Passed: Standard 2026 calculation');

// Test 2: Unused room carryforward
const t2 = calculateTfsaRoom({ year: 2026, unusedRoom: 25000, plannedContribution: 10000 });
assert.strictEqual(t2.availableRoom, 32000); // 7000 + 25000
assert.strictEqual(t2.remainingRoom, 22000);
console.log('Test 2 Passed: Unused room carryforward');

// Test 3: Previous-year withdrawal re-addition
const t3 = calculateTfsaRoom({ year: 2026, unusedRoom: 10000, prevYearWithdrawals: 5000, plannedContribution: 8000 });
assert.strictEqual(t3.availableRoom, 22000); // 7000 + 10000 + 5000
assert.strictEqual(t3.remainingRoom, 14000);
console.log('Test 3 Passed: Previous-year withdrawal re-addition');

// Test 4: Contributions already made this year
const t4 = calculateTfsaRoom({ year: 2026, unusedRoom: 0, contributionsMadeThisYear: 3000, plannedContribution: 4000 });
assert.strictEqual(t4.availableRoom, 4000); // 7000 - 3000
assert.strictEqual(t4.remainingRoom, 0);
assert.strictEqual(t4.overContribution, 0);
console.log('Test 4 Passed: Contributions made this year');

// Test 5: Over-contribution detection
const t5 = calculateTfsaRoom({ year: 2026, availableRoom: 7000, plannedContribution: 10000 });
assert.strictEqual(t5.remainingRoom, 0);
assert.strictEqual(t5.overContribution, 3000);
assert.strictEqual(t5.isOverContributed, true);
console.log('Test 5 Passed: Over-contribution detected');

// Test 6: Cumulative lifetime total from 2009 to 2026 ($102k through 2025 + $7k for 2026 = $109,000)
const t6 = estimateCumulativeRoom(1990, 1990, 2026, 0);
assert.strictEqual(t6.totalCumulative, 109000);
console.log('Test 6 Passed: Lifetime cumulative max for 2026 is $109,000 ($102,000 carryforward + $7,000)');

// Test 7: Turned 18 in 2020
// Eligible years: 2020 ($6k), 2021 ($6k), 2022 ($6k), 2023 ($6.5k), 2024 ($7k), 2025 ($7k), 2026 ($7k) = $45,500
const t7 = estimateCumulativeRoom(2020, 2020, 2026, 10000);
assert.strictEqual(t7.totalCumulative, 45500);
assert.strictEqual(t7.estimatedUnusedRoom, 35500);
console.log('Test 7 Passed: Turned 18 in 2020 estimation');

// Test 8: New Canadian resident in 2022
// Eligible years: 2022 ($6k), 2023 ($6.5k), 2024 ($7k), 2025 ($7k), 2026 ($7k) = $33,500
const t8 = estimateCumulativeRoom(1995, 2022, 2026, 5000);
assert.strictEqual(t8.totalCumulative, 33500);
assert.strictEqual(t8.estimatedUnusedRoom, 28500);
console.log('Test 8 Passed: Newcomer resident estimation');

// Test 9: $0 inputs
const t9 = calculateTfsaRoom({ year: 2026, unusedRoom: 0, prevYearWithdrawals: 0, contributionsMadeThisYear: 0, plannedContribution: 0 });
assert.strictEqual(t9.availableRoom, 7000);
assert.strictEqual(t9.remainingRoom, 7000);
assert.strictEqual(t9.overContribution, 0);
console.log('Test 9 Passed: $0 inputs');

// Test 10: Decimal values
const t10 = calculateTfsaRoom({ year: 2026, unusedRoom: 1250.50, plannedContribution: 3450.75 });
assert.strictEqual(t10.availableRoom, 8250.50);
assert.strictEqual(t10.remainingRoom, 4799.75);
console.log('Test 10 Passed: Decimal values');

console.log('--- ALL TFSA MATH TESTS PASSED SUCCESSFULLY ---');
