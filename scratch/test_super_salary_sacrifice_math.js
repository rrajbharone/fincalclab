// scratch/test_super_salary_sacrifice_math.js
const AU_TAX_CONFIGS = {
  '2025_26': {
    label: '2025–26 (Current: Revised Stage 3 & 12% SG)',
    year: '2025_26',
    sgRate: 0.12,
    concessionalCap: 30000,
    div293Threshold: 250000,
    div293Rate: 0.15,
    medicareRate: 0.02,
    medicareLowIncomeThreshold: 26000,
    medicarePhaseInThreshold: 32500,
    superTaxRate: 0.15,
    brackets: [
      { min: 0, max: 18200, rate: 0.0, baseTax: 0 },
      { min: 18200, max: 45000, rate: 0.16, baseTax: 0 },
      { min: 45000, max: 135000, rate: 0.30, baseTax: 4288 },
      { min: 135000, max: 190000, rate: 0.37, baseTax: 31288 },
      { min: 190000, max: null, rate: 0.45, baseTax: 51638 }
    ]
  },
  '2024_25': {
    label: '2024–25 (Revised Stage 3 & 11.5% SG)',
    year: '2024_25',
    sgRate: 0.115,
    concessionalCap: 30000,
    div293Threshold: 250000,
    div293Rate: 0.15,
    medicareRate: 0.02,
    medicareLowIncomeThreshold: 26000,
    medicarePhaseInThreshold: 32500,
    superTaxRate: 0.15,
    brackets: [
      { min: 0, max: 18200, rate: 0.0, baseTax: 0 },
      { min: 18200, max: 45000, rate: 0.16, baseTax: 0 },
      { min: 45000, max: 135000, rate: 0.30, baseTax: 4288 },
      { min: 135000, max: 190000, rate: 0.37, baseTax: 31288 },
      { min: 190000, max: null, rate: 0.45, baseTax: 51638 }
    ]
  },
  '2023_24': {
    label: '2023–24 (Historical: Pre-Stage 3 & 11% SG)',
    year: '2023_24',
    sgRate: 0.11,
    concessionalCap: 27500,
    div293Threshold: 250000,
    div293Rate: 0.15,
    medicareRate: 0.02,
    medicareLowIncomeThreshold: 24276,
    medicarePhaseInThreshold: 30345,
    superTaxRate: 0.15,
    brackets: [
      { min: 0, max: 18200, rate: 0.0, baseTax: 0 },
      { min: 18200, max: 45000, rate: 0.19, baseTax: 0 },
      { min: 45000, max: 120000, rate: 0.325, baseTax: 5092 },
      { min: 120000, max: 180000, rate: 0.37, baseTax: 29467 },
      { min: 180000, max: null, rate: 0.45, baseTax: 51667 }
    ]
  }
};

function calculateIncomeTax(taxableIncome, brackets) {
  if (taxableIncome <= 18200) return 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    const b = brackets[i];
    if (taxableIncome > b.min) {
      return b.baseTax + (taxableIncome - b.min) * b.rate;
    }
  }
  return 0;
}

function calculateMedicareLevy(taxableIncome, config) {
  if (taxableIncome <= config.medicareLowIncomeThreshold) {
    return 0;
  }
  if (taxableIncome <= config.medicarePhaseInThreshold) {
    // 10% of excess over low income threshold
    return (taxableIncome - config.medicareLowIncomeThreshold) * 0.10;
  }
  return taxableIncome * config.medicareRate;
}

function calculateDiv293Tax(taxableIncome, concessionalContrib, config) {
  const combined = taxableIncome + concessionalContrib;
  if (combined <= config.div293Threshold) {
    return 0;
  }
  const excess = combined - config.div293Threshold;
  const taxablePortion = Math.min(concessionalContrib, excess);
  return taxablePortion * config.div293Rate;
}

