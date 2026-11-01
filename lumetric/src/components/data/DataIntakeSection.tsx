'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { UploadIcon } from '@/components/icons';

interface DataIntakeSectionProps {
  excelSheetNames: string[];
  activeExcelSheet: string;
  onSelectExcelSheet: (sheetName: string) => void;
  isProcessing: boolean;
  parseError: string | null;
  pasteMode: boolean;
  pastedText: string;
  onSetPasteMode: (mode: boolean) => void;
  onSetPastedText: (text: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop?: (file: File) => void;
  onIntakeContent: (content: string, name: string, size: number) => void;
}

export function DataIntakeSection({
  excelSheetNames,
  activeExcelSheet,
  onSelectExcelSheet,
  isProcessing,
  parseError,
  pasteMode,
  pastedText,
  onSetPasteMode,
  onSetPastedText,
  onFileUpload,
  onFileDrop,
  onIntakeContent,
}: DataIntakeSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Multi-Sheet Excel Workbook Selector */}
      {excelSheetNames.length > 1 && (
        <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              📊 Multi-Sheet Excel Workbook: {excelSheetNames.length} Sheets Detected
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
              Currently viewing: <strong>{activeExcelSheet}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {excelSheetNames.map((sName) => (
              <button
                key={sName}
                onClick={() => onSelectExcelSheet(sName)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeExcelSheet === sName
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-[var(--lm-bg-elevated)] border border-emerald-300/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                }`}
              >
                📄 {sName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && onFileDrop) {
            onFileDrop(file);
          }
        }}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center bg-[var(--lm-bg-elevated)] backdrop-blur-2xl transition-all duration-300 shadow-[var(--lm-shadow-md)] apple-card-hover ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-[var(--lm-border-default)] hover:border-blue-500/60'
        }`}
      >
        <div className="max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <UploadIcon className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--lm-text-primary)]">
              Upload or Connect Your Dataset
            </h3>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1 leading-relaxed">
              Upload your CSV, Excel, or JSON file to immediately profile columns, evaluate data health, and start analyzing.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.txt,.json,.parquet,.xlsx,.xls"
                onChange={onFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <span className="inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-xs gap-2 bg-[#059669] hover:bg-[#047857] text-white shadow-sm transition-all hover:scale-105 cursor-pointer">
                {isProcessing ? 'Verifying Content...' : 'Choose File (.xlsx, .csv, .json)'}
              </span>
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSetPasteMode(!pasteMode)}
              className="rounded-xl text-xs font-semibold"
            >
              {pasteMode ? 'Hide Direct Paste' : 'Direct Text / CSV Paste'}
            </Button>
          </div>

          {pasteMode && (
            <div className="mt-4 p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-left space-y-3 animate-fade-in shadow-xs">
              <label className="block text-xs font-bold text-[var(--lm-text-primary)]">
                Paste Raw CSV or JSON Records:
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => onSetPastedText(e.target.value)}
                placeholder="paste raw CSV headers and rows here..."
                className="w-full p-3 font-mono text-xs bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!pastedText.trim() || isProcessing}
                  onClick={() => {
                    const name = `pasted_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
                    onIntakeContent(pastedText.trim(), name, pastedText.length);
                  }}
                  className="rounded-xl font-bold bg-[#059669] hover:bg-[#047857] text-white"
                >
                  Process &amp; Begin Requirements Wizard →
                </Button>
              </div>
            </div>
          )}

          {parseError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-left font-medium">
              <span className="font-bold">Intake Halt:</span> {parseError}
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Security Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="rounded-2xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <span className="text-xs font-bold text-[var(--lm-text-primary)]">
              Cryptographic Hashing
            </span>
          </div>
          <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
            Computes immutable SHA-256 hash. Ensures source lineage cannot be silently replaced or altered.
          </p>
        </Card>

        <Card padding="md" className="rounded-2xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <span className="text-xs font-bold text-[var(--lm-text-primary)]">
              Grain &amp; Contract Elicitation
            </span>
          </div>
          <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
            Asks for observation grain, primary keys, units, and currency conventions before generating models.
          </p>
        </Card>

        <Card padding="md" className="rounded-2xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span className="text-xs font-bold text-[var(--lm-text-primary)]">
              Pre-Flight Quality Gates
            </span>
          </div>
          <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
            Evaluates uniqueness, null bounds, and cadence. Flags or quarantines malformed records explicitly.
          </p>
        </Card>
      </div>
    </div>
  );
}
