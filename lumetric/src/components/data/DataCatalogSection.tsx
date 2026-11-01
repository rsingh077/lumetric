'use client';

import React from 'react';
import { Card, Button, StatusBadge } from '@/components/ui';
import { DatabaseIcon, FileSpreadsheetIcon } from '@/components/icons';
import { DatasetProfile } from '@/types';

interface DataCatalogSectionProps {
  datasets: DatasetProfile[];
  activeDataset: DatasetProfile | null;
  selectedDataset: DatasetProfile | null;
  onSetActiveTab: (tab: 'intake' | 'wizard' | 'catalog' | 'inspect') => void;
  onSelectDataset: (ds: DatasetProfile) => void;
  onSetActiveDataset: (ds: DatasetProfile) => void;
  onDeleteDataset: (id: string) => void;
}

export function DataCatalogSection({
  datasets,
  activeDataset,
  selectedDataset,
  onSetActiveTab,
  onSelectDataset,
  onSetActiveDataset,
  onDeleteDataset,
}: DataCatalogSectionProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">
          Registered Governed Datasets ({datasets.length})
        </h2>
        <Button size="sm" onClick={() => onSetActiveTab('intake')}>
          + Intake New Document
        </Button>
      </div>

      {datasets.length === 0 ? (
        <Card padding="lg" className="text-center py-12 rounded-3xl">
          <DatabaseIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Datasets Ingested Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Begin by uploading a business document through the structured intake wizard.
          </p>
          <Button size="sm" onClick={() => onSetActiveTab('intake')}>
            Go to Document Intake
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {datasets.map((ds) => (
            <Card key={ds.id} padding="md" className="border-slate-200 rounded-2xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheetIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900">
                      {ds.fileName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                      {ds.version}
                    </span>
                    <StatusBadge variant="success" dot>
                      Validated
                    </StatusBadge>
                  </div>

                  <div className="text-xs text-blue-800 font-medium">
                    Grain: {ds.requirements?.businessGrain || 'Standard record'}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono text-[11px]">
                    <span>{ds.rowCount.toLocaleString()} rows</span>
                    <span>•</span>
                    <span>{ds.columnCount} columns</span>
                    <span>•</span>
                    <span>SHA: {ds.sha256 ? ds.sha256.substring(0, 10) + '...' : 'verified'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeDataset?.id === ds.id ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active in Studio
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSetActiveDataset(ds)}
                      className="text-xs"
                    >
                      Set as Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onSelectDataset(ds);
                      onSetActiveTab('inspect');
                    }}
                  >
                    Inspect Contract →
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onDeleteDataset(ds.id);
                    }}
                    className="text-red-600 hover:bg-red-50 text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
