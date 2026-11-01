'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AIStudioSection } from '@/components/ai/AIStudioSection';
import { parseNumeric } from '@/lib/csvParser';

import { HomeFileDropzone } from '@/components/home/HomeFileDropzone';
import { HomeMetricsStrip } from '@/components/home/HomeMetricsStrip';
import { HomeDatasetDocumentCards } from '@/components/home/HomeDatasetDocumentCards';
import { HomeChartsAudit } from '@/components/home/HomeChartsAudit';

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
import SQLStudioPage from './sql/page';
import ExcelAutomatorPage from './excel/page';
import InvestmentPlannerPage from './investment/page';

function HomeView() {
  const {
    currentUser,
    currentWorkspace,
    openWorkspaceModal,
    activeDataset,
    activeRows,
    documentFiles,
    activeDocument,
    runDocumentTreatment,
    setActiveView,
    storageFootprintBytes,
    t,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'tabular' | 'ai' | 'documents' | 'pipelines' | 'models'>('all');
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
        financialKey: null as string | null,
        npsKey: null as string | null,
        churnKey: null as string | null,
        financialValues: [] as number[],
      };
    }

    const firstRow = rows[0] || {};
    const keys = Object.keys(firstRow);

    const financialKey = keys.find((k) => /arr|revenue|amount|sales|value|price|cost|spend/i.test(k)) || null;
    const npsKey = keys.find((k) => /nps|score|rating|satisfaction/i.test(k)) || null;
    const churnKey = keys.find((k) => /churn|risk|prob|attrition/i.test(k)) || null;

    const financialValues: number[] = [];
    let totalARR = 0;
    if (financialKey) {
      for (const r of rows) {
        const val = parseNumeric(r[financialKey]) ?? 0;
        totalARR += val;
        financialValues.push(val);
      }
    }

    const avgNPS =
      npsKey && rows.length > 0
        ? Math.round(rows.reduce((acc, r) => acc + (parseNumeric(r[npsKey]) ?? 0), 0) / rows.length)
        : 0;

    const avgChurn =
      churnKey && rows.length > 0
        ? (
            (rows.reduce((acc, r) => {
              let val = parseNumeric(r[churnKey]) ?? 0;
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

    return {
      count,
      totalWords,
      totalTokens,
      totalTreatments,
      hasDocs: count > 0,
    };
  }, [documentFiles]);

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

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const trendPoints = useMemo(() => {
    const vals = tabularMetrics.financialValues;
    if (!vals || vals.length === 0) return null;
    const sample = vals.slice(0, 16);
    const maxVal = Math.max(...sample, 1);
    const minVal = Math.min(...sample, 0);
    const range = maxVal - minVal || 1;

    const coords = sample.map((v, i) => {
      const x = sample.length === 1 ? 350 : Math.round((i / (sample.length - 1)) * 640 + 30);
      const normalized = (v - minVal) / range;
      const y = Math.round(220 - normalized * 180);
      return [x, y];
    });

    const polyline = coords.map(([x, y]) => `${x},${y}`).join(' ');
    const polygon = `30,230 ${polyline} ${coords[coords.length - 1][0]},230`;

    return { coords, polyline, polygon };
  }, [tabularMetrics.financialValues]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* 1. EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#059669] dark:text-[#10B981] uppercase tracking-wider">
              {t('app.subtitle')}
            </span>
            <span className="text-[var(--lm-text-tertiary)] text-xs">•</span>
            <button
              type="button"
              onClick={openWorkspaceModal}
              className="text-xs font-semibold text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] flex items-center gap-1.5 cursor-pointer bg-[var(--lm-bg-secondary)] px-2.5 py-0.5 rounded-full border border-[var(--lm-border-default)] hover:border-[#059669]/40 transition-colors"
              title="Click to rename workspace or customize branding"
            >
              <span>{currentWorkspace.icon || '⚡'}</span>
              <span>{currentWorkspace.name}</span>
              <span className="text-[10px] text-slate-400">✎</span>
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--lm-text-primary)] tracking-tight">
              {t('common.welcome')}, {currentUser.name || 'Analyst'}
            </h1>
            <button
              type="button"
              onClick={openWorkspaceModal}
              className="p-1 rounded-lg text-slate-400 hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)] text-xs transition-colors cursor-pointer"
              title="Edit Profile Name & Workspace"
            >
              ✎
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openWorkspaceModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] hover:border-[#059669] transition-colors shadow-xs cursor-pointer"
            title="Manage Workspace & Profile Settings"
          >
            <span className="text-sm">{currentWorkspace.icon || '⚡'}</span>
            <span className="max-w-[130px] truncate">{currentWorkspace.name}</span>
            <span className="text-[10px] font-mono text-[#059669] dark:text-[#34D399] hidden sm:inline">
              ({formatBytes(storageFootprintBytes)})
            </span>
          </button>
        </div>
      </div>

      {/* 2. FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Studio Assets' },
          { id: 'ai', label: '✨ Lumetric AI Copilot' },
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

      {/* 3. CLEAN WORKSPACE: Direct File Drop */}
      {!tabularMetrics.hasData && !documentMetrics.hasDocs && (
        <HomeFileDropzone />
      )}

      {/* 3.5 STUDIO HIGHLIGHT BANNER */}
      <HomeMetricsStrip
        tabularMetrics={tabularMetrics}
        documentMetrics={documentMetrics}
        activeDocument={activeDocument}
        storageFootprintBytes={storageFootprintBytes}
        formatBytes={formatBytes}
      />

      {/* 4. AI COPILOT SECTION */}
      {(activeFilter === 'all' || activeFilter === 'ai') && (
        <AIStudioSection />
      )}

      {/* 5. TABULAR DATASET & DOCUMENT NLP CARDS */}
      {(tabularMetrics.hasData || documentMetrics.hasDocs) && (
        <HomeDatasetDocumentCards
          tabularMetrics={tabularMetrics}
          activeDataset={activeDataset}
          activeDocument={activeDocument}
          treatmentMessage={treatmentMessage}
          treatmentRunning={treatmentRunning}
          onQuickTreatment={handleQuickTreatment}
          onOpenData={() => setActiveView('data')}
        />
      )}

      {/* 6. CHARTS & AUDIT FEED */}
      <HomeChartsAudit
        tabularMetrics={tabularMetrics}
        documentMetrics={documentMetrics}
        trendPoints={trendPoints}
        activeDataset={activeDataset}
        activeDocument={activeDocument}
        currentUser={currentUser}
        storageFootprintBytes={storageFootprintBytes}
        formatBytes={formatBytes}
        onNavigate={setActiveView}
      />

      {/* 7. BOTTOM CTA */}
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

  if (activeView === 'projects') return <ProjectsPage />;
  if (activeView === 'data') return <DataWorkspacePage />;
  if (activeView === 'pipelines') return <PipelinesPage />;
  if (activeView === 'analysis') return <AnalysisStudioPage />;
  if (activeView === 'models') return <ModelsPage />;
  if (activeView === 'sql') return <SQLStudioPage />;
  if (activeView === 'excel') return <ExcelAutomatorPage />;
  if (activeView === 'investment') return <InvestmentPlannerPage />;
  if (activeView === 'dashboards') return <DashboardsPage />;
  if (activeView === 'stories') return <StoriesPage />;
  if (activeView === 'operations') return <OperationsPage />;
  if (activeView === 'settings') return <SettingsPage />;

  return <HomeView />;
}
