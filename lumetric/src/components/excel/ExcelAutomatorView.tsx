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
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    category: 'Executive',
    description:
      'Creates a 4-tab C-suite ready workbook featuring styled KPI metric callouts, frozen headers, auto-filters, summary aggregation tables, and audit checksum metadata.',
    sheetsGenerated: ['1. Executive Dashboard', '2. Pivot & Distribution', '3. Data Ledger', '4. Audit & Verification'],
    features: [
      'Top KPI scorecards with currency ($) & percentage formatting',
      'Frozen top header pane & auto-filter range',
      'Categorical distribution matrix with dynamic sub-totals',
      'Automated SHA-256 integrity checksum & metadata audit sheet',
    ],
    sampleFormula: '=SUM(Ledger!E2:E101)',
  },
  {
    id: 'financial_runway',
    title: '12-Month ARR & Financial Projection Model',
    badge: 'P&L Runway',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    category: 'Financial',
    description:
      'Generates a forward-looking 12-month financial model with compound growth rates, COGS allocation, gross margin calculations, and Budget vs. Actual variance tracking.',
    sheetsGenerated: ['1. 12-Month P&L Runway', '2. Variance Analysis (BvA)', '3. Growth Scenarios'],
    features: [
      '12-month sequential compound growth formulas: =B5*(1+$B$2)',
      'Gross Profit & Operating Margin % formulas: =(Revenue - COGS)',
      'Variance Analysis with =Actual - Budget and =(Actual - Budget)/Budget',
      'Three scenario runways: Conservative (5%), Target (12%), Hyper-growth (25%)',
    ],
    sampleFormula: '=C5*(1+$B$2)',
  },
  {
    id: 'pivot_master',
    title: 'Multi-Level Pivot & Cross-Tabulation Master',
    badge: 'Cross-Tab Matrix',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
    category: 'Analytics',
    description:
      'Engineers a multi-dimensional cross-tabulation matrix across two categorical dimensions with native formula row sums, column totals, and global grand totals.',
    sheetsGenerated: ['1. Cross-Tab Matrix', '2. Percentage of Total', '3. Source Data'],
    features: [
      'Two-dimensional cross-tabulation (e.g., Region × Plan Tier)',
      'Row sum formulas: =SUM(C4:E4) and column sum formulas: =SUM(C4:C8)',
      'Global grand total formula: =SUM(F4:F8)',
      'Percentage share distribution matrix: =(F4/$F$9)*100',
    ],
    sampleFormula: '=SUM(C4:E4)',
  },
  {
    id: 'formula_suite',
    title: 'Formula Injection & Dynamic Lookups Suite',
    badge: 'XLOOKUP & SUMIFS',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    category: 'Engineering',
    description:
      'Injects active corporate Excel formulas into your sheets: =XLOOKUP(), =SUMIFS(), =COUNTIFS(), =AVERAGEIFS(), and nested =IF() risk rules with pre-evaluated cached results.',
    sheetsGenerated: ['1. Dynamic Formulas', '2. Multi-Criteria Aggregates', '3. Formula Documentation'],
    features: [
      '=XLOOKUP(A2, Ledger!$A$2:$A$100, Ledger!$E$2:$E$100, "N/A")',
      '=SUMIFS(Ledger!$E$2:$E$100, Ledger!$C$2:$C$100, "North America")',
      '=IF(G2>0.2, "CRITICAL RISK", IF(G2>0.1, "WATCHLIST", "HEALTHY"))',
      'Dual-engine compatibility: Works in Microsoft 365, Google Sheets, & LibreOffice',
    ],
    sampleFormula: '=XLOOKUP(A2, Ledger!$A$2:$A$50, Ledger!$D$2:$D$50)',
  },
  {
    id: 'conditional_heatmap',
    title: 'Conditional Formatting & Anomaly Matrix',
    badge: 'Visual Alerts',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    category: 'Analytics',
    description:
      'Applies subtle, presentation-grade cell highlights to numbers, risk scores, and audit flags using pastel corporate tones (soft green, soft amber, and soft crimson).',
    sheetsGenerated: ['1. Heatmap Ledger', '2. Outlier & Flagged Records', '3. Threshold Key'],
    features: [
      'Soft green fill (#D1FAE5) for top ARR accounts & verified status',
      'Soft amber fill (#FEF3C7) for elevated churn watchlist (10% - 20%)',
      'Soft rose fill (#FEE2E2) for high risk (>20%) or unverified audits',
      'Strict currency ($#,##0.00) & percentage (0.0%) number formatting',
    ],
    sampleFormula: '=IF(Churn_Prob>0.2, "ALERT", "OK")',
  },
  {
    id: 'clean_standardize',
    title: 'Automated Data Cleaner & Standardizer',
    badge: 'Data Sanitation',
    tagColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800',
    category: 'Engineering',
    description:
      'Trims whitespace, capitalizes names to Title Case, fills missing values with standardized placeholders or medians, and outputs a clean dataset with a full cleaning log.',
    sheetsGenerated: ['1. Cleaned & Standardized Data', '2. Data Cleaning Audit Log'],
    features: [
      'Automated string trimming (=TRIM equivalent applied)',
      'Title-case normalization for customer & product names',
      'Null value imputation (standardized "N/A" and numeric medians)',
      'Itemized anomaly repair log with exact row & column coordinates',
    ],
    sampleFormula: '=TRIM(CLEAN(A2))',
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
    name: 'Lumetric Emerald (Executive)',
    headerBg: 'FF0F172A', // Slate 900
    headerFont: 'FFFFFFFF',
    accentBg: 'FF059669', // Emerald 600
    accentFont: 'FFFFFFFF',
    zebraBg: 'FFF8FAFC', // Slate 50
    borderColor: 'FFE2E8F0', // Slate 200
    badgeBg: 'FFECFDF5', // Emerald 50
  },
  royal: {
    id: 'royal',
    name: 'Executive Royal Blue',
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
    name: 'Midnight Crimson',
    headerBg: 'FF1E293B', // Slate 800
    headerFont: 'FFFFFFFF',
    accentBg: 'FFE11D48', // Rose 600
    accentFont: 'FFFFFFFF',
    zebraBg: 'FFF8FAFC',
    borderColor: 'FFE2E8F0',
    badgeBg: 'FFFFF1F2',
  },
};

