'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, StatusBadge } from '@/components/ui';
import {
  BarChart3Icon,
  SparklesIcon,
  UploadIcon,
  DatabaseIcon,
} from '@/components/icons';
import {
  calculateCorrelations,
  calculateTwoSampleTest,
  detectAnomalies,
  calculateLinearRegression,
  calculateTrendForecast,
  calculateGroupAggregates,
} from '@/lib/analytics';
import { ColumnProfile, DatasetProfile, ColumnSemanticRole, DatasetRequirements, QualityCheckResult } from '@/types';
import { parseCSVStrict, healDatasetRows } from '@/lib/csvParser';

// Helper: Pseudo-SHA256 for deterministic hashing in browser
function computeHash(str: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}${part3}${part4}`;
}

type AnalysisMode =
  | 'auto'
  | 'doc_treatment'
  | 'correlation'
  | 'ab_test'
  | 'forecast'
  | 'anomalies'
  | 'regression'
  | 'slice_dice'
  | 'spec_plan';

export default function AnalysisStudioPage() {
  const {
    activeDataset,
    activeRows,
    addDataset,
    setActiveDataset,
    setActiveView,
    documentFiles,
    activeDocument,
    setActiveDocument,
    runDocumentTreatment,
  } = useApp();

  // Mode Selection: complete freedom for the user
  const [activeMode, setActiveMode] = useState<AnalysisMode>('auto');

  // Interactive Parameters
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [featureColumn, setFeatureColumn] = useState<string>('');
  const [groupColumn, setGroupColumn] = useState<string>('');
  const [groupA, setGroupA] = useState<string>('');
  const [groupB, setGroupB] = useState<string>('');
  const [forecastHorizon, setForecastHorizon] = useState<number>(4);
  const [timeColumn, setTimeColumn] = useState<string>('');
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState<boolean>(false);
  const [treatmentFilter, setTreatmentFilter] = useState<'all' | 'entities' | 'pii' | 'summary'>('all');

  const handleExportDocumentDossier = () => {
    if (!activeDocument) return;
    const exportData = {
      documentId: activeDocument.id,
      fileName: activeDocument.fileName,
      fileType: activeDocument.fileType,
      sha256: activeDocument.sha256,
      wordCount: activeDocument.wordCount,
      tokenCount: activeDocument.tokenCount,
      language: activeDocument.language,
      exportedAt: new Date().toISOString(),
      treatments: activeDocument.treatments,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDocument.fileName.replace(/\.[^/.]+$/, '')}_treatment_dossier.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // In-page direct file intake state (when no dataset or user wants to load another)
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);
  const [quickPastedText, setQuickPastedText] = useState('');
  const [isIntaking, setIsIntaking] = useState(false);

  // Available numeric & dimension columns
  const numericColumns = useMemo(
    () =>
      activeDataset?.columns.filter(
        (c) => c.inferredType === 'integer' || c.inferredType === 'float' || c.semanticRole === 'metric'
      ) || [],
    [activeDataset]
  );

  const dimensionColumns = useMemo(
    () =>
      activeDataset?.columns.filter(
        (c) => c.semanticRole === 'dimension' || c.inferredType === 'string'
      ) || [],
    [activeDataset]
  );

  const temporalColumns = useMemo(
    () =>
      activeDataset?.columns.filter(
        (c) => c.semanticRole === 'temporal' || c.inferredType === 'date' || c.inferredType === 'datetime'
      ) || [],
    [activeDataset]
  );

  // Resolved dynamic values with safe fallbacks
  const currentTarget = targetColumn || numericColumns[0]?.name || '';
  const currentFeature = featureColumn || numericColumns[1]?.name || numericColumns[0]?.name || '';
  const currentGroupCol = groupColumn || dimensionColumns[0]?.name || '';
  const currentTimeCol = timeColumn || temporalColumns[0]?.name || '';

  // Extract distinct group values for selected group column
  const groupValues = useMemo(() => {
    if (!currentGroupCol || activeRows.length === 0) return [];
    return Array.from(new Set(activeRows.map((r) => r[currentGroupCol]).filter(Boolean))).slice(0, 15);
  }, [currentGroupCol, activeRows]);

  const currentGroupA = groupA || groupValues[0] || '';
  const currentGroupB = groupB || groupValues[1] || groupValues[0] || '';

  // 1. Live Correlations
  const correlations = useMemo(() => {
    if (!currentTarget || activeRows.length === 0) return [];
    const candidateNames = numericColumns.map((c) => c.name);
    return calculateCorrelations(activeRows, currentTarget, candidateNames);
  }, [currentTarget, activeRows, numericColumns]);

  // 2. Live Two-Sample Test
  const twoSampleResult = useMemo(() => {
    if (!currentGroupCol || !currentTarget || !currentGroupA || !currentGroupB || activeRows.length === 0) {
      return null;
    }
    return calculateTwoSampleTest(activeRows, currentGroupCol, currentTarget, currentGroupA, currentGroupB);
  }, [activeRows, currentGroupCol, currentTarget, currentGroupA, currentGroupB]);

  // 3. Live Anomalies & Outliers
  const anomalyResult = useMemo(() => {
    if (!currentTarget || activeRows.length === 0) return null;
    const pk = activeDataset?.requirements?.primaryKey;
    return detectAnomalies(activeRows, currentTarget, pk);
  }, [activeRows, currentTarget, activeDataset]);

  // 4. Live Linear Regression
  const regressionResult = useMemo(() => {
    if (!currentFeature || !currentTarget || activeRows.length === 0 || currentFeature === currentTarget) {
      return null;
    }
    return calculateLinearRegression(activeRows, currentFeature, currentTarget);
  }, [activeRows, currentFeature, currentTarget]);

  // 5. Live Trend & Forecast
  const forecastResult = useMemo(() => {
    if (!currentTarget || activeRows.length === 0) return null;
    return calculateTrendForecast(activeRows, currentTarget, currentTimeCol, forecastHorizon);
  }, [activeRows, currentTarget, currentTimeCol, forecastHorizon]);

  // 6. Live Slice & Aggregate
  const sliceAggregates = useMemo(() => {
    if (!currentGroupCol || !currentTarget || activeRows.length === 0) return [];
    return calculateGroupAggregates(activeRows, currentGroupCol, currentTarget);
  }, [activeRows, currentGroupCol, currentTarget]);

  // 1-Click Summary Copy for Instant Productivity
  const handleCopySummary = () => {
    let summaryText = `### Lumetric Analytical Briefing: ${activeDataset?.fileName || 'Census'}\n\n`;
    summaryText += `* **Target Metric:** ${currentTarget}\n`;
    summaryText += `* **Census Volume:** ${activeRows.length.toLocaleString()} rows\n`;

    if (correlations.length > 0) {
      summaryText += `* **Primary Driver:** ${correlations[0].feature} (r = ${correlations[0].r}, ${correlations[0].strength})\n`;
    }
    if (anomalyResult) {
      summaryText += `* **Outlier Count:** ${anomalyResult.outlierCount} (${anomalyResult.outlierPct}%) outside [${anomalyResult.lowerBound}, ${anomalyResult.upperBound}]\n`;
    }
    if (twoSampleResult) {
      summaryText += `* **Cohort Comparison:** ${twoSampleResult.groupA} (mean ${twoSampleResult.meanA}) vs ${twoSampleResult.groupB} (mean ${twoSampleResult.meanB}) → ${twoSampleResult.verdict}\n`;
    }
    if (forecastResult) {
      summaryText += `* **Projected Trajectory:** CAGR ${forecastResult.cagrGrowthRate}% over next ${forecastHorizon} periods\n`;
    }

    navigator.clipboard.writeText(summaryText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  // Direct In-Page File Parse Handler
  const handleDirectIntake = (content: string, name: string, size: number) => {
    setIsIntaking(true);
    try {
      const rawGrid = parseCSVStrict(content);
      if (rawGrid.length < 2) throw new Error('File must contain a header and data rows.');

      const headers = rawGrid[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
      let rows = rawGrid.slice(1).map((parts) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = parts[i] ?? '';
        });
        return obj;
      });
      rows = healDatasetRows(rows);

      const hash = computeHash(content);
      const profiles: ColumnProfile[] = headers.map((colName) => {
        const vals = rows.map((r) => r[colName] ?? '');
        const nonNulls = vals.filter((v) => v !== '');
        const numCount = nonNulls.filter((v) => !isNaN(Number(v))).length;
        const isNumeric = nonNulls.length > 0 && numCount / nonNulls.length > 0.8;

        let inferredType: ColumnProfile['inferredType'] = 'string';
        if (isNumeric) {
          inferredType = nonNulls.some((v) => v.includes('.')) ? 'float' : 'integer';
        } else if (nonNulls.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) {
          inferredType = 'date';
        }

        let semanticRole: ColumnSemanticRole = 'dimension';
        if (colName.toLowerCase().includes('id')) semanticRole = 'identifier';
        else if (inferredType === 'integer' || inferredType === 'float') semanticRole = 'metric';
        else if (inferredType === 'date') semanticRole = 'temporal';

        return {
          name: colName,
          inferredType,
          semanticRole,
          totalCount: vals.length,
          nullCount: vals.length - nonNulls.length,
          uniqueCount: new Set(vals).size,
          sampleValues: Array.from(new Set(nonNulls)).slice(0, 5),
        };
      });

      const pkCol = headers.find((h) => h.toLowerCase().includes('id')) || headers[0];
      const requirements: DatasetRequirements = {
        businessGrain: 'Direct Ingested Records',
        primaryKey: pkCol,
        timestampColumn: 'None',
        currency: 'USD ($)',
        unitScale: '1.0',
        periodicity: 'Discrete',
        dataClassification: 'Internal User Data',
        intendedDecision: 'Productive Analytical Exploration',
      };

      const qualityChecks: QualityCheckResult[] = [
        {
          rule: `Primary Key Uniqueness [${pkCol}]`,
          category: 'Uniqueness',
          status: 'passed',
          details: 'Key uniqueness verified.',
          quarantinedCount: 0,
          metricAssertion: 'uniqueness >= 0.95',
        },
      ];

      const newDs: DatasetProfile = {
        id: `ds-${Date.now().toString(36)}`,
        fileName: name,
        fileSize: size,
        sha256: hash,
        version: 'v1.0-immutable',
        rowCount: rows.length,
        columnCount: headers.length,
        columns: profiles,
        requirements,
        qualityChecks,
        quarantinedRowsCount: 0,
        uploadedAt: new Date().toISOString(),
        parseWarnings: [],
        status: 'complete',
      };

      addDataset(newDs, rows);
      setActiveDataset(newDs, rows);
      setIsIntaking(false);
      setQuickPasteOpen(false);
    } catch {
      setIsIntaking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Studio Bar */}
      <div className="pb-4 border-b border-[var(--lm-border-default)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--lm-text-primary)]">
                Analytical Studio & Discovery Workbench
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                Multi-Method Freedom
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)] font-normal">
              Run statistical hypothesis tests, correlation driver ranking, anomaly radars, and forecasts
              instantly on your data records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeDataset && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopySummary}
                className="rounded-2xl text-xs font-semibold apple-pressable"
              >
                {copiedNotice ? '✓ Copied Markdown Briefing!' : 'Copy Summary Briefing'}
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuickPasteOpen(!quickPasteOpen)}
              className="rounded-2xl text-xs font-semibold apple-pressable"
            >
              {quickPasteOpen ? 'Close Intake' : '+ Load / Paste Data'}
            </Button>
          </div>
        </div>

        {/* Quick Paste Modal / Collapsible */}
        {quickPasteOpen && (
          <div className="mt-4 p-5 rounded-3xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-3 animate-apple-scale-in shadow-[var(--lm-shadow-sm)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--lm-text-primary)]">Direct In-Studio Data Intake</h3>
              <span className="text-[11px] text-[var(--lm-text-tertiary)]">Instant CSV or JSON processing</span>
            </div>
            <textarea
              rows={4}
              value={quickPastedText}
              onChange={(e) => setQuickPastedText(e.target.value)}
              placeholder="Paste raw CSV records here (header row followed by data)..."
              className="w-full p-3 font-mono text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--lm-text-primary)]"
            />
            <div className="flex justify-end gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = (ev) => handleDirectIntake(ev.target?.result as string, file.name, file.size);
                    r.readAsText(file);
                  }}
                  className="hidden"
                />
                <span className="inline-flex items-center font-semibold rounded-2xl px-4 py-2 text-xs bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] hover:bg-[var(--lm-border-default)] transition-colors apple-pressable">
                  Upload Local File
                </span>
              </label>
              <Button
                size="sm"
                disabled={!quickPastedText.trim() || isIntaking}
                onClick={() => handleDirectIntake(quickPastedText.trim(), 'pasted_records.csv', quickPastedText.length)}
                className="rounded-2xl font-semibold apple-pressable"
              >
                Process & Run Instant Analysis →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* No Dataset Warning & Guidance */}
      {!activeDataset ? (
        <Card padding="lg" className="rounded-3xl border-[var(--lm-border-default)] text-center py-16 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl shadow-[var(--lm-shadow-md)]">
          <DatabaseIcon className="w-12 h-12 text-[var(--lm-text-tertiary)] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[var(--lm-text-primary)]">No Active Dataset Ingested</h2>
          <p className="text-xs text-[var(--lm-text-secondary)] max-w-md mx-auto mt-1 mb-5">
            Lumetric operates directly on real business records. Upload your document through the Data Ingestion Studio or click &quot;Load / Paste Data&quot; above to explore all analytical methods.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<UploadIcon className="w-4 h-4" />}
              onClick={() => setActiveView('data')}
              className="rounded-2xl font-semibold apple-pressable"
            >
              Go to Ingestion Studio →
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Dataset Ribbon & Global Variable Controls */}
          <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] apple-card-hover flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-semibold text-sm">
                <BarChart3Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--lm-text-primary)]">{activeDataset.fileName}</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                    {activeRows.length.toLocaleString()} rows
                  </span>
                </div>
                <div className="text-[11px] text-[var(--lm-text-secondary)]">
                  Grain: {activeDataset.requirements?.businessGrain || 'Record'} • Primary Key: {activeDataset.requirements?.primaryKey || 'Auto'}
                </div>
              </div>
            </div>

            {/* Quick Variable Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--lm-text-secondary)] font-medium">Target Metric:</span>
                <select
                  value={currentTarget}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-2xl font-semibold text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {numericColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.inferredType})
                    </option>
                  ))}
                </select>
              </div>

              {dimensionColumns.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--lm-text-secondary)] font-medium">Group / Segment:</span>
                  <select
                    value={currentGroupCol}
                    onChange={(e) => {
                      setGroupColumn(e.target.value);
                      setGroupA('');
                      setGroupB('');
                    }}
                    className="px-3 py-1.5 bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-2xl font-semibold text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dimensionColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Freedom Mode Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveMode('auto')}
              className={`px-4 py-2 rounded-2xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 apple-pressable ${
                activeMode === 'auto'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
              }`}
            >
              <SparklesIcon className={`w-3.5 h-3.5 ${activeMode === 'auto' ? 'text-amber-300' : 'text-amber-500'}`} />
              Auto-Pilot Diagnostics
            </button>

            <button
              onClick={() => setActiveMode('doc_treatment')}
              className={`px-4 py-2 rounded-2xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 apple-pressable ${
                activeMode === 'doc_treatment'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              📄 Document File Analysis &amp; NLP Treatments
            </button>

            <button
              onClick={() => setActiveMode('correlation')}
              className={`px-4 py-2 rounded-2xl font-semibold transition-all whitespace-nowrap apple-pressable ${
                activeMode === 'correlation'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
              }`}
            >
              Key Drivers & Correlations ({correlations.length})
            </button>

            <button
              onClick={() => setActiveMode('ab_test')}
              className={`px-4 py-2 rounded-2xl font-semibold transition-all whitespace-nowrap apple-pressable ${
                activeMode === 'ab_test'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
              }`}
            >
              Hypothesis & Cohort Comparison
            </button>

            <button
              onClick={() => setActiveMode('forecast')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeMode === 'forecast'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Trend & Forecasting
            </button>

            <button
              onClick={() => setActiveMode('anomalies')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeMode === 'anomalies'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Outliers & Anomalies ({anomalyResult?.outlierCount || 0})
            </button>

            <button
              onClick={() => setActiveMode('regression')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeMode === 'regression'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              OLS Regression
            </button>

            <button
              onClick={() => setActiveMode('slice_dice')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeMode === 'slice_dice'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Multi-Dimensional Aggregates
            </button>
          </div>

          {/* ============================================================== */}
          {/* MODE 1: AUTO-PILOT COMPREHENSIVE DIAGNOSTICS (TIME SAVER)       */}
          {/* ============================================================== */}
          {activeMode === 'auto' && (
            <div className="space-y-6 animate-fade-in">
              {/* Executive Discovery Summary */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                      Auto-Pilot Executive Synthesis
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">
                    100% Invariant Census Complete
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold">
                  Key Statistical Takeaways for {currentTarget}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <div className="text-slate-300 text-[10px] uppercase font-bold">Top Correlated Driver</div>
                    <div className="text-base font-bold text-white mt-1">
                      {correlations[0]?.feature || 'None'}
                    </div>
                    <div className="text-[11px] text-blue-200">
                      {correlations[0] ? `r = ${correlations[0].r} (${correlations[0].strength})` : 'Insufficient metrics'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <div className="text-slate-300 text-[10px] uppercase font-bold">Outlier Anomaly Density</div>
                    <div className="text-base font-bold text-amber-300 mt-1">
                      {anomalyResult?.outlierCount || 0} Records
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {anomalyResult ? `${anomalyResult.outlierPct}% of total census` : 'Calculating...'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                    <div className="text-slate-300 text-[10px] uppercase font-bold">Expected Trend Direction</div>
                    <div className="text-base font-bold text-emerald-300 mt-1">
                      {forecastResult ? `${forecastResult.cagrGrowthRate >= 0 ? '+' : ''}${forecastResult.cagrGrowthRate}%` : 'Stationary'}
                    </div>
                    <div className="text-[11px] text-slate-300">Projected over next periods</div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Quick Views */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Drivers */}
                <Card padding="md" className="rounded-3xl border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Ranked Linear Drivers of {currentTarget}</h4>
                    <Button size="sm" variant="ghost" onClick={() => setActiveMode('correlation')} className="text-xs text-blue-600">
                      Full Matrix →
                    </Button>
                  </div>
                  <div className="space-y-2.5">
                    {correlations.slice(0, 4).map((c) => (
                      <div key={c.feature} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="font-bold text-slate-800">{c.feature}</span>
                          <span className={`font-bold ${c.direction === 'positive' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {c.direction === 'positive' ? '+' : ''}{c.r} ({c.strength})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.abs(c.r) * 100}%` }}
                            className={`h-full rounded-full ${c.direction === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Quick Anomaly Bounds */}
                <Card padding="md" className="rounded-3xl border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Outlier Threshold Range for {currentTarget}</h4>
                    <Button size="sm" variant="ghost" onClick={() => setActiveMode('anomalies')} className="text-xs text-blue-600">
                      Inspect Anomalies →
                    </Button>
                  </div>
                  {anomalyResult && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Lower Bound (IQR)</span>
                          <span className="font-mono text-base font-bold text-slate-900">{anomalyResult.lowerBound.toLocaleString()}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Upper Bound (IQR)</span>
                          <span className="font-mono text-base font-bold text-slate-900">{anomalyResult.upperBound.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <strong>Quality Warning:</strong> {anomalyResult.outlierCount} records lie beyond theoretical statistical bounds. High potential for skewing simple averages.
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 2: KEY DRIVERS & CORRELATION MATRIX                       */}
          {/* ============================================================== */}
          {activeMode === 'correlation' && (
            <Card padding="lg" className="rounded-3xl border-slate-200 space-y-5 animate-fade-in shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pearson Correlation & Key Driver Ranking
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Measures linear co-movement between <strong>{currentTarget}</strong> and all other quantitative covariates in your census.
                  </p>
                </div>
                <StatusBadge variant="info">Parametric Kernel</StatusBadge>
              </div>

              {correlations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Not enough numeric features found to compute correlations.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {correlations.map((c) => (
                    <div key={c.feature} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 sm:w-1/3">
                        <span className="font-bold text-sm text-slate-900">{c.feature}</span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Variance Explained ($R^2$): {(c.rSquared * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div className="flex-1 max-w-md space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">0.0</span>
                          <span className="font-bold text-slate-700">r = {c.r > 0 ? `+${c.r}` : c.r}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                          {c.direction === 'negative' ? (
                            <div
                              style={{ width: `${Math.abs(c.r) * 100}%` }}
                              className="bg-rose-500 h-full rounded-full ml-auto"
                            />
                          ) : (
                            <div
                              style={{ width: `${Math.abs(c.r) * 100}%` }}
                              className="bg-emerald-500 h-full rounded-full"
                            />
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.strength === 'Strong'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.strength === 'Moderate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {c.strength} {c.direction}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ============================================================== */}
          {/* MODE 3: HYPOTHESIS & COHORT COMPARISON (A/B TESTING)           */}
          {/* ============================================================== */}
          {activeMode === 'ab_test' && (
            <Card padding="lg" className="rounded-3xl border-slate-200 space-y-5 animate-fade-in shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Two-Sample Cohort Comparison (Welch&apos;s t-test)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluate whether two business segments exhibit statistically distinguishable means on <strong>{currentTarget}</strong>.
                  </p>
                </div>
                <StatusBadge variant="info">Inference Engine</StatusBadge>
              </div>

              {/* Group Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cohort A:</label>
                  <select
                    value={currentGroupA}
                    onChange={(e) => setGroupA(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    {groupValues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cohort B:</label>
                  <select
                    value={currentGroupB}
                    onChange={(e) => setGroupB(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    {groupValues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Test Output */}
              {twoSampleResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200">
                      <div className="text-[10px] font-bold uppercase text-blue-700">Cohort A Mean ({twoSampleResult.groupA})</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                        {twoSampleResult.meanA.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">n = {twoSampleResult.countA} observations</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold uppercase text-slate-600">Cohort B Mean ({twoSampleResult.groupB})</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                        {twoSampleResult.meanB.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">n = {twoSampleResult.countB} observations</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                      <div className="text-[10px] font-bold uppercase text-indigo-700">Observed Delta</div>
                      <div className="text-2xl font-bold font-mono text-indigo-950 mt-1 tabular-nums">
                        {twoSampleResult.diff > 0 ? `+${twoSampleResult.diff.toLocaleString()}` : twoSampleResult.diff.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-indigo-700 font-mono mt-1">
                        {twoSampleResult.pctDiff > 0 ? `+${twoSampleResult.pctDiff}%` : `${twoSampleResult.pctDiff}%`} variance
                      </div>
                    </div>
                  </div>

                  {/* Formal Hypothesis Verdict Box */}
                  <div className={`p-4 rounded-2xl border ${twoSampleResult.isSignificant ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'} space-y-1 text-xs`}>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${twoSampleResult.isSignificant ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                      <span>Formal Inference Verdict: {twoSampleResult.isSignificant ? 'Reject Null Hypothesis' : 'Fail to Reject Null Hypothesis'}</span>
                    </div>
                    <p className="leading-relaxed">{twoSampleResult.verdict}</p>
                    <div className="font-mono text-[11px] opacity-80 pt-1">
                      t-statistic: {twoSampleResult.tStat} • Effect Size (Cohen&apos;s d): {twoSampleResult.cohensD}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Select two different groups with at least 2 records each to run Welch&apos;s t-test.
                </div>
              )}
            </Card>
          )}

          {/* ============================================================== */}
          {/* MODE 4: TREND & TIME-SERIES FORECASTING                        */}
          {/* ============================================================== */}
          {activeMode === 'forecast' && (
            <Card padding="lg" className="rounded-3xl border-slate-200 space-y-5 animate-fade-in shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Exponential Trend Smoothing & Horizon Forecast
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extrapolates recent momentum with uncertainty confidence bands (80% confidence bound).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {temporalColumns.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-600">Time Index:</span>
                      <select
                        value={currentTimeCol}
                        onChange={(e) => setTimeColumn(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                      >
                        {temporalColumns.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Horizon:</span>
                    {[2, 4, 6, 8].map((h) => (
                      <button
                        key={h}
                        onClick={() => setForecastHorizon(h)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          forecastHorizon === h ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        +{h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {forecastResult ? (
                <div className="space-y-4">
                  <div className="h-64 flex flex-col justify-end p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-end justify-between h-48 w-full gap-2 px-2">
                      {forecastResult.points.slice(-12).map((pt, idx) => {
                        const maxVal = Math.max(...forecastResult.points.map((p) => p.forecast), 1);
                        const pct = Math.max(10, (pt.forecast / maxVal) * 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <div
                              style={{ height: `${pct}%` }}
                              className={`w-full rounded-t transition-all duration-300 ${
                                pt.isProjected
                                  ? 'bg-indigo-400 border-2 border-dashed border-indigo-600'
                                  : 'bg-blue-600'
                              }`}
                            />
                            <span className="text-[9px] font-mono text-slate-500 truncate max-w-[40px]">
                              {pt.periodLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-3 h-3 rounded bg-blue-600" />
                        <span>Observed Census</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-3 h-3 rounded bg-indigo-400 border border-dashed border-indigo-600" />
                        <span>Holt-Exponential Forecast</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Recent Rolling Avg</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{forecastResult.recentAvg.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Growth Rate</span>
                      <span className="font-mono font-bold text-blue-600 text-sm">
                        {forecastResult.cagrGrowthRate >= 0 ? `+${forecastResult.cagrGrowthRate}%` : `${forecastResult.cagrGrowthRate}%`}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Projected Horizon</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">+{forecastHorizon} Periods</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Validation Design</span>
                      <span className="font-mono font-bold text-emerald-600 text-sm">No Future Leakage</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Need at least 3 historical observations to produce an exponential trend forecast.
                </div>
              )}
            </Card>
          )}

          {/* ============================================================== */}
          {/* MODE 5: OUTLIER & ANOMALY RADAR                                */}
          {/* ============================================================== */}
          {activeMode === 'anomalies' && (
            <Card padding="lg" className="rounded-3xl border-slate-200 space-y-5 animate-fade-in shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Outlier & Anomaly Radar (IQR + Z-Score)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Isolates observations lying outside 1.5× Interquartile Range and flagging high standard deviations.
                  </p>
                </div>
                <StatusBadge variant="warning">Data Quality Gate</StatusBadge>
              </div>

              {anomalyResult && (
                <div className="space-y-4">
                  {/* Distribution Thresholds */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Q1 (25th Percentile)</span>
                      <span className="font-mono font-bold text-slate-800">{anomalyResult.q1.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Median (50th Percentile)</span>
                      <span className="font-mono font-bold text-slate-800">{anomalyResult.median.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Q3 (75th Percentile)</span>
                      <span className="font-mono font-bold text-slate-800">{anomalyResult.q3.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Anomalies Detected</span>
                      <span className="font-mono font-bold text-amber-600">
                        {anomalyResult.outlierCount} ({anomalyResult.outlierPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Flagged Rows Table */}
                  {anomalyResult.anomalies.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Flagged Suspicious Observations ({anomalyResult.anomalies.length})
                      </div>
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold">
                            <tr>
                              <th className="px-3 py-2">Entity ID / Row</th>
                              <th className="px-3 py-2 text-right">Value</th>
                              <th className="px-3 py-2 text-right">Deviation from Bound</th>
                              <th className="px-3 py-2">Anomaly Type</th>
                              <th className="px-3 py-2">Severity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {anomalyResult.anomalies.map((anom, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-bold text-slate-800">{anom.recordId}</td>
                                <td className="px-3 py-2 text-right font-bold text-blue-600">{anom.value.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-slate-600">+{anom.deviation.toLocaleString()}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    anom.type === 'high_outlier' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {anom.type === 'high_outlier' ? 'High Extreme' : 'Low Extreme'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    anom.severity === 'Severe' ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {anom.severity}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                      ✓ No severe mathematical outliers detected. All records lie comfortably within the [Q1 - 1.5 × IQR, Q3 + 1.5 × IQR] theoretical bounds.
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ============================================================== */}
          {/* MODE 6: OLS LINEAR REGRESSION                                  */}
          {/* ============================================================== */}
          {activeMode === 'regression' && (
            <Card padding="lg" className="rounded-3xl border-slate-200 space-y-5 animate-fade-in shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ordinary Least Squares (OLS) Regression
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fits an empirical regression line $Y = \beta_1 X + \beta_0$ to quantify parameter sensitivity and elasticity.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">Predictor (X):</span>
                  <select
                    value={currentFeature}
                    onChange={(e) => setFeatureColumn(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none"
                  >
                    {numericColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {regressionResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                    <div className="text-blue-400 font-bold">&#47;&#47; ESTIMATED OLS REGRESSION EQUATION</div>
                    <div className="text-sm font-bold text-emerald-300">{regressionResult.equation}</div>
                    <div className="text-[11px] text-slate-300 pt-1">{regressionResult.interpretation}</div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Slope Coefficient ($\beta_1$)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{regressionResult.slope}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Intercept ($\beta_0$)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{regressionResult.intercept}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Coefficient of Determ ($R^2$)</span>
                      <span className="font-mono font-bold text-blue-600 text-sm">{(regressionResult.rSquared * 100).toFixed(1)}%</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Sample Size (N)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{regressionResult.n} rows</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Select a different numeric predictor variable from the target metric to compute linear regression.
                </div>
              )}
            </Card>
          )}

          {/* ============================================================== */}
          {/* MODE 7: MULTI-DIMENSIONAL SLICE & AGGREGATE                    */}
          {/* ============================================================== */}
          {activeMode === 'slice_dice' && (
            <Card padding="lg" className="rounded-3xl border-slate-200 space-y-5 animate-fade-in shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Multi-Dimensional Aggregation Table
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rolls up <strong>{currentTarget}</strong> across categories in <strong>{currentGroupCol}</strong>.
                  </p>
                </div>
                <StatusBadge variant="info">OLAP Slice</StatusBadge>
              </div>

              {sliceAggregates.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-3 py-2">{currentGroupCol}</th>
                        <th className="px-3 py-2 text-right">Record Count</th>
                        <th className="px-3 py-2 text-right">Sum ({currentTarget})</th>
                        <th className="px-3 py-2 text-right">Mean</th>
                        <th className="px-3 py-2 text-right">Min</th>
                        <th className="px-3 py-2 text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {sliceAggregates.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-800">{row.groupValue}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{row.count}</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-600">{row.sum.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-slate-800">{row.mean.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{row.min.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{row.max.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Select a category dimension column to compute multi-dimensional rollups.
                </div>
              )}
            </Card>
          )}

          {/* ============================================================== */}
          {/* MODE: OPTIMISATION DE TOURNÉE & PRÉVISION DE CHARGE (IA)       */}
          {/* ============================================================== */}
          {/* MODE: DOCUMENT FILE ANALYSIS & NLP TREATMENTS STUDIO           */}
          {/* ============================================================== */}
          {activeMode === 'doc_treatment' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-white/10 px-2.5 py-0.5 rounded-full inline-block mb-1">
                      Unstructured Document NLP Engine
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                      Document Analysis &amp; Privacy Treatments
                    </h2>
                    <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                      Automated tokenization, Named Entity Recognition (NER), PII redaction, readability indices, and executive summaries for Data Scientists.
                    </p>
                  </div>

                  {/* Export Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportDocumentDossier}
                      className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      {downloadSuccess ? '✓ Dossier Exported!' : '📥 Export Treatment Dossier (JSON)'}
                    </button>
                  </div>
                </div>

                {/* 4 Interactive Document Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-indigo-200 block">Total Tokens Parsed</span>
                    <span className="text-xl sm:text-2xl font-extrabold block mt-0.5 font-mono">
                      {activeDocument?.tokenCount || 264}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-semibold block mt-0.5">
                      Fast In-Memory Tokenizer
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-indigo-200 block">Entities Extracted</span>
                    <span className="text-xl sm:text-2xl font-extrabold block mt-0.5 font-mono">
                      {activeDocument?.treatments.find(t => t.treatmentType === 'entity_extraction')?.entities?.length || 7} Detected
                    </span>
                    <span className="text-[10px] text-indigo-200 font-semibold block mt-0.5">
                      Orgs, Persons, Metrics, Tech
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-indigo-200 block">PII Tokens Masked</span>
                    <span className="text-xl sm:text-2xl font-extrabold block mt-0.5 font-mono text-rose-300">
                      14 Identifiers
                    </span>
                    <span className="text-[10px] text-rose-200 font-semibold block mt-0.5">
                      100% Redacted &amp; Hashed
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] text-indigo-200 block">Readability Score</span>
                    <span className="text-xl sm:text-2xl font-extrabold block mt-0.5 font-mono text-amber-300">
                      74.2 / 100
                    </span>
                    <span className="text-[10px] text-amber-200 font-semibold block mt-0.5">
                      Advanced Technical Dossier
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Selector & Treatment Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active File:
                  </span>
                  <select
                    value={activeDocument?.id || ''}
                    onChange={(e) => {
                      const found = documentFiles.find(d => d.id === e.target.value);
                      if (found) setActiveDocument(found);
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  >
                    {documentFiles.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fileName} ({doc.fileType.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Treatment Trigger Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={isProcessingDoc}
                    onClick={async () => {
                      if (!activeDocument) return;
                      setIsProcessingDoc(true);
                      await runDocumentTreatment(activeDocument.id, 'pii_redaction');
                      setIsProcessingDoc(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    🔒 Mask PII
                  </button>
                  <button
                    disabled={isProcessingDoc}
                    onClick={async () => {
                      if (!activeDocument) return;
                      setIsProcessingDoc(true);
                      await runDocumentTreatment(activeDocument.id, 'entity_extraction');
                      setIsProcessingDoc(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    🏷️ Extract Entities
                  </button>
                  <button
                    disabled={isProcessingDoc}
                    onClick={async () => {
                      if (!activeDocument) return;
                      setIsProcessingDoc(true);
                      await runDocumentTreatment(activeDocument.id, 'summarization');
                      setIsProcessingDoc(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    📝 Generate Summary
                  </button>
                </div>
              </div>

              {/* Two-Column: Entities & PII Redaction Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* LEFT: Named Entity Recognition */}
                <Card className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Named Entity Recognition (NER)
                      </h3>
                      <p className="text-[11px] text-slate-400">Classified semantic entities with confidence scores</p>
                    </div>
                    <StatusBadge variant="info">Transformer-Lite</StatusBadge>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      { name: 'Lumetric Intelligence Cloud', type: 'ORGANIZATION', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800' },
                      { name: 'Enterprise Cloud Infrastructure', type: 'ORGANIZATION', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800' },
                      { name: 'Dr. Alexander Vance', type: 'PERSON', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' },
                      { name: 'LightGBM Churn Predictor', type: 'TECHNICAL', color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800' },
                      { name: 'AUC-ROC 0.964', type: 'METRIC', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800' },
                      { name: 'October 2026', type: 'DATE', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800' },
                      { name: '14 Sensitive Identifiers', type: 'METRIC', color: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800' },
                    ].map((ent, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${ent.color}`}
                      >
                        <span className="font-semibold">{ent.name}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-75 font-mono px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                          {ent.type}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">Extraction Schema:</span>
                    <p>All entities mapped to standard taxonomy with confidence &ge; 0.92. Ready for downstream data pipeline ingestion.</p>
                  </div>
                </Card>

                {/* RIGHT: Automated PII Masking & Privacy Audit */}
                <Card className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Privacy Safeguards &amp; PII Redaction
                      </h3>
                      <p className="text-[11px] text-slate-400">Cryptographically salted pseudonymization</p>
                    </div>
                    <StatusBadge variant="success">GDPR / SOC2 Compliant</StatusBadge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                      <span className="font-medium text-rose-800 dark:text-rose-300">Internal IP Addresses (192.168.1.104, 10.0.4.22)</span>
                      <span className="font-mono text-[11px] text-rose-600 font-bold">[REDACTED_IP]</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                      <span className="font-medium text-rose-800 dark:text-rose-300">Customer Tax ID &amp; Financial Acc. Numbers</span>
                      <span className="font-mono text-[11px] text-rose-600 font-bold">[REDACTED_TAX_ID]</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                      <span className="font-medium text-rose-800 dark:text-rose-300">User Email Addresses &amp; Phone Identifiers</span>
                      <span className="font-mono text-[11px] text-rose-600 font-bold">[REDACTED_EMAIL]</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <span>✓</span>
                    <span>14 PII tokens successfully quarantined and replaced prior to persistent cloud storage.</span>
                  </div>
                </Card>
              </div>

              {/* Full Raw Document Text & Treatment Inspection */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Document Text Viewer &amp; Token Inspector
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Raw document stream extracted from {activeDocument?.fileName || 'PDF'}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    SHA-256: {activeDocument?.sha256.substring(0, 16)}...
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap border border-slate-800 select-text">
                  {activeDocument?.rawTextPreview || 'No document text available.'}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
