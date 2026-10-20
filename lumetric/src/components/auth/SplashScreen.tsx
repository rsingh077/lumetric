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
      setPhaseText('Securing cloud workspace & analytical models...');
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
        backgroundColor: '#0A110E',
        color: '#FAF8F5',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
        overflow: 'hidden',
        padding: '24px',
        margin: 0,
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A110E] text-[#FAF8F5] select-none overflow-hidden cursor-pointer"
    >
      {/* Background radial glow (Emerald + Vermilion) */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          backgroundColor: 'rgba(5, 150, 105, 0.22)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '25%',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          backgroundColor: 'rgba(227, 66, 52, 0.16)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Hexagonal App Logo (Emerald + Vermilion + Warm Ivory) */}
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #E34234 100%)',
          padding: '2.5px',
          boxShadow: '0 20px 35px -8px rgba(5, 150, 105, 0.5)',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '21px',
            backgroundColor: '#0D1612',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 32 32" style={{ width: '46px', height: '46px' }} fill="none">
            <polygon points="16,3 28,9 28,23 16,29 4,23 4,9" stroke="#10B981" strokeWidth="2.4" fill="#0D1612" fillOpacity="0.8" />
            <polygon points="16,3 28,9 16,16 4,9" fill="#059669" fillOpacity="0.4" />
            <polygon points="16,16 28,9 28,23 16,29" fill="#E34234" fillOpacity="0.3" />
            <circle cx="16" cy="16" r="3.8" fill="#FAF8F5" />
          </svg>
        </div>
      </div>

      {/* Title (Warm Ivory) */}
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#FAF8F5',
          margin: '0 0 4px 0',
          textAlign: 'center',
        }}
      >
        LUMETRIC
      </h1>
      <p
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: '#10B981',
          textTransform: 'uppercase',
          margin: '0 0 36px 0',
          textAlign: 'center',
        }}
      >
        AI Data &amp; Document Studio
      </p>

      {/* Progress Bar Container */}
      <div style={{ width: '250px', maxWidth: '85vw' }}>
        <div
          style={{
            height: '6px',
            width: '100%',
            backgroundColor: '#16241D',
            borderRadius: '9999px',
            overflow: 'hidden',
            border: '1px solid rgba(229, 217, 200, 0.1)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #059669 0%, #10B981 70%, #E34234 100%)',
              borderRadius: '9999px',
              transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
        <p
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#CFD8D2',
            textAlign: 'center',
            minHeight: '18px',
          }}
        >
          {phaseText}
        </p>
      </div>

      {/* Manual Enter / Bypass Button */}
      <div style={{ minHeight: '44px', marginTop: '20px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
          style={{
            padding: '8px 22px',
            borderRadius: '9999px',
            backgroundColor: showBypass ? 'rgba(5, 150, 105, 0.25)' : 'rgba(250, 248, 245, 0.08)',
            border: showBypass ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(229, 217, 200, 0.18)',
            color: '#FAF8F5',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: showBypass ? 1 : 0.75,
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
          color: '#84968C',
          letterSpacing: '0.05em',
        }}
      >
        <span>Lumetric AI Data &amp; Document Studio</span>
      </div>
    </div>
  );
}
