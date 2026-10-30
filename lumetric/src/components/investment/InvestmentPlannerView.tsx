'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  InvestmentPlanState,
  IndustryBlueprintId,
  CurrencyCode,
  BankLoan,
  BankLoanType,
} from '@/types';
import { INDUSTRY_BLUEPRINTS } from '@/lib/investment/blueprints';
import {
  formatCurrency,
  calculateMonthlyProjections,
  runMonteCarloSimulation,
  calculateSensitivityTornado,
  calculateVentureSurvivalIndex,
  evaluateStartupFailureModes,
  calculateLoanMonthlyPayment,
  calculateDebtServiceCoverageRatio,
} from '@/lib/investment/engine';
import {
  TrendingUpIcon,
  LandmarkIcon,
  BarChart3Icon,
  PieChartIcon,
  ShieldIcon,
  FileSpreadsheetIcon,
  SparklesIcon,
  BrainIcon,
  DatabaseIcon,
  GlobeIcon,
  PlusIcon,
  ActivityIcon,
  TerminalIcon,
} from '@/components/icons';

type ActiveTab =
  | 'overview'
  | 'banking'
  | 'captable'
  | 'logistics'
  | 'montecarlo'
  | 'valuation'
  | 'survival';

export function InvestmentPlannerView() {
  const { currentWorkspace } = useApp();

  // Active Blueprint & State
  const [activeBlueprintId, setActiveBlueprintId] = useState<IndustryBlueprintId>('saas');
  const [modelState, setModelState] = useState<InvestmentPlanState>(() => {
    return JSON.parse(JSON.stringify(INDUSTRY_BLUEPRINTS.saas.defaults));
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSimulatingMonteCarlo, setIsSimulatingMonteCarlo] = useState(false);
  const [monteCarloRuns, setMonteCarloRuns] = useState(() => runMonteCarloSimulation(INDUSTRY_BLUEPRINTS.saas.defaults, 1000));
  const [newLoanModalOpen, setNewLoanModalOpen] = useState(false);

  // New loan form state
  const [newLoanName, setNewLoanName] = useState('Commercial Bank Expansion Loan');
  const [newLoanType, setNewLoanType] = useState<BankLoanType>('term_loan');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState(250000);
  const [newLoanRate, setNewLoanRate] = useState(8.5);
  const [newLoanTenor, setNewLoanTenor] = useState(36);

  // Switch Blueprint Handler
  const handleSelectBlueprint = (id: IndustryBlueprintId) => {
    setActiveBlueprintId(id);
    const defaults = JSON.parse(JSON.stringify(INDUSTRY_BLUEPRINTS[id].defaults));
    setModelState(defaults);
    setMonteCarloRuns(runMonteCarloSimulation(defaults, 1000));
  };

  // Re-run Monte Carlo on demand
  const handleTriggerMonteCarlo = () => {
    setIsSimulatingMonteCarlo(true);
    setTimeout(() => {
      const res = runMonteCarloSimulation(modelState, 1000);
      setMonteCarloRuns(res);
      setIsSimulatingMonteCarlo(false);
    }, 250);
  };

  // Calculations
  const projections = useMemo(() => calculateMonthlyProjections(modelState), [modelState]);
  const currentMonthlyEbitda = (modelState.monthlyRevenue * modelState.grossMarginPercent / 100) - modelState.monthlyOpex;
  const currentDscr = useMemo(() => {
    return calculateDebtServiceCoverageRatio(Math.max(1000, currentMonthlyEbitda), projections.totalLoansMonthlyPayment);
  }, [currentMonthlyEbitda, projections.totalLoansMonthlyPayment]);

  const survivalIndex = useMemo(() => {
    return calculateVentureSurvivalIndex(modelState, projections.runwayMonths, currentDscr);
  }, [modelState, projections.runwayMonths, currentDscr]);

  const failureModes = useMemo(() => {
    return evaluateStartupFailureModes(modelState, projections.runwayMonths, currentDscr);
  }, [modelState, projections.runwayMonths, currentDscr]);

  const sensitivityTornado = useMemo(() => {
    return calculateSensitivityTornado(modelState);
  }, [modelState]);

  // Total debt principal
  const totalDebtPrincipal = useMemo(() => {
    return modelState.loans.reduce((acc, l) => acc + (l.status === 'active' ? l.principal : 0), 0);
  }, [modelState.loans]);

  // Handle adding a new bank loan
  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const monthlyPayment = calculateLoanMonthlyPayment(newLoanPrincipal, newLoanRate, newLoanTenor);
    const totalInterest = (monthlyPayment * newLoanTenor) - newLoanPrincipal;

    const newLoan: BankLoan = {
      id: `loan_${Date.now()}`,
      name: newLoanName,
      type: newLoanType,
      principal: newLoanPrincipal,
      annualInterestRate: newLoanRate,
      tenorMonths: newLoanTenor,
      monthlyPayment,
      remainingBalance: newLoanPrincipal,
      status: 'active',
      totalInterestPaid: Math.max(0, Math.round(totalInterest)),
    };

    setModelState((prev) => ({
      ...prev,
      initialCash: prev.initialCash + newLoanPrincipal, // Loan injects cash into company
      loans: [...prev.loans, newLoan],
    }));

    setNewLoanModalOpen(false);
  };

  // Remove loan
  const handleRemoveLoan = (id: string) => {
    setModelState((prev) => ({
      ...prev,
      loans: prev.loans.filter((l) => l.id !== id),
    }));
  };

  // Export JSON/CSV model report
  const handleExportModel = () => {
    const reportData = {
      venture: modelState.ventureName,
      blueprint: activeBlueprintId,
      currency: modelState.currency,
      timestamp: new Date().toISOString(),
      survivalScore: survivalIndex.score,
      grade: survivalIndex.grade,
      runwayMonths: projections.runwayMonths,
      dscr: currentDscr,
      isBankable: currentDscr >= 1.25,
      exitValuation: projections.exitValuation,
      irrPercent: projections.irrPercent,
      loans: modelState.loans,
      projectionsSummary: projections.timeline.slice(0, 12),
      failureModes: failureModes.filter((f) => f.isTriggered),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelState.ventureName.toLowerCase().replace(/\s+/g, '_')}_financial_model.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 bg-[var(--lm-bg-primary)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full select-none animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER & STUDIO IDENTITY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full bg-[#0A110E] rounded-[14px] flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--lm-text-primary)] tracking-tight">
                  Investment &amp; Venture Intelligence Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  INSTITUTIONAL v2.4
                </span>
              </div>
              <p className="text-xs text-[var(--lm-text-tertiary)] mt-0.5">
                Financial modeling, bank loans &amp; debt covenants, logistics economics, 1,000-run Monte Carlo, and startup failure diagnostics.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Currency & Time Horizon & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Toggle */}
          <div className="flex items-center p-1 bg-[var(--lm-bg-secondary)] rounded-xl border border-[var(--lm-border-default)] text-xs font-mono font-bold">
            {(['USD', 'INR', 'EUR', 'GBP'] as CurrencyCode[]).map((cur) => (
              <button
                key={cur}
                onClick={() => setModelState((p) => ({ ...p, currency: cur }))}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  modelState.currency === cur
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                {cur === 'USD' ? '$ USD' : cur === 'INR' ? '₹ INR' : cur === 'EUR' ? '€ EUR' : '£ GBP'}
              </button>
            ))}
          </div>

          {/* Time Horizon */}
          <div className="flex items-center p-1 bg-[var(--lm-bg-secondary)] rounded-xl border border-[var(--lm-border-default)] text-xs font-mono">
            {([12, 36, 60] as const).map((h) => (
              <button
                key={h}
                onClick={() => setModelState((p) => ({ ...p, timeHorizonMonths: h }))}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  modelState.timeHorizonMonths === h
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                {h}M
              </button>
            ))}
          </div>

          {/* Run Monte Carlo Action */}
          <button
            onClick={handleTriggerMonteCarlo}
            disabled={isSimulatingMonteCarlo}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs font-bold border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <SparklesIcon className={`w-3.5 h-3.5 ${isSimulatingMonteCarlo ? 'animate-spin' : ''}`} />
            <span>{isSimulatingMonteCarlo ? 'Simulating...' : '1k Monte Carlo'}</span>
          </button>

          {/* Export Model */}
          <button
            onClick={handleExportModel}
            className="px-3 py-1.5 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-slate-800 text-[var(--lm-text-primary)] text-xs font-semibold border border-[var(--lm-border-default)] transition-all cursor-pointer"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* 2. INDUSTRY BLUEPRINT SELECTOR BAR */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)] flex items-center justify-between">
          <span>Pre-Configured Venture Archetypes (1-Click Presets)</span>
          <span className="text-emerald-400">Current: {INDUSTRY_BLUEPRINTS[activeBlueprintId].name}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(Object.keys(INDUSTRY_BLUEPRINTS) as IndustryBlueprintId[]).map((bpId) => {
            const bp = INDUSTRY_BLUEPRINTS[bpId];
            const isSelected = activeBlueprintId === bpId;
            return (
              <button
                key={bpId}
                onClick={() => handleSelectBlueprint(bpId)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/40'
                    : 'bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)] hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-[var(--lm-text-primary)] truncate">
                      {bp.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-block truncate max-w-full">
                    {bp.badge}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--lm-text-tertiary)] line-clamp-1 mt-1">
                  {bp.defaults.ventureName}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. HERO EXECUTIVE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total Liquid Capital */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Total Liquid Capital
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--lm-text-primary)] font-mono mt-1">
            {formatCurrency(modelState.initialCash, modelState.currency)}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <span>+{formatCurrency(totalDebtPrincipal, modelState.currency)} Bank Debt</span>
          </div>
        </div>

        {/* KPI 2: Net Runway Clock & Treasury Extension */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Net Cash Runway
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1 flex items-baseline gap-1.5">
            <span>{projections.runwayMonths.toFixed(1)}</span>
            <span className="text-xs font-normal text-[var(--lm-text-tertiary)]">Months</span>
          </div>
          <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
            <span>+{projections.runwayExtensionMonths.toFixed(1)}m from T-Bills Yield</span>
          </div>
        </div>

        {/* KPI 3: Bank Viability (DSCR) */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Bank Health (DSCR)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1 flex items-baseline gap-1.5">
            <span>{currentDscr > 50 ? '99+' : currentDscr.toFixed(2)}x</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              currentDscr >= 1.25 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {currentDscr >= 1.25 ? 'Bankable' : 'Covenant Alert'}
            </span>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-mono">
            Debt Svc: {formatCurrency(projections.totalLoansMonthlyPayment, modelState.currency)}/mo
          </div>
        </div>

        {/* KPI 4: Venture Survival Index */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Survival Index™
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1 flex items-baseline gap-2">
            <span className="text-emerald-400">{survivalIndex.score}</span>
            <span className="text-xs font-semibold text-slate-400">/ 100</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              Grade {survivalIndex.grade}
            </span>
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 truncate">
            {failureModes.filter((f) => f.isTriggered).length} Early Risk Alerts
          </div>
        </div>

        {/* KPI 5: Projected Exit Valuation */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Target Exit Valuation
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {formatCurrency(projections.exitValuation, modelState.currency)}
          </div>
          <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1 font-mono">
            {modelState.exitMultipleARR}x ARR • Projected IRR: {projections.irrPercent}%
          </div>
        </div>
      </div>

      {/* 4. MAIN STUDIO NAVIGATION TABS */}
      <div className="border-b border-[var(--lm-border-default)]">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2 scrollbar-none text-xs font-semibold">
          {[
            { id: 'overview', label: 'Executive P&L & Runway', icon: BarChart3Icon },
            { id: 'banking', label: 'Bank Loans & Treasury Yield', icon: LandmarkIcon },
            { id: 'captable', label: 'Cap Table & Dilution', icon: PieChartIcon },
            { id: 'logistics', label: 'Logistics & Supply Chain', icon: FileSpreadsheetIcon },
            { id: 'montecarlo', label: 'Monte Carlo & Risk Matrix', icon: SparklesIcon },
            { id: 'valuation', label: 'Returns, DCF & Valuation', icon: TrendingUpIcon },
            { id: 'survival', label: 'Survival Index & Failures', icon: ShieldIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-[var(--lm-text-secondary)] hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 5. TAB PANELS */}

      {/* TAB 1: EXECUTIVE P&L & RUNWAY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Real-time Parameter Adjustment Sliders */}
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                Real-Time Growth &amp; Margin Calibration Dials
              </span>
              <span className="text-[11px] text-[var(--lm-text-tertiary)] font-mono">
                Instant Zero-Lag Dynamic Recalculation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Slider 1: Monthly Growth Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--lm-text-secondary)]">Monthly Compound Growth:</span>
                  <strong className="text-emerald-400">{modelState.monthlyGrowthRatePercent}%</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="0.5"
                  value={modelState.monthlyGrowthRatePercent}
                  onChange={(e) => setModelState((p) => ({ ...p, monthlyGrowthRatePercent: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Slider 2: Gross Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--lm-text-secondary)]">Gross Margin %:</span>
                  <strong className="text-emerald-400">{modelState.grossMarginPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="1"
                  value={modelState.grossMarginPercent}
                  onChange={(e) => setModelState((p) => ({ ...p, grossMarginPercent: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Slider 3: Monthly OPEX */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--lm-text-secondary)]">Monthly Operating Burn (OPEX):</span>
                  <strong className="text-white">{formatCurrency(modelState.monthlyOpex, modelState.currency)}</strong>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="300000"
                  step="5000"
                  value={modelState.monthlyOpex}
                  onChange={(e) => setModelState((p) => ({ ...p, monthlyOpex: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Slider 4: Monthly Churn */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--lm-text-secondary)]">Monthly Churn Rate:</span>
                  <strong className={modelState.churnRatePercent > 3 ? 'text-rose-400' : 'text-emerald-400'}>
                    {modelState.churnRatePercent}%
                  </strong>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="8"
                  step="0.1"
                  value={modelState.churnRatePercent}
                  onChange={(e) => setModelState((p) => ({ ...p, churnRatePercent: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3-Statement Summary Table Preview (Months 1-12) */}
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Month-by-Month Projected Cashflow &amp; Runway Trajectory</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  First 12 Months
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[var(--lm-text-tertiary)] uppercase text-[10px]">
                    <th className="p-2.5">Timeline</th>
                    <th className="p-2.5">Topline Revenue</th>
                    <th className="p-2.5">Gross Profit</th>
                    <th className="p-2.5">OPEX Burn</th>
                    <th className="p-2.5">Debt Service (Bank)</th>
                    <th className="p-2.5 text-cyan-400">Treasury Yield</th>
                    <th className="p-2.5">Net EBITDA</th>
                    <th className="p-2.5 text-right">Ending Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projections.timeline.slice(0, 12).map((pt) => (
                    <tr key={pt.month} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-2.5 font-bold text-white">Month {pt.month}</td>
                      <td className="p-2.5 text-slate-200">{formatCurrency(pt.revenue, modelState.currency)}</td>
                      <td className="p-2.5 text-emerald-400">{formatCurrency(pt.grossProfit, modelState.currency)}</td>
                      <td className="p-2.5 text-slate-400">-{formatCurrency(pt.opex, modelState.currency)}</td>
                      <td className="p-2.5 text-rose-400">-{formatCurrency(pt.loanDebtService, modelState.currency)}</td>
                      <td className="p-2.5 text-cyan-400">+{formatCurrency(pt.treasuryInterest, modelState.currency)}</td>
                      <td className={`p-2.5 font-bold ${pt.netEbitda >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {formatCurrency(pt.netEbitda, modelState.currency)}
                      </td>
                      <td className={`p-2.5 text-right font-bold ${pt.cashBalance <= 0 ? 'text-rose-400' : 'text-white'}`}>
                        {formatCurrency(pt.cashBalance, modelState.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BANK LOANS & TREASURY YIELD */}
      {activeTab === 'banking' && (
        <div className="space-y-6">
          {/* Header Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-cyan-950/20 border border-emerald-500/25">
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <LandmarkIcon className="w-4 h-4 text-emerald-400" />
                <span>Commercial Bank Debt, Venture Credit &amp; Treasury Yield Optimization</span>
              </div>
              <div className="text-xs text-[var(--lm-text-tertiary)] mt-0.5">
                Model term loans, SBA guarantees, revenue-based financing (RBF), and earn passive APY on unspent runway capital.
              </div>
            </div>
            <button
              onClick={() => setNewLoanModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Loan Facility</span>
            </button>
          </div>

          {/* Active Bank Facilities Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-[var(--lm-text-tertiary)] tracking-wider">
              Active Commercial Credit &amp; Debt Facilities ({modelState.loans.length})
            </h3>
            
            {modelState.loans.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center text-xs text-slate-400 space-y-2">
                <LandmarkIcon className="w-8 h-8 text-slate-500 mx-auto" />
                <div>No debt or loan facilities active in this venture model.</div>
                <button
                  onClick={() => setNewLoanModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-xs"
                >
                  Configure First Bank Loan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modelState.loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-bold text-white text-sm">{loan.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {loan.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Principal</div>
                        <div className="text-white font-bold">{formatCurrency(loan.principal, modelState.currency)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Interest Rate</div>
                        <div className="text-emerald-400 font-bold">{loan.annualInterestRate}% APR</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Monthly EMI</div>
                        <div className="text-rose-400 font-bold">-{formatCurrency(loan.monthlyPayment, modelState.currency)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div>
                        Tenor: <strong className="text-slate-200">{loan.tenorMonths} Months</strong> • Total Interest: <span className="text-rose-400">{formatCurrency(loan.totalInterestPaid, modelState.currency)}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveLoan(loan.id)}
                        className="text-rose-400 hover:text-rose-300 text-xs underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Treasury Yield Optimizer Card */}
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">
                  Idle Cash Treasury Yield Optimizer (U.S. T-Bills / High-Yield Reserves)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                +{projections.runwayExtensionMonths.toFixed(1)} Months Runway Extended
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Annual APY Yield:</span>
                  <strong className="text-cyan-400">{modelState.treasury.annualYieldPercent}% APY</strong>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="6.5"
                  step="0.05"
                  value={modelState.treasury.annualYieldPercent}
                  onChange={(e) => setModelState((p) => ({
                    ...p,
                    treasury: { ...p.treasury, annualYieldPercent: parseFloat(e.target.value) }
                  }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cash Allocated to Treasury:</span>
                  <strong className="text-cyan-400">{modelState.treasury.allocationPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={modelState.treasury.allocationPercent}
                  onChange={(e) => setModelState((p) => ({
                    ...p,
                    treasury: { ...p.treasury, allocationPercent: parseInt(e.target.value) }
                  }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 uppercase">Passive Monthly Income</div>
                <div className="text-lg font-bold text-cyan-400">
                  +{formatCurrency(projections.monthlyTreasuryIncome, modelState.currency)}/mo
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAP TABLE & DILUTION */}
      {activeTab === 'captable' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
                <span>Cap Table Ownership &amp; Dilution Waterfall</span>
              </h3>
              <span className="text-xs font-mono text-[var(--lm-text-tertiary)]">
                Target Valuation: <strong className="text-emerald-400">{formatCurrency(modelState.targetValuation, modelState.currency)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[var(--lm-text-tertiary)] uppercase text-[10px]">
                    <th className="p-2.5">Stakeholder</th>
                    <th className="p-2.5">Class / Role</th>
                    <th className="p-2.5">Round Sourced</th>
                    <th className="p-2.5">Invested Capital</th>
                    <th className="p-2.5">Share Count</th>
                    <th className="p-2.5 text-right">Ownership Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {modelState.capTable.map((holder) => (
                    <tr key={holder.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-white">{holder.name}</td>
                      <td className="p-2.5 text-slate-400">{holder.role}</td>
                      <td className="p-2.5 text-emerald-400">{holder.round}</td>
                      <td className="p-2.5 text-slate-300">{formatCurrency(holder.investmentAmount, modelState.currency)}</td>
                      <td className="p-2.5 text-slate-400">{holder.shares.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">{holder.ownershipPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOGISTICS & SUPPLY CHAIN ECONOMICS */}
      {activeTab === 'logistics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Unit BOM / Compute Cost</div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {formatCurrency(modelState.logistics.bomUnitCost, modelState.currency)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Fulfillment &amp; Shipping</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {formatCurrency(modelState.logistics.fulfillmentCostPerUnit + modelState.logistics.shippingCostPerUnit, modelState.currency)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Cash Conversion Cycle</div>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                {modelState.logistics.cashConversionCycleDays} Days
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Safety Stock Recommendation</div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {modelState.logistics.safetyStockUnits.toLocaleString()} Units
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MONTE CARLO & RISK MATRIX */}
      {activeTab === 'montecarlo' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-cyan-400" />
                  <span>1,000-Iteration Probabilistic Monte Carlo Simulation</span>
                </h3>
                <p className="text-xs text-[var(--lm-text-tertiary)] mt-0.5">
                  Gaussian random walk stress-testing growth volatility, churn variance, and bank interest shocks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  {monteCarloRuns.probabilityOfSurvivalPercent}% Probability of Survival
                </span>
              </div>
            </div>

            {/* Percentile Trajectory Cones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30">
                <div className="text-xs font-bold text-rose-400 uppercase font-mono">P10 Bear Case (Worst 10%)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(monteCarloRuns.p10Revenue[monteCarloRuns.p10Revenue.length - 1] || 0, modelState.currency)}/mo
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cash Insolvency: {monteCarloRuns.zeroCashMonthP10 ? `Month ${monteCarloRuns.zeroCashMonthP10}` : 'Survives Horizon'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-400 uppercase font-mono">P50 Base Case (Median)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(monteCarloRuns.p50Revenue[monteCarloRuns.p50Revenue.length - 1] || 0, modelState.currency)}/mo
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cash Insolvency: {monteCarloRuns.zeroCashMonthP50 ? `Month ${monteCarloRuns.zeroCashMonthP50}` : 'Survives Horizon'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30">
                <div className="text-xs font-bold text-cyan-400 uppercase font-mono">P90 Bull Case (Top 10%)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(monteCarloRuns.p90Revenue[monteCarloRuns.p90Revenue.length - 1] || 0, modelState.currency)}/mo
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cash Insolvency: {monteCarloRuns.zeroCashMonthP90 ? `Month ${monteCarloRuns.zeroCashMonthP90}` : 'Survives Horizon'}
                </div>
              </div>
            </div>
          </div>

          {/* Sensitivity Tornado Chart */}
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-3">
            <h3 className="text-sm font-bold text-white">
              Sensitivity Tornado Analysis (Valuation Impact per Lever)
            </h3>
            <div className="space-y-2.5 pt-2">
              {sensitivityTornado.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">{item.variableName} ({item.baseValue}{item.unit})</span>
                    <span className="text-emerald-400">+{formatCurrency(item.upsideImpactOnValuation, modelState.currency)} / -{formatCurrency(Math.abs(item.downsideImpactOnValuation), modelState.currency)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex">
                    <div className="bg-rose-500 h-full" style={{ width: '45%' }} />
                    <div className="bg-emerald-500 h-full" style={{ width: '55%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RETURNS & VALUATION */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2">
              <div className="text-xs font-mono text-slate-500 uppercase">Discounted Cash Flow (DCF NPV)</div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {formatCurrency(projections.npv, modelState.currency)}
              </div>
              <div className="text-xs text-slate-400">Discounted at 12% WACC</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2">
              <div className="text-xs font-mono text-slate-500 uppercase">Internal Rate of Return (IRR)</div>
              <div className="text-2xl font-extrabold text-cyan-400 font-mono">
                {projections.irrPercent}%
              </div>
              <div className="text-xs text-slate-400">Compound Annualized Return</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2">
              <div className="text-xs font-mono text-slate-500 uppercase">Multiple on Invested Capital (MOIC)</div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {(projections.exitValuation / Math.max(1, modelState.initialCash)).toFixed(1)}x
              </div>
              <div className="text-xs text-slate-400">Venture Fund Returner Benchmark</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SURVIVAL INDEX & FAILURE MODE DIAGNOSTICS */}
      {activeTab === 'survival' && (
        <div className="space-y-6">
          {/* Survival Score Header */}
          <div className="p-6 rounded-2xl bg-[var(--lm-bg-secondary)] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {survivalIndex.score}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Grade {survivalIndex.grade}
                </span>
                <span className="text-sm font-bold text-white">Lumetric Venture Survival Rating™</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                {survivalIndex.summary}
              </p>
            </div>
          </div>

          {/* 7 Startup Failure Mode Diagnostics */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-[var(--lm-text-tertiary)] tracking-wider">
              Startup Failure Mode Diagnostic Matrix (7 Classic Killers)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {failureModes.map((fm) => (
                <div
                  key={fm.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    fm.isTriggered
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)] opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${fm.isTriggered ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                      <span>{fm.name}</span>
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                      fm.isTriggered ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {fm.isTriggered ? 'Alert Active' : 'Clear'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 mt-2">
                    Observed: <strong className="text-white font-mono">{fm.metricObserved}</strong> (Benchmark: {fm.threshold})
                  </div>

                  {fm.isTriggered && (
                    <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-[11px] text-rose-200/90 leading-relaxed">
                      💡 <strong>Prescriptive Playbook:</strong> {fm.playbookMitigation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD BANK LOAN FACILITY */}
      {newLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--lm-bg-secondary)] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <LandmarkIcon className="w-5 h-5 text-emerald-400" />
                <span>Configure Commercial Bank Loan</span>
              </h3>
              <button onClick={() => setNewLoanModalOpen(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLoan} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-400">Facility / Loan Name</label>
                <input
                  type="text"
                  value={newLoanName}
                  onChange={(e) => setNewLoanName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Loan Type</label>
                <select
                  value={newLoanType}
                  onChange={(e) => setNewLoanType(e.target.value as BankLoanType)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="term_loan">Commercial Bank Term Loan</option>
                  <option value="sba_loan">SBA 7(a) Federal Guarantee Loan</option>
                  <option value="venture_debt">Venture Debt Facility</option>
                  <option value="credit_line">Revolving Line of Credit</option>
                  <option value="rbf">Revenue-Based Financing (RBF)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Principal Amount ($)</label>
                  <input
                    type="number"
                    value={newLoanPrincipal}
                    onChange={(e) => setNewLoanPrincipal(parseInt(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLoanRate}
                    onChange={(e) => setNewLoanRate(parseFloat(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Tenor (Months)</label>
                <input
                  type="number"
                  value={newLoanTenor}
                  onChange={(e) => setNewLoanTenor(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewLoanModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold"
                >
                  Confirm &amp; Add Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
