'use strict';
'use client';

import React from 'react';
import { DatabaseIcon, SparklesIcon } from '@/components/icons';
import { StatusBadge } from '@/components/ui';
import { DatasetProfile, DocumentFileProfile } from '@/types';

interface HomeDatasetDocumentCardsProps {
  tabularMetrics: {
    hasData: boolean;
    totalARR: number;
    avgNPS: number;
    avgChurn: string;
    columnsCount: number;
    financialKey: string | null;
    npsKey: string | null;
    churnKey: string | null;
  };
  activeDataset: DatasetProfile | null;
  activeDocument: DocumentFileProfile | null;
  treatmentMessage: string | null;
  treatmentRunning: boolean;
  onQuickTreatment: (type: 'pii_redaction' | 'entity_extraction' | 'summarization') => void;
  onOpenData: () => void;
}

export function HomeDatasetDocumentCards({
  tabularMetrics,
  activeDataset,
  activeDocument,
  treatmentMessage,
  treatmentRunning,
  onQuickTreatment,
  onOpenData,
}: HomeDatasetDocumentCardsProps) {
  return (
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
                Dataset Verification
              </span>
              <span className="font-mono text-[11px] text-[var(--lm-text-tertiary)] truncate max-w-[120px]">
                {activeDataset?.sha256 ? `${activeDataset.sha256.substring(0, 12)}...` : 'Local Key'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenData}
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
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-fade-in">
              {treatmentMessage}
            </div>
          )}

          {activeDocument ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[var(--lm-text-primary)]">Executive Summary Preview</span>
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">
                    {activeDocument.wordCount} words
                  </span>
                </div>
                <p className="text-xs text-[var(--lm-text-secondary)] line-clamp-3 leading-relaxed">
                  {activeDocument.rawTextPreview || 'Raw document text indexed and ready for NLP treatments.'}
                </p>
              </div>

              <div className="pt-1">
                <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)] block mb-2">
                  Execute One-Click NLP Treatments:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={treatmentRunning}
                    onClick={() => onQuickTreatment('pii_redaction')}
                    className="p-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-[11px] font-semibold text-[var(--lm-text-primary)] transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    🛡️ Mask PII
                  </button>
                  <button
                    disabled={treatmentRunning}
                    onClick={() => onQuickTreatment('summarization')}
                    className="p-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-[11px] font-semibold text-[var(--lm-text-primary)] transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    📝 Summary
                  </button>
                  <button
                    disabled={treatmentRunning}
                    onClick={() => onQuickTreatment('entity_extraction')}
                    className="p-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-[11px] font-semibold text-[var(--lm-text-primary)] transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    🔍 Entities
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--lm-text-tertiary)]">
              No document dossier currently selected. Upload a PDF or DOCX file to run NLP treatments.
            </div>
          )}
        </div>

        <button
          onClick={onOpenData}
          className="mt-5 w-full py-2.5 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-indigo-600 hover:text-white text-xs font-semibold text-[var(--lm-text-primary)] transition-colors cursor-pointer text-center"
        >
          Open Document Studio &amp; Treatments →
        </button>
      </div>
    </div>
  );
}
