// Test Singapore IRAS capital gains tax logic

function calcSingaporeCGT(purchasePrice, salePrice, eligibleCosts) {
  const totalCost = purchasePrice + eligibleCosts;
  const grossGain = salePrice - totalCost;

  let res = {
    grossGain,
    taxableGain: 0,
    baseTax: 0,
    totalTax: 0,
    effectiveRate: 0,
    afterTaxGain: grossGain,
    netProceeds: salePrice - eligibleCosts
  };

  if (grossGain <= 0) {
    res.totalTax = 0;
    res.afterTaxGain = grossGain;
    res.netProceeds = salePrice - eligibleCosts;
  } else {
    // Singapore IRAS: 0% capital gains tax
    res.exemptions = grossGain;
    res.taxableGain = 0;
    res.baseTax = 0;
    res.totalTax = 0;
    res.effectiveRate = 0;
    res.afterTaxGain = grossGain;
    res.netProceeds = salePrice - eligibleCosts;
  }

  return res;
}

const test1 = calcSingaporeCGT(50000, 120000, 2000);
console.log('SG Stock Test 1 (Gain S$68k):');
console.log('Gross Gain:', test1.grossGain);
console.log('Taxable Gain:', test1.taxableGain);
console.log('Total Tax:', test1.totalTax);
console.log('After-tax Gain:', test1.afterTaxGain);
console.log('Effective Rate:', test1.effectiveRate);

if (test1.grossGain === 68000 && test1.totalTax === 0 && test1.afterTaxGain === 68000) {
  console.log('✅ Singapore CGT math test PASSED');
} else {
  console.error('❌ Singapore CGT math test FAILED');
  process.exit(1);
}
