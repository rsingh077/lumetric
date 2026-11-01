'use client';

import React, { useState, useMemo } from 'react';
import { Card, Button, StatusBadge, Input } from '@/components/ui';
import { DatasetProfile } from '@/types';

interface DataInspectSectionProps {
  selectedDataset: DatasetProfile;
  activeRows?: Record<string, string>[];
  canExport: boolean;
  onNavigateToAnalysis: () => void;
}

export function DataInspectSection({
  selectedDataset,
  activeRows = [],
  canExport,
  onNavigateToAnalysis,
}: DataInspectSectionProps) {
  const [columnFilter, setColumnFilter] = useState('');
  const [recordFilter, setRecordFilter] = useState('');
  const [inspectView, setInspectView] = useState<'columns' | 'records'>('columns');

  // Client-side row pagination & sorting (W4)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredColumns = useMemo(() => {
    return (selectedDataset.columns || []).filter((c) =>
      c.name.toLowerCase().includes(columnFilter.toLowerCase())
    );
  }, [selectedDataset.columns, columnFilter]);

  const headers = useMemo(() => {
    if (activeRows.length > 0) return Object.keys(activeRows[0]);
    if (selectedDataset.columns) return selectedDataset.columns.map((c) => c.name);
    return [];
  }, [activeRows, selectedDataset.columns]);

  // Filtered and sorted records
  const processedRows = useMemo(() => {
    let result = activeRows;

    if (recordFilter.trim()) {
      const q = recordFilter.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      result = [...result].sort((a, b) => {
        const valA = a[sortCol] ?? '';
        const valB = b[sortCol] ?? '';
        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }

        return sortDir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [activeRows, recordFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / rowsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (effectivePage - 1) * rowsPerPage;
    return processedRows.slice(start, start + rowsPerPage);
  }, [processedRows, effectivePage, rowsPerPage]);

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortCol(null);
      }
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--lm-text-primary)]">
      {/* Metadata & Requirements Contract Banner */}
      <Card padding="md" className="bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)] rounded-2xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--lm-border-default)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[var(--lm-text-primary)]">
                {selectedDataset.fileName}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                {selectedDataset.version}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold">
                {selectedDataset.requirements?.dataClassification || 'Internal'}
              </span>
            </div>
            <div className="text-xs text-[var(--lm-text-secondary)] mt-1 font-semibold">
              Business Grain: {selectedDataset.requirements?.businessGrain}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              className="bg-[#059669] hover:bg-[#047857] text-white font-bold"
              onClick={onNavigateToAnalysis}
            >
              Launch Analysis Chooser →
            </Button>
            {canExport && (
              <Button size="sm" variant="secondary">
                Export JSON Contract
              </Button>
            )}
          </div>
        </div>

        {/* Contract Keys & Anchors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-[var(--lm-bg-elevated)] rounded-xl border border-[var(--lm-border-default)]">
            <span className="text-[10px] text-[var(--lm-text-tertiary)] font-bold uppercase block">Primary Key</span>
            <span className="font-mono font-bold text-[var(--lm-text-primary)]">{selectedDataset.requirements?.primaryKey || 'None'}</span>
          </div>
          <div className="p-2.5 bg-[var(--lm-bg-elevated)] rounded-xl border border-[var(--lm-border-default)]">
            <span className="text-[10px] text-[var(--lm-text-tertiary)] font-bold uppercase block">Timestamp Anchor</span>
            <span className="font-mono font-bold text-[var(--lm-text-primary)]">{selectedDataset.requirements?.timestampColumn || 'Cross-sectional'}</span>
          </div>
          <div className="p-2.5 bg-[var(--lm-bg-elevated)] rounded-xl border border-[var(--lm-border-default)]">
            <span className="text-[10px] text-[var(--lm-text-tertiary)] font-bold uppercase block">Currency & Scale</span>
            <span className="font-bold text-[var(--lm-text-primary)]">{selectedDataset.requirements?.currency || 'USD'} ({selectedDataset.requirements?.unitScale || '1.0'})</span>
          </div>
          <div className="p-2.5 bg-[var(--lm-bg-elevated)] rounded-xl border border-[var(--lm-border-default)]">
            <span className="text-[10px] text-[var(--lm-text-tertiary)] font-bold uppercase block">SHA-256 Fingerprint</span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 truncate block">{selectedDataset.sha256 || '9d10e...'}</span>
          </div>
        </div>
      </Card>

      {/* Quality Gates Section */}
      {selectedDataset.qualityChecks && selectedDataset.qualityChecks.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)]">
            Pre-Flight Quality Gate Verifications ({selectedDataset.qualityChecks.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedDataset.qualityChecks.map((qc, i) => (
              <div key={i} className="p-3 bg-[var(--lm-bg-elevated)] rounded-2xl border border-[var(--lm-border-default)] shadow-xs flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-xs text-[var(--lm-text-primary)]">{qc.rule}</span>
                  </div>
                  <p className="text-[11px] text-[var(--lm-text-secondary)] leading-tight">{qc.details}</p>
                </div>
                <StatusBadge variant={qc.status === 'passed' ? 'success' : 'warning'}>
                  {qc.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspect View Switcher: Schema Columns vs Tabular Records */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--lm-border-default)] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInspectView('columns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectView === 'columns'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-secondary)]'
            }`}
          >
            Column Schema ({selectedDataset.columns?.length || 0})
          </button>
          <button
            onClick={() => setInspectView('records')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectView === 'records'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-secondary)]'
            }`}
          >
            Tabular Records ({activeRows.length > 0 ? activeRows.length.toLocaleString() : selectedDataset.rowCount?.toLocaleString() || 0})
          </button>
        </div>

        {inspectView === 'columns' && (
          <div className="w-56">
            <Input
              label=""
              placeholder="Filter attributes..."
              value={columnFilter}
              onChange={(e) => setColumnFilter(e.target.value)}
              className="py-1 text-xs"
            />
          </div>
        )}

        {inspectView === 'records' && (
          <div className="flex items-center gap-2">
            <Input
              label=""
              placeholder="Filter row values..."
              value={recordFilter}
              onChange={(e) => {
                setRecordFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 text-xs w-48"
            />
            <div className="flex items-center gap-1 text-xs text-[var(--lm-text-secondary)]">
              <span className="hidden sm:inline">Show:</span>
              <select
                aria-label="Rows per page"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-xs font-semibold text-[var(--lm-text-primary)] cursor-pointer focus:outline-none"
              >
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: COLUMN SCHEMA & PROFILES */}
      {inspectView === 'columns' && (
        <div className="overflow-x-auto border border-[var(--lm-border-default)] rounded-2xl bg-[var(--lm-bg-elevated)] shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--lm-bg-secondary)] border-b border-[var(--lm-border-default)] text-[var(--lm-text-tertiary)] uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Attribute</th>
                <th className="px-3 py-3">Semantic Role</th>
                <th className="px-3 py-3">Inferred Type</th>
                <th className="px-3 py-3">Cardinality</th>
                <th className="px-4 py-3">Statistical Summary</th>
                <th className="px-4 py-3">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--lm-border-default)]">
              {filteredColumns.map((col) => (
                <tr key={col.name} className="hover:bg-[var(--lm-bg-secondary)]/70 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-[var(--lm-text-primary)]">
                    {col.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {col.semanticRole || 'dimension'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--lm-text-secondary)]">
                    {col.inferredType}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--lm-text-primary)]">
                    {col.uniqueCount} distinct
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--lm-text-secondary)]">
                    {col.inferredType === 'integer' || col.inferredType === 'float' ? (
                      <span>min: {col.min} | avg: {col.mean} | max: {col.max}</span>
                    ) : col.inferredType === 'date' ? (
                      <span>{col.earliestDate} → {col.latestDate}</span>
                    ) : (
                      <span>len: {col.minLength}..{col.maxLength} chars</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--lm-text-tertiary)] truncate max-w-xs">
                    {col.sampleValues.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: PAGINATED TABULAR RECORDS TABLE (W4) */}
      {inspectView === 'records' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-[var(--lm-border-default)] rounded-2xl bg-[var(--lm-bg-elevated)] shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[var(--lm-bg-secondary)] border-b border-[var(--lm-border-default)] text-[var(--lm-text-tertiary)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 text-[var(--lm-text-tertiary)]">#</th>
                  {headers.map((h) => {
                    const isSorted = sortCol === h;
                    return (
                      <th
                        key={h}
                        onClick={() => handleSort(h)}
                        className="px-3 py-2.5 text-[var(--lm-text-primary)] whitespace-nowrap cursor-pointer hover:bg-[var(--lm-bg-tertiary)] transition-colors select-none"
                        title={`Click to sort by ${h}`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{h}</span>
                          {isSorted && (
                            <span className="text-[#059669] font-bold">
                              {sortDir === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lm-border-default)]">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="p-8 text-center text-[var(--lm-text-tertiary)]">
                      {recordFilter.trim()
                        ? `No records match filter "${recordFilter}".`
                        : 'No cached row records in memory for this dataset.'}
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const rowNumber = (effectivePage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr key={idx} className="hover:bg-[var(--lm-bg-secondary)]/80 transition-colors">
                        <td className="px-3 py-2 text-[var(--lm-text-tertiary)] text-[10px]">{rowNumber}</td>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2 text-[var(--lm-text-primary)] whitespace-nowrap truncate max-w-xs">
                            {row[h] !== undefined ? row[h] : ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs px-1">
            <span className="text-[var(--lm-text-tertiary)] font-mono">
              {processedRows.length === 0
                ? 'Showing 0 records'
                : `Showing ${((effectivePage - 1) * rowsPerPage) + 1} - ${Math.min(effectivePage * rowsPerPage, processedRows.length)} of ${processedRows.length.toLocaleString()} records`}
              {recordFilter.trim() && ` (filtered from ${activeRows.length.toLocaleString()})`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={effectivePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl px-3"
                >
                  ← Previous
                </Button>
                <span className="px-3 py-1 bg-[var(--lm-bg-secondary)] font-bold rounded-xl text-[var(--lm-text-primary)] font-mono border border-[var(--lm-border-default)]">
                  Page {effectivePage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl px-3"
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