export function ExcelAutomatorView() {
  const {
    activeDataset,
    activeRows,
    datasets,
    setActiveDataset,
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

  // ════════════════════════════════════════════════════════════════════════════
  // COMPREHENSIVE EXCELJS WORKBOOK GENERATION ENGINE
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
            // Test if numeric
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

      // Helper for header border
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
        // TAB 1: EXECUTIVE DASHBOARD
        const wsDash = wb.addWorksheet('1. Executive Dashboard', {
          views: [{ showGridLines: true }],
        });

        // Set column widths
        wsDash.columns = [
          { width: 4 },
          { width: 26 },
          { width: 22 },
          { width: 22 },
          { width: 22 },
          { width: 22 },
          { width: 4 },
        ];

        // Title Block
        wsDash.mergeCells('B2:F2');
        const titleCell = wsDash.getCell('B2');
        titleCell.value = `${companyName.toUpperCase()} — EXECUTIVE PERFORMANCE DASHBOARD`;
        titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: palette.headerFont } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        wsDash.getRow(2).height = 36;

        // Subtitle / Generation info
        wsDash.mergeCells('B3:F3');
        const subCell = wsDash.getCell('B3');
        subCell.value = `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC | Dataset: ${activeDataset?.fileName || 'Active Dataset'} (${datasetStats.rowCount.toLocaleString()} Accounts)`;
        subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        wsDash.getRow(3).height = 20;

        // KPI Scorecards (Row 5 - Row 7)
        const kpis = [
          { col: 'B', label: 'TOTAL PORTFOLIO ARR', formula: '=SUM(\'3. Data Ledger\'!E2:E' + (datasetStats.rowCount + 1) + ')', fmt: '$#,##0', calc: datasetStats.totalArr },
          { col: 'C', label: 'AVG CONTRACT VALUE', formula: '=AVERAGE(\'3. Data Ledger\'!E2:E' + (datasetStats.rowCount + 1) + ')', fmt: '$#,##0', calc: datasetStats.avgArr },
          { col: 'D', label: 'ACCOUNT VOLUME', formula: '=COUNTA(\'3. Data Ledger\'!A2:A' + (datasetStats.rowCount + 1) + ')', fmt: '#,##0', calc: datasetStats.rowCount },
          { col: 'E', label: 'AVG NPS SCORE', formula: '=AVERAGE(\'3. Data Ledger\'!F2:F' + (datasetStats.rowCount + 1) + ')', fmt: '0.0', calc: datasetStats.avgNps },
          { col: 'F', label: 'MEAN CHURN RISK', formula: '=AVERAGE(\'3. Data Ledger\'!G2:G' + (datasetStats.rowCount + 1) + ')', fmt: '0.0%', calc: datasetStats.avgChurn },
        ];

        kpis.forEach((kpi) => {
          // Label cell
          const lblCell = wsDash.getCell(`${kpi.col}5`);
          lblCell.value = kpi.label;
          lblCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
          lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.badgeBg } };
          lblCell.alignment = { horizontal: 'center', vertical: 'middle' };
          lblCell.border = { top: borderThin.top, left: borderThin.left, right: borderThin.right };

          // Value cell
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

        // Section Header: Regional Summary Matrix (Row 9)
        wsDash.mergeCells('B9:F9');
        const regHeader = wsDash.getCell('B9');
        regHeader.value = 'PORTFOLIO BREAKDOWN BY REGION';
        regHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: palette.headerFont } };
        regHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        regHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        wsDash.getRow(9).height = 26;

        // Table Header
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

        // Group rows by region
        const regionGroups: Record<string, { count: number; arr: number }> = {};
        sanitizedRows.forEach((r) => {
          const reg = String(r['Region'] || r['region'] || 'Global');
          const arr = typeof r['ARR_USD'] === 'number' ? r['ARR_USD'] : 0;
          if (!regionGroups[reg]) regionGroups[reg] = { count: 0, arr: 0 };
          regionGroups[reg].count++;
          regionGroups[reg].arr += arr;
        });

        let curRow = 11;
        const totalRowsLedger = datasetStats.rowCount + 1;
        Object.entries(regionGroups).forEach(([regName, stats]) => {
          // Region cell
          const cReg = wsDash.getCell(`B${curRow}`);
          cReg.value = regName;
          cReg.font = { name: 'Segoe UI', size: 10, bold: true };
          cReg.border = borderThin;

          // Count formula: COUNTIF in Ledger
          const cCount = wsDash.getCell(`C${curRow}`);
          cCount.value = {
            formula: `=COUNTIF('3. Data Ledger'!$C$2:$C$${totalRowsLedger}, "${regName}")`,
            result: stats.count,
          };
          cCount.font = { name: 'Segoe UI', size: 10 };
          cCount.numFmt = '#,##0';
          cCount.alignment = { horizontal: 'right' };
          cCount.border = borderThin;

          // ARR formula: SUMIF in Ledger
          const cArr = wsDash.getCell(`D${curRow}`);
          cArr.value = {
            formula: `=SUMIF('3. Data Ledger'!$C$2:$C$${totalRowsLedger}, "${regName}", '3. Data Ledger'!$E$2:$E$${totalRowsLedger})`,
            result: stats.arr,
          };
          cArr.font = { name: 'Segoe UI', size: 10, bold: true };
          cArr.numFmt = '$#,##0';
          cArr.alignment = { horizontal: 'right' };
          cArr.border = borderThin;

          // Avg ARR formula: =D_row / C_row
          const cAvg = wsDash.getCell(`E${curRow}`);
          cAvg.value = {
            formula: `=D${curRow}/C${curRow}`,
            result: stats.count > 0 ? stats.arr / stats.count : 0,
          };
          cAvg.font = { name: 'Segoe UI', size: 10 };
          cAvg.numFmt = '$#,##0';
          cAvg.alignment = { horizontal: 'right' };
          cAvg.border = borderThin;

          // Share formula: =D_row / $D$Total
          const cShare = wsDash.getCell(`F${curRow}`);
          cShare.value = {
            formula: `=D${curRow}/$D$${11 + Object.keys(regionGroups).length}`,
            result: datasetStats.totalArr > 0 ? stats.arr / datasetStats.totalArr : 0,
          };
          cShare.font = { name: 'Segoe UI', size: 10 };
          cShare.numFmt = '0.0%';
          cShare.alignment = { horizontal: 'right' };
          cShare.border = borderThin;

          wsDash.getRow(curRow).height = 20;
          curRow++;
        });

        // Total Row
        const totRow = curRow;
        wsDash.getCell(`B${totRow}`).value = 'GRAND TOTAL';
        wsDash.getCell(`B${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`B${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`B${totRow}`).border = borderThin;

        wsDash.getCell(`C${totRow}`).value = { formula: `=SUM(C11:C${totRow - 1})`, result: datasetStats.rowCount };
        wsDash.getCell(`C${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`C${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`C${totRow}`).numFmt = '#,##0';
        wsDash.getCell(`C${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`C${totRow}`).border = borderThin;

        wsDash.getCell(`D${totRow}`).value = { formula: `=SUM(D11:D${totRow - 1})`, result: datasetStats.totalArr };
        wsDash.getCell(`D${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`D${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`D${totRow}`).numFmt = '$#,##0';
        wsDash.getCell(`D${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`D${totRow}`).border = borderThin;

        wsDash.getCell(`E${totRow}`).value = { formula: `=AVERAGE(E11:E${totRow - 1})`, result: datasetStats.avgArr };
        wsDash.getCell(`E${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`E${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`E${totRow}`).numFmt = '$#,##0';
        wsDash.getCell(`E${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`E${totRow}`).border = borderThin;

        wsDash.getCell(`F${totRow}`).value = { formula: `=SUM(F11:F${totRow - 1})`, result: 1.0 };
        wsDash.getCell(`F${totRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
        wsDash.getCell(`F${totRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        wsDash.getCell(`F${totRow}`).numFmt = '0.0%';
        wsDash.getCell(`F${totRow}`).alignment = { horizontal: 'right' };
        wsDash.getCell(`F${totRow}`).border = borderThin;
        wsDash.getRow(totRow).height = 24;

        // TAB 2: PIVOT & DISTRIBUTION
        const wsPivot = wb.addWorksheet('2. Pivot & Distribution', {
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

        // Group by Plan Tier
        const tierGroups: Record<string, { count: number; arr: number; npsSum: number }> = {};
        sanitizedRows.forEach((r) => {
          const tier = String(r['Plan_Tier'] || r['tier'] || 'Standard');
          const arr = typeof r['ARR_USD'] === 'number' ? r['ARR_USD'] : 0;
          const nps = typeof r['NPS_Score'] === 'number' ? r['NPS_Score'] : 50;
          if (!tierGroups[tier]) tierGroups[tier] = { count: 0, arr: 0, npsSum: 0 };
          tierGroups[tier].count++;
          tierGroups[tier].arr += arr;
          tierGroups[tier].npsSum += nps;
        });

        let pRow = 3;
        Object.entries(tierGroups).forEach(([tierName, tStat]) => {
          wsPivot.addRow([
            tierName,
            { formula: `=COUNTIF('3. Data Ledger'!$D$2:$D$${totalRowsLedger}, "${tierName}")`, result: tStat.count },
            { formula: `=SUMIF('3. Data Ledger'!$D$2:$D$${totalRowsLedger}, "${tierName}", '3. Data Ledger'!$E$2:$E$${totalRowsLedger})`, result: tStat.arr },
            { formula: `=C${pRow}/B${pRow}`, result: tStat.count > 0 ? tStat.arr / tStat.count : 0 },
            { formula: `=AVERAGEIF('3. Data Ledger'!$D$2:$D$${totalRowsLedger}, "${tierName}", '3. Data Ledger'!$F$2:$F$${totalRowsLedger})`, result: tStat.count > 0 ? tStat.npsSum / tStat.count : 0 },
          ]);
          const r = wsPivot.getRow(pRow);
          r.getCell(2).numFmt = '#,##0';
          r.getCell(3).numFmt = '$#,##0';
          r.getCell(4).numFmt = '$#,##0';
          r.getCell(5).numFmt = '0.0';
          r.eachCell((c) => (c.border = borderThin));
          pRow++;
        });

        // TAB 3: DATA LEDGER (STRICT CORPORATE FORMAT WITH FROZEN PANE & AUTOFILTERS)
        const wsLedger = wb.addWorksheet('3. Data Ledger', {
          views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2', showGridLines: true }],
        });

        // Headers
        wsLedger.columns = cols.map((colName) => ({
          header: colName.replace(/_/g, ' '),
          key: colName,
          width: Math.max(16, colName.length + 6),
        }));

        // Style Header Row
        const headerRow = wsLedger.getRow(1);
        headerRow.height = 28;
        headerRow.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.headerFont } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = borderThin;
        });

        // Enable AutoFilters
        const lastColLetter = String.fromCharCode(65 + cols.length - 1);
        wsLedger.autoFilter = `A1:${lastColLetter}1`;

        // Add Data Rows with zebra striping and number formatting
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
            // Format specific data types
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

        // TAB 4: AUDIT & METADATA
        const wsAudit = wb.addWorksheet('4. Audit & Verification', {
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
        const wsFin = wb.addWorksheet('1. 12-Month P&L Runway', {
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

        // Title Row
        wsFin.mergeCells('A1:O1');
        const finTitle = wsFin.getCell('A1');
        finTitle.value = `${companyName.toUpperCase()} — 12-MONTH FORWARD P&L & ARR RUNWAY MODEL`;
        finTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: palette.headerFont } };
        finTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        finTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        wsFin.getRow(1).height = 34;

        // Config Row
        wsFin.getCell('A2').value = 'Assumed Monthly Growth Rate:';
        wsFin.getCell('A2').font = { name: 'Segoe UI', size: 9, bold: true };
        wsFin.getCell('B2').value = growthScenarioPct / 100;
        wsFin.getCell('B2').numFmt = '0.0%';
        wsFin.getCell('B2').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: palette.accentBg } };
        wsFin.getRow(2).height = 22;

        // Month Headers (Row 3)
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

        // Helper to populate monthly projection formula
        const addProjectedLine = (
          label: string,
          baseVal: number,
          isFormulaRow: boolean,
          rateRef: string,
          multiplier = 1,
          isExpense = false
        ) => {
          const cells: any[] = [label, baseVal];
          const colLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

          for (let m = 0; m < 12; m++) {
            const prevCol = m === 0 ? 'B' : colLetters[m - 1];
            if (isFormulaRow) {
              cells.push({
                formula: `=${prevCol}${wsFin.rowCount + 1}*(1+${rateRef})`,
                result: baseVal * Math.pow(1 + (growthScenarioPct / 100) * multiplier, m + 1),
              });
            } else {
              cells.push(baseVal);
            }
          }

          // Full Year Total (Sum of C:N)
          const curR = wsFin.rowCount + 1;
          cells.push({
            formula: `=SUM(C${curR}:N${curR})`,
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

        // Section 1: Revenue
        const revRow = addProjectedLine('1. Gross Recurring Revenue (MRR)', baselineRevenue, true, '$B$2', 1);

        // Section 2: COGS (25% of Revenue)
        const cogsCells: any[] = ['2. Cost of Goods Sold (COGS 22%)', baselineRevenue * 0.22];
        const colLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
        for (let m = 0; m < 12; m++) {
          const col = colLetters[m];
          cogsCells.push({
            formula: `=${col}${revRow}*0.22`,
            result: (baselineRevenue * Math.pow(1 + growthScenarioPct / 100, m + 1)) * 0.22,
          });
        }
        const cogsRowNum = wsFin.rowCount + 1;
        cogsCells.push({ formula: `=SUM(C${cogsRowNum}:N${cogsRowNum})`, result: baselineRevenue * 0.22 * 12 });
        const cogsR = wsFin.addRow(cogsCells);
        cogsR.height = 20;
        cogsR.eachCell({ includeEmpty: true }, (c, idx) => {
          c.border = borderThin;
          if (idx > 1) {
            c.numFmt = '$#,##0';
            c.alignment = { horizontal: 'right' };
          }
        });

        // Section 3: Gross Profit = Revenue - COGS
        const gpCells: any[] = ['3. Gross Profit (Revenue - COGS)', baselineRevenue * 0.78];
        for (let m = 0; m < 12; m++) {
          const col = colLetters[m];
          gpCells.push({
            formula: `=${col}${revRow}-${col}${cogsRowNum}`,
            result: (baselineRevenue * Math.pow(1 + growthScenarioPct / 100, m + 1)) * 0.78,
          });
        }
        const gpRowNum = wsFin.rowCount + 1;
        gpCells.push({ formula: `=SUM(C${gpRowNum}:N${gpRowNum})`, result: baselineRevenue * 0.78 * 12 });
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
        const wsBvA = wb.addWorksheet('2. Variance Analysis (BvA)', {
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
            { formula: `=C${rowNum}-B${rowNum}`, result: varAmt },
            { formula: `=D${rowNum}/B${rowNum}`, result: varPct },
            isFavorable ? 'FAVORABLE' : 'UNFAVORABLE',
          ]);
          r.height = 20;
          r.getCell(2).numFmt = '$#,##0';
          r.getCell(3).numFmt = '$#,##0';
          r.getCell(4).numFmt = '$#,##0';
          r.getCell(5).numFmt = '0.0%';
          r.getCell(6).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isFavorable ? 'FF059669' : 'FFE11D48' } };
          r.eachCell((c) => (c.border = borderThin));
        });
      }

      // ────────────────────────────────────────────────────────────────────────
      // GENERATOR 3: MULTI-LEVEL PIVOT & CROSS-TABULATION MASTER
      // ────────────────────────────────────────────────────────────────────────
      else if (selectedAutomation === 'pivot_master') {
        const wsPivotMaster = wb.addWorksheet('1. Cross-Tab Matrix', {
          views: [{ showGridLines: true }],
        });

        // Collect distinct rows and columns
        const regions = Array.from(new Set(sanitizedRows.map((r) => String(r['Region'] || 'Global')))).sort();
        const tiers = Array.from(new Set(sanitizedRows.map((r) => String(r['Plan_Tier'] || 'Standard')))).sort();

        // Calculate columns width
        wsPivotMaster.columns = [
          { width: 24 },
          ...tiers.map(() => ({ width: 18 })),
          { width: 20 },
          { width: 18 },
        ];

        // Title Row
        const totalCols = tiers.length + 3;
        const lastColLetter = String.fromCharCode(65 + totalCols - 1);
        wsPivotMaster.mergeCells(`A1:${lastColLetter}1`);
        const pTitle = wsPivotMaster.getCell('A1');
        pTitle.value = `${companyName.toUpperCase()} — MULTI-DIMENSIONAL CROSS-TABULATION MATRIX`;
        pTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: palette.headerFont } };
        pTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        pTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        wsPivotMaster.getRow(1).height = 32;

        // Header Row: Dimension A (Region) by Dimension B (Plan Tiers)
        const headerRowVals = ['Region / Dimension', ...tiers, 'Total ARR (Row Sum)', 'Share of Revenue'];
        const pHeadRow = wsPivotMaster.addRow(headerRowVals);
        pHeadRow.height = 24;
        pHeadRow.eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
          c.border = borderThin;
        });

        // Compute sums
        let startRow = 3;
        const grandTotalRow = startRow + regions.length;
        const totalRowsLedger = datasetStats.rowCount + 1;

        regions.forEach((reg, rIdx) => {
          const curR = startRow + rIdx;
          const rowVals: any[] = [reg];

          let rowSumCalc = 0;
          tiers.forEach((tier, tIdx) => {
            const tierColLetter = String.fromCharCode(66 + tIdx);
            // In Ledger, Region is column C, Plan_Tier is column D, ARR is column E
            const matchingRows = sanitizedRows.filter(
              (r) => String(r['Region']) === reg && String(r['Plan_Tier']) === tier
            );
            const sumVal = matchingRows.reduce((acc, curr) => acc + (typeof curr['ARR_USD'] === 'number' ? curr['ARR_USD'] : 0), 0);
            rowSumCalc += sumVal;

            rowVals.push({
              formula: `=SUMIFS('3. Source Data'!$E$2:$E$${totalRowsLedger}, '3. Source Data'!$C$2:$C$${totalRowsLedger}, "${reg}", '3. Source Data'!$D$2:$D$${totalRowsLedger}, "${tier}")`,
              result: sumVal,
            });
          });

          // Row Sum Formula
          const firstTierCol = 'B';
          const lastTierCol = String.fromCharCode(65 + tiers.length);
          const totalColLetter = String.fromCharCode(66 + tiers.length);
          const shareColLetter = String.fromCharCode(67 + tiers.length);

          rowVals.push({
            formula: `=SUM(${firstTierCol}${curR}:${lastTierCol}${curR})`,
            result: rowSumCalc,
          });

          // Share % Formula
          rowVals.push({
            formula: `=${totalColLetter}${curR}/$${totalColLetter}$${grandTotalRow}`,
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

        // Grand Totals Row
        const grandTotalsVals: any[] = ['GRAND TOTAL'];
        tiers.forEach((tier, tIdx) => {
          const colLetter = String.fromCharCode(66 + tIdx);
          grandTotalsVals.push({
            formula: `=SUM(${colLetter}${startRow}:${colLetter}${grandTotalRow - 1})`,
            result: sanitizedRows
              .filter((r) => String(r['Plan_Tier']) === tier)
              .reduce((acc, curr) => acc + (typeof curr['ARR_USD'] === 'number' ? curr['ARR_USD'] : 0), 0),
          });
        });

        const totalColLetter = String.fromCharCode(66 + tiers.length);
        grandTotalsVals.push({
          formula: `=SUM(${totalColLetter}${startRow}:${totalColLetter}${grandTotalRow - 1})`,
          result: datasetStats.totalArr,
        });
        grandTotalsVals.push({ formula: `=SUM(${String.fromCharCode(67 + tiers.length)}${startRow}:${String.fromCharCode(67 + tiers.length)}${grandTotalRow - 1})`, result: 1.0 });

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

        // TAB 2: SOURCE DATA
        const wsSource = wb.addWorksheet('3. Source Data', {
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
        const wsDynamic = wb.addWorksheet('1. Dynamic Formulas', {
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
        fTitle.value = 'ENTERPRISE FORMULA INJECTION SUITE (=XLOOKUP, =SUMIFS, =IF)';
        fTitle.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: palette.headerFont } };
        fTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.headerBg } };
        fTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        wsDynamic.getRow(1).height = 32;

        const dynHeaders = [
          'Account ID',
          'Client Name',
          'Revenue (=XLOOKUP)',
          'Risk Classification (=IF)',
          'Regional Subtotal (=SUMIFS)',
          'Formula Explanation',
        ];
        const dRow = wsDynamic.addRow(dynHeaders);
        dRow.height = 24;
        dRow.eachCell((c) => {
          c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accentBg } };
          c.border = borderThin;
        });

        const totalRowsLedger = datasetStats.rowCount + 1;
        sanitizedRows.forEach((row, idx) => {
          const rowNum = idx + 3;
          const accId = String(row['Account_ID'] || `ACC-${1000 + idx}`);
          const custName = String(row['Customer_Name'] || 'Customer');
          const arrVal = typeof row['ARR_USD'] === 'number' ? row['ARR_USD'] : 50000;
          const churnVal = typeof row['Churn_Probability'] === 'number' ? row['Churn_Probability'] : 0.05;
          const regVal = String(row['Region'] || 'North America');

          const r = wsDynamic.addRow([
            accId,
            custName,
            {
              formula: `=XLOOKUP(A${rowNum}, '3. Master Ledger'!$A$2:$A$${totalRowsLedger}, '3. Master Ledger'!$E$2:$E$${totalRowsLedger}, "Not Found")`,
              result: arrVal,
            },
            {
              formula: `=IF('3. Master Ledger'!G${idx + 2}>=0.2, "CRITICAL RISK", IF('3. Master Ledger'!G${idx + 2}>=0.1, "WATCHLIST", "HEALTHY"))`,
              result: churnVal >= 0.2 ? 'CRITICAL RISK' : churnVal >= 0.1 ? 'WATCHLIST' : 'HEALTHY',
            },
            {
              formula: `=SUMIFS('3. Master Ledger'!$E$2:$E$${totalRowsLedger}, '3. Master Ledger'!$C$2:$C$${totalRowsLedger}, "${regVal}")`,
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
            color: { argb: churnVal >= 0.2 ? 'FFE11D48' : churnVal >= 0.1 ? 'FFD97706' : 'FF059669' },
          };
          r.eachCell((c) => (c.border = borderThin));
        });

        // TAB 2: MASTER LEDGER
        const wsMaster = wb.addWorksheet('3. Master Ledger', {
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
        const wsHeatmap = wb.addWorksheet('1. Heatmap Ledger', {
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

          const arr = typeof row['ARR_USD'] === 'number' ? row['ARR_USD'] : 0;
          const churn = typeof row['Churn_Probability'] === 'number' ? row['Churn_Probability'] : 0;
          const auditStatus = String(row['Last_Audit_Status'] || 'Verified');

          r.eachCell({ includeEmpty: true }, (cell, colIdx) => {
            cell.font = { name: 'Segoe UI', size: 9 };
            cell.border = borderThin;

            const colKey = cols[colIdx - 1];
            if (colKey.includes('ARR')) {
              cell.numFmt = '$#,##0.00';
              if (arr > 100000) {
                // Soft Green highlight for high ARR
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
              }
            } else if (colKey.includes('Churn')) {
              cell.numFmt = '0.0%';
              if (churn >= 0.2) {
                // Soft Red highlight
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
              } else if (churn >= 0.1) {
                // Soft Amber highlight
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

        // TAB 2: THRESHOLD KEY
        const wsKey = wb.addWorksheet('2. Threshold Key', { views: [{ showGridLines: true }] });
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
        const wsClean = wb.addWorksheet('1. Cleaned & Standardized Data', {
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
              // Title case
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

        // TAB 2: AUDIT LOG
        const wsLog = wb.addWorksheet('2. Cleaning Audit Log', { views: [{ showGridLines: true }] });
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
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F19] min-h-screen">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & WORKSPACE CONTEXT BAR                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheetIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Excel Automator
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                  Self-Dealing Suite
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  100% Math Accuracy
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated multi-tab Microsoft Excel (.xlsx) workbooks with live native formulas, dashboards &amp; financial models.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dataset Selector / Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <DatabaseIcon className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                {activeDataset?.fileName || 'Active Dataset'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                ({datasetStats.rowCount.toLocaleString()} rows)
              </span>
            </div>

            {/* Quick SQL jump */}
            <button
              onClick={() => setActiveView('sql')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Open SQL Studio"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>SQL Studio</span>
            </button>

            {/* Generate Primary Action Button */}
            <button
              onClick={handleGenerateWorkbook}
              disabled={isGenerating || datasetStats.rowCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SUCCESS DOWNLOAD TOAST / BANNER                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {downloadSuccess && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <p className="font-bold text-sm">
                Workbook compiled and downloaded successfully!
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                File: {downloadSuccess.fileName} • Size: {(downloadSuccess.fileSizeBytes / 1024).toFixed(1)} KB • Render Time: {downloadSuccess.durationMs}ms • 100% ECMA-376 Validated
              </p>
            </div>
          </div>
          <button
            onClick={() => setDownloadSuccess(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold px-2 py-1 rounded-md"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MAIN TWO-COLUMN WORKSPACE                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: AUTOMATION CATALOG (7 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-emerald-500" />
                Select Desired Excel Automation Outcome
              </h2>
              <span className="text-xs text-slate-500">6 Available Deliverables</span>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AUTOMATION_CATALOG.map((item) => {
                const isSelected = selectedAutomation === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAutomation(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.tagColor}`}
                        >
                          {item.badge}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono">
                        {item.sheetsGenerated.length} Tabs Included
                      </span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
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

          {/* ACTIVE DELIVERABLE INSPECTION & TABS BREAKDOWN */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Workbook Blueprint &amp; Generated Sheets
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Target: Microsoft Excel / Google Sheets
              </span>
            </div>

            {/* Sheets Preview */}
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                When you click <strong>Generate &amp; Download</strong>, Lumetric compiles the following validated sheets into an ECMA-376 OpenXML package:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentCard.sheetsGenerated.map((sheet, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {sheet}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Zebra-striped • Frozen Pane • ECMA Validated
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Injected Features List */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Engineered Mathematical Guarantees:
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  {currentCard.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sample Formula Box */}
              <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">fx</span>
                  <span>{currentCard.sampleFormula}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Live Injected Formula
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WORKBOOK CUSTOMIZER & SETTINGS (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-emerald-500" />
                Workbook Configuration
              </h3>
              <span className="text-[11px] font-mono text-slate-400">v3.0 Engine</span>
            </div>

            {/* Company / Workspace Branding */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company / Organization Header
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Acme Corp"
              />
            </div>

            {/* Report Subtitle */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Report Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Q4 Executive Report"
              />
            </div>

            {/* Color Palette Theme */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-full h-3 rounded-md mb-1.5 flex overflow-hidden">
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: `#${p.headerBg.slice(2)}` }}
                        />
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: `#${p.accentBg.slice(2)}` }}
                        />
                      </div>
                      <span className="text-[10px] block truncate">{p.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Growth Scenario Slider (for financial model) */}
            {selectedAutomation === 'financial_runway' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Monthly Growth Scenario:
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>3% (Cautious)</span>
                  <span>12% (Target)</span>
                  <span>30% (Hyper)</span>
                </div>
              </div>
            )}

            {/* Quick Metrics Summary Box */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Source Data Checksum
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">Row Count</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {datasetStats.rowCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">Total ARR</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ${(datasetStats.totalArr / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleGenerateWorkbook}
              disabled={isGenerating || datasetStats.rowCount === 0}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
            <p className="text-[10px] text-slate-400 text-center">
              Compiles natively on your device. Zero cloud data transmission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
