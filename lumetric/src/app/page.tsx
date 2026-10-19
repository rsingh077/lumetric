'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/ui';
import {
  DatabaseIcon,
  BarChart3Icon,
  ActivityIcon,
  SparklesIcon,
  UserIcon,
  GitBranchIcon,
  SearchIcon,
  BellIcon,
} from '@/components/icons';

// Sub-page imports for routing between application tabs
import ProjectsPage from './projects/page';
import DataWorkspacePage from './data/page';
import PipelinesPage from './pipelines/page';
import AnalysisStudioPage from './analysis/page';
import ModelsPage from './models/page';
import DashboardsPage from './dashboards/page';
import StoriesPage from './stories/page';
import OperationsPage from './operations/page';
import SettingsPage from './settings/page';

function HomeView() {
  const {
    currentUser,
    activeDataset,
    activeRows,
    setActiveView,
    serverStatus,
    serverLatency,
    openAuthModal,
  } = useApp();

  const [selectedTruck, setSelectedTruck] = useState('Camion 12 (Julien Morel)');
  const [deliveryStatusTab, setDeliveryStatusTab] = useState<'delivering' | 'waiting' | 'completed'>('delivering');
  const [trendTimeframe, setTrendTimeframe] = useState('7 derniers jours');
  const [perfTimeframe, setPerfTimeframe] = useState('Mois en cours');

  // Compute real metrics from ingested rows if available
  const computedMetrics = useMemo(() => {
    const rowCount = activeRows?.length || 12;
    const totalARR = activeRows?.reduce((acc, r) => acc + (parseFloat(r.ARR_USD || '0') || 0), 0) || 5860;
    return {
      rowCount,
      totalARR,
      progressPct: 72,
      truckCapacity: 78,
      deliverySuccessPct: 94,
    };
  }, [activeRows]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in pb-12">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HEADER: Tableau de bord & Suivi logistique (Matches Reference) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-400 block">Tableau de bord</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Suivi logistique
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Truck / Fleet Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedTruck}
              onChange={(e) => setSelectedTruck(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs cursor-pointer"
            >
              <option value="Camion 12 (Julien Morel)">Sélectionner un camion : Camion 12</option>
              <option value="Camion 08 (Marc V.)">Camion 08 (Marc V.)</option>
              <option value="Camion 03 (Sophie L.)">Camion 03 (Sophie L.)</option>
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
              ▾
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Rechercher"
              className="w-44 pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
            />
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Notification Bell with Red Badge */}
          <button
            onClick={() => setActiveView('operations')}
            className="relative w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            aria-label="Notifications"
          >
            <BellIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
              3
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Progression globale (72%) & Carte d'expédition      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden">
        {/* Status Filter Tabs (En livraison, En attente, Terminée) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60">
            <button
              onClick={() => setDeliveryStatusTab('delivering')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deliveryStatusTab === 'delivering'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              En livraison
            </button>
            <button
              onClick={() => setDeliveryStatusTab('waiting')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deliveryStatusTab === 'waiting'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setDeliveryStatusTab('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deliveryStatusTab === 'completed'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Terminée
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zoho Catalyst Live ({serverLatency ?? 24}ms)</span>
          </div>
        </div>

        {/* Global Progression Number & Progress Bar */}
        <div className="mb-4">
          <span className="text-xs text-slate-500 block font-medium">Progression globale</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {computedMetrics.progressPct} %
            </span>
          </div>
          <div className="w-full max-w-md h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-700"
              style={{ width: `${computedMetrics.progressPct}%` }}
            />
          </div>
        </div>

        {/* Interactive Route Map Graphic with Checkpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          <div className="lg:col-span-2 relative min-h-[140px] bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-between overflow-hidden">
            {/* SVG Background Contour Lines & Delivery Path */}
            <svg viewBox="0 0 540 120" className="w-full h-24 my-auto select-none" fill="none">
              {/* Map grid lines */}
              <path d="M 0,20 Q 150,15 300,30 T 540,20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M 0,70 Q 120,60 280,80 T 540,65" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />

              {/* Dotted Route Curve */}
              <path
                d="M 20,95 Q 120,40 220,70 T 360,35 Q 430,25 500,45"
                stroke="#F43F5E"
                strokeWidth="2.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
              />

              {/* Checkpoint Milestone Circles */}
              {/* Point 1: Paris */}
              <circle cx="20" cy="95" r="5" fill="#F43F5E" stroke="#fff" strokeWidth="2" />
              <text x="20" y="112" fontSize="9" fill="#94A3B8" fontWeight="600" textAnchor="middle">Paris (Départ)</text>

              {/* Point 2: Auxerre */}
              <circle cx="150" cy="65" r="4.5" fill="#F43F5E" stroke="#fff" strokeWidth="2" />
              <text x="150" y="82" fontSize="8" fill="#94A3B8" textAnchor="middle">Auxerre</text>

              {/* Point 3: Dijon */}
              <circle cx="280" cy="55" r="5.5" fill="#F43F5E" stroke="#fff" strokeWidth="2" />
              <text x="280" y="42" fontSize="8" fill="#F43F5E" fontWeight="700" textAnchor="middle">Dijon</text>

              {/* Point 4: Lyon (Active Location) */}
              <circle cx="360" cy="35" r="8" fill="#F43F5E" fillOpacity="0.2" className="animate-ping" />
              <circle cx="360" cy="35" r="5.5" fill="#F43F5E" stroke="#fff" strokeWidth="2.5" />
              <text x="360" y="22" fontSize="9" fill="#F43F5E" fontWeight="800" textAnchor="middle">Lyon (En cours)</text>

              {/* Point 5: Marseille (Destination) */}
              <circle cx="500" cy="45" r="6" fill="#0F172A" stroke="#F43F5E" strokeWidth="2" />
              <text x="500" y="62" fontSize="9" fill="#94A3B8" fontWeight="600" textAnchor="middle">Marseille (Arrivée)</text>
            </svg>

            {/* Distance & Time Remaining Boxes */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center font-bold text-xs">
                  📍
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Distance parcourue</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">540 km</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center font-bold text-xs">
                  ⏱
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Temps restant</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">1h 20 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Card ("Ralentissement prévu") */}
          <div className="bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Alertes</span>
                <span className="text-[10px] text-slate-400 hover:underline cursor-pointer">Voir tout</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs mt-1">
                <div className="flex items-center gap-2 text-rose-500 text-xs font-bold mb-1">
                  <span>⏱</span>
                  <span>Ralentissement prévu</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Circulation dense dans votre zone de livraison (Secteur A6 / Lyon Sud).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('operations')}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Voir les détails
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Détail de l'expédition & Capacité du camion        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Détail de l'expédition (Julien Morel) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Détail de l&apos;expédition</h2>
              <span
                onClick={() => setActiveView('data')}
                className="text-xs text-rose-500 hover:underline cursor-pointer font-medium"
              >
                Plus d&apos;infos
              </span>
            </div>

            {/* Profile Row: Julien Morel */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 p-[2px] shadow-xs">
                  <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    JM
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Julien Morel</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID expédition : EXP-98564 • Camion 12
                  </p>
                </div>
              </div>

              {/* 5 Gold Stars Rating */}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Évaluation</span>
                <div className="flex items-center gap-0.5 text-amber-400 text-xs mt-0.5">
                  {'★'.repeat(5)}
                </div>
              </div>
            </div>

            {/* 4-Item Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Colis à livrer */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Colis à livrer</span>
                <span className="text-xl font-extrabold text-rose-500 tabular-nums mt-0.5 block">48</span>
                <span className="text-[9px] text-slate-400 block">Colis restants</span>
              </div>

              {/* Chargement en cours (68% Radial Ring) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 block font-medium mb-1">Chargement</span>
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="3.5"
                      strokeDasharray="60 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-slate-800 dark:text-slate-100">68%</span>
                </div>
              </div>

              {/* Date de livraison */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Date de livraison</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1">25 mai 2025</span>
                <span className="text-[9px] text-slate-400 block">Planifié</span>
              </div>

              {/* Statut (En cours) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Statut</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  En cours
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Centre de tri</span>
              </div>
            </div>
          </div>

          {/* Bottom Billing Row */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Total à encaisser</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">5 860 €</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Paiement</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs font-bold border border-emerald-200">
                Réglé
              </span>
            </div>
          </div>
        </div>

        {/* Card B: Capacité du camion (78%) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Capacité du camion</h2>
              <span
                onClick={() => setActiveView('pipelines')}
                className="text-xs text-rose-500 hover:underline cursor-pointer font-medium"
              >
                Plus d&apos;infos
              </span>
            </div>

            {/* Truck Graphic Representation */}
            <div className="my-3 py-2 flex items-center justify-center">
              <div className="w-full max-w-xs h-32 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center relative p-3">
                <svg viewBox="0 0 200 90" className="w-48 h-24 drop-shadow-md" fill="none">
                  {/* Truck cabin */}
                  <rect x="15" y="30" width="35" height="42" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
                  <rect x="20" y="35" width="22" height="18" rx="2" fill="#38BDF8" fillOpacity="0.4" stroke="#0284C7" strokeWidth="1" />
                  <rect x="15" y="55" width="8" height="4" rx="1" fill="#F59E0B" />
                  {/* Truck Cargo Body */}
                  <rect x="52" y="16" width="125" height="56" rx="6" fill="#F43F5E" />
                  {/* Cargo boxes inside cutout */}
                  <rect x="56" y="20" width="117" height="48" rx="4" fill="#E11D48" />
                  <rect x="62" y="44" width="22" height="20" rx="2" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                  <rect x="88" y="38" width="26" height="26" rx="2" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                  <rect x="118" y="42" width="24" height="22" rx="2" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                  {/* Chassis & Wheels */}
                  <rect x="25" y="72" width="145" height="4" fill="#334155" />
                  <circle cx="32" cy="74" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                  <circle cx="32" cy="74" r="4" fill="#CBD5E1" />
                  <circle cx="120" cy="74" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                  <circle cx="120" cy="74" r="4" fill="#CBD5E1" />
                  <circle cx="145" cy="74" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                  <circle cx="145" cy="74" r="4" fill="#CBD5E1" />
                </svg>
              </div>
            </div>

            {/* Capacity Gauge 78% */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  78 %
                </span>
                <span className="text-xs text-slate-500 font-medium">Capacité utilisée</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>
          </div>

          {/* Current vs Max Weight */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Charge actuelle</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">14,2 t</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-medium">Charge max.</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">18,0 t</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Tendances des expéditions & Performance de livraison */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Chart: Tendances des expéditions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Tendances des expéditions
            </h2>
            <select
              value={trendTimeframe}
              onChange={(e) => setTrendTimeframe(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="7 derniers jours">7 derniers jours ▾</option>
              <option value="30 derniers jours">30 derniers jours ▾</option>
            </select>
          </div>

          {/* SVG Multi-point Red Trend Curve */}
          <div className="py-2">
            <svg viewBox="0 0 460 140" className="w-full h-36" fill="none">
              <defs>
                <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="20" y1="20" x2="440" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="20" y1="55" x2="440" y2="55" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="20" y1="90" x2="440" y2="90" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="20" y1="120" x2="440" y2="120" stroke="#E2E8F0" />

              {/* Y Axis Labels */}
              <text x="12" y="24" fontSize="8" fill="#94A3B8" textAnchor="end">100</text>
              <text x="12" y="59" fontSize="8" fill="#94A3B8" textAnchor="end">75</text>
              <text x="12" y="94" fontSize="8" fill="#94A3B8" textAnchor="end">50</text>
              <text x="12" y="124" fontSize="8" fill="#94A3B8" textAnchor="end">0</text>

              {/* Area Under Curve */}
              <path
                d="M 35,95 C 75,75 110,80 150,78 C 185,75 220,50 255,50 C 290,50 325,75 360,65 C 395,55 425,30 435,25 L 435,120 L 35,120 Z"
                fill="url(#roseGradient)"
              />

              {/* Main Red Curve Line */}
              <path
                d="M 35,95 C 75,75 110,80 150,78 C 185,75 220,50 255,50 C 290,50 325,75 360,65 C 395,55 425,30 435,25"
                stroke="#F43F5E"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Multi-point circle markers */}
              {[
                { x: 35, y: 95 },
                { x: 105, y: 78 },
                { x: 175, y: 78 },
                { x: 245, y: 50 },
                { x: 315, y: 72 },
                { x: 385, y: 58 },
                { x: 435, y: 25 },
              ].map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#F43F5E" stroke="#fff" strokeWidth="2" />
              ))}
            </svg>

            {/* X-Axis Dates */}
            <div className="flex justify-between px-6 pt-1 text-[10px] text-slate-400 font-medium">
              <span>19 mai</span>
              <span>20 mai</span>
              <span>21 mai</span>
              <span>22 mai</span>
              <span>23 mai</span>
              <span>24 mai</span>
              <span>25 mai</span>
            </div>
          </div>
        </div>

        {/* Solid Coral Performance Card: 94% (Matches Reference Exactly) */}
        <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 shadow-xl shadow-rose-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-wider uppercase opacity-90">
                Performance de livraison
              </span>
              <select
                value={perfTimeframe}
                onChange={(e) => setPerfTimeframe(e.target.value)}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white focus:outline-none cursor-pointer border-none"
              >
                <option value="Mois en cours" className="text-slate-900">Mois en cours ▾</option>
                <option value="Année en cours" className="text-slate-900">Année en cours ▾</option>
              </select>
            </div>

            <div className="mt-2">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums block">
                94 %
              </span>
              <span className="text-sm font-semibold opacity-90 mt-1 block">
                Livraisons à temps
              </span>
            </div>

            {/* White Sparkline / Wave */}
            <div className="my-5">
              <svg viewBox="0 0 300 45" className="w-full h-11" fill="none">
                <path
                  d="M 10,38 Q 45,15 80,28 T 150,15 T 220,30 T 290,10"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {[10, 80, 150, 220, 290].map((cx, i) => (
                  <circle key={i} cx={cx} cy={i % 2 === 0 ? 30 - i * 3 : 18} r="3.5" fill="#FFFFFF" />
                ))}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-white/20 flex items-center justify-between">
            <span className="text-xs font-medium opacity-90">Objectif : 90 %</span>
            <button
              onClick={() => setActiveView('analysis')}
              className="px-4 py-2 rounded-full bg-white text-rose-600 text-xs font-bold hover:bg-rose-50 transition-colors shadow-xs"
            >
              Voir le rapport
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Répartition des envois, Carburant, Messages        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Col 1: Répartition des envois (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-shadow">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Répartition des envois
          </h2>

          <div className="my-3 flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="11" />
                {/* Livrés: 60% */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#F43F5E" strokeWidth="11"
                  strokeDasharray="143 239" strokeDashoffset="0"
                  strokeLinecap="round"
                />
                {/* En cours: 25% */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#FB923C" strokeWidth="11"
                  strokeDasharray="60 239" strokeDashoffset="-145"
                  strokeLinecap="round"
                />
                {/* En attente: 10% */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#FBBF24" strokeWidth="11"
                  strokeDasharray="24 239" strokeDashoffset="-207"
                  strokeLinecap="round"
                />
                {/* Annulés: 5% */}
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="#475569" strokeWidth="11"
                  strokeDasharray="12 239" strokeDashoffset="-233"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600 dark:text-slate-400">Livrés</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">60 %</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <span className="text-slate-600 dark:text-slate-400">En cours</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">25 %</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-600 dark:text-slate-400">En attente</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">10 %</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="text-slate-600 dark:text-slate-400">Annulés</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">5 %</span>
            </div>
          </div>
        </div>

        {/* Col 2: Consommation de carburant (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Consommation de carburant
            </h2>
            <span className="text-[10px] text-slate-400">7 derniers jours ▾</span>
          </div>

          <div className="mt-1 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">128 L</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">-8%</span>
            </div>
            <span className="text-[10px] text-slate-400 block">vs période précédente</span>
          </div>

          {/* Vertical Red Bar Chart */}
          <div className="h-28 flex items-end justify-between gap-2 pt-2 border-b border-slate-100 dark:border-slate-800">
            {[
              { day: '19/05', h: 55 },
              { day: '20/05', h: 80 },
              { day: '21/05', h: 48 },
              { day: '22/05', h: 68 },
              { day: '23/05', h: 62 },
              { day: '24/05', h: 74 },
              { day: '25/05', h: 52 },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                <div
                  className="w-full max-w-[18px] bg-rose-400 hover:bg-rose-500 rounded-t-sm transition-all duration-300"
                  style={{ height: `${bar.h}%` }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2 text-[9px] text-slate-400 font-mono">
            <span>19/05</span>
            <span>21/05</span>
            <span>23/05</span>
            <span>25/05</span>
          </div>
        </div>

        {/* Col 3: Messages de l'équipe (Activity Feed) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Messages</h2>
            <span
              onClick={() => setActiveView('operations')}
              className="text-[10px] text-slate-400 hover:underline cursor-pointer"
            >
              Voir tout
            </span>
          </div>

          <div className="space-y-3">
            {/* Message 1 */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                EL
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Équipe logistique
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">10:30</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Réunion quotidienne à 11h.
                </p>
              </div>
            </div>

            {/* Message 2 */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                SM
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Sophie Martin
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">09:15</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Veuillez confirmer la livraison du colis #4582.
                </p>
              </div>
            </div>

            {/* Message 3 */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                TB
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Thomas Bernard
                  </span>
                  <span className="text-[10px] text-slate-400">Hier</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Nouveau planning disponible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: Full-Width Bottom CTA Banner                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-500 via-rose-500 to-orange-500 p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-rose-950/15">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8h-3V5a1 1 0 00-1-1H3a1 1 0 00-1 1v12a1 1 0 001 1h1a3 3 0 006 0h4a3 3 0 006 0h1a1 1 0 001-1v-6a3 3 0 00-3-3zm-12 11a1.5 1.5 0 111.5-1.5A1.5 1.5 0 017 19zm10 0a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5zM19 11a1 1 0 011 1v1h-4v-3h2a1 1 0 011 1z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-extrabold">
              Gardez le contrôle de vos livraisons
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              Suivez, analysez et optimisez chaque expédition en temps réel.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('pipelines')}
          className="shrink-0 px-6 py-3 rounded-full bg-white text-rose-600 text-xs font-bold shadow-md hover:bg-rose-50 transition-all apple-pressable cursor-pointer"
        >
          Optimiser mes livraisons →
        </button>
      </div>
    </div>
  );
}

// ─── Root Page: View Router ───
export default function RootPage() {
  const { activeView } = useApp();

  if (activeView === 'projects') return <ProjectsPage />;
  if (activeView === 'data') return <DataWorkspacePage />;
  if (activeView === 'pipelines') return <PipelinesPage />;
  if (activeView === 'analysis') return <AnalysisStudioPage />;
  if (activeView === 'models') return <ModelsPage />;
  if (activeView === 'dashboards') return <DashboardsPage />;
  if (activeView === 'stories') return <StoriesPage />;
  if (activeView === 'operations') return <OperationsPage />;
  if (activeView === 'settings') return <SettingsPage />;

  return <HomeView />;
}
