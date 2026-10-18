// Let's test the math for ADU ROI
function testAduRoi(investmentCost = 150000, monthlyRent = 1800, monthlyExpenses = 300, vacancyRate = 5, rentIncrease = 3, appreciationRate = 3, years = 10) {
  const annualGrossRent = monthlyRent * 12;
  const vacancyLoss = annualGrossRent * (vacancyRate / 100);
  const effectiveRent = annualGrossRent - vacancyLoss;
  const annualExpenses = monthlyExpenses * 12;
  const annualNoi = effectiveRent - annualExpenses;
  const cashOnCost = (annualNoi / investmentCost) * 100;
  const paybackYears = annualNoi > 0 ? investmentCost / annualNoi : null;

  let cumulativeNoi = 0;
  let currentMonthlyRent = monthlyRent;
  const yearByYear = [];

  for (let t = 1; t <= years; t++) {
    const yrGross = currentMonthlyRent * 12;
    const yrVac = yrGross * (vacancyRate / 100);
    const yrEff = yrGross - yrVac;
    const yrNoi = yrEff - annualExpenses;
    cumulativeNoi += yrNoi;
    yearByYear.push({ year: t, rent: currentMonthlyRent, gross: yrGross, noi: yrNoi, cumNoi: cumulativeNoi });
    currentMonthlyRent *= (1 + rentIncrease / 100);
  }

  const futureValue = investmentCost * Math.pow(1 + appreciationRate / 100, years);
  const estimatedAppreciation = futureValue - investmentCost;

  // Total Net Gain = Cumulative NOI + Capital Appreciation
  const totalNetGain = cumulativeNoi + estimatedAppreciation;
  const roiStandard = (totalNetGain / investmentCost) * 100;

  // Formula as written in prompt text:
  // (Cumulative Projected NOI + Estimated Appreciation - Initial Investment Cost) / Initial Investment Cost * 100
  const roiPromptFormula = ((cumulativeNoi + estimatedAppreciation - investmentCost) / investmentCost) * 100;

  return {
    annualGrossRent,
    vacancyLoss,
    effectiveRent,
    annualExpenses,
    annualNoi,
    cashOnCost,
    paybackYears,
    futureValue,
    estimatedAppreciation,
    cumulativeNoi,
    totalNetGain,
    roiStandard,
    roiPromptFormula,
    finalMonthlyRent: currentMonthlyRent / (1 + rentIncrease / 100),
    projectedAnnualRentYearN: (currentMonthlyRent / (1 + rentIncrease / 100)) * 12
  };
}

const res = testAduRoi();
console.log("Year 1 Annual NOI: $" + res.annualNoi.toFixed(2));
console.log("Year 1 Cash-on-Cost: " + res.cashOnCost.toFixed(2) + "%");
console.log("Payback Period: " + res.paybackYears.toFixed(2) + " years");
console.log("10-Year Cumulative NOI: $" + res.cumulativeNoi.toFixed(2));
console.log("Future Value (10 yrs @ 3%): $" + res.futureValue.toFixed(2));
console.log("Estimated Appreciation: $" + res.estimatedAppreciation.toFixed(2));
console.log("Total Net Gain (Cum NOI + Appreciation): $" + res.totalNetGain.toFixed(2));
console.log("ROI (Standard Real Estate: Total Net Gain / Cost): " + res.roiStandard.toFixed(2) + "%");
console.log("ROI (Prompt literal formula with 2nd subtraction): " + res.roiPromptFormula.toFixed(2) + "%");
