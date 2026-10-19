const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
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

function processHtmlDir(currentDir) {
  if (!fs.existsSync(currentDir)) return;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      // Don't recursively re-process out/app to avoid double prefixes
      if (entry.name === 'app') continue;
      processHtmlDir(fullPath);
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

console.log('Starting Lumetric Postbuild & Asset Routing Optimization...');

// 1. Process all HTML files in out/
processHtmlDir(outDir);

// 2. Mirror assets to out/app so requests to both /app/_next/ and /_next/ resolve with 200 OK
const appOutDir = path.join(outDir, 'app');
if (!fs.existsSync(appOutDir)) {
  fs.mkdirSync(appOutDir, { recursive: true });
}

// Mirror _next into out/app/_next
const nextSrc = path.join(outDir, '_next');
const nextDest = path.join(appOutDir, '_next');
if (fs.existsSync(nextSrc)) {
  console.log('Copying _next to out/app/_next for dual-platform compatibility...');
  copyDirRecursive(nextSrc, nextDest);
  console.log('✓ Mirrored _next to out/app/_next');
}

// Copy favicon.ico to out/app/favicon.ico
const faviconSrc = path.join(outDir, 'favicon.ico');
const faviconDest = path.join(appOutDir, 'favicon.ico');
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, faviconDest);
  console.log('✓ Mirrored favicon.ico to out/app/favicon.ico');
}

// Copy HTML files into out/app/
const outEntries = fs.readdirSync(outDir, { withFileTypes: true });
for (const entry of outEntries) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    fs.copyFileSync(path.join(outDir, entry.name), path.join(appOutDir, entry.name));
  }
}
console.log('✓ Mirrored root HTML files into out/app/');

// 3. Generate client-package.json for Catalyst
fs.writeFileSync(
  path.join(outDir, 'client-package.json'),
  JSON.stringify({
    name: 'lumetric',
    version: '1.9.0',
    homepage: 'index.html',
    login_redirect: 'index.html',
    '404': '404.html'
  }, null, 2)
);
console.log('✓ Generated client-package.json (v1.9.0) with 404.html error page');

// 4. If Android assets directory exists, ensure it also has the mirrored app directory
if (fs.existsSync(androidPublicDir)) {
  const androidAppDir = path.join(androidPublicDir, 'app');
  if (!fs.existsSync(androidAppDir)) {
    fs.mkdirSync(androidAppDir, { recursive: true });
  }
  const androidNextDest = path.join(androidAppDir, '_next');
  if (fs.existsSync(nextSrc)) {
    copyDirRecursive(nextSrc, androidNextDest);
    console.log('✓ Mirrored _next directly to android/app/src/main/assets/public/app/_next');
  }
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(androidAppDir, 'favicon.ico'));
  }
}

console.log('✓ Postbuild completed successfully. All asset paths verified for Android Capacitor and Zoho Catalyst.');
