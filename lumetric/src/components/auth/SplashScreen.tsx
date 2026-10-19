'use client';

import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  serverStatus?: 'connected' | 'connecting' | 'disconnected';
  serverLatency?: number | null;
}

export function SplashScreen({ onComplete, serverStatus = 'connecting', serverLatency }: SplashScreenProps) {
  const [progress, setProgress] = useState(20);
  const [phaseText, setPhaseText] = useState('Démarrage du moteur logistique Lumetric...');
  const [showBypass, setShowBypass] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleEnter = () => {
    onCompleteRef.current?.();
  };

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(45);
      setPhaseText('Connexion au Cloud Zoho Catalyst...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(75);
      setPhaseText('Validation de session & synchronisation flotte...');
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(100);
      setPhaseText('Prêt. Lancement de Lumetric Studio...');
    }, 1400);

    const t4 = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1800);

    // Safety fallback: after 2.2s, show direct enter button if still on screen
    const tBypass = setTimeout(() => {
      setShowBypass(true);
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tBypass);
    };
  }, []);

  return (
    <div
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
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] text-white select-none overflow-hidden"
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
        Executive Logistics &amp; Analytics
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
        {showBypass && (
          <button
            onClick={handleEnter}
            style={{
              padding: '8px 20px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Accéder directement au Studio →
          </button>
        )}
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
