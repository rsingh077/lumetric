'use client';

import React, { useState, useEffect } from 'react';
import { LumetricAuthService } from '@/lib/auth';
import { Button } from '@/components/ui';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TwoFactorSetupModal({ isOpen, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<'loading' | 'qr' | 'success' | 'error'>('loading');
  const [secret, setSecret] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setStep('loading');
    setErrorMessage('');
    setTotpCode('');

    LumetricAuthService.setup2FA().then((res) => {
      if (!mounted) return;
      if (res.success && res.qrCodeDataUrl && res.secret) {
        setSecret(res.secret);
        setQrCodeDataUrl(res.qrCodeDataUrl);
        setStep('qr');
      } else {
        setErrorMessage(res.error || 'Impossible d\'initialiser la clé 2FA sur le serveur cloud.');
        setStep('error');
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) {
      setErrorMessage('Veuillez saisir un code à 6 chiffres valide.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const res = await LumetricAuthService.verify2FA(totpCode.trim());
      if (res.success) {
        setStep('success');
        onSuccess?.();
      } else {
        setErrorMessage(res.error || 'Code invalide ou expiré. Veuillez réessayer.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la vérification 2FA.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl text-white relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sécurité Two-Factor (2FA)</h3>
              <p className="text-xs text-slate-400">Protection renforcée de compte TOTP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step: Loading */}
        {step === 'loading' && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-slate-400">Génération de la clé cryptographique sécurisée...</p>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              ⚠️
            </div>
            <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
            <Button variant="secondary" onClick={onClose}>Fermer</Button>
          </div>
        )}

        {/* Step: QR Code & Verification Input */}
        {step === 'qr' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Scannez ce QR Code avec <span className="text-rose-400 font-semibold">Google Authenticator</span> ou <span className="text-rose-400 font-semibold">1Password</span> :
            </p>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl flex items-center justify-center w-48 h-48 mx-auto shadow-md">
              {qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">Chargement...</div>
              )}
            </div>

            {/* Secret Manual Key */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 truncate tracking-wider">{secret}</span>
              <button
                type="button"
                onClick={handleCopySecret}
                className="ml-2 text-rose-400 hover:text-rose-300 font-semibold shrink-0 cursor-pointer"
              >
                {copiedSecret ? 'Copié !' : 'Copier'}
              </button>
            </div>

            {/* 6-digit verification code input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Code de vérification (6 chiffres)
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                autoFocus
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium text-center">{errorMessage}</p>
            )}

            <div className="flex gap-2.5 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="flex-1 bg-rose-500 hover:bg-rose-600" loading={isVerifying}>
                Activer 2FA
              </Button>
            </div>
          </form>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">2FA activé avec succès !</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Votre compte Lumetric est désormais verrouillé par clé TOTP. Un code sera requis à chaque connexion.
              </p>
            </div>
            <Button variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={onClose}>
              Terminé
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
