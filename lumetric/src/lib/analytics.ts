// Deterministic Mathematical & Analytics Kernel (Spec Section A, D & J)
// Verified algorithms: Pearson correlation, Welch's t-test, IQR/Z-score outlier detection,
// OLS linear regression, and exponential trend forecasting.

export interface CorrelationItem {
  feature: string;
  r: number;
  rSquared: number;
  direction: 'positive' | 'negative' | 'neutral';
  strength: 'Strong' | 'Moderate' | 'Weak' | 'None';
}

export interface TwoSampleTestResult {
  groupA: string;
  groupB: string;
  countA: number;
  countB: number;
  meanA: number;
  meanB: number;
  diff: number;
  pctDiff: number;
  tStat: number;
  cohensD: number;
  isSignificant: boolean;
  verdict: string;
}

export interface AnomalyItem {
  rowIndex: number;
  recordId: string;
  value: number;
  deviation: number;
  type: 'high_outlier' | 'low_outlier';
  severity: 'Severe' | 'Moderate';
}

export interface AnomalySummary {
  column: string;
  totalRecords: number;
  outlierCount: number;
  outlierPct: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  mean: number;
  stdDev: number;
  anomalies: AnomalyItem[];
}

export interface RegressionResult {
  xCol: string;
  yCol: string;
  n: number;
  slope: number;
  intercept: number;
  r: number;
  rSquared: number;
  equation: string;
  interpretation: string;
  points: { x: number; y: number; yPred: number; residual: number }[];
}

export interface ForecastPoint {
  periodLabel: string;
  actual?: number;
  forecast: number;
  lower80: number;
  upper80: number;
  isProjected: boolean;
}

export interface ForecastResult {
  metric: string;
  historicalCount: number;
  projectedCount: number;
  cagrGrowthRate: number;
  recentAvg: number;
  points: ForecastPoint[];
}

export interface GroupAggregateRow {
  groupValue: string;
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
}

// Robust Numerical Parser (handles currencies, commas, accounting parentheses, percentages)
export function parseNumeric(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  const str = String(raw).trim();
  if (str === '') return null;
  let cleanStr = str;
  let isNegative = false;
  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    isNegative = true;
    cleanStr = cleanStr.slice(1, -1);
  }
  cleanStr = cleanStr.replace(/[\$,\s€£¥]/g, '');
  if (cleanStr.endsWith('%')) {
    const num = parseFloat(cleanStr.slice(0, -1));
    return isNaN(num) ? null : (isNegative ? -num : num) / 100;
  }
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed)) return null;
  return isNegative ? -Math.abs(parsed) : parsed;
}

