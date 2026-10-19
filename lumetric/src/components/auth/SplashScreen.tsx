'use client';

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  serverStatus?: 'connected' | 'connecting' | 'disconnected';
  serverLatency?: number | null;
}

export function SplashScreen({ onComplete, serverStatus = 'connecting', serverLatency }: SplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [phaseText, setPhaseText] = useState('Initializing Lumetric Enterprise Engine...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(40);
      setPhaseText('Handshaking with Zoho Catalyst Datastore...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(75);
      setPhaseText('Validating cryptographic session & tokens...');
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(100);
      setPhaseText('Kernel initialized. Launching Studio...');
    }, 1400);

    const t4 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0B0F19] text-white p-6 sm:p-10 select-none overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] bg-rose-600/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[280px] h-[280px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Branding Pill */}
      <div className="w-full flex items-center justify-between max-w-sm pt-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Catalyst Cloud Live</span>
        </div>
        <span className="text-xs tracking-widest uppercase font-mono text-slate-400">v1.6.0 Enterprise</span>
      </div>

      {/* Center Icon & Branding */}
      <div className="flex flex-col items-center justify-center -mt-8">
        {/* Animated Geometric Prism Icon */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Orbital pulse ring */}
          <div className="absolute inset-0 -m-4 rounded-3xl border border-rose-500/20 animate-ping opacity-30" />
          <div className="absolute inset-0 -m-8 rounded-full border border-indigo-500/10 animate-pulse" />

          {/* Core App Icon Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-slate-900 via-[#131B2E] to-slate-900 border border-white/15 shadow-2xl shadow-rose-950/50 flex items-center justify-center p-4">
            <svg viewBox="0 0 48 48" className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_0_18px_rgba(244,63,94,0.5)]" fill="none">
              <defs>
                <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="50%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#9333EA" />
                </linearGradient>
                <linearGradient id="facetGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#E11D48" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Geometric isometric prism faceted diamond */}
              <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" stroke="url(#prismGrad)" strokeWidth="2.5" fill="#0F172A" fillOpacity="0.8" />
              <line x1="24" y1="4" x2="24" y2="44" stroke="url(#prismGrad)" strokeWidth="2" strokeDasharray="3 2" />
              <line x1="6" y1="14" x2="42" y2="34" stroke="url(#facetGrad)" strokeWidth="1.5" />
              <line x1="6" y1="34" x2="42" y2="14" stroke="url(#facetGrad)" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="5" fill="#F43F5E" className="animate-pulse" />
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-rose-200 bg-clip-text text-transparent">
          LUMETRIC
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium tracking-wide text-rose-400/90 uppercase letter-spacing-[0.2em]">
          AI Data & Decision Studio
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-64 sm:w-72 mt-8">
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(244,63,94,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="truncate pr-2">{phaseText}</span>
            <span className="font-semibold text-rose-300">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2 pb-2 text-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Zoho Catalyst Cloud (India Region)</span>
          {serverLatency && (
            <span className="text-[10px] text-slate-400 font-mono">({serverLatency}ms)</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">
          256-bit TLS Encrypted Handshake • SOC-2 Certified Datastore
        </div>
      </div>
    </div>
  );
}
