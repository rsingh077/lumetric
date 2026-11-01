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

// Mirror icon.svg into out/ and out/app/
const iconSrc = path.join(__dirname, '..', 'public', 'icon.svg');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(outDir, 'icon.svg'));
  fs.copyFileSync(iconSrc, path.join(appOutDir, 'icon.svg'));
  console.log('✓ Mirrored icon.svg to out/ and out/app/');
}

// Mirror workers into out/app/workers
const workersSrc = path.join(outDir, 'workers');
const workersDest = path.join(appOutDir, 'workers');
if (fs.existsSync(workersSrc)) {
  copyDirRecursive(workersSrc, workersDest);
  console.log('✓ Mirrored workers to out/app/workers for Catalyst');
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
console.log(`✓ Generated client-package.json (homepage: index.html, 404: 404.html, v${pkgInfo.version || '2.3.4'})`);

// Ensure master universal SPA index.html is mirrored across all routes and fallbacks
const indexPath = path.join(outDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Master SPA files
  fs.writeFileSync(path.join(outDir, 'app.html'), indexHtml, 'utf8');
  fs.writeFileSync(path.join(appOutDir, 'index.html'), indexHtml, 'utf8');
  fs.writeFileSync(path.join(appOutDir, 'app.html'), indexHtml, 'utf8');

  // 404 Recovery Fallback with Instant Route Resolution
  const recovery404Html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Lumetric Studio — Redirecting</title>
<script>
(function() {
  var p = window.location.pathname;
  var clean = p.replace(/^\\/app\\/?/, '').replace(/\\.html$/, '').replace(/\\/+$/, '');
  var valid = ['projects','data','pipelines','analysis','models','dashboards','stories','operations','settings','sql','excel','investment'];
  var search = window.location.search || '';
  if (valid.indexOf(clean) !== -1) {
    window.location.replace('/app/?view=' + clean + (search ? (search.indexOf('?') === 0 ? '&' + search.slice(1) : search) : ''));
  } else {
    window.location.replace('/app/' + search);
  }
})();
</script>
</head>
<body style="background:#0A110E;color:#FAF8F5;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;">
  <p style="font-size:14px;font-weight:600;letter-spacing:0.05em;color:#34D399;margin-bottom:8px;">Launching Lumetric Studio...</p>
  <p style="font-size:12px;color:#94A3B8;">Redirecting to enterprise workspace...</p>
</div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, '404.html'), recovery404Html, 'utf8');
  fs.writeFileSync(path.join(appOutDir, '404.html'), recovery404Html, 'utf8');

  // Mirror universal SPA across all 12 routes with Instant View Redirection
  const appRoutes = [
    'projects',
    'data',
    'pipelines',
    'analysis',
    'models',
    'dashboards',
    'stories',
    'operations',
    'settings',
    'sql',
    'excel',
    'investment'
  ];

  for (const r of appRoutes) {
    const routeRedirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="0; url=/app/?view=${r}"/>
<title>Lumetric Studio — ${r.charAt(0).toUpperCase() + r.slice(1)}</title>
<script>
(function() {
  var base = window.location.pathname.startsWith('/app') ? '/app/' : '/';
  var search = window.location.search || '';
  var glue = search ? (search.indexOf('?') === 0 ? '&' + search.slice(1) : search) : '';
  window.location.replace(base + '?view=${r}' + glue);
})();
</script>
</head>
<body style="background:#0A110E;color:#FAF8F5;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;">
  <p style="font-size:14px;font-weight:600;letter-spacing:0.05em;color:#34D399;margin-bottom:8px;">Launching Lumetric ${r.charAt(0).toUpperCase() + r.slice(1)}...</p>
  <p style="font-size:12px;color:#94A3B8;">Connecting to cloud workspace...</p>
</div>
</body>
</html>`;

    // 1. Root route directories: out/r/index.html
    const routeDir = path.join(outDir, r);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(routeDir, 'index.html'), routeRedirectHtml, 'utf8');

    // 2. Catalyst app route directories: out/app/r/index.html
    const appRouteDir = path.join(appOutDir, r);
    if (!fs.existsSync(appRouteDir)) {
      fs.mkdirSync(appRouteDir, { recursive: true });
    }
    fs.writeFileSync(path.join(appRouteDir, 'index.html'), routeRedirectHtml, 'utf8');

    // 3. Static html files: out/r.html and out/app/r.html
    fs.writeFileSync(path.join(outDir, `${r}.html`), routeRedirectHtml, 'utf8');
    fs.writeFileSync(path.join(appOutDir, `${r}.html`), routeRedirectHtml, 'utf8');
  }
  console.log('✓ Configured zero-latency route redirection across all 12 routes and 404 recovery in out/ and out/app/');
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
