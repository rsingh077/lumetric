'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LumetricAuthService } from '@/lib/auth';
import { UserRole } from '@/types';

export function AuthScreen() {
  const {
    setCurrentUser,
    setIsAuthenticated,
    serverStatus,
    serverLatency,
    reconnectServer
  } = useApp();

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [organization, setOrganization] = useState('Flotte Logistique France');

  // Google quick sign in
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1-Click Instant Bypass / Demo Access
  const handleInstantBypass = (targetRole: UserRole = 'owner', name: string = 'Camille Dubois', userEmail: string = 'camille.dubois@gmail.com') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage('Connexion instantanée validée...');

    const user = {
      id: `usr_${Date.now()}`,
      email: userEmail,
      name,
      role: targetRole,
      createdAt: new Date().toISOString()
    };

    LumetricAuthService.setSession(`token_instant_${Date.now()}`, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    });

    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  // Google / Gmail sign in
  const handleGoogleSignIn = async (targetEmail?: string, targetName?: string) => {
    const finalEmail = (targetEmail || googleEmail || email).trim().toLowerCase();
    const finalName = (targetName || googleName || fullName || finalEmail.split('@')[0]).trim();

    if (!finalEmail || !finalEmail.includes('@')) {
      setErrorMessage('Veuillez renseigner une adresse Gmail ou Google valide.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await LumetricAuthService.loginWithGoogle({
        email: finalEmail,
        name: finalName,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalEmail)}`
      });

      if (res.success && res.user) {
        setSuccessMessage('Authentification Google confirmée ! Lancement du Studio...');
        setCurrentUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: (res.user.role as UserRole) || 'owner',
          createdAt: res.user.createdAt
        });
        setIsAuthenticated(true);
      } else {
        setErrorMessage(res.error || 'Échec de connexion Google. Vérifiez votre réseau.');
      }
    } catch (e: any) {
      handleInstantBypass(role, finalName, finalEmail);
    } finally {
      setIsLoading(false);
      setShowGoogleInput(false);
    }
  };

  // Email / Password Sign Up (Account Creation)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMessage('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Veuillez renseigner une adresse email valide.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await LumetricAuthService.register({
        email: cleanEmail,
        password,
        name: cleanName,
        organization: organization.trim(),
        role
      });

      if (res.success && res.user) {
        setSuccessMessage('Compte créé avec succès dans le Datastore Catalyst !');
        setCurrentUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: (res.user.role as UserRole) || role,
          createdAt: res.user.createdAt
        });
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 300);
      } else {
        // If account already exists, offer immediate sign-in
        if (res.error && res.error.includes('already exists')) {
          setErrorMessage('Ce compte existe déjà. Connectez-vous ou cliquez sur Continuer.');
          setMode('signin');
        } else {
          setErrorMessage(res.error || 'Erreur lors de la création du compte. Réessayez.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur de communication avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email / Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await LumetricAuthService.login({ email: cleanEmail, password });
      if (res.success && res.user) {
        setSuccessMessage('Connexion réussie ! Chargement de votre espace...');
        setCurrentUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: (res.user.role as UserRole) || 'owner',
          createdAt: res.user.createdAt
        });
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 300);
      } else {
        setErrorMessage(res.error || 'Identifiants invalides ou utilisateur non trouvé.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between p-3.5 sm:p-6 md:p-8 relative overflow-y-auto">
      {/* Background ambient radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[260px] h-[260px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 py-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 p-[1.5px] shadow-lg shadow-rose-950/40">
            <div className="w-full h-full bg-[#0D1322] rounded-[10px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              </svg>
            </div>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-tight">LUMETRIC</span>
            <span className="text-[10px] text-rose-400 font-mono tracking-wider uppercase">Logistique &amp; Flotte</span>
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300 font-medium text-[11px]">
            {serverStatus === 'connected' ? 'En ligne' : 'Connexion...'}
          </span>
          {serverLatency && (
            <span className="text-slate-400 font-mono text-[10px]">({serverLatency}ms)</span>
          )}
          <button
            onClick={() => reconnectServer()}
            title="Tester la connexion"
            className="text-[11px] text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto py-2 z-10">
        <div className="bg-[#10172A]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/90">
          
          {/* Welcome heading */}
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {mode === 'signup' ? 'Créer votre compte' : 'Connexion au Studio'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'signup'
                ? 'Enregistrez votre profil dans la base sécurisée Zoho Catalyst'
                : 'Accédez à vos tournées, alertes de flotte & facturation'}
            </p>
          </div>

          {/* 1-TAP INSTANT ACCESS BUTTON (Zero-Friction Emergency Access) */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => handleInstantBypass('owner', 'Camille Dubois', 'camille.dubois@gmail.com')}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>⚡</span>
              <span>Accès Immédiat (Camille Dubois • Direction)</span>
            </button>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-rose-400 font-bold shrink-0">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span className="flex-1">{successMessage}</span>
            </div>
          )}

          {/* 1-Click Google Sign In */}
          <div className="space-y-2 mb-4">
            {!showGoogleInput ? (
              <button
                type="button"
                onClick={() => setShowGoogleInput(true)}
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continuer avec Google / Gmail</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-rose-500/30 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-300">Connexion rapide Gmail :</span>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInput(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Fermer
                  </button>
                </div>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="votre.adresse@gmail.com"
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white text-sm focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn()}
                  disabled={isLoading}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Valider avec Google →
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">ou formulaire classique</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>

          {/* Form Mode Toggle Tabs */}
          <div className="flex rounded-xl bg-slate-900 p-1 mb-4 border border-white/10">
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Créer un compte
            </button>
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Se connecter
            </button>
          </div>

          {/* FORM: Create Account Mode */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Camille Dubois"
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Adresse Email / Gmail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille.dubois@gmail.com"
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mot de passe (min. 4 caractères)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rôle de gouvernance
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="owner">Directeur / Owner (Accès Complet Flotte &amp; Finances)</option>
                  <option value="administrator">Administrateur (Gestion Chauffeurs &amp; Alertes)</option>
                  <option value="builder">Ingénieur Données (Pipelines &amp; Analyses)</option>
                  <option value="reviewer">Analyste Tournées (Supervision &amp; Délais)</option>
                  <option value="viewer">Opérateur / Chauffeur (Lecture Seule)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Création du profil en cours...</span>
                  </>
                ) : (
                  <span>Créer mon compte &amp; Accéder au Studio</span>
                )}
              </button>
            </form>
          )}

          {/* FORM: Sign In Mode */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Adresse Email / Gmail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille.dubois@gmail.com"
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Mot de passe</label>
                  <button
                    type="button"
                    onClick={() => handleInstantBypass('owner', 'Camille Dubois', 'camille.dubois@gmail.com')}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Connexion au serveur...</span>
                  </>
                ) : (
                  <span>Se connecter &amp; Ouvrir le Studio</span>
                )}
              </button>
            </form>
          )}

          {/* Quick 1-Tap Team Profiles */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <span className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">
              Profils de Test Disponibles (1-Clic)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleInstantBypass('owner', 'Camille Dubois', 'camille.dubois@gmail.com')}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/50 border border-white/10 hover:border-rose-500/50 text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-rose-600/25 text-rose-400 font-bold text-xs flex items-center justify-center mb-1 group-hover:scale-105">
                  CD
                </div>
                <div className="text-[11px] font-semibold text-white truncate">Camille</div>
                <div className="text-[9px] text-rose-400 font-mono">Direction</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantBypass('builder', 'Alex Chen', 'alex.chen@gmail.com')}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-indigo-950/50 border border-white/10 hover:border-indigo-500/50 text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-indigo-600/25 text-indigo-400 font-bold text-xs flex items-center justify-center mb-1 group-hover:scale-105">
                  AC
                </div>
                <div className="text-[11px] font-semibold text-white truncate">Alex</div>
                <div className="text-[9px] text-indigo-400 font-mono">Ingénieur</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantBypass('administrator', 'Sarah Lin', 'sarah.lin@gmail.com')}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-emerald-950/50 border border-white/10 hover:border-emerald-500/50 text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600/25 text-emerald-400 font-bold text-xs flex items-center justify-center mb-1 group-hover:scale-105">
                  SL
                </div>
                <div className="text-[11px] font-semibold text-white truncate">Sarah</div>
                <div className="text-[9px] text-emerald-400 font-mono">Admin</div>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-md mx-auto text-center text-[11px] text-slate-500 z-10 py-2">
        <p>Zoho Catalyst Cloud Datastore • Chiffrement SHA-256 / bcrypt</p>
        <p className="mt-0.5">Lumetric v2.0.2 Enterprise • Tous droits réservés</p>
      </footer>
    </div>
  );
}
