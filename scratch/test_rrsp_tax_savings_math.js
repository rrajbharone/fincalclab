import assert from 'assert';

const TAX_CONFIG = {
  '2026': {
    rrspLimit: 33810,
    federalBrackets: [
      { from: 0, to: 58500, rate: 0.15 },
      { from: 58500, to: 117000, rate: 0.205 },
      { from: 117000, to: 181400, rate: 0.26 },
      { from: 181400, to: 258400, rate: 0.29 },
      { from: 258400, to: Infinity, rate: 0.33 }
    ],
    provinces: {
      'ON': {
        name: 'Ontario',
        brackets: [
          { from: 0, to: 52800, rate: 0.0505 },
          { from: 52800, to: 105600, rate: 0.0915 },
          { from: 105600, to: 150000, rate: 0.1116 },
          { from: 150000, to: 220000, rate: 0.1216 },
          { from: 220000, to: Infinity, rate: 0.1316 }
        ],
        surtax: true
      },
      'BC': {
        name: 'British Columbia',
        brackets: [
          { from: 0, to: 49300, rate: 0.0506 },
          { from: 49300, to: 98600, rate: 0.0770 },
          { from: 98600, to: 113200, rate: 0.1050 },
          { from: 113200, to: 137500, rate: 0.1229 },
          { from: 137500, to: 186400, rate: 0.1470 },
          { from: 186400, to: 259800, rate: 0.1680 },
          { from: 259800, to: Infinity, rate: 0.2050 }
        ]
      },
      'AB': {
        name: 'Alberta',
        brackets: [
          { from: 0, to: 151900, rate: 0.10 },
          { from: 151900, to: 182300, rate: 0.12 },
          { from: 182300, to: 243100, rate: 0.13 },
          { from: 243100, to: 364600, rate: 0.14 },
          { from: 364600, to: Infinity, rate: 0.15 }
        ]
      },
      'QC': {
        name: 'Quebec',
        brackets: [
          { from: 0, to: 53200, rate: 0.14 },
          { from: 53200, to: 106500, rate: 0.19 },
          { from: 106500, to: 129600, rate: 0.24 },
          { from: 129600, to: Infinity, rate: 0.2575 }
        ],
        abatement: true
      },
      'MB': {
        name: 'Manitoba',
        brackets: [
          { from: 0, to: 47000, rate: 0.108 },
          { from: 47000, to: 100000, rate: 0.1275 },
          { from: 100000, to: Infinity, rate: 0.174 }
        ]
      },
      'SK': {
        name: 'Saskatchewan',
        brackets: [
          { from: 0, to: 53800, rate: 0.105 },
          { from: 53800, to: 153800, rate: 0.125 },
          { from: 153800, to: Infinity, rate: 0.145 }
        ]
      },
      'NS': {
        name: 'Nova Scotia',
        brackets: [
          { from: 0, to: 30500, rate: 0.0879 },
          { from: 30500, to: 61100, rate: 0.1495 },
          { from: 61100, to: 95700, rate: 0.1667 },
          { from: 95700, to: 154800, rate: 0.1750 },
          { from: 154800, to: Infinity, rate: 0.2100 }
        ]
      },
      'NB': {
        name: 'New Brunswick',
        brackets: [
          { from: 0, to: 51700, rate: 0.0940 },
          { from: 51700, to: 103400, rate: 0.1400 },
          { from: 103400, to: 190400, rate: 0.1600 },
          { from: 190400, to: Infinity, rate: 0.1950 }
        ]
      },
      'NL': {
        name: 'Newfoundland and Labrador',
        brackets: [
          { from: 0, to: 44400, rate: 0.087 },
          { from: 44400, to: 88800, rate: 0.145 },
          { from: 88800, to: 158500, rate: 0.158 },
          { from: 158500, to: 221900, rate: 0.178 },
          { from: 221900, to: 282200, rate: 0.198 },
          { from: 282200, to: 564300, rate: 0.208 },
          { from: 564300, to: Infinity, rate: 0.218 }
        ]
      },
      'PE': {
        name: 'Prince Edward Island',
        brackets: [
          { from: 0, to: 33700, rate: 0.0965 },
          { from: 33700, to: 67400, rate: 0.1363 },
          { from: 67400, to: 105000, rate: 0.1665 },
          { from: 105000, to: 140000, rate: 0.1800 },
          { from: 140000, to: Infinity, rate: 0.1875 }
        ]
      },
      'YT': {
        name: 'Yukon',
        brackets: [
          { from: 0, to: 58500, rate: 0.064 },
          { from: 58500, to: 117000, rate: 0.090 },
          { from: 117000, to: 181400, rate: 0.109 },
          { from: 181400, to: 500000, rate: 0.128 },
          { from: 500000, to: Infinity, rate: 0.150 }
        ]
      },
      'NT': {
        name: 'Northwest Territories',
        brackets: [
          { from: 0, to: 51900, rate: 0.0590 },
          { from: 51900, to: 103900, rate: 0.0860 },
          { from: 103900, to: 168900, rate: 0.1220 },
          { from: 168900, to: Infinity, rate: 0.1405 }
        ]
      },
      'NU': {
        name: 'Nunavut',
        brackets: [
          { from: 0, to: 54900, rate: 0.040 },
          { from: 54900, to: 109800, rate: 0.070 },
          { from: 109800, to: 178500, rate: 0.090 },
          { from: 178500, to: Infinity, rate: 0.115 }
        ]
      }
    }
  }
};

function calculateBracketTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  let totalTax = 0;
  for (const b of brackets) {
    if (taxableIncome <= b.from) continue;
    const taxableSlice = Math.min(taxableIncome - b.from, b.to - b.from);
    if (taxableSlice > 0) {
      totalTax += taxableSlice * b.rate;
    }
  }
  return totalTax;
}

function calculateTaxSavings(params) {
  const {
    income = 0,
    contribution = 0,
    room = null, // null means user did not provide room
    province = 'ON',
    year = '2026'
  } = params;

  const yearConfig = TAX_CONFIG[year] || TAX_CONFIG['2026'];
  const provData = yearConfig.provinces[province] || yearConfig.provinces['ON'];

  const cleanIncome = Math.max(0, Number(income) || 0);
  const cleanContrib = Math.max(0, Number(contribution) || 0);
  const hasRoom = room !== null && room !== undefined && room !== '' && !isNaN(Number(room));
  const cleanRoom = hasRoom ? Math.max(0, Number(room)) : Infinity;

  // Deductible amount capped at available room if provided, and capped at taxable income
  const roomCappedContrib = hasRoom ? Math.min(cleanContrib, cleanRoom) : cleanContrib;
  const deductibleContrib = Math.min(roomCappedContrib, cleanIncome);
  const excessAboveRoom = hasRoom ? Math.max(0, cleanContrib - cleanRoom) : 0;

  const incomeBefore = cleanIncome;
  const incomeAfter = Math.max(0, cleanIncome - deductibleContrib);

  // Federal Tax
  let fedTaxBefore = calculateBracketTax(incomeBefore, yearConfig.federalBrackets);
  let fedTaxAfter = calculateBracketTax(incomeAfter, yearConfig.federalBrackets);

  if (provData.abatement) {
    fedTaxBefore *= 0.835;
    fedTaxAfter *= 0.835;
  }
  const fedTaxSaved = Math.max(0, fedTaxBefore - fedTaxAfter);

  // Provincial Tax
  let provTaxBefore = calculateBracketTax(incomeBefore, provData.brackets);
  let provTaxAfter = calculateBracketTax(incomeAfter, provData.brackets);

  if (provData.surtax) {
    const calcOnSurtax = (baseTax) => {
      let s = 0;
      if (baseTax > 5500) s += (baseTax - 5500) * 0.20;
      if (baseTax > 7000) s += (baseTax - 7000) * 0.36;
      return s;
    };
    provTaxBefore += calcOnSurtax(provTaxBefore);
    provTaxAfter += calcOnSurtax(provTaxAfter);
  }
  const provTaxSaved = Math.max(0, provTaxBefore - provTaxAfter);

  const totalTaxBefore = fedTaxBefore + provTaxBefore;
  const totalTaxAfter = fedTaxAfter + provTaxAfter;
  const totalTaxSaved = Math.max(0, totalTaxBefore - totalTaxAfter);
  const afterTaxCost = Math.max(0, cleanContrib - totalTaxSaved);
  const effectiveRate = deductibleContrib > 0 ? (totalTaxSaved / deductibleContrib) * 100 : 0;

  return {
    incomeBefore,
    incomeAfter,
    contribution: cleanContrib,
    deductibleContrib,
    excessAboveRoom,
    hasRoom,
    fedTaxBefore,
    fedTaxAfter,
    fedTaxSaved,
    provTaxBefore,
    provTaxAfter,
    provTaxSaved,
    totalTaxBefore,
    totalTaxAfter,
    totalTaxSaved,
    afterTaxCost,
    effectiveRate
  };
}

// -------------------------------------------------------------
// RUN 14 SCENARIOS
// -------------------------------------------------------------
console.log('--- RUNNING RRSP TAX SAVINGS ENGINE TESTS ---');

// Test 1: Ontario $50k income, $5k contribution
const t1 = calculateTaxSavings({ income: 50000, contribution: 5000, province: 'ON' });
console.log('Test 1 (ON $50k, $5k):', { savings: t1.totalTaxSaved.toFixed(2), cost: t1.afterTaxCost.toFixed(2) });
assert(t1.totalTaxSaved > 0, 'Savings should be > 0');
assert.strictEqual(t1.incomeAfter, 45000);
// In ON under $52.8k, federal is 15%, provincial is 5.05%. Total rate is 20.05%. $5,000 * 20.05% = $1,002.50.
assert(Math.abs(t1.totalTaxSaved - 1002.50) < 1, 'Expected ~1,002.50 savings');

