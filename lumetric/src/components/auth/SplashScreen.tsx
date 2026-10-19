'use client';

import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  serverStatus?: 'connected' | 'connecting' | 'disconnected';
  serverLatency?: number | null;
}

export function SplashScreen({ onComplete, serverStatus = 'connecting', serverLatency }: SplashScreenProps) {
  const [progress, setProgress] = useState(25);
  const [phaseText, setPhaseText] = useState('Initializing Lumetric Data & Document Studio...');
  const [showBypass, setShowBypass] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  const handleEnter = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }
  };

  useEffect(() => {
    // 1. Smooth rapid progression
    const t1 = setTimeout(() => {
      setProgress(55);
      setPhaseText('Connecting to Zoho Catalyst Cloud...');
    }, 250);

    const t2 = setTimeout(() => {
      setProgress(85);
      setPhaseText('Validating session & loading data workspace...');
    }, 600);

    const t3 = setTimeout(() => {
      setProgress(100);
      setPhaseText('Ready. Launching Lumetric Studio...');
      setShowBypass(true);
    }, 950);

    // 2. Auto-enter once full
    const t4 = setTimeout(() => {
      handleEnter();
    }, 1250);

    // 3. Safety fallback timer: guarantee enter after 1.6s
    const tFallback = setTimeout(() => {
      handleEnter();
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tFallback);
    };
  }, []);

  return (
    <div
      onClick={handleEnter}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B0F19',
        color: '#FFFFFF',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
        overflow: 'hidden',
        padding: '24px',
        margin: 0,
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] text-white select-none overflow-hidden cursor-pointer"
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Hexagonal App Logo */}
      <div
        style={{
          position: 'relative',
          width: '84px',
          height: '84px',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #F43F5E, #6366F1)',
          padding: '2px',
          boxShadow: '0 20px 30px -10px rgba(225, 29, 72, 0.45)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '20px',
            backgroundColor: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 32 32" style={{ width: '44px', height: '44px' }} fill="none">
            <polygon points="16,3 28,9 28,23 16,29 4,23 4,9" stroke="#F43F5E" strokeWidth="2.2" fill="#0F172A" fillOpacity="0.6" />
            <polygon points="16,3 28,9 16,16 4,9" fill="#FB7185" fillOpacity="0.35" />
            <polygon points="16,16 28,9 28,23 16,29" fill="#E11D48" fillOpacity="0.25" />
            <circle cx="16" cy="16" r="3.5" fill="#F43F5E" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#FFFFFF',
          margin: '0 0 4px 0',
          textAlign: 'center',
        }}
      >
        LUMETRIC
      </h1>
      <p
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          color: 'rgba(251, 113, 133, 0.9)',
          textTransform: 'uppercase',
          margin: '0 0 36px 0',
          textAlign: 'center',
        }}
      >
        AI Data &amp; Document Studio
      </p>

      {/* Progress Bar Container */}
      <div style={{ width: '240px', maxWidth: '85vw' }}>
        <div
          style={{
            height: '6px',
            width: '100%',
            backgroundColor: '#1E293B',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #F43F5E, #6366F1)',
              borderRadius: '9999px',
              transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
        <p
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#94A3B8',
            textAlign: 'center',
            minHeight: '18px',
          }}
        >
          {phaseText}
        </p>
      </div>

      {/* Manual Enter / Bypass Button if needed */}
      <div style={{ minHeight: '44px', marginTop: '20px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
          style={{
            padding: '8px 20px',
            borderRadius: '9999px',
            backgroundColor: showBypass ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            border: showBypass ? '1px solid rgba(244, 63, 94, 0.6)' : '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: showBypass ? 1 : 0.7,
          }}
        >
          {showBypass ? 'Enter Studio →' : 'Launching Studio...'}
        </button>
      </div>

      {/* Footer Info */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: '#64748B',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: serverStatus === 'connected' ? '#10B981' : '#F59E0B',
            display: 'inline-block',
          }}
        />
        <span>Zoho Catalyst Cloud Engine</span>
        {serverLatency && <span style={{ color: '#475569' }}>({serverLatency}ms)</span>}
      </div>
    </div>
  );
}
