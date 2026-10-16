// Test script for Multi-Country Capital Gains Tax Calculator
// Supports US, UK, Australia, India, and Canada

import assert from 'assert';

// ---------------------------------------------------------------------
// 1. UNITED STATES (US) ENGINE
// ---------------------------------------------------------------------
const US_CONFIG_2026 = {
  ltcgBrackets: {
    single: [
      { max: 49600, rate: 0.0 },
      { max: 547100, rate: 0.15 },
      { max: Infinity, rate: 0.20 }
    ],
    mfj: [
      { max: 99200, rate: 0.0 },
      { max: 615500, rate: 0.15 },
      { max: Infinity, rate: 0.20 }
    ],
    mfs: [
      { max: 49600, rate: 0.0 },
      { max: 307750, rate: 0.15 },
      { max: Infinity, rate: 0.20 }
    ],
    hoh: [
      { max: 66450, rate: 0.0 },
      { max: 581000, rate: 0.15 },
      { max: Infinity, rate: 0.20 }
    ]
  },
  ordinaryBrackets: {
    single: [
      { min: 0, max: 12250, rate: 0.10 },
      { min: 12250, max: 49600, rate: 0.12 },
      { min: 49600, max: 105700, rate: 0.22 },
      { min: 105700, max: 201800, rate: 0.24 },
      { min: 201800, max: 256350, rate: 0.32 },
      { min: 256350, max: 640600, rate: 0.35 },
      { min: 640600, max: Infinity, rate: 0.37 }
    ],
    mfj: [
      { min: 0, max: 24500, rate: 0.10 },
      { min: 24500, max: 99200, rate: 0.12 },
      { min: 99200, max: 211400, rate: 0.22 },
      { min: 211400, max: 403600, rate: 0.24 },
      { min: 403600, max: 512700, rate: 0.32 },
      { min: 512700, max: 768700, rate: 0.35 },
      { min: 768700, max: Infinity, rate: 0.37 }
    ],
    mfs: [
      { min: 0, max: 12250, rate: 0.10 },
      { min: 12250, max: 49600, rate: 0.12 },
      { min: 49600, max: 105700, rate: 0.22 },
      { min: 105700, max: 201800, rate: 0.24 },
      { min: 201800, max: 256350, rate: 0.32 },
      { min: 256350, max: 384350, rate: 0.35 },
      { min: 384350, max: Infinity, rate: 0.37 }
    ],
    hoh: [
      { min: 0, max: 17500, rate: 0.10 },
      { min: 17500, max: 66450, rate: 0.12 },
      { min: 66450, max: 105700, rate: 0.22 },
      { min: 105700, max: 201800, rate: 0.24 },
      { min: 201800, max: 256350, rate: 0.32 },
      { min: 256350, max: 640600, rate: 0.35 },
      { min: 640600, max: Infinity, rate: 0.37 }
    ]
  },
  niitThresholds: {
    single: 200000,
    mfj: 250000,
    mfs: 125000,
    hoh: 200000
  },
  niitRate: 0.038
};

function calculateUsOrdinaryTax(taxableIncome, status) {
  if (taxableIncome <= 0) return 0;
  const brackets = US_CONFIG_2026.ordinaryBrackets[status] || US_CONFIG_2026.ordinaryBrackets.single;
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome > b.min) {
      const taxableInBand = Math.min(taxableIncome, b.max) - b.min;
      tax += taxableInBand * b.rate;
    }
  }
  return tax;
}

function calculateUsLtcgTax(ordinaryIncome, ltcgAmount, status) {
  if (ltcgAmount <= 0) return 0;
  const bands = US_CONFIG_2026.ltcgBrackets[status] || US_CONFIG_2026.ltcgBrackets.single;
  let tax = 0;
  let currentStart = ordinaryIncome;
  let remainingLtcg = ltcgAmount;

  let prevMax = 0;
  for (const band of bands) {
    const bandLimit = band.max;
    // How much space is in this band above currentStart?
    if (currentStart < bandLimit && remainingLtcg > 0) {
      const roomInBand = bandLimit - currentStart;
      const gainInBand = Math.min(remainingLtcg, roomInBand);
      tax += gainInBand * band.rate;
      remainingLtcg -= gainInBand;
      currentStart += gainInBand;
    } else if (currentStart >= bandLimit) {
      // Income already pushed past this band
    }
    prevMax = bandLimit;
  }
  return tax;
}

