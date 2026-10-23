'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge, Button } from '@/components/ui';
import {
  BarChart3Icon,
  PieChartIcon,
  TrendingUpIcon,
  DownloadIcon,
  SparklesIcon,
  RefreshCwIcon,
  TableIcon,
  XIcon,
} from '@/components/icons';

export type AggregationType = 'sum' | 'avg' | 'count' | 'max' | 'min';
export type ChartType = 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'scatter';
export type ColorPalette = 'indigo' | 'rose' | 'emerald' | 'amber' | 'cyan';

export interface PinnedWidget {
  id: string;
  title: string;
  dimensionCol: string;
  metricCol: string;
  aggType: AggregationType;
  chartType: ChartType;
  palette: ColorPalette;
  createdAt: string;
}

export function CustomChartBuilder() {
  const { activeRows, activeDataset } = useApp();

  const rows = activeRows || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Identify numeric columns
  const numericColumns = useMemo(() => {
    if (rows.length === 0) return [];
    return columns.filter((col) => {
      const sample = rows.slice(0, 20);
      const validNums = sample.filter((r) => {
        const val = parseFloat(r[col] || '');
        return !isNaN(val);
      });
      return validNums.length >= sample.length * 0.7;
    });
  }, [rows, columns]);

  // Identify categorical columns
  const categoricalColumns = useMemo(() => {
    if (rows.length === 0) return [];
    return columns.filter((col) => !numericColumns.includes(col));
  }, [rows, columns, numericColumns]);

  // State for user configuration
  const [dimensionCol, setDimensionCol] = useState<string>(categoricalColumns[0] || columns[0] || 'Region');
  const [metricCol, setMetricCol] = useState<string>(numericColumns[0] || columns[1] || 'ARR_USD');
  const [aggType, setAggType] = useState<AggregationType>('sum');
  const [chartType, setChartType] = useState<ChartType>('vertical_bar');
  const [palette, setPalette] = useState<ColorPalette>('indigo');
  const [limit, setLimit] = useState<number>(10);
  const [pinnedWidgets, setPinnedWidgets] = useState<PinnedWidget[]>([]);
  const [pinnedNotice, setPinnedNotice] = useState<string | null>(null);

  // Sync columns if data changes
  useEffect(() => {
    if (categoricalColumns.length > 0 && !categoricalColumns.includes(dimensionCol)) {
      setDimensionCol(categoricalColumns[0]);
    }
    if (numericColumns.length > 0 && !numericColumns.includes(metricCol)) {
      setMetricCol(numericColumns[0]);
    }
  }, [categoricalColumns, numericColumns]);

  // Load pinned widgets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lumetric_pinned_charts');
      if (saved) {
        setPinnedWidgets(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Compute Aggregates
  const aggregatedData = useMemo(() => {
    if (rows.length === 0 || !dimensionCol || !metricCol) return [];

    const groups: Record<string, number[]> = {};

    rows.forEach((r) => {
      const key = r[dimensionCol] || 'Unassigned';
      const val = parseFloat(r[metricCol] || '0');
      if (!groups[key]) groups[key] = [];
      if (!isNaN(val)) groups[key].push(val);
    });

    const results = Object.entries(groups).map(([category, vals]) => {
      let value = 0;
      if (vals.length > 0) {
        if (aggType === 'sum') value = vals.reduce((a, b) => a + b, 0);
        else if (aggType === 'avg') value = vals.reduce((a, b) => a + b, 0) / vals.length;
        else if (aggType === 'count') value = vals.length;
        else if (aggType === 'max') value = Math.max(...vals);
        else if (aggType === 'min') value = Math.min(...vals);
      }
      return {
        category,
        value: parseFloat(value.toFixed(2)),
        count: vals.length,
      };
    });

    results.sort((a, b) => b.value - a.value);
    return limit > 0 ? results.slice(0, limit) : results;
  }, [rows, dimensionCol, metricCol, aggType, limit]);

  const totalSum = useMemo(() => {
    return aggregatedData.reduce((acc, d) => acc + d.value, 0);
  }, [aggregatedData]);

  const maxVal = useMemo(() => {
    return aggregatedData.length > 0 ? Math.max(...aggregatedData.map((d) => d.value), 1) : 1;
  }, [aggregatedData]);

  // Color mapping
  const paletteColors = {
    indigo: { primary: '#6366F1', secondary: '#818CF8', light: '#EEF2FF', text: 'text-indigo-600' },
    rose: { primary: '#E11D48', secondary: '#FB7185', light: '#FFF1F2', text: 'text-rose-600' },
    emerald: { primary: '#10B981', secondary: '#34D399', light: '#ECFDF5', text: 'text-emerald-600' },
    amber: { primary: '#F59E0B', secondary: '#FBBF24', light: '#FFFBEB', text: 'text-amber-600' },
    cyan: { primary: '#06B6D4', secondary: '#38BDF8', light: '#ECFEFF', text: 'text-cyan-600' },
  }[palette];

  // Pin current widget
  const handlePinWidget = () => {
    const newWidget: PinnedWidget = {
      id: `widget-${Date.now()}`,
      title: `${aggType.toUpperCase()}(${metricCol}) by ${dimensionCol}`,
      dimensionCol,
      metricCol,
      aggType,
      chartType,
      palette,
      createdAt: new Date().toISOString(),
    };
    const updated = [newWidget, ...pinnedWidgets];
    setPinnedWidgets(updated);
    try {
      localStorage.setItem('lumetric_pinned_charts', JSON.stringify(updated));
      setPinnedNotice(`📌 Widget pinned to dashboard.`);
      setTimeout(() => setPinnedNotice(null), 3000);
    } catch {
      // ignore
    }
  };

  const handleRemovePinnedWidget = (id: string) => {
    const updated = pinnedWidgets.filter((w) => w.id !== id);
    setPinnedWidgets(updated);
    try {
      localStorage.setItem('lumetric_pinned_charts', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Export aggregates as CSV
  const handleExportCSV = () => {
    if (aggregatedData.length === 0) return;
    const csvContent = [
      `"${dimensionCol}","${metricCol} (${aggType})","Count"`,
      ...aggregatedData.map((d) => `"${d.category}",${d.value},${d.count}`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumetric_chart_${dimensionCol}_vs_${metricCol}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 p-0.5 flex items-center justify-center text-white shadow-sm">
              <BarChart3Icon className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--lm-text-primary)]">
              Interactive No-Code Chart &amp; Widget Builder
            </h2>
            <StatusBadge variant="info">Live Visualizer</StatusBadge>
          </div>
          <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
            Pick any dimension and metric from <span className="font-mono text-indigo-600 font-semibold">{activeDataset?.fileName || 'Active Dataset'}</span> to build custom charts in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pinnedNotice && (
            <span className="text-xs text-emerald-600 font-semibold animate-fade-in">
              {pinnedNotice}
            </span>
          )}
          <button
            onClick={handlePinWidget}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            📌 Pin Widget
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] transition-all cursor-pointer inline-flex items-center gap-1"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Visual Builder Controls Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
        {/* Dimension (X-Axis) */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] block mb-1">
            Dimension (X-Axis)
          </label>
          <select
            value={dimensionCol}
            onChange={(e) => setDimensionCol(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] outline-none"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Metric (Y-Axis) */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] block mb-1">
            Metric (Y-Axis)
          </label>
          <select
            value={metricCol}
            onChange={(e) => setMetricCol(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] outline-none"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Aggregation */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] block mb-1">
            Aggregation
          </label>
          <select
            value={aggType}
            onChange={(e) => setAggType(e.target.value as AggregationType)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] outline-none"
          >
            <option value="sum">Sum (Total)</option>
            <option value="avg">Average (Mean)</option>
            <option value="count">Count (Rows)</option>
            <option value="max">Max (Peak)</option>
            <option value="min">Min (Lowest)</option>
          </select>
        </div>

        {/* Chart Type */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] block mb-1">
            Chart Style
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] outline-none"
          >
            <option value="vertical_bar">Vertical Bar</option>
            <option value="horizontal_bar">Horizontal Ranked</option>
            <option value="line">Trend &amp; Area</option>
            <option value="donut">Donut / Ring</option>
          </select>
        </div>

        {/* Color Palette */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] block mb-1">
            Palette
          </label>
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as ColorPalette)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] outline-none"
          >
            <option value="indigo">Indigo Modern</option>
            <option value="rose">Rose Vibrant</option>
            <option value="emerald">Emerald Tech</option>
            <option value="amber">Amber Sunset</option>
            <option value="cyan">Cyan Neon</option>
          </select>
        </div>

        {/* Row Limit */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] block mb-1">
            Limit
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] outline-none"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>All Groups</option>
          </select>
        </div>
      </div>

      {/* 3. Live Generated Chart Canvas */}
      <div className="p-6 rounded-3xl border border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)]/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[var(--lm-text-primary)]">
              {aggType.toUpperCase()} of {metricCol} by {dimensionCol}
            </h3>
            <p className="text-xs text-[var(--lm-text-secondary)]">
              Aggregated across {aggregatedData.length} distinct categories • Total: <strong className="font-mono text-indigo-600">{totalSum.toLocaleString()}</strong>
            </p>
          </div>
          <span className="text-[11px] font-mono text-[var(--lm-text-tertiary)] bg-[var(--lm-bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--lm-border-default)]">
            {aggregatedData.length} Data Points
          </span>
        </div>

        {/* Chart View Selection */}
        {aggregatedData.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--lm-text-tertiary)]">
            No aggregate records available for selected combination.
          </div>
        ) : (
          <div className="pt-2">
            {/* TYPE 1: VERTICAL BAR CHART */}
            {chartType === 'vertical_bar' && (
              <div className="space-y-3">
                <div className="h-64 flex items-end gap-3 pt-6 pb-2 px-4 border-b border-[var(--lm-border-default)]">
                  {aggregatedData.map((d, i) => {
                    const heightPct = Math.max(8, Math.round((d.value / maxVal) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                          {d.category}: {d.value.toLocaleString()}
                        </div>
                        <div
                          className="w-full rounded-t-xl transition-all duration-500 hover:brightness-110 shadow-sm"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: paletteColors.primary,
                          }}
                        />
                        <span className="text-[10px] font-mono text-[var(--lm-text-tertiary)] truncate w-full text-center mt-2 group-hover:text-[var(--lm-text-primary)] font-medium">
                          {d.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 2: HORIZONTAL RANKED BARS */}
            {chartType === 'horizontal_bar' && (
              <div className="space-y-3">
                {aggregatedData.map((d, i) => {
                  const widthPct = Math.max(5, Math.round((d.value / maxVal) * 100));
                  const sharePct = totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-[var(--lm-text-primary)] font-semibold truncate max-w-sm">
                          #{i + 1} {d.category}
                        </span>
                        <span className="font-mono text-[var(--lm-text-primary)] font-bold">
                          {d.value.toLocaleString()} <span className="text-[10px] text-[var(--lm-text-tertiary)] font-normal">({sharePct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: paletteColors.primary,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TYPE 3: LINE & AREA TREND */}
            {chartType === 'line' && (
              <div className="w-full h-56 relative border border-[var(--lm-border-default)] rounded-2xl bg-[var(--lm-bg-elevated)] p-4">
                <svg viewBox="0 0 600 160" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="customChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={paletteColors.primary} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={paletteColors.primary} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  <line x1="30" y1="20" x2="570" y2="20" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                  <line x1="30" y1="80" x2="570" y2="80" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                  <line x1="30" y1="140" x2="570" y2="140" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />

                  {/* Points calculation */}
                  {(() => {
                    const step = 540 / Math.max(1, aggregatedData.length - 1);
                    const coords = aggregatedData.map((d, i) => {
                      const x = 30 + i * step;
                      const y = 140 - ((d.value / maxVal) * 110);
                      return [x, y];
                    });
                    const polyPoints = coords.map((c) => c.join(',')).join(' ');
                    const areaPoints = `${coords.map((c) => c.join(',')).join(' ')} 570,140 30,140`;

                    return (
                      <>
                        <polygon points={areaPoints} fill="url(#customChartGrad)" />
                        <polyline points={polyPoints} fill="none" stroke={paletteColors.primary} strokeWidth="3" />
                        {coords.map(([cx, cy], i) => (
                          <circle key={i} cx={cx} cy={cy} r="4.5" fill="#FFFFFF" stroke={paletteColors.primary} strokeWidth="2.5" />
                        ))}
                      </>
                    );
                  })()}
                </svg>
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--lm-text-tertiary)] mt-2">
                  <span>{aggregatedData[0]?.category}</span>
                  <span>{aggregatedData[Math.floor(aggregatedData.length / 2)]?.category}</span>
                  <span>{aggregatedData[aggregatedData.length - 1]?.category}</span>
                </div>
              </div>
            )}

            {/* TYPE 4: DONUT / RING */}
            {chartType === 'donut' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-5 flex items-center justify-center">
                  <div className="w-44 h-44 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeWidth="12" />
                      {(() => {
                        let accumulatedOffset = 0;
                        const colors = ['#6366F1', '#E11D48', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899'];
                        return aggregatedData.slice(0, 7).map((d, i) => {
                          const pct = totalSum > 0 ? d.value / totalSum : 0;
                          const dash = pct * 238;
                          const offset = accumulatedOffset;
                          accumulatedOffset -= dash;
                          return (
                            <circle
                              key={i}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke={colors[i % colors.length]}
                              strokeWidth="12"
                              strokeDasharray={`${dash} 238`}
                              strokeDashoffset={offset}
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-black font-mono text-[var(--lm-text-primary)]">
                        {aggregatedData.length} Segments
                      </span>
                      <span className="text-[10px] text-[var(--lm-text-tertiary)]">Distribution</span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-7 grid grid-cols-2 gap-2 text-xs">
                  {aggregatedData.slice(0, 8).map((d, i) => {
                    const colors = ['#6366F1', '#E11D48', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899'];
                    const share = totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) : 0;
                    return (
                      <div key={i} className="p-2 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="font-semibold text-[var(--lm-text-primary)] truncate">{d.category}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-indigo-600 font-bold">{d.value.toLocaleString()}</span>
                          <span className="text-[var(--lm-text-tertiary)]">{share}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. PINNED WIDGETS SECTION (If Any) */}
      {pinnedWidgets.length > 0 && (
        <div className="pt-4 border-t border-[var(--lm-border-default)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--lm-text-secondary)] flex items-center gap-1.5">
              <span>Pinned Dashboard Widgets ({pinnedWidgets.length})</span>
            </h4>
            <button
              onClick={() => {
                setPinnedWidgets([]);
                localStorage.removeItem('lumetric_pinned_charts');
              }}
              className="text-[11px] text-[var(--lm-text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer"
            >
              Clear All Pinned ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedWidgets.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs space-y-2 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--lm-text-primary)] truncate max-w-[200px]">
                    {w.title}
                  </span>
                  <button
                    onClick={() => handleRemovePinnedWidget(w.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--lm-text-tertiary)]">
                  <span className="capitalize">{w.chartType.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
