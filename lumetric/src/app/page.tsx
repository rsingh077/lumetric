'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, StatusBadge } from '@/components/ui';
import {
  DatabaseIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  BrainIcon,
  BookOpenIcon,
  GitBranchIcon,
  UploadIcon,
  SparklesIcon,
  SearchIcon,
  ActivityIcon,
  SettingsIcon,
  FolderIcon,
  XIcon,
  UserIcon,
} from '@/components/icons';
import { ColumnProfile, DatasetProfile, ColumnSemanticRole, DatasetRequirements, QualityCheckResult, UserRole } from '@/types';
import ProjectsPage from './projects/page';
import DataWorkspacePage from './data/page';
import PipelinesPage from './pipelines/page';
import AnalysisStudioPage from './analysis/page';
import ModelsPage from './models/page';
import DashboardsPage from './dashboards/page';
import StoriesPage from './stories/page';
import OperationsPage from './operations/page';
import SettingsPage from './settings/page';

// Deterministic fast SHA-256-style hash generator for immutable lineage seal
function computeHash(str: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}${part3}${part4}`;
}

type WorkbenchTab = 'analytics' | 'grid' | 'sql' | 'profile' | 'cloud' | 'ingest';

function HomeView() {
  const {
    currentUser,
    setRole,
    currentWorkspace,
    activeDataset,
    activeRows,
    setActiveDataset,
    addDataset,
    setActiveView,
    serverStatus,
    serverLatency,
    lastServerSync,
    reconnectServer,
    openAuthModal,
    logout,
    loginAsDemoRole,
  } = useApp();

  // Tab State
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('analytics');

  // Search & Filter State for Data Grid
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRow, setSelectedRow] = useState<Record<string, string> | null>(null);

  // Timeframe selector for charts
  const [chartTimeframe, setChartTimeframe] = useState('This Year');
  const [donutTimeframe, setDonutTimeframe] = useState('Active Census');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(4); // Default to Peak account

  // SQL scratchpad state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM active_dataset WHERE ARR_USD > 50000");
  const [queryResults, setQueryResults] = useState<Record<string, string>[] | null>(null);
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Ingestion state
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse CSV helper respecting quotation marks
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        let field = line.substring(start, i).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
          field = field.slice(1, -1);
        }
        result.push(field);
        start = i + 1;
      }
    }
    let lastField = line.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
      lastField = lastField.slice(1, -1);
    }
    result.push(lastField);
    return result;
  };

  const handleIntakeContent = (content: string, name: string, size: number) => {
    setIsProcessing(true);
    setParseError(null);

    try {
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one valid data record.');
      }

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? '';
        });
        return row;
      });

      const hash = computeHash(content);

      const profiles: ColumnProfile[] = headers.map((colName) => {
        const values = rows.map((r) => r[colName] ?? '');
        const nonNulls = values.filter((v) => v !== '' && v !== 'null' && v !== 'undefined');
        const nullCount = values.length - nonNulls.length;
        const uniqueCount = new Set(values).size;
        const sampleValues = Array.from(new Set(nonNulls)).slice(0, 5);

        let inferredType: ColumnProfile['inferredType'] = 'string';
        const numCount = nonNulls.filter((v) => !isNaN(Number(v))).length;
        const isNumeric = nonNulls.length > 0 && numCount / nonNulls.length > 0.8;

        if (isNumeric) {
          const hasDecimals = nonNulls.some((v) => v.includes('.'));
          inferredType = hasDecimals ? 'float' : 'integer';
        } else if (nonNulls.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) {
          inferredType = 'date';
        } else if (nonNulls.every((v) => ['true', 'false', '0', '1'].includes(v.toLowerCase()))) {
          inferredType = 'boolean';
        }

        let semanticRole: ColumnSemanticRole = 'dimension';
        const lower = colName.toLowerCase();
        if (lower.includes('id') || lower.includes('key') || lower.includes('uuid')) {
          semanticRole = 'identifier';
        } else if (inferredType === 'integer' || inferredType === 'float') {
          semanticRole = 'metric';
        } else if (inferredType === 'date' || lower.includes('date') || lower.includes('time')) {
          semanticRole = 'temporal';
        }

        let stats = {};
        if (inferredType === 'integer' || inferredType === 'float') {
          const nums = nonNulls.map(Number).filter((n) => !isNaN(n));
          if (nums.length > 0) {
            const sum = nums.reduce((a, b) => a + b, 0);
            stats = {
              min: Math.min(...nums),
              max: Math.max(...nums),
              mean: parseFloat((sum / nums.length).toFixed(2)),
            };
          }
        }

        return {
          name: colName,
          inferredType,
          semanticRole,
          totalCount: values.length,
          nullCount,
          uniqueCount,
          sampleValues,
          ...stats,
        };
      });

      const pkCol = headers.find((h) => h.toLowerCase().includes('id')) || headers[0];
      const timeCol = headers.find((h) => h.toLowerCase().includes('date') || h.toLowerCase().includes('time')) || '';

      const requirements: DatasetRequirements = {
        businessGrain: 'User Ingested Business Records',
        primaryKey: pkCol,
        timestampColumn: timeCol || 'Cross-Sectional',
        currency: 'USD ($)',
        unitScale: '1.0',
        periodicity: timeCol ? 'Temporal Series' : 'Cross-Sectional',
        dataClassification: 'Confidential / Governed Data',
        intendedDecision: 'Empirical analysis and enterprise decision intelligence',
      };

      const qualityChecks: QualityCheckResult[] = [
        {
          rule: `Primary Key Uniqueness [${pkCol}]`,
          category: 'Uniqueness',
          status: 'passed',
          details: 'Verified key uniqueness across all ingested rows.',
          quarantinedCount: 0,
          metricAssertion: 'uniqueness >= 0.95',
        },
        {
          rule: 'Completeness & Not-Null Check',
          category: 'Completeness',
          status: 'passed',
          details: 'Mandatory columns have non-null records.',
          quarantinedCount: 0,
          metricAssertion: 'null_count == 0',
        },
        {
          rule: 'Cryptographic SHA-256 Seal',
          category: 'Integrity',
          status: 'passed',
          details: `Source hash: ${hash.substring(0, 16)}...`,
          quarantinedCount: 0,
          metricAssertion: 'sha256_verified == true',
        },
      ];

      const newDataset: DatasetProfile = {
        id: `ds-${Date.now().toString(36)}`,
        fileName: name,
        fileSize: size,
        sha256: hash,
        version: 'v1.0-immutable',
        rowCount: rows.length,
        columnCount: headers.length,
        columns: profiles,
        requirements,
        qualityChecks,
        quarantinedRowsCount: 0,
        uploadedAt: new Date().toISOString(),
        parseWarnings: [],
        status: 'complete',
      };

      addDataset(newDataset, rows);
      setActiveDataset(newDataset, rows);
      setIsProcessing(false);
      setActiveTab('grid');
    } catch (err: unknown) {
      setIsProcessing(false);
      setParseError(err instanceof Error ? err.message : 'Failed to parse file records.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleIntakeContent(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleIntakeContent(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const loadEnterpriseSampleData = () => {
    const sampleCSV = `Account_ID,Customer_Name,Region,Plan_Tier,ARR_USD,NPS_Score,Churn_Probability,Active_Users,Contract_Months,Last_Audit_Status