function calculateUsCgt(params) {
  const {
    proceeds = 0,
    costBasis = 0,
    eligibleCosts = 0,
    otherIncome = 0,
    filingStatus = 'single',
    holdingDays = 400,
    capitalLosses = 0,
    assetType = 'stocks', // 'stocks', 'real_estate', 'primary_residence', 'collectibles'
    stateRate = 0
  } = params;

  const totalCost = costBasis + eligibleCosts;
  const rawGain = proceeds - totalCost;
  if (rawGain <= 0) {
    return {
      grossGain: rawGain,
      taxableGain: 0,
      totalTax: 0,
      federalTax: 0,
      niitTax: 0,
      stateTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      holdingCategory: holdingDays > 365 ? 'Long-Term' : 'Short-Term',
      notes: rawGain < 0 ? 'Capital loss incurred.' : 'No capital gain.'
    };
  }

  // Section 121 Primary residence exclusion
  let applicableExemption = 0;
  if (assetType === 'primary_residence') {
    applicableExemption = (filingStatus === 'mfj') ? 500000 : 250000;
  }
  const gainAfterExemption = Math.max(0, rawGain - applicableExemption);
  const netGain = Math.max(0, gainAfterExemption - capitalLosses);

  const isLongTerm = holdingDays > 365;
  let federalTax = 0;

  if (!isLongTerm) {
    // Short term -> Ordinary income rates
    const taxWithout = calculateUsOrdinaryTax(otherIncome, filingStatus);
    const taxWith = calculateUsOrdinaryTax(otherIncome + netGain, filingStatus);
    federalTax = taxWith - taxWithout;
  } else {
    // Long term -> LTCG rates or collectibles rate (28% max)
    if (assetType === 'collectibles') {
      // Ordinary rate capped at 28%
      const taxWithout = calculateUsOrdinaryTax(otherIncome, filingStatus);
      const taxWith = calculateUsOrdinaryTax(otherIncome + netGain, filingStatus);
      const ordinaryMarginalTax = taxWith - taxWithout;
      const max28Tax = netGain * 0.28;
      federalTax = Math.min(ordinaryMarginalTax, max28Tax);
    } else {
      federalTax = calculateUsLtcgTax(otherIncome, netGain, filingStatus);
    }
  }

  // NIIT
  let niitTax = 0;
  const niitThreshold = US_CONFIG_2026.niitThresholds[filingStatus] || 200000;
  const totalMagi = otherIncome + netGain;
  if (totalMagi > niitThreshold) {
    const excessMagi = totalMagi - niitThreshold;
    const subjectToNiit = Math.min(netGain, excessMagi);
    niitTax = subjectToNiit * US_CONFIG_2026.niitRate;
  }

  // State Tax
  const stateTax = netGain * (stateRate / 100);
  const totalTax = federalTax + niitTax + stateTax;
  const effectiveRate = rawGain > 0 ? (totalTax / rawGain) * 100 : 0;
  const afterTaxGain = rawGain - totalTax;
  const netProceeds = proceeds - eligibleCosts - totalTax;

  return {
    grossGain: rawGain,
    exemptions: applicableExemption,
    lossesApplied: Math.min(gainAfterExemption, capitalLosses),
    taxableGain: netGain,
    federalTax,
    niitTax,
    stateTax,
    totalTax,
    effectiveRate,
    afterTaxGain,
    netProceeds,
    holdingCategory: isLongTerm ? 'Long-Term' : 'Short-Term'
  };
}

