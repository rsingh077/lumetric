'use strict';
'use client';

import React from 'react';
import { StatusBadge } from '@/components/ui';

interface HomeMetricsStripProps {
  tabularMetrics: {
    hasData: boolean;
    rowCount: number;
    totalARR: number;
    avgNPS: number;
    avgChurn: string;
    columnsCount: number;
  };
  documentMetrics: {
    hasDocs: boolean;
    count: number;
    totalTokens: number;
  };
  activeDocument: { tokenCount: number } | null;
  storageFootprintBytes: number;
  formatBytes: (bytes: number) => string;
}

export function HomeMetricsStrip({
  tabularMetrics,
  documentMetrics,
  activeDocument,
  storageFootprintBytes,
  formatBytes,
}: HomeMetricsStripProps) {
  if (!tabularMetrics.hasData && !documentMetrics.hasDocs) {
    return null;
  }

  return (
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
            Automated data profiling, document parsing, and predictive analytics engine for your business workspace.
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
  );
}
