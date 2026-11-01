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
  const [inspectView, setInspectView] = useState<'columns' | 'records'>('columns');

  // Client-side row pagination (50 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const filteredColumns = useMemo(() => {
    return (selectedDataset.columns || []).filter((c) =>
      c.name.toLowerCase().includes(columnFilter.toLowerCase())
    );
  }, [selectedDataset.columns, columnFilter]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return activeRows.slice(start, start + rowsPerPage);
  }, [activeRows, currentPage, rowsPerPage]);

  const headers = useMemo(() => {
    if (activeRows.length > 0) return Object.keys(activeRows[0]);
    if (selectedDataset.columns) return selectedDataset.columns.map((c) => c.name);
    return [];
  }, [activeRows, selectedDataset.columns]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metadata & Requirements Contract Banner */}
      <Card padding="md" className="bg-slate-50 border-slate-200 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900">
                {selectedDataset.fileName}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                {selectedDataset.version}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">
                {selectedDataset.requirements?.dataClassification || 'Internal'}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-1 font-semibold">
              Business Grain: {selectedDataset.requirements?.businessGrain}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 font-bold"
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
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Primary Key</span>
            <span className="font-mono font-bold text-slate-800">{selectedDataset.requirements?.primaryKey || 'None'}</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Timestamp Anchor</span>
            <span className="font-mono font-bold text-slate-800">{selectedDataset.requirements?.timestampColumn || 'Cross-sectional'}</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Currency & Scale</span>
            <span className="font-bold text-slate-800">{selectedDataset.requirements?.currency || 'USD'} ({selectedDataset.requirements?.unitScale || '1.0'})</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">SHA-256 Fingerprint</span>
            <span className="font-mono text-[10px] text-blue-600 truncate block">{selectedDataset.sha256 || '9d10e...'}</span>
          </div>
        </div>
      </Card>

      {/* Quality Gates Section */}
      {selectedDataset.qualityChecks && selectedDataset.qualityChecks.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pre-Flight Quality Gate Verifications ({selectedDataset.qualityChecks.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedDataset.qualityChecks.map((qc, i) => (
              <div key={i} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-xs text-slate-900">{qc.rule}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">{qc.details}</p>
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
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInspectView('columns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectView === 'columns'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Column Schema ({selectedDataset.columns?.length || 0})
          </button>
          <button
            onClick={() => setInspectView('records')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectView === 'records'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
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
      </div>

      {/* VIEW 1: COLUMN SCHEMA & PROFILES */}
      {inspectView === 'columns' && (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Attribute</th>
                <th className="px-3 py-3">Semantic Role</th>
                <th className="px-3 py-3">Inferred Type</th>
                <th className="px-3 py-3">Cardinality</th>
                <th className="px-4 py-3">Statistical Summary</th>
                <th className="px-4 py-3">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredColumns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-bold text-slate-900">
                    {col.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200/60">
                      {col.semanticRole || 'dimension'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">
                    {col.inferredType}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">
                    {col.uniqueCount} distinct
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                    {col.inferredType === 'integer' || col.inferredType === 'float' ? (
                      <span>min: {col.min} | avg: {col.mean} | max: {col.max}</span>
                    ) : col.inferredType === 'date' ? (
                      <span>{col.earliestDate} → {col.latestDate}</span>
                    ) : (
                      <span>len: {col.minLength}..{col.maxLength} chars</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 truncate max-w-xs">
                    {col.sampleValues.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: PAGINATED TABULAR RECORDS TABLE (TASK 12) */}
      {inspectView === 'records' && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 text-slate-400">#</th>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="p-8 text-center text-slate-400">
                      No cached row records in memory for this dataset.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const rowNumber = (currentPage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-slate-400 text-[10px]">{rowNumber}</td>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2 text-slate-800 whitespace-nowrap truncate max-w-xs">
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
          {activeRows.length > rowsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs px-1">
              <span className="text-slate-500 font-mono">
                Showing {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, activeRows.length)} of {activeRows.length.toLocaleString()} rows
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl px-3"
                >
                  ← Previous
                </Button>
                <span className="px-3 py-1 bg-slate-100 font-bold rounded-xl text-slate-700 font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl px-3"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
