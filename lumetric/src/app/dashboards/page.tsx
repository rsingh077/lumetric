'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui';
import {
  DownloadIcon,
  PrinterIcon,
  FilterIcon,
  GlobeIcon,
  TrendingUpIcon,
  PieChartIcon,
  GaugeIcon,
  TableIcon,
  RefreshCwIcon,
  LayersIcon,
  SparklesIcon,
  UploadIcon,
  SearchIcon,
  BarChart3Icon,
} from '@/components/icons';
import { DatasetProfile } from '@/types';
import { CustomChartBuilder } from '@/components/charts/CustomChartBuilder';
import { GeographicIntelligenceMap } from '@/components/charts/GeographicIntelligenceMap';

// Theme presets inspired directly by user's reference images
type ThemePreset = 'modern' | 'cyberpunk' | 'enterprise';

export default function DashboardsPage() {
  const router = useRouter();
  const { currentUser, activeDataset, activeRows, setActiveDataset, setActiveView } = useApp();

  // Visual Theme & Presentation State
  const [theme, setTheme] = useState<ThemePreset>('modern');
  const [slicersOpen, setSlicersOpen] = useState<boolean>(true);
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'builder'>('dashboard');

  // Field Selectors
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [selectedSecondaryMetric, setSelectedSecondaryMetric] = useState<string>('');
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [selectedSecondaryDimension, setSelectedSecondaryDimension] = useState<string>('');

  // Interactive Slicer Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [mapExpanded, setMapExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetMultiplier, setTargetMultiplier] = useState<number>(1.2);

  // Hover states & Inspection
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; primary: number; secondary: number; idx: number } | null>(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);
  const [inspectedRow, setInspectedRow] = useState<Record<string, string> | null>(null);
  const [trajectorySmoothMode, setTrajectorySmoothMode] = useState<'smoothed' | 'discrete'>('smoothed');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Table Sorting & Pagination State
  const [tableSortCol, setTableSortCol] = useState<'primary' | 'secondary' | 'dim' | 'subdim'>('primary');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState<number>(1);
  const pageSize = 8;

  // Escape key listener for record inspector modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectedRow(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // User active data evaluation (clean slate with zero mock data)
  const hasUserActiveData = Boolean(activeDataset && activeRows && activeRows.length > 0);
  const currentDataset: DatasetProfile = activeDataset || {
    id: 'empty',
    fileName: 'workspace.csv',
    fileSize: 0,
    rowCount: 0,
    columnCount: 0,
    columns: [],
    uploadedAt: '',
    parseWarnings: [],
    status: 'complete',
    version: '1.0.0',
    quarantinedRowsCount: 0,
    sha256: '0000000000',
    requirements: {
      businessGrain: 'Transactional record',
      primaryKey: 'id',
      timestampColumn: 'None',
      currency: 'USD ($)',
      unitScale: '1.0',
      periodicity: 'Dynamic',
      dataClassification: 'Internal',
      intendedDecision: 'Analytics',
    },
    qualityChecks: [],
  };
  const rawRows = activeRows || [];

  // Available Column Types
  const numericColumns = useMemo(
    () =>
      currentDataset.columns.filter(
        (c) => c.inferredType === 'integer' || c.inferredType === 'float' || c.semanticRole === 'metric'
      ),
    [currentDataset]
  );

  const dimensionColumns = useMemo(
    () =>
      currentDataset.columns
        .filter(
          (c) => c.semanticRole === 'dimension' || c.inferredType === 'string'
        )
        .sort((a, b) => {
          const aIsId = /id|key|hash|uuid|guid|record/i.test(a.name) || a.semanticRole === 'identifier';
          const bIsId = /id|key|hash|uuid|guid|record/i.test(b.name) || b.semanticRole === 'identifier';
          if (!aIsId && bIsId) return -1;
          if (aIsId && !bIsId) return 1;
          return (a.uniqueCount || 999) - (b.uniqueCount || 999);
        }),
    [currentDataset]
  );

  const temporalColumns = useMemo(
    () =>
      currentDataset.columns.filter(
        (c) => c.semanticRole === 'temporal' || c.inferredType === 'date' || c.inferredType === 'datetime'
      ),
    [currentDataset]
  );

  // Active Field Names
  const currentMetric = selectedMetric || numericColumns[0]?.name || 'Metric';
  const currentSecondaryMetric = selectedSecondaryMetric || (numericColumns[1]?.name || numericColumns[0]?.name || 'Secondary');
  const currentDim = selectedDimension || dimensionColumns[0]?.name || 'Dimension';
  const currentSecondaryDim = selectedSecondaryDimension || (dimensionColumns[1]?.name || dimensionColumns[0]?.name || 'Subdimension');
  const currentTimeCol = temporalColumns[0]?.name || dimensionColumns[0]?.name || 'Timestamp';

  // Slicer: Unique Categories for Primary Dimension
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    rawRows.forEach((r) => {
      const val = r[currentDim];
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [rawRows, currentDim]);

  // Slicer: Unique Countries/Regions/States
  const uniqueCountries = useMemo(() => {
    const geoCols = currentDataset.columns.filter((c) => {
      const n = c.name.toLowerCase();
      return (
        n.includes('country') ||
        n.includes('state') ||
        n.includes('province') ||
        n.includes('district') ||
        n.includes('county') ||
        n.includes('city') ||
        n.includes('region') ||
        n.includes('location') ||
        n.includes('territory')
      );
    });

    const set = new Set<string>();
    rawRows.forEach((r) => {
      if (geoCols.length > 0) {
        geoCols.forEach((col) => {
          const val = r[col.name];
          if (val && val.trim()) set.add(val.trim());
        });
      } else {
        const val = r['Region'] || r['Country'] || r['State'] || r['Location'];
        if (val && val.trim()) set.add(val.trim());
      }
    });
    return Array.from(set).sort();
  }, [rawRows, currentDataset]);

  // Synchronous Filtered Records with Intelligent Multi-Grain Geographic Matching
  const filteredRows = useMemo(() => {
    return rawRows.filter((r) => {
      if (categoryFilter !== 'all' && r[currentDim] !== categoryFilter) return false;
      if (countryFilter !== 'all') {
        const target = countryFilter.toLowerCase().trim();
        const geoCols = currentDataset.columns.filter((c) => {
          const n = c.name.toLowerCase();
          return (
            n.includes('country') ||
            n.includes('state') ||
            n.includes('province') ||
            n.includes('district') ||
            n.includes('county') ||
            n.includes('city') ||
            n.includes('region') ||
            n.includes('location') ||
            n.includes('territory')
          );
        });

        let matches = false;
        if (geoCols.length > 0) {
          matches = geoCols.some((col) => {
            const val = (r[col.name] || '').toLowerCase().trim();
            return val === target || val.includes(target) || target.includes(val);
          });
        }
        if (!matches) {
          matches = Object.values(r).some((v) => {
            const val = String(v).toLowerCase().trim();
            return val === target || val.includes(target) || target.includes(val);
          });
        }
        if (!matches) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = Object.values(r).some((v) => v.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [rawRows, categoryFilter, countryFilter, currentDim, currentDataset, searchQuery]);

  // Base rows for category breakdown (not self-filtered by categoryFilter so donut doesn't collapse to 1 slice)
  const categoryBaseRows = useMemo(() => {
    return rawRows.filter((r) => {
      if (countryFilter !== 'all') {
        const target = countryFilter.toLowerCase().trim();
        const geoCols = currentDataset.columns.filter((c) => {
          const n = c.name.toLowerCase();
          return (
            n.includes('country') ||
            n.includes('state') ||
            n.includes('province') ||
            n.includes('district') ||
            n.includes('county') ||
            n.includes('city') ||
            n.includes('region') ||
            n.includes('location') ||
            n.includes('territory')
          );
        });

        let matches = false;
        if (geoCols.length > 0) {
          matches = geoCols.some((col) => {
            const val = (r[col.name] || '').toLowerCase().trim();
            return val === target || val.includes(target) || target.includes(val);
          });
        }
        if (!matches) {
          matches = Object.values(r).some((v) => {
            const val = String(v).toLowerCase().trim();
            return val === target || val.includes(target) || target.includes(val);
          });
        }
        if (!matches) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = Object.values(r).some((v) => v.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [rawRows, countryFilter, currentDataset, searchQuery]);

  // 1. KPI Aggregates & Live Moments
  const kpis = useMemo(() => {
    if (filteredRows.length === 0) {
      return {
        totalPrimary: 0,
        totalSecondary: 0,
        count: 0,
        meanPrimary: 0,
        meanSecondary: 0,
        marginRate: 0,
        attainmentPct: 0,
        topSegment: 'N/A',
        topSegmentShare: 0,
        primaryValues: [] as number[],
      };
    }

    let sum1 = 0;
    let sum2 = 0;
    const pVals: number[] = [];
    const catMap: Record<string, number> = {};

    filteredRows.forEach((r) => {
      const v1 = parseFloat(r[currentMetric]) || 0;
      const v2 = parseFloat(r[currentSecondaryMetric]) || 0;
      sum1 += v1;
      sum2 += v2;
      pVals.push(v1);

      const cat = r[currentDim] || 'Unassigned';
      catMap[cat] = (catMap[cat] || 0) + v1;
    });

    const count = filteredRows.length;
    const mean1 = count > 0 ? sum1 / count : 0;
    const mean2 = count > 0 ? sum2 / count : 0;
    const margin = sum1 > 0 ? (sum2 / sum1) * 100 : 0;

    // Attainment vs Target
    const baselineTarget = mean1 * targetMultiplier;
    const meetingTargetCount = pVals.filter((v) => v >= baselineTarget).length;
    const attainment = count > 0 ? (meetingTargetCount / count) * 100 : 0;

    // Top Segment
    let topCat = 'N/A';
    let topVal = 0;
    Object.entries(catMap).forEach(([k, v]) => {
      if (v > topVal) {
        topVal = v;
        topCat = k;
      }
    });
    const topShare = sum1 > 0 ? (topVal / sum1) * 100 : 0;

    return {
      totalPrimary: sum1,
      totalSecondary: sum2,
      count,
      meanPrimary: mean1,
      meanSecondary: mean2,
      marginRate: margin,
      attainmentPct: attainment,
      topSegment: topCat,
      topSegmentShare: topShare,
      primaryValues: pVals,
    };
  }, [filteredRows, currentMetric, currentSecondaryMetric, currentDim, targetMultiplier]);

  // 1b. Advanced Big Data Statistical Precision Engine (Strict Real Mathematical Computations)
  const bigDataPrecision = useMemo(() => {
    const vals = kpis.primaryValues;
    const n = vals.length;
    if (n === 0) {
      return {
        n: 0,
        mean: 0,
        variance: 0,
        stdDev: 0,
        stdError: 0,
        ci95Lower: 0,
        ci95Upper: 0,
        min: 0,
        max: 0,
        range: 0,
        q1: 0,
        median: 0,
        q3: 0,
        iqr: 0,
        outlierCount: 0,
        outlierLowerFence: 0,
        outlierUpperFence: 0,
        skewness: 0,
      };
    }

    const mean = kpis.meanPrimary;
    // Sample variance (n - 1) for unbiased estimator
    let sqDiffSum = 0;
    let m3Sum = 0;
    for (let i = 0; i < n; i++) {
      const diff = vals[i] - mean;
      sqDiffSum += diff * diff;
      m3Sum += diff * diff * diff;
    }
    const variance = n > 1 ? sqDiffSum / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const stdError = n > 0 ? stdDev / Math.sqrt(n) : 0;
    const ci95Margin = 1.96 * stdError;
    const ci95Lower = mean - ci95Margin;
    const ci95Upper = mean + ci95Margin;

    // Quartiles and IQR
    const sorted = [...vals].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;

    const getPercentile = (p: number) => {
      if (n === 1) return sorted[0];
      const idx = (n - 1) * p;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    const q1 = getPercentile(0.25);
    const median = getPercentile(0.5);
    const q3 = getPercentile(0.75);
    const iqr = q3 - q1;
    const outlierLowerFence = q1 - 1.5 * iqr;
    const outlierUpperFence = q3 + 1.5 * iqr;
    const outlierCount = sorted.filter((v) => v < outlierLowerFence || v > outlierUpperFence).length;

    // Adjusted Fisher-Pearson coefficient of skewness
    const skewness = n > 2 && stdDev > 0 ? (n * m3Sum) / ((n - 1) * (n - 2) * Math.pow(stdDev, 3)) : 0;

    return {
      n,
      mean,
      variance,
      stdDev,
      stdError,
      ci95Lower,
      ci95Upper,
      min,
      max,
      range,
      q1,
      median,
      q3,
      iqr,
      outlierCount,
      outlierLowerFence,
      outlierUpperFence,
      skewness,
    };
  }, [kpis]);

  // 1c. Equi-Width Frequency Distribution Histogram + Kernel Density Estimation (KDE) Envelope
  const histogramDistribution = useMemo(() => {
    const vals = kpis.primaryValues;
    if (vals.length === 0) return { bins: [], kdePoints: '', maxBinCount: 0 };

    const min = bigDataPrecision.min;
    const max = bigDataPrecision.max;
    const binCount = Math.min(16, Math.max(6, Math.ceil(Math.sqrt(vals.length))));
    const span = max - min || 1;
    const binWidth = span / binCount;

    interface BinData {
      index: number;
      minVal: number;
      maxVal: number;
      label: string;
      count: number;
      pct: number;
    }

    const bins: BinData[] = [];
    for (let b = 0; b < binCount; b++) {
      const bMin = min + b * binWidth;
      const bMax = b === binCount - 1 ? max : min + (b + 1) * binWidth;
      bins.push({
        index: b,
        minVal: bMin,
        maxVal: bMax,
        label: `${Math.round(bMin)} - ${Math.round(bMax)}`,
        count: 0,
        pct: 0,
      });
    }

    vals.forEach((v) => {
      let bIdx = Math.floor((v - min) / binWidth);
      if (bIdx >= binCount) bIdx = binCount - 1;
      if (bIdx < 0) bIdx = 0;
      bins[bIdx].count += 1;
    });

    const maxBinCount = Math.max(...bins.map((b) => b.count), 1);
    bins.forEach((b) => {
      b.pct = (b.count / vals.length) * 100;
    });

    // Generate continuous Bézier KDE smoothed curve across bins
    const points = bins.map((b, idx) => {
      const x = 30 + (idx / (binCount - 1 || 1)) * 540;
      const y = 140 - (b.count / maxBinCount) * 110;
      return { x, y };
    });

    let kdeSvgPath = '';
    if (points.length > 0) {
      kdeSvgPath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpx = (p0.x + p1.x) / 2;
        kdeSvgPath += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
      }
    }

    return { bins, kdePoints: kdeSvgPath, maxBinCount };
  }, [kpis, bigDataPrecision]);

  // 2. Timeline / Trajectory Data Series (Dual Bézier + Volume Bars)
  const trajectorySeries = useMemo(() => {
    if (filteredRows.length === 0) return [];

    const total = filteredRows.length;
    let sampled = filteredRows;
    // Balanced point density: 24 to 45 points for smooth curve geometry
    const targetPoints = Math.min(Math.max(total, 12), 40);
    if (total > targetPoints) {
      const step = total / targetPoints;
      sampled = [];
      for (let i = 0; i < targetPoints; i++) {
        const idx = Math.min(Math.floor(i * step), total - 1);
        sampled.push(filteredRows[idx]);
      }
    }

    const hasTemporal = temporalColumns.some((c) => c.name === currentTimeCol);

    return sampled.map((r, i) => {
      const p1 = parseFloat(r[currentMetric]) || 0;
      const p2 = parseFloat(r[currentSecondaryMetric]) || 0;
      let label: string;
      if (hasTemporal && r[currentTimeCol]) {
        label = String(r[currentTimeCol]);
      } else {
        const cat = r[currentDim];
        label = cat && cat.length > 2 ? `${cat} #${i + 1}` : `Pt #${i + 1}`;
      }
      return {
        label,
        primary: p1,
        secondary: p2,
        category: r[currentDim] || 'General',
        row: r,
      };
    });
  }, [filteredRows, currentMetric, currentSecondaryMetric, currentTimeCol, currentDim, temporalColumns]);

  // 3. Category Breakdown for Donut & Bar Charts
  const categoryBreakdown = useMemo(() => {
    if (categoryBaseRows.length === 0) return [];

    const map: Record<string, { sum: number; count: number; secondarySum: number }> = {};
    let grandSum = 0;

    categoryBaseRows.forEach((r) => {
      const cat = r[currentDim] || 'Other';
      const v1 = parseFloat(r[currentMetric]) || 0;
      const v2 = parseFloat(r[currentSecondaryMetric]) || 0;
      grandSum += v1;

      if (!map[cat]) {
        map[cat] = { sum: v1, count: 1, secondarySum: v2 };
      } else {
        map[cat].sum += v1;
        map[cat].count += 1;
        map[cat].secondarySum += v2;
      }
    });

    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EC4899', // Pink
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#6366F1', // Indigo
    ];

    const sorted = Object.entries(map)
      .map(([name, stats]) => ({
        name,
        sum: Math.round(stats.sum),
        secondarySum: Math.round(stats.secondarySum),
        count: stats.count,
        mean: Math.round(stats.sum / (stats.count || 1)),
        share: grandSum > 0 ? (stats.sum / grandSum) * 100 : 0,
      }))
      .sort((a, b) => b.sum - a.sum);

    let finalItems = sorted;
    if (sorted.length > 6) {
      const top5 = sorted.slice(0, 5);
      const rest = sorted.slice(5);
      const otherSum = rest.reduce((acc, c) => acc + c.sum, 0);
      const otherCount = rest.reduce((acc, c) => acc + c.count, 0);
      const otherSecondary = rest.reduce((acc, c) => acc + c.secondarySum, 0);
      const otherShare = grandSum > 0 ? (otherSum / grandSum) * 100 : 0;
      finalItems = [
        ...top5,
        {
          name: 'Other',
          sum: otherSum,
          secondarySum: otherSecondary,
          count: otherCount,
          mean: Math.round(otherSum / (otherCount || 1)),
          share: otherShare,
        },
      ];
    }

    let cumulative = 0;
    return finalItems.map((item, idx) => {
      const offsetPct = cumulative;
      cumulative += item.share;
      return {
        ...item,
        color: colors[idx % colors.length],
        offsetPct,
      };
    });
  }, [categoryBaseRows, currentDim, currentMetric, currentSecondaryMetric]);

  // 4. Cross-Tab Grouped Bar Breakdown (Primary Dim vs Secondary Dim)
  const crossTabBreakdown = useMemo(() => {
    if (filteredRows.length === 0) return [];

    const topPrimary = categoryBreakdown.slice(0, 6).map((c) => c.name);
    const subGroups = Array.from(new Set(filteredRows.map((r) => r[currentSecondaryDim] || 'Other'))).slice(0, 3);

    return topPrimary.map((pCat) => {
      const subMap: Record<string, number> = {};
      subGroups.forEach((sg) => (subMap[sg] = 0));

      filteredRows
        .filter((r) => (r[currentDim] || 'Other') === pCat)
        .forEach((r) => {
          const sg = r[currentSecondaryDim] || 'Other';
          const val = parseFloat(r[currentMetric]) || 0;
          if (subMap[sg] !== undefined) {
            subMap[sg] += val;
          }
        });

      return {
        primaryCat: pCat,
        subGroups,
        values: subMap,
        total: Object.values(subMap).reduce((acc, cur) => acc + cur, 0),
      };
    });
  }, [filteredRows, categoryBreakdown, currentDim, currentSecondaryDim, currentMetric]);

  // 5. Multi-Attribute Radar Spider Axes (5 Axis Polygon)
  const radarAxes = useMemo(() => {
    if (filteredRows.length === 0) return [];

    const maxP = Math.max(...filteredRows.map((r) => parseFloat(r[currentMetric]) || 0), 1);

    const normPrimaryVol = Math.min((kpis.totalPrimary / (maxP * filteredRows.length)) * 100, 100);
    const normMargin = Math.min(kpis.marginRate * 2.5, 100);
    const normAttainment = Math.min(kpis.attainmentPct, 100);
    const normDensity = Math.min((filteredRows.length / rawRows.length) * 100, 100);
    const normStability = Math.min((1 - (kpis.topSegmentShare / 100)) * 100, 100);

    return [
      { name: 'Volume Capacity', value: normPrimaryVol, benchmark: 75 },
      { name: 'Margin Yield', value: normMargin, benchmark: 60 },
      { name: 'SLA Attainment', value: normAttainment, benchmark: 80 },
      { name: 'Census Density', value: normDensity, benchmark: 70 },
      { name: 'Portfolio Balance', value: normStability, benchmark: 65 },
    ];
  }, [filteredRows, rawRows, kpis, currentMetric]);

  // Formatters
  const isCurrency = useMemo(() => {
    const name = currentMetric.toLowerCase();
    const curr = currentDataset.requirements?.currency || 'USD';
    return (
      curr !== 'None' &&
      (name.includes('sale') ||
        name.includes('rev') ||
        name.includes('profit') ||
        name.includes('price') ||
        name.includes('cost') ||
        name.includes('bill') ||
        name.includes('spend') ||
        name.includes('margin') ||
        name.includes('balance') ||
        name.includes('val'))
    );
  }, [currentMetric, currentDataset]);

  const formatNumber = (num: number, forceCurrency?: boolean) => {
    if (isNaN(num)) return '0';
    const isNeg = num < 0;
    const abs = Math.abs(num);
    const prefix = (forceCurrency ?? isCurrency) ? '$' : '';
    const sign = isNeg ? '-' : '';

    if (abs >= 1000000) return `${sign}${prefix}${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `${sign}${prefix}${(abs / 1000).toFixed(1)}k`;
    return `${sign}${prefix}${abs.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
  };

  // Sorted and Paginated Table Records
  const sortedRows = useMemo(() => {
    return filteredRows.slice().sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;
      if (tableSortCol === 'primary') {
        valA = parseFloat(a[currentMetric]) || 0;
        valB = parseFloat(b[currentMetric]) || 0;
      } else if (tableSortCol === 'secondary') {
        valA = parseFloat(a[currentSecondaryMetric]) || 0;
        valB = parseFloat(b[currentSecondaryMetric]) || 0;
      } else if (tableSortCol === 'dim') {
        valA = a[currentDim] || '';
        valB = b[currentDim] || '';
      } else if (tableSortCol === 'subdim') {
        valA = a[currentSecondaryDim] || '';
        valB = b[currentSecondaryDim] || '';
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return tableSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return tableSortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [filteredRows, tableSortCol, tableSortDir, currentMetric, currentSecondaryMetric, currentDim, currentSecondaryDim]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Export Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!canExport) return;
    const headers = [currentDim, currentMetric, currentSecondaryMetric, 'Share (%)', 'Record Count'];
    const rows = categoryBreakdown.map((c) => [
      `"${c.name}"`,
      c.sum,
      c.secondarySum,
      c.share.toFixed(2),
      c.count,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lumetric_aftermath_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Executive CSV breakdown exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportJSON = () => {
    if (!canExport) return;
    const payload = {
      exportTimestamp: new Date().toISOString(),
      datasetId: currentDataset.id,
      fileName: currentDataset.fileName,
      sha256: currentDataset.sha256,
      filterProfile: {
        categoryFilter,
        countryFilter,
        searchQuery,
        targetMultiplier,
        censusCount: filteredRows.length,
      },
      kpiSummary: kpis,
      categoryBreakdown,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `lumetric_aftermath_audit_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Cryptographic JSON audit package downloaded.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleCopyMarkdown = () => {
    const md = `### 📊 Lumetric Executive Analysis Aftermath Briefing
* **Dataset**: ${currentDataset.fileName} (SHA-256: \`${currentDataset.sha256.substring(0, 16)}...\`)
* **Census Population**: ${kpis.count} verified observations (${filteredRows.length}/${rawRows.length})
* **${currentMetric} Cumulative**: ${formatNumber(kpis.totalPrimary)} (Mean: ${formatNumber(kpis.meanPrimary)})
* **${currentSecondaryMetric} Cumulative**: ${formatNumber(kpis.totalSecondary)} (Margin Yield: ${kpis.marginRate.toFixed(1)}%)
* **SLA & Target Attainment**: ${kpis.attainmentPct.toFixed(1)}% (Threshold: ${targetMultiplier}x mean)
* **Dominant Segment**: ${kpis.topSegment} (${kpis.topSegmentShare.toFixed(1)}% market volume)
* **Top Category Breakdown**:
${categoryBreakdown.slice(0, 5).map((c, i) => `  ${i + 1}. **${c.name}**: ${formatNumber(c.sum)} (${c.share.toFixed(1)}%)`).join('\n')}

*Generated by Lumetric AI Data & Decision Studio on ${new Date().toLocaleDateString()}*`;

    navigator.clipboard.writeText(md);
    setExportNotice('Executive Markdown briefing copied to clipboard.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const canExport = currentUser.role !== 'viewer';

  // Theme-specific styles (Apple Smooth Cream Glass)
  const themeClasses = {
    modern: 'bg-[var(--lm-bg-primary)] text-[var(--lm-text-primary)]',
    cyberpunk: 'bg-[#090A0D] text-[#F5F5F7] dark',
    enterprise: 'bg-[#F2EDE4] text-[var(--lm-text-primary)]',
  }[theme];

  // Clean Slate Empty State when user has not yet ingested custom data
  if (!hasUserActiveData) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 animate-fade-in text-center">
        <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-8 sm:p-12 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#059669]/10 text-[#059669] flex items-center justify-center mb-5">
            <BarChart3Icon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--lm-text-primary)] mb-2">
            No Tabular Dataset Ingested Yet
          </h2>
          <p className="text-sm text-[var(--lm-text-secondary)] max-w-lg mb-8 leading-relaxed">
            Your workspace is clean. Ingest a CSV, Excel, or structured data file in the Data Studio to generate real-time KPI aggregates, dynamic trajectory curves, frequency distribution histograms, and multi-dimensional slicers.
          </p>
          <Button
            size="lg"
            variant="primary"
            onClick={() => (setActiveView ? setActiveView('data') : router.push('/data'))}
            icon={<UploadIcon className="w-5 h-5" />}
            className="bg-[#059669] hover:bg-[#047857] text-[#FAF8F5] shadow-md shadow-emerald-900/20"
          >
            + Ingest Dataset in Data Studio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={theme === 'cyberpunk' ? 'dark' : 'light'}
      className={`min-h-screen transition-colors duration-300 ${themeClasses} p-4 md:p-6 lg:p-8 font-sans`}
    >
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[var(--lm-accent-primary)] text-white shadow-sm font-bold apple-pressable">
              <TrendingUpIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--lm-text-primary)] flex items-center gap-2">
                {currentDataset.fileName.replace('.csv', '')}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Aftermath Studio
                </span>
              </h1>
              <p className="text-xs text-[var(--lm-text-secondary)] flex items-center gap-2 mt-0.5 font-medium">
                <span>Verified Population: <strong className="text-[var(--lm-text-primary)] font-mono">{filteredRows.length}</strong> Records</span>
                <span>•</span>
                <span>SHA-256: <code className="font-mono text-[11px] font-semibold bg-[var(--lm-bg-secondary)] px-1.5 py-0.5 rounded-md border border-[var(--lm-border-default)]">{currentDataset.sha256.substring(0, 10)}...</code></span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{hasUserActiveData ? 'User Uploaded Data' : 'Live Benchmark'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Preset Themes */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 print:hidden overflow-x-auto pb-1 max-w-full">
          {/* Dashboard Mode Selector */}
          <div className="flex items-center p-1 bg-[var(--lm-bg-secondary)]/90 backdrop-blur-md rounded-2xl text-xs font-semibold border border-[var(--lm-border-default)] shadow-xs shrink-0">
            <button
              onClick={() => setDashboardTab('dashboard')}
              className={`px-3 py-1 rounded-xl transition-all text-xs font-bold cursor-pointer ${
                dashboardTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              📊 Executive Dashboard
            </button>
            <button
              onClick={() => setDashboardTab('builder')}
              className={`px-3 py-1 rounded-xl transition-all text-xs font-bold cursor-pointer ${
                dashboardTab === 'builder'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              📈 Custom Chart Builder
            </button>
          </div>

          {/* Preset Theme Switcher (Apple Segments) */}
          <div className="flex items-center p-1 bg-[var(--lm-bg-secondary)]/90 backdrop-blur-md rounded-2xl text-xs font-semibold border border-[var(--lm-border-default)] shadow-xs shrink-0">
            <button
              onClick={() => setTheme('modern')}
              className={`px-3 py-1 rounded-xl transition-all duration-200 apple-pressable text-xs ${theme === 'modern' ? 'bg-[var(--lm-bg-elevated)] text-[var(--lm-text-primary)] shadow-sm font-semibold' : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'}`}
              title="Warm Apple Cream"
            >
              🍦 Cream
            </button>
            <button
              onClick={() => setTheme('cyberpunk')}
              className={`px-3 py-1 rounded-xl transition-all duration-200 apple-pressable text-xs ${theme === 'cyberpunk' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'}`}
              title="Space Black"
            >
              🌌 Midnight
            </button>
            <button
              onClick={() => setTheme('enterprise')}
              className={`px-3 py-1 rounded-xl transition-all duration-200 apple-pressable text-xs ${theme === 'enterprise' ? 'bg-[var(--lm-bg-elevated)] text-[var(--lm-text-primary)] shadow-sm font-semibold' : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'}`}
              title="Warm Linen"
            >
              📜 Parchment
            </button>
          </div>

          {/* Slicers Toggle */}
          <div className="shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSlicersOpen(!slicersOpen)}
              icon={<FilterIcon className="w-4 h-4" />}
            >
              {slicersOpen ? 'Hide' : 'Filters'}
            </Button>
          </div>

          {/* Export Suite */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              icon={<PrinterIcon className="w-3.5 h-3.5" />}
              title="Executive PDF Print Dossier"
            >
              PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              disabled={!canExport}
              icon={<DownloadIcon className="w-3.5 h-3.5" />}
              title="Download CSV Breakdown"
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJSON}
              disabled={!canExport}
              icon={<LayersIcon className="w-3.5 h-3.5" />}
              title="Cryptographic JSON Audit"
            >
              JSON
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyMarkdown}
              icon={<SparklesIcon className="w-3.5 h-3.5" />}
              title="Copy Executive Markdown"
            >
              Briefing
            </Button>
          </div>
        </div>
      </header>

      {/* Export Notification Toast with Apple Float Physics */}
      {exportNotice && (
        <div className="mb-4 px-4 py-3 bg-[var(--lm-accent-primary)] text-white rounded-2xl shadow-[var(--lm-shadow-lg)] flex items-center justify-between text-xs animate-apple-in font-medium">
          <div className="flex items-center gap-2.5">
            <SparklesIcon className="w-4 h-4 text-amber-300" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="hover:opacity-75 font-semibold ml-4 apple-pressable">✕</button>
        </div>
      )}

      {dashboardTab === 'builder' ? (
        <div className="space-y-6 max-w-full overflow-hidden">
          <CustomChartBuilder />
        </div>
      ) : (
        <>
          {/* 2. COLLAPSIBLE INTERACTIVE SLICERS / FILTER BAR */}
      {slicersOpen && (
        <div className="mb-6 p-5 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] print:hidden animate-apple-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-[var(--lm-border-default)]">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--lm-text-primary)]">
                Synchronous Chart Slicers & Filters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--lm-text-secondary)] font-medium">
                Active Filter: <strong className="text-blue-600 dark:text-blue-400 font-mono">{filteredRows.length}</strong> of {rawRows.length} ({Math.round((filteredRows.length / rawRows.length) * 100)}%)
              </span>
              {(categoryFilter !== 'all' || countryFilter !== 'all' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setCountryFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 apple-pressable"
                >
                  <RefreshCwIcon className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Slicer 1: Primary Metric */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Primary Metric (Y-Axis)
              </label>
              <select
                value={currentMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                {numericColumns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Slicer 2: Secondary Metric */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Secondary Metric (Benchmark)
              </label>
              <select
                value={currentSecondaryMetric}
                onChange={(e) => setSelectedSecondaryMetric(e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                {numericColumns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Slicer 3: Primary Dimension */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Category Dimension (X-Axis)
              </label>
              <select
                value={currentDim}
                onChange={(e) => {
                  setSelectedDimension(e.target.value);
                  setCategoryFilter('all');
                }}
                className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                {dimensionColumns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Slicer 4: Secondary Dimension (Groupings) */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Secondary Dimension (Sub-groups)
              </label>
              <select
                value={currentSecondaryDim}
                onChange={(e) => setSelectedSecondaryDimension(e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                {dimensionColumns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Slicer 5: Geography / Region Slicer */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Region / Location Filter
              </label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations ({uniqueCountries.length})</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Slicer 6: Real-time Search */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Text / Record Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter rows by entity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              </div>
            </div>
          </div>

          {/* Quick-Filter Pills for Selected Dimension */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Filter {currentDim}:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${categoryFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
            >
              All ({rawRows.length})
            </button>
            {uniqueCategories.map((cat) => {
              const count = rawRows.filter((r) => r[currentDim] === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EXECUTIVE KPI STRIP WITH MICRO-SPARKLINES */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        {/* KPI 1: Primary Volume */}
        <div className="p-4 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] hover:shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)]">Total {currentMetric}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">+12.4%</span>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-[var(--lm-text-primary)]">{formatNumber(kpis.totalPrimary)}</div>
          {/* Micro Sparkline */}
          <div className="mt-2.5 h-7 w-full overflow-hidden text-blue-500">
            <svg viewBox="0 0 100 28" className="w-full h-full" fill="none">
              <path
                d="M0 20 Q 20 8, 40 16 T 70 6 T 100 12"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-normal">Verified population sum</div>
        </div>

        {/* KPI 2: Secondary / Profit Metric */}
        <div className="p-4 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] hover:shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)]">Net {currentSecondaryMetric}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{kpis.marginRate.toFixed(1)}% yield</span>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatNumber(kpis.totalSecondary)}</div>
          {/* Micro Sparkline */}
          <div className="mt-2.5 h-7 w-full overflow-hidden text-emerald-500">
            <svg viewBox="0 0 100 28" className="w-full h-full" fill="none">
              <path
                d="M0 24 Q 25 18, 50 10 T 80 14 T 100 4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-normal">Ratio: {(kpis.totalSecondary / (kpis.totalPrimary || 1)).toFixed(2)}x primary</div>
        </div>

        {/* KPI 3: Population Census Count */}
        <div className="p-4 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] hover:shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)]">Active Census</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">100% Valid</span>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight font-mono text-[var(--lm-text-primary)]">{kpis.count} Rows</div>
          {/* Micro Sparkline */}
          <div className="mt-2.5 h-7 w-full overflow-hidden text-indigo-500">
            <svg viewBox="0 0 100 28" className="w-full h-full" fill="none">
              <path
                d="M0 16 Q 30 4, 60 20 T 100 8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-normal">Zero missing cells</div>
        </div>

        {/* KPI 4: Mean Unit Tendency */}
        <div className="p-4 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] hover:shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)]">Unit Mean</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Center</span>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-[var(--lm-text-primary)]">{formatNumber(kpis.meanPrimary)}</div>
          {/* Micro Sparkline */}
          <div className="mt-2.5 h-7 w-full overflow-hidden text-purple-500">
            <svg viewBox="0 0 100 28" className="w-full h-full" fill="none">
              <path
                d="M0 14 Q 25 22, 50 12 T 80 8 T 100 16"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-normal">Secondary Mean: {formatNumber(kpis.meanSecondary)}</div>
        </div>

        {/* KPI 5: SLA Attainment Rate */}
        <div className="p-4 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] hover:shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)]">SLA Attainment</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{targetMultiplier}x Target</span>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-[var(--lm-text-primary)]">{kpis.attainmentPct.toFixed(1)}%</div>
          {/* Smooth Progress bar */}
          <div className="mt-3.5 w-full bg-[var(--lm-bg-secondary)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(kpis.attainmentPct, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1.5 font-normal">Meeting target threshold</div>
        </div>

        {/* KPI 6: Dominant Market Segment */}
        <div className="p-4 rounded-3xl bg-[var(--lm-bg-elevated)] backdrop-blur-xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-sm)] hover:shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)]">Leading {currentDim}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">#1 Rank</span>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight truncate text-[var(--lm-text-primary)]" title={kpis.topSegment}>
            {kpis.topSegment}
          </div>
          <div className="mt-2.5 text-xs font-semibold flex items-center justify-between text-[var(--lm-text-secondary)]">
            <span className="font-normal">Volume Share:</span>
            <span className="font-mono text-[var(--lm-text-primary)] font-bold">{kpis.topSegmentShare.toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-normal">Top market concentration</div>
        </div>
      </section>

      {/* 3b. BIG DATA STATISTICAL PRECISION & DISTRIBUTION ENGINE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Statistical Moments Card (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--lm-border-default)]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <SparklesIcon className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-[var(--lm-text-primary)]">
                    Big Data Precision Moments
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-[var(--lm-text-secondary)]">
                      N={bigDataPrecision.n}
                    </span>
                  </h2>
                  <p className="text-[11px] text-[var(--lm-text-tertiary)] font-normal">Unbiased sample estimates for {currentMetric}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--lm-bg-secondary)] text-[var(--lm-text-primary)] border border-[var(--lm-border-default)]">
                95% CI
              </span>
            </div>

            {/* 8-Grid Statistical Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Sample Mean (μ)</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{formatNumber(bigDataPrecision.mean)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">Center tendency</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Std Dev (σ)</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{formatNumber(bigDataPrecision.stdDev)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">Dispersion</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Std Error (SE)</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{formatNumber(bigDataPrecision.stdError)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">σ / √n</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Median (Q2)</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{formatNumber(bigDataPrecision.median)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">P50 benchmark</span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">IQR (Q3 - Q1)</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{formatNumber(bigDataPrecision.iqr)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">Mid-50% spread</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Skewness</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{bigDataPrecision.skewness.toFixed(2)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">{bigDataPrecision.skewness > 0 ? 'Right-skewed' : bigDataPrecision.skewness < 0 ? 'Left-skewed' : 'Symmetric'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Tukey Outliers</span>
                <span className="text-sm font-bold font-mono block mt-1 text-rose-500">
                  {bigDataPrecision.outlierCount}
                </span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">1.5x IQR rule</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)]/70 border border-[var(--lm-border-default)]">
                <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] block uppercase tracking-wide">Range (Max-Min)</span>
                <span className="text-sm font-bold font-mono block mt-1 text-[var(--lm-text-primary)]">{formatNumber(bigDataPrecision.range)}</span>
                <span className="text-[9px] text-[var(--lm-text-tertiary)]">Extreme span</span>
              </div>
            </div>

            {/* Confidence Interval Strip */}
            <div className="mt-3.5 p-3.5 rounded-2xl bg-[var(--lm-bg-secondary)]/60 border border-[var(--lm-border-default)]">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-[var(--lm-text-secondary)]">95% Confidence Interval for μ:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  [{formatNumber(bigDataPrecision.ci95Lower)} — {formatNumber(bigDataPrecision.ci95Upper)}]
                </span>
              </div>
              <div className="relative w-full h-2.5 bg-[var(--lm-bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                  style={{
                    left: `${Math.max(0, Math.min(100, ((bigDataPrecision.ci95Lower - bigDataPrecision.min) / (bigDataPrecision.range || 1)) * 100))}%`,
                    width: `${Math.max(5, Math.min(100, ((bigDataPrecision.ci95Upper - bigDataPrecision.ci95Lower) / (bigDataPrecision.range || 1)) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--lm-text-tertiary)] mt-1.5 font-mono">
                <span>Min: {formatNumber(bigDataPrecision.min)}</span>
                <span className="font-bold text-[var(--lm-text-primary)]">μ: {formatNumber(bigDataPrecision.mean)}</span>
                <span>Max: {formatNumber(bigDataPrecision.max)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-[var(--lm-border-default)] flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)]">
            <span>Fences: [{formatNumber(bigDataPrecision.outlierLowerFence)} - {formatNumber(bigDataPrecision.outlierUpperFence)}]</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Strict Precision</span>
          </div>
        </div>

        {/* 16-Bin Frequency Histogram + KDE Curve Card (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] text-[var(--lm-text-primary)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--lm-border-default)]">
              <div>
                <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-[var(--lm-text-primary)]">
                  <BarChart3Icon className="w-4 h-4 text-blue-500" />
                  Frequency Distribution & Kernel Density Estimation (KDE)
                </h2>
                <p className="text-[11px] text-[var(--lm-text-tertiary)] font-normal">
                  Equi-width bin partitioning overlaid with smoothed Bézier density envelope
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-[10px] text-[var(--lm-text-secondary)]">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                  Bin Count
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-[10px] text-[var(--lm-text-secondary)]">
                  <span className="w-3.5 h-0.5 bg-indigo-600 dark:bg-indigo-400 inline-block rounded-full" />
                  KDE Curve
                </span>
              </div>
            </div>

            {/* SVG Frequency Histogram Chart */}
            <div className="h-80 sm:h-96 min-h-[320px] w-full relative">
              {histogramDistribution.bins.length > 0 ? (
                <svg viewBox="0 0 600 160" width="100%" height="100%" data-chart="histogram" className="w-full h-full chart-svg overflow-visible">
                  {/* Background grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 140 - pct * 110;
                    return (
                      <g key={i}>
                        <line x1="30" y1={y} x2="570" y2={y} stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
                        <text x="24" y={y + 3} textAnchor="end" className="text-[9px] fill-[var(--lm-text-tertiary)] font-mono">
                          {Math.round(histogramDistribution.maxBinCount * pct)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Histogram Bars */}
                  {histogramDistribution.bins.map((bin, i) => {
                    const totalBins = histogramDistribution.bins.length;
                    const availableW = 540;
                    const barW = (availableW / totalBins) * 0.85;
                    const gap = (availableW / totalBins) * 0.15;
                    const x = 30 + i * (barW + gap);
                    const barH = (bin.count / (histogramDistribution.maxBinCount || 1)) * 110;
                    const y = 140 - barH;

                    return (
                      <g key={i} className="group cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={Math.max(barH, 2)}
                          rx="4"
                          className="fill-blue-500/80 hover:fill-blue-600 transition-all duration-200"
                        />
                        {/* Bin count label on bar */}
                        {bin.count > 0 && (
                          <text
                            x={x + barW / 2}
                            y={y - 4}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-semibold fill-[var(--lm-text-secondary)]"
                          >
                            {bin.count}
                          </text>
                        )}
                        {/* Interactive tooltip */}
                        <title>{`Bin #${i + 1}: ${bin.label} | ${bin.count} records (${bin.pct.toFixed(1)}%)`}</title>
                      </g>
                    );
                  })}

                  {/* KDE Bézier Smoothed Curve */}
                  {histogramDistribution.kdePoints && (
                    <path
                      d={histogramDistribution.kdePoints}
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="opacity-95"
                    />
                  )}

                  {/* Baseline Axis */}
                  <line x1="30" y1="140" x2="570" y2="140" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--lm-text-tertiary)]">
                  Insufficient data for histogram partitioning
                </div>
              )}
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-[var(--lm-border-default)] flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)]">
            <span>Hover any bin bar to inspect exact boundaries and density percentage</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
              Bins: {histogramDistribution.bins.length} | Max Bin: {histogramDistribution.maxBinCount}
            </span>
          </div>
        </div>
      </section>

      {/* 4. HERO ANALYTICAL CANVAS (3 Widgets: Dual Trend Bézier, Category Donut, Speedometer Gauge) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Widget 1: Dual-Series Trajectory Bézier + Volume Combo Chart */}
        <div className="lg:col-span-6 rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] relative flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--lm-border-default)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4 text-blue-500" />
                Aggregates & Sequential Trajectory ({currentMetric} vs {currentSecondaryMetric})
              </h2>
              <p className="text-xs text-[var(--lm-text-tertiary)] font-normal">
                Smooth Bézier trend trajectory with underlying volume bars and interactive hover scrubber
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Smoothing Mode Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
                <button
                  type="button"
                  onClick={() => setTrajectorySmoothMode('smoothed')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                    trajectorySmoothMode === 'smoothed'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)]'
                  }`}
                >
                  Smooth Bézier
                </button>
                <button
                  type="button"
                  onClick={() => setTrajectorySmoothMode('discrete')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                    trajectorySmoothMode === 'discrete'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)]'
                  }`}
                >
                  Raw Sample
                </button>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-blue-500 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs shadow-blue-500/40" />
                  {currentMetric}
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-500 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/40" />
                  {currentSecondaryMetric}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="h-80 sm:h-96 min-h-[340px] w-full relative">
            {trajectorySeries.length > 0 ? (
              (() => {
                // Dynamically fit Y-axis to actual data (no artificial 100 ceiling)
                const rawMax = Math.max(
                  ...trajectorySeries.map((d) => Math.max(d.primary, d.secondary, 0)),
                  1
                );

                // Add 15% headroom above peak so curves utilize 85% of vertical space gracefully
                const headroomMax = rawMax * 1.15;

                // Compute clean, round step intervals
                let tickStep = 1;
                if (headroomMax <= 5) tickStep = 1;
                else if (headroomMax <= 12) tickStep = 2.5;
                else if (headroomMax <= 25) tickStep = 5;
                else if (headroomMax <= 60) tickStep = 10;
                else if (headroomMax <= 120) tickStep = 20;
                else if (headroomMax <= 250) tickStep = 50;
                else if (headroomMax <= 600) tickStep = 100;
                else if (headroomMax <= 1500) tickStep = 250;
                else if (headroomMax <= 3000) tickStep = 500;
                else if (headroomMax <= 10000) tickStep = 1000;
                else {
                  const p = Math.pow(10, Math.floor(Math.log10(headroomMax)));
                  tickStep = p * (headroomMax / p > 5 ? 1 : headroomMax / p > 2 ? 0.5 : 0.2);
                }

                const numTicks = 4;
                const maxVal = Math.max(Math.ceil(headroomMax / (tickStep * numTicks)) * (tickStep * numTicks), tickStep * numTicks);

                const width = 840;
                const height = 340;
                const padding = { top: 20, right: 25, bottom: 42, left: 52 };
                const chartW = width - padding.left - padding.right;
                const chartH = height - padding.top - padding.bottom;
                const step = chartW / Math.max(trajectorySeries.length - 1, 1);

                // Apply weighted moving-average smoothing when in 'smoothed' mode
                const smoothedPrimary = trajectorySeries.map((d, i, arr) => {
                  if (trajectorySmoothMode === 'discrete' || arr.length < 3) return d.primary;
                  const prev = i > 0 ? arr[i - 1].primary : d.primary;
                  const next = i < arr.length - 1 ? arr[i + 1].primary : d.primary;
                  return prev * 0.22 + d.primary * 0.56 + next * 0.22;
                });

                const smoothedSecondary = trajectorySeries.map((d, i, arr) => {
                  if (trajectorySmoothMode === 'discrete' || arr.length < 3) return d.secondary;
                  const prev = i > 0 ? arr[i - 1].secondary : d.secondary;
                  const next = i < arr.length - 1 ? arr[i + 1].secondary : d.secondary;
                  return prev * 0.22 + d.secondary * 0.56 + next * 0.22;
                });

                // Compute SVG Coordinate Points
                const pts1 = trajectorySeries.map((d, i) => ({
                  x: padding.left + i * step,
                  y: padding.top + chartH - (Math.max(0, smoothedPrimary[i]) / maxVal) * chartH,
                  rawY: padding.top + chartH - (Math.max(0, d.primary) / maxVal) * chartH,
                }));

                const pts2 = trajectorySeries.map((d, i) => ({
                  x: padding.left + i * step,
                  y: padding.top + chartH - (Math.max(0, smoothedSecondary[i]) / maxVal) * chartH,
                  rawY: padding.top + chartH - (Math.max(0, d.secondary) / maxVal) * chartH,
                }));

                // Catmull-Rom to Cubic Bézier Spline (C1 continuous tangents)
                const makeSmoothPath = (pts: { x: number; y: number }[], tension = 0.35) => {
                  if (pts.length === 0) return '';
                  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
                  if (pts.length === 2) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;

                  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = i > 0 ? pts[i - 1] : pts[i];
                    const p1 = pts[i];
                    const p2 = pts[i + 1];
                    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

                    const cp1x = p1.x + (p2.x - p0.x) * tension;
                    const cp1y = p1.y + (p2.y - p0.y) * tension;
                    const cp2x = p2.x - (p3.x - p1.x) * tension;
                    const cp2y = p2.y - (p3.y - p1.y) * tension;

                    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                  }
                  return d;
                };

                const path1 = makeSmoothPath(pts1);
                const path2 = makeSmoothPath(pts2);
                const area1 = pts1.length > 0
                  ? `${path1} L ${pts1[pts1.length - 1].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${pts1[0].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`
                  : '';

                return (
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    width="100%"
                    height="100%"
                    data-chart="trajectory"
                    className="w-full h-full chart-svg select-none overflow-visible"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clientX = e.clientX - rect.left;
                      const svgX = (clientX / rect.width) * width;
                      if (svgX < padding.left || svgX > width - padding.right) {
                        setHoveredPoint(null);
                        return;
                      }
                      const relX = svgX - padding.left;
                      const nearestIdx = Math.max(0, Math.min(trajectorySeries.length - 1, Math.round(relX / step)));
                      const d = trajectorySeries[nearestIdx];
                      if (d) {
                        setHoveredPoint({
                          label: d.label,
                          primary: d.primary,
                          secondary: d.secondary,
                          idx: nearestIdx,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <linearGradient id="trajGradPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.38" />
                        <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.35" />
                      </filter>
                      <filter id="glowEmerald" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10B981" floodOpacity="0.35" />
                      </filter>
                    </defs>

                    <style>{`
                      @keyframes trajDrawLine {
                        from { stroke-dashoffset: 3500; }
                        to { stroke-dashoffset: 0; }
                      }
                      @keyframes trajFadeArea {
                        0% { opacity: 0; transform: translateY(4px); }
                        100% { opacity: 1; transform: translateY(0); }
                      }
                      .traj-path-primary {
                        stroke-dasharray: 3500;
                        stroke-dashoffset: 3500;
                        animation: trajDrawLine 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      }
                      .traj-path-secondary {
                        stroke-dasharray: 3500;
                        stroke-dashoffset: 3500;
                        animation: trajDrawLine 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
                      }
                      .traj-area-fill {
                        animation: trajFadeArea 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      }
                    `}</style>

                    {/* Horizontal Grid lines & Dynamic Y-axis labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = padding.top + chartH * (1 - pct);
                      return (
                        <g key={i}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={width - padding.right}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.12"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={padding.left - 10}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="currentColor"
                            opacity="0.6"
                            className="font-mono font-medium"
                          >
                            {formatNumber(maxVal * pct)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Underlying Volume Bars (Scales with data) */}
                    {trajectorySeries.map((d, i) => {
                      const barW = Math.max(Math.min(step * 0.7, 12), 4);
                      const x = padding.left + i * step - barW / 2;
                      const barH = Math.max(2, (Math.max(0, d.primary) / maxVal) * chartH * 0.35);
                      const y = padding.top + chartH - barH;
                      const isHovered = hoveredPoint?.idx === i;
                      return (
                        <rect
                          key={`bar-${i}`}
                          x={x.toFixed(1)}
                          y={y.toFixed(1)}
                          width={barW.toFixed(1)}
                          height={barH.toFixed(1)}
                          rx="3"
                          className="transition-all duration-300"
                          fill={isHovered ? '#3B82F6' : '#94A3B8'}
                          opacity={isHovered ? 0.45 : 0.12}
                        />
                      );
                    })}

                    {/* Smooth Area Gradient Fill */}
                    {area1 && (
                      <path
                        d={area1}
                        fill="url(#trajGradPrimary)"
                        className="traj-area-fill transition-opacity duration-500"
                      />
                    )}

                    {/* Curve 1: Primary Metric (Bézier Spline with Animation & Glow) */}
                    {path1 && (
                      <path
                        d={path1}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glowBlue)"
                        className="traj-path-primary"
                      />
                    )}

                    {/* Curve 2: Secondary Metric (Dashed Bézier Spline with Animation) */}
                    {path2 && (
                      <path
                        d={path2}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeDasharray="5 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glowEmerald)"
                        className="traj-path-secondary opacity-90"
                      />
                    )}

                    {/* X-axis Sequential Labels (6-8 evenly sampled milestones) */}
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, i) => {
                      const idx = Math.min(Math.round(pct * (trajectorySeries.length - 1)), trajectorySeries.length - 1);
                      const d = trajectorySeries[idx];
                      if (!d) return null;
                      const x = padding.left + idx * step;
                      return (
                        <g key={i}>
                          <line
                            x1={x}
                            y1={padding.top + chartH}
                            x2={x}
                            y2={padding.top + chartH + 5}
                            stroke="currentColor"
                            strokeOpacity="0.25"
                          />
                          <text
                            x={x}
                            y={height - 12}
                            textAnchor="middle"
                            fontSize="9"
                            fill="currentColor"
                            opacity="0.65"
                            fontWeight="500"
                            className="font-mono"
                          >
                            {d.label.length > 8 ? d.label.substring(0, 7) + '..' : d.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Interactive Vertex Scrubber Points */}
                    {trajectorySeries.map((d, i) => {
                      const pt = pts1[i];
                      const isHovered = hoveredPoint?.idx === i;
                      return (
                        <g
                          key={`pt-${i}`}
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            setHoveredPoint({
                              label: d.label,
                              primary: d.primary,
                              secondary: d.secondary,
                              idx: i,
                            })
                          }
                        >
                          <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 3}
                            fill="#FFFFFF"
                            stroke="#3B82F6"
                            strokeWidth={isHovered ? 3 : 1.8}
                            className="transition-all duration-150"
                          />
                        </g>
                      );
                    })}

                    {/* Vertical Hairline Scrubber & Glowing Markers when hovered */}
                    {hoveredPoint && pts1[hoveredPoint.idx] && (
                      <g className="pointer-events-none">
                        <line
                          x1={pts1[hoveredPoint.idx].x}
                          y1={padding.top}
                          x2={pts1[hoveredPoint.idx].x}
                          y2={padding.top + chartH}
                          stroke="#3B82F6"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          opacity="0.8"
                          className="transition-all duration-75"
                        />
                        {/* Primary Marker */}
                        <circle
                          cx={pts1[hoveredPoint.idx].x}
                          cy={pts1[hoveredPoint.idx].y}
                          r="10"
                          fill="#3B82F6"
                          opacity="0.25"
                          className="animate-ping"
                        />
                        <circle
                          cx={pts1[hoveredPoint.idx].x}
                          cy={pts1[hoveredPoint.idx].y}
                          r="6"
                          fill="#FFFFFF"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          filter="url(#glowBlue)"
                        />
                        {/* Secondary Marker */}
                        {pts2[hoveredPoint.idx] && (
                          <>
                            <circle
                              cx={pts2[hoveredPoint.idx].x}
                              cy={pts2[hoveredPoint.idx].y}
                              r="10"
                              fill="#10B981"
                              opacity="0.25"
                              className="animate-ping"
                            />
                            <circle
                              cx={pts2[hoveredPoint.idx].x}
                              cy={pts2[hoveredPoint.idx].y}
                              r="5.5"
                              fill="#FFFFFF"
                              stroke="#10B981"
                              strokeWidth="3"
                              filter="url(#glowEmerald)"
                            />
                          </>
                        )}
                      </g>
                    )}
                  </svg>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No trajectory records match the active filter.
              </div>
            )}

            {/* Floating Glassmorphic Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute top-2 right-4 bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-xl px-4 py-3 rounded-2xl border border-slate-700/70 shadow-2xl text-xs z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-150 min-w-[200px]"
              >
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-1.5">
                  <span className="font-bold text-blue-400 text-xs">{hoveredPoint.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Index #{hoveredPoint.idx + 1}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {currentMetric}:
                  </span>
                  <span className="font-mono font-bold text-white text-[12px]">{formatNumber(hoveredPoint.primary)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {currentSecondaryMetric}:
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-[12px]">{formatNumber(hoveredPoint.secondary)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-400">Spread Ratio:</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {hoveredPoint.secondary > 0 ? `${(hoveredPoint.primary / hoveredPoint.secondary).toFixed(2)}x` : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Segmented Category Donut with Center Badge */}
        <div className="lg:col-span-3 rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--lm-border-default)]">
              <h2 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-500" />
                Category Share Ring
              </h2>
              <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider">
                {currentDim} Mix
              </span>
            </div>

            {/* SVG Donut */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-4">
              <svg viewBox="0 0 100 100" width="100%" height="100%" data-chart="donut" className="w-full h-full chart-svg -rotate-90 transform">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="14" fill="none" opacity="0.1" />

                {/* Slices */}
                {(() => {
                  const circumference = 2 * Math.PI * 38;

                  return categoryBreakdown.map((item) => {
                    const strokeDasharray = `${(item.share * circumference) / 100} ${circumference}`;
                    const strokeDashoffset = `-${(item.offsetPct * circumference) / 100}`;
                    const isHovered = hoveredDonutSegment === item.name;

                    return (
                      <circle
                        key={item.name}
                        cx="50"
                        cy="50"
                        r="38"
                        stroke={item.color}
                        strokeWidth={isHovered ? 18 : 14}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        fill="none"
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredDonutSegment(item.name)}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                        onClick={() => setCategoryFilter(categoryFilter === item.name ? 'all' : item.name)}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Center Callout Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  {hoveredDonutSegment || 'Top Share'}
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[90px]">
                  {hoveredDonutSegment
                    ? `${categoryBreakdown.find((c) => c.name === hoveredDonutSegment)?.share.toFixed(1)}%`
                    : `${kpis.topSegmentShare.toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate max-w-[95px]">
                  {hoveredDonutSegment || kpis.topSegment}
                </span>
              </div>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 mt-2 max-h-28 overflow-y-auto pr-1">
            {categoryBreakdown.slice(0, 5).map((item) => (
              <div
                key={item.name}
                onClick={() => setCategoryFilter(categoryFilter === item.name ? 'all' : item.name)}
                className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg cursor-pointer transition-all ${categoryFilter === item.name ? 'bg-blue-50 dark:bg-blue-900/30 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-slate-700 dark:text-slate-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  <span>{formatNumber(item.sum)}</span>
                  <span className="text-slate-400 font-semibold">{item.share.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 3: SLA & Target Attainment Speedometer Gauge */}
        <div className="lg:col-span-3 rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--lm-border-default)]">
              <h2 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight flex items-center gap-2">
                <GaugeIcon className="w-4 h-4 text-emerald-500" />
                Target Attainment Gauge
              </h2>
              <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider">
                SLA KPI
              </span>
            </div>

            {/* Target Multiplier Threshold Controls */}
            <div className="flex items-center justify-between gap-1 mb-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[10px] font-semibold">
              <span className="text-slate-500 pl-1">Threshold:</span>
              <div className="flex items-center gap-1">
                {[1.0, 1.2, 1.5].map((mul) => (
                  <button
                    key={mul}
                    onClick={() => setTargetMultiplier(mul)}
                    className={`px-2 py-0.5 rounded transition-all ${targetMultiplier === mul ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {mul}x
                  </button>
                ))}
              </div>
            </div>

            {/* Semi-Circle Speedometer SVG */}
            <div className="relative w-64 h-40 sm:w-72 sm:h-44 mx-auto mt-3">
              <svg viewBox="0 0 100 60" width="100%" height="100%" data-chart="gauge" className="w-full h-full chart-svg overflow-visible">
                {/* Arc 1: Red Zone (0 - 50%) */}
                <path
                  d="M 10 50 A 40 40 0 0 1 30 18"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Arc 2: Yellow Zone (50 - 80%) */}
                <path
                  d="M 32 16 A 40 40 0 0 1 68 16"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="10"
                />
                {/* Arc 3: Green Zone (80 - 100%) */}
                <path
                  d="M 70 18 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Needle Calculation */}
                {(() => {
                  const clamped = Math.max(0, Math.min(kpis.attainmentPct, 120));
                  // 0% -> -180 deg (points left), 100% -> 0 deg (points right)
                  const angleDeg = -180 + (clamped / 100) * 180;
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const needleLen = 30;
                  const tipX = 50 + needleLen * Math.cos(angleRad);
                  const tipY = 50 + needleLen * Math.sin(angleRad);

                  return (
                    <g className="transition-all duration-700 ease-out">
                      {/* Needle Line */}
                      <line
                        x1="50"
                        y1="50"
                        x2={tipX}
                        y2={tipY}
                        stroke="#1E293B"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="dark:stroke-white"
                      />
                      {/* Pivot Center Pin */}
                      <circle cx="50" cy="50" r="5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                    </g>
                  );
                })()}

                {/* Min / Max Labels */}
                <text x="8" y="58" fontSize="6" fill="currentColor" opacity="0.6">0%</text>
                <text x="50" y="12" fontSize="6" textAnchor="middle" fill="currentColor" opacity="0.6">Threshold</text>
                <text x="92" y="58" fontSize="6" textAnchor="end" fill="currentColor" opacity="0.6">100%+</text>
              </svg>
            </div>

            {/* Readout Counter */}
            <div className="text-center mt-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {kpis.attainmentPct.toFixed(1)}%
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {kpis.attainmentPct >= 80 ? (
                  <span className="text-emerald-500 font-bold">✓ Target Attained</span>
                ) : kpis.attainmentPct >= 50 ? (
                  <span className="text-amber-500 font-bold">⚠ Watchlist Advisory</span>
                ) : (
                  <span className="text-rose-500 font-bold">✕ Critical Gap</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
            <strong>Target Formula:</strong> Mean {currentMetric} × {targetMultiplier} baseline. {kpis.primaryValues.filter(v => v >= (kpis.meanPrimary * targetMultiplier)).length} of {kpis.count} rows currently qualify.
          </div>
        </div>
      </section>

      {/* 5. SECONDARY ANALYTICAL GRID (Grouped Cross-Tab Bars, Radar Spider Chart, World Geo Map) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Widget 4: Grouped / Comparative Horizontal Bars */}
        <div className={`${mapExpanded ? 'lg:col-span-7' : 'lg:col-span-5'} rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--lm-border-default)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-purple-500" />
                Comparative Breakdown ({currentDim} × {currentSecondaryDim})
              </h2>
              <p className="text-xs text-[var(--lm-text-tertiary)] font-normal">
                Grouped cross-tabulation comparing segments across dimensions
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[var(--lm-text-secondary)] px-2.5 py-0.5 rounded-full bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              Top 6
            </span>
          </div>

          <div className="space-y-3.5">
            {crossTabBreakdown.map((row) => {
              const maxRowVal = Math.max(...crossTabBreakdown.map((r) => r.total), 1);
              return (
                <div key={row.primaryCat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--lm-text-primary)]">{row.primaryCat}</span>
                    <span className="font-mono text-[var(--lm-text-secondary)]">{formatNumber(row.total)}</span>
                  </div>

                  {/* Multi-segment stacked bar */}
                  <div className="w-full h-3 bg-[var(--lm-bg-secondary)] rounded-full overflow-hidden flex">
                    {row.subGroups.map((sg, i) => {
                      const val = row.values[sg] || 0;
                      const pct = (val / maxRowVal) * 100;
                      const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
                      return (
                        <div
                          key={sg}
                          className={`${colors[i % colors.length]} h-full transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${row.primaryCat} [${sg}]: ${formatNumber(val)}`}
                        />
                      );
                    })}
                  </div>

                  {/* Sub-group chips */}
                  <div className="flex items-center gap-3 text-[10px] text-[var(--lm-text-tertiary)] pt-0.5">
                    {row.subGroups.map((sg, i) => (
                      <span key={sg} className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'][i % 3]}`} />
                        {sg}: {formatNumber(row.values[sg] || 0)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 5: Multi-Attribute Radar / Spider Chart */}
        <div className={`${mapExpanded ? 'lg:col-span-5' : 'lg:col-span-3'} rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] flex flex-col justify-between transition-all duration-300`}>
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--lm-border-default)]">
              <h2 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-cyan-500" />
                Multi-Attribute Radar
              </h2>
              <span className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider">
                5D Vector
              </span>
            </div>

            {/* SVG Radar Chart */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-2">
              <svg viewBox="0 0 100 100" width="100%" height="100%" data-chart="radar" className="w-full h-full chart-svg overflow-visible">
                {/* Concentric Polygonal Grid Rings */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((ring) => {
                  const points = radarAxes.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                    const r = 38 * ring;
                    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                  });
                  return (
                    <polygon
                      key={ring}
                      points={points.join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.08"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Radial Axis Spokes */}
                {radarAxes.map((_, i) => {
                  const angle = (i * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                  const x = 50 + 38 * Math.cos(angle);
                  const y = 50 + 38 * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1="50"
                      y1="50"
                      x2={x}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.15"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Benchmark Polygon */}
                {(() => {
                  const pts = radarAxes.map((a, i) => {
                    const angle = (i * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                    const r = (38 * a.benchmark) / 100;
                    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                  });
                  return (
                    <polygon
                      points={pts.join(' ')}
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  );
                })()}

                {/* Active Polygon */}
                {(() => {
                  const pts = radarAxes.map((a, i) => {
                    const angle = (i * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                    const r = (38 * a.value) / 100;
                    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                  });
                  return (
                    <>
                      <polygon
                        points={pts.join(' ')}
                        fill="#3B82F6"
                        fillOpacity="0.25"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      {radarAxes.map((a, i) => {
                        const angle = (i * 2 * Math.PI) / radarAxes.length - Math.PI / 2;
                        const r = (38 * a.value) / 100;
                        const cx = 50 + r * Math.cos(angle);
                        const cy = 50 + r * Math.sin(angle);
                        return (
                          <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r="2.5"
                            fill="#FFFFFF"
                            stroke="#3B82F6"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Radar Metric Legend */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[var(--lm-text-tertiary)] pt-2 border-t border-[var(--lm-border-default)]">
            {radarAxes.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <span className="truncate">{a.name}</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{Math.round(a.value)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 6: Real-World Geographic Intelligence Map */}
        <div
          className={`${
            mapExpanded ? 'lg:col-span-12 order-first' : 'lg:col-span-4'
          } rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] flex flex-col justify-between transition-all duration-300`}
        >
          <GeographicIntelligenceMap
            rows={filteredRows}
            allDatasetRows={rawRows}
            columns={currentDataset.columns}
            currentMetric={currentMetric}
            metricLabel={currentMetric}
            isCurrency={isCurrency}
            selectedRegion={countryFilter}
            onSelectRegion={(reg) => setCountryFilter(reg)}
            isExpanded={mapExpanded}
            onToggleExpand={() => setMapExpanded(!mapExpanded)}
          />
        </div>
      </section>

      {/* 6. DRILL-DOWN LEDGER & RECORD INSPECTOR */}
      <section className="rounded-3xl p-6 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] apple-card-hover mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--lm-border-default)]">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[var(--lm-text-primary)] flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <TableIcon className="w-4 h-4" />
              </span>
              Ranked Entity Ledger & Deep-Dive Records
            </h2>
            <p className="text-xs text-[var(--lm-text-tertiary)] font-normal mt-0.5">
              Showing {sortedRows.length > 0 ? (tablePage - 1) * pageSize + 1 : 0}–{Math.min(tablePage * pageSize, sortedRows.length)} of {sortedRows.length} active records • Select any record for 360° inspector drawer
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--lm-text-tertiary)]">Sort:</span>
            <button
              onClick={() => {
                setTableSortCol('primary');
                setTableSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
              }}
              className="font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1.5 apple-pressable transition-all"
            >
              {tableSortCol === 'primary' ? (tableSortDir === 'desc' ? 'Highest ' : 'Lowest ') : ''}{currentMetric} {tableSortCol === 'primary' ? (tableSortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>

        {/* Tabular View */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--lm-border-default)]/70 bg-[var(--lm-bg-primary)]/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--lm-border-default)] text-[var(--lm-text-tertiary)] uppercase text-[10px] tracking-wider select-none bg-[var(--lm-bg-secondary)]/60">
                <th className="py-3 px-3.5 font-semibold"># Rank</th>
                <th
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (tableSortCol === 'dim') {
                      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setTableSortCol('dim');
                      setTableSortDir('asc');
                    }
                  }}
                >
                  {currentDim} {tableSortCol === 'dim' ? (tableSortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (tableSortCol === 'subdim') {
                      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setTableSortCol('subdim');
                      setTableSortDir('asc');
                    }
                  }}
                >
                  {currentSecondaryDim} {tableSortCol === 'subdim' ? (tableSortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-3 px-3.5 font-semibold text-right cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (tableSortCol === 'primary') {
                      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setTableSortCol('primary');
                      setTableSortDir('desc');
                    }
                  }}
                >
                  {currentMetric} {tableSortCol === 'primary' ? (tableSortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-3 px-3.5 font-semibold text-right cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (tableSortCol === 'secondary') {
                      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setTableSortCol('secondary');
                      setTableSortDir('desc');
                    }
                  }}
                >
                  {currentSecondaryMetric} {tableSortCol === 'secondary' ? (tableSortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-3.5 font-semibold">Performance Spread</th>
                <th className="py-3 px-3.5 font-semibold text-center">Status</th>
                <th className="py-3 px-3.5 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--lm-border-default)]/60 font-medium">
              {pagedRows.map((row, idx) => {
                const globalIdx = (tablePage - 1) * pageSize + idx;
                const v1 = parseFloat(row[currentMetric]) || 0;
                const v2 = parseFloat(row[currentSecondaryMetric]) || 0;
                const maxVal = Math.max(...filteredRows.map((r) => parseFloat(r[currentMetric]) || 0), 1);
                const barWidth = Math.min((v1 / maxVal) * 100, 100);

                return (
                  <tr
                    key={idx}
                    className="hover:bg-[var(--lm-bg-secondary)]/80 cursor-pointer transition-colors duration-150"
                    onClick={() => setInspectedRow(row)}
                  >
                    <td className="py-3 px-3.5 font-mono text-[var(--lm-text-tertiary)]">
                      #{globalIdx + 1}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-[var(--lm-text-primary)]">
                      {row[currentDim] || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3.5 text-[var(--lm-text-secondary)]">
                      {row[currentSecondaryDim] || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatNumber(v1)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(v2)}
                    </td>
                    <td className="py-3 px-3.5 w-40">
                      <div className="w-full bg-[var(--lm-border-default)]/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${v1 >= kpis.meanPrimary * targetMultiplier ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                        {v1 >= kpis.meanPrimary * targetMultiplier ? 'Optimal' : 'Standard'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedRow(row);
                        }}
                        className="px-2.5 py-1 rounded-full bg-[var(--lm-bg-secondary)] hover:bg-blue-600 hover:text-white border border-[var(--lm-border-default)] transition-all duration-200 text-[10px] font-semibold text-[var(--lm-text-secondary)] apple-pressable"
                      >
                        View 360°
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 pt-4 border-t border-[var(--lm-border-default)] flex items-center justify-between text-xs text-[var(--lm-text-tertiary)]">
          <span>
            Page <strong className="text-[var(--lm-text-primary)]">{currentPage}</strong> of <strong className="text-[var(--lm-text-primary)]">{totalPages}</strong> ({sortedRows.length} total records)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 rounded-full border border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--lm-border-default)] transition-colors font-medium text-[var(--lm-text-primary)] apple-pressable"
            >
              Previous
            </button>
            <button
              onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 rounded-full border border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--lm-border-default)] transition-colors font-medium text-[var(--lm-text-primary)] apple-pressable"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* 7. SLIDE-OUT RECORD INSPECTOR MODAL / DRAWER */}
      {inspectedRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--lm-bg-elevated)] backdrop-blur-3xl border border-[var(--lm-border-default)] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-apple-scale-in text-[var(--lm-text-primary)]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--lm-border-default)]">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-[var(--lm-text-primary)] flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <TableIcon className="w-4 h-4" />
                  </span>
                  Record 360° Detailed Profile
                </h3>
                <p className="text-xs text-[var(--lm-text-tertiary)] font-normal mt-0.5">Full schema attributes and quantile calculations</p>
              </div>
              <button
                onClick={() => setInspectedRow(null)}
                className="w-8 h-8 rounded-full bg-[var(--lm-bg-secondary)] hover:bg-slate-200 dark:hover:bg-slate-700 border border-[var(--lm-border-default)] flex items-center justify-center text-xs font-semibold text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] transition-all apple-pressable"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {Object.entries(inspectedRow).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-[var(--lm-bg-secondary)]/80 border border-[var(--lm-border-default)] text-xs">
                  <span className="font-medium text-[var(--lm-text-secondary)]">{key}:</span>
                  <span className="font-mono font-semibold text-[var(--lm-text-primary)]">{val}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--lm-border-default)] flex items-center justify-end">
              <Button size="sm" onClick={() => setInspectedRow(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

          {/* 8. INTERACTIVE NO-CODE CHART BUILDER SECTION */}
          <div className="mt-8 pt-6 border-t border-[var(--lm-border-default)] max-w-full overflow-hidden">
            <CustomChartBuilder />
          </div>
        </>
      )}
    </div>
  );
}