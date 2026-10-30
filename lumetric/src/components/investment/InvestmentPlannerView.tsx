'use client';

import React, { useState, useMemo } from 'react';
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
  PlusIcon,
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
  const [newLoanPrincipal, setNewLoanPrincipal] = useState(50000);
  const [newLoanRate, setNewLoanRate] = useState(8.0);
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
    }, 200);
  };

  // Projections
  const projections = useMemo(() => calculateMonthlyProjections(modelState), [modelState]);
  
  // Real Net Burn Month 1
  const month1NetBurn = useMemo(() => {
    const pt = projections.timeline[0];
    return pt ? pt.netBurn : (modelState.monthlyOpex - modelState.monthlyRevenue * 0.7);
  }, [projections, modelState]);

  // Current DSCR
  const currentMonthlyEbitda = Math.max(1, (modelState.monthlyRevenue * modelState.grossMarginPercent / 100) - modelState.monthlyOpex);
  const currentDscr = useMemo(() => {
    return calculateDebtServiceCoverageRatio(currentMonthlyEbitda, projections.totalLoansMonthlyPayment);
  }, [currentMonthlyEbitda, projections.totalLoansMonthlyPayment]);

  // Survival Index
  const survivalIndex = useMemo(() => {
    return calculateVentureSurvivalIndex(modelState, projections.runwayMonths, currentDscr);
  }, [modelState, projections.runwayMonths, currentDscr]);

  // Failure Modes
  const failureModes = useMemo(() => {
    return evaluateStartupFailureModes(modelState, projections.runwayMonths, currentDscr);
  }, [modelState, projections.runwayMonths, currentDscr]);

  // Sensitivity Tornado
  const sensitivityTornado = useMemo(() => {
    return calculateSensitivityTornado(modelState);
  }, [modelState]);

  // Total debt principal
  const totalDebtPrincipal = useMemo(() => {
    return modelState.loans.reduce((acc, l) => acc + (l.status === 'active' ? l.principal : 0), 0);
  }, [modelState.loans]);

  // Add loan handler
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
      initialCash: prev.initialCash + newLoanPrincipal,
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

  // Export JSON report
  const handleExportModel = () => {
    const reportData = {
      venture: modelState.ventureName,
      blueprint: activeBlueprintId,
      currency: modelState.currency,
      timestamp: new Date().toISOString(),
      startingCash: modelState.initialCash,
      monthlyRevenue: modelState.monthlyRevenue,
      monthlyOpex: modelState.monthlyOpex,
      monthlyNetBurn: month1NetBurn,
      runwayMonths: projections.runwayMonths,
      zeroCashMonth: projections.zeroCashMonth,
      breakevenMonth: projections.breakevenMonth,
      survivalScore: survivalIndex.score,
      grade: survivalIndex.grade,
      dscr: currentDscr,
      isBankable: currentDscr >= 1.25,
      targetExitValuation: projections.exitValuation,
      irrPercent: projections.irrPercent,
      loans: modelState.loans,
      projectionsSummary: projections.timeline.slice(0, 12),
      failureModes: failureModes.filter((f) => f.isTriggered),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelState.ventureName.toLowerCase().replace(/\s+/g, '_')}_financial_plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute zero cash date string for display
  const zeroCashDateText = useMemo(() => {
    if (projections.zeroCashMonth === null) {
      return projections.breakevenMonth !== null
        ? `Profitable at Month ${projections.breakevenMonth} (Self-Sustaining)`
        : 'Funded for full horizon';
    }
    const d = new Date();
    d.setMonth(d.getMonth() + projections.zeroCashMonth);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [projections]);

  return (
    <div className="flex-1 bg-[var(--lm-bg-primary)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full select-none animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER & STUDIO IDENTITY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <div className="flex items-center gap-3">
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
                  REAL-TIME v2.4
                </span>
              </div>
              <p className="text-xs text-[var(--lm-text-tertiary)] mt-0.5">
                Model real cashflow, runway burn-down, bank loans &amp; debt covenants, logistics, and startup survival.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Toggle */}
          <div className="flex items-center p-1 bg-[var(--lm-bg-secondary)] rounded-xl border border-[var(--lm-border-default)] text-xs font-mono font-bold">
            {(['USD', 'INR', 'EUR', 'GBP'] as CurrencyCode[]).map((cur) => (
              <button
                key={cur}
                onClick={() => setModelState((p) => ({ ...p, currency: cur }))}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
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
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  modelState.timeHorizonMonths === h
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                {h}M
              </button>
            ))}
          </div>

          {/* Run Monte Carlo */}
          <button
            onClick={handleTriggerMonteCarlo}
            disabled={isSimulatingMonteCarlo}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs font-bold border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <SparklesIcon className={`w-3.5 h-3.5 ${isSimulatingMonteCarlo ? 'animate-spin' : ''}`} />
            <span>{isSimulatingMonteCarlo ? 'Simulating...' : '1k Monte Carlo'}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportModel}
            className="px-3 py-1.5 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-slate-800 text-[var(--lm-text-primary)] text-xs font-semibold border border-[var(--lm-border-default)] transition-all cursor-pointer"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* 2. INDUSTRY BLUEPRINT SELECTOR */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--lm-text-tertiary)] flex items-center justify-between">
          <span>Choose a Realistic Business Stage Archetype</span>
          <span className="text-emerald-400 font-bold">Selected: {INDUSTRY_BLUEPRINTS[activeBlueprintId].name}</span>
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
                    ? 'bg-emerald-500/12 border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/50'
                    : 'bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)] hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-[var(--lm-text-primary)] truncate mb-1">
                    {bp.name}
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-block truncate max-w-full">
                    {bp.badge}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--lm-text-tertiary)] line-clamp-1 mt-1 font-mono">
                  {formatCurrency(bp.defaults.initialCash, bp.defaults.currency)} Cash • {formatCurrency(bp.defaults.monthlyRevenue, bp.defaults.currency)}/mo
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. HERO EXECUTIVE KPI STRIP (REALISTIC, ACTIONABLE METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Starting Cash */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Starting Cash in Bank
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1">
            {formatCurrency(modelState.initialCash, modelState.currency)}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-mono">
            +{formatCurrency(totalDebtPrincipal, modelState.currency)} Bank Debt
          </div>
        </div>

        {/* KPI 2: Monthly Net Burn */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Current Net Burn
          </div>
          <div className={`text-xl font-extrabold font-mono mt-1 ${month1NetBurn > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {month1NetBurn > 0 ? `-${formatCurrency(month1NetBurn, modelState.currency)}` : `+${formatCurrency(Math.abs(month1NetBurn), modelState.currency)}`}
            <span className="text-xs font-normal text-slate-400">/mo</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            OPEX: {formatCurrency(modelState.monthlyOpex, modelState.currency)}
          </div>
        </div>

        {/* KPI 3: Actual Runway & Zero Cash Date */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Actual Cash Runway
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1 flex items-baseline gap-1.5">
            <span className={projections.runwayMonths < 9 ? 'text-amber-400' : 'text-emerald-400'}>
              {projections.runwayMonths > 60 ? 'Self-Sustaining' : `${projections.runwayMonths.toFixed(1)}m`}
            </span>
          </div>
          <div className="text-[10px] text-cyan-400 mt-1 font-mono truncate">
            {zeroCashDateText}
          </div>
        </div>

        {/* KPI 4: Breakeven Month */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Breakeven Month
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1">
            {projections.breakevenMonth ? `Month ${projections.breakevenMonth}` : 'Past 36m'}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-mono">
            Gross Margin: {modelState.grossMarginPercent}%
          </div>
        </div>

        {/* KPI 5: Bank DSCR Health */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            Bank Health (DSCR)
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1 flex items-baseline gap-1.5">
            <span>{currentDscr > 20 ? '5.0+' : currentDscr.toFixed(2)}x</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
              currentDscr >= 1.25 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {currentDscr >= 1.25 ? 'Approved' : 'Alert'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            EMI: {formatCurrency(projections.totalLoansMonthlyPayment, modelState.currency)}/mo
          </div>
        </div>

        {/* KPI 6: Target Exit Valuation */}
        <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[var(--lm-text-tertiary)] tracking-wider">
            3-Year Valuation
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
            {formatCurrency(projections.exitValuation, modelState.currency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            {modelState.exitMultipleARR}x ARR Multiple
          </div>
        </div>
      </div>

      {/* 4. QUICK BUSINESS SETUP / FOUNDER DIRECT INPUT CARD */}
      <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-emerald-500/25 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">
              Your Business Financial Inputs (Directly Edit Any Field)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectBlueprint(activeBlueprintId)}
              className="px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Reset to Preset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Starting Cash</label>
            <input
              type="number"
              step="5000"
              value={modelState.initialCash}
              onChange={(e) => setModelState((p) => ({ ...p, initialCash: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Monthly Revenue</label>
            <input
              type="number"
              step="1000"
              value={modelState.monthlyRevenue}
              onChange={(e) => setModelState((p) => ({ ...p, monthlyRevenue: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Monthly OPEX (Burn)</label>
            <input
              type="number"
              step="1000"
              value={modelState.monthlyOpex}
              onChange={(e) => setModelState((p) => ({ ...p, monthlyOpex: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-rose-300 font-bold text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Growth % / Month</label>
            <input
              type="number"
              step="0.5"
              value={modelState.monthlyGrowthRatePercent}
              onChange={(e) => setModelState((p) => ({ ...p, monthlyGrowthRatePercent: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Gross Margin %</label>
            <input
              type="number"
              step="1"
              max="99"
              value={modelState.grossMarginPercent}
              onChange={(e) => setModelState((p) => ({ ...p, grossMarginPercent: Math.min(99, Math.max(5, parseInt(e.target.value) || 50)) }))}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Exit Multiple (ARR)</label>
            <input
              type="number"
              step="0.5"
              value={modelState.exitMultipleARR}
              onChange={(e) => setModelState((p) => ({ ...p, exitMultipleARR: parseFloat(e.target.value) || 6.0 }))}
              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-sm"
            />
          </div>
        </div>
      </div>

      {/* 5. VISUAL CASHFLOW & RUNWAY BURN-DOWN AREA CHART (SVG) */}
      <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3Icon className="w-4 h-4 text-emerald-400" />
              <span>Cash Balance &amp; Compounding Revenue Trajectory</span>
            </h3>
            <p className="text-xs text-[var(--lm-text-tertiary)] mt-0.5">
              Visualizes the runway burn curve (green area) against monthly revenue expansion over {modelState.timeHorizonMonths} months.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400" />
              <span className="text-slate-300">Remaining Cash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 rounded" />
              <span className="text-slate-300">Monthly Revenue</span>
            </div>
          </div>
        </div>

        {/* SVG Area Chart */}
        <div className="w-full h-52 relative flex items-center justify-center">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="cashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="40" y1="20" x2="780" y2="20" stroke="#1E293B" strokeDasharray="3,3" />
            <line x1="40" y1="80" x2="780" y2="80" stroke="#1E293B" strokeDasharray="3,3" />
            <line x1="40" y1="140" x2="780" y2="140" stroke="#1E293B" strokeDasharray="3,3" />
            <line x1="40" y1="180" x2="780" y2="180" stroke="#334155" strokeWidth="1.5" />

            {/* Cash Trajectory Path */}
            {(() => {
              const pts = projections.timeline;
              if (pts.length === 0) return null;
              const maxCash = Math.max(...pts.map((p) => p.cashBalance), modelState.initialCash * 1.2);
              const minCash = Math.min(0, ...pts.map((p) => p.cashBalance));
              const range = Math.max(1, maxCash - minCash);

              const coords = pts.map((pt, idx) => {
                const x = 40 + (idx / (pts.length - 1)) * 740;
                const normalized = (pt.cashBalance - minCash) / range;
                const y = 175 - normalized * 155;
                return { x, y, pt };
              });

              const pathD = coords.reduce((acc, c, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`, '');
              const areaD = `${pathD} L ${coords[coords.length - 1].x},180 L 40,180 Z`;

              return (
                <g>
                  <path d={areaD} fill="url(#cashAreaGrad)" />
                  <path d={pathD} fill="none" stroke="#10B981" strokeWidth="2.5" />
                  {/* Zero cash milestone or breakeven dot */}
                  {coords.map((c) => {
                    if (c.pt.month === projections.breakevenMonth) {
                      return (
                        <g key={c.pt.month} transform={`translate(${c.x}, ${c.y})`}>
                          <circle r="6" fill="#10B981" className="animate-ping opacity-75" />
                          <circle r="4" fill="#FFFFFF" stroke="#059669" strokeWidth="2" />
                          <text x="0" y="-12" textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="bold">
                            Breakeven (M{c.pt.month})
                          </text>
                        </g>
                      );
                    }
                    if (c.pt.month === projections.zeroCashMonth) {
                      return (
                        <g key={c.pt.month} transform={`translate(${c.x}, ${c.y})`}>
                          <circle r="6" fill="#F43F5E" className="animate-ping opacity-75" />
                          <circle r="4" fill="#FFFFFF" stroke="#E11D48" strokeWidth="2" />
                          <text x="0" y="-12" textAnchor="middle" fill="#FDA4AF" fontSize="10" fontWeight="bold">
                            Zero Cash (M{c.pt.month})
                          </text>
                        </g>
                      );
                    }
                    return null;
                  })}
                </g>
              );
            })()}

            {/* Baseline labels */}
            <text x="40" y="196" fill="#64748B" fontSize="9" fontFamily="monospace">Month 1</text>
            <text x="400" y="196" fill="#64748B" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Month {Math.round(modelState.timeHorizonMonths / 2)}
            </text>
            <text x="780" y="196" fill="#64748B" fontSize="9" fontFamily="monospace" textAnchor="end">
              Month {modelState.timeHorizonMonths}
            </text>
          </svg>
        </div>
      </div>

      {/* 6. NAVIGATION TABS */}
      <div className="border-b border-[var(--lm-border-default)]">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2 scrollbar-none text-xs font-semibold">
          {[
            { id: 'overview', label: '12-Month P&L Statement', icon: BarChart3Icon },
            { id: 'banking', label: 'Bank Debt & Loans', icon: LandmarkIcon },
            { id: 'captable', label: 'Cap Table & Dilution', icon: PieChartIcon },
            { id: 'logistics', label: 'Logistics & Working Capital', icon: FileSpreadsheetIcon },
            { id: 'montecarlo', label: 'Monte Carlo Simulation', icon: SparklesIcon },
            { id: 'valuation', label: 'Valuation & Returns', icon: TrendingUpIcon },
            { id: 'survival', label: 'Survival Rating & Failures', icon: ShieldIcon },
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

      {/* TAB 1: 12-MONTH P&L STATEMENT */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Month-by-Month Statement (Income, Expenses, Debt &amp; Cash)</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">
                Breakeven Target: {projections.breakevenMonth ? `Month ${projections.breakevenMonth}` : 'Past Horizon'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[var(--lm-text-tertiary)] uppercase text-[10px]">
                    <th className="p-2.5">Period</th>
                    <th className="p-2.5">Revenue</th>
                    <th className="p-2.5">Gross Profit</th>
                    <th className="p-2.5">OPEX Burn</th>
                    <th className="p-2.5">Bank Loan EMI</th>
                    <th className="p-2.5 text-cyan-400">Treasury Yield</th>
                    <th className="p-2.5">Net P&amp;L</th>
                    <th className="p-2.5 text-right">Cash in Bank</th>
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

      {/* TAB 2: BANK DEBT & LOANS */}
      {activeTab === 'banking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-cyan-950/20 border border-emerald-500/25">
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <LandmarkIcon className="w-4 h-4 text-emerald-400" />
                <span>Commercial Bank Loans, SBA Debt &amp; Credit Facilities</span>
              </div>
              <div className="text-xs text-[var(--lm-text-tertiary)] mt-0.5">
                Calculate amortizing principal, interest deductions, monthly EMI, and DSCR bank coverage.
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
                    <div className="text-[10px] text-slate-500 uppercase">Interest (APR)</div>
                    <div className="text-emerald-400 font-bold">{loan.annualInterestRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Monthly Payment</div>
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
        </div>
      )}

      {/* TAB 3: CAP TABLE */}
      {activeTab === 'captable' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" />
              <span>Cap Table Equity Distribution &amp; Ownership</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[var(--lm-text-tertiary)] uppercase text-[10px]">
                    <th className="p-2.5">Stakeholder</th>
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">Round</th>
                    <th className="p-2.5">Capital Invested</th>
                    <th className="p-2.5">Shares</th>
                    <th className="p-2.5 text-right">Ownership</th>
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

      {/* TAB 4: LOGISTICS & WORKING CAPITAL */}
      {activeTab === 'logistics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Unit BOM Cost</div>
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
              <div className="text-[10px] font-mono text-slate-500 uppercase">Safety Stock Units</div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {modelState.logistics.safetyStockUnits.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MONTE CARLO */}
      {activeTab === 'montecarlo' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-cyan-400" />
                  <span>1,000-Iteration Probabilistic Simulation</span>
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                {monteCarloRuns.probabilityOfSurvivalPercent}% Probability of Survival
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30">
                <div className="text-xs font-bold text-rose-400 uppercase font-mono">P10 Bear Case (Pessimistic)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(monteCarloRuns.p10Revenue[monteCarloRuns.p10Revenue.length - 1] || 0, modelState.currency)}/mo
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Zero Cash: {monteCarloRuns.zeroCashMonthP10 ? `Month ${monteCarloRuns.zeroCashMonthP10}` : 'Survives'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-400 uppercase font-mono">P50 Base Case (Median)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(monteCarloRuns.p50Revenue[monteCarloRuns.p50Revenue.length - 1] || 0, modelState.currency)}/mo
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Zero Cash: {monteCarloRuns.zeroCashMonthP50 ? `Month ${monteCarloRuns.zeroCashMonthP50}` : 'Survives'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30">
                <div className="text-xs font-bold text-cyan-400 uppercase font-mono">P90 Bull Case (Optimistic)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatCurrency(monteCarloRuns.p90Revenue[monteCarloRuns.p90Revenue.length - 1] || 0, modelState.currency)}/mo
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Zero Cash: {monteCarloRuns.zeroCashMonthP90 ? `Month ${monteCarloRuns.zeroCashMonthP90}` : 'Survives'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: VALUATION */}
      {activeTab === 'valuation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2">
            <div className="text-xs font-mono text-slate-500 uppercase">DCF Net Present Value (NPV)</div>
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
            <div className="text-xs text-slate-400">Exit Multiple Benchmark</div>
          </div>
        </div>
      )}

      {/* TAB 7: SURVIVAL RATING & FAILURES */}
      {activeTab === 'survival' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[var(--lm-bg-secondary)] border border-emerald-500/30 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {survivalIndex.score}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Grade {survivalIndex.grade}
                </span>
                <span className="text-sm font-bold text-white">Venture Survival Rating™</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                {survivalIndex.summary}
              </p>
            </div>
          </div>

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
                    {fm.isTriggered ? 'Alert' : 'OK'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-2">
                  Observed: <strong className="text-white font-mono">{fm.metricObserved}</strong> (Target: {fm.threshold})
                </div>
                {fm.isTriggered && (
                  <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-[11px] text-rose-200/90 leading-relaxed">
                    💡 {fm.playbookMitigation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD BANK LOAN */}
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
                    onChange={(e) => setNewLoanPrincipal(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Interest (APR %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLoanRate}
                    onChange={(e) => setNewLoanRate(parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => setNewLoanTenor(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewLoanModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold cursor-pointer"
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