// ---------------------------------------------------------------------
// 2. UNITED KINGDOM (UK) ENGINE
// ---------------------------------------------------------------------
const UK_CONFIG_2026 = {
  taxYear: '2026_27',
  annualExemptAmount: 3000,
  personalAllowance: 12570,
  basicRateLimit: 50270,
  basicRateBandSize: 37700,
  rates: {
    shares: { basic: 0.18, higher: 0.24 },
    residential: { basic: 0.18, higher: 0.24 },
    other: { basic: 0.18, higher: 0.24 },
    badr: 0.18 // 18% in 2026/27 (was 14% in 2025/26, 10% in 2024/25)
  }
};

function calculateUkCgt(params) {
  const {
    proceeds = 0,
    costBasis = 0,
    eligibleCosts = 0,
    otherIncome = 0,
    capitalLosses = 0,
    assetType = 'shares', // 'shares', 'residential', 'primary_home', 'badr', 'other'
    taxYear = '2026_27'
  } = params;

  const totalCost = costBasis + eligibleCosts;
  const rawGain = proceeds - totalCost;
  if (rawGain <= 0) {
    return {
      grossGain: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: rawGain < 0 ? 'Capital loss incurred.' : 'No capital gain.'
    };
  }

  // Private Residence Relief
  if (assetType === 'primary_home') {
    return {
      grossGain: rawGain,
      exemptions: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: '100% exempt under UK Private Residence Relief (PRR).'
    };
  }

  const gainAfterLosses = Math.max(0, rawGain - capitalLosses);
  const aea = UK_CONFIG_2026.annualExemptAmount; // £3,000
  const taxableGain = Math.max(0, gainAfterLosses - aea);
  const appliedLosses = Math.min(rawGain, capitalLosses);
  const appliedAea = Math.min(gainAfterLosses, aea);

  if (taxableGain <= 0) {
    return {
      grossGain: rawGain,
      exemptions: appliedAea,
      lossesApplied: appliedLosses,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: 'Gain fully covered by Annual Exempt Amount / capital losses.'
    };
  }

  let totalTax = 0;
  if (assetType === 'badr') {
    // Business Asset Disposal Relief: 18% in 2026/27 on up to £1m
    totalTax = taxableGain * UK_CONFIG_2026.rates.badr;
  } else {
    // Unused basic rate band
    // Total taxable income above personal allowance
    const taxableIncomeAbovePa = Math.max(0, otherIncome - UK_CONFIG_2026.personalAllowance);
    const unusedBasicBand = Math.max(0, UK_CONFIG_2026.basicRateBandSize - taxableIncomeAbovePa);

    const gainInBasicBand = Math.min(taxableGain, unusedBasicBand);
    const gainInHigherBand = taxableGain - gainInBasicBand;

    const rates = UK_CONFIG_2026.rates[assetType] || UK_CONFIG_2026.rates.shares;
    totalTax = (gainInBasicBand * rates.basic) + (gainInHigherBand * rates.higher);
  }

  const effectiveRate = (totalTax / rawGain) * 100;
  const afterTaxGain = rawGain - totalTax;
  const netProceeds = proceeds - eligibleCosts - totalTax;

  return {
    grossGain: rawGain,
    exemptions: appliedAea,
    lossesApplied: appliedLosses,
    taxableGain,
    totalTax,
    effectiveRate,
    afterTaxGain,
    netProceeds
  };
}

// ---------------------------------------------------------------------
// 3. AUSTRALIA (AU) ENGINE
// ---------------------------------------------------------------------
const AU_CONFIG_2026 = {
  taxYear: '2026_27',
  brackets: [
    { min: 0, max: 18200, rate: 0.0, baseTax: 0 },
    { min: 18200, max: 45000, rate: 0.16, baseTax: 0 },
    { min: 45000, max: 135000, rate: 0.30, baseTax: 4288 },
    { min: 135000, max: 190000, rate: 0.37, baseTax: 31288 },
    { min: 190000, max: Infinity, rate: 0.45, baseTax: 51638 }
  ],
  medicareRate: 0.02,
  medicareLowIncomeThreshold: 26000,
  medicarePhaseInThreshold: 32500
};

