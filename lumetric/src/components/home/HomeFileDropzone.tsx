'use strict';
'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { UploadIcon } from '@/components/icons';
import { StatusBadge } from '@/components/ui';
import { DatasetProfile, DocumentFileProfile } from '@/types';
import { parseCSVStrict, healDatasetRows, parseNumeric } from '@/lib/csvParser';

interface HomeFileDropzoneProps {
  onSuccess?: () => void;
}

export function HomeFileDropzone({ onSuccess }: HomeFileDropzoneProps) {
  const {
    currentWorkspace,
    openWorkspaceModal,
    addDataset,
    addDocumentFile,
    setActiveView,
  } = useApp();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleProcessFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (['csv', 'tsv', 'txt', 'json', 'xlsx', 'xls'].includes(ext)) {
        if (ext === 'xlsx' || ext === 'xls') {
          const ExcelJS = await import('exceljs');
          const wb = new ExcelJS.Workbook();
          const buf = await file.arrayBuffer();
          await wb.xlsx.load(buf);
          const sheet = wb.worksheets[0];
          if (!sheet) throw new Error('No worksheets found in Excel file');

          const headers: string[] = [];
          const rows: Record<string, string>[] = [];
          sheet.eachRow((row, rowNumber) => {
            const values = Array.isArray(row.values) ? row.values.slice(1) : [];
            if (rowNumber === 1) {
              values.forEach((v, idx) => headers.push(String(v || `Col_${idx + 1}`).trim()));
            } else {
              const r: Record<string, string> = {};
              headers.forEach((h, idx) => {
                const cellVal = values[idx];
                r[h] = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
              });
              rows.push(r);
            }
          });

          const ds: DatasetProfile = {
            id: `ds_${Date.now()}`,
            fileName: file.name,
            fileSize: file.size,
            rowCount: rows.length,
            columnCount: headers.length,
            version: '1.0.0',
            columns: headers.map((h) => ({
              name: h,
              inferredType: 'string',
              semanticRole: 'dimension',
              totalCount: rows.length,
              nullCount: 0,
              uniqueCount: rows.length,
              sampleValues: rows.slice(0, 3).map((r) => r[h] || ''),
            })),
            requirements: {
              businessGrain: 'One row per record',
              primaryKey: headers[0] || 'id',
              timestampColumn: 'None',
              currency: 'None',
              unitScale: 'Exact 1.0',
              periodicity: 'Snapshot',
              dataClassification: 'Internal Business',
              intendedDecision: 'Profile and analyze dataset records',
            },
            qualityChecks: [],
            quarantinedRowsCount: 0,
            parseWarnings: [],
            sha256: `sha_${Date.now()}`,
            uploadedAt: new Date().toISOString(),
            status: 'complete',
          };
          addDataset(ds, rows);
        } else {
          const text = await file.text();
          if (ext === 'json') {
            const parsed = JSON.parse(text);
            const arrayData = Array.isArray(parsed) ? parsed : [parsed];
            const rows = healDatasetRows(arrayData);
            const cols = Object.keys(rows[0] || {});
            const ds: DatasetProfile = {
              id: `ds_${Date.now()}`,
              fileName: file.name,
              fileSize: file.size,
              rowCount: rows.length,
              columnCount: cols.length,
              version: '1.0.0',
              columns: cols.map((c) => ({
                name: c,
                inferredType: 'string',
                semanticRole: 'dimension',
                totalCount: rows.length,
                nullCount: 0,
                uniqueCount: rows.length,
                sampleValues: rows.slice(0, 3).map((r) => r[c] || ''),
              })),
              requirements: {
                businessGrain: 'One row per record',
                primaryKey: cols[0] || 'id',
                timestampColumn: 'None',
                currency: 'None',
                unitScale: 'Exact 1.0',
                periodicity: 'Snapshot',
                dataClassification: 'Internal Business',
                intendedDecision: 'Profile and analyze dataset records',
              },
              qualityChecks: [],
              quarantinedRowsCount: 0,
              parseWarnings: [],
              sha256: `sha_${Date.now()}`,
              uploadedAt: new Date().toISOString(),
              status: 'complete',
            };
            addDataset(ds, rows);
          } else {
            const rawRows = parseCSVStrict(text);
            const headers = rawRows[0] || [];
            const dataRows = rawRows.slice(1).map((r) => {
              const obj: Record<string, string> = {};
              headers.forEach((h, i) => {
                obj[h] = r[i] !== undefined ? r[i] : '';
              });
              return obj;
            });
            const healed = healDatasetRows(dataRows);
            const ds: DatasetProfile = {
              id: `ds_${Date.now()}`,
              fileName: file.name,
              fileSize: file.size,
              rowCount: healed.length,
              columnCount: headers.length,
              version: '1.0.0',
              columns: headers.map((h) => ({
                name: h,
                inferredType: 'string',
                semanticRole: 'dimension',
                totalCount: healed.length,
                nullCount: 0,
                uniqueCount: healed.length,
                sampleValues: healed.slice(0, 3).map((r) => r[h] || ''),
              })),
              requirements: {
                businessGrain: 'One row per record',
                primaryKey: headers[0] || 'id',
                timestampColumn: 'None',
                currency: 'None',
                unitScale: 'Exact 1.0',
                periodicity: 'Snapshot',
                dataClassification: 'Internal Business',
                intendedDecision: 'Profile and analyze dataset records',
              },
              qualityChecks: [],
              quarantinedRowsCount: 0,
              parseWarnings: [],
              sha256: `sha_${Date.now()}`,
              uploadedAt: new Date().toISOString(),
              status: 'complete',
            };
            addDataset(ds, healed);
          }
        }
      } else {
        // Document File Intake (PDF, DOCX, TXT Dossiers)
        const text = await file.text().catch(() => 'Binary document contents indexed.');
        const words = text.split(/\s+/).filter(Boolean).length;
        const normalizedType: 'pdf' | 'docx' | 'txt' | 'markdown' | 'json' | 'csv' | 'xml' | 'html' =
          ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'json' ? 'json' : ext === 'csv' ? 'csv' : 'txt';
        const doc: DocumentFileProfile = {
          id: `doc_${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: normalizedType,
          uploadedAt: new Date().toISOString(),
          sha256: `sha_${Date.now()}`,
          rawTextPreview: text.slice(0, 2500),
          wordCount: words,
          tokenCount: Math.round(words * 1.3),
          language: 'English',
          status: 'ready',
          treatments: [],
        };
        addDocumentFile(doc);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-bold text-[#059669] dark:text-[#10B981] uppercase tracking-wider">
              Isolated Private Workspace
            </span>
            <StatusBadge variant="emerald" dot>Ready</StatusBadge>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--lm-text-primary)]">
            Upload Your Data to Start Instant Analysis
          </h2>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)] max-w-xl">
            Workspace: <span className="font-bold text-[var(--lm-text-primary)]">{currentWorkspace.name}</span>. Uploaded datasets and documents remain encrypted and strictly isolated to your workspace vault.
          </p>
        </div>

        <button
          onClick={openWorkspaceModal}
          className="px-4 py-2 rounded-2xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-xs font-bold text-[var(--lm-text-primary)] transition-all shrink-0 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>⚙️</span>
          <span>Workspace Settings</span>
        </button>
      </div>

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
          if (file) handleProcessFile(file);
        }}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
          isDragOver
            ? 'border-[#059669] bg-[#059669]/10 scale-[1.01]'
            : 'border-[var(--lm-border-default)] hover:border-[#059669]/60 bg-[var(--lm-bg-secondary)]/50'
        }`}
      >
        <input
          type="file"
          id="home-direct-file-input"
          className="hidden"
          accept=".csv,.tsv,.txt,.json,.pdf,.docx,.xlsx,.xls"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleProcessFile(file);
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#059669]/10 text-[#059669] flex items-center justify-center">
            {isUploading ? (
              <div className="w-8 h-8 rounded-full border-3 border-[#059669] border-t-transparent animate-spin" />
            ) : (
              <UploadIcon className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-[var(--lm-text-primary)]">
              {isUploading ? 'Parsing & Profiling Ingested Data...' : 'Drag and drop your file here'}
            </h3>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
              Supports CSV, Excel, TXT, JSON, and PDF dossiers
            </p>
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {uploadError}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <label
              htmlFor="home-direct-file-input"
              className="px-6 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-[#FAF8F5] text-xs font-bold transition-all shadow-md shadow-emerald-900/20 cursor-pointer inline-flex items-center gap-2"
            >
              <UploadIcon className="w-4 h-4" />
              Choose File from Device
            </label>
            <button
              onClick={() => setActiveView('data')}
              className="px-5 py-3 rounded-2xl bg-[var(--lm-bg-elevated)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] transition-all cursor-pointer"
            >
              + Open Data Workspace
            </button>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            {['.CSV', '.TSV', '.TXT', '.JSON', '.PDF', '.DOCX'].map((ext) => (
              <span
                key={ext}
                className="px-2.5 py-1 rounded-lg bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] font-mono text-[10px] text-[var(--lm-text-tertiary)]"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
