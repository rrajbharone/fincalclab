// Test selective calculations
const sample = {
  viewers: 300,
  hours: 80,
  split: 0.5,
  t1Count: 150, t1Price: 4.99,
  t2Count: 10, t2Price: 9.99,
  t3Count: 2, t3Price: 24.99,
  giftCount: 25,
  primeCount: 50, primePayout: 2.25,
  adRate: 4.0, cpm: 3.50,
  bits: 10000,
  tips: 150, tipFeePct: 3.0,
  fxRate: 1.0
};

function runTest(selected) {
  const paidSubs = selected.subs ? ((sample.t1Count * sample.t1Price + sample.t2Count * sample.t2Price + sample.t3Count * sample.t3Price + sample.giftCount * sample.t1Price) * sample.split) : 0;
  const primeSubs = selected.subs ? (sample.primeCount * sample.primePayout) : 0;
  const ads = selected.ads ? ((sample.viewers * sample.adRate * sample.hours / 1000) * sample.cpm) : 0;
  const bits = selected.bits ? (sample.bits * 0.01 * sample.fxRate) : 0;
  const tips = selected.bits ? (sample.tips * (1 - sample.tipFeePct / 100)) : 0;

  const total = paidSubs + primeSubs + ads + bits + tips;
  const annual = total * 12;
  const hourly = sample.hours > 0 ? total / sample.hours : 0;

  return { paidSubs, primeSubs, ads, bits, tips, total, annual, hourly };
}

console.log('Total (all 3):', runTest({ subs: true, ads: true, bits: true }));
console.log('Subs only:', runTest({ subs: true, ads: false, bits: false }));
console.log('Ads only:', runTest({ subs: false, ads: true, bits: false }));
console.log('Bits & Tips only:', runTest({ subs: false, ads: false, bits: true }));
console.log('Subs + Ads:', runTest({ subs: true, ads: true, bits: false }));
console.log('Subs + Bits:', runTest({ subs: true, ads: false, bits: true }));
console.log('Ads + Bits:', runTest({ subs: false, ads: true, bits: true }));