function calculateAuIncomeTax(taxableIncome) {
  if (taxableIncome <= 18200) return 0;
  for (let i = AU_CONFIG_2026.brackets.length - 1; i >= 0; i--) {
    const b = AU_CONFIG_2026.brackets[i];
    if (taxableIncome > b.min) {
      return b.baseTax + (taxableIncome - b.min) * b.rate;
    }
  }
  return 0;
}

function calculateAuMedicare(taxableIncome) {
  if (taxableIncome <= AU_CONFIG_2026.medicareLowIncomeThreshold) return 0;
  if (taxableIncome <= AU_CONFIG_2026.medicarePhaseInThreshold) {
    return (taxableIncome - AU_CONFIG_2026.medicareLowIncomeThreshold) * 0.10;
  }
  return taxableIncome * AU_CONFIG_2026.medicareRate;
}

function calculateAuCgt(params) {
  const {
    proceeds = 0,
    costBasis = 0,
    eligibleCosts = 0,
    otherIncome = 0,
    holdingDays = 400,
    capitalLosses = 0,
    assetType = 'shares', // 'shares', 'property', 'main_residence', 'other'
    isResident = true
  } = params;

  const totalCost = costBasis + eligibleCosts;
  const rawGain = proceeds - totalCost;
  if (rawGain <= 0) {
    return {
      grossGain: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: rawGain < 0 ? 'Capital loss incurred.' : 'No capital gain.'
    };
  }

  // Main residence exemption
  if (assetType === 'main_residence') {
    return {
      grossGain: rawGain,
      exemptions: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: '100% exempt under ATO Main Residence Exemption.'
    };
  }

  // Under ATO rules, losses are applied BEFORE 50% discount
  const gainAfterLosses = Math.max(0, rawGain - capitalLosses);
  const isEligibleForDiscount = isResident && holdingDays >= 365;
  const discountAmount = isEligibleForDiscount ? gainAfterLosses * 0.5 : 0;
  const taxableGain = gainAfterLosses - discountAmount;

  // Incremental tax calculation
  const taxWithout = calculateAuIncomeTax(otherIncome) + calculateAuMedicare(otherIncome);
  const taxWith = calculateAuIncomeTax(otherIncome + taxableGain) + calculateAuMedicare(otherIncome + taxableGain);
  const totalTax = taxWith - taxWithout;

  const effectiveRate = (totalTax / rawGain) * 100;
  const afterTaxGain = rawGain - totalTax;
  const netProceeds = proceeds - eligibleCosts - totalTax;

  return {
    grossGain: rawGain,
    lossesApplied: Math.min(rawGain, capitalLosses),
    cgtDiscount: discountAmount,
    taxableGain,
    totalTax,
    effectiveRate,
    afterTaxGain,
    netProceeds,
    isDiscountApplied: isEligibleForDiscount
  };
}

// ---------------------------------------------------------------------
// 4. INDIA (IN) ENGINE
// ---------------------------------------------------------------------
const IN_NEW_REGIME_BRACKETS = [
  { min: 0, max: 300000, rate: 0.0 },
  { min: 300000, max: 700000, rate: 0.05 },
  { min: 700000, max: 1000000, rate: 0.10 },
  { min: 1000000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: Infinity, rate: 0.30 }
];

function calculateInSlabTax(taxableIncome) {
  if (taxableIncome <= 300000) return 0;
  // Section 87A rebate for income <= 7 lakh under new regime
  if (taxableIncome <= 700000) return 0;

  let tax = 0;
  for (const b of IN_NEW_REGIME_BRACKETS) {
    if (taxableIncome > b.min) {
      const taxableInBand = Math.min(taxableIncome, b.max) - b.min;
      tax += taxableInBand * b.rate;
    }
  }
  return tax;
}