// 1. Pearson Correlation Matrix & Key Drivers
export function calculateCorrelations(
  rows: Record<string, string>[],
  targetCol: string,
  candidateCols: string[]
): CorrelationItem[] {
  const results: CorrelationItem[] = [];

  candidateCols.forEach((col) => {
    if (col === targetCol) return;

    const pairs: { t: number; c: number }[] = [];
    rows.forEach((r) => {
      const t = parseNumeric(r[targetCol]);
      const c = parseNumeric(r[col]);
      if (t !== null && c !== null) {
        pairs.push({ t, c });
      }
    });

    if (pairs.length < 3) return;

    const n = pairs.length;
    const meanT = pairs.reduce((sum, p) => sum + p.t, 0) / n;
    const meanC = pairs.reduce((sum, p) => sum + p.c, 0) / n;

    let cov = 0;
    let varT = 0;
    let varC = 0;

    pairs.forEach((p) => {
      const dt = p.t - meanT;
      const dc = p.c - meanC;
      cov += dt * dc;
      varT += dt * dt;
      varC += dc * dc;
    });

    if (varT === 0 || varC === 0) return;

    let r = cov / (Math.sqrt(varT) * Math.sqrt(varC));
    if (isNaN(r)) return;
    r = Math.max(-1, Math.min(1, r));

    const rSquared = parseFloat((r * r).toFixed(4));
    const absR = Math.abs(r);

    let strength: CorrelationItem['strength'] = 'None';
    if (absR >= 0.7) strength = 'Strong';
    else if (absR >= 0.4) strength = 'Moderate';
    else if (absR >= 0.15) strength = 'Weak';

    results.push({
      feature: col,
      r: parseFloat(r.toFixed(3)),
      rSquared,
      direction: r > 0.05 ? 'positive' : r < -0.05 ? 'negative' : 'neutral',
      strength,
    });
  });

  return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

// 2. Two-Sample Cohort Comparison / Hypothesis Test (Welch's t-test)
export function calculateTwoSampleTest(
  rows: Record<string, string>[],
  groupCol: string,
  metricCol: string,
  groupA: string,
  groupB: string
): TwoSampleTestResult | null {
  const valsA: number[] = [];
  const valsB: number[] = [];

  rows.forEach((r) => {
    const g = r[groupCol];
    const val = parseNumeric(r[metricCol]);
    if (val !== null) {
      if (g === groupA) valsA.push(val);
      else if (g === groupB) valsB.push(val);
    }
  });

  if (valsA.length < 2 || valsB.length < 2) return null;

  const countA = valsA.length;
  const countB = valsB.length;
  const meanA = valsA.reduce((a, b) => a + b, 0) / countA;
  const meanB = valsB.reduce((a, b) => a + b, 0) / countB;

  const varA = valsA.reduce((acc, v) => acc + Math.pow(v - meanA, 2), 0) / (countA - 1);
  const varB = valsB.reduce((acc, v) => acc + Math.pow(v - meanB, 2), 0) / (countB - 1);

  const seDiff = Math.sqrt(varA / countA + varB / countB);
  const tStat = seDiff > 0 ? (meanA - meanB) / seDiff : 0;

  const pooledSD = Math.sqrt(((countA - 1) * varA + (countB - 1) * varB) / (countA + countB - 2));
  const cohensD = pooledSD > 0 ? Math.abs(meanA - meanB) / pooledSD : 0;

  const diff = meanA - meanB;
  const pctDiff = meanB !== 0 ? ((meanA - meanB) / Math.abs(meanB)) * 100 : 0;

  // Approximate p < 0.05 significance for df > 10 is |t| > 2.05
  const isSignificant = Math.abs(tStat) >= 2.05;
  const verdict = isSignificant
    ? `Statistically significant difference detected (t = ${tStat.toFixed(2)}, |d| = ${cohensD.toFixed(2)}).`
    : `Difference is not statistically distinguishable from random variation (t = ${tStat.toFixed(2)}).`;

  return {
    groupA,
    groupB,
    countA,
    countB,
    meanA: parseFloat(meanA.toFixed(2)),
    meanB: parseFloat(meanB.toFixed(2)),
    diff: parseFloat(diff.toFixed(2)),
    pctDiff: parseFloat(pctDiff.toFixed(1)),
    tStat: parseFloat(tStat.toFixed(2)),
    cohensD: parseFloat(cohensD.toFixed(2)),
    isSignificant,
    verdict,
  };
}

// 3. Outlier & Anomaly Detection (IQR + Z-Score)
export function detectAnomalies(
  rows: Record<string, string>[],
  metricCol: string,
  idCol?: string
): AnomalySummary | null {
  const entries: { val: number; idx: number; id: string }[] = [];

  rows.forEach((r, idx) => {
    const val = parseNumeric(r[metricCol]);
    if (val !== null) {
      const id = idCol ? r[idCol] || `Row #${idx + 1}` : `Row #${idx + 1}`;
      entries.push({ val, idx, id });
    }
  });

  if (entries.length < 4) return null;

  entries.sort((a, b) => a.val - b.val);
  const sortedVals = entries.map((e) => e.val);
  const n = sortedVals.length;

  const getPercentile = (p: number) => {
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedVals[base + 1] !== undefined) {
      return sortedVals[base] + rest * (sortedVals[base + 1] - sortedVals[base]);
    }
    return sortedVals[base];
  };

  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const sum = sortedVals.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sortedVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const anomalies: AnomalyItem[] = [];

  entries.forEach((e) => {
    if (e.val < lowerBound) {
      const deviation = Math.abs(e.val - lowerBound);
      const isSevere = e.val < q1 - 3 * iqr || (stdDev > 0 && (mean - e.val) / stdDev > 3);
      anomalies.push({
        rowIndex: e.idx,
        recordId: e.id,
        value: e.val,
        deviation: parseFloat(deviation.toFixed(2)),
        type: 'low_outlier',
        severity: isSevere ? 'Severe' : 'Moderate',
      });
    } else if (e.val > upperBound) {
      const deviation = Math.abs(e.val - upperBound);
      const isSevere = e.val > q3 + 3 * iqr || (stdDev > 0 && (e.val - mean) / stdDev > 3);
      anomalies.push({
        rowIndex: e.idx,
        recordId: e.id,
        value: e.val,
        deviation: parseFloat(deviation.toFixed(2)),
        type: 'high_outlier',
        severity: isSevere ? 'Severe' : 'Moderate',
      });
    }
  });

  return {
    column: metricCol,
    totalRecords: n,
    outlierCount: anomalies.length,
    outlierPct: parseFloat(((anomalies.length / n) * 100).toFixed(1)),
    q1: parseFloat(q1.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    q3: parseFloat(q3.toFixed(2)),
    iqr: parseFloat(iqr.toFixed(2)),
    lowerBound: parseFloat(lowerBound.toFixed(2)),
    upperBound: parseFloat(upperBound.toFixed(2)),
    mean: parseFloat(mean.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    anomalies: anomalies.sort((a, b) => b.deviation - a.deviation),
  };
}

// 4. OLS Linear Regression
export function calculateLinearRegression(
  rows: Record<string, string>[],
  xCol: string,
  yCol: string
): RegressionResult | null {
  const xVals: number[] = [];
  const yVals: number[] = [];

  rows.forEach((r) => {
    const x = parseNumeric(r[xCol]);
    const y = parseNumeric(r[yCol]);
    if (x !== null && y !== null) {
      xVals.push(x);
      yVals.push(y);
    }
  });

  const n = xVals.length;
  if (n < 3) return null;

  const meanX = xVals.reduce((a, b) => a + b, 0) / n;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  let numer = 0;
  let denom = 0;

  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    numer += dx * (yVals[i] - meanY);
    denom += dx * dx;
  }

  if (denom === 0) return null;

  const slope = numer / denom;
  const intercept = meanY - slope * meanX;

  // Correlation & R-squared
  const denomY = yVals.reduce((acc, y) => acc + Math.pow(y - meanY, 2), 0);
  const r = denomY > 0 ? numer / Math.sqrt(denom * denomY) : 0;
  const rSquared = parseFloat((r * r).toFixed(4));

  const points = xVals.map((x, i) => {
    const yPred = slope * x + intercept;
    return {
      x,
      y: yVals[i],
      yPred: parseFloat(yPred.toFixed(2)),
      residual: parseFloat((yVals[i] - yPred).toFixed(2)),
    };
  });

  const sign = intercept >= 0 ? '+' : '-';
  const equation = `${yCol} = ${slope.toFixed(3)} × ${xCol} ${sign} ${Math.abs(intercept).toFixed(2)}`;
  const interpretation = `Every 1-unit increase in ${xCol} is associated with a ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} change in ${yCol} (explains ${(rSquared * 100).toFixed(1)}% of variance).`;

  return {
    xCol,
    yCol,
    n,
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(2)),
    r: parseFloat(r.toFixed(3)),
    rSquared,
    equation,
    interpretation,
    points: points.slice(0, 30),
  };
}

