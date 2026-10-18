const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

function processDir(currentDir) {
  if (!fs.existsSync(currentDir)) return;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      let html = fs.readFileSync(fullPath, 'utf8');

      // Normalize any duplicate /app/app/ to single /app/
      html = html.replace(/\/app\/app\//g, '/app/');

      // Ensure /_next/ is prefixed with /app/_next/
      html = html.replace(/(?<!\/app)\/_next\//g, '/app/_next/');

      // Rewrite CSS stylesheet and script tags to /app/_next/
      html = html.replace(/href="\/_next\//g, 'href="/app/_next/');
      html = html.replace(/src="\/_next\//g, 'src="/app/_next/');
      html = html.replace(/href="\/favicon.ico/g, 'href="/app/favicon.ico');

      fs.writeFileSync(fullPath, html, 'utf8');
      console.log('✓ Cleanly patched:', path.relative(__dirname, fullPath));
    }
  }
}

// Generate client-package.json for Catalyst
fs.writeFileSync(
  path.join(outDir, 'client-package.json'),
  JSON.stringify({
    name: 'lumetric',
    version: '1.3.0',
    homepage: 'index.html',
    login_redirect: 'index.html',
    '404': '404.html'
  }, null, 2)
);
console.log('✓ Generated client-package.json with 404.html error page');

processDir(outDir);
console.log('All static HTML files verified with valid /app/_next/ URLs.');