function calculateInCgt(params) {
  const {
    proceeds = 0,
    costBasis = 0,
    eligibleCosts = 0,
    otherIncome = 0,
    holdingDays = 400,
    capitalLosses = 0,
    assetType = 'listed_equity' // 'listed_equity', 'real_estate', 'unlisted_shares', 'debt_mf', 'gold'
  } = params;

  const totalCost = costBasis + eligibleCosts;
  const rawGain = proceeds - totalCost;
  if (rawGain <= 0) {
    return {
      grossGain: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: rawGain < 0 ? 'Capital loss incurred.' : 'No capital gain.'
    };
  }

  // Determine STCG vs LTCG based on 2024 budget simplified rules
  let isLtcg = false;
  if (assetType === 'listed_equity') {
    isLtcg = holdingDays > 365; // 12 months
  } else if (assetType === 'debt_mf') {
    isLtcg = false; // Always STCG under Sec 50AA
  } else {
    isLtcg = holdingDays > 730; // 24 months for real estate, unlisted shares, gold
  }

  const gainAfterLosses = Math.max(0, rawGain - capitalLosses);
  let exemption = 0;
  let specialRate = null;
  let isSlabRate = false;

  if (assetType === 'listed_equity') {
    if (isLtcg) {
      // LTCG Section 112A: 12.5%, ₹1.25 lakh exemption
      exemption = 125000;
      specialRate = 0.125;
    } else {
      // STCG Section 111A: 20%
      specialRate = 0.20;
    }
  } else if (assetType === 'real_estate' || assetType === 'unlisted_shares' || assetType === 'gold') {
    if (isLtcg) {
      // LTCG Section 112: 12.5% without indexation
      specialRate = 0.125;
    } else {
      isSlabRate = true;
    }
  } else if (assetType === 'debt_mf') {
    isSlabRate = true;
  }

  const taxableGain = Math.max(0, gainAfterLosses - exemption);
  let baseTax = 0;

  // Unexhausted basic exemption adjustment (for resident individuals)
  const basicLimit = 300000;
  const unexhaustedLimit = Math.max(0, basicLimit - otherIncome);

  if (isSlabRate) {
    const taxWithout = calculateInSlabTax(otherIncome);
    const taxWith = calculateInSlabTax(otherIncome + taxableGain);
    baseTax = taxWith - taxWithout;
  } else if (specialRate !== null) {
    const gainAfterUnexhausted = Math.max(0, taxableGain - unexhaustedLimit);
    baseTax = gainAfterUnexhausted * specialRate;
  }

  // Surcharge (if total income > 50 lakh, capped at 15% for capital gains)
  let surchargeRate = 0;
  const totalIncome = otherIncome + taxableGain;
  if (totalIncome > 10000000) {
    surchargeRate = 0.15;
  } else if (totalIncome > 5000000) {
    surchargeRate = 0.10;
  }
  const surcharge = baseTax * surchargeRate;

  // Health & Education Cess: 4%
  const cess = (baseTax + surcharge) * 0.04;
  const totalTax = baseTax + surcharge + cess;

  const effectiveRate = (totalTax / rawGain) * 100;
  const afterTaxGain = rawGain - totalTax;
  const netProceeds = proceeds - eligibleCosts - totalTax;

  return {
    grossGain: rawGain,
    exemptions: Math.min(gainAfterLosses, exemption),
    lossesApplied: Math.min(rawGain, capitalLosses),
    taxableGain,
    baseTax,
    cess,
    totalTax,
    effectiveRate,
    afterTaxGain,
    netProceeds,
    holdingCategory: isLtcg ? 'Long-Term (LTCG)' : 'Short-Term (STCG)',
    appliedRate: isSlabRate ? 'Income Tax Slab Rate' : `${(specialRate * 100).toFixed(1)}%`
  };
}

