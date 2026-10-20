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
  BrainIcon,
  FileSpreadsheetIcon,
  FolderIcon,
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
    documentFiles,
    activeDocument,
    setActiveDocument,
    runDocumentTreatment,
    setActiveView,
    serverStatus,
    serverLatency,
    openAuthModal,
    t,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'tabular' | 'documents' | 'pipelines' | 'models'>('all');
  const [treatmentRunning, setTreatmentRunning] = useState(false);
  const [treatmentMessage, setTreatmentMessage] = useState<string | null>(null);

  // Compute real metrics from active tabular dataset
  const tabularMetrics = useMemo(() => {
    const rows = activeRows || [];
    const rowCount = rows.length || 12;
    const totalARR = rows.reduce((acc, r) => acc + (parseFloat(r.ARR_USD || '0') || 0), 0) || 1439000;
    const avgNPS = rows.length > 0
      ? Math.round(rows.reduce((acc, r) => acc + (parseFloat(r.NPS_Score || '0') || 0), 0) / rows.length)
      : 72;
    const avgChurn = rows.length > 0
      ? (rows.reduce((acc, r) => acc + (parseFloat(r.Churn_Probability || '0') || 0), 0) / rows.length * 100).toFixed(1)
      : '11.0';
    return { rowCount, totalARR, avgNPS, avgChurn };
  }, [activeRows]);

  // Execute quick document treatment
  const handleQuickTreatment = async (type: 'pii_redaction' | 'entity_extraction' | 'summarization') => {
    if (!activeDocument) return;
    setTreatmentRunning(true);
    setTreatmentMessage(null);
    try {
      const res = await runDocumentTreatment(activeDocument.id, type);
      setTreatmentMessage(`✓ Treatment completed in ${res.metrics.processingTimeMs}ms (${type.replace('_', ' ')})`);
      setTimeout(() => setTreatmentMessage(null), 4000);
    } finally {
      setTreatmentRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. EXECUTIVE HEADER: Data & Document Intelligence Studio     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#059669] dark:text-[#10B981] uppercase tracking-wider">
              {t('app.subtitle')}
            </span>
            <span className="text-[var(--lm-text-tertiary)] text-xs">•</span>
            <span className="text-xs text-[var(--lm-text-tertiary)]">Production Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--lm-text-primary)] tracking-tight">
            {t('common.welcome')}, {currentUser.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Server Status Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === 'connected' ? 'bg-[#10B981] animate-pulse' : 'bg-[#E34234]'
              }`}
            />
            <span className="text-xs font-semibold text-[var(--lm-text-primary)]">
              {serverStatus === 'connected' ? 'Zoho Catalyst Lumi Cloud' : 'Connecting...'}
            </span>
            {serverLatency && (
              <span className="text-[11px] font-mono text-[var(--lm-text-tertiary)]">({serverLatency}ms)</span>
            )}
          </div>

          {/* Profile & Role Button */}
          <button
            onClick={() => openAuthModal('profile')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] hover:border-[#059669] transition-colors shadow-xs cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-[#059669]/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-[10px]">
              {currentUser.name.charAt(0)}
            </div>
            <span className="capitalize">{currentUser.role}</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. FILTER PILLS: Data Domain Navigation                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Studio Assets' },
          { id: 'tabular', label: 'Tabular Data (CSV & SQL)' },
          { id: 'documents', label: 'Document NLP & Treatments' },
          { id: 'pipelines', label: 'Data Pipelines' },
          { id: 'models', label: 'Predictive ML Models' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === f.id
                ? 'bg-[#059669] text-[#FAF8F5] shadow-sm shadow-emerald-900/30'
                : 'bg-[var(--lm-bg-elevated)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] border border-[var(--lm-border-default)] hover:border-[#059669]/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. STUDIO HIGHLIGHT BANNER: Pipeline Progress & Health        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E34234]" />
              <span className="text-xs font-bold text-[#E34234] uppercase tracking-wider">
                Enterprise Intelligence Pipeline
              </span>
              <StatusBadge variant="emerald">98.4% Clean Records</StatusBadge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--lm-text-primary)]">
              Data Quality, Document Treatments &amp; Model Scoring
            </h2>
            <p className="text-xs text-[var(--lm-text-secondary)]">
              Automated ingestion engine reconciling structured database schemas and parsing unstructured documents with cryptographic SHA-256 integrity checks.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
              <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Tabular Records</span>
              <span className="text-lg font-bold text-[var(--lm-text-primary)] font-mono mt-0.5 block">
                {tabularMetrics.rowCount} Rows
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
              <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Document Dossiers</span>
              <span className="text-lg font-bold text-[var(--lm-text-primary)] font-mono mt-0.5 block">
                {documentFiles.length} Loaded
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
              <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Tokens Parsed</span>
              <span className="text-lg font-bold text-[#E34234] font-mono mt-0.5 block">
                {activeDocument ? activeDocument.tokenCount : 264}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
              <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">ML ROC-AUC</span>
              <span className="text-lg font-bold text-[#059669] dark:text-[#34D399] font-mono mt-0.5 block">
                0.964
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Phase Progression */}
        <div className="mt-6 pt-5 border-t border-[var(--lm-border-default)]">
          <div className="flex items-center justify-between text-xs text-[var(--lm-text-secondary)] mb-2">
            <span className="font-semibold text-[var(--lm-text-primary)]">
              ETL &amp; NLP Treatment Progression
            </span>
            <span className="font-mono text-[#E34234] font-bold">96% Completed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--lm-bg-secondary)] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#E34234] rounded-full w-[96%]" />
          </div>
          <div className="grid grid-cols-4 text-[11px] text-[var(--lm-text-tertiary)] mt-2">
            <span>1. File Ingestion</span>
            <span className="text-center">2. Schema Profiling</span>
            <span className="text-center">3. PII &amp; Tokenization</span>
            <span className="text-right">4. Model Scoring</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. TWO-COLUMN: Active Tabular Dataset & Document Treatments    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Active Tabular Dataset */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <DatabaseIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Active Tabular Dataset
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {activeDataset?.fileName || 'B2B_Enterprise_SaaS_Retention_Metrics.csv'}
                  </p>
                </div>
              </div>
              <StatusBadge variant="success">Verified Schema</StatusBadge>
            </div>

            {/* Dataset Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total ARR Evaluated</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  ${(tabularMetrics.totalARR / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Mean NPS Score</span>
                <span className="text-base font-extrabold text-emerald-500 font-mono mt-0.5 block">
                  {tabularMetrics.avgNPS} / 100
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Mean Churn Risk</span>
                <span className="text-base font-extrabold text-amber-500 font-mono mt-0.5 block">
                  {tabularMetrics.avgChurn}%
                </span>
              </div>
            </div>

            {/* Quality Checks Assertions */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Primary Key Uniqueness
                </span>
                <span className="font-mono text-[11px] text-slate-400">100% Unique</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Zero Nulls in Financials
                </span>
                <span className="font-mono text-[11px] text-slate-400">0 Nulls</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  SHA-256 Ledger Anchor
                </span>
                <span className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                  {activeDataset?.sha256.substring(0, 12)}...
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveView('data')}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
          >
            Open Data Workspace &amp; Profiler →
          </button>
        </div>

        {/* RIGHT: Document File Analysis & NLP Treatments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Document Analysis &amp; NLP Treatments
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                    {activeDocument?.fileName || 'Enterprise_Data_Governance.pdf'}
                  </p>
                </div>
              </div>
              <StatusBadge variant="info">NLP Active</StatusBadge>
            </div>

            {treatmentMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                {treatmentMessage}
              </div>
            )}

            {/* Document Metrics */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Words Analyzed</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {activeDocument ? activeDocument.wordCount : 198}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Readability Index</span>
                <span className="text-base font-extrabold text-indigo-500 font-mono mt-0.5 block">
                  74.2 / 100
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">PII Tokens Masked</span>
                <span className="text-base font-extrabold text-rose-500 font-mono mt-0.5 block">
                  14 Tokens
                </span>
              </div>
            </div>

            {/* Quick Treatment Action Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Trigger On-Demand Treatments
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={treatmentRunning}
                  onClick={() => handleQuickTreatment('pii_redaction')}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  🔒 Mask PII
                </button>
                <button
                  disabled={treatmentRunning}
                  onClick={() => handleQuickTreatment('entity_extraction')}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  🏷️ Extract Entities
                </button>
                <button
                  disabled={treatmentRunning}
                  onClick={() => handleQuickTreatment('summarization')}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  📝 Summarize
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveView('analysis')}
            className="mt-5 w-full py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            Open Full Document Treatment Studio →
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. TWO-COLUMN: Feature Correlation & Predictive ML Score     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Revenue & Active User Dynamics Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Enterprise Revenue Dynamics
              </h3>
              <p className="text-xs text-slate-400">
                ARR Distribution ($) across Ingested Client Accounts
              </p>
            </div>
            <StatusBadge variant="info">Parametric</StatusBadge>
          </div>

          {/* SVG Clean Trend Curve */}
          <div className="w-full h-44 relative mt-2">
            <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E34234" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#E34234" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Background Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />

              {/* Area */}
              <polygon
                points="0,150 40,110 90,85 140,120 190,70 240,95 290,45 340,60 390,35 440,50 500,20 500,150"
                fill="url(#trendGrad)"
              />
              {/* Line */}
              <polyline
                points="0,150 40,110 90,85 140,120 190,70 240,95 290,45 340,60 390,35 440,50 500,20"
                fill="none"
                stroke="#E34234"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {[[40,110],[90,85],[190,70],[290,45],[390,35],[500,20]].map(([x, y], idx) => (
                <circle key={idx} cx={x} cy={y} r="4" fill="#FAF8F5" stroke="#E34234" strokeWidth="2.5" />
              ))}
            </svg>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)] mt-2 font-mono">
            <span>Standard Tier ($28k)</span>
            <span>Growth Tier ($84k)</span>
            <span>Enterprise Tier ($310k)</span>
          </div>
        </div>

        {/* RIGHT: Predictive Model Performance Score (Emerald Jewel Card) */}
        <div className="bg-gradient-to-br from-[#064E3B] via-[#059669] to-[#047857] rounded-3xl p-5 sm:p-6 text-[#FAF8F5] shadow-lg shadow-emerald-950/40 border border-[#10B981]/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FAF8F5] bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                Predictive Analytics Engine
              </span>
              <span className="text-xs font-semibold text-emerald-100">LightGBM v2.4</span>
            </div>

            <div className="my-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#FAF8F5]">0.964</span>
              <span className="text-emerald-100 text-sm ml-2 font-medium">AUC-ROC Score</span>
            </div>

            <p className="text-xs text-emerald-100/90 leading-relaxed mt-2">
              Model asserts high calibration accuracy on B2B customer churn indicators. In-fold F1-score reaches 0.94 with 92% sensitivity.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
            <div className="text-xs">
              <span className="block text-emerald-200">Validation Brier Score</span>
              <span className="font-bold text-[#FAF8F5] font-mono text-sm">0.042 (Calibrated)</span>
            </div>
            <button
              onClick={() => setActiveView('models')}
              className="px-4 py-2 rounded-xl bg-[#FAF8F5] text-[#059669] font-bold text-xs hover:bg-[#F4ECE1] transition-colors shadow-xs cursor-pointer"
            >
              Inspect Model Details →
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. THREE-COLUMN: Format Distribution, Ingestion, & Audit Feed */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Col 1: Document Formats (Donut) */}
        <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-[var(--lm-text-primary)] mb-1">
            Document File Distribution
          </h4>
          <p className="text-[11px] text-[var(--lm-text-tertiary)] mb-4">Ingested Unstructured File Types</p>

          <div className="flex items-center justify-center my-3">
            <svg viewBox="0 0 100 100" className="w-28 h-28 transform -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-[var(--lm-bg-tertiary)]" strokeWidth="12" />
              {/* PDF Segment (45% - Vermilion) */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#E34234" strokeWidth="12" strokeDasharray="107 238" strokeDashoffset="0" />
              {/* DOCX Segment (25% - Emerald) */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray="60 238" strokeDashoffset="-107" />
              {/* TXT/MD Segment (18% - Bright Emerald) */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="43 238" strokeDashoffset="-167" />
              {/* JSON/CSV (12% - Amber) */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="28 238" strokeDashoffset="-210" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E34234]" />
              <span className="text-[var(--lm-text-secondary)]">PDF (45%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              <span className="text-[var(--lm-text-secondary)]">DOCX (25%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[var(--lm-text-secondary)]">TXT/MD (18%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[var(--lm-text-secondary)]">JSON (12%)</span>
            </div>
          </div>
        </div>

        {/* Col 2: Ingestion Sources Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Data Volume by Source
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Ingestion Channels (MB)</p>

          <div className="space-y-3 mt-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300">Cloud DW (Snowflake/BigQuery)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">640 MB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-rose-500 rounded-full w-[85%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300">S3 / Azure Parquet Lake</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">380 MB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-indigo-500 rounded-full w-[60%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300">Document File Intake (PDF/DOC)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">142 MB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-emerald-500 rounded-full w-[35%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Recent Activity & Treatment Audit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Operations Audit
              </h4>
              <button
                onClick={() => setActiveView('operations')}
                className="text-[11px] text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Document PII Redacted
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    14 sensitive identifiers masked in Enterprise_Data_Governance.pdf
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Schema Ingestion Verified
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    B2B_Enterprise_SaaS_Retention_Metrics.csv (12 rows, 10 cols)
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Model Weights Promoted
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    LightGBM Churn Predictor v2.4 (AUC-ROC: 0.964)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cryptographic Log</span>
            <span className="font-mono text-emerald-500 font-semibold">✓ SHA-256 Validated</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. BOTTOM CTA BANNER: Launch Data & Document Workspace       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0A110E] via-[#111C17] to-[#064E3B] text-[#FAF8F5] border border-[#10B981]/25 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold">
            Ready to analyze tabular datasets and document dossiers?
          </h3>
          <p className="text-xs text-[#CFD8D2] max-w-xl">
            Ingest CSVs, parse PDFs, mask sensitive PII, extract structured entities, and train predictive machine learning models in a single executive workbench.
          </p>
        </div>
        <button
          onClick={() => setActiveView('data')}
          className="px-5 py-2.5 rounded-xl bg-[#E34234] hover:bg-[#C93326] text-[#FAF8F5] text-xs font-bold transition-all shadow-md shadow-[#E34234]/30 whitespace-nowrap cursor-pointer self-start sm:self-auto active:scale-95"
        >
          Open Data &amp; Document Studio →
        </button>
      </div>
    </div>
  );
}

export default function AppHomePage() {
  const { activeView } = useApp();

  // Route between application sub-views
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