// Test 2: Ontario $100k income, $10k contribution
const t2 = calculateTaxSavings({ income: 100000, contribution: 10000, province: 'ON' });
console.log('Test 2 (ON $100k, $10k):', { savings: t2.totalTaxSaved.toFixed(2), cost: t2.afterTaxCost.toFixed(2), rate: t2.effectiveRate.toFixed(2) + '%' });
assert(t2.totalTaxSaved > 3000, 'ON $100k should save > $3k');

// Test 3: Alberta $100k income, $10k contribution
const t3 = calculateTaxSavings({ income: 100000, contribution: 10000, province: 'AB' });
console.log('Test 3 (AB $100k, $10k):', { savings: t3.totalTaxSaved.toFixed(2), cost: t3.afterTaxCost.toFixed(2) });
// Federal 20.5% + AB flat 10% = 30.5%. $10,000 * 30.5% = $3,050.
assert(Math.abs(t3.totalTaxSaved - 3050) < 1, 'Expected ~3,050 savings in AB');

// Test 4: British Columbia $100k income, $10k contribution
const t4 = calculateTaxSavings({ income: 100000, contribution: 10000, province: 'BC' });
console.log('Test 4 (BC $100k, $10k):', { savings: t4.totalTaxSaved.toFixed(2), cost: t4.afterTaxCost.toFixed(2) });
assert(t4.totalTaxSaved > 2800, 'BC $100k should save > $2.8k');

// Test 5: Quebec $100k income, $10k contribution
const t5 = calculateTaxSavings({ income: 100000, contribution: 10000, province: 'QC' });
console.log('Test 5 (QC $100k, $10k):', { savings: t5.totalTaxSaved.toFixed(2), cost: t5.afterTaxCost.toFixed(2) });
assert(t5.fedTaxSaved < t2.fedTaxSaved, 'Quebec federal tax savings should reflect 16.5% abatement');
assert(t5.provTaxSaved > 0, 'Quebec provincial savings should be > 0');

// Test 6: Low-income user ($20,000 income, $3,000 contribution)
const t6 = calculateTaxSavings({ income: 20000, contribution: 3000, province: 'ON' });
console.log('Test 6 (Low income $20k, $3k):', { savings: t6.totalTaxSaved.toFixed(2), cost: t6.afterTaxCost.toFixed(2) });
assert(t6.totalTaxSaved > 0);

// Test 7: High-income user ($300,000 income, $30,000 contribution)
const t7 = calculateTaxSavings({ income: 300000, contribution: 30000, province: 'ON' });
console.log('Test 7 (High income $300k, $30k):', { savings: t7.totalTaxSaved.toFixed(2), rate: t7.effectiveRate.toFixed(2) + '%' });
assert(t7.effectiveRate > 45, 'High income in ON should face top bracket ~53.53%');

// Test 8: Bracket crossing ($120k income, $15k contribution in ON crossing $117k federal threshold)
const t8 = calculateTaxSavings({ income: 120000, contribution: 15000, province: 'ON' });
console.log('Test 8 (Bracket crossing):', { fedSaved: t8.fedTaxSaved.toFixed(2), totalSaved: t8.totalTaxSaved.toFixed(2) });
assert(t8.fedTaxSaved > 0);

// Test 9: Bracket crossing provincial
const t9 = calculateTaxSavings({ income: 60000, contribution: 10000, province: 'ON' }); // crosses 52,800 provincial bracket
console.log('Test 9 (Provincial bracket crossing):', { provSaved: t9.provTaxSaved.toFixed(2) });
assert(t9.provTaxSaved > 0);

// Test 10: Contribution exceeding available room
const t10 = calculateTaxSavings({ income: 100000, contribution: 10000, room: 6000, province: 'ON' });
console.log('Test 10 (Exceeding room):', { deductible: t10.deductibleContrib, excess: t10.excessAboveRoom, savings: t10.totalTaxSaved.toFixed(2) });
assert.strictEqual(t10.deductibleContrib, 6000);
assert.strictEqual(t10.excessAboveRoom, 4000);

// Test 11: $0 contribution
const t11 = calculateTaxSavings({ income: 100000, contribution: 0, province: 'ON' });
assert.strictEqual(t11.totalTaxSaved, 0);
assert.strictEqual(t11.afterTaxCost, 0);

// Test 12: $0 income
const t12 = calculateTaxSavings({ income: 0, contribution: 5000, province: 'ON' });
assert.strictEqual(t12.totalTaxSaved, 0);
assert.strictEqual(t12.deductibleContrib, 0);

// Test 13: Large contribution
const t13 = calculateTaxSavings({ income: 500000, contribution: 100000, province: 'AB' });
assert(t13.totalTaxSaved > 0);
assert(t13.afterTaxCost > 0);

// Test 14: Decimal inputs
const t14 = calculateTaxSavings({ income: 75432.50, contribution: 5678.90, province: 'BC' });
assert(!isNaN(t14.totalTaxSaved));
assert(t14.totalTaxSaved > 0);

console.log('--- ALL 14 TESTS PASSED SUCCESSFULLY ---');
