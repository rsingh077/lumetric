import {
  InvestmentPlanState,
  MonteCarloSimulationResult,
  SensitivityTornadoItem,
  VentureSurvivalIndex,
  FailureModeDiagnostic,
  CurrencyCode,
} from '@/types';

// Format Currency Utility
export function formatCurrency(amount: number, currency: CurrencyCode = 'USD', compact = true): string {
  const symbolMap: Record<CurrencyCode, string> = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
  };
  const sym = symbolMap[currency] || '$';

  if (!compact) {
    return `${sym}${Math.round(amount).toLocaleString()}`;
  }

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${sym}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${sym}${(abs / 1_000).toFixed(1)}k`;
  }
  return `${sign}${sym}${Math.round(abs).toLocaleString()}`;
}

// 1. BANK LOAN AMORTIZATION & DEBT SERVICE
export function calculateLoanMonthlyPayment(principal: number, annualRatePercent: number, tenorMonths: number): number {
  if (principal <= 0 || tenorMonths <= 0) return 0;
  if (annualRatePercent <= 0) return principal / tenorMonths;

  const monthlyRate = annualRatePercent / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, tenorMonths);
  const payment = (principal * (monthlyRate * factor)) / (factor - 1);
  return Math.round(payment * 100) / 100;
}

export function calculateDebtServiceCoverageRatio(monthlyEbitda: number, monthlyDebtService: number): number {
  if (monthlyDebtService <= 0) return 99.9; // No debt = infinite coverage
  const dscr = (monthlyEbitda * 12) / (monthlyDebtService * 12);
  return Math.max(0, Math.round(dscr * 100) / 100);
}

// 2. TREASURY YIELD OPTIMIZER (T-Bills & Money Market)
export function calculateTreasuryYield(cashBalance: number, allocationPercent: number, annualYieldPercent: number) {
  const allocatedPrincipal = Math.max(0, cashBalance * (allocationPercent / 100));
  const annualInterest = allocatedPrincipal * (annualYieldPercent / 100);
  const monthlyInterest = annualInterest / 12;
  return {
    allocatedPrincipal,
    annualInterest,
    monthlyInterest: Math.round(monthlyInterest),
  };
}

// 3. MONTH-BY-MONTH FINANCIAL SIMULATION
export interface MonthlyProjectionPoint {
  month: number;
  revenue: number;
  grossProfit: number;
  opex: number;
  loanDebtService: number;
  treasuryInterest: number;
  netEbitda: number;
  netBurn: number;
  cashBalance: number;
  cumulativeRevenue: number;
}

export function calculateMonthlyProjections(state: InvestmentPlanState): {
  timeline: MonthlyProjectionPoint[];
  runwayMonths: number;
  zeroCashMonth: number | null;
  breakevenMonth: number | null;
  totalLoansMonthlyPayment: number;
  annualDebtService: number;
  monthlyTreasuryIncome: number;
  runwayExtensionMonths: number;
  exitValuation: number;
  irrPercent: number;
  npv: number;
} {
  const timeline: MonthlyProjectionPoint[] = [];
  let currentCash = state.initialCash;
  let zeroCashMonth: number | null = null;
  let breakevenMonth: number | null = null;
  let cumulativeRevenue = 0;
  let currentRevenue = state.monthlyRevenue;

  // Total monthly bank debt service from all active loans
  const totalLoansMonthlyPayment = state.loans.reduce((acc, l) => acc + (l.status === 'active' ? l.monthlyPayment : 0), 0);
  const annualDebtService = totalLoansMonthlyPayment * 12;

  // Monthly Treasury yield on unspent cash
  const treasuryCalc = calculateTreasuryYield(state.initialCash, state.treasury.allocationPercent, state.treasury.annualYieldPercent);
  const monthlyTreasuryIncome = treasuryCalc.monthlyInterest;

  for (let m = 1; m <= state.timeHorizonMonths; m++) {
    // Growth rate realistic decay (tapers smoothly from early-stage initial growth toward steady-state 2.0%/mo)
    const currentGrowthRate = Math.max(0.02, (state.monthlyGrowthRatePercent / 100) * Math.pow(0.985, m - 1));
    if (m > 1) {
      currentRevenue = currentRevenue * (1 + currentGrowthRate);
    }
    cumulativeRevenue += currentRevenue;

    // Gross profit
    const grossProfit = currentRevenue * (state.grossMarginPercent / 100);

    // Realistic OPEX scaling (Base fixed OPEX + 18% variable reinvestment on revenue growth)
    const incrementalRev = Math.max(0, currentRevenue - state.monthlyRevenue);
    const opex = state.monthlyOpex * Math.pow(1.008, m - 1) + (incrementalRev * 0.18);

    // Dynamic Treasury yield on current remaining cash
    const currentTreasuryYield = calculateTreasuryYield(Math.max(0, currentCash), state.treasury.allocationPercent, state.treasury.annualYieldPercent).monthlyInterest;

    // Net operating EBITDA
    const netEbitda = grossProfit - opex;

    // Total debt service
    const loanDebt = totalLoansMonthlyPayment;

    // Net Burn (Cash drained from bank account)
    const netBurn = (opex + loanDebt) - (grossProfit + currentTreasuryYield);

    currentCash -= netBurn;

    // Check Breakeven Point (Gross profit exceeds OPEX + Debt service)
    if (grossProfit >= (opex + loanDebt) && breakevenMonth === null) {
      breakevenMonth = m;
    }

    if (currentCash <= 0 && zeroCashMonth === null) {
      zeroCashMonth = m;
    }

    timeline.push({
      month: m,
      revenue: Math.round(currentRevenue),
      grossProfit: Math.round(grossProfit),
      opex: Math.round(opex),
      loanDebtService: Math.round(loanDebt),
      treasuryInterest: Math.round(currentTreasuryYield),
      netEbitda: Math.round(netEbitda),
      netBurn: Math.round(netBurn),
      cashBalance: Math.round(currentCash),
      cumulativeRevenue: Math.round(cumulativeRevenue),
    });
  }

  // Runway calculation
  const initialNetBurn = Math.max(1, state.monthlyOpex + totalLoansMonthlyPayment - (state.monthlyRevenue * state.grossMarginPercent / 100) - monthlyTreasuryIncome);
  const baseRunwayMonths = Math.round((state.initialCash / initialNetBurn) * 10) / 10;

  // Runway extension provided by treasury yield
  const burnWithoutTreasury = Math.max(1, state.monthlyOpex + totalLoansMonthlyPayment - (state.monthlyRevenue * state.grossMarginPercent / 100));
  const runwayWithoutTreasury = state.initialCash / burnWithoutTreasury;
  const runwayExtensionMonths = Math.max(0, Math.round((baseRunwayMonths - runwayWithoutTreasury) * 10) / 10);

  // Exact runway: If zeroCashMonth is reached, that's the exact runway. If breakeven is reached before zero cash, it's self-sustaining.
  const effectiveRunway = zeroCashMonth !== null
    ? zeroCashMonth
    : (breakevenMonth !== null ? 99.9 : baseRunwayMonths);

  // Exit Valuation at end of horizon based on ending annualized ARR multiple (capped realistically)
  const endingMonthlyRevenue = timeline[timeline.length - 1]?.revenue || state.monthlyRevenue;
  const endingARR = endingMonthlyRevenue * 12;
  const exitValuation = Math.round(endingARR * state.exitMultipleARR);

  // IRR & NPV calculation (Discount rate = 12% annual = 1.0% monthly)
  const discountRateMonthly = 0.12 / 12;
  let npv = -state.initialCash;
  for (let m = 0; m < timeline.length; m++) {
    const cf = timeline[m].netEbitda;
    npv += cf / Math.pow(1 + discountRateMonthly, m + 1);
  }
  // Add terminal value discounted to present
  npv += exitValuation / Math.pow(1 + discountRateMonthly, state.timeHorizonMonths);

  // Approximate IRR
  const totalReturnMultiple = (exitValuation + Math.max(0, currentCash)) / Math.max(1, state.initialCash);
  const horizonYears = state.timeHorizonMonths / 12;
  const irrPercent = Math.round((Math.pow(totalReturnMultiple, 1 / horizonYears) - 1) * 100 * 10) / 10;

  return {
    timeline,
    runwayMonths: effectiveRunway,
    zeroCashMonth,
    breakevenMonth,
    totalLoansMonthlyPayment,
    annualDebtService,
    monthlyTreasuryIncome,
    runwayExtensionMonths,
    exitValuation,
    irrPercent: Math.max(-100, Math.min(500, irrPercent)),
    npv: Math.round(npv),
  };
}

// 4. IN-BROWSER MONTE CARLO SIMULATION (1,000 Iterations)
// Uses Box-Muller Gaussian transform for true random walk variance
function boxMullerRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarloSimulation(state: InvestmentPlanState, iterations = 1000): MonteCarloSimulationResult {
  const horizon = state.timeHorizonMonths;
  const monthlyRevenueRuns: number[][] = Array.from({ length: horizon }, () => []);
  const monthlyCashRuns: number[][] = Array.from({ length: horizon }, () => []);
  let survivedRuns = 0;

  const totalLoansMonthlyPayment = state.loans.reduce((acc, l) => acc + (l.status === 'active' ? l.monthlyPayment : 0), 0);
  const monthlyGrowthMean = state.monthlyGrowthRatePercent / 100;
  const churnMean = state.churnRatePercent / 100;

  for (let i = 0; i < iterations; i++) {
    let cash = state.initialCash;
    let rev = state.monthlyRevenue;
    let survived = true;

    for (let m = 0; m < horizon; m++) {
      // Gaussian shock to growth rate (std dev = 3.5%)
      const growthShock = monthlyGrowthMean + boxMullerRandom() * 0.035;
      // Gaussian shock to churn (std dev = 1.0%)
      const churnShock = Math.max(0, churnMean + boxMullerRandom() * 0.01);

      const netGrowth = Math.max(-0.2, growthShock - churnShock);
      rev = Math.max(1000, rev * (1 + netGrowth));

      const grossProfit = rev * (state.grossMarginPercent / 100);
      const opex = state.monthlyOpex * (1 + boxMullerRandom() * 0.02);
      const treasury = calculateTreasuryYield(Math.max(0, cash), state.treasury.allocationPercent, state.treasury.annualYieldPercent).monthlyInterest;

      const netBurn = opex + totalLoansMonthlyPayment - grossProfit - treasury;
      cash -= netBurn;

      if (cash <= 0) {
        survived = false;
      }

      monthlyRevenueRuns[m].push(Math.round(rev));
      monthlyCashRuns[m].push(Math.round(cash));
    }

    if (survived) survivedRuns++;
  }

  // Extract percentiles (P10 Bear, P50 Base, P90 Bull) for each month
  const p10Revenue: number[] = [];
  const p50Revenue: number[] = [];
  const p90Revenue: number[] = [];

  const p10Cash: number[] = [];
  const p50Cash: number[] = [];
  const p90Cash: number[] = [];

  for (let m = 0; m < horizon; m++) {
    const sortedRev = [...monthlyRevenueRuns[m]].sort((a, b) => a - b);
    const sortedCash = [...monthlyCashRuns[m]].sort((a, b) => a - b);

    p10Revenue.push(sortedRev[Math.floor(iterations * 0.1)]);
    p50Revenue.push(sortedRev[Math.floor(iterations * 0.5)]);
    p90Revenue.push(sortedRev[Math.floor(iterations * 0.9)]);

    p10Cash.push(sortedCash[Math.floor(iterations * 0.1)]);
    p50Cash.push(sortedCash[Math.floor(iterations * 0.5)]);
    p90Cash.push(sortedCash[Math.floor(iterations * 0.9)]);
  }

  // Find zero cash points
  const zeroCashMonthP10 = p10Cash.findIndex((c) => c <= 0);
  const zeroCashMonthP50 = p50Cash.findIndex((c) => c <= 0);
  const zeroCashMonthP90 = p90Cash.findIndex((c) => c <= 0);

  return {
    iterations,
    p10Revenue,
    p50Revenue,
    p90Revenue,
    p10Cash,
    p50Cash,
    p90Cash,
    probabilityOfSurvivalPercent: Math.round((survivedRuns / iterations) * 1000) / 10,
    zeroCashMonthP10: zeroCashMonthP10 !== -1 ? zeroCashMonthP10 + 1 : null,
    zeroCashMonthP50: zeroCashMonthP50 !== -1 ? zeroCashMonthP50 + 1 : null,
    zeroCashMonthP90: zeroCashMonthP90 !== -1 ? zeroCashMonthP90 + 1 : null,
  };
}

// 5. SENSITIVITY TORNADO MATRIX
export function calculateSensitivityTornado(state: InvestmentPlanState): SensitivityTornadoItem[] {
  const baseProjections = calculateMonthlyProjections(state);
  const baseValuation = baseProjections.exitValuation;

  const testVariable = (mutator: (st: InvestmentPlanState) => void): number => {
    const clone = JSON.parse(JSON.stringify(state)) as InvestmentPlanState;
    mutator(clone);
    return calculateMonthlyProjections(clone).exitValuation;
  };

  return [
    {
      id: 'sens_growth',
      variableName: 'Monthly Compound Growth',
      baseValue: state.monthlyGrowthRatePercent,
      unit: '%',
      downsideImpactOnValuation: testVariable((s) => (s.monthlyGrowthRatePercent *= 0.8)) - baseValuation,
      upsideImpactOnValuation: testVariable((s) => (s.monthlyGrowthRatePercent *= 1.2)) - baseValuation,
    },
    {
      id: 'sens_margin',
      variableName: 'Gross Margin Efficiency',
      baseValue: state.grossMarginPercent,
      unit: '%',
      downsideImpactOnValuation: testVariable((s) => (s.grossMarginPercent = Math.max(10, s.grossMarginPercent - 10))) - baseValuation,
      upsideImpactOnValuation: testVariable((s) => (s.grossMarginPercent = Math.min(95, s.grossMarginPercent + 10))) - baseValuation,
    },
    {
      id: 'sens_churn',
      variableName: 'Customer Churn Leakage',
      baseValue: state.churnRatePercent,
      unit: '%',
      downsideImpactOnValuation: testVariable((s) => (s.churnRatePercent *= 1.5)) - baseValuation,
      upsideImpactOnValuation: testVariable((s) => (s.churnRatePercent *= 0.5)) - baseValuation,
    },
    {
      id: 'sens_cac',
      variableName: 'Customer Acquisition Cost (CAC)',
      baseValue: state.cac,
      unit: '$',
      downsideImpactOnValuation: testVariable((s) => (s.monthlyOpex += (s.cac * 0.25 * (s.unitVolumeMonthly || 50)))) - baseValuation,
      upsideImpactOnValuation: testVariable((s) => (s.monthlyOpex -= (s.cac * 0.25 * (s.unitVolumeMonthly || 50)))) - baseValuation,
    },
    {
      id: 'sens_bank_rate',
      variableName: 'Bank Interest Rate (APR)',
      baseValue: state.loans[0]?.annualInterestRate || 8.5,
      unit: '%',
      downsideImpactOnValuation: testVariable((s) => {
        s.loans.forEach((l) => (l.monthlyPayment *= 1.15));
      }) - baseValuation,
      upsideImpactOnValuation: testVariable((s) => {
        s.loans.forEach((l) => (l.monthlyPayment *= 0.85));
      }) - baseValuation,
    },
    {
      id: 'sens_logistics',
      variableName: 'Freight & Shipping Costs',
      baseValue: state.logistics.shippingCostPerUnit,
      unit: '$/unit',
      downsideImpactOnValuation: testVariable((s) => (s.logistics.shippingCostPerUnit *= 1.3)) - baseValuation,
      upsideImpactOnValuation: testVariable((s) => (s.logistics.shippingCostPerUnit *= 0.7)) - baseValuation,
    },
  ];
}

// 6. VENTURE SURVIVAL INDEX™ (0-100 ALGORITHMIC SCORE)
export function calculateVentureSurvivalIndex(
  state: InvestmentPlanState,
  runwayMonths: number,
  dscr: number
): VentureSurvivalIndex {
  // 1. Runway Score (Max 25)
  let runwayScore = 0;
  if (runwayMonths >= 24) runwayScore = 25;
  else if (runwayMonths >= 18) runwayScore = 22;
  else if (runwayMonths >= 12) runwayScore = 17;
  else if (runwayMonths >= 8) runwayScore = 10;
  else if (runwayMonths >= 5) runwayScore = 5;
  else runwayScore = 0;

  // 2. Unit Economics LTV/CAC (Max 25)
  const ltvCacRatio = state.cac > 0 ? state.ltv / state.cac : 3.0;
  let unitEconomicsScore = 0;
  if (ltvCacRatio >= 5.0) unitEconomicsScore = 25;
  else if (ltvCacRatio >= 3.5) unitEconomicsScore = 21;
  else if (ltvCacRatio >= 2.5) unitEconomicsScore = 15;
  else if (ltvCacRatio >= 1.5) unitEconomicsScore = 8;
  else unitEconomicsScore = 2;

  // 3. Gross Margin Score (Max 20)
  let grossMarginScore = 0;
  if (state.grossMarginPercent >= 75) grossMarginScore = 20;
  else if (state.grossMarginPercent >= 60) grossMarginScore = 16;
  else if (state.grossMarginPercent >= 45) grossMarginScore = 12;
  else if (state.grossMarginPercent >= 30) grossMarginScore = 7;
  else grossMarginScore = 3;

  // 4. DSCR Bank Viability Score (Max 15)
  let dscrScore = 0;
  if (dscr >= 2.0) dscrScore = 15;
  else if (dscr >= 1.5) dscrScore = 13;
  else if (dscr >= 1.25) dscrScore = 10;
  else if (dscr >= 1.0) dscrScore = 6;
  else dscrScore = 1;

  // 5. Capital Efficiency & Churn Resilience (Max 15)
  let capitalEfficiencyScore = 0;
  if (state.churnRatePercent <= 1.5) capitalEfficiencyScore += 8;
  else if (state.churnRatePercent <= 3.0) capitalEfficiencyScore += 5;
  else capitalEfficiencyScore += 2;

  if (state.monthlyGrowthRatePercent >= 10) capitalEfficiencyScore += 7;
  else if (state.monthlyGrowthRatePercent >= 6) capitalEfficiencyScore += 5;
  else capitalEfficiencyScore += 2;

  const totalScore = Math.min(100, runwayScore + unitEconomicsScore + grossMarginScore + dscrScore + capitalEfficiencyScore);

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  if (totalScore >= 92) grade = 'A+';
  else if (totalScore >= 82) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 55) grade = 'C';
  else if (totalScore >= 40) grade = 'D';
  else grade = 'F';

  let summary = '';
  if (totalScore >= 80) {
    summary = 'Institutional-grade venture stability. Superior unit economics, strong bank debt service coverage, and resilient cash buffer.';
  } else if (totalScore >= 60) {
    summary = 'Viable growth trajectory. Optimize cash conversion cycle and watch marketing burn to prevent pre-milestone bridge dependence.';
  } else {
    summary = 'High operational vulnerability detected. Immediate action required on runway extension, debt restructuring, or gross margin recovery.';
  }

  return {
    score: totalScore,
    grade,
    runwayScore,
    unitEconomicsScore,
    grossMarginScore,
    dscrScore,
    capitalEfficiencyScore,
    summary,
  };
}

// 7. STARTUP FAILURE MODE DIAGNOSTICS (7 Classic Killers)
export function evaluateStartupFailureModes(
  state: InvestmentPlanState,
  runwayMonths: number,
  dscr: number
): FailureModeDiagnostic[] {
  const ltvCacRatio = state.cac > 0 ? state.ltv / state.cac : 3.0;
  const founderEquity = state.capTable.filter((h) => h.role === 'Founder').reduce((acc, h) => acc + h.ownershipPercent, 0);

  return [
    {
      id: 'fail_runway',
      name: 'Cash Depletion Death Spiral',
      severity: runwayMonths < 6 ? 'critical' : runwayMonths < 10 ? 'high' : 'low',
      isTriggered: runwayMonths < 9,
      metricObserved: `${runwayMonths.toFixed(1)} Months Runway`,
      threshold: 'Minimum 9.0 Months',
      rootCause: 'Current net burn exceeds cash reserve horizon without a committed bridge facility.',
      playbookMitigation: 'Activate Treasury Yield Optimizer to earn passive APY on reserves, draw down revolving credit line, and trim non-quota marketing spend.',
    },
    {
      id: 'fail_premature_scale',
      name: 'Premature Scaling (Burn Ahead of PMF)',
      severity: state.monthlyOpex > state.monthlyRevenue * 2.2 ? 'high' : 'low',
      isTriggered: state.monthlyOpex > state.monthlyRevenue * 2.0 && state.monthlyGrowthRatePercent < 8,
      metricObserved: `OPEX is ${(state.monthlyOpex / Math.max(1, state.monthlyRevenue)).toFixed(1)}x Monthly Revenue`,
      threshold: 'Under 1.8x Ratio at Current Growth',
      rootCause: 'Payroll, marketing, and SaaS tooling overhead are scaling faster than organic compound customer revenue.',
      playbookMitigation: 'Freeze non-engineering headcount expansion. Re-index sales quotas to payback under 9 months.',
    },
    {
      id: 'fail_leaky_bucket',
      name: 'Leaky Bucket Churn Syndrome',
      severity: state.churnRatePercent > 3.5 ? 'critical' : state.churnRatePercent > 2.5 ? 'medium' : 'low',
      isTriggered: state.churnRatePercent > 2.8,
      metricObserved: `${state.churnRatePercent}% Monthly Churn`,
      threshold: 'Maximum 2.0% Monthly',
      rootCause: 'High customer churn is eroding newly acquired revenue cohorts, causing CAC spending to be wasted.',
      playbookMitigation: 'Implement customer onboarding health scores, early contract lock-ins, and automated product usage alerting.',
    },
    {
      id: 'fail_bank_covenant',
      name: 'Debt Service Covenant Breach',
      severity: dscr < 1.0 ? 'critical' : dscr < 1.25 ? 'high' : 'low',
      isTriggered: dscr < 1.25 && state.loans.length > 0,
      metricObserved: `${dscr.toFixed(2)}x DSCR`,
      threshold: 'Bank Minimum 1.25x DSCR',
      rootCause: 'Operating income is insufficient to comfortably service mandatory bank principal and interest payments.',
      playbookMitigation: 'Negotiate a 6-month interest-only covenant with commercial lender or restructure amortizing term loan with venture debt.',
    },
    {
      id: 'fail_margin_erosion',
      name: 'Supply Chain & Freight Margin Compression',
      severity: state.grossMarginPercent < 45 ? 'high' : 'low',
      isTriggered: state.grossMarginPercent < 48 && (state.blueprintId === 'ecommerce' || state.blueprintId === 'manufacturing'),
      metricObserved: `${state.grossMarginPercent}% Gross Margin`,
      threshold: 'Minimum 50.0% Margin',
      rootCause: 'Rising BOM procurement costs, 3PL storage tier surcharges, and last-mile courier rates are eating contribution profit.',
      playbookMitigation: 'Renegotiate tiered volume supplier contracts and optimize regional warehouse distribution hubs to reduce shipping zones.',
    },
    {
      id: 'fail_cap_table_fracture',
      name: 'Cap Table Fracture & Over-Dilution',
      severity: founderEquity < 40 ? 'critical' : founderEquity < 50 ? 'medium' : 'low',
      isTriggered: founderEquity < 50,
      metricObserved: `${founderEquity}% Founder Ownership`,
      threshold: 'Minimum 50% Pre-Series A',
      rootCause: 'Early stack of low-valuation SAFEs and angel notes has compressed founding team equity below VC investment thresholds.',
      playbookMitigation: 'Utilize non-dilutive Bank Term Loans or Venture Debt for next 12 months rather than issuing discounted equity.',
    },
    {
      id: 'fail_working_capital_trap',
      name: 'Working Capital Cash Lockup Trap',
      severity: state.logistics.cashConversionCycleDays > 60 ? 'high' : 'low',
      isTriggered: state.logistics.cashConversionCycleDays > 45,
      metricObserved: `${state.logistics.cashConversionCycleDays} Days Cash Conversion Cycle`,
      threshold: 'Under 35 Days',
      rootCause: 'Cash is tied up in unsold warehouse inventory (high DIO) and delayed client receivables (high DSO) before suppliers are paid.',
      playbookMitigation: 'Institute 2% net-10 early invoice payment discounts and secure 60-day vendor payable terms (DPO extension).',
    },
  ];
}
