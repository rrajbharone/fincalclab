// Test script to verify Minimum Payment Trap math and edge cases

function simulateDebt({
  balance,
  apr,
  method, // 'A', 'B', 'C'
  minPct, // decimal, e.g. 0.02
  minDollar,
  extraPayment = 0,
  fixedPayment = null, // if set, use fixed payment instead of min
  maxMonths = 1200 // 100 years limit
}) {
  const r = apr / 100 / 12;
  let currentBalance = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  let firstPayment = 0;
  let finalPayment = 0;
  const milestones = [];

  if (balance <= 0) {
    return {
      success: true,
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      firstPayment: 0,
      finalPayment: 0,
      neverRepaid: false
    };
  }

  while (currentBalance > 0.005 && months < maxMonths) {
    months++;
    const opening = currentBalance;
    const interest = r > 0 ? opening * r : 0;
    const withInterest = opening + interest;

    let targetPayment;
    if (fixedPayment !== null) {
      targetPayment = fixedPayment;
    } else {
      let minPayment;
      if (method === 'A') {
        minPayment = Math.max(opening * minPct, minDollar);
      } else if (method === 'B') {
        minPayment = Math.max(opening * minPct + interest, minDollar);
      } else if (method === 'C') {
        minPayment = Math.max(interest + opening * minPct, minDollar);
      }
      targetPayment = minPayment + extraPayment;
    }

    // Check if payment covers interest
    if (targetPayment <= interest && withInterest > minDollar) {
      return {
        success: false,
        neverRepaid: true,
        months: Infinity,
        reason: 'Payment does not exceed monthly interest. Balance will grow indefinitely.',
        firstPayment: targetPayment,
        totalInterest: Infinity,
        totalPaid: Infinity
      };
    }

    const actualPayment = Math.min(targetPayment, withInterest);
    if (months === 1) {
      firstPayment = actualPayment;
    }

    const principalPaid = actualPayment - interest;
    currentBalance = withInterest - actualPayment;
    totalInterest += interest;
    totalPaid += actualPayment;

    if (currentBalance < 0.005) {
      currentBalance = 0;
      finalPayment = actualPayment;
    }

    // Track milestones
    if (
      months <= 6 ||
      months === 12 ||
      months === 24 ||
      months === 36 ||
      months === 60 ||
      months === 120 ||
      months === 240 ||
      currentBalance === 0
    ) {
      milestones.push({
        month: months,
        opening: Math.round(opening * 100) / 100,
        payment: Math.round(actualPayment * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        principal: Math.round(principalPaid * 100) / 100,
        balance: Math.round(currentBalance * 100) / 100
      });
    }
  }

  if (months >= maxMonths && currentBalance > 0.005) {
    return {
      success: false,
      neverRepaid: true,
      months: Infinity,
      reason: 'Balance not repaid within simulation limit of 100 years.',
      firstPayment,
      totalInterest,
      totalPaid
    };
  }

  return {
    success: true,
    neverRepaid: false,
    months,
    years: Math.floor(months / 12),
    remainingMonths: months % 12,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    firstPayment: Math.round(firstPayment * 100) / 100,
    finalPayment: Math.round(finalPayment * 100) / 100,
    milestones
  };
}

// 36-Month Payoff formula
function calc36MonthPayment(balance, apr) {
  if (balance <= 0) return 0;
  const r = apr / 100 / 12;
  const n = 36;
  if (r === 0) return balance / n;
  return balance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Run test cases
console.log('--- Test Case 1: Standard $5,000 Balance, 21.99% APR, Method A (2% or $25) ---');
const tc1 = simulateDebt({
  balance: 5000,
  apr: 21.99,
  method: 'A',
  minPct: 0.02,
  minDollar: 25
});
console.log(tc1);

console.log('\n--- Test Case 2: Method B (1% of balance + interest or $25) ---');
const tc2 = simulateDebt({
  balance: 5000,
  apr: 21.99,
  method: 'B',
  minPct: 0.01,
  minDollar: 25
});
console.log(tc2);

console.log('\n--- Test Case 3: Scenario B (Method A + $50 Extra) ---');
const tc3 = simulateDebt({
  balance: 5000,
  apr: 21.99,
  method: 'A',
  minPct: 0.02,
  minDollar: 25,
  extraPayment: 50
});
console.log(tc3);

console.log('\n--- Test Case 4: Scenario C (Fixed $200 Payment) ---');
const tc4 = simulateDebt({
  balance: 5000,
  apr: 21.99,
  method: 'A',
  minPct: 0.02,
  minDollar: 25,
  fixedPayment: 200
});
console.log(tc4);

console.log('\n--- Test Case 5: 36-Month Payoff Plan ---');
const pmt36 = calc36MonthPayment(5000, 21.99);
console.log(`Monthly payment for 36 months: $${pmt36.toFixed(2)}`);
const tc36 = simulateDebt({
  balance: 5000,
  apr: 21.99,
  method: 'A',
  minPct: 0.02,
  minDollar: 25,
  fixedPayment: Math.ceil(pmt36 * 100) / 100
});
console.log(tc36);

console.log('\n--- Test Case 6: Edge Case - Payment < Interest (Trap / Never Repaid) ---');
const tcTrap = simulateDebt({
  balance: 10000,
  apr: 25,
  method: 'A',
  minPct: 0.01, // 1% of 10,000 = $100, but monthly interest is 10000 * 0.25/12 = $208.33!
  minDollar: 25
});
console.log(tcTrap);

console.log('\n--- Test Case 7: Edge Case - 0% APR ---');
const tcZeroApr = simulateDebt({
  balance: 5000,
  apr: 0,
  method: 'A',
  minPct: 0.02,
  minDollar: 25
});
console.log(tcZeroApr);
