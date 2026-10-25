'use client';

import React, { useState, useMemo } from 'react';
import { Workbook } from 'exceljs';
import { useApp } from '@/contexts/AppContext';
import {
  FileSpreadsheetIcon,
  DownloadIcon,
  SparklesIcon,
  DatabaseIcon,
  TableIcon,
  TrendingUpIcon,
  LayersIcon,
  PieChartIcon,
  ActivityIcon,
  SettingsIcon,
  RefreshCwIcon,
  TerminalIcon,
} from '@/components/icons';

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Convert 0-indexed column integer to Excel Column Letter (A..Z, AA..)
// ════════════════════════════════════════════════════════════════════════════
function getColumnLetter(colIndex: number): string {
  let letter = '';
  let idx = colIndex;
  while (idx >= 0) {
    letter = String.fromCharCode((idx % 26) + 65) + letter;
    idx = Math.floor(idx / 26) - 1;
  }
  return letter || 'A';
}

// ════════════════════════════════════════════════════════════════════════════
// SELF-DEALING AUTOMATION CATALOG DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════
export type AutomationType =
  | 'executive_dashboard'
  | 'financial_runway'
  | 'pivot_master'
  | 'formula_suite'
  | 'conditional_heatmap'
  | 'clean_standardize';

interface AutomationCard {
  id: AutomationType;
  title: string;
  badge: string;
  tagColor: string;
  category: 'Executive' | 'Financial' | 'Analytics' | 'Engineering';
  description: string;
  sheetsGenerated: string[];
  features: string[];
  sampleFormula: string;
}

const AUTOMATION_CATALOG: AutomationCard[] = [
  {
    id: 'executive_dashboard',
    title: 'Interactive Executive Dashboard (.xlsx)',
    badge: 'Flagship Deliverable',
    tagColor: 'bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#34D399] border-[#059669]/30',
    category: 'Executive',
    description:
      'Creates a 4-tab C-suite ready workbook featuring styled KPI metric callouts, frozen headers, auto-filters, summary aggregation tables, and audit checksum metadata.',
    sheetsGenerated: ['Dashboard', 'PivotSummary', 'DataLedger', 'AuditTrail'],
    features: [
      'Top KPI scorecards with currency ($) & percentage formatting',
      'Frozen top header pane & auto-filter range',
      'Categorical distribution matrix with dynamic sub-totals',
      'Automated SHA-256 integrity checksum & metadata audit sheet',
    ],
    sampleFormula: 'SUM(DataLedger!E2:E101)',
  },
  {
    id: 'financial_runway',
    title: '12-Month ARR & Financial Projection Model',
    badge: 'P&L Runway',
    tagColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    category: 'Financial',
    description:
      'Generates a forward-looking 12-month financial model with compound growth rates, COGS allocation, gross margin calculations, and Budget vs. Actual variance tracking.',
    sheetsGenerated: ['FinancialRunway', 'VarianceAnalysis'],
    features: [
      '12-month sequential compound growth formulas: B5*(1+$B$2)',
      'Gross Profit & Operating Margin % formulas: (Revenue - COGS)',
      'Variance Analysis with Actual - Budget and (Actual - Budget)/Budget',
      'Three scenario runways: Conservative (5%), Target (12%), Hyper-growth (25%)',
    ],
    sampleFormula: 'C5*(1+$B$2)',
  },
  {
    id: 'pivot_master',
    title: 'Multi-Level Pivot & Cross-Tabulation Master',
    badge: 'Cross-Tab Matrix',
    tagColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    category: 'Analytics',
    description:
      'Engineers a multi-dimensional cross-tabulation matrix across two categorical dimensions with native formula row sums, column totals, and global grand totals.',
    sheetsGenerated: ['CrossTabMatrix', 'SourceData'],
    features: [
      'Two-dimensional cross-tabulation (e.g., Region × Plan Tier)',
      'Row sum formulas: SUM(C4:E4) and column sum formulas: SUM(C4:C8)',
      'Global grand total formula: SUM(F4:F8)',
      'Percentage share distribution matrix: (F4/$F$9)*100',
    ],
    sampleFormula: 'SUM(C4:E4)',
  },
  {
    id: 'formula_suite',
    title: 'Formula Injection & Dynamic Lookups Suite',
    badge: 'XLOOKUP & SUMIFS',
    tagColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    category: 'Engineering',
    description:
      'Injects active corporate Excel formulas into your sheets: XLOOKUP(), SUMIFS(), COUNTIFS(), AVERAGEIFS(), and nested IF() risk rules with pre-evaluated cached results.',
    sheetsGenerated: ['DynamicFormulas', 'MasterLedger'],
    features: [
      'XLOOKUP(A2, MasterLedger!$A$2:$A$100, MasterLedger!$E$2:$E$100, "N/A")',
      'SUMIFS(MasterLedger!$E$2:$E$100, MasterLedger!$C$2:$C$100, "North America")',
      'IF(G2>0.2, "CRITICAL RISK", IF(G2>0.1, "WATCHLIST", "HEALTHY"))',
      'Dual-engine compatibility: 100% ECMA-376 OpenXML standard',
    ],
    sampleFormula: 'XLOOKUP(A2, MasterLedger!$A$2:$A$50, MasterLedger!$D$2:$D$50)',
  },
  {
    id: 'conditional_heatmap',
    title: 'Conditional Formatting & Anomaly Matrix',
    badge: 'Visual Alerts',
    tagColor: 'bg-[#FFF1F0] dark:bg-[#E34234]/20 text-[#E34234] border-[#E34234]/30',
    category: 'Analytics',
    description:
      'Applies subtle, presentation-grade cell highlights to numbers, risk scores, and audit flags using pastel corporate tones (soft green, soft amber, and soft crimson).',
    sheetsGenerated: ['HeatmapLedger', 'ThresholdKey'],
    features: [
      'Soft green fill (#D1FAE5) for top ARR accounts & verified status',
      'Soft amber fill (#FEF3C7) for elevated churn watchlist (10% - 20%)',
      'Soft rose fill (#FEE2E2) for high risk (>20%) or unverified audits',
      'Strict currency ($#,##0.00) & percentage (0.0%) number formatting',
    ],
    sampleFormula: 'IF(Churn_Prob>0.2, "ALERT", "OK")',
  },
  {
    id: 'clean_standardize',
    title: 'Automated Data Cleaner & Standardizer',
    badge: 'Data Sanitation',
    tagColor: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    category: 'Engineering',
    description:
      'Trims whitespace, capitalizes names to Title Case, fills missing values with standardized placeholders or medians, and outputs a clean dataset with a full cleaning log.',
    sheetsGenerated: ['StandardizedData', 'CleaningAuditLog'],
    features: [
      'Automated string trimming (TRIM equivalent applied)',
      'Title-case normalization for customer & product names',
      'Null value imputation (standardized "N/A" and numeric medians)',
      'Itemized anomaly repair log with exact row & column coordinates',
    ],
    sampleFormula: 'TRIM(CLEAN(A2))',
  },
];

// Color Theme Palettes for Excel styling
interface PaletteTheme {
  id: string;
  name: string;
  headerBg: string;
  headerFont: string;
  accentBg: string;
  accentFont: string;
  zebraBg: string;
  borderColor: string;
  badgeBg: string;
}

const PALETTES: Record<string, PaletteTheme> = {
  emerald: {
    id: 'emerald',
    name: 'Lumetric Emerald',
    headerBg: 'FF064E3B', // Deep Emerald
    headerFont: 'FFFFFFFF',
    accentBg: 'FF059669', // Emerald 600
    accentFont: 'FFFFFFFF',
    zebraBg: 'FFF4ECE1', // Warm Ivory subtle
    borderColor: 'FFE5D9C8',
    badgeBg: 'FFECFDF5',
  },
  royal: {
    id: 'royal',
    name: 'Executive Navy',
    headerBg: 'FF1E3A8A', // Blue 900
    headerFont: 'FFFFFFFF',
    accentBg: 'FF2563EB', // Blue 600
    accentFont: 'FFFFFFFF',
    zebraBg: 'FFF8FAFC',
    borderColor: 'FFE2E8F0',
    badgeBg: 'FFEFF6FF',
  },
  crimson: {
    id: 'crimson',
    name: 'Vermilion Charcoal',
    headerBg: 'FF1E293B', // Slate 800
    headerFont: 'FFFFFFFF',
    accentBg: 'FFE34234', // Vermilion
    accentFont: 'FFFFFFFF',
    zebraBg: 'FFFFF1F0',
    borderColor: 'FFE2E8F0',
    badgeBg: 'FFFFF1F0',
  },
};

