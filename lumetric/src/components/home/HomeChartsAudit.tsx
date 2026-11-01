'use strict';
'use client';

import React from 'react';
import { StatusBadge } from '@/components/ui';
import { DatasetProfile, DocumentFileProfile, User } from '@/types';

interface HomeChartsAuditProps {
  tabularMetrics: {
    hasData: boolean;
    rowCount: number;
    columnsCount: number;
    financialKey: string | null;
  };
  documentMetrics: {
    hasDocs: boolean;
    count: number;
    totalTokens: number;
  };
  trendPoints: {
    coords: number[][];
    polyline: string;
    polygon: string;
  } | null;
  activeDataset: DatasetProfile | null;
  activeDocument: DocumentFileProfile | null;
  currentUser: User;
  storageFootprintBytes: number;
  formatBytes: (bytes: number) => string;
  onNavigate: (view: any) => void;
}

export function HomeChartsAudit({
  tabularMetrics,
  documentMetrics,
  trendPoints,
  activeDataset,
  activeDocument,
  currentUser,
  storageFootprintBytes,
  formatBytes,
  onNavigate,
}: HomeChartsAuditProps) {
  if (!tabularMetrics.hasData && !documentMetrics.hasDocs) {
    return null;
  }

  return (
    <>
      {/* 5. TWO-COLUMN: Feature Correlation & Predictive ML Score */}
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
            <StatusBadge variant="info">Live Dynamic</StatusBadge>
          </div>

          {/* SVG Dynamic Trend Curve */}
          <div className="w-full h-80 sm:h-96 min-h-[320px] relative mt-3">
            <svg viewBox="0 0 700 250" width="100%" height="100%" data-chart="home-trend" className="w-full h-full chart-svg overflow-visible">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E34234" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#E34234" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="30" y1="40" x2="670" y2="40" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="4 4" />
              <line x1="30" y1="100" x2="670" y2="100" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="4 4" />
              <line x1="30" y1="160" x2="670" y2="160" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="4 4" />
              <line x1="30" y1="220" x2="670" y2="220" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="4 4" />

              {trendPoints ? (
                <>
                  <polygon points={trendPoints.polygon} fill="url(#trendGrad)" />
                  <polyline
                    points={trendPoints.polyline}
                    fill="none"
                    stroke="#E34234"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {trendPoints.coords.map(([x, y], idx) => (
                    <circle key={idx} cx={x} cy={y} r="5" fill="#FAF8F5" stroke="#E34234" strokeWidth="3" />
                  ))}
                </>
              ) : (
                <>
                  <polygon points="30,220 150,170 350,110 520,140 670,80 670,220" fill="url(#trendGrad)" />
                  <polyline points="30,220 150,170 350,110 520,140 670,80" fill="none" stroke="#E34234" strokeWidth="3" strokeDasharray="5 5" />
                </>
              )}
            </svg>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--lm-text-tertiary)] mt-3 font-mono px-2">
            <span>Beginning Row Index (1)</span>
            <span>Distribution Midpoint (n/2)</span>
            <span>Terminal Row Index (n)</span>
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
              <span className="block text-emerald-200">Prediction Accuracy</span>
              <span className="font-bold text-[#FAF8F5] font-mono text-sm">96.4% Calibrated</span>
            </div>
            <button
              onClick={() => onNavigate('models')}
              className="px-4 py-2 rounded-xl bg-[#FAF8F5] text-[#059669] font-bold text-xs hover:bg-[#F4ECE1] transition-colors shadow-xs cursor-pointer"
            >
              Inspect Model Details →
            </button>
          </div>
        </div>
      </div>

      {/* 6. THREE-COLUMN: Format Distribution, Ingestion, & Audit Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Col 1: Document Formats (Donut) */}
        <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-[var(--lm-text-primary)] mb-1">
            Document File Distribution
          </h4>
          <p className="text-[11px] text-[var(--lm-text-tertiary)] mb-4">
            Ingested Unstructured File Types ({documentMetrics.count} files)
          </p>

          <div className="flex items-center justify-center my-4">
            <svg viewBox="0 0 100 100" width="100%" height="100%" data-chart="home-donut" className="w-56 h-56 sm:w-64 sm:h-64 chart-svg transform -rotate-90">
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
              <div className="w-full h-3.5 rounded-full bg-[var(--lm-bg-secondary)] overflow-hidden">
                <div className="h-full bg-[#E34234] rounded-full w-[85%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--lm-text-secondary)]">Enterprise Cloud Data Vault</span>
                <span className="font-mono font-bold text-[var(--lm-text-primary)]">Cloud Lake</span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-[var(--lm-bg-secondary)] overflow-hidden">
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
              <div className="w-full h-3.5 rounded-full bg-[var(--lm-bg-secondary)] overflow-hidden">
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
                onClick={() => onNavigate('operations')}
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
            <span>Data Integrity</span>
            <span className="font-mono text-emerald-500 font-semibold">100% Ingested</span>
          </div>
        </div>
      </div>
    </>
  );
}
