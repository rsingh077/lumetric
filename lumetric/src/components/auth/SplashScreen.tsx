'use client';

import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  serverStatus?: 'connected' | 'connecting' | 'disconnected';
  serverLatency?: number | null;
}

export function SplashScreen({ onComplete, serverStatus = 'connecting', serverLatency }: SplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [phaseText, setPhaseText] = useState('Initializing Lumetric Enterprise Engine...');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(40);
      setPhaseText('Connecting to Zoho Catalyst Cloud...');
    }, 500);

    const t2 = setTimeout(() => {
      setProgress(70);
      setPhaseText('Validating session & loading workspace...');
    }, 1100);

    const t3 = setTimeout(() => {
      setProgress(100);
      setPhaseText('Ready. Launching Lumetric Studio...');
    }, 1600);

    const t4 = setTimeout(() => {
      onCompleteRef.current?.();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []); // EMPTY dependency array - runs exactly once

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] text-white select-none overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-rose-600/12 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo */}
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 p-[2px] shadow-xl shadow-rose-900/40 mb-6">
        <div className="w-full h-full rounded-[14px] bg-[#0F172A] flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-10 h-10" fill="none">
            <polygon points="16,3 28,9 28,23 16,29 4,23 4,9" stroke="#F43F5E" strokeWidth="2" fill="#0F172A" fillOpacity="0.6" />
            <polygon points="16,3 28,9 16,16 4,9" fill="#FB7185" fillOpacity="0.3" />
            <polygon points="16,16 28,9 28,23 16,29" fill="#E11D48" fillOpacity="0.2" />
            <circle cx="16" cy="16" r="3.5" fill="#F43F5E" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white mb-1">LUMETRIC</h1>
      <p className="text-[11px] font-medium tracking-widest text-rose-400/80 uppercase mb-8">AI Data & Decision Studio</p>

      {/* Progress */}
      <div className="w-56">
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-[11px] text-slate-400 text-center">{phaseText}</p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Zoho Catalyst Cloud</span>
        {serverLatency && <span className="text-slate-600">({serverLatency}ms)</span>}
      </div>
    </div>
  );
}
