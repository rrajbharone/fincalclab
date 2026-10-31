// Test Twitch Math
const defaults = {
  currency: 'USD',
  exchangeRate: 1.0,
  viewers: 300,
  hours: 80,
  splitPct: 50,
  t1Count: 150,
  t1Price: 4.99,
  t2Count: 10,
  t2Price: 9.99,
  t3Count: 2,
  t3Price: 24.99,
  giftCount: 25,
  primeCount: 50,
  primePayout: 2.25,
  adImpressionsPerViewerHour: 4.0,
  adCpm: 3.50,
  bits: 10000,
  tips: 150,
  tipFeePct: 3.0
};

function calculate(inputs) {
  const fx = inputs.currency === 'USD' ? 1.0 : (inputs.exchangeRate || 1.0);
  const split = inputs.splitPct / 100;

  // Subscriptions (Paid)
  const t1Rev = (inputs.t1Count * inputs.t1Price * split);
  const t2Rev = (inputs.t2Count * inputs.t2Price * split);
  const t3Rev = (inputs.t3Count * inputs.t3Price * split);
  const giftRev = (inputs.giftCount * inputs.t1Price * split);
  const paidSubsRev = t1Rev + t2Rev + t3Rev + giftRev;

  // Prime Subscriptions
  const primeRev = inputs.primeCount * inputs.primePayout;

  // Total Subscriptions
  const totalSubsRev = paidSubsRev + primeRev;

  // Ad Revenue
  // Total impressions = viewers * adImpressionsPerViewerHour * hours
  const totalImpressions = inputs.viewers * inputs.adImpressionsPerViewerHour * inputs.hours;
  const adRev = (totalImpressions / 1000) * inputs.adCpm;

  // Bits Revenue (Bits * 0.01 USD converted to local currency)
  const bitsRevUsd = inputs.bits * 0.01;
  const bitsRev = bitsRevUsd * fx;

  // Direct Donations (Tips minus processing fee)
  const tipsRev = inputs.tips * (1 - (inputs.tipFeePct / 100));

  // Total Monthly
  const totalMonthly = paidSubsRev + primeRev + adRev + bitsRev + tipsRev;
  const totalAnnual = totalMonthly * 12;
  const hourlyRate = inputs.hours > 0 ? totalMonthly / inputs.hours : 0;

  return {
    paidSubsRev,
    primeRev,
    totalSubsRev,
    totalImpressions,
    adRev,
    bitsRev,
    tipsRev,
    totalMonthly,
    totalAnnual,
    hourlyRate
  };
}

const res = calculate(defaults);
console.log('Default Calculations (USD):', res);
console.log('Sum of components:', res.paidSubsRev + res.primeRev + res.adRev + res.bitsRev + res.tipsRev);
console.log('Matches totalMonthly?', Math.abs((res.paidSubsRev + res.primeRev + res.adRev + res.bitsRev + res.tipsRev) - res.totalMonthly) < 0.001);