// ---------------------------------------------------------------------
// 5. CANADA (CA) ENGINE
// ---------------------------------------------------------------------
const CA_CONFIG_2026 = {
  federalBrackets: [
    { min: 0, max: 58500, rate: 0.15 },
    { min: 58500, max: 117000, rate: 0.205 },
    { min: 117000, max: 181400, rate: 0.26 },
    { min: 181400, max: 258400, rate: 0.29 },
    { min: 258400, max: Infinity, rate: 0.33 }
  ],
  provinces: {
    ON: {
      name: 'Ontario',
      brackets: [
        { min: 0, max: 52800, rate: 0.0505 },
        { min: 52800, max: 105600, rate: 0.0915 },
        { min: 105600, max: 150000, rate: 0.1116 },
        { min: 150000, max: 220000, rate: 0.1216 },
        { min: 220000, max: Infinity, rate: 0.1316 }
      ],
      surtax: true
    },
    BC: {
      name: 'British Columbia',
      brackets: [
        { min: 0, max: 49300, rate: 0.0506 },
        { min: 49300, max: 98600, rate: 0.0770 },
        { min: 98600, max: 113200, rate: 0.1050 },
        { min: 113200, max: 137500, rate: 0.1229 },
        { min: 137500, max: 186400, rate: 0.1470 },
        { min: 186400, max: 259800, rate: 0.1680 },
        { min: 259800, max: Infinity, rate: 0.2050 }
      ]
    },
    AB: {
      name: 'Alberta',
      brackets: [
        { min: 0, max: 151900, rate: 0.10 },
        { min: 151900, max: 182300, rate: 0.12 },
        { min: 182300, max: 243100, rate: 0.13 },
        { min: 243100, max: 364600, rate: 0.14 },
        { min: 364600, max: Infinity, rate: 0.15 }
      ]
    },
    QC: {
      name: 'Quebec',
      brackets: [
        { min: 0, max: 53200, rate: 0.14 },
        { min: 53200, max: 106500, rate: 0.19 },
        { min: 106500, max: 129600, rate: 0.24 },
        { min: 129600, max: Infinity, rate: 0.2575 }
      ],
      abatement: true
    }
  }
};

function calculateProgressiveTax(income, brackets) {
  if (income <= 0) return 0;
  let tax = 0;
  for (const b of brackets) {
    if (income > b.min) {
      const taxableInBand = Math.min(income, b.max) - b.min;
      tax += taxableInBand * b.rate;
    }
  }
  return tax;
}

function calculateCaProvincialTax(income, provKey) {
  const prov = CA_CONFIG_2026.provinces[provKey] || CA_CONFIG_2026.provinces.ON;
  let basicTax = calculateProgressiveTax(income, prov.brackets);

  if (prov.surtax) {
    // Ontario Surtax
    let surtax = 0;
    if (basicTax > 5554) {
      surtax += (basicTax - 5554) * 0.20;
    }
    if (basicTax > 7108) {
      surtax += (basicTax - 7108) * 0.36;
    }
    basicTax += surtax;
  }
  return basicTax;
}

function calculateCaTotalTax(income, provKey) {
  let fedTax = calculateProgressiveTax(income, CA_CONFIG_2026.federalBrackets);
  const prov = CA_CONFIG_2026.provinces[provKey] || CA_CONFIG_2026.provinces.ON;

  if (prov.abatement) {
    // Quebec federal abatement (16.5% reduction)
    fedTax = fedTax * (1 - 0.165);
  }

  const provTax = calculateCaProvincialTax(income, provKey);
  return { fedTax, provTax, total: fedTax + provTax };
}

