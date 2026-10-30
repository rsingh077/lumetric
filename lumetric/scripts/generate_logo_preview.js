const fs = require('fs');

// Monolithic 3D L-Prism (Precision Vector Geometry)
const logoMonolithL = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
  <defs>
    <!-- Background Vignette / Obsidian Shield -->
    <linearGradient id="shield_border" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#10B981" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#06B6D4" stop-opacity="0.6" />
    </linearGradient>
    <radialGradient id="shield_glow" cx="32" cy="32" r="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#070B0E" stop-opacity="0" />
    </radialGradient>

    <!-- 'L' Stem Top Cap -->
    <linearGradient id="stem_top" x1="16" y1="12" x2="28" y2="20" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6EE7B7" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>

    <!-- 'L' Stem Left Facet (Deep structural jade) -->
    <linearGradient id="stem_left" x1="16" y1="18" x2="28" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="60%" stop-color="#059669" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>

    <!-- 'L' Stem Right / Inner Facet -->
    <linearGradient id="stem_right" x1="28" y1="18" x2="28" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>

    <!-- 'L' Base Foot Top Facet -->
    <linearGradient id="foot_top" x1="28" y1="34" x2="48" y2="44" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#0D9488" />
    </linearGradient>

    <!-- 'L' Base Foot Front / Right Facet -->
    <linearGradient id="foot_right" x1="28" y1="40" x2="48" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#22D3EE" />
      <stop offset="50%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#0F766E" />
    </linearGradient>

    <!-- Photonic Beam Spark (Upper Right) -->
    <linearGradient id="spark_grad" x1="34" y1="12" x2="48" y2="26" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="40%" stop-color="#6EE7B7" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>

    <filter id="core_glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Luxury Squircle Badge Base -->
  <rect x="2" y="2" width="60" height="60" rx="17" fill="#0A110E" stroke="url(#shield_border)" stroke-width="1.75" />
  <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#shield_glow)" />

  <!-- Monolithic 3D 'L' Prism Geometry -->
  <g transform="translate(1, 0)">
    <!-- 1. Vertical Stem: Left Facing Plane -->
    <path d="M16 18L26 23.5V47L16 41.5V18Z" fill="url(#stem_left)" />

    <!-- 2. Vertical Stem: Top Bevel Plane -->
    <path d="M26 12.5L34 17L26 21.5L18 17L26 12.5Z" fill="url(#stem_top)" />

    <!-- 3. Vertical Stem: Front Inner Crease -->
    <path d="M26 21.5L34 17V35L26 39.5V21.5Z" fill="url(#stem_right)" opacity="0.9" />

    <!-- 4. Horizontal Base Foot: Top Plane -->
    <path d="M26 39.5L44 30L48 32.5L30 42L26 39.5Z" fill="url(#foot_top)" />

    <!-- 5. Horizontal Base Foot: Front Right Facet -->
    <path d="M26 39.5L30 42V49.5L26 47V39.5Z" fill="url(#stem_left)" />
    <path d="M30 42L48 32.5V38.5L30 49.5V42Z" fill="url(#foot_right)" />

    <!-- Specular Highlight Lines -->
    <line x1="26" y1="12.5" x2="34" y2="17" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />
    <line x1="16" y1="18" x2="26" y2="23.5" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.75" />
    <line x1="26" y1="23.5" x2="26" y2="47" stroke="#A7F3D0" stroke-width="1" opacity="0.6" />
    <line x1="30" y1="42" x2="48" y2="32.5" stroke="#E0F2FE" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />

    <!-- Luminous Photonic Spark (Upper-Right Negative Space) -->
    <g transform="translate(40, 19)" filter="url(#core_glow)">
      <path d="M0 -8L2.2 -2.2L8 0L2.2 2.2L0 8L-2.2 2.2L-8 0L-2.2 -2.2Z" fill="url(#spark_grad)" />
      <circle cx="0" cy="0" r="1.5" fill="#FAF8F5" />
    </g>
  </g>
</svg>
`;

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lumetric Brand Monogram</title>
  <style>
    body {
      background: #070B0E;
      color: #FAF8F5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 40px;
    }
    .hero-container {
      max-width: 900px;
      margin: 0 auto;
      text-align: center;
    }
    .badge-preview {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin: 40px 0;
      align-items: center;
    }
    .navbar-preview {
      background: rgba(10, 17, 14, 0.85);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 16px;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 700px;
      margin: 0 auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .brand-title {
      font-weight: 800;
      font-size: 19px;
      letter-spacing: -0.02em;
      color: #FAF8F5;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-sub {
      font-size: 10px;
      font-family: monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #84968C;
    }
    .badge {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 7px;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="hero-container">
    <h1 style="color: #34D399; margin-bottom: 8px;">The Monolithic 3D L-Prism Identity</h1>
    <p style="color: #84968C;">Bespoke architectural vector mark featuring isometric 'L' geometry, deep emerald jade facets, cyan data flow, and a radiant photonic spark.</p>

    <div class="badge-preview">
      <div style="width: 120px; height: 120px;">${logoMonolithL}</div>
      <div style="width: 80px; height: 80px;">${logoMonolithL}</div>
      <div style="width: 48px; height: 48px;">${logoMonolithL}</div>
      <div style="width: 32px; height: 32px;">${logoMonolithL}</div>
    </div>

    <h3>Navbar Lockup Mockup (Zero-Latency Shower)</h3>
    <div class="navbar-preview">
      <div class="brand-group">
        <div style="width: 42px; height: 42px;">${logoMonolithL}</div>
        <div>
          <div class="brand-title">LUMETRIC <span class="badge">v2.4</span></div>
          <div class="brand-sub">AI Data &amp; Decision Studio</div>
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button style="background: none; border: none; color: #FAF8F5; padding: 8px 16px; cursor: pointer; font-weight: 600; font-size: 13px;">Sign In</button>
        <button style="background: linear-gradient(135deg, #10B981, #059669); border: none; color: white; padding: 8px 18px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 13px;">Get Started Free →</button>
      </div>
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync('public/logo-preview.html', html, 'utf8');
console.log('Successfully generated public/logo-preview.html');