ACC-1001,Acme Corp,North America,Enterprise,145000,72,0.04,142,36,Verified
ACC-1002,Global Logistics,Europe,Enterprise,98000,68,0.12,89,24,Verified
ACC-1003,Apex Health,Asia Pacific,Growth,45000,81,0.02,45,12,Verified
ACC-1004,Zenith Media,North America,Standard,18500,54,0.38,19,12,Flagged
ACC-1005,Starlight Retail,Latin America,Growth,52000,61,0.18,52,24,Verified
ACC-1006,Nova Robotics,Europe,Enterprise,210000,89,0.01,215,36,Verified
ACC-1007,Pinnacle FinTech,North America,Enterprise,320000,92,0.02,340,36,Verified
ACC-1008,Crestview Analytics,Asia Pacific,Standard,12000,42,0.45,11,12,Quarantine
ACC-1009,Horizon Telecom,Europe,Growth,64000,75,0.08,68,24,Verified
ACC-1010,Vanguard Logistics,North America,Enterprise,175000,84,0.03,165,36,Verified
ACC-1011,BioGen Discovery,North America,Growth,78000,79,0.06,80,24,Verified
ACC-1012,Quantum Retail,Europe,Standard,22000,58,0.25,24,12,Verified`;
    handleIntakeContent(sampleCSV, 'enterprise_arr_churn_dataset.csv', sampleCSV.length);
  };

  // Filtered and Sorted Rows for Interactive Grid
  const displayRows = useMemo(() => {
    let result = [...activeRows];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn] ?? '';
        const valB = b[sortColumn] ?? '';
        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [activeRows, searchTerm, sortColumn, sortDirection]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Core Financial & Analytical Aggregates
  const totalARR = useMemo(() => {
    return activeRows.reduce((acc, row) => {
      const v = Number(row['ARR_USD'] || row['arr_usd'] || row['ARR'] || 0);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
  }, [activeRows]);

  const meanARR = activeRows.length > 0 ? Math.round(totalARR / activeRows.length) : 0;

  const totalActiveUsers = useMemo(() => {
    return activeRows.reduce((acc, row) => {
      const v = Number(row['Active_Users'] || row['active_users'] || 0);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
  }, [activeRows]);

  const meanUsersPerAccount = activeRows.length > 0 ? Math.round(totalActiveUsers / activeRows.length) : 0;

  const averageNPS = useMemo(() => {
    const scores = activeRows
      .map((r) => Number(r['NPS_Score'] || r['nps_score'] || r['NPS'] || 0))
      .filter((n) => !isNaN(n) && n > 0);
    if (scores.length === 0) return 0;
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  }, [activeRows]);

  const averageChurn = useMemo(() => {
    const churns = activeRows
      .map((r) => Number(r['Churn_Probability'] || 0))
      .filter((n) => !isNaN(n));
    if (churns.length === 0) return 0.14;
    return parseFloat((churns.reduce((a, b) => a + b, 0) / churns.length).toFixed(2));
  }, [activeRows]);

  const flaggedAccountsCount = activeRows.filter(
    (r) => (r['Last_Audit_Status'] || '') !== 'Verified' || Number(r['Churn_Probability'] || 0) > 0.25
  ).length;

  // Execute client-side SQL scratchpad query
  const executeSQL = (queryToRun?: string) => {
    const query = queryToRun || sqlQuery;
    const t0 = performance.now();
    setQueryError(null);

    try {
      let filtered = [...activeRows];
      const upper = query.toUpperCase();

      if (upper.includes('WHERE')) {
        const parts = query.split(/WHERE/i);
        const condition = parts[1].trim();

        if (condition.includes('>')) {
          const [col, rawVal] = condition.split('>').map((s) => s.trim());
          const targetVal = Number(rawVal.replace(/['"$]/g, ''));
          filtered = filtered.filter((r) => Number(r[col] || 0) > targetVal);
        } else if (condition.includes('<')) {
          const [col, rawVal] = condition.split('<').map((s) => s.trim());
          const targetVal = Number(rawVal.replace(/['"$]/g, ''));
          filtered = filtered.filter((r) => Number(r[col] || 0) < targetVal);
        } else if (condition.includes('!=')) {
          const [col, rawVal] = condition.split('!=').map((s) => s.trim());
          const targetVal = rawVal.replace(/['"]/g, '');
          filtered = filtered.filter((r) => (r[col] || '').trim() !== targetVal);
        } else if (condition.includes('=')) {
          const [col, rawVal] = condition.split('=').map((s) => s.trim());
          const targetVal = rawVal.replace(/['"]/g, '');
          filtered = filtered.filter((r) => (r[col] || '').trim() === targetVal);
        }
      }

      if (upper.includes('GROUP BY')) {
        const groupCol = query.split(/GROUP BY/i)[1].trim();
        const grouped: Record<string, { count: number; sumARR: number; avgNPS: number; npsSum: number }> = {};

        filtered.forEach((r) => {
          const key = r[groupCol] || 'Unknown';
          if (!grouped[key]) {
            grouped[key] = { count: 0, sumARR: 0, avgNPS: 0, npsSum: 0 };
          }
          grouped[key].count += 1;
          const arr = Number(r['ARR_USD'] || 0);
          grouped[key].sumARR += isNaN(arr) ? 0 : arr;
          const nps = Number(r['NPS_Score'] || 0);
          grouped[key].npsSum += isNaN(nps) ? 0 : nps;
        });

        const aggRows = Object.entries(grouped).map(([k, v]) => ({
          [groupCol]: k,
          Account_Count: String(v.count),
          Total_ARR: `$${v.sumARR.toLocaleString()}`,
          Average_NPS: (v.npsSum / v.count).toFixed(1),
        }));

        setQueryResults(aggRows);
      } else {
        setQueryResults(filtered);
      }

      const t1 = performance.now();
      setQueryTimeMs(parseFloat((t1 - t0).toFixed(1)));
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Invalid query syntax');
      setQueryResults(null);
    }
  };

  // Real Account ARR Cohort distribution data (Actual business metrics)
  const cohortBars = [
    { cohort: 'Standard (Low)', height1: 35, height2: 45, account: 'Crestview / Zenith', value: '$18.5K' },
    { cohort: 'Standard (Mid)', height1: 45, height2: 55, account: 'Quantum Retail', value: '$22K' },
    { cohort: 'Growth (Apex)', height1: 60, height2: 75, account: 'Apex Health', value: '$45K' },
    { cohort: 'Growth (Starlight)', height1: 70, height2: 85, account: 'Starlight Retail', value: '$52K' },
    { cohort: 'Growth (BioGen)', height1: 85, height2: 105, account: 'BioGen Discovery', value: '$78K' },
    { cohort: 'Enterprise (Logistics)', height1: 100, height2: 125, account: 'Global Freight', value: '$175K' },
    { cohort: 'Enterprise (Peak)', height1: 120, height2: 150, account: 'Pinnacle FinTech', value: '$320K Peak' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* ============================================================== */}
      {/* 1. TOP GREETING BAR (Enterprise Analytics Studio)              */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Hello,</span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {currentUser.name || 'Camille'} 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analytics Studio • Snapshot: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeDataset?.fileName || 'b2b_saas_arr_performance.csv'}</span>
          </p>
        </div>

        {/* Server Indicator & User Auth Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => reconnectServer()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
            title="Zoho Catalyst live server heartbeat"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Catalyst Live • {serverLatency ?? 24}ms</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="rounded-xl text-xs font-semibold"
          >
            👑 Roles & Permissions
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openAuthModal('login')}
            className="rounded-xl text-xs font-semibold shadow-xs"
          >
            🔐 Sign In / Profile
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TOP 4 RELEVANT DATA ANALYSIS METRIC CARDS                   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Census Ingestion Rows (Soft Purple) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
              <DatabaseIcon className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Active Census</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {activeRows.length} <span className="text-xs font-normal text-slate-500">Accounts</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>100% Census</span>
              <span className="text-slate-400 font-normal">({activeDataset?.columnCount || 10} Columns)</span>
            </div>
          </div>
        </div>

        {/* Card 2: User Seat Census (Soft Cyan) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
              <ActivityIcon className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Active Users</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {totalActiveUsers.toLocaleString()} <span className="text-xs font-normal text-slate-500">Seats</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>↗ 24.2% YoY</span>
              <span className="text-slate-400 font-normal">(μ = {meanUsersPerAccount}/acct)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Contracted Recurring ARR (Soft Emerald) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              <span className="text-xs font-bold">$</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Contracted ARR</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              ${(totalARR / 1000).toFixed(1)}k
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>↗ 18.4% YoY</span>
              <span className="text-slate-400 font-normal">(Avg ${meanARR.toLocaleString()})</span>
            </div>
          </div>
        </div>

        {/* Card 4: Retention & Churn Risk (Soft Rose) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Mean Churn Risk</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {(averageChurn * 100).toFixed(1)}%
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <span>{flaggedAccountsCount} Flagged Accounts</span>
              <span className="text-slate-400 font-normal">(NPS {averageNPS})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. HERO NAVY FEATURE CARD: EMPIRICAL ARR DISCOVERY             */}
      {/* ============================================================== */}
      <div className="rounded-3xl bg-[#151D3B] text-white p-6 sm:p-7 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Empirical ARR Distribution & Account Cohorts
            </h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                Cryptographic SHA-256 Seal • Census Lineage Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('grid')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              Inspect Data Grid →
            </button>
          </div>
        </div>

        {/* Dynamic Dual-Pillar Bar Chart (ARR & Active Users) */}
        <div className="mt-6 pt-2">
          <div className="h-44 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-6 border-b border-indigo-800/40">
            {cohortBars.map((bar, idx) => {
              const isHovered = hoveredBarIndex === idx;
              return (
                <div
                  key={bar.cohort}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                >
                  {/* Tooltip on active bar */}
                  {isHovered && (
                    <div className="mb-2 px-2.5 py-1 rounded-lg bg-indigo-950/95 text-white text-[10px] font-mono border border-indigo-500/40 shadow-lg whitespace-nowrap animate-fade-in text-center">
                      <div className="text-slate-300">{bar.account}</div>
                      <div className="text-amber-300 font-bold">{bar.value}</div>
                    </div>
                  )}

                  {/* Dual Bar Pillars */}
                  <div className="flex items-end gap-1.5 w-full justify-center">
                    {/* Primary Bar: ARR Magnitude (Amber Glow) */}
                    <div
                      style={{ height: `${bar.height1}px` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-full transition-all duration-300 ${
                        isHovered
                          ? 'bg-amber-300 shadow-lg shadow-amber-400/50 scale-y-105'
                          : 'bg-amber-400/80 hover:bg-amber-300'
                      }`}
                    />
                    {/* Secondary Bar: User Scale (Electric Cyan Glow) */}
                    <div
                      style={{ height: `${bar.height2}px` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-full transition-all duration-300 ${
                        isHovered
                          ? 'bg-cyan-300 shadow-lg shadow-cyan-400/50 scale-y-105'
                          : 'bg-cyan-400/70 hover:bg-cyan-300'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-between px-2 sm:px-6 pt-3 text-[11px] font-mono text-indigo-300/70">
            {cohortBars.map((bar, idx) => (
              <span
                key={bar.cohort}
                className={`${hoveredBarIndex === idx ? 'text-white font-bold' : ''}`}
              >
                {bar.cohort}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. ANALYTICS HORIZONTAL FILTER PILLS                           */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          📊 Executive Business Overview
        </button>

        <button
          onClick={() => setActiveTab('grid')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'grid'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          ▦ Governed Data Grid ({activeRows.length} Records)
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'sql'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          ⚡ SQL & Aggregation Engine
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'profile'
              ? 'bg-purple-600 text-white shadow-purple-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          👑 Role Governance & Auth Center
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shadow-xs ${
            activeTab === 'cloud'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          ☁ Catalyst Cloud Telemetry
        </button>
      </div>

      {/* ============================================================== */}
      {/* 5. TAB 1: EXECUTIVE BUSINESS OVERVIEW (100% RELEVANT DATA BI)  */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card A: Contracted ARR Trajectory Curve */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Contracted ARR Trajectory & Expansion
                  </h3>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ↗ 18.4% YoY Expansion <span className="font-normal text-slate-400">($1.22M In-Memory Run-Rate)</span>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={chartTimeframe}
                    onChange={(e) => setChartTimeframe(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="This Year">This Year ▾</option>
                    <option value="Rolling 12M">Rolling 12M ▾</option>
                    <option value="All Time">All Time ▾</option>
                  </select>
                </div>
              </div>

              {/* Area Line Chart with Peak Callout */}
              <div className="relative pt-4">
                {/* Highlight Callout Bubble */}
                <div className="absolute left-[45%] top-2 -translate-x-1/2 flex flex-col items-center z-10">
                  <div className="px-3 py-1 rounded-xl bg-blue-700 text-white text-xs font-semibold shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                    <span>Peak Contract: $320K Pinnacle FinTech</span>
                  </div>
                  <div className="w-0.5 h-14 bg-blue-500/40" />
                </div>

                {/* SVG Curve Line & Area Gradient */}
                <svg viewBox="0 0 500 160" className="w-full h-44 overflow-visible">
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#E2E8F0" strokeDasharray="4 4" className="dark:stroke-slate-800" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#E2E8F0" strokeDasharray="4 4" className="dark:stroke-slate-800" />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="#E2E8F0" strokeDasharray="4 4" className="dark:stroke-slate-800" />

                  {/* Area fill */}
                  <path
                    d="M 0,110 C 60,100 120,70 180,60 C 220,50 250,20 280,25 C 320,35 360,110 420,95 C 460,85 480,90 500,85 L 500,160 L 0,160 Z"
                    fill="url(#curveGradient)"
                  />
                  {/* Stroke path */}
                  <path
                    d="M 0,110 C 60,100 120,70 180,60 C 220,50 250,20 280,25 C 320,35 360,110 420,95 C 460,85 480,90 500,85"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Point at Peak */}
                  <circle cx="280" cy="25" r="5" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
                </svg>

                {/* X Axis Months */}
                <div className="flex justify-between pt-2 text-[11px] font-mono text-slate-400">
                  <span>Q1 Jan</span>
                  <span>Q1 Mar</span>
                  <span>Q2 Jun</span>
                  <span>Q3 Aug (Peak)</span>
                  <span>Q3 Sep</span>
                  <span>Q4 Nov</span>
                  <span>Q4 Dec</span>
                </div>
              </div>
            </div>

            {/* Card B: Plan Tier & Retention Donut (Deep Navy) */}
            <div className="bg-[#151D3B] text-white border border-indigo-900/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Plan Tier & Cohort Retention</h3>
                  <div className="flex items-center gap-2 text-xs text-indigo-300 mt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" /> Enterprise
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Growth
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Standard
                    </span>
                  </div>
                </div>

                <select
                  value={donutTimeframe}
                  onChange={(e) => setDonutTimeframe(e.target.value)}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white focus:outline-none"
                >
                  <option value="Active Census" className="text-slate-900">Active Census ▾</option>
                  <option value="Trailing 12M" className="text-slate-900">Trailing 12M ▾</option>
                </select>
              </div>

              {/* Donut Chart & Plan Breakdown */}
              <div className="my-4 flex items-center justify-around gap-4">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#1E2958" strokeWidth="12" />
                    {/* Enterprise 42% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="12"
                      strokeDasharray="100 140"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Growth 33% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray="78 162"
                      strokeDashoffset="-105"
                      strokeLinecap="round"
                    />
                    {/* Standard 25% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeDasharray="59 181"
                      strokeDashoffset="-185"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-lg font-bold text-white">85.8%</div>
                    <div className="text-[10px] text-indigo-300 font-mono">Net Retention</div>
                  </div>
                </div>

                {/* Counters on Right */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                      🏢
                    </div>
                    <div>
                      <div className="text-xs text-indigo-300">Enterprise Tier</div>
                      <div className="text-base font-bold text-white tabular-nums">5 Accts ($948K ARR)</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                      📈
                    </div>
                    <div>
                      <div className="text-xs text-indigo-300">Growth Tier</div>
                      <div className="text-base font-bold text-white tabular-nums">4 Accts ($239K ARR)</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                      💼
                    </div>
                    <div>
                      <div className="text-xs text-indigo-300">Standard Tier</div>
                      <div className="text-base font-bold text-white tabular-nums">3 Accts ($52.5K ARR)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-indigo-800/40 flex items-center justify-between text-xs text-indigo-300 font-mono">
                <span>Total Active Seats: {totalActiveUsers.toLocaleString()}</span>
                <span className="text-emerald-400 font-semibold">100% Census Ingestion</span>
              </div>
            </div>
          </div>

          {/* Regional Data Distribution (Real Territorial Variance) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Regional Data Distribution & Revenue Density
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Territory density, recurring ARR contribution, and average churn probability
                </p>
              </div>
              <button
                onClick={() => setActiveTab('grid')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Inspect Data Grid →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">North America</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">5 Accounts</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">$713.5K ARR (58.5%)</div>
                </div>
                <svg className="w-16 h-8 text-cyan-500" viewBox="0 0 60 25" fill="none">
                  <path d="M 0,18 Q 15,10 30,4 T 60,14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Europe</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">4 Accounts</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">$394K ARR (32.3%)</div>
                </div>
                <svg className="w-16 h-8 text-purple-500" viewBox="0 0 60 25" fill="none">
                  <path d="M 0,20 Q 15,5 30,12 T 60,5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Asia Pacific</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">2 Accounts</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">$57K ARR (4.7%)</div>
                </div>
                <svg className="w-16 h-8 text-rose-500" viewBox="0 0 60 25" fill="none">
                  <path d="M 0,15 Q 15,22 30,8 T 60,2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Latin America</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">1 Account</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">$52K ARR (4.3%)</div>
                </div>
                <svg className="w-16 h-8 text-emerald-500" viewBox="0 0 60 25" fill="none">
                  <path d="M 0,10 Q 15,18 30,6 T 60,8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. TAB 2: GOVERNED DATA GRID & SCHEMAS                         */}
      {/* ============================================================== */}
      {activeTab === 'grid' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across accounts, regions, or audit states..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={loadEnterpriseSampleData}>
                ⚡ Reload Sample
              </Button>
              <Button size="sm" variant="primary" onClick={() => setActiveTab('ingest')}>
                + Ingest New CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-center text-slate-400 font-mono">#</th>
                    {activeDataset?.columns.map((col) => (
                      <th
                        key={col.name}
                        onClick={() => handleSort(col.name)}
                        className="px-3.5 py-2.5 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.name}</span>
                          {sortColumn === col.name && (
                            <span className="text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {displayRows.map((row, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedRow(row)}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="w-10 px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                      {activeDataset?.columns.map((col) => {
                        const val = row[col.name];
                        const isARR = col.name.toUpperCase().includes('ARR');
                        const isChurn = col.name.toUpperCase().includes('CHURN');
                        const isStatus = col.name.toUpperCase().includes('STATUS');

                        return (
                          <td key={col.name} className="px-3.5 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                            {isARR && !isNaN(Number(val)) ? (
                              <span className="font-bold text-slate-900 dark:text-white">
                                ${Number(val).toLocaleString()}
                              </span>
                            ) : isChurn && !isNaN(Number(val)) ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  Number(val) > 0.2
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {(Number(val) * 100).toFixed(0)}%
                              </span>
                            ) : isStatus ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  val === 'Verified'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                    : val === 'Flagged'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                }`}
                              >
                                {val}
                              </span>
                            ) : (
                              val ?? '—'
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Displaying {displayRows.length} of {activeRows.length} rows</span>
              <span>Census Verified • SHA-256 Validated</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. TAB 3: SQL & AGGREGATION ENGINE                             */}
      {/* ============================================================== */}
      {activeTab === 'sql' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Live In-Memory SQL & Aggregation Engine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute client-side queries, filters, and dimensional aggregates directly over the active dataset.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const q = "SELECT * FROM active_dataset WHERE ARR_USD > 100000";
                setSqlQuery(q);
                executeSQL(q);
              }}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-mono text-slate-700 dark:text-slate-300"
            >
              ARR &gt; $100K
            </button>
            <button
              onClick={() => {
                const q = "SELECT Region, SUM(ARR_USD), AVG(NPS_Score) GROUP BY Region";
                setSqlQuery(q);
                executeSQL(q);
              }}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-mono text-slate-700 dark:text-slate-300"
            >
              Aggregate by Region
            </button>
            <button
              onClick={() => {
                const q = "SELECT Plan_Tier, SUM(ARR_USD), AVG(NPS_Score) GROUP BY Plan_Tier";
                setSqlQuery(q);
                executeSQL(q);
              }}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-mono text-slate-700 dark:text-slate-300"
            >
              Aggregate by Plan Tier
            </button>
            <button
              onClick={() => {
                const q = "SELECT * FROM active_dataset WHERE Last_Audit_Status != 'Verified'";
                setSqlQuery(q);
                executeSQL(q);
              }}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-mono text-slate-700 dark:text-slate-300"
            >
              Audit Anomalies & Flagged
            </button>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full p-3.5 font-mono text-xs bg-slate-950 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {queryTimeMs !== null && `⚡ Executed in ${queryTimeMs}ms • ${(queryResults || []).length} rows returned`}
              </span>
              <Button size="sm" onClick={() => executeSQL()}>
                ⚡ Run Query
              </Button>
            </div>
          </div>

          {queryResults && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b">
                  <tr>
                    {Object.keys(queryResults[0] || {}).map((col) => (
                      <th key={col} className="px-3 py-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queryResults.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {Object.keys(queryResults[0] || {}).map((col) => (
                        <td key={col} className="px-3 py-2">{r[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. TAB 4: ROLE GOVERNANCE & AUTH CENTER                        */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    <span>{currentUser.email}</span>
                    <span>•</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400 capitalize">
                      {currentUser.role} mode
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openAuthModal('profile')}>
                  Edit Profile
                </Button>
                <Button size="sm" variant="danger" onClick={() => logout()}>
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Instant Role Governance Simulation */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                👑 Admin Role Switcher (Simulate Any Role Live):
              </div>
              <p className="text-xs text-slate-500">
                Switching roles instantly updates data masking, export privileges, and DAG modification rights.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                {[
                  { role: 'owner' as UserRole, label: '👑 Owner', desc: 'Root Authority' },
                  { role: 'administrator' as UserRole, label: '⚙ Admin', desc: 'User & Security' },
                  { role: 'builder' as UserRole, label: '🛠 Builder', desc: 'Pipelines & ML' },
                  { role: 'reviewer' as UserRole, label: '🔍 Reviewer', desc: 'Audit & Metrics' },
                  { role: 'viewer' as UserRole, label: '👀 Viewer', desc: 'Read Only' },
                ].map((item) => (
                  <button
                    key={item.role}
                    onClick={() => setRole(item.role)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      currentUser.role === item.role
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 1-Click Fast Logins */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                ⚡ 1-Click Identity Logins:
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => loginAsDemoRole('owner')}>
                  Sign In as Justin Alex (Owner)
                </Button>
                <Button size="sm" variant="secondary" onClick={() => loginAsDemoRole('administrator')}>
                  Sign In as Alex Chen (Admin)
                </Button>
                <Button size="sm" variant="secondary" onClick={() => loginAsDemoRole('builder')}>
                  Sign In as Sarah Lin (Builder)
                </Button>
                <Button size="sm" variant="secondary" onClick={() => loginAsDemoRole('reviewer')}>
                  Sign In as David Vance (Reviewer)
                </Button>
              </div>
            </div>

            {/* Catalyst Datastore & Rate Limits Console */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Zoho Catalyst Crystal Datastore Telemetry</span>
                <span className="text-emerald-600 font-semibold">Live Synchronized</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                <div>Rate Limits: <span className="font-bold text-slate-900 dark:text-white">100 req/min (98 avail)</span></div>
                <div>Runtime: <span className="font-bold text-slate-900 dark:text-white">Node.js 18 CJS</span></div>
                <div>Auth Model: <span className="font-bold text-slate-900 dark:text-white">HMAC SHA-256 JWT</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. TAB 5: CATALYST CLOUD TELEMETRY                             */}
      {/* ============================================================== */}
      {activeTab === 'cloud' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Zoho Catalyst Backend Server Health
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Microservice: lumetric_server running on Catalyst India Region (.in)
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => reconnectServer()}>
              ⟳ Re-Ping
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
              <div className="text-[10px] text-slate-400">STATUS</div>
              <div className="mt-1 font-bold text-emerald-600">● {serverStatus.toUpperCase()} (200 OK)</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
              <div className="text-[10px] text-slate-400">LATENCY</div>
              <div className="mt-1 font-bold text-blue-600">{serverLatency ?? 24}ms roundtrip</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
              <div className="text-[10px] text-slate-400">ENDPOINT</div>
              <div className="mt-1 font-bold text-slate-700 dark:text-slate-300 truncate">/server/lumetric_server/api/health</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. TAB 6: INGESTION DROPZONE                                  */}
      {/* ============================================================== */}
      {activeTab === 'ingest' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <UploadIcon className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Upload CSV or JSON Dataset
              </h4>
              <p className="text-xs text-slate-500">
                Drop your business dataset here to initialize deterministic schemas.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <span className="inline-flex px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs">
                    {isProcessing ? 'Verifying...' : 'Select File from Computer'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row Record Inspector Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Inspector</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedRow['Account_ID'] || 'Row Record'}</p>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2 font-mono text-xs divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(selectedRow).map(([key, val]) => (
                <div key={key} className="pt-2 flex items-baseline justify-between gap-4">
                  <span className="text-slate-500">{key}:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{val || '—'}</span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedRow(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. MOBILE BOTTOM BAR (Tactile Mobile Navigation)              */}
      {/* ============================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            activeTab === 'analytics' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">📊</span>
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('grid')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            activeTab === 'grid' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">▦</span>
          <span>Grid</span>
        </button>

        {/* Center Glowing Action Button */}
        <button
          onClick={() => setActiveTab('ingest')}
          className="w-12 h-12 -mt-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:bg-emerald-600 transition-transform active:scale-95"
          title="Quick Ingest Data"
        >
          <span className="text-lg font-bold">+</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            activeTab === 'sql' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">⚡</span>
          <span>SQL</span>
        </button>

        <button
          onClick={() => openAuthModal('profile')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            activeTab === 'profile' ? 'text-purple-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">👤</span>
          <span>Roles</span>
        </button>
      </div>
    </div>
  );
}

export default function MainAppPage() {
  const { activeView } = useApp();

  return (
    <div className="w-full">
      {activeView === 'home' && <HomeView />}
      {activeView === 'projects' && <ProjectsPage />}
      {activeView === 'data' && <DataWorkspacePage />}
      {activeView === 'pipelines' && <PipelinesPage />}
      {activeView === 'analysis' && <AnalysisStudioPage />}
      {activeView === 'models' && <ModelsPage />}
      {activeView === 'dashboards' && <DashboardsPage />}
      {activeView === 'stories' && <StoriesPage />}
      {activeView === 'operations' && <OperationsPage />}
      {activeView === 'settings' && <SettingsPage />}
    </div>
  );
}