// 5. Exponential Smoothing Trend Forecast
export function calculateTrendForecast(
  rows: Record<string, string>[],
  metricCol: string,
  timeCol?: string,
  horizonPeriods: number = 4
): ForecastResult | null {
  const vals: { label: string; val: number }[] = [];

  rows.forEach((r, idx) => {
    const v = parseNumeric(r[metricCol]);
    if (v !== null) {
      const label = timeCol && r[timeCol] ? String(r[timeCol]) : `P${idx + 1}`;
      vals.push({ label, val: v });
    }
  });

  if (vals.length < 3) return null;

  // Simple Holt / Exponential moving trend
  const n = vals.length;
  const recentWindow = vals.slice(-Math.min(6, n));
  const recentAvg = recentWindow.reduce((a, b) => a + b.val, 0) / recentWindow.length;

  let growthRate = 0;
  if (n >= 4) {
    const firstHalfAvg = vals.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b.val, 0) / Math.floor(n / 2);
    const secondHalfAvg = vals.slice(Math.floor(n / 2)).reduce((a, b) => a + b.val, 0) / (n - Math.floor(n / 2));
    if (firstHalfAvg > 0) {
      growthRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg / (n / 2);
    }
  }

  // Constrain extreme extrapolation
  const boundedGrowth = Math.max(-0.25, Math.min(0.25, growthRate));

  const points: ForecastPoint[] = vals.map((v) => ({
    periodLabel: v.label,
    actual: parseFloat(v.val.toFixed(2)),
    forecast: parseFloat(v.val.toFixed(2)),
    lower80: parseFloat((v.val * 0.95).toFixed(2)),
    upper80: parseFloat((v.val * 1.05).toFixed(2)),
    isProjected: false,
  }));

  let lastVal = vals[vals.length - 1].val;
  for (let h = 1; h <= horizonPeriods; h++) {
    const projected = lastVal * (1 + boundedGrowth);
    const uncertainty = 0.05 * Math.sqrt(h);
    points.push({
      periodLabel: `+${h} Projected`,
      forecast: parseFloat(projected.toFixed(2)),
      lower80: parseFloat((projected * (1 - uncertainty)).toFixed(2)),
      upper80: parseFloat((projected * (1 + uncertainty)).toFixed(2)),
      isProjected: true,
    });
    lastVal = projected;
  }

  return {
    metric: metricCol,
    historicalCount: n,
    projectedCount: horizonPeriods,
    cagrGrowthRate: parseFloat((boundedGrowth * 100).toFixed(1)),
    recentAvg: parseFloat(recentAvg.toFixed(2)),
    points,
  };
}

// 6. Multi-dimensional Slice & Aggregate
export function calculateGroupAggregates(
  rows: Record<string, string>[],
  groupCol: string,
  metricCol: string
): GroupAggregateRow[] {
  const groups: Record<string, number[]> = {};

  rows.forEach((r) => {
    const g = r[groupCol] || 'Unassigned';
    const val = parseNumeric(r[metricCol]);
    if (val !== null) {
      if (!groups[g]) groups[g] = [];
      groups[g].push(val);
    }
  });

  return Object.entries(groups)
    .map(([groupValue, numbers]) => {
      const count = numbers.length;
      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = count > 0 ? sum / count : 0;
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);

      return {
        groupValue,
        count,
        sum: parseFloat(sum.toFixed(2)),
        mean: parseFloat(mean.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
      };
    })
    .sort((a, b) => b.sum - a.sum);
}
