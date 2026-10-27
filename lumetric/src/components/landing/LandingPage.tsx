'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import {
  GlobeIcon,
  FileSpreadsheetIcon,
  BrainIcon,
  DatabaseIcon,
  SparklesIcon,
  BarChart3Icon,
  ShieldIcon,
  MaximizeIcon,
  ActivityIcon,
} from '@/components/icons';

export function LandingPage() {
  const { serverStatus, serverLatency } = useApp();

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [heroEmail, setHeroEmail] = useState('');

  // Interactive Demo Simulator State
  const [activeDemoTab, setActiveDemoTab] = useState<'geo' | 'excel' | 'models' | 'sql'>('geo');

  // Check URL parameters on mount (e.g., ?action=login or ?action=signup)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'login' || action === 'signin') {
        setAuthModalMode('signin');
        setAuthModalOpen(true);
      } else if (action === 'signup' || action === 'register' || action === 'get-started') {
        setAuthModalMode('signup');
        setAuthModalOpen(true);
      }
    }
  }, []);

  const openAuth = (mode: 'signin' | 'signup', prefillEmail = '') => {
    setAuthModalMode(mode);
    if (prefillEmail) setHeroEmail(prefillEmail);
    setAuthModalOpen(true);
  };

  const handleHeroEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openAuth('signup', heroEmail);
  };

  return (
    <div className="min-h-screen bg-[#070B0E] text-[#FAF8F5] relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Ambient Atmospheric Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-emerald-500/14 blur-[180px] rounded-full pointer-events-none" />
      <div className="fixed top-[40%] -right-40 w-[600px] h-[500px] bg-cyan-500/10 blur-[180px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 -left-40 w-[600px] h-[500px] bg-emerald-600/10 blur-[180px] rounded-full pointer-events-none" />

      {/* 1. STICKY GLASSMORPHIC NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 backdrop-blur-2xl bg-[#070B0E]/80 border-b border-emerald-500/15 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-950/50">
              <div className="w-full h-full bg-[#0A110E] rounded-[14px] flex items-center justify-center">
                <span className="text-emerald-400 font-black text-lg">✦</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white block">LUMETRIC</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  v2.4
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">
                AI Data &amp; Decision Studio
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
            <a href="#platform" className="hover:text-emerald-400 transition-colors">Platform</a>
            <a href="#geography" className="hover:text-emerald-400 transition-colors">Geographic Intelligence</a>
            <a href="#excel" className="hover:text-emerald-400 transition-colors">Excel Automator</a>
            <a href="#models" className="hover:text-emerald-400 transition-colors">AutoML</a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">Security</a>
          </div>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            {/* Live Server Telemetry Dot */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>{serverStatus === 'connected' ? (serverLatency ? `${serverLatency}ms` : 'Cloud Active') : 'Live Cloud'}</span>
            </div>

            <button
              onClick={() => openAuth('signin')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={() => openAuth('signup')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center z-10">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Zero-Trust Enterprise Decision Intelligence</span>
          <span className="text-emerald-500/60">•</span>
          <span className="text-slate-300">Official Survey of India Cartography &amp; Meta-Style OTP</span>
        </div>

        {/* Grand Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
          Turn Complex Data Into{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Executive Intelligence
          </span>{' '}
          &amp; Predictive Decisions.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          From 500,000-row Excel spreadsheets to authentic Survey of India cartography and in-browser machine learning models — automated in seconds with zero server latency.
        </p>

        {/* Fast-Track Email Input Action Box */}
        <div className="mt-10 max-w-md mx-auto">
          <form onSubmit={handleHeroEmailSubmit} className="flex flex-col sm:flex-row gap-2.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md">
            <input
              type="email"
              required
              placeholder="Enter your work email address..."
              value={heroEmail}
              onChange={(e) => setHeroEmail(e.target.value)}
              className="flex-1 px-4 py-3 text-xs sm:text-sm bg-transparent text-white placeholder-slate-400 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <span>Launch Studio</span>
              <span>→</span>
            </button>
          </form>
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Instant Meta-Style OTP
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Zero Configuration
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> No Card Required
            </span>
          </div>
        </div>

        {/* 3. INTERACTIVE STUDIO DEMO SIMULATOR (Hero Visual) */}
        <div className="mt-16 sm:mt-20 rounded-3xl bg-[#0D141C] border border-slate-700/80 shadow-2xl overflow-hidden text-left">
          {/* Simulator Window Header Bar */}
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400 font-semibold">
                Lumetric Studio Preview • Executive Intelligence Workspace
              </span>
            </div>

            {/* Interactive Simulator Tabs */}
            <div className="flex items-center flex-wrap gap-1 bg-slate-950 p-1 rounded-xl text-xs font-medium border border-slate-800">
              <button
                onClick={() => setActiveDemoTab('geo')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDemoTab === 'geo'
                    ? 'bg-emerald-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GlobeIcon className="w-3.5 h-3.5" />
                <span>Geographic Intelligence</span>
              </button>
              <button
                onClick={() => setActiveDemoTab('excel')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDemoTab === 'excel'
                    ? 'bg-emerald-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheetIcon className="w-3.5 h-3.5" />
                <span>Excel Automator</span>
              </button>
              <button
                onClick={() => setActiveDemoTab('models')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDemoTab === 'models'
                    ? 'bg-emerald-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BrainIcon className="w-3.5 h-3.5" />
                <span>AutoML Models</span>
              </button>
              <button
                onClick={() => setActiveDemoTab('sql')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDemoTab === 'sql'
                    ? 'bg-emerald-500 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DatabaseIcon className="w-3.5 h-3.5" />
                <span>SQL Studio</span>
              </button>
            </div>
          </div>

          {/* Simulator Canvas Display */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-[#0D141C] to-[#080D12] min-h-[420px] flex items-center justify-center">
            {/* TAB 1: GEOGRAPHIC INTELLIGENCE PREVIEW */}
            {activeDemoTab === 'geo' && (
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in duration-300">
                <div className="lg:col-span-7 bg-[#122A42] p-6 rounded-2xl border border-slate-700/80 relative overflow-hidden shadow-inner flex flex-col justify-between min-h-[300px]">
                  {/* Radar Telemetry Header */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>SURVEY OF INDIA (37 STATES &amp; UTS)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Telemetry Radar Active
                    </span>
                  </div>

                  {/* Visual Map Representation */}
                  <div className="my-6 flex items-center justify-center relative">
                    <svg viewBox="0 0 400 240" className="w-full max-w-sm h-auto drop-shadow-lg">
                      {/* Grid lines */}
                      <g stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4">
                        <line x1="0" y1="60" x2="400" y2="60" />
                        <line x1="0" y1="120" x2="400" y2="120" />
                        <line x1="0" y1="180" x2="400" y2="180" />
                        <line x1="100" y1="0" x2="100" y2="240" />
                        <line x1="200" y1="0" x2="200" y2="240" />
                        <line x1="300" y1="0" x2="300" y2="240" />
                      </g>
                      {/* Abstracted India Cartography Silhouettes */}
                      <path d="M190,20 L210,35 L230,65 L260,85 L280,110 L240,140 L215,195 L200,225 L185,190 L160,150 L140,115 L165,70 Z" fill="#FFFFFF" stroke="#122A42" strokeWidth="1" />
                      {/* Active States (Maharashtra, Karnataka, Gujarat) */}
                      <path d="M165,115 L195,120 L190,155 L160,150 Z" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" className="animate-pulse" />
                      <path d="M160,150 L190,155 L180,195 L165,185 Z" fill="#059669" stroke="#34D399" strokeWidth="1" />
                      <circle cx="178" cy="135" r="5" fill="#34D399" className="animate-ping" />
                      <circle cx="178" cy="135" r="3" fill="#FFFFFF" />
                      <text x="178" y="152" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">MAHARASHTRA</text>
                    </svg>
                  </div>

                  {/* Floating Territory Dossier Card */}
                  <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
                        MH
                      </div>
                      <div>
                        <div className="font-bold text-white">Maharashtra (Mumbai Hub)</div>
                        <div className="text-[10px] text-slate-400">42,890 Records • 34.8% Market Share</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400 text-sm">$4,289,100</div>
                      <div className="text-[10px] text-emerald-300">Primary Revenue</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4 text-left">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Survey of India Standard Vector Cartography
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Accurately map data across all 37 States and Union Territories with Survey of India sovereign borders, real-world D3 projections, and automatic city alias resolution.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>37 States &amp; UTs + US 50 States + 176 Sovereign Nations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Interactive Dropdown Territory Inspector with Given Data Dossier</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Animated Telemetry Radar &amp; Instant 1-Click Dashboard Filtering</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => openAuth('signup')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Try Geographic Maps in Studio →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: EXCEL AUTOMATOR PREVIEW */}
            {activeDemoTab === 'excel' && (
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in duration-300 text-left">
                <div className="lg:col-span-7 bg-[#111C17] p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span className="text-emerald-400 font-bold">EXCEL AUTOMATOR PIPELINE</span>
                    <span>Q3_Financial_Performance.xlsx</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Rows Healed</span>
                      <div className="text-emerald-400 font-bold text-sm">142,500</div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Formulas Generated</span>
                      <div className="text-cyan-400 font-bold text-sm">28 Active</div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Health Score</span>
                      <div className="text-emerald-300 font-bold text-sm">99.8% Perfect</div>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5 text-slate-300 font-sans">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <span>⚡ AI Statistical Diagnosis:</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Automatically resolved date format skew across columns (YYYY-MM-DD vs DD/MM/YYYY), imputed 418 null revenue cells using Gaussian median regression, and normalized customer IDs across 14 sheets.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Multi-Pass Excel Healing &amp; Automated Statistical Analysis
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Drag and drop corrupted or messy enterprise spreadsheets. Lumetric auto-detects column profiles, repairs broken calculations, and generates board-ready summaries.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>500,000+ Row High-Throughput Processing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Formula Error Remediation (#VALUE!, #DIV/0!, #REF!)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Export to Clean Parquet, CSV, or Formatted Excel</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => openAuth('signup')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Open Excel Automator →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: AUTOML PREVIEW */}
            {activeDemoTab === 'models' && (
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in duration-300 text-left">
                <div className="lg:col-span-7 bg-[#111C17] p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="text-cyan-400 font-bold font-mono">RANDOM FOREST REGRESSOR</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 text-cyan-300 font-mono">
                      R² = 0.984 • 100 Trees
                    </span>
                  </div>
                  {/* Feature Importance Bars */}
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Lead Score &amp; Tier Weight</span>
                        <span className="text-emerald-400">42% Importance</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="w-[42%] h-full bg-emerald-400 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Annual Recurring Spend (ARR)</span>
                        <span className="text-teal-400">31% Importance</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="w-[31%] h-full bg-teal-400 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Territory Region (West / South India)</span>
                        <span className="text-cyan-400">18% Importance</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="w-[18%] h-full bg-cyan-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Browser-Native Machine Learning (AutoML)
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Train regression, classification, and clustering models directly inside your client browser. Your raw data never leaves your device, guaranteeing total data sovereignty.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Random Forest, Linear Regression, and K-Means</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Interactive Confusion Matrices &amp; Forecast Curves</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => openAuth('signup')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Build Predictive Models →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SQL STUDIO PREVIEW */}
            {activeDemoTab === 'sql' && (
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in duration-300 text-left">
                <div className="lg:col-span-7 bg-[#0E1713] p-5 rounded-2xl border border-slate-700/80 shadow-xl space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span className="text-emerald-400 font-bold">DUCKDB IN-MEMORY SQL QUERY</span>
                    <span className="text-emerald-300">4.2ms execution</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto text-xs leading-relaxed">
                    <span className="text-purple-400 font-bold">SELECT</span> territory, <span className="text-blue-400">SUM</span>(revenue) <span className="text-purple-400 font-bold">AS</span> total_arr,<br />
                    &nbsp;&nbsp;<span className="text-blue-400">COUNT</span>(*) <span className="text-purple-400 font-bold">AS</span> accounts<br />
                    <span className="text-purple-400 font-bold">FROM</span> dataset_enterprise_sales<br />
                    <span className="text-purple-400 font-bold">WHERE</span> churn_risk &lt; <span className="text-amber-400">0.25</span><br />
                    <span className="text-purple-400 font-bold">GROUP BY</span> territory<br />
                    <span className="text-purple-400 font-bold">ORDER BY</span> total_arr <span className="text-purple-400 font-bold">DESC LIMIT</span> <span className="text-amber-400">5</span>;
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>5 rows returned in 0.0042s</span>
                    <span className="text-emerald-400 font-semibold">1-Click Chart Render Ready</span>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Instant Vector SQL Query Engine
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Run ANSI-compliant SQL against 500k rows directly in memory. Join multiple datasets, calculate rolling window aggregates, and render dynamic charts instantly.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Sub-15ms In-Memory Query Execution</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Multi-tab Query History &amp; Saved Scripts</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => openAuth('signup')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Launch SQL Studio →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. KEY METRICS COUNTER TICKER */}
      <section className="border-y border-emerald-500/15 bg-slate-950/60 backdrop-blur-md py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">500,000+</div>
            <div className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Rows per Dataset</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono tracking-tight">&lt; 15ms</div>
            <div className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">In-Memory Query Latency</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-teal-300 font-mono tracking-tight">37 States &amp; UTs</div>
            <div className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Survey of India Boundaries</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">100% Zero-Trust</div>
            <div className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Anti-Bypass OTP Architecture</div>
          </div>
        </div>
      </section>

      {/* 5. DEEP-DIVE CAPABILITY GRID */}
      <section id="platform" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Engineered for Decision Makers</h2>
          <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything your analytics team needs to discover, heal, and act.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Geographic Intelligence */}
          <div id="geography" className="p-7 rounded-3xl bg-[#0F171D] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <GlobeIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Survey of India &amp; US Cartography</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official Survey of India boundaries across all 37 States &amp; Union Territories and 50 US States with animated telemetry radar sweeps and data dossiers.
            </p>
          </div>

          {/* Card 2: Excel Automator */}
          <div id="excel" className="p-7 rounded-3xl bg-[#0F171D] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FileSpreadsheetIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated Excel Healing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingest raw multi-sheet workbooks. Lumetric automatically repairs broken formulas, imputes missing values, and generates statistical distribution summaries.
            </p>
          </div>

          {/* Card 3: In-Browser AutoML */}
          <div id="models" className="p-7 rounded-3xl bg-[#0F171D] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BrainIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Client-Side Machine Learning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Train regression, classification, and K-Means models in seconds directly in the browser with 100% private data sovereignty.
            </p>
          </div>

          {/* Card 4: High-Speed SQL Studio */}
          <div className="p-7 rounded-3xl bg-[#0F171D] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <DatabaseIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">In-Memory SQL Studio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Query massive tabular datasets with full ANSI SQL syntax, execution plan telemetry, and instant 1-click chart generation.
            </p>
          </div>

          {/* Card 5: Zero-Trust Security */}
          <div id="security" className="p-7 rounded-3xl bg-[#0F171D] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <ShieldIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Zero-Trust &amp; Meta-Style OTP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every login is cryptographically gated by single-use 6-digit OTP verification with 3-strike lockout and anti-bypass challenge signatures.
            </p>
          </div>

          {/* Card 6: Executive Reporting */}
          <div className="p-7 rounded-3xl bg-[#0F171D] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-950/20 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BarChart3Icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Executive Stories &amp; PDF Exports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export high-resolution, vector-crisp presentations and data stories ready for executive reviews and stakeholder meetings.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="rounded-3xl bg-gradient-to-br from-[#0F1F19] to-[#0D1822] border border-emerald-500/30 p-10 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Ready to Experience Instant Data Intelligence?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Create your account in 30 seconds with zero-trust verification. Ingest datasets, explore geospatial intelligence, and run predictive models right away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openAuth('signup')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <span>→</span>
            </button>
            <button
              onClick={() => openAuth('signin')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#05090C] py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              ✦
            </div>
            <span className="font-bold text-white tracking-tight">LUMETRIC STUDIO</span>
            <span className="text-slate-500">|</span>
            <span>Enterprise Data &amp; Decision Platform</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <button onClick={() => openAuth('signin')} className="hover:text-emerald-400 transition-colors cursor-pointer">
              Sign In
            </button>
            <button onClick={() => openAuth('signup')} className="hover:text-emerald-400 transition-colors cursor-pointer">
              Create Account
            </button>
            <span className="text-slate-600">•</span>
            <span>security@techexon.app</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} Lumetric Inc. All rights reserved. Zero-Trust Security Protocol active.
        </div>
      </footer>

      {/* 8. SEAMLESS 1-CLICK AUTHENTICATION MODAL */}
      {authModalOpen && (
        <AuthScreen
          isModal={true}
          initialMode={authModalMode}
          initialEmail={heroEmail}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