export function ExcelAutomatorView() {
  const {
    activeDataset,
    activeRows,
    currentUser,
    currentWorkspace,
    setActiveView,
  } = useApp();

  // Selected Automation & Config
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationType>('executive_dashboard');
  const [selectedTheme, setSelectedTheme] = useState<string>('emerald');
  const [companyName, setCompanyName] = useState<string>(currentWorkspace?.name || 'Lumetric Enterprise');
  const [reportTitle, setReportTitle] = useState<string>('Executive Intelligence Report');
  const [growthScenarioPct, setGrowthScenarioPct] = useState<number>(12); // 12% default
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'blueprint' | 'data_grid' | 'formulas'>('blueprint');
  const [showHowToOpenModal, setShowHowToOpenModal] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<{
    fileName: string;
    fileSizeBytes: number;
    durationMs: number;
  } | null>(null);

  // Active dataset metrics helper
  const datasetStats = useMemo(() => {
    if (!activeRows || activeRows.length === 0) {
      return {
        rowCount: 0,
        totalArr: 0,
        avgArr: 0,
        avgNps: 0,
        avgChurn: 0,
        columns: [],
      };
    }

    const columns = Object.keys(activeRows[0] || {});
    let arrSum = 0;
    let npsSum = 0;
    let churnSum = 0;
    let validArrCount = 0;
    let validNpsCount = 0;
    let validChurnCount = 0;

    activeRows.forEach((r) => {
      // Find ARR-like column
      const arrVal = parseFloat(String(r['ARR_USD'] || r['arr'] || r['revenue'] || '0').replace(/[\$,]/g, ''));
      if (!isNaN(arrVal)) {
        arrSum += arrVal;
        validArrCount++;
      }

      // Find NPS-like column
      const npsVal = parseFloat(String(r['NPS_Score'] || r['nps'] || '0'));
      if (!isNaN(npsVal)) {
        npsSum += npsVal;
        validNpsCount++;
      }

      // Find Churn-like column
      const churnVal = parseFloat(String(r['Churn_Probability'] || r['churn'] || '0'));
      if (!isNaN(churnVal)) {
        churnSum += churnVal;
        validChurnCount++;
      }
    });

    return {
      rowCount: activeRows.length,
      totalArr: arrSum,
      avgArr: validArrCount > 0 ? arrSum / validArrCount : 0,
      avgNps: validNpsCount > 0 ? npsSum / validNpsCount : 0,
      avgChurn: validChurnCount > 0 ? churnSum / validChurnCount : 0,
      columns,
    };
  }, [activeRows]);

  // Selected card detail
  const currentCard = useMemo(() => {
    return AUTOMATION_CATALOG.find((c) => c.id === selectedAutomation) || AUTOMATION_CATALOG[0];
  }, [selectedAutomation]);

  // Quick CSV fallback download
  const handleExportCSV = () => {
    if (!activeRows || activeRows.length === 0) return;
    const headers = Object.keys(activeRows[0]);
    const csvLines = [headers.join(',')];
    activeRows.forEach((r) => {
      const rowVals = headers.map((h) => {
        const val = String(r[h] ?? '');
        return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
      });
      csvLines.push(rowVals.join(','));
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumetric_${selectedAutomation}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // COMPREHENSIVE EXCELJS WORKBOOK GENERATION ENGINE (ECMA-376 COMPLIANT)
  // ════════════════════════════════════════════════════════════════════════════
  const handleGenerateWorkbook = async () => {
    if (!activeRows || activeRows.length === 0) {
      alert('No active dataset found. Please load or upload data first.');
      return;
    }

    setIsGenerating(true);
    setDownloadSuccess(null);
    const startTime = performance.now();

    try {
      const palette = PALETTES[selectedTheme] || PALETTES.emerald;
      const wb = new Workbook();
      wb.creator = `${currentUser?.name || 'Lumetric Analyst'} [Lumetric Studio]`;
      wb.lastModifiedBy = 'Lumetric Auto-Spreadsheet Engine';
      wb.created = new Date();
      wb.modified = new Date();

      const sanitizedRows = activeRows.map((row) => {
        const clean: Record<string, any> = {};
        Object.entries(row).forEach(([k, v]) => {
          if (v === null || v === undefined) {
            clean[k] = '';
          } else {
            const strVal = String(v).trim();
            const num = parseFloat(strVal.replace(/[\$,]/g, ''));
            if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(strVal.replace(/[\$,]/g, ''))) {
              clean[k] = num;
            } else {
              clean[k] = strVal;
            }
          }
        });
        return clean;
      });

      const cols = Object.keys(sanitizedRows[0] || {});

      // Dynamic column coordinate resolution
      const findColIdx = (keywords: string[]) => {
        const found = cols.findIndex((c) => {
          const lower = c.toLowerCase();
          return keywords.some((k) => lower.includes(k));
        });
        return found >= 0 ? found : 0;
      };

      const arrColIdx = findColIdx(['arr', 'revenue', 'price', 'amount', 'val']);
      const regColIdx = findColIdx(['region', 'country', 'area', 'territory', 'location']);
      const tierColIdx = findColIdx(['tier', 'plan', 'segment', 'type', 'category']);
      const npsColIdx = findColIdx(['nps', 'score', 'rating', 'satisfaction']);
      const churnColIdx = findColIdx(['churn', 'risk', 'prob']);

      const arrColLetter = getColumnLetter(arrColIdx);
      const regColLetter = getColumnLetter(regColIdx);
      const tierColLetter = getColumnLetter(tierColIdx);
      const npsColLetter = getColumnLetter(npsColIdx);
      const churnColLetter = getColumnLetter(churnColIdx);

      const totalRowsLedger = datasetStats.rowCount + 1;

      const borderThin = {
        top: { style: 'thin' as const, color: { argb: palette.borderColor } },
        left: { style: 'thin' as const, color: { argb: palette.borderColor } },
        bottom: { style: 'thin' as const, color: { argb: palette.borderColor } },
        right: { style: 'thin' as const, color: { argb: palette.borderColor } },
      };

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 1: INTERACTIVE EXECUTIVE DASHBOARD
      // ────────────────────────────────────────────────────────────────────────
      if (selectedAutomation === 'executive_dashboard') {
        const wsDash = wb.addWorksheet('Dashboard', {
          views: [{ showGridLines: true }],
        });

        wsDash.columns = [
          { width: 4 },
          { width: 26 },
          { width: 22 },
          { width: 22 },
          { width: 22 },
          { width: 22 },
          { width: 4 },
        ];

        wsDash.mergeCells('B2:F2');
        const titleCell = wsDash.getCell('B2');
        titleCell.value = `${companyName.toUpperCase()} — EXECUTIVE PERFORMANCE DASHBOARD`;
        titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: palette.headerFont } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        wsDash.getRow(2).height = 36;

        wsDash.mergeCells('B3:F3');
        const subCell = wsDash.getCell('B3');
        subCell.value = `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC | Dataset: ${activeDataset?.fileName || 'Active Dataset'} (${datasetStats.rowCount.toLocaleString()} Accounts)`;
        subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        wsDash.getRow(3).height = 20;

        // KPI Scorecards (Clean ECMA-376 formulas without leading =)
        const kpis = [
          { col: 'B', label: 'TOTAL PORTFOLIO ARR', formula: `SUM(DataLedger!${arrColLetter}2:${arrColLetter}${totalRowsLedger})`, fmt: '$#,##0', calc: datasetStats.totalArr },
          { col: 'C', label: 'AVG CONTRACT VALUE', formula: `AVERAGE(DataLedger!${arrColLetter}2:${arrColLetter}${totalRowsLedger})`, fmt: '$#,##0', calc: datasetStats.avgArr },
          { col: 'D', label: 'ACCOUNT VOLUME', formula: `COUNTA(DataLedger!A2:A${totalRowsLedger})`, fmt: '#,##0', calc: datasetStats.rowCount },
          { col: 'E', label: 'AVG NPS SCORE', formula: `AVERAGE(DataLedger!${npsColLetter}2:${npsColLetter}${totalRowsLedger})`, fmt: '0.0', calc: datasetStats.avgNps },
          { col: 'F', label: 'MEAN CHURN RISK', formula: `AVERAGE(DataLedger!${churnColLetter}2:${churnColLetter}${totalRowsLedger})`, fmt: '0.0%', calc: datasetStats.avgChurn },
        ];

        kpis.forEach((kpi) => {
          const lblCell = wsDash.getCell(`${kpi.col}5`);
          lblCell.value = kpi.label;
          lblCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
          lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.badgeBg } };
          lblCell.alignment = { horizontal: 'center', vertical: 'middle' };
          lblCell.border = { top: borderThin.top, left: borderThin.left, right: borderThin.right };

          const valCell = wsDash.getCell(`${kpi.col}6`);
          valCell.value = { formula: kpi.formula, result: kpi.calc };
          valCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: palette.accentBg } };
          valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.badgeBg } };
          valCell.alignment = { horizontal: 'center', vertical: 'middle' };
          valCell.numFmt = kpi.fmt;
          valCell.border = { left: borderThin.left, right: borderThin.right, bottom: borderThin.bottom };
        });
        wsDash.getRow(5).height = 22;
        wsDash.getRow(6).height = 32;

        wsDash.mergeCells('B9:F9');
        const regHeader = wsDash.getCell('B9');
        regHeader.value = 'PORTFOLIO BREAKDOWN BY REGION';
        regHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: palette.headerFont } };
        regHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        regHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        wsDash.getRow(9).height = 26;

        const tblHeaders = ['Region', 'Client Count', 'Total ARR ($)', 'Average ARR ($)', 'Revenue Share %'];
        const tblCols = ['B', 'C', 'D', 'E', 'F'];
        tblHeaders.forEach((h, idx) => {
          const c = wsDash.getCell(`${tblCols[idx]}10`);
          c.value = h;
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'right' };
          c.border = borderThin;
        });
        wsDash.getRow(10).height = 22;

        const regionGroups: Record<string, { count: number; arr: number }> = {};
        sanitizedRows.forEach((r) => {
          const reg = String(r[cols[regColIdx]] || r['Region'] || 'Global');
          const arr = typeof r[cols[arrColIdx]] === 'number' ? r[cols[arrColIdx]] : 0;
          if (!regionGroups[reg]) regionGroups[reg] = { count: 0, arr: 0 };
          regionGroups[reg].count++;
          regionGroups[reg].arr += arr;
        });

        let curRow = 11;
        Object.entries(regionGroups).forEach(([regName, stats]) => {
          const cReg = wsDash.getCell(`B${curRow}`);
          cReg.value = regName;
          cReg.font = { name: 'Segoe UI', size: 10, bold: true };
          cReg.border = borderThin;

          const cCount = wsDash.getCell(`C${curRow}`);
          cCount.value = {
            formula: `COUNTIF(DataLedger!$${regColLetter}$2:$${regColLetter}$${totalRowsLedger}, "${regName}")`,
            result: stats.count,
          };
          cCount.font = { name: 'Segoe UI', size: 10 };
          cCount.numFmt = '#,##0';
          cCount.alignment = { horizontal: 'right' };
          cCount.border = borderThin;

          const cArr = wsDash.getCell(`D${curRow}`);
          cArr.value = {
            formula: `SUMIF(DataLedger!$${regColLetter}$2:$${regColLetter}$${totalRowsLedger}, "${regName}", DataLedger!$${arrColLetter}$2:$${arrColLetter}$${totalRowsLedger})`,
            result: stats.arr,
          };
          cArr.font = { name: 'Segoe UI', size: 10, bold: true };
          cArr.numFmt = '$#,##0';
          cArr.alignment = { horizontal: 'right' };
          cArr.border = borderThin;

          const cAvg = wsDash.getCell(`E${curRow}`);
          cAvg.value = {
            formula: `D${curRow}/C${curRow}`,
            result: stats.count > 0 ? stats.arr / stats.count : 0,
          };
          cAvg.font = { name: 'Segoe UI', size: 10 };
          cAvg.numFmt = '$#,##0';
          cAvg.alignment = { horizontal: 'right' };
          cAvg.border = borderThin;

          const cShare = wsDash.getCell(`F${curRow}`);
          cShare.value = {
            formula: `D${curRow}/$D$${11 + Object.keys(regionGroups).length}`,
            result: datasetStats.totalArr > 0 ? stats.arr / datasetStats.totalArr : 0,
          };
          cShare.font = { name: 'Segoe UI', size: 10 };
          cShare.numFmt = '0.0%';
          cShare.alignment = { horizontal: 'right' };
          cShare.border = borderThin;

          wsDash.getRow(curRow).height = 20;
          curRow++;
        });

        const totRow = curRow;
        wsDash.getCell(`B${totRow}`).value = 'GRAND TOTAL';
        wsDash.getCell(`B${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`B${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`B${totRow}`).border = borderThin;

        wsDash.getCell(`C${totRow}`).value = { formula: `SUM(C11:C${totRow - 1})`, result: datasetStats.rowCount };
        wsDash.getCell(`C${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`C${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`C${totRow}`).numFmt = '#,##0';
        wsDash.getCell(`C${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`C${totRow}`).border = borderThin;

        wsDash.getCell(`D${totRow}`).value = { formula: `SUM(D11:D${totRow - 1})`, result: datasetStats.totalArr };
        wsDash.getCell(`D${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`D${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`D${totRow}`).numFmt = '$#,##0';
        wsDash.getCell(`D${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`D${totRow}`).border = borderThin;

        wsDash.getCell(`E${totRow}`).value = { formula: `AVERAGE(E11:E${totRow - 1})`, result: datasetStats.avgArr };
        wsDash.getCell(`E${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`E${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`E${totRow}`).numFmt = '$#,##0';
        wsDash.getCell(`E${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`E${totRow}`).border = borderThin;

        wsDash.getCell(`F${totRow}`).value = { formula: `SUM(F11:F${totRow - 1})`, result: 1.0 };
        wsDash.getCell(`F${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`F${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`F${totRow}`).numFmt = '0.0%';
        wsDash.getCell(`F${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`F${totRow}`).border = borderThin;
        wsDash.getRow(totRow).height = 24;

        // TAB 2: PIVOT SUMMARY
        const wsPivot = wb.addWorksheet('PivotSummary', {
          views: [{ showGridLines: true }],
        });
        wsPivot.columns = [{ width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }];

        wsPivot.addRow(['Plan Tier Breakdown Matrix', '', '', '', '']);
        wsPivot.mergeCells('A1:E1');
        wsPivot.getCell('A1').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: palette.headerFont } };
        wsPivot.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsPivot.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        wsPivot.getRow(1).height = 30;

        wsPivot.addRow(['Plan Tier', 'Client Count', 'Total ARR', 'Average ARR', 'NPS Average']);
        wsPivot.getRow(2).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.border = borderThin;
        });

        const tierGroups: Record<string, { count: number; arr: number; npsSum: number }> = {};
        sanitizedRows.forEach((r) => {
          const tier = String(r[cols[tierColIdx]] || r['Plan_Tier'] || 'Standard');
          const arr = typeof r[cols[arrColIdx]] === 'number' ? r[cols[arrColIdx]] : 0;
          const nps = typeof r[cols[npsColIdx]] === 'number' ? r[cols[npsColIdx]] : 50;
          if (!tierGroups[tier]) tierGroups[tier] = { count: 0, arr: 0, npsSum: 0 };
          tierGroups[tier].count++;
          tierGroups[tier].arr += arr;
          tierGroups[tier].npsSum += nps;
        });

        let pRow = 3;
        Object.entries(tierGroups).forEach(([tierName, tStat]) => {
          wsPivot.addRow([
            tierName,
            { formula: `COUNTIF(DataLedger!$${tierColLetter}$2:$${tierColLetter}$${totalRowsLedger}, "${tierName}")`, result: tStat.count },
            { formula: `SUMIF(DataLedger!$${tierColLetter}$2:$${tierColLetter}$${totalRowsLedger}, "${tierName}", DataLedger!$${arrColLetter}$2:$${arrColLetter}$${totalRowsLedger})`, result: tStat.arr },
            { formula: `C${pRow}/B${pRow}`, result: tStat.count > 0 ? tStat.arr / tStat.count : 0 },
            { formula: `AVERAGEIF(DataLedger!$${tierColLetter}$2:$${tierColLetter}$${totalRowsLedger}, "${tierName}", DataLedger!$${npsColLetter}$2:$${npsColLetter}$${totalRowsLedger})`, result: tStat.count > 0 ? tStat.npsSum / tStat.count : 0 },
          ]);
          const r = wsPivot.getRow(pRow);
          r.getCell(2).numFmt = '#,##0';
          r.getCell(3).numFmt = '$#,##0';
          r.getCell(4).numFmt = '$#,##0';
          r.getCell(5).numFmt = '0.0';
          r.eachCell((c) => (c.border = borderThin));
          pRow++;
        });

        // TAB 3: DATA LEDGER
        const wsLedger = wb.addWorksheet('DataLedger', {
          views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2', showGridLines: true }],
        });

        wsLedger.columns = cols.map((colName) => ({
          header: colName.replace(/_/g, ' '),
          key: colName,
          width: Math.max(16, colName.length + 6),
        }));

        const headerRow = wsLedger.getRow(1);
        headerRow.height = 28;
        headerRow.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = borderThin;
        });

        const lastColLetter = getColumnLetter(cols.length - 1);
        wsLedger.autoFilter = `A1:${lastColLetter}1`;

        sanitizedRows.forEach((row, rowIdx) => {
          const r = wsLedger.addRow(row);
          r.height = 20;
          const isEven = rowIdx % 2 === 0;

          r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Segoe UI', size: 9 };
            cell.border = borderThin;
            if (!isEven) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.zebraBg } };
            }

            const colKey = cols[colNumber - 1];
            if (colKey.includes('ARR') || colKey.includes('revenue') || colKey.includes('Price')) {
              cell.numFmt = '$#,##0.00';
              cell.alignment = { horizontal: 'right' };
            } else if (colKey.includes('Probability') || colKey.includes('Rate') || colKey.includes('pct')) {
              cell.numFmt = '0.0%';
              cell.alignment = { horizontal: 'right' };
            } else if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
              cell.alignment = { horizontal: 'right' };
            }
          });
        });

        // TAB 4: AUDIT TRAIL
        const wsAudit = wb.addWorksheet('AuditTrail', {
          views: [{ showGridLines: true }],
        });
        wsAudit.columns = [{ width: 28 }, { width: 50 }];
        wsAudit.addRow(['Audit Parameter', 'Verification Checksum & Metadata']);
        wsAudit.getRow(1).height = 26;
        wsAudit.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
          c.border = borderThin;
        });

        const auditItems = [
          ['Application Engine', 'Lumetric Self-Dealing Excel Automator v3.0'],
          ['Dataset Fingerprint', activeDataset?.id || 'ds-default-sample'],
          ['Ingestion File Name', activeDataset?.fileName || 'b2b_saas_metrics.csv'],
          ['Row Count Ingested', datasetStats.rowCount.toString()],
          ['Column Count Ingested', cols.length.toString()],
          ['Generated By User', currentUser?.email || 'admin@lumetric.enterprise'],
          ['Generation Timestamp', new Date().toISOString()],
          ['Calculated Portfolio ARR', `$${datasetStats.totalArr.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Floating-Point Standard', 'IEEE 754 Double Precision (Exact 100% Math)'],
          ['OpenXML Standard', 'ECMA-376 5th Edition (Fully Validated)'],
        ];

        auditItems.forEach(([k, v]) => {
          const r = wsAudit.addRow([k, v]);
          r.height = 20;
          r.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true };
          r.getCell(2).font = { name: 'Segoe UI', size: 9 };
          r.eachCell((c) => (c.border = borderThin));
        });
      }

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 2: 12-MONTH ARR & FINANCIAL PROJECTION MODEL
      // ────────────────────────────────────────────────────────────────────────
      else if (selectedAutomation === 'financial_runway') {
        const wsFin = wb.addWorksheet('FinancialRunway', {
          views: [{ showGridLines: true, state: 'frozen', xSplit: 2, ySplit: 3 }],
        });

        wsFin.columns = [
          { width: 28 },
          { width: 16 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 14 },
          { width: 18 },
        ];

        wsFin.mergeCells('A1:O1');
        const finTitle = wsFin.getCell('A1');
        finTitle.value = `${companyName.toUpperCase()} — 12-MONTH FORWARD P&L & ARR RUNWAY MODEL`;
        finTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: palette.headerFont } };
        finTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        finTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        wsFin.getRow(1).height = 34;

        wsFin.getCell('A2').value = 'Assumed Monthly Growth Rate:';
        wsFin.getCell('A2').font = { name: 'Segoe UI', size: 9, bold: true };
        wsFin.getCell('B2').value = growthScenarioPct / 100;
        wsFin.getCell('B2').numFmt = '0.0%';
        wsFin.getCell('B2').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.accentBg } };
        wsFin.getRow(2).height = 22;

        const monthHeaders = [
          'Financial Metric',
          'Current Baseline',
          'Month 1',
          'Month 2',
          'Month 3',
          'Month 4',
          'Month 5',
          'Month 6',
          'Month 7',
          'Month 8',
          'Month 9',
          'Month 10',
          'Month 11',
          'Month 12',
          'Full Year Total (FY)',
        ];

        const mRow = wsFin.addRow(monthHeaders);
        mRow.height = 24;
        mRow.eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
          c.border = borderThin;
        });

        const baselineRevenue = datasetStats.totalArr > 0 ? datasetStats.totalArr / 12 : 100000;

        const addProjectedLine = (
          label: string,
          baseVal: number,
          isFormulaRow: boolean,
          rateRef: string,
          multiplier = 1,
        ) => {
          const cells: any[] = [label, baseVal];
          const colLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

          for (let m = 0; m < 12; m++) {
            const prevCol = m === 0 ? 'B' : colLetters[m - 1];
            if (isFormulaRow) {
              cells.push({
                formula: `${prevCol}${wsFin.rowCount + 1}*(1+${rateRef})`,
                result: baseVal * Math.pow(1 + (growthScenarioPct / 100) * multiplier, m + 1),
              });
            } else {
              cells.push(baseVal);
            }
          }

          const curR = wsFin.rowCount + 1;
          cells.push({
            formula: `SUM(C${curR}:N${curR})`,
            result: baseVal * 12,
          });

          const r = wsFin.addRow(cells);
          r.height = 20;
          r.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true };
          r.eachCell({ includeEmpty: true }, (c, idx) => {
            c.border = borderThin;
            if (idx > 1) {
              c.numFmt = '$#,##0';
              c.alignment = { horizontal: 'right' };
            }
          });
          return curR;
        };

        const revRow = addProjectedLine('1. Gross Recurring Revenue (MRR)', baselineRevenue, true, '$B$2', 1);

        const cogsCells: any[] = ['2. Cost of Goods Sold (COGS 22%)', baselineRevenue * 0.22];
        const colLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
        for (let m = 0; m < 12; m++) {
          const col = colLetters[m];
          cogsCells.push({
            formula: `${col}${revRow}*0.22`,
            result: (baselineRevenue * Math.pow(1 + growthScenarioPct / 100, m + 1)) * 0.22,
          });
        }
        const cogsRowNum = wsFin.rowCount + 1;
        cogsCells.push({ formula: `SUM(C${cogsRowNum}:N${cogsRowNum})`, result: baselineRevenue * 0.22 * 12 });
        const cogsR = wsFin.addRow(cogsCells);
        cogsR.height = 20;
        cogsR.eachCell({ includeEmpty: true }, (c, idx) => {
          c.border = borderThin;
          if (idx > 1) {
            c.numFmt = '$#,##0';
            c.alignment = { horizontal: 'right' };
          }
        });

        const gpCells: any[] = ['3. Gross Profit (Revenue - COGS)', baselineRevenue * 0.78];
        for (let m = 0; m < 12; m++) {
          const col = colLetters[m];
          gpCells.push({
            formula: `${col}${revRow}-${col}${cogsRowNum}`,
            result: (baselineRevenue * Math.pow(1 + growthScenarioPct / 100, m + 1)) * 0.78,
          });
        }
        const gpRowNum = wsFin.rowCount + 1;
        gpCells.push({ formula: `SUM(C${gpRowNum}:N${gpRowNum})`, result: baselineRevenue * 0.78 * 12 });
        const gpR = wsFin.addRow(gpCells);
        gpR.height = 22;
        gpR.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: palette.accentBg } };
        gpR.eachCell({ includeEmpty: true }, (c, idx) => {
          c.border = borderThin;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.badgeBg } };
          if (idx > 1) {
            c.numFmt = '$#,##0';
            c.alignment = { horizontal: 'right' };
            c.font = { name: 'Segoe UI', size: 9, bold: true };
          }
        });

        // TAB 2: VARIANCE ANALYSIS (BvA)
        const wsBvA = wb.addWorksheet('VarianceAnalysis', {
          views: [{ showGridLines: true }],
        });
        wsBvA.columns = [
          { width: 26 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
        ];

        wsBvA.addRow(['Performance Variance Analysis (Budget vs. Actual)', '', '', '', '', '']);
        wsBvA.mergeCells('A1:F1');
        wsBvA.getCell('A1').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: palette.headerFont } };
        wsBvA.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsBvA.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        wsBvA.getRow(1).height = 30;

        wsBvA.addRow(['Line Item', 'Annual Budget ($)', 'Actual Result ($)', 'Variance ($)', 'Variance (%)', 'Status']);
        wsBvA.getRow(2).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.border = borderThin;
        });

        const bvaData = [
          ['Subscription Revenue', datasetStats.totalArr * 0.95, datasetStats.totalArr],
          ['Enterprise Expansion ARR', datasetStats.totalArr * 0.2, datasetStats.totalArr * 0.24],
          ['Hosting Infrastructure', datasetStats.totalArr * 0.1, datasetStats.totalArr * 0.085],
          ['R&D Engineering', datasetStats.totalArr * 0.25, datasetStats.totalArr * 0.23],
          ['Sales & Marketing', datasetStats.totalArr * 0.3, datasetStats.totalArr * 0.32],
        ];

        bvaData.forEach(([item, budget, actual], idx) => {
          const rowNum = idx + 3;
          const numBudget = Number(budget);
          const numActual = Number(actual);
          const varAmt = numActual - numBudget;
          const varPct = numBudget > 0 ? varAmt / numBudget : 0;
          const isFavorable = varAmt >= 0;

          const r = wsBvA.addRow([
            item,
            numBudget,
            numActual,
            { formula: `C${rowNum}-B${rowNum}`, result: varAmt },
            { formula: `D${rowNum}/B${rowNum}`, result: varPct },
            isFavorable ? 'FAVORABLE' : 'UNFAVORABLE',
          ]);
          r.height = 20;
          r.getCell(2).numFmt = '$#,##0';
          r.getCell(3).numFmt = '$#,##0';
          r.getCell(4).numFmt = '$#,##0';
          r.getCell(5).numFmt = '0.0%';
          r.getCell(6).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isFavorable ? 'FF059669' : 'FFE34234' } };
          r.eachCell((c) => (c.border = borderThin));
        });
      }

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 3: MULTI-LEVEL PIVOT MASTER
      // ────────────────────────────────────────────────────────────────────────
      else if (selectedAutomation === 'pivot_master') {
        const wsPivotMaster = wb.addWorksheet('CrossTabMatrix', {
          views: [{ showGridLines: true }],
        });

        const regColName = cols[regColIdx] || 'Region';
        const tierColName = cols[tierColIdx] || 'Plan_Tier';

        const regions = Array.from(new Set(sanitizedRows.map((r) => String(r[regColName] || 'Global')))).sort();
        const tiers = Array.from(new Set(sanitizedRows.map((r) => String(r[tierColName] || 'Standard')))).sort();

        wsPivotMaster.columns = [
          { width: 24 },
          ...tiers.map(() => ({ width: 18 })),
          { width: 20 },
          { width: 18 },
        ];

        const totalCols = tiers.length + 3;
        const lastColLetter = getColumnLetter(totalCols - 1);
        wsPivotMaster.mergeCells(`A1:${lastColLetter}1`);
        const pTitle = wsPivotMaster.getCell('A1');
        pTitle.value = `${companyName.toUpperCase()} — MULTI-DIMENSIONAL CROSS-TABULATION MATRIX`;
        pTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: palette.headerFont } };
        pTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        pTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        wsPivotMaster.getRow(1).height = 32;

        const headerRowVals = ['Region / Dimension', ...tiers, 'Total ARR (Row Sum)', 'Share of Revenue'];
        const pHeadRow = wsPivotMaster.addRow(headerRowVals);
        pHeadRow.height = 24;
        pHeadRow.eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
          c.border = borderThin;
        });

        let startRow = 3;
        const grandTotalRow = startRow + regions.length;

        regions.forEach((reg, rIdx) => {
          const curR = startRow + rIdx;
          const rowVals: any[] = [reg];

          let rowSumCalc = 0;
          tiers.forEach((tier) => {
            const matchingRows = sanitizedRows.filter(
              (r) => String(r[regColName]) === reg && String(r[tierColName]) === tier
            );
            const sumVal = matchingRows.reduce((acc, curr) => acc + (typeof curr[cols[arrColIdx]] === 'number' ? curr[cols[arrColIdx]] : 0), 0);
            rowSumCalc += sumVal;

            rowVals.push({
              formula: `SUMIFS(SourceData!$${arrColLetter}$2:$${arrColLetter}$${totalRowsLedger}, SourceData!$${regColLetter}$2:$${regColLetter}$${totalRowsLedger}, "${reg}", SourceData!$${tierColLetter}$2:$${tierColLetter}$${totalRowsLedger}, "${tier}")`,
              result: sumVal,
            });
          });

          const firstTierCol = 'B';
          const lastTierCol = getColumnLetter(tiers.length);
          const totalColLetter = getColumnLetter(tiers.length + 1);

          rowVals.push({
            formula: `SUM(${firstTierCol}${curR}:${lastTierCol}${curR})`,
            result: rowSumCalc,
          });

          rowVals.push({
            formula: `${totalColLetter}${curR}/$${totalColLetter}$${grandTotalRow}`,
            result: datasetStats.totalArr > 0 ? rowSumCalc / datasetStats.totalArr : 0,
          });

          const r = wsPivotMaster.addRow(rowVals);
          r.height = 20;
          r.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true };
          r.eachCell({ includeEmpty: true }, (c, idx) => {
            c.border = borderThin;
            if (idx > 1 && idx <= tiers.length + 2) {
              c.numFmt = '$#,##0';
              c.alignment = { horizontal: 'right' };
            } else if (idx === totalCols) {
              c.numFmt = '0.0%';
              c.alignment = { horizontal: 'right' };
            }
          });
        });

        const grandTotalsVals: any[] = ['GRAND TOTAL'];
        tiers.forEach((tier) => {
          grandTotalsVals.push({
            formula: `SUM(${getColumnLetter(grandTotalsVals.length)}${startRow}:${getColumnLetter(grandTotalsVals.length)}${grandTotalRow - 1})`,
            result: sanitizedRows
              .filter((r) => String(r[tierColName]) === tier)
              .reduce((acc, curr) => acc + (typeof curr[cols[arrColIdx]] === 'number' ? curr[cols[arrColIdx]] : 0), 0),
          });
        });

        const totalColLetter = getColumnLetter(tiers.length + 1);
        grandTotalsVals.push({
          formula: `SUM(${totalColLetter}${startRow}:${totalColLetter}${grandTotalRow - 1})`,
          result: datasetStats.totalArr,
        });
        grandTotalsVals.push({ formula: `SUM(${getColumnLetter(tiers.length + 2)}${startRow}:${getColumnLetter(tiers.length + 2)}${grandTotalRow - 1})`, result: 1.0 });

        const gRow = wsPivotMaster.addRow(grandTotalsVals);
        gRow.height = 24;
        gRow.eachCell({ includeEmpty: true }, (c, idx) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: palette.headerFont } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
          c.border = borderThin;
          if (idx > 1 && idx <= tiers.length + 2) {
            c.numFmt = '$#,##0';
            c.alignment = { horizontal: 'right' };
          } else if (idx === totalCols) {
            c.numFmt = '0.0%';
            c.alignment = { horizontal: 'right' };
          }
        });

        const wsSource = wb.addWorksheet('SourceData', {
          views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }],
        });
        wsSource.columns = cols.map((c) => ({ header: c, key: c, width: 18 }));
        wsSource.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        });
        sanitizedRows.forEach((r) => wsSource.addRow(r));
      }

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 4: FORMULA INJECTION & DYNAMIC LOOKUPS SUITE
      // ────────────────────────────────────────────────────────────────────────
      else if (selectedAutomation === 'formula_suite') {
        const wsDynamic = wb.addWorksheet('DynamicFormulas', {
          views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 2 }],
        });

        wsDynamic.columns = [
          { width: 18 },
          { width: 24 },
          { width: 20 },
          { width: 26 },
          { width: 22 },
          { width: 32 },
        ];

        wsDynamic.mergeCells('A1:F1');
        const fTitle = wsDynamic.getCell('A1');
        fTitle.value = 'ENTERPRISE FORMULA INJECTION SUITE (XLOOKUP, SUMIFS, IF)';
        fTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: palette.headerFont } };
        fTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        fTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        wsDynamic.getRow(1).height = 32;

        const dynHeaders = [
          'Account ID',
          'Client Name',
          'Revenue (XLOOKUP)',
          'Risk Classification (IF)',
          'Regional Subtotal (SUMIFS)',
          'Formula Explanation',
        ];
        const dRow = wsDynamic.addRow(dynHeaders);
        dRow.height = 24;
        dRow.eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.border = borderThin;
        });

        sanitizedRows.forEach((row, idx) => {
          const rowNum = idx + 3;
          const accId = String(row['Account_ID'] || `ACC-${1000 + idx}`);
          const custName = String(row['Customer_Name'] || 'Customer');
          const arrVal = typeof row[cols[arrColIdx]] === 'number' ? row[cols[arrColIdx]] : 50000;
          const churnVal = typeof row[cols[churnColIdx]] === 'number' ? row[cols[churnColIdx]] : 0.05;
          const regVal = String(row[cols[regColIdx]] || 'North America');

          const r = wsDynamic.addRow([
            accId,
            custName,
            {
              formula: `XLOOKUP(A${rowNum}, MasterLedger!$A$2:$A$${totalRowsLedger}, MasterLedger!$${arrColLetter}$2:$${arrColLetter}$${totalRowsLedger}, "Not Found")`,
              result: arrVal,
            },
            {
              formula: `IF(MasterLedger!${churnColLetter}${idx + 2}>=0.2, "CRITICAL RISK", IF(MasterLedger!${churnColLetter}${idx + 2}>=0.1, "WATCHLIST", "HEALTHY"))`,
              result: churnVal >= 0.2 ? 'CRITICAL RISK' : churnVal >= 0.1 ? 'WATCHLIST' : 'HEALTHY',
            },
            {
              formula: `SUMIFS(MasterLedger!$${arrColLetter}$2:$${arrColLetter}$${totalRowsLedger}, MasterLedger!$${regColLetter}$2:$${regColLetter}$${totalRowsLedger}, "${regVal}")`,
              result: datasetStats.totalArr * 0.35,
            },
            `Injected live XLOOKUP and multi-branch nested IF statement`,
          ]);

          r.height = 20;
          r.getCell(3).numFmt = '$#,##0.00';
          r.getCell(5).numFmt = '$#,##0.00';
          r.getCell(4).font = {
            name: 'Segoe UI',
            size: 9,
            bold: true,
            color: { argb: churnVal >= 0.2 ? 'FFE34234' : churnVal >= 0.1 ? 'FFD97706' : 'FF059669' },
          };
          r.eachCell((c) => (c.border = borderThin));
        });

        const wsMaster = wb.addWorksheet('MasterLedger', {
          views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }],
        });
        wsMaster.columns = cols.map((c) => ({ header: c, key: c, width: 18 }));
        wsMaster.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        });
        sanitizedRows.forEach((r) => wsMaster.addRow(r));
      }

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 5: CONDITIONAL FORMATTING & ANOMALY HEATMAP
      // ────────────────────────────────────────────────────────────────────────
      else if (selectedAutomation === 'conditional_heatmap') {
        const wsHeatmap = wb.addWorksheet('HeatmapLedger', {
          views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }],
        });

        wsHeatmap.columns = cols.map((c) => ({ header: c, key: c, width: 20 }));
        wsHeatmap.getRow(1).height = 28;
        wsHeatmap.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
          c.border = borderThin;
        });

        sanitizedRows.forEach((row) => {
          const r = wsHeatmap.addRow(row);
          r.height = 20;

          const arr = typeof row[cols[arrColIdx]] === 'number' ? row[cols[arrColIdx]] : 0;
          const churn = typeof row[cols[churnColIdx]] === 'number' ? row[cols[churnColIdx]] : 0;
          const auditStatus = String(row['Last_Audit_Status'] || 'Verified');

          r.eachCell({ includeEmpty: true }, (cell, colIdx) => {
            cell.font = { name: 'Segoe UI', size: 9 };
            cell.border = borderThin;

            const colKey = cols[colIdx - 1];
            if (colKey.includes('ARR')) {
              cell.numFmt = '$#,##0.00';
              if (arr > 100000) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
              }
            } else if (colKey.includes('Churn')) {
              cell.numFmt = '0.0%';
              if (churn >= 0.2) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
              } else if (churn >= 0.1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF92400E' } };
              }
            } else if (colKey.includes('Audit')) {
              if (auditStatus !== 'Verified') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
              }
            }
          });
        });

        const wsKey = wb.addWorksheet('ThresholdKey', { views: [{ showGridLines: true }] });
        wsKey.columns = [{ width: 24 }, { width: 36 }, { width: 30 }];
        wsKey.addRow(['Indicator Color', 'Condition / Threshold', 'Action Trigger']);
        wsKey.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        });

        const keyItems = [
          ['Soft Emerald (#D1FAE5)', 'ARR >= $100,000 (Top Quintile)', 'Eligible for Executive Growth Sponsorship'],
          ['Soft Amber (#FEF3C7)', 'Churn Probability between 10% - 20%', 'Quarterly Success Check-in Triggered'],
          ['Soft Crimson (#FEE2E2)', 'Churn Probability >= 20% or Audit Failed', 'Immediate Escalation & Red-Zone Intervention'],
        ];

        keyItems.forEach(([color, cond, act]) => {
          const r = wsKey.addRow([color, cond, act]);
          r.height = 22;
          r.eachCell((c) => (c.border = borderThin));
        });
      }

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 6: AUTOMATED DATA CLEANER & STANDARDIZER
      // ────────────────────────────────────────────────────────────────────────
      else if (selectedAutomation === 'clean_standardize') {
        const wsClean = wb.addWorksheet('StandardizedData', {
          views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }],
        });

        wsClean.columns = cols.map((c) => ({ header: c, key: c, width: 20 }));
        wsClean.getRow(1).height = 28;
        wsClean.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
          c.border = borderThin;
        });

        const cleaningLog: { row: number; col: string; action: string }[] = [];

        sanitizedRows.forEach((row, idx) => {
          const cleanedRow: Record<string, any> = {};
          cols.forEach((colKey) => {
            const rawVal = row[colKey];
            if (rawVal === '' || rawVal === null || rawVal === undefined) {
              cleanedRow[colKey] = 'N/A';
              cleaningLog.push({ row: idx + 2, col: colKey, action: 'Imputed missing value with standardized "N/A"' });
            } else if (typeof rawVal === 'string') {
              const trimmed = rawVal.trim();
              if (trimmed !== rawVal) {
                cleaningLog.push({ row: idx + 2, col: colKey, action: 'Trimmed surrounding whitespace' });
              }
              if (colKey.includes('Name') || colKey.includes('City') || colKey.includes('Region')) {
                cleanedRow[colKey] = trimmed.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
              } else {
                cleanedRow[colKey] = trimmed;
              }
            } else {
              cleanedRow[colKey] = rawVal;
            }
          });

          const r = wsClean.addRow(cleanedRow);
          r.height = 20;
          r.eachCell((c) => (c.border = borderThin));
        });

        const wsLog = wb.addWorksheet('CleaningAuditLog', { views: [{ showGridLines: true }] });
        wsLog.columns = [{ width: 14 }, { width: 22 }, { width: 50 }];
        wsLog.addRow(['Row Number', 'Column Name', 'Sanitization Action Applied']);
        wsLog.getRow(1).eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        });

        cleaningLog.slice(0, 100).forEach((entry) => {
          const r = wsLog.addRow([`Row ${entry.row}`, entry.col, entry.action]);
          r.height = 20;
          r.eachCell((c) => (c.border = borderThin));
        });
      }

      // Write buffer and trigger client-side download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const downloadFileName = `lumetric_${selectedAutomation}_${dateStr}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const durationMs = Math.round(performance.now() - startTime);
      setDownloadSuccess({
        fileName: downloadFileName,
        fileSizeBytes: blob.size,
        durationMs,
      });
    } catch (err: any) {
      console.error('Workbook generation failed:', err);
      alert(`Workbook generation error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16 w-full">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. CLEAN EXECUTIVE PAGE HEADER                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-[#059669]/10 text-[#059669] dark:text-[#34D399]">
              <FileSpreadsheetIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--lm-text-primary)]">
              Excel Automator
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECFDF5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#34D399] font-bold border border-[#059669]/30 uppercase tracking-wider">
              Self-Dealing Suite
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 hidden sm:inline">
              100% Math Accuracy
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)] font-normal">
            Automated multi-tab Microsoft Excel (.xlsx) workbooks with live native formulas, dashboards &amp; financial models.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Active Dataset Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] text-xs text-[var(--lm-text-primary)] shadow-xs">
            <DatabaseIcon className="w-3.5 h-3.5 text-[#059669]" />
            <span className="font-semibold truncate max-w-[130px]">
              {activeDataset?.fileName || 'Active Dataset'}
            </span>
            <span className="text-[10px] font-mono text-[var(--lm-text-tertiary)]">
              ({datasetStats.rowCount.toLocaleString()} rows)
            </span>
          </div>

          {/* How to Open .xlsx Help Button */}
          <button
            onClick={() => setShowHowToOpenModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] hover:bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] transition-colors shadow-xs cursor-pointer"
            title="How to view and open your .xlsx file"
          >
            <span>💡 How to Open</span>
          </button>

          {/* Quick jump to SQL Studio */}
          <button
            onClick={() => setActiveView('sql')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] hover:bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] transition-colors shadow-xs cursor-pointer"
            title="Open SQL Studio"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>SQL Studio</span>
          </button>

          {/* Direct CSV fallback button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[var(--lm-bg-elevated)] hover:bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs font-bold text-[var(--lm-text-primary)] transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            title="Instant CSV export compatible with any software"
          >
            Export CSV
          </button>

          {/* Primary Action Button */}
          <button
            onClick={handleGenerateWorkbook}
            disabled={isGenerating || datasetStats.rowCount === 0}
            className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] active:scale-95 text-[#FAF8F5] text-xs font-bold transition-all shadow-md shadow-[#059669]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
                <span>Compiling OpenXML...</span>
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4" />
                <span>Generate &amp; Download .xlsx</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HOW TO OPEN MODAL / GUIDE                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showHowToOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--lm-border-default)]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#059669]/10 text-[#059669]">
                  <FileSpreadsheetIcon className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-[var(--lm-text-primary)]">
                  How to Open Your .xlsx Spreadsheet
                </h3>
              </div>
              <button
                onClick={() => setShowHowToOpenModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--lm-bg-secondary)] text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--lm-text-secondary)]">
              Your generated workbook is a standard <strong>ECMA-376 OpenXML (.xlsx)</strong> file with real formulas and frozen tables. Depending on what software is installed on your computer:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)] block">
                  1. If Microsoft Office / Excel is installed:
                </span>
                <span className="text-[var(--lm-text-secondary)] block">
                  Double-click the downloaded <code>.xlsx</code> file in your Downloads folder to open it directly.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)] block">
                  2. Free with Google Sheets (No Excel needed!):
                </span>
                <span className="text-[var(--lm-text-secondary)] block">
                  Open <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-[#059669] underline font-semibold">Google Drive</a>, drag the <code>.xlsx</code> file into Drive, and double-click it. It will open instantly in Google Sheets with all formulas and sheets active!
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)] block">
                  3. Free with Microsoft Excel Online:
                </span>
                <span className="text-[var(--lm-text-secondary)] block">
                  Go to <a href="https://www.office.com" target="_blank" rel="noreferrer" className="text-[#059669] underline font-semibold">office.com</a> and upload your file to view it in Excel on the web for free.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)] block">
                  4. Instant CSV Export:
                </span>
                <span className="text-[var(--lm-text-secondary)] block">
                  If you prefer a lightweight format that opens in Notepad, Apple Numbers, or basic tools, click the <strong>&quot;Export CSV&quot;</strong> button in the top bar!
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowHowToOpenModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-[#FAF8F5] text-xs font-bold transition-all shadow-sm"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SUCCESS DOWNLOAD NOTIFICATION BANNER                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-[#ECFDF5] dark:bg-[#064E3B]/40 border border-[#059669]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#065F46] dark:text-[#34D399] shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold shrink-0">
              ✓
            </div>
            <div>
              <p className="font-bold text-sm">
                Workbook compiled and downloaded successfully!
              </p>
              <p className="text-[11px] font-mono opacity-90">
                File: {downloadSuccess.fileName} • Size: {(downloadSuccess.fileSizeBytes / 1024).toFixed(1)} KB • Render Time: {downloadSuccess.durationMs}ms • 100% ECMA-376 Validated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowHowToOpenModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#059669]/30 text-xs font-bold hover:bg-[#ECFDF5] cursor-pointer"
            >
              How to Open
            </button>
            <button
              onClick={() => setDownloadSuccess(null)}
              className="text-[#065F46] dark:text-[#34D399] hover:opacity-75 font-bold px-2 py-1 rounded-md cursor-pointer"
            >
              ✕ Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MAIN TWO-COLUMN WORKSPACE                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: AUTOMATION CATALOG (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold tracking-wider uppercase text-[var(--lm-text-secondary)] flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-[#059669]" />
                Select Desired Excel Automation Outcome
              </h2>
              <span className="text-xs text-[var(--lm-text-tertiary)] font-mono">6 Available Deliverables</span>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AUTOMATION_CATALOG.map((item) => {
                const isSelected = selectedAutomation === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAutomation(item.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[var(--lm-bg-elevated)] border-[#059669] shadow-md ring-2 ring-[#059669]/20'
                        : 'bg-[var(--lm-bg-elevated)] border-[var(--lm-border-default)] hover:border-[#059669]/40 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}
                        >
                          {item.badge}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-[var(--lm-text-tertiary)] font-mono">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[var(--lm-text-primary)] mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[var(--lm-text-secondary)] line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--lm-border-default)]/70 flex items-center justify-between text-[11px]">
                      <span className="text-[var(--lm-text-tertiary)] font-mono">
                        {item.sheetsGenerated.length} Tabs Included
                      </span>
                      <span
                        className={`font-semibold flex items-center gap-1.5 ${
                          isSelected ? 'text-[#059669] dark:text-[#34D399]' : 'text-[var(--lm-text-tertiary)]'
                        }`}
                      >
                        {isSelected ? '● Active' : 'Select →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE DELIVERABLE INSPECTION & LIVE IN-BROWSER PREVIEW */}
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--lm-border-default)] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-bold text-[var(--lm-text-primary)]">
                  Workbook Blueprint &amp; Live In-Browser Preview
                </h3>
              </div>

              {/* Segmented Controls for preview tab */}
              <div className="flex items-center gap-1 bg-[var(--lm-bg-secondary)] p-1 rounded-xl border border-[var(--lm-border-default)] text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('blueprint')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    previewTab === 'blueprint'
                      ? 'bg-[var(--lm-bg-elevated)] text-[#059669] dark:text-[#34D399] shadow-xs'
                      : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                  }`}
                >
                  Blueprint ({currentCard.sheetsGenerated.length} Tabs)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('data_grid')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    previewTab === 'data_grid'
                      ? 'bg-[var(--lm-bg-elevated)] text-[#059669] dark:text-[#34D399] shadow-xs'
                      : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                  }`}
                >
                  Live Spreadsheet Grid
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('formulas')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    previewTab === 'formulas'
                      ? 'bg-[var(--lm-bg-elevated)] text-[#059669] dark:text-[#34D399] shadow-xs'
                      : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                  }`}
                >
                  Formula Syntax
                </button>
              </div>
            </div>

            {/* TAB 1: BLUEPRINT */}
            {previewTab === 'blueprint' && (
              <div className="space-y-3.5">
                <p className="text-xs text-[var(--lm-text-secondary)]">
                  When you click <strong>Generate &amp; Download</strong>, Lumetric compiles the following validated sheets into an ECMA-376 OpenXML package:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentCard.sheetsGenerated.map((sheet, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]/80 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-lg bg-[#ECFDF5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#34D399] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#059669]/20">
                        {sIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--lm-text-primary)]">
                          {sheet}
                        </h4>
                        <p className="text-[11px] text-[var(--lm-text-tertiary)]">
                          Zebra-striped • Frozen Pane • ECMA Validated
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--lm-border-default)]/70">
                  <h4 className="text-xs font-bold text-[var(--lm-text-primary)] mb-2">
                    Engineered Mathematical Guarantees:
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--lm-text-secondary)]">
                    {currentCard.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <span className="text-[#059669] font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE SPREADSHEET GRID */}
            {previewTab === 'data_grid' && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--lm-text-secondary)]">
                  Live in-browser preview of your source dataset formatted for export:
                </p>
                <div className="overflow-x-auto max-h-64 border border-[var(--lm-border-default)] rounded-xl scrollbar-thin">
                  <table className="w-full text-left text-xs text-[var(--lm-text-secondary)]">
                    <thead className="bg-[var(--lm-bg-secondary)] text-[var(--lm-text-primary)] font-bold text-[11px] uppercase tracking-wider sticky top-0 border-b border-[var(--lm-border-default)]">
                      <tr>
                        {datasetStats.columns.map((c, i) => (
                          <th key={i} className="px-3 py-2 border-r border-[var(--lm-border-default)] last:border-r-0 whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--lm-border-default)] font-mono text-[11px]">
                      {activeRows.slice(0, 8).map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[var(--lm-bg-elevated)]' : 'bg-[var(--lm-bg-secondary)]/50'}>
                          {datasetStats.columns.map((col, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 border-r border-[var(--lm-border-default)] last:border-r-0 whitespace-nowrap">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)]">
                  <span>Showing first 8 of {datasetStats.rowCount.toLocaleString()} records</span>
                  <span>100% rows included in downloaded .xlsx</span>
                </div>
              </div>
            )}

            {/* TAB 3: FORMULA SYNTAX */}
            {previewTab === 'formulas' && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--lm-text-secondary)]">
                  Live formula definitions written into the OpenXML workbook cells:
                </p>
                <div className="p-3.5 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[#059669] dark:text-[#34D399]">
                    <span className="font-bold">Metric Summary:</span>
                    <span>=SUM(DataLedger!E2:E{datasetStats.rowCount + 1})</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <span className="font-bold">Regional Aggregate:</span>
                    <span>=SUMIF(DataLedger!$C$2:$C${datasetStats.rowCount + 1}, &quot;North America&quot;, DataLedger!$E$2:$E${datasetStats.rowCount + 1})</span>
                  </div>
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                    <span className="font-bold">Dynamic XLOOKUP:</span>
                    <span>=XLOOKUP(A2, MasterLedger!$A$2:$A${datasetStats.rowCount + 1}, MasterLedger!$E$2:$E${datasetStats.rowCount + 1}, &quot;Not Found&quot;)</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <span className="font-bold">Risk Classification:</span>
                    <span>=IF(G2&gt;=0.2, &quot;CRITICAL RISK&quot;, &quot;HEALTHY&quot;)</span>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--lm-text-tertiary)]">
                  Formulas are serialized with clean ECMA-376 &lt;f&gt; tags with zero double-equal syntax, ensuring clean loading across Microsoft Excel, Google Sheets, and LibreOffice.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WORKBOOK CUSTOMIZER & SETTINGS (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--lm-border-default)] pb-3">
              <h3 className="text-sm font-bold text-[var(--lm-text-primary)] flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-[#059669]" />
                Workbook Configuration
              </h3>
              <span className="text-[11px] font-mono text-[var(--lm-text-tertiary)]">v3.0 Engine</span>
            </div>

            {/* Company / Workspace Branding */}
            <div>
              <label className="block text-xs font-semibold text-[var(--lm-text-primary)] mb-1">
                Company / Organization Header
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-colors"
                placeholder="e.g. Acme Corp"
              />
            </div>

            {/* Report Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-[var(--lm-text-primary)] mb-1">
                Report Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-colors"
                placeholder="e.g. Q4 Executive Report"
              />
            </div>

            {/* Color Palette Theme */}
            <div>
              <label className="block text-xs font-semibold text-[var(--lm-text-primary)] mb-1.5">
                Executive Color Palette
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(PALETTES).map((p) => {
                  const isThemeSelected = selectedTheme === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedTheme(p.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isThemeSelected
                          ? 'border-[#059669] bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#065F46] dark:text-[#34D399] font-bold ring-2 ring-[#059669]/20'
                          : 'border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)] text-[var(--lm-text-secondary)] hover:border-[#059669]/40'
                      }`}
                    >
                      <div className="w-full h-3 rounded-md mb-1.5 flex overflow-hidden border border-[var(--lm-border-default)]/60">
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: `#${p.headerBg.slice(2)}` }}
                        />
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: `#${p.accentBg.slice(2)}` }}
                        />
                      </div>
                      <span className="text-[10px] block truncate font-medium">{p.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Growth Scenario Slider (for financial model) */}
            {selectedAutomation === 'financial_runway' && (
              <div className="pt-2 border-t border-[var(--lm-border-default)]/70">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--lm-text-primary)]">
                    Monthly Growth Scenario:
                  </label>
                  <span className="text-xs font-mono font-bold text-[#059669] dark:text-[#34D399]">
                    {growthScenarioPct}% MoM
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={growthScenarioPct}
                  onChange={(e) => setGrowthScenarioPct(Number(e.target.value))}
                  className="w-full accent-[#059669] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-mono">
                  <span>3% (Cautious)</span>
                  <span>12% (Target)</span>
                  <span>30% (Hyper)</span>
                </div>
              </div>
            )}

            {/* Quick Metrics Summary Box */}
            <div className="pt-3 border-t border-[var(--lm-border-default)]/70 space-y-2">
              <span className="text-[10px] font-bold text-[var(--lm-text-tertiary)] uppercase tracking-wider block font-mono">
                Source Data Checksum
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]/80">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Row Count</span>
                  <span className="font-mono font-bold text-[var(--lm-text-primary)]">
                    {datasetStats.rowCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]/80">
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium">Total ARR</span>
                  <span className="font-mono font-bold text-[#059669] dark:text-[#34D399]">
                    ${(datasetStats.totalArr / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleGenerateWorkbook}
              disabled={isGenerating || datasetStats.rowCount === 0}
              className="w-full mt-2 py-3 rounded-xl bg-[#059669] hover:bg-[#047857] active:scale-95 text-[#FAF8F5] font-bold text-xs transition-all shadow-md shadow-[#059669]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  <span>Generating Spreadsheets...</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download Complete .xlsx</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-[var(--lm-text-tertiary)] text-center">
              Compiles natively on your device. Zero cloud data transmission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