function calculateSuperSalarySacrifice({
  grossSalary = 100000,
  sacrificeMode = 'dollar', // 'dollar' | 'percent'
  sacrificeValue = 10000,
  taxYear = '2025_26',
  payFrequency = 'annual', // 'annual' | 'monthly' | 'fortnightly' | 'weekly'
  employerSuperOverride = null // optional override or null (calculated as grossSalary * sgRate)
}) {
  const config = AU_TAX_CONFIGS[taxYear] || AU_TAX_CONFIGS['2025_26'];
  const salary = Math.max(0, Number(grossSalary) || 0);

  // Calculate annual salary sacrifice amount
  let sacrificeAmount = 0;
  if (sacrificeMode === 'percent') {
    const pct = Math.max(0, Math.min(100, Number(sacrificeValue) || 0));
    sacrificeAmount = (salary * pct) / 100;
  } else {
    sacrificeAmount = Math.max(0, Number(sacrificeValue) || 0);
  }
  // Cap sacrifice at gross salary
  sacrificeAmount = Math.min(salary, sacrificeAmount);

  // Employer Super Guarantee (based on Ordinary Time Earnings before sacrifice)
  const employerSuper = employerSuperOverride !== null && employerSuperOverride !== undefined && employerSuperOverride !== ''
    ? Math.max(0, Number(employerSuperOverride) || 0)
    : salary * config.sgRate;

  // --- SCENARIO 1: WITHOUT SALARY SACRIFICE ---
  const taxableWithout = salary;
  const incomeTaxWithout = calculateIncomeTax(taxableWithout, config.brackets);
  const medicareWithout = calculateMedicareLevy(taxableWithout, config);
  const totalTaxWithout = incomeTaxWithout + medicareWithout;
  const takeHomeWithout = Math.max(0, taxableWithout - totalTaxWithout);

  // Div 293 without sacrifice (only on employer SG)
  const div293Without = calculateDiv293Tax(taxableWithout, employerSuper, config);
  const superFromSacrificeWithout = 0;
  const netSuperFromSacrificeWithout = 0;

  // --- SCENARIO 2: WITH SALARY SACRIFICE ---
  const taxableWith = Math.max(0, salary - sacrificeAmount);
  const incomeTaxWith = calculateIncomeTax(taxableWith, config.brackets);
  const medicareWith = calculateMedicareLevy(taxableWith, config);
  const totalTaxWith = incomeTaxWith + medicareWith;
  const takeHomeWith = Math.max(0, taxableWith - totalTaxWith);

  // Total concessional contributions with sacrifice
  const totalConcessional = employerSuper + sacrificeAmount;
  const isCapExceeded = totalConcessional > config.concessionalCap;
  const excessCapAmount = Math.max(0, totalConcessional - config.concessionalCap);

  // Div 293 with sacrifice
  const div293With = calculateDiv293Tax(taxableWith, totalConcessional, config);
  const div293Applies = (taxableWith + totalConcessional) > config.div293Threshold;

  // Super tax inside fund on sacrificed amount (15%)
  const superFundTaxOnSacrifice = sacrificeAmount * config.superTaxRate;
  const netSuperCredited = Math.max(0, sacrificeAmount - superFundTaxOnSacrifice);

  // Comparisons & Savings
  const incomeTaxSaved = incomeTaxWithout - incomeTaxWith;
  const medicareSaved = medicareWithout - medicareWith;
  const totalEmployeeTaxSaved = totalTaxWithout - totalTaxWith;

  const takeHomeReduction = takeHomeWithout - takeHomeWith;
  // Effective after-tax cost of the sacrifice is exactly the drop in take-home pay
  const effectiveCost = takeHomeReduction;

  // Net wealth benefit = Net super received − Take-home reduction
  const netBenefitToWealth = netSuperCredited - takeHomeReduction;

  // Pay frequency factors
  const freqFactors = {
    annual: 1,
    monthly: 12,
    fortnightly: 26,
    weekly: 52
  };
  const factor = freqFactors[payFrequency] || 1;

  return {
    grossSalary: salary,
    sacrificeAmount,
    taxableWithout,
    taxableWith,
    incomeTaxWithout,
    incomeTaxWith,
    medicareWithout,
    medicareWith,
    totalTaxWithout,
    totalTaxWith,
    takeHomeWithout,
    takeHomeWith,
    takeHomeReduction,
    totalEmployeeTaxSaved,
    incomeTaxSaved,
    medicareSaved,
    employerSuper,
    totalConcessional,
    concessionalCap: config.concessionalCap,
    isCapExceeded,
    excessCapAmount,
    div293Applies,
    div293Without,
    div293With,
    superTaxRate: config.superTaxRate,
    superFundTaxOnSacrifice,
    netSuperCredited,
    netBenefitToWealth,
    effectiveCost,
    payFrequency,
    takeHomeWithoutPeriodic: takeHomeWithout / factor,
    takeHomeWithPeriodic: takeHomeWith / factor,
    takeHomeReductionPeriodic: takeHomeReduction / factor
  };
}

// Test Suite
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

