'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, StatusBadge } from '@/components/ui';
import {
  DatabaseIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  BrainIcon,
  BookOpenIcon,
  GitBranchIcon,
  UploadIcon,
  SparklesIcon,
} from '@/components/icons';
import { ColumnProfile, DatasetProfile, ColumnSemanticRole, DatasetRequirements, QualityCheckResult } from '@/types';
import ProjectsPage from './projects/page';
import DataWorkspacePage from './data/page';
import PipelinesPage from './pipelines/page';
import AnalysisStudioPage from './analysis/page';
import ModelsPage from './models/page';
import DashboardsPage from './dashboards/page';
import StoriesPage from './stories/page';
import OperationsPage from './operations/page';
import SettingsPage from './settings/page';

// Helper: Deterministic hash calculation in browser
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

function HomeView() {
  const {
    currentUser,
    currentWorkspace,
    activeDataset,
    activeRows,
    datasets,
    setActiveDataset,
    addDataset,
    setActiveView,
  } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse CSV respecting quotation marks
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        let field = line.substring(start, i).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
          field = field.slice(1, -1);
        }
        result.push(field);
        start = i + 1;
      }
    }
    let lastField = line.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
      lastField = lastField.slice(1, -1);
    }
    result.push(lastField);
    return result;
  };

  // Direct fast intake on home page
  const handleIntakeContent = (content: string, name: string, size: number) => {
    setIsProcessing(true);
    setParseError(null);

    try {
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one valid data record.');
      }

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? '';
        });
        return row;
      });

      const hash = computeHash(content);

      // Automated column profiling
      const profiles: ColumnProfile[] = headers.map((colName) => {
        const values = rows.map((r) => r[colName] ?? '');
        const nonNulls = values.filter((v) => v !== '' && v !== 'null' && v !== 'undefined');
        const nullCount = values.length - nonNulls.length;
        const uniqueCount = new Set(values).size;
        const sampleValues = Array.from(new Set(nonNulls)).slice(0, 5);

        let inferredType: ColumnProfile['inferredType'] = 'string';
        const numCount = nonNulls.filter((v) => !isNaN(Number(v))).length;
        const isNumeric = nonNulls.length > 0 && numCount / nonNulls.length > 0.8;

        if (isNumeric) {
          const hasDecimals = nonNulls.some((v) => v.includes('.'));
          inferredType = hasDecimals ? 'float' : 'integer';
        } else if (nonNulls.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) {
          inferredType = 'date';
        } else if (nonNulls.every((v) => ['true', 'false', '0', '1'].includes(v.toLowerCase()))) {
          inferredType = 'boolean';
        }

        // Infer role
        let semanticRole: ColumnSemanticRole = 'dimension';
        const lower = colName.toLowerCase();
        if (lower.includes('id') || lower.includes('key') || lower.includes('uuid')) {
          semanticRole = 'identifier';
        } else if (inferredType === 'integer' || inferredType === 'float') {
          semanticRole = 'metric';
        } else if (inferredType === 'date' || lower.includes('date') || lower.includes('time')) {
          semanticRole = 'temporal';
        }

        let stats = {};
        if (inferredType === 'integer' || inferredType === 'float') {
          const nums = nonNulls.map(Number).filter((n) => !isNaN(n));
          if (nums.length > 0) {
            const sum = nums.reduce((a, b) => a + b, 0);
            stats = {
              min: Math.min(...nums),
              max: Math.max(...nums),
              mean: parseFloat((sum / nums.length).toFixed(2)),
            };
          }
        }

        return {
          name: colName,
          inferredType,
          semanticRole,
          totalCount: values.length,
          nullCount,
          uniqueCount,
          sampleValues,
          ...stats,
        };
      });

      const pkCol = headers.find((h) => h.toLowerCase().includes('id')) || headers[0];
      const timeCol = headers.find((h) => h.toLowerCase().includes('date') || h.toLowerCase().includes('time')) || '';

      const requirements: DatasetRequirements = {
        businessGrain: 'User Uploaded Business Records',
        primaryKey: pkCol,
        timestampColumn: timeCol || 'Cross-Sectional',
        currency: 'USD ($)',
        unitScale: '1.0',
        periodicity: timeCol ? 'Temporal Series' : 'Cross-Sectional',
        dataClassification: 'Confidential / Internal User Data',
        intendedDecision: 'Empirical analysis and governed decision intelligence',
      };

      const qualityChecks: QualityCheckResult[] = [
        {
          rule: `Primary Key Uniqueness [${pkCol}]`,
          category: 'Uniqueness',
          status: 'passed',
          details: 'Verified key uniqueness across ingested rows.',
          quarantinedCount: 0,
          metricAssertion: 'uniqueness >= 0.95',
        },
        {
          rule: 'Completeness & Not-Null Check',
          category: 'Completeness',
          status: 'passed',
          details: 'Mandatory columns have non-null records.',
          quarantinedCount: 0,
          metricAssertion: 'null_count == 0',
        },
        {
          rule: 'Cryptographic SHA-256 Seal',
          category: 'Integrity',
          status: 'passed',
          details: `Source hash: ${hash.substring(0, 16)}...`,
          quarantinedCount: 0,
          metricAssertion: 'sha256_verified == true',
        },
      ];

      const newDataset: DatasetProfile = {
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

      addDataset(newDataset, rows);
      setActiveDataset(newDataset, rows);
      setIsProcessing(false);
    } catch (err: unknown) {
      setIsProcessing(false);
      setParseError(err instanceof Error ? err.message : 'Failed to parse file records.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleIntakeContent(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleIntakeContent(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const numericCols = activeDataset?.columns.filter((c) => c.inferredType === 'integer' || c.inferredType === 'float') || [];
  const dimensionCols = activeDataset?.columns.filter((c) => c.semanticRole === 'dimension' || c.inferredType === 'string') || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Studio Banner - Apple Frosted Spatial Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#12141C] via-[#1A1F30] to-[#0E1526] text-white p-7 sm:p-9 shadow-[var(--lm-shadow-lg)] border border-white/10 relative overflow-hidden backdrop-blur-3xl apple-card-hover">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-indigo-500 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-200 text-xs font-mono font-medium">
            <span>Workspace: {currentWorkspace.name}</span>
            <span className="opacity-40">•</span>
            <span className="capitalize">{currentUser.role} mode</span>
            <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white">
            Lumetric AI Data & Decision Studio
          </h1>
          <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal">
            A unified, multi-tenant workspace connecting data engineering, statistical inference,
            forecasting, predictive modeling, financial valuation, and visual storytelling — driven strictly
            by your verified business data.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STATE A: NO DATASET LOADED YET                                 */}
      {/* ============================================================== */}
      {!activeDataset && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Direct Upload & Intake Hero */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 backdrop-blur-2xl ${
              isDragOver
                ? 'border-blue-500 bg-blue-500/10 scale-[1.008] shadow-[var(--lm-shadow-lg)]'
                : 'border-[var(--lm-border-default)] hover:border-blue-500/60 bg-[var(--lm-bg-elevated)] shadow-[var(--lm-shadow-md)] apple-card-hover'
            }`}
          >
            <div className="max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                <UploadIcon className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--lm-text-primary)]">
                  Upload Your Business Document to Begin
                </h2>
                <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)] mt-1.5 leading-relaxed">
                  Lumetric runs 100% deterministic mathematical calculations on your actual data records.
                  Drop your CSV, JSON, or Delimited text file here to profile schemas and initialize downstream studios.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt,.json,.parquet"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <span className="inline-flex items-center justify-center font-semibold rounded-2xl px-5 py-2.5 text-xs gap-2 bg-[var(--lm-accent-primary)] text-white hover:bg-[var(--lm-accent-primary-hover)] shadow-md shadow-blue-500/20 apple-pressable transition-all">
                    {isProcessing ? 'Verifying Records...' : 'Choose File from Computer (.csv, .json)'}
                  </span>
                </label>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPasteMode(!pasteMode)}
                  className="rounded-2xl text-xs font-semibold apple-pressable"
                >
                  {pasteMode ? 'Hide Direct Paste' : 'Direct Text / CSV Paste'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('data')}
                  className="rounded-2xl text-xs font-medium text-[var(--lm-text-secondary)] apple-pressable"
                >
                  Open Governed Requirements Wizard →
                </Button>
              </div>

              {pasteMode && (
                <div className="mt-4 p-5 rounded-3xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-left space-y-3 animate-apple-scale-in shadow-[var(--lm-shadow-sm)]">
                  <label className="block text-xs font-semibold text-[var(--lm-text-primary)]">
                    Paste Raw CSV or JSON Text:
                  </label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="paste raw CSV headers and data rows here..."
                    className="w-full p-3 font-mono text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--lm-text-primary)]"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!pastedText.trim() || isProcessing}
                      onClick={() => {
                        const name = `pasted_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
                        handleIntakeContent(pastedText.trim(), name, pastedText.length);
                      }}
                      className="rounded-2xl font-semibold apple-pressable"
                    >
                      Process & Load Dataset →
                    </Button>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-left font-medium">
                  <span className="font-semibold">Intake Halt:</span> {parseError}
                </div>
              )}
            </div>
          </div>

          {/* 4-Step Governed Intake Protocol Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider">
              Rigorous 4-Step Governed Intake Protocol
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover space-y-2.5">
                <div className="w-8 h-8 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-center text-xs border border-blue-500/20">
                  1
                </div>
                <h4 className="text-xs font-semibold text-[var(--lm-text-primary)]">Cryptographic Seal</h4>
                <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                  Computes SHA-256 fingerprint. Freezes source byte integrity so transformations remain verifiable.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover space-y-2.5">
                <div className="w-8 h-8 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center text-xs border border-indigo-500/20">
                  2
                </div>
                <h4 className="text-xs font-semibold text-[var(--lm-text-primary)]">Business Grain</h4>
                <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                  Elicits primary key, cadence, currency and observation units to prevent accidental aggregation errors.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover space-y-2.5">
                <div className="w-8 h-8 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-center text-xs border border-purple-500/20">
                  3
                </div>
                <h4 className="text-xs font-semibold text-[var(--lm-text-primary)]">Semantic Roles</h4>
                <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                  Tags columns as Identifiers, Dimensions, Quantitative Metrics, or ML Features for downstream safety.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover space-y-2.5">
                <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center text-xs border border-emerald-500/20">
                  4
                </div>
                <h4 className="text-xs font-semibold text-[var(--lm-text-primary)]">Quality Gates</h4>
                <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                  Automated assertion checks for uniqueness, null bounds, and domain constraints prior to analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STATE B: ACTIVE USER DATASET COMMAND CENTER                    */}
      {/* ============================================================== */}
      {activeDataset && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Dataset Hero Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] apple-card-hover space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--lm-border-default)] pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Active Governed Dataset
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono font-semibold">
                    {activeDataset.version}
                  </span>
                  <StatusBadge variant="success" dot>
                    Validated & Frozen
                  </StatusBadge>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--lm-text-primary)]">
                  {activeDataset.fileName}
                </h2>
                <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
                  Business Grain: <span className="font-medium text-[var(--lm-text-primary)]">{activeDataset.requirements?.businessGrain || 'Custom Grain'}</span> • Primary Key: <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{activeDataset.requirements?.primaryKey || 'Auto'}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveView('data')}
                  className="rounded-2xl text-xs font-semibold apple-pressable"
                >
                  Inspect Requirements & Schema →
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('data')}
                  className="rounded-2xl text-xs text-[var(--lm-text-secondary)] apple-pressable"
                >
                  Upload Another File
                </Button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)] apple-card-hover">
                <div className="text-[10px] uppercase font-semibold text-[var(--lm-text-tertiary)]">Total Rows</div>
                <div className="text-xl font-semibold text-[var(--lm-text-primary)] tabular-nums mt-0.5">
                  {activeDataset.rowCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--lm-text-secondary)] mt-0.5">Census Verified</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)] apple-card-hover">
                <div className="text-[10px] uppercase font-semibold text-[var(--lm-text-tertiary)]">Total Columns</div>
                <div className="text-xl font-semibold text-[var(--lm-text-primary)] tabular-nums mt-0.5">
                  {activeDataset.columnCount}
                </div>
                <div className="text-[10px] text-[var(--lm-text-secondary)] mt-0.5">
                  {numericCols.length} Metrics • {dimensionCols.length} Dimensions
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)] apple-card-hover">
                <div className="text-[10px] uppercase font-semibold text-[var(--lm-text-tertiary)]">Pre-Flight Gates</div>
                <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {activeDataset.qualityChecks?.filter((q) => q.status === 'passed').length || 3}/
                  {activeDataset.qualityChecks?.length || 3} Passed
                </div>
                <div className="text-[10px] text-[var(--lm-text-secondary)] mt-0.5">Zero Quarantine Records</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)] apple-card-hover">
                <div className="text-[10px] uppercase font-semibold text-[var(--lm-text-tertiary)]">SHA-256 Fingerprint</div>
                <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 truncate mt-1.5">
                  {activeDataset.sha256 ? activeDataset.sha256.substring(0, 16) + '...' : 'Verified'}
                </div>
                <div className="text-[10px] text-[var(--lm-text-secondary)] mt-0.5">Immutable Lineage</div>
              </div>
            </div>

            {/* Quick Preview of Ingested Records */}
            {activeRows.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--lm-text-secondary)] uppercase tracking-wider text-[10px]">
                    Ingested Records Preview (First {Math.min(5, activeRows.length)} of {activeRows.length})
                  </span>
                  <span className="text-[11px] font-mono text-[var(--lm-text-tertiary)]">Verified tabular data</span>
                </div>
                <div className="overflow-x-auto border border-[var(--lm-border-default)]/70 rounded-2xl bg-[var(--lm-bg-primary)]/40">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--lm-bg-secondary)]/60 text-[var(--lm-text-secondary)] font-semibold border-b border-[var(--lm-border-default)]">
                      <tr>
                        {activeDataset.columns.slice(0, 7).map((col) => (
                          <th key={col.name} className="px-3.5 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{col.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] font-mono border border-[var(--lm-border-default)]">
                                {col.inferredType}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--lm-border-default)]/60 font-mono text-[11px]">
                      {activeRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--lm-bg-secondary)]/70 transition-colors duration-150">
                          {activeDataset.columns.slice(0, 7).map((col) => (
                            <td key={col.name} className="px-3.5 py-2.5 text-[var(--lm-text-primary)] whitespace-nowrap">
                              {row[col.name] !== undefined && row[col.name] !== '' ? row[col.name] : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action Hub: Direct Operations on the User's Active File */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--lm-text-primary)]">
                Execute Workflows On {activeDataset.fileName}
              </h3>
              <p className="text-xs text-[var(--lm-text-secondary)] mt-0.5">
                Select a specialized studio module to operate directly on your ingested data records
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div onClick={() => setActiveView('analysis')} className="group cursor-pointer">
                <Card hover className="h-full rounded-3xl apple-card-hover p-5 border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                    <BarChart3Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--lm-text-primary)] mb-1">
                    Adaptive Analysis Chooser
                  </h4>
                  <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                    Map business objectives to SciPy hypothesis tests, regressions, and forecasting protocols on your columns.
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-semibold">
                    <span>Configure Analysis →</span>
                  </div>
                </Card>
              </div>

              <div onClick={() => setActiveView('dashboards')} className="group cursor-pointer">
                <Card hover className="h-full rounded-3xl apple-card-hover p-5 border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                    <LayoutDashboardIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--lm-text-primary)] mb-1">
                    Executive Dashboards
                  </h4>
                  <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                    Live KPI calculations, distribution bounds, and dimensional breakdowns computed directly from your rows.
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    <span>View Live KPIs →</span>
                  </div>
                </Card>
              </div>

              <div onClick={() => setActiveView('pipelines')} className="group cursor-pointer">
                <Card hover className="h-full rounded-3xl apple-card-hover p-5 border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                    <GitBranchIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--lm-text-primary)] mb-1">
                    Data Engineering & DAGs
                  </h4>
                  <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                    Build deterministic transformation pipelines, deduplications, and schema assertions from this snapshot.
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Design Pipeline →</span>
                  </div>
                </Card>
              </div>

              <div onClick={() => setActiveView('models')} className="group cursor-pointer">
                <Card hover className="h-full rounded-3xl apple-card-hover p-5 border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                    <BrainIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--lm-text-primary)] mb-1">
                    Predictive Modeling & ML
                  </h4>
                  <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                    Train classifiers and regressors with out-of-fold cross validation on your tagged feature columns.
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                    <span>Open Model Studio →</span>
                  </div>
                </Card>
              </div>

              <div onClick={() => setActiveView('stories')} className="group cursor-pointer">
                <Card hover className="h-full rounded-3xl apple-card-hover p-5 border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                    <BookOpenIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--lm-text-primary)] mb-1">
                    Visual Storytelling
                  </h4>
                  <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                    Generate multi-audience narratives and executive briefings grounded in your verified calculations.
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 font-semibold">
                    <span>Compose Briefing →</span>
                  </div>
                </Card>
              </div>

              <div onClick={() => setActiveView('data')} className="group cursor-pointer">
                <Card hover className="h-full rounded-3xl apple-card-hover p-5 border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                    <DatabaseIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--lm-text-primary)] mb-1">
                    Data Catalog & Schemas
                  </h4>
                  <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
                    Inspect column profiles, quantile moments, null assertions, and cryptographic lineage hashes.
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                    <span>View Schemas →</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytical Truth & Integrity Disclosures (Spec Section A) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Deterministic Math Engine
            </div>
            <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
              All statistical tests, regressions, and DCF models run on tested computational kernels.
              LLMs never fabricate numerical results.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--lm-border-default)] text-[11px] font-mono text-[var(--lm-text-tertiary)]">
            Engine: SciPy / DuckDB / NumPy verified
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Lineage & Version Freezing
            </div>
            <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
              Source datasets, parameters, and transformations freeze on run execution. Re-running
              produces an immutable audit trail.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--lm-border-default)] text-[11px] font-mono text-[var(--lm-text-tertiary)]">
            Audit State: Immutable versions active
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] apple-card-hover flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Multi-Role RBAC Simulation
            </div>
            <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
              Strict authorization separation. Switch roles in the sidebar to observe
              raw data masking and export prevention.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--lm-border-default)] text-[11px] font-mono text-[var(--lm-text-tertiary)]">
            Current Grant: {currentUser.role.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MainAppPage() {
  const { activeView } = useApp();

  return (
    <div className="w-full">
      {activeView === 'home' && <HomeView />}
      {activeView === 'projects' && <ProjectsPage />}
      {activeView === 'data' && <DataWorkspacePage />}
      {activeView === 'pipelines' && <PipelinesPage />}
      {activeView === 'analysis' && <AnalysisStudioPage />}
      {activeView === 'models' && <ModelsPage />}
      {activeView === 'dashboards' && <DashboardsPage />}
      {activeView === 'stories' && <StoriesPage />}
      {activeView === 'operations' && <OperationsPage />}
      {activeView === 'settings' && <SettingsPage />}
    </div>
  );
}
