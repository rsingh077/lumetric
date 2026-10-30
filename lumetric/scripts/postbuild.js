const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const appOutDir = path.join(outDir, 'app');
const androidPublicDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Starting Lumetric Postbuild & Dual-Platform Asset Routing Optimization...');

// 1. Prepare Catalyst mirror directory: out/app/
if (!fs.existsSync(appOutDir)) {
  fs.mkdirSync(appOutDir, { recursive: true });
}

// Mirror _next into out/app/_next
const nextSrc = path.join(outDir, '_next');
const nextDest = path.join(appOutDir, '_next');
if (fs.existsSync(nextSrc)) {
  copyDirRecursive(nextSrc, nextDest);
  console.log('✓ Mirrored _next to out/app/_next for Catalyst');
}

// Mirror favicon into out/app/
const faviconSrc = path.join(outDir, 'favicon.ico');
const faviconDest = path.join(appOutDir, 'favicon.ico');
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, faviconDest);
  console.log('✓ Mirrored favicon.ico to out/app/favicon.ico');
}

// 2. Head injector for Turbopack base chunk resolution
const catalystHeadInject = '<script>window.TURBOPACK_CHUNK_BASE_PATH = "/app/_next/";</script>';
const androidHeadInject = '<script>window.TURBOPACK_CHUNK_BASE_PATH = "/_next/";</script>';

// 3. Process root out/ HTML files for Zoho Catalyst Hosting
// Because Catalyst hosts `lumetric/out` at `/app/`, all asset URLs in `out/*.html` must use `/app/_next/`
if (fs.existsSync(outDir)) {
  const outEntries = fs.readdirSync(outDir, { withFileTypes: true });
  for (const entry of outEntries) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      const fullPath = path.join(outDir, entry.name);
      let html = fs.readFileSync(fullPath, 'utf8');

      // Convert all Next.js root asset paths to /app/_next/
      html = html.replace(/(?<!\/app)\/_next\//g, '/app/_next/');
      html = html.replace(/href="\/_next\//g, 'href="/app/_next/');
      html = html.replace(/src="\/_next\//g, 'src="/app/_next/');
      html = html.replace(/href="\/favicon\.ico/g, 'href="/app/favicon.ico');

      // Inject Turbopack base path if not already present
      if (html.includes('TURBOPACK_CHUNK_BASE_PATH')) {
        html = html.replace(/<script>.*?TURBOPACK_CHUNK_BASE_PATH.*?<\/script>/g, catalystHeadInject);
      } else {
        html = html.replace('<head>', '<head>' + catalystHeadInject);
      }

      fs.writeFileSync(fullPath, html, 'utf8');

      // Also copy to out/app/ for full backward compatibility
      fs.writeFileSync(path.join(appOutDir, entry.name), html, 'utf8');
    }
  }
  console.log('✓ Reconciled Catalyst web hosting assets in out/ and out/app/ (prefixed with /app/_next/)');
}

// 4. Generate client-package.json for Catalyst (homepage: index.html, 404: 404.html)
const pkgInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
fs.writeFileSync(
  path.join(outDir, 'client-package.json'),
  JSON.stringify({
    name: 'lumetric',
    version: pkgInfo.version || '2.3.4',
    homepage: 'index.html',
    login_redirect: 'index.html',
    '404': '404.html'
  }, null, 2)
);
console.log(`✓ Generated client-package.json (v${pkgInfo.version || '2.3.4'})`);

// Ensure out/app.html exists as a direct fallback
const indexPath = path.join(outDir, 'index.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(outDir, 'app.html'));
  console.log('✓ Created out/app.html fallback');
}

// 5. If Android assets directory exists, enforce clean /_next/ paths so Android WebView hydrates without errors
if (fs.existsSync(androidPublicDir)) {
  // Ensure Android has clean _next directory
  const androidNextDir = path.join(androidPublicDir, '_next');
  if (fs.existsSync(nextSrc)) {
    copyDirRecursive(nextSrc, androidNextDir);
  }

  // Ensure Android also has mirrored app/_next as a fallback
  const androidAppNextDir = path.join(androidPublicDir, 'app', '_next');
  if (fs.existsSync(nextSrc)) {
    copyDirRecursive(nextSrc, androidAppNextDir);
  }

  // Patch all Android HTML files to use clean /_next/ paths
  const androidEntries = fs.readdirSync(androidPublicDir, { withFileTypes: true });
  for (const entry of androidEntries) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      const fullPath = path.join(androidPublicDir, entry.name);
      let html = fs.readFileSync(fullPath, 'utf8');

      html = html.replace(/\/app\/_next\//g, '/_next/');
      html = html.replace(/\/app\/favicon\.ico/g, '/favicon.ico');
      if (html.includes('TURBOPACK_CHUNK_BASE_PATH')) {
        html = html.replace(/<script>.*?TURBOPACK_CHUNK_BASE_PATH.*?<\/script>/g, androidHeadInject);
      } else {
        html = html.replace('<head>', '<head>' + androidHeadInject);
      }

      fs.writeFileSync(fullPath, html, 'utf8');
      console.log('✓ Clean Android patch:', entry.name);
    }
  }
}

console.log('✓ Postbuild completed successfully. Android and Catalyst asset paths fully reconciled.');