function calculateCaCgt(params) {
  const {
    proceeds = 0,
    costBasis = 0,
    eligibleCosts = 0,
    otherIncome = 0,
    capitalLosses = 0,
    province = 'ON',
    assetType = 'stocks' // 'stocks', 'real_estate', 'primary_residence', 'other'
  } = params;

  const totalCost = costBasis + eligibleCosts;
  const rawGain = proceeds - totalCost;
  if (rawGain <= 0) {
    return {
      grossGain: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: rawGain < 0 ? 'Capital loss incurred.' : 'No capital gain.'
    };
  }

  if (assetType === 'primary_residence') {
    return {
      grossGain: rawGain,
      exemptions: rawGain,
      taxableGain: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxGain: rawGain,
      netProceeds: proceeds - eligibleCosts,
      notes: '100% exempt under Canadian Principal Residence Exemption (PRE).'
    };
  }

  const netGain = Math.max(0, rawGain - capitalLosses);

  // Capital Gains Inclusion Rate (Budget 2024 / 2025 / 2026):
  // 50% on first $250,000; 66.67% on excess over $250,000 for individuals
  let taxableGain = 0;
  if (netGain <= 250000) {
    taxableGain = netGain * 0.50;
  } else {
    taxableGain = (250000 * 0.50) + ((netGain - 250000) * (2 / 3));
  }

  const taxBefore = calculateCaTotalTax(otherIncome, province);
  const taxAfter = calculateCaTotalTax(otherIncome + taxableGain, province);

  const fedTax = taxAfter.fedTax - taxBefore.fedTax;
  const provTax = taxAfter.provTax - taxBefore.provTax;
  const totalTax = taxAfter.total - taxBefore.total;

  const effectiveRate = (totalTax / rawGain) * 100;
  const afterTaxGain = rawGain - totalTax;
  const netProceeds = proceeds - eligibleCosts - totalTax;

  return {
    grossGain: rawGain,
    lossesApplied: Math.min(rawGain, capitalLosses),
    taxableGain,
    fedTax,
    provTax,
    totalTax,
    effectiveRate,
    afterTaxGain,
    netProceeds,
    blendedInclusionRate: (taxableGain / netGain) * 100
  };
}

// ---------------------------------------------------------------------
// TEST EXECUTION
// ---------------------------------------------------------------------
console.log('Running Capital Gains Tax verification tests...\n');

// Test 1: US Long-Term Stocks Gain with 0% LTCG room
const usTest1 = calculateUsCgt({
  proceeds: 50000,
  costBasis: 20000,
  eligibleCosts: 1000,
  otherIncome: 30000,
  filingStatus: 'single',
  holdingDays: 450,
  assetType: 'stocks'
});
console.log('US Test 1 (LTCG Single $29k gain):', usTest1);
assert.strictEqual(usTest1.grossGain, 29000);
// Other income = $30,000. 0% LTCG threshold is $49,600.
// Space in 0% band = $49,600 - $30,000 = $19,600 taxed at 0%.
// Remaining gain = $29,000 - $19,600 = $9,400 taxed at 15% = $1,410.
assert.strictEqual(Math.round(usTest1.federalTax), 1410);

// Test 2: US Short-Term Stocks Gain
const usTest2 = calculateUsCgt({
  proceeds: 50000,
  costBasis: 20000,
  eligibleCosts: 1000,
  otherIncome: 60000,
  filingStatus: 'single',
  holdingDays: 180,
  assetType: 'stocks'
});
console.log('US Test 2 (STCG Single $29k gain):', usTest2);
// Taxed at ordinary bracket 22% (between $60,000 and $89,000)
// $29,000 * 0.22 = $6,380
assert.strictEqual(Math.round(usTest2.federalTax), 6380);

// Test 3: UK Shares Gain in Basic Rate Band
const ukTest1 = calculateUkCgt({
  proceeds: 20000,
  costBasis: 10000,
  eligibleCosts: 500,
  otherIncome: 25000,
  capitalLosses: 0,
  assetType: 'shares'
});
console.log('UK Test 1 (Shares £9.5k gain):', ukTest1);
assert.strictEqual(ukTest1.grossGain, 9500);
// Taxable gain = 9500 - 3000 (AEA) = 6500.
// Other income £25,000 is well below £50,270, so all 6500 is in basic rate band (18%).
// 6500 * 0.18 = 1170.
assert.strictEqual(Math.round(ukTest1.totalTax), 1170);

