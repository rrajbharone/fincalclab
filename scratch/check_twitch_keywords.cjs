const fs = require('fs');
const content = fs.readFileSync('src/pages/calculator/twitch-revenue-calculator.astro', 'utf8').toLowerCase();

const keywords = [
  "twitch revenue calculator",
  "twitch earnings calculator",
  "twitch money calculator",
  "twitch streamer income calculator",
  "twitch payout calculator",
  "how much do twitch streamers make",
  "how much does twitch pay per viewer",
  "twitch subscription revenue",
  "twitch sub revenue calculator",
  "twitch tier 1 sub earnings",
  "twitch tier 2 and tier 3 subs",
  "twitch prime sub payout",
  "twitch ad revenue calculator",
  "twitch cpm calculator",
  "twitch bits to money",
  "twitch bits calculator",
  "twitch affiliate earnings",
  "twitch partner earnings",
  "twitch revenue split",
  "twitch monthly income",
  "twitch annual earnings",
  "twitch streaming income"
];

console.log('=== KEYWORD COVERAGE CHECK ===');
keywords.forEach(kw => {
  const present = content.includes(kw);
  console.log(`${kw}: ${present ? 'PRESENT' : 'MISSING'}`);
});
