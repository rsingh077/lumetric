'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppLanguage } from '@/types';

export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    'app.title': 'Lumetric • AI Data & Document Studio',
    'app.subtitle': 'Executive Data Science & Document Intelligence',
    'nav.overview': 'Overview',
    'nav.data': 'Data & Documents',
    'nav.projects': 'Projects & Goals',
    'nav.analysis': 'Analysis & EDA',
    'nav.pipelines': 'Data Pipelines',
    'nav.models': 'ML Models & AI',
    'nav.dashboards': 'Dashboards',
    'nav.stories': 'Data Stories',
    'nav.operations': 'Engine Operations',
    'nav.settings': 'Settings',
    'nav.sql': 'SQL Studio',
    'nav.excel': 'Excel Automator',
    'nav.investment': 'Investment & Venture Planner',
    'common.welcome': 'Welcome back',
    'common.serverOnline': 'Cloud Connected',
    'common.serverOffline': 'Offline Mode',
    'common.latency': 'ms latency',
    'common.instantAccess': 'Instant Access',
    'common.search': 'Search studio...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.upload': 'Upload',
    'common.export': 'Export',
    'common.loading': 'Loading...',
    'common.retry': 'Retry',
    'common.close': 'Close',
    'data.intake': 'Data Intake',
    'data.wizard': 'Schema Wizard',
    'data.catalog': 'Dataset Catalog',
    'data.inspect': 'Data Inspector',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signOut': 'Sign Out',
  },
  fr: {
    'app.title': 'Lumetric • Studio IA Données & Documents',
    'app.subtitle': 'Science des données & Intelligence documentaire',
    'nav.overview': "Vue d'ensemble",
    'nav.data': 'Données & Documents',
    'nav.projects': 'Projets & Objectifs',
    'nav.analysis': 'Analyse & EDA',
    'nav.pipelines': 'Pipelines de Données',
    'nav.models': 'Modèles ML & IA',
    'nav.dashboards': 'Tableaux de bord',
    'nav.stories': 'Stories & Rapports',
    'nav.operations': 'Opérations Moteur',
    'nav.settings': 'Paramètres',
    'nav.sql': 'Studio SQL',
    'nav.excel': 'Automate Excel',
    'nav.investment': 'Planificateur Investissement & Venture',
    'common.welcome': 'Bienvenue',
    'common.serverOnline': 'Cloud Connecté',
    'common.serverOffline': 'Mode Hors-ligne',
    'common.latency': 'ms de latence',
    'common.instantAccess': 'Accès Immédiat',
    'common.search': 'Rechercher dans le studio...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.upload': 'Téléverser',
    'common.export': 'Exporter',
    'common.loading': 'Chargement...',
    'common.retry': 'Réessayer',
    'common.close': 'Fermer',
    'data.intake': 'Réception des Données',
    'data.wizard': 'Assistant de Schéma',
    'data.catalog': 'Catalogue de Données',
    'data.inspect': 'Inspecteur de Données',
    'auth.signIn': 'Se connecter',
    'auth.signUp': 'Créer un compte',
    'auth.signOut': 'Se déconnecter',
  },
  es: {
    'app.title': 'Lumetric • Estudio de Datos y Documentos IA',
    'app.subtitle': 'Ciencia de Datos e Inteligencia Documental',
    'nav.overview': 'Visión General',
    'nav.data': 'Datos y Documentos',
    'nav.projects': 'Proyectos y Metas',
    'nav.analysis': 'Análisis y EDA',
    'nav.pipelines': 'Canalizaciones de Datos',
    'nav.models': 'Modelos ML e IA',
    'nav.dashboards': 'Paneles',
    'nav.stories': 'Historias de Datos',
    'nav.operations': 'Operaciones del Motor',
    'nav.settings': 'Ajustes',
    'nav.sql': 'Estudio SQL',
    'nav.excel': 'Automatizador Excel',
    'nav.investment': 'Planificador de Inversión y Venture',
    'common.welcome': 'Bienvenido de nuevo',
    'common.serverOnline': 'Nube Conectada',
    'common.serverOffline': 'Modo Desconectado',
    'common.latency': 'ms de latencia',
    'common.instantAccess': 'Acceso Inmediato',
    'common.search': 'Buscar en el estudio...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.upload': 'Subir',
    'common.export': 'Exportar',
    'common.loading': 'Cargando...',
    'common.retry': 'Reintentar',
    'common.close': 'Cerrar',
    'data.intake': 'Entrada de Datos',
    'data.wizard': 'Asistente de Esquema',
    'data.catalog': 'Catálogo de Datos',
    'data.inspect': 'Inspector de Datos',
    'auth.signIn': 'Iniciar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.signOut': 'Cerrar Sesión',
  },
  de: {
    'app.title': 'Lumetric • KI Daten- & Dokumenten-Studio',
    'app.subtitle': 'Data Science & Dokumenten-Intelligenz',
    'nav.overview': 'Übersicht',
    'nav.data': 'Daten & Dokumente',
    'nav.projects': 'Projekte & Ziele',
    'nav.analysis': 'Analyse & EDA',
    'nav.pipelines': 'Daten-Pipelines',
    'nav.models': 'ML-Modelle & KI',
    'nav.dashboards': 'Dashboards',
    'nav.stories': 'Daten-Stories',
    'nav.operations': 'Engine-Betrieb',
    'nav.settings': 'Einstellungen',
    'nav.sql': 'SQL Studio',
    'nav.excel': 'Excel-Automator',
    'nav.investment': 'Investment- & Venture-Planer',
    'common.welcome': 'Willkommen zurück',
    'common.serverOnline': 'Cloud Verbunden',
    'common.serverOffline': 'Offline-Modus',
    'common.latency': 'ms Latenz',
    'common.instantAccess': 'Sofortzugriff',
    'common.search': 'Studio durchsuchen...',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.upload': 'Hochladen',
    'common.export': 'Exportieren',
    'common.loading': 'Laden...',
    'common.retry': 'Wiederholen',
    'common.close': 'Schließen',
    'data.intake': 'Datenaufnahme',
    'data.wizard': 'Schema-Assistent',
    'data.catalog': 'Datenkatalog',
    'data.inspect': 'Dateninspektor',
    'auth.signIn': 'Anmelden',
    'auth.signUp': 'Registrieren',
    'auth.signOut': 'Abmelden',
  },
};

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lumetric_lang') as AppLanguage | null;
      if (stored === 'en' || stored === 'fr' || stored === 'es' || stored === 'de') {
        setLanguageState(stored);
      } else {
        const navLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
        if (navLang === 'fr' || navLang === 'es' || navLang === 'de') {
          setLanguageState(navLang as AppLanguage);
        }
      }
    }
  }, []);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lumetric_lang', lang);
      } catch {}
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const langDict = TRANSLATIONS[language];
      if (langDict && langDict[key]) return langDict[key];
      const enDict = TRANSLATIONS['en'];
      if (enDict && enDict[key]) return enDict[key];
      return key;
    },
    [language]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(language, options).format(value);
      } catch {
        return String(value);
      }
    },
    [language]
  );

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(language, options).format(d);
      } catch {
        return String(date);
      }
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount: number, currency: string = 'USD'): string => {
      try {
        return new Intl.NumberFormat(language, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${currency} ${amount}`;
      }
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      formatNumber,
      formatDate,
      formatCurrency,
    }),
    [language, setLanguage, t, formatNumber, formatDate, formatCurrency]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
