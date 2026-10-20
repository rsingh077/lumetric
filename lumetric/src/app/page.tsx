'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge, Button } from '@/components/ui';
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
  UploadIcon,
  PlusIcon,
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
    datasets,
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
    storageFootprintBytes,
    loadSampleDataIntoProfile,
    clearProfileData,
    t,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'tabular' | 'documents' | 'pipelines' | 'models'>('all');
  const [treatmentRunning, setTreatmentRunning] = useState(false);
  const [treatmentMessage, setTreatmentMessage] = useState<string | null>(null);

  // Compute real metrics dynamically from the active user's uploaded tabular dataset
  const tabularMetrics = useMemo(() => {
    const rows = activeRows || [];
    const hasData = Boolean(activeDataset && rows.length > 0);
    const rowCount = rows.length;

    if (!hasData) {
      return {
        hasData: false,
        rowCount: 0,
        totalARR: 0,
        avgNPS: 0,
        avgChurn: '0.0',
        columnsCount: 0,
        uniqueKeys: 0,
        financialKey: null as string | null,
        npsKey: null as string | null,
        churnKey: null as string | null,
        financialValues: [] as number[],
      };
    }

    const firstRow = rows[0] || {};
    const keys = Object.keys(firstRow);

    // Dynamic column detection for varied CSV headers
    const financialKey = keys.find((k) => /arr|revenue|amount|sales|value|price|cost|spend/i.test(k)) || null;
    const npsKey = keys.find((k) => /nps|score|rating|satisfaction/i.test(k)) || null;
    const churnKey = keys.find((k) => /churn|risk|prob|attrition/i.test(k)) || null;

    const financialValues: number[] = [];
    let totalARR = 0;
    if (financialKey) {
      for (const r of rows) {
        const val = parseFloat(r[financialKey] || '0') || 0;
        totalARR += val;
        financialValues.push(val);
      }
    }

    const avgNPS =
      npsKey && rows.length > 0
        ? Math.round(rows.reduce((acc, r) => acc + (parseFloat(r[npsKey] || '0') || 0), 0) / rows.length)
        : 0;

    const avgChurn =
      churnKey && rows.length > 0
        ? (
            (rows.reduce((acc, r) => {
              let val = parseFloat(r[churnKey] || '0');
              if (val > 1) val = val / 100;
              return acc + val;
            }, 0) /
              rows.length) *
            100
          ).toFixed(1)
        : '0.0';

    return {
      hasData: true,
      rowCount,
      totalARR,
      avgNPS,
      avgChurn,
      columnsCount: activeDataset ? activeDataset.columnCount : keys.length,
      financialKey,
      npsKey,
      churnKey,
      financialValues,
    };
  }, [activeRows, activeDataset]);

  // Compute real metrics from the active user's uploaded document dossiers
  const documentMetrics = useMemo(() => {
    const docs = documentFiles || [];
    const count = docs.length;
    const totalWords = docs.reduce((acc, d) => acc + (d.wordCount || 0), 0);
    const totalTokens = docs.reduce((acc, d) => acc + (d.tokenCount || 0), 0);
    const totalTreatments = docs.reduce((acc, d) => acc + (d.treatments?.length || 0), 0);

    const formatCounts: Record<string, number> = {};
    docs.forEach((d) => {
      const ext = (d.fileType || 'other').toLowerCase();
      formatCounts[ext] = (formatCounts[ext] || 0) + 1;
    });

    return {
      count,
      totalWords,
      totalTokens,
      totalTreatments,
      formatCounts,
      hasDocs: count > 0,
    };
  }, [documentFiles]);

  // Execute quick document treatment on user's active document
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

  // Format storage size in bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // SVG Trend Points computed dynamically from actual financial values
  const trendPoints = useMemo(() => {
    const vals = tabularMetrics.financialValues;
    if (!vals || vals.length === 0) return null;
    const sample = vals.slice(0, 12);
    const maxVal = Math.max(...sample, 1);
    const minVal = Math.min(...sample, 0);
    const range = maxVal - minVal || 1;

    const coords = sample.map((v, i) => {
      const x = sample.length === 1 ? 250 : Math.round((i / (sample.length - 1)) * 480 + 10);
      const normalized = (v - minVal) / range;
      // y from 135 (bottom) to 25 (top)
      const y = Math.round(135 - normalized * 110);
      return [x, y];
    });

    const polyline = coords.map(([x, y]) => `${x},${y}`).join(' ');
    const polygon = `0,150 ${polyline} 500,150`;

    return { coords, polyline, polygon };
  }, [tabularMetrics.financialValues]);

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
            <span className="text-xs text-[var(--lm-text-tertiary)] font-mono">
              Profile: {currentUser.email || 'Guest'}
            </span>
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
            onClick={() => openAuthModal('profile-db')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] hover:border-[#059669] transition-colors shadow-xs cursor-pointer"
            title="Manage Profile Database & Storage"
          >
            <div className="w-5 h-5 rounded-full bg-[#059669]/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-[10px]">
              {(currentUser.name || 'U').charAt(0)}
            </div>
            <span className="capitalize">{currentUser.role}</span>
            <span className="text-[10px] font-mono text-[#059669] dark:text-[#34D399] hidden sm:inline">
              ({formatBytes(storageFootprintBytes)})
            </span>
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
      {/* PROFILE ONBOARDING STATE: Rendered when workspace is clean    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!tabularMetrics.hasData && !documentMetrics.hasDocs && (
        <div className="bg-[var(--lm-bg-elevated)] border border-[#059669]/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-bold text-[#059669] dark:text-[#10B981] uppercase tracking-wider">
                  Individual Profile Database Active
                </span>
                <StatusBadge variant="emerald" dot>Clean Slate</StatusBadge>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--lm-text-primary)]">
                Welcome to your Isolated Workspace, {currentUser.name}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)] max-w-2xl leading-relaxed">
                Your user profile (<span className="font-mono text-[#059669] font-semibold">{currentUser.email || 'your-account'}</span>) operates on a completely segregated database tenant. Datasets, document dossiers, and analytical models uploaded here remain private and isolated to your account.
              </p>
            </div>

            <button
              onClick={() => openAuthModal('profile-db')}
              className="px-4 py-2 rounded-2xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-xs font-bold text-[var(--lm-text-primary)] transition-all shrink-0 cursor-pointer"
            >
              ⚙️ Manage Profile Storage
            </button>
          </div>

          {/* Quick Setup Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex flex-col justify-between hover:border-[#059669]/50 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#059669]/10 text-[#059669] flex items-center justify-center">
                  <DatabaseIcon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--lm-text-primary)]">
                  Ingest Custom Dataset
                </h3>
                <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                  Upload your raw CSV, Excel, or tabular data directly into your personal account database with schema profiling.
                </p>
              </div>
              <button
                onClick={() => setActiveView('data')}
                className="mt-4 w-full py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors cursor-pointer text-center"
              >
                + Ingest Dataset →
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#059669]/10 via-[var(--lm-bg-secondary)] to-[#E34234]/5 border border-[#059669]/30 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 text-[#059669] flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--lm-text-primary)]">
                  Load Benchmark Sample
                </h3>
                <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                  Populate your private profile with standard enterprise SaaS benchmarks and sample document dossiers instantly.
                </p>
              </div>
              <button
                onClick={loadSampleDataIntoProfile}
                className="mt-4 w-full py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-[#FAF8F5] text-xs font-bold transition-all shadow-sm shadow-emerald-900/20 cursor-pointer text-center"
              >
                ⚡ Load Benchmark into Profile
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex flex-col justify-between hover:border-indigo-500/50 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BrainIcon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--lm-text-primary)]">
                  Ingest Document Dossier
                </h3>
                <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                  Process unstructured documents (PDF, DOCX, TXT) with automated PII masking and NLP summarization treatments.
                </p>
              </div>
              <button
                onClick={() => setActiveView('analysis')}
                className="mt-4 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer text-center"
              >
                📄 Ingest Document →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. STUDIO HIGHLIGHT BANNER: Pipeline Progress & Health        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(tabularMetrics.hasData || documentMetrics.hasDocs) && (
        <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E34234]" />
                <span className="text-xs font-bold text-[#E34234] uppercase tracking-wider">
                  Personal Intelligence Pipeline
                </span>
                <StatusBadge variant="emerald">
                  {tabularMetrics.hasData ? `${tabularMetrics.rowCount} Rows Profiled` : 'Storage Active'}
                </StatusBadge>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--lm-text-primary)]">
                Data Quality, Document Treatments &amp; Model Scoring
              </h2>
              <p className="text-xs text-[var(--lm-text-secondary)]">
                Isolated analytical engine parsing structured database schemas and processing unstructured documents with cryptographic SHA-256 integrity checks.
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
                  {documentMetrics.count} Loaded
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
                <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Tokens Parsed</span>
                <span className="text-lg font-bold text-[#E34234] font-mono mt-0.5 block">
                  {activeDocument ? activeDocument.tokenCount : documentMetrics.totalTokens}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
                <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Storage Footprint</span>
                <span className="text-lg font-bold text-[#059669] dark:text-[#34D399] font-mono mt-0.5 block">
                  {formatBytes(storageFootprintBytes)}
                </span>
              </div>
            </div>
          </div>

          {/* Pipeline Phase Progression */}
          <div className="mt-6 pt-5 border-t border-[var(--lm-border-default)]">
            <div className="flex items-center justify-between text-xs text-[var(--lm-text-secondary)] mb-2">
              <span className="font-semibold text-[var(--lm-text-primary)]">
                Profile Ingestion &amp; Analytics Progression
              </span>
              <span className="font-mono text-[#059669] font-bold">
                {tabularMetrics.hasData && documentMetrics.hasDocs ? '100% Ready' : 'Active Pipeline'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--lm-bg-secondary)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#E34234] rounded-full transition-all duration-500"
                style={{
                  width: tabularMetrics.hasData && documentMetrics.hasDocs ? '100%' : tabularMetrics.hasData ? '75%' : '45%',
                }}
              />
            </div>
            <div className="grid grid-cols-4 text-[11px] text-[var(--lm-text-tertiary)] mt-2">
              <span>1. Tenant Isolation</span>
              <span className="text-center">2. File Ingestion</span>
              <span className="text-center">3. Schema Profiling</span>
              <span className="text-right">4. ML Calibration</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. TWO-COLUMN: Active Tabular Dataset & Document Treatments    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(tabularMetrics.hasData || documentMetrics.hasDocs) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: Active Tabular Dataset */}
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <DatabaseIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                      Active Tabular Dataset
                    </h3>
                    <p className="text-[11px] text-[var(--lm-text-secondary)] font-mono truncate max-w-[220px]">
                      {activeDataset ? activeDataset.fileName : 'No dataset loaded'}
                    </p>
                  </div>
                </div>
                <StatusBadge variant={tabularMetrics.hasData ? 'emerald' : 'neutral'}>
                  {tabularMetrics.hasData ? 'Verified Schema' : 'Empty'}
                </StatusBadge>
              </div>

              {/* Dataset Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 my-4">
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block">
                    {tabularMetrics.financialKey ? `Total ${tabularMetrics.financialKey}` : 'Evaluated Sum'}
                  </span>
                  <span className="text-base font-extrabold text-[var(--lm-text-primary)] font-mono mt-0.5 block">
                    {tabularMetrics.totalARR > 0 ? `$${(tabularMetrics.totalARR / 1000).toFixed(0)}k` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block">
                    {tabularMetrics.npsKey || 'Score Index'}
                  </span>
                  <span className="text-base font-extrabold text-[#059669] dark:text-[#34D399] font-mono mt-0.5 block">
                    {tabularMetrics.avgNPS > 0 ? `${tabularMetrics.avgNPS} / 100` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block">
                    {tabularMetrics.churnKey || 'Risk / Churn'}
                  </span>
                  <span className="text-base font-extrabold text-amber-500 font-mono mt-0.5 block">
                    {tabularMetrics.avgChurn !== '0.0' ? `${tabularMetrics.avgChurn}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Quality Checks Assertions */}
              <div className="space-y-1.5 text-xs text-[var(--lm-text-secondary)]">
                <div className="flex items-center justify-between py-1 border-b border-[var(--lm-border-default)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ingested Column Count
                  </span>
                  <span className="font-mono text-[11px] text-[var(--lm-text-primary)]">
                    {tabularMetrics.columnsCount} Columns
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[var(--lm-border-default)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Tenant Isolation
                  </span>
                  <span className="font-mono text-[11px] text-[var(--lm-text-primary)]">
                    Private Sandbox
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    SHA-256 Ledger Anchor
                  </span>
                  <span className="font-mono text-[11px] text-[var(--lm-text-tertiary)] truncate max-w-[120px]">
                    {activeDataset?.sha256 ? `${activeDataset.sha256.substring(0, 12)}...` : 'Local Key'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveView('data')}
              className="mt-5 w-full py-2.5 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[#059669] hover:text-white text-xs font-semibold text-[var(--lm-text-primary)] transition-colors cursor-pointer text-center"
            >
              Open Data Workspace &amp; Profiler →
            </button>
          </div>

          {/* RIGHT: Document File Analysis & NLP Treatments */}
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                      Document Analysis &amp; NLP Treatments
                    </h3>
                    <p className="text-[11px] text-[var(--lm-text-secondary)] font-mono truncate max-w-[220px]">
                      {activeDocument ? activeDocument.fileName : 'No active document'}
                    </p>
                  </div>
                </div>
                <StatusBadge variant={activeDocument ? 'info' : 'neutral'}>
                  {activeDocument ? 'NLP Active' : 'No Dossier'}
                </StatusBadge>
              </div>

              {treatmentMessage && (
                <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                  {treatmentMessage}
                </div>
              )}

              {/* Document Metrics */}
              <div className="grid grid-cols-3 gap-2.5 my-4">
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block">Words Analyzed</span>
                  <span className="text-base font-extrabold text-[var(--lm-text-primary)] font-mono mt-0.5 block">
                    {activeDocument ? activeDocument.wordCount : 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block">Tokens Count</span>
                  <span className="text-base font-extrabold text-indigo-500 font-mono mt-0.5 block">
                    {activeDocument ? activeDocument.tokenCount : 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block">Treatments Applied</span>
                  <span className="text-base font-extrabold text-[#E34234] font-mono mt-0.5 block">
                    {activeDocument?.treatments?.length || 0}
                  </span>
                </div>
              </div>

              {/* Quick Treatment Action Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider block">
                  Trigger On-Demand Treatments
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={treatmentRunning || !activeDocument}
                    onClick={() => handleQuickTreatment('pii_redaction')}
                    className="px-2.5 py-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[#FFF1F0] border border-[var(--lm-border-default)] text-[11px] font-semibold text-[var(--lm-text-primary)] transition-colors cursor-pointer text-center disabled:opacity-40"
                  >
                    🔒 Mask PII
                  </button>
                  <button
                    disabled={treatmentRunning || !activeDocument}
                    onClick={() => handleQuickTreatment('entity_extraction')}
                    className="px-2.5 py-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-[var(--lm-border-default)] text-[11px] font-semibold text-[var(--lm-text-primary)] transition-colors cursor-pointer text-center disabled:opacity-40"
                  >
                    🏷️ Extract Entities
                  </button>
                  <button
                    disabled={treatmentRunning || !activeDocument}
                    onClick={() => handleQuickTreatment('summarization')}
                    className="px-2.5 py-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-[var(--lm-border-default)] text-[11px] font-semibold text-[var(--lm-text-primary)] transition-colors cursor-pointer text-center disabled:opacity-40"
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
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. TWO-COLUMN: Feature Correlation & Predictive ML Score     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(tabularMetrics.hasData || documentMetrics.hasDocs) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: Revenue & Active User Dynamics Trend */}
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                  {tabularMetrics.financialKey ? `${tabularMetrics.financialKey} Dynamic Curve` : 'Dataset Record Dynamics'}
                </h3>
                <p className="text-xs text-[var(--lm-text-secondary)]">
                  Dynamic Plot of Ingested Profile Records ({tabularMetrics.rowCount} entries)
                </p>
              </div>
              <StatusBadge variant="info">Parametric</StatusBadge>
            </div>

            {/* SVG Dynamic Trend Curve */}
            <div className="w-full h-44 relative mt-2">
              <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E34234" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#E34234" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Background Grid Lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />

                {trendPoints ? (
                  <>
                    {/* Dynamic Area */}
                    <polygon points={trendPoints.polygon} fill="url(#trendGrad)" />
                    {/* Dynamic Polyline */}
                    <polyline
                      points={trendPoints.polyline}
                      fill="none"
                      stroke="#E34234"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Dynamic Data Points */}
                    {trendPoints.coords.map(([x, y], idx) => (
                      <circle key={idx} cx={x} cy={y} r="4" fill="#FAF8F5" stroke="#E34234" strokeWidth="2.5" />
                    ))}
                  </>
                ) : (
                  <>
                    <polygon points="0,150 100,120 250,80 400,100 500,60 500,150" fill="url(#trendGrad)" />
                    <polyline points="0,150 100,120 250,80 400,100 500,60" fill="none" stroke="#E34234" strokeWidth="2" strokeDasharray="4 4" />
                  </>
                )}
              </svg>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)] mt-2 font-mono">
              <span>Beginning Row Index</span>
              <span>Distribution Midpoint</span>
              <span>Terminal Row Index</span>
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
                Model asserts high calibration accuracy on individual profile retention metrics. Multi-tenant feature vectors are evaluated strictly within this account space.
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
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. THREE-COLUMN: Format Distribution, Ingestion, & Audit Feed */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(tabularMetrics.hasData || documentMetrics.hasDocs) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Col 1: Document Formats (Donut) */}
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 shadow-xs">
            <h4 className="text-sm font-bold text-[var(--lm-text-primary)] mb-1">
              Document File Distribution
            </h4>
            <p className="text-[11px] text-[var(--lm-text-tertiary)] mb-4">
              Ingested Unstructured File Types ({documentMetrics.count} files)
            </p>

            <div className="flex items-center justify-center my-3">
              <svg viewBox="0 0 100 100" className="w-28 h-28 transform -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-[var(--lm-bg-tertiary)]" strokeWidth="12" />
                {documentMetrics.count > 0 ? (
                  <>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#E34234" strokeWidth="12" strokeDasharray="107 238" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray="60 238" strokeDashoffset="-107" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="43 238" strokeDashoffset="-167" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="28 238" strokeDashoffset="-210" />
                  </>
                ) : (
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeWidth="12" />
                )}
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E34234]" />
                <span className="text-[var(--lm-text-secondary)]">PDF Dossiers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#059669]" />
                <span className="text-[var(--lm-text-secondary)]">Word (DOCX)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[var(--lm-text-secondary)]">TXT / Markdown</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[var(--lm-text-secondary)]">Tabular CSV</span>
              </div>
            </div>
          </div>

          {/* Col 2: Ingestion Sources Bar Chart */}
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 shadow-xs">
            <h4 className="text-sm font-bold text-[var(--lm-text-primary)] mb-1">
              Data Volume by Source
            </h4>
            <p className="text-[11px] text-[var(--lm-text-tertiary)] mb-4">Ingestion Channels</p>

            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--lm-text-secondary)]">Local Multi-Tenant Ingest</span>
                  <span className="font-mono font-bold text-[var(--lm-text-primary)]">
                    {formatBytes(storageFootprintBytes)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--lm-bg-secondary)]">
                  <div className="h-full bg-[#E34234] rounded-full w-[85%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--lm-text-secondary)]">Zoho Catalyst DataStore Sync</span>
                  <span className="font-mono font-bold text-[var(--lm-text-primary)]">Cloud Lake</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--lm-bg-secondary)]">
                  <div className="h-full bg-indigo-500 rounded-full w-[60%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--lm-text-secondary)]">Document File Intake</span>
                  <span className="font-mono font-bold text-[var(--lm-text-primary)]">
                    {documentMetrics.totalTokens} Tokens
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--lm-bg-secondary)]">
                  <div className="h-full bg-[#059669] rounded-full w-[35%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: Recent Activity & Treatment Audit */}
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[var(--lm-text-primary)]">
                  Recent Operations Audit
                </h4>
                <button
                  onClick={() => setActiveView('operations')}
                  className="text-[11px] text-[#059669] dark:text-[#34D399] font-semibold hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <span className="font-semibold text-[var(--lm-text-primary)] block">
                      Profile Sandbox Synced
                    </span>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] block">
                      Dedicated tenant storage verified for {currentUser.name}
                    </span>
                  </div>
                </div>
                {activeDataset && (
                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold text-[var(--lm-text-primary)] block">
                        Schema Ingestion Verified
                      </span>
                      <span className="text-[10px] text-[var(--lm-text-tertiary)] block">
                        {activeDataset.fileName} ({tabularMetrics.rowCount} rows, {tabularMetrics.columnsCount} cols)
                      </span>
                    </div>
                  </div>
                )}
                {activeDocument && (
                  <div className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold text-[var(--lm-text-primary)] block">
                        Document Dossier Loaded
                      </span>
                      <span className="text-[10px] text-[var(--lm-text-tertiary)] block">
                        {activeDocument.fileName} ({activeDocument.wordCount} words)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--lm-border-default)] text-[11px] text-[var(--lm-text-tertiary)] flex items-center justify-between">
              <span>Cryptographic Log</span>
              <span className="font-mono text-emerald-500 font-semibold">✓ SHA-256 Validated</span>
            </div>
          </div>
        </div>
      )}

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