// Test 4: UK Residential Property with Higher Rate
const ukTest2 = calculateUkCgt({
  proceeds: 300000,
  costBasis: 200000,
  eligibleCosts: 10000,
  otherIncome: 60000,
  capitalLosses: 0,
  assetType: 'residential'
});
console.log('UK Test 2 (Residential £90k gain):', ukTest2);
assert.strictEqual(ukTest2.grossGain, 90000);
// Taxable gain = 90000 - 3000 = 87000.
// Income is £60k (> £50,270), so all £87,000 is taxed at 24%.
// 87000 * 0.24 = 20880.
assert.strictEqual(Math.round(ukTest2.totalTax), 20880);

// Test 5: Australia 50% CGT Discount
const auTest1 = calculateAuCgt({
  proceeds: 100000,
  costBasis: 40000,
  eligibleCosts: 2000,
  otherIncome: 90000,
  holdingDays: 500,
  assetType: 'shares',
  isResident: true
});
console.log('AU Test 1 (50% CGT discount):', auTest1);
assert.strictEqual(auTest1.grossGain, 58000);
assert.strictEqual(auTest1.cgtDiscount, 29000);
assert.strictEqual(auTest1.taxableGain, 29000);
// Income $90,000 + $29,000 = $119,000. Both are in 30% tax bracket + 2% Medicare = 32%.
// Incremental tax = $29,000 * 0.32 = $9,280.
assert.strictEqual(Math.round(auTest1.totalTax), 9280);

// Test 6: India Listed Equity LTCG with ₹1.25L exemption
const inTest1 = calculateInCgt({
  proceeds: 500000,
  costBasis: 200000,
  eligibleCosts: 5000,
  otherIncome: 800000,
  holdingDays: 400,
  assetType: 'listed_equity'
});
console.log('IN Test 1 (Listed Equity LTCG):', inTest1);
assert.strictEqual(inTest1.grossGain, 295000);
// Exemption = ₹125,000. Taxable = 295,000 - 125,000 = 170,000.
// Rate = 12.5% = ₹21,250.
// Cess = 4% of 21,250 = ₹850.
// Total tax = 21,250 + 850 = ₹22,100.
assert.strictEqual(Math.round(inTest1.totalTax), 22100);

// Test 7: India Listed Equity STCG (20%)
const inTest2 = calculateInCgt({
  proceeds: 500000,
  costBasis: 200000,
  eligibleCosts: 5000,
  otherIncome: 800000,
  holdingDays: 180,
  assetType: 'listed_equity'
});
console.log('IN Test 2 (Listed Equity STCG):', inTest2);
assert.strictEqual(inTest2.taxableGain, 295000);
// Rate = 20% = ₹59,000. Cess = 4% = ₹2,360. Total = ₹61,360.
assert.strictEqual(Math.round(inTest2.totalTax), 61360);

// Test 8: Canada Capital Gain under $250k (50% inclusion)
const caTest1 = calculateCaCgt({
  proceeds: 150000,
  costBasis: 50000,
  eligibleCosts: 0,
  otherIncome: 70000,
  province: 'AB', // Alberta 10%
  assetType: 'stocks'
});
console.log('CA Test 1 (Gain $100k Alberta):', caTest1);
assert.strictEqual(caTest1.grossGain, 100000);
assert.strictEqual(caTest1.taxableGain, 50000); // 50% inclusion

// Test 9: Canada Capital Gain over $250k (50% on first $250k, 66.67% on excess)
const caTest2 = calculateCaCgt({
  proceeds: 450000,
  costBasis: 100000,
  eligibleCosts: 0,
  otherIncome: 50000,
  province: 'AB',
  assetType: 'stocks'
});
console.log('CA Test 2 (Gain $350k):', caTest2);
assert.strictEqual(caTest2.grossGain, 350000);
// 250,000 * 0.5 = 125,000
// 100,000 * (2/3) = 66,666.67
// Total taxable = 191,666.67
assert.strictEqual(Math.round(caTest2.taxableGain), 191667);

console.log('\nAll 9 verification tests passed successfully!');