// Test 1: Standard Australian worker earning $100,000, sacrificing $10,000 in 2025-26
// In 2025-26 (Stage 3):
// $100,000 is in the 30% bracket ($45k - $135k).
// Tax without: $4,288 + 30% * (100k - 45k) = $4,288 + $16,500 = $20,788.
// Medicare without: 2% of $100k = $2,000. Total tax without = $22,788. Take-home without = $77,212.
// With $10k sacrifice:
// Taxable income = $90,000 (still entirely in 30% bracket).
// Tax with: $4,288 + 30% * (90k - 45k) = $4,288 + $13,500 = $17,788.
// Medicare with: 2% of $90k = $1,800. Total tax with = $19,588. Take-home with = $70,412.
// Tax saved: $20,788 - $17,788 = $3,000 (income tax) + $200 (medicare) = $3,200.
// Take-home reduction = $77,212 - $70,412 = $6,800.
// Super fund tax on $10k = $1,500. Net super received = $8,500.
// Net benefit = $8,500 - $6,800 = $1,700!
const t1 = calculateSuperSalarySacrifice({
  grossSalary: 100000,
  sacrificeMode: 'dollar',
  sacrificeValue: 10000,
  taxYear: '2025_26'
});
assert(t1.taxableWithout === 100000, 'Taxable without = $100,000');
assert(t1.incomeTaxWithout === 20788, `Income tax without = $20,788 (got ${t1.incomeTaxWithout})`);
assert(t1.medicareWithout === 2000, `Medicare without = $2,000 (got ${t1.medicareWithout})`);
assert(t1.taxableWith === 90000, 'Taxable with = $90,000');
assert(t1.incomeTaxWith === 17788, `Income tax with = $17,788 (got ${t1.incomeTaxWith})`);
assert(t1.medicareWith === 1800, `Medicare with = $1,800 (got ${t1.medicareWith})`);
assert(t1.totalEmployeeTaxSaved === 3200, `Total tax saved = $3,200 (got ${t1.totalEmployeeTaxSaved})`);
assert(t1.takeHomeReduction === 6800, `Take home reduction = $6,800 (got ${t1.takeHomeReduction})`);
assert(t1.netSuperCredited === 8500, `Net super received = $8,500 (got ${t1.netSuperCredited})`);
assert(t1.netBenefitToWealth === 1700, `Net wealth gain = $1,700 (got ${t1.netBenefitToWealth})`);
assert(t1.employerSuper === 12000, `Employer 12% SG on $100k = $12,000 (got ${t1.employerSuper})`);
assert(!t1.isCapExceeded, 'Total concessional ($22k) does not exceed $30k cap');

// Test 2: Percentage sacrifice (e.g. 10% of $120,000 salary)
const t2 = calculateSuperSalarySacrifice({
  grossSalary: 120000,
  sacrificeMode: 'percent',
  sacrificeValue: 10,
  taxYear: '2025_26'
});
assert(t2.sacrificeAmount === 12000, '10% of $120k is $12,000 sacrifice');
assert(t2.taxableWith === 108000, 'Taxable with = $108,000');

// Test 3: Concessional cap warning trigger
// Salary $180,000, 12% SG = $21,600.
// Sacrifice $15,000 -> Total concessional = $36,600 > $30,000 cap!
const t3 = calculateSuperSalarySacrifice({
  grossSalary: 180000,
  sacrificeMode: 'dollar',
  sacrificeValue: 15000,
  taxYear: '2025_26'
});
assert(t3.isCapExceeded, 'Cap exceeded flag is true');
assert(t3.excessCapAmount === 6600, `Excess cap amount = $6,600 (got ${t3.excessCapAmount})`);

// Test 4: Division 293 warning trigger
// Salary $280,000, Div 293 threshold is $250,000
const t4 = calculateSuperSalarySacrifice({
  grossSalary: 280000,
  sacrificeMode: 'dollar',
  sacrificeValue: 10000,
  taxYear: '2025_26'
});
assert(t4.div293Applies, 'Division 293 applies for $280k earner');

// Test 5: Low income / zero tax ($18,000 salary)
const t5 = calculateSuperSalarySacrifice({
  grossSalary: 180000,
  sacrificeMode: 'dollar',
  sacrificeValue: 0,
  taxYear: '2025_26'
});
assert(t5.totalEmployeeTaxSaved === 0, '$0 sacrifice produces $0 tax saved');

// Test 6: $0 salary edge case
const t6 = calculateSuperSalarySacrifice({
  grossSalary: 0,
  sacrificeMode: 'dollar',
  sacrificeValue: 5000,
  taxYear: '2025_26'
});
assert(t6.sacrificeAmount === 0, '$0 salary caps sacrifice at $0');
assert(t6.totalTaxWithout === 0, 'No tax on $0');

// Test 7: Fortnightly pay frequency
const t7 = calculateSuperSalarySacrifice({
  grossSalary: 104000,
  sacrificeMode: 'dollar',
  sacrificeValue: 10400,
  taxYear: '2025_26',
  payFrequency: 'fortnightly'
});
assert(Math.abs(t7.takeHomeWithoutPeriodic - t7.takeHomeWithout / 26) < 0.01, 'Fortnightly take home matches annual / 26');

// Test 8: Historical tax year 2023-24 (Pre-Stage 3)
const t8 = calculateSuperSalarySacrifice({
  grossSalary: 100000,
  sacrificeMode: 'dollar',
  sacrificeValue: 10000,
  taxYear: '2023_24'
});
// In 2023-24: 32.5% bracket + 2% Medicare = 34.5%
assert(t8.incomeTaxWithout === 5092 + 0.325 * (100000 - 45000), `2023-24 pre-stage 3 tax matches formula (${t8.incomeTaxWithout})`);
assert(t8.totalEmployeeTaxSaved === 3450, `2023-24 tax saved = $3,450 (34.5% of $10k) (got ${t8.totalEmployeeTaxSaved})`);

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
