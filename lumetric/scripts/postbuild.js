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

// 2. Universal Turbopack base path injector
// Allows Turbopack to dynamically identify chunks regardless of whether loaded from / or /app/
const universalHeadInject = '<script>window.TURBOPACK_CHUNK_BASE_PATH = (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) ? "/app/_next/" : "/_next/";</script>';

// 3. Process root out/ HTML files
// Keep native /_next/ root paths for Android Capacitor, while providing universal base path
if (fs.existsSync(outDir)) {
  const outEntries = fs.readdirSync(outDir, { withFileTypes: true });
  for (const entry of outEntries) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      const fullPath = path.join(outDir, entry.name);
      let html = fs.readFileSync(fullPath, 'utf8');

      // Ensure clean /_next/ paths for Android
      html = html.replace(/\/app\/_next\//g, '/_next/');
      html = html.replace(/\/app\/favicon\.ico/g, '/favicon.ico');

      // Inject Turbopack chunk base path before runtime scripts load
      if (!html.includes('TURBOPACK_CHUNK_BASE_PATH')) {
        html = html.replace('<head>', '<head>' + universalHeadInject);
      }

      fs.writeFileSync(fullPath, html, 'utf8');

      // Also create Catalyst-specific copy in out/app/ with /app/_next/ paths
      let catHtml = html;
      catHtml = catHtml.replace(/(?<!\/app)\/_next\//g, '/app/_next/');
      catHtml = catHtml.replace(/href="\/_next\//g, 'href="/app/_next/');
      catHtml = catHtml.replace(/src="\/_next\//g, 'src="/app/_next/');
      catHtml = catHtml.replace(/href="\/favicon.ico/g, 'href="/app/favicon.ico');
      fs.writeFileSync(path.join(appOutDir, entry.name), catHtml, 'utf8');
    }
  }
  console.log('✓ Processed root out/ (native /_next/) and out/app/ (Catalyst /app/_next/)');
}

// 4. Generate client-package.json for Catalyst
const pkgInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
fs.writeFileSync(
  path.join(outDir, 'client-package.json'),
  JSON.stringify({
    name: 'lumetric',
    version: pkgInfo.version || '2.0.0',
    homepage: 'index.html',
    login_redirect: 'index.html',
    '404': '404.html'
  }, null, 2)
);
console.log(`✓ Generated client-package.json (v${pkgInfo.version || '2.0.0'})`);

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
      if (!html.includes('TURBOPACK_CHUNK_BASE_PATH')) {
        html = html.replace('<head>', '<head><script>window.TURBOPACK_CHUNK_BASE_PATH = "/_next/";</script>');
      }

      fs.writeFileSync(fullPath, html, 'utf8');
      console.log('✓ Clean Android patch:', entry.name);
    }
  }
}

console.log('✓ Postbuild completed successfully. Android and Catalyst asset paths fully reconciled.');
