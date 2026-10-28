const fs = require('fs');
const filePath = 'src/layouts/Layout.astro';
let content = fs.readFileSync(filePath, 'utf8');

const target = '<meta name="generator" content={Astro.generator} />';
const gaSnippet = `
    <!-- Google tag (gtag.js) -->
    <script is:inline async src="https://www.googletagmanager.com/gtag/js?id=G-CKKLEGT7GR"></script>
    <script is:inline>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-CKKLEGT7GR');
    </script>`;

if (!content.includes(target)) {
  console.error('Target meta tag not found!');
  process.exit(1);
}

if (content.includes('G-CKKLEGT7GR')) {
  console.log('Google Analytics tag already exists!');
  process.exit(0);
}

const replacement = target + '\n' + gaSnippet;
content = content.replace(target, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated', filePath);
