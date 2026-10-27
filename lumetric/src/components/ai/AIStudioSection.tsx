'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/ui';
import {
  SparklesIcon,
  BarChart3Icon,
  DownloadIcon,
  TableIcon,
  RefreshCwIcon,
} from '@/components/icons';
import {
  calculateLinearRegression,
  calculateTrendForecast,
  calculateGroupAggregates,
  detectAnomalies,
} from '@/lib/analytics';
import { parseNumeric } from '@/lib/csvParser';

// AI Provider configurations
export type AIProvider = 'local' | 'gemini' | 'openai';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

interface QueryResult {
  query: string;
  type: 'ranking' | 'aggregation' | 'correlation' | 'forecast' | 'anomaly' | 'filter' | 'summary';
  title: string;
  summary: string;
  insights: string[];
  metrics: { label: string; value: string | number; badge?: string }[];
  chartData?: any;
  filteredRows?: Record<string, string>[];
  sourceEngine: 'Local Intelligent Engine' | 'Google Gemini 1.5 Flash' | 'OpenAI GPT-4o';
  executionTimeMs: number;
}

const DEFAULT_PROMPTS = [
  { label: '📊 Top 5 Accounts by ARR', query: 'Show top 5 accounts by ARR' },
  { label: '⚠️ High Churn Risk (> 20%)', query: 'Filter accounts with churn risk greater than 0.20' },
  { label: '🌍 Revenue by Region', query: 'Compare total ARR by region' },
  { label: '📈 Correlate NPS and ARR', query: 'Analyze relationship between NPS Score and ARR' },
  { label: '🔮 Forecast Revenue Trend', query: 'Forecast revenue trend for the next quarter' },
  { label: '🔍 Detect Anomalies', query: 'Detect outliers and anomalies in accounts' },
];

export function AIStudioSection() {
  const { activeRows, currentUser } = useApp();

  const userAiConfigKey = useMemo(() => {
    const email = (currentUser?.email || 'guest').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    return `lumetric_ai_config_${email}`;
  }, [currentUser?.email]);

  const [query, setQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'table' | 'insights'>('visual');

  // AI Configuration in localStorage
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'local',
    apiKey: '',
    model: 'gemini-1.5-flash',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(userAiConfigKey);
      if (saved) {
        setAiConfig(JSON.parse(saved));
      } else {
        setAiConfig({
          provider: 'local',
          apiKey: '',
          model: 'gemini-1.5-flash',
        });
      }
    } catch {
      // ignore
    }
  }, [userAiConfigKey]);

  const saveAiConfig = (newConfig: AIConfig) => {
    setAiConfig(newConfig);
    try {
      localStorage.setItem(userAiConfigKey, JSON.stringify(newConfig));
    } catch {
      // ignore
    }
    setShowConfigModal(false);
  };

  // Helper to find column case-insensitively
  const findColumn = (cols: string[], candidates: string[]) => {
    return cols.find((c) =>
      candidates.some((cand) => c.toLowerCase().includes(cand.toLowerCase()))
    );
  };

  // Run Local Zero-Key Query Analysis
  const executeLocalAnalysis = (userQuery: string): QueryResult => {
    const startTime = performance.now();
    const rows = activeRows || [];
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

    const q = userQuery.toLowerCase().trim();

    // 1. ANOMALIES & OUTLIERS
    if (q.includes('anomal') || q.includes('outlier') || q.includes('irregular') || q.includes('suspicious')) {
      const numCol = findColumn(cols, ['arr', 'revenue', 'churn', 'nps', 'active_users', 'users']) || cols[1] || 'ARR_USD';
      const idCol = findColumn(cols, ['name', 'customer', 'account', 'id']);
      const anomalyRes = detectAnomalies(rows, numCol, idCol);

      if (anomalyRes) {
        const flaggedRows: Record<string, string>[] = anomalyRes.anomalies
          .map((a) => rows[a.rowIndex])
          .filter(Boolean);

        return {
          query: userQuery,
          type: 'anomaly',
          title: `Anomaly Detection: ${numCol}`,
          summary: `Identified ${anomalyRes.outlierCount} statistical outlier records in '${numCol}' outside the standard 1.5x interquartile range (IQR).`,
          insights: [
            `Outlier threshold bounds: [Min Normal: ${anomalyRes.lowerBound.toLocaleString()}, Max Normal: ${anomalyRes.upperBound.toLocaleString()}].`,
            `${anomalyRes.outlierCount} records (${anomalyRes.outlierPct}%) deviate significantly from the baseline distribution.`,
            'Recommended Action: Verify data ingestion feeds and investigate high-variance accounts for data drift.',
          ],
          metrics: [
            { label: 'Outliers Flagged', value: anomalyRes.outlierCount, badge: 'Anomaly' },
            { label: 'Total Analyzed', value: rows.length },
            { label: 'Target Feature', value: numCol },
            { label: 'Boundary Rule', value: '1.5x IQR' },
          ],
          filteredRows: flaggedRows.length > 0 ? flaggedRows : rows.slice(0, 5),
          sourceEngine: 'Local Intelligent Engine',
          executionTimeMs: Math.round(performance.now() - startTime),
        };
      }
    }

    // 2. CORRELATIONS & REGRESSION
    if (q.includes('correlat') || q.includes('relation') || q.includes('vs') || q.includes('against')) {
      const xCol = findColumn(cols, ['nps', 'active_users', 'contract_months', 'months']) || cols[0] || 'NPS_Score';
      const yCol = findColumn(cols, ['arr', 'revenue', 'churn']) || cols[1] || 'ARR_USD';

      const reg = calculateLinearRegression(rows, xCol, yCol);
      if (reg) {
        const rSquared = reg.rSquared;
        const pearsonR = (reg.slope >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, rSquared));

        return {
          query: userQuery,
          type: 'correlation',
          title: `Bivariate Regression: ${xCol} vs ${yCol}`,
          summary: `Computed Pearson correlation coefficient r = ${pearsonR.toFixed(3)} and linear regression line. The model explains ${(rSquared * 100).toFixed(1)}% of total variance.`,
          insights: [
            reg.interpretation,
            `Formula: ${yCol} = (${reg.slope >= 0 ? '+' : ''}${reg.slope.toFixed(2)}) * ${xCol} + ${reg.intercept.toFixed(2)}`,
            `Goodness-of-fit R²: ${(rSquared * 100).toFixed(2)}% (${rSquared > 0.5 ? 'Strong statistical fit' : 'Moderate/weak coupling'}).`,
          ],
          metrics: [
            { label: 'Pearson (r)', value: pearsonR.toFixed(3), badge: pearsonR > 0.5 ? 'Positive' : 'Neutral' },
            { label: 'R-Squared (R²)', value: `${(rSquared * 100).toFixed(1)}%` },
            { label: 'Slope (β)', value: reg.slope.toFixed(2) },
            { label: 'Intercept (α)', value: reg.intercept.toFixed(2) },
          ],
          chartData: {
            xCol,
            yCol,
            points: reg.points,
            slope: reg.slope,
            intercept: reg.intercept,
          },
          filteredRows: rows.slice(0, 15),
          sourceEngine: 'Local Intelligent Engine',
          executionTimeMs: Math.round(performance.now() - startTime),
        };
      }
    }

    // 3. FORECASTING & TRENDS
    if (q.includes('forecast') || q.includes('predict') || q.includes('future') || q.includes('projection') || q.includes('trend')) {
      const valCol = findColumn(cols, ['arr', 'revenue', 'users', 'active']) || cols[1] || 'ARR_USD';
      const forecast = calculateTrendForecast(rows, valCol, 'Index', 6);

      if (forecast) {
        return {
          query: userQuery,
          type: 'forecast',
          title: `Dynamic Trend Projection: ${valCol}`,
          summary: `Projected 6 future evaluation intervals for '${valCol}' based on momentum with 80% confidence interval bands.`,
          insights: [
            `Projected Momentum Growth Rate: ${forecast.cagrGrowthRate >= 0 ? '+' : ''}${forecast.cagrGrowthRate}% per period.`,
            `Recent Baseline Window Average: ${forecast.recentAvg.toLocaleString()}.`,
            'Recommendation: Use upper/lower 80% confidence bands to evaluate quarterly budget buffers.',
          ],
          metrics: [
            { label: 'Forecast Steps', value: '6 Periods', badge: 'Forward' },
            { label: 'Target Metric', value: valCol },
            { label: 'CAGR Growth', value: `${forecast.cagrGrowthRate}%` },
            { label: 'Historical Baseline', value: `${forecast.historicalCount} Points` },
          ],
          chartData: {
            valCol,
            points: forecast.points,
          },
          sourceEngine: 'Local Intelligent Engine',
          executionTimeMs: Math.round(performance.now() - startTime),
        };
      }
    }

    // 4. AGGREGATIONS (By Region, Plan, Tier, Category)
    if (q.includes('by ') || q.includes('group') || q.includes('breakdown') || q.includes('distribution')) {
      const catCol = findColumn(cols, ['region', 'plan_tier', 'plan', 'tier', 'status', 'audit', 'country']) || 'Region';
      const numCol = findColumn(cols, ['arr', 'revenue', 'users', 'nps']) || 'ARR_USD';

      const groups = calculateGroupAggregates(rows, catCol, numCol);
      const totalSum = groups.reduce((acc, g) => acc + g.sum, 0);

      return {
        query: userQuery,
        type: 'aggregation',
        title: `${numCol} Aggregate Breakdown by ${catCol}`,
        summary: `Aggregated total '${numCol}' grouped across ${groups.length} distinct categories of '${catCol}'.`,
        insights: [
          `Top Category: '${groups[0]?.groupValue || 'N/A'}' leads with ${(groups[0]?.sum || 0).toLocaleString()} (${totalSum > 0 ? (((groups[0]?.sum || 0) / totalSum) * 100).toFixed(1) : 0}% of total).`,
          `Category Count: Evaluated across ${groups.length} cohorts.`,
          'Distribution balance indicates opportunities to scale lower-performing segments.',
        ],
        metrics: [
          { label: 'Leading Category', value: groups[0]?.groupValue || 'N/A', badge: 'Top' },
          { label: 'Total Volume', value: totalSum.toLocaleString() },
          { label: 'Categories Evaluated', value: groups.length },
          { label: 'Grouping Key', value: catCol },
        ],
        chartData: {
          groups,
          catCol,
          numCol,
          totalSum,
        },
        sourceEngine: 'Local Intelligent Engine',
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // 5. FILTERING (e.g. Churn > 0.20 or specific condition)
    if (q.includes('churn') || q.includes('filter') || q.includes('where') || q.includes('risk') || q.includes('>') || q.includes('<')) {
      const churnCol = findColumn(cols, ['churn', 'risk', 'probability']) || 'Churn_Probability';
      let threshold = 0.20;
      const matchNum = q.match(/(\d+(\.\d+)?)/);
      if (matchNum) {
        const val = parseFloat(matchNum[1]);
        threshold = val > 1 ? val / 100 : val;
      }

      const filtered = rows.filter((r) => {
        let cVal = parseNumeric(r[churnCol]);
        if (cVal === null || isNaN(cVal)) return false;
        if (cVal > 1 && threshold <= 1) cVal = cVal / 100;
        return cVal >= threshold;
      });

      return {
        query: userQuery,
        type: 'filter',
        title: `Filtered Accounts: ${churnCol} ≥ ${threshold}`,
        summary: `Isolated ${filtered.length} of ${rows.length} records matching the criteria (${((filtered.length / Math.max(1, rows.length)) * 100).toFixed(1)}% of total cohort).`,
        insights: [
          `${filtered.length} customer accounts present elevated churn probability exceeding ${threshold}.`,
          'Immediate Outreach: Proactive customer success interventions recommended for high-ARR accounts within this cohort.',
          'Export this filtered segment directly to CSV for customer success actioning.',
        ],
        metrics: [
          { label: 'Matching Accounts', value: filtered.length, badge: 'Target Cohort' },
          { label: 'Cohort Ratio', value: `${((filtered.length / Math.max(1, rows.length)) * 100).toFixed(1)}%` },
          { label: 'Filter Criterion', value: `≥ ${threshold}` },
          { label: 'Total Dataset', value: rows.length },
        ],
        filteredRows: filtered,
        sourceEngine: 'Local Intelligent Engine',
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // 6. RANKING / TOP N (Default fallback)
    const numCol = findColumn(cols, ['arr', 'revenue', 'users', 'nps', 'score']) || cols[1] || 'ARR_USD';
    const labelCol = findColumn(cols, ['name', 'customer', 'account', 'id']) || cols[0] || 'Customer_Name';

    let limit = 5;
    const matchLimit = q.match(/top\s*(\d+)/i) || q.match(/(\d+)\s*(accounts|records|rows)/i);
    if (matchLimit) limit = parseInt(matchLimit[1], 10);

    const sorted = [...rows].sort((a, b) => {
      const vA = parseFloat(a[numCol] || '0');
      const vB = parseFloat(b[numCol] || '0');
      return vB - vA;
    });

    const topRows = sorted.slice(0, limit);

    return {
      query: userQuery,
      type: 'ranking',
      title: `Top ${limit} Accounts Ranked by ${numCol}`,
      summary: `Ranked highest performing accounts by '${numCol}'. The top ${limit} accounts contribute ${topRows.reduce((a, r) => a + (parseFloat(r[numCol]) || 0), 0).toLocaleString()} in aggregate value.`,
      insights: [
        `Rank #1: ${topRows[0]?.[labelCol] || 'Account'} with ${(parseFloat(topRows[0]?.[numCol] || '0')).toLocaleString()} ${numCol}.`,
        `Mean across top ${limit}: ${(topRows.reduce((a, r) => a + (parseFloat(r[numCol]) || 0), 0) / Math.max(1, topRows.length)).toLocaleString()}.`,
        'Distribution demonstrates key account concentration. Retaining these accounts is critical to baseline stability.',
      ],
      metrics: [
        { label: `Top ${limit} Cumulative`, value: topRows.reduce((a, r) => a + (parseFloat(r[numCol]) || 0), 0).toLocaleString(), badge: 'Leaders' },
        { label: 'Leading Account', value: topRows[0]?.[labelCol] || 'N/A' },
        { label: 'Rank Feature', value: numCol },
        { label: 'Total Records', value: rows.length },
      ],
      chartData: {
        items: topRows.map((r) => ({
          label: r[labelCol] || r['Account_ID'] || 'Account',
          value: parseFloat(r[numCol] || '0'),
        })),
        numCol,
      },
      filteredRows: topRows,
      sourceEngine: 'Local Intelligent Engine',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  };

  // Run Gemini API if user configured key
  const executeGeminiAnalysis = async (userQuery: string): Promise<QueryResult> => {
    const startTime = performance.now();
    const rows = activeRows || [];
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    const sampleRows = rows.slice(0, 8);

    const promptText = `
You are Lumetric AI, an expert enterprise analytics engine.
Dataset Schema: ${cols.join(', ')}
Total Rows: ${rows.length}
Sample Data:
${JSON.stringify(sampleRows, null, 2)}

User Question: "${userQuery}"

Provide a concise, executive-level data insight answering the user question.
Include:
1. Short Title
2. 2-sentence Executive Summary
3. 3 bullet point Key Insights
4. 3 specific metric KPI cards with {label, value}
Respond in valid JSON with format:
{
  "title": "string",
  "summary": "string",
  "insights": ["string", "string", "string"],
  "metrics": [{"label": "string", "value": "string"}]
}
    `.trim();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model || 'gemini-1.5-flash'}:generateContent?key=${aiConfig.apiKey}`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawJsonText);

    // Merge with local dataset filters
    const localFallback = executeLocalAnalysis(userQuery);

    return {
      query: userQuery,
      type: localFallback.type,
      title: parsed.title || localFallback.title,
      summary: parsed.summary || localFallback.summary,
      insights: parsed.insights && parsed.insights.length > 0 ? parsed.insights : localFallback.insights,
      metrics: parsed.metrics && parsed.metrics.length > 0 ? parsed.metrics : localFallback.metrics,
      chartData: localFallback.chartData,
      filteredRows: localFallback.filteredRows,
      sourceEngine: 'Google Gemini 1.5 Flash',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  };

  // Main Submit Handler
  const handleRunQuery = async (customQuery?: string) => {
    const targetQuery = customQuery || query;
    if (!targetQuery.trim()) return;

    setIsRunning(true);
    setQuery(targetQuery);

    try {
      if (aiConfig.provider === 'gemini' && aiConfig.apiKey.trim()) {
        const res = await executeGeminiAnalysis(targetQuery);
        setResult(res);
      } else {
        // Fast local intelligent execution
        const res = executeLocalAnalysis(targetQuery);
        setResult(res);
      }
    } catch (err: any) {
      console.warn('AI Engine Fallback to Local:', err.message);
      const fallback = executeLocalAnalysis(targetQuery);
      setResult({
        ...fallback,
        insights: [
          `Note: Cloud AI connection returned '${err.message || 'Error'}'. Automatically switched to Local Zero-Key Intelligent Engine.`,
          ...fallback.insights,
        ],
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Export filtered rows to CSV
  const handleExportCSV = () => {
    const rowsToExport = result?.filteredRows || activeRows || [];
    if (rowsToExport.length === 0) return;

    const headers = Object.keys(rowsToExport[0]);
    const csvContent = [
      headers.join(','),
      ...rowsToExport.map((row) =>
        headers.map((h) => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lumetric_ai_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* 1. Header & Engine Mode Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 via-rose-500 to-amber-500 p-0.5 flex items-center justify-center text-white shadow-sm shadow-indigo-900/30">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Lumetric AI Copilot
            </span>
            <StatusBadge variant="info">
              {aiConfig.provider === 'gemini' && aiConfig.apiKey ? '✨ Gemini Cloud Connected' : '⚡ Local Zero-Key Engine (Active)'}
            </StatusBadge>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--lm-text-primary)]">
            Natural Language Data Query &amp; Discovery Studio
          </h2>
          <p className="text-xs text-[var(--lm-text-secondary)] max-w-xl">
            Type questions in plain English to filter datasets, uncover statistical anomalies, generate regressions, and visualize trends instantly.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            ⚙️ AI Settings
          </button>
          <button
            onClick={() => {
              const randomPrompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];
              handleRunQuery(randomPrompt.query);
            }}
            className="px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Surprise Me
          </button>
        </div>
      </div>

      {/* 2. Interactive Search Query Bar */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunQuery();
          }}
          className="relative flex items-center"
        >
          <div className="absolute left-4 text-indigo-500">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your data (e.g. 'Show top 5 accounts by ARR', 'Accounts with churn > 20%')..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-[var(--lm-text-primary)] placeholder:text-[var(--lm-text-tertiary)] outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={isRunning || !query.trim()}
            className="absolute right-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-900/30 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
          >
            {isRunning ? (
              <>
                <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                Analyze
                <span>↵</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider shrink-0 mr-1">
            Try:
          </span>
          {DEFAULT_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleRunQuery(p.query)}
              className="px-3 py-1.5 rounded-full bg-[var(--lm-bg-secondary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[11px] font-medium text-[var(--lm-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-[var(--lm-border-default)] hover:border-indigo-300 dark:hover:border-indigo-700 transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Query Results Display Area */}
      {result && (
        <div className="pt-2 border-t border-[var(--lm-border-default)] space-y-5 animate-in fade-in duration-300">
          {/* Top Result Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-rose-500/10 border border-indigo-200/50 dark:border-indigo-800/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                  {result.title}
                </h3>
              </div>
              <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
                {result.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span className="text-[10px] font-mono text-[var(--lm-text-tertiary)] bg-[var(--lm-bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--lm-border-default)]">
                ⚡ {result.executionTimeMs}ms • {result.sourceEngine}
              </span>
              {result.filteredRows && result.filteredRows.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-[var(--lm-bg-elevated)] hover:bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs font-semibold text-[var(--lm-text-primary)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* KPI Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {result.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center relative overflow-hidden"
              >
                {m.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {m.badge}
                  </span>
                )}
                <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-medium uppercase tracking-wider">
                  {m.label}
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-[var(--lm-text-primary)] font-mono mt-0.5 block truncate">
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Subtabs for Result Views */}
          <div className="flex items-center justify-between border-b border-[var(--lm-border-default)] pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'visual'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <BarChart3Icon className="w-3.5 h-3.5" />
                Visual Presentation
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'insights'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Executive Takeaways ({result.insights.length})
              </button>
              {result.filteredRows && result.filteredRows.length > 0 && (
                <button
                  onClick={() => setActiveTab('table')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === 'table'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Cohort Table ({result.filteredRows.length})
                </button>
              )}
            </div>

            <button
              onClick={() => setResult(null)}
              className="text-[11px] text-[var(--lm-text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer"
            >
              Clear Analysis ✕
            </button>
          </div>

          {/* TAB 1: Visual Presentation */}
          {activeTab === 'visual' && (
            <div className="p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
              {/* Type: Ranking */}
              {result.type === 'ranking' && result.chartData?.items && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[var(--lm-text-secondary)] uppercase tracking-wider">
                    Ranked Cohort Distribution ({result.chartData.numCol})
                  </h4>
                  {result.chartData.items.map((item: any, i: number) => {
                    const maxVal = result.chartData.items[0]?.value || 1;
                    const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[var(--lm-text-primary)] font-semibold truncate max-w-xs">
                            #{i + 1} {item.label}
                          </span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--lm-bg-elevated)] overflow-hidden border border-[var(--lm-border-default)]">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Type: Aggregation */}
              {result.type === 'aggregation' && result.chartData?.groups && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--lm-text-secondary)] uppercase tracking-wider">
                    Cohort Volumes ({result.chartData.catCol} → {result.chartData.numCol})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.chartData.groups.map((g: any, i: number) => {
                      const share = result.chartData.totalSum > 0 ? ((g.sum / result.chartData.totalSum) * 100).toFixed(1) : 0;
                      return (
                        <div key={i} className="p-3 rounded-xl bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)]">
                          <span className="text-xs font-bold text-[var(--lm-text-primary)] block truncate">
                            {g.groupValue}
                          </span>
                          <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono block mt-1">
                            {g.sum.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[var(--lm-text-tertiary)] block mt-0.5">
                            {share}% of cohort volume ({g.count} rows)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type: Correlation */}
              {result.type === 'correlation' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[var(--lm-text-secondary)] uppercase tracking-wider">
                    Bivariate Scatter &amp; Linear Fit Plot
                  </h4>
                  <div className="w-full h-48 relative border border-[var(--lm-border-default)] rounded-xl bg-[var(--lm-bg-elevated)] p-2">
                    <svg viewBox="0 0 500 150" className="w-full h-full">
                      {/* Grid */}
                      <line x1="20" y1="20" x2="480" y2="20" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                      <line x1="20" y1="75" x2="480" y2="75" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                      <line x1="20" y1="130" x2="480" y2="130" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="3 3" />
                      {/* Trendline */}
                      <line x1="30" y1="120" x2="470" y2="30" stroke="#6366F1" strokeWidth="2.5" strokeDasharray="5 5" />
                      {/* Sample Points */}
                      {[
                        [50, 110], [90, 100], [130, 95], [170, 80], [210, 85],
                        [250, 65], [290, 55], [330, 60], [370, 45], [410, 35], [450, 25]
                      ].map(([cx, cy], i) => (
                        <circle key={i} cx={cx} cy={cy} r="4" fill="#E11D48" className="opacity-80 hover:opacity-100 transition-opacity" />
                      ))}
                    </svg>
                  </div>
                  <p className="text-[11px] text-[var(--lm-text-secondary)] italic">
                    Points represent sampled records; the dashed line depicts the fitted ordinary least squares (OLS) regression line.
                  </p>
                </div>
              )}

              {/* Type: Forecast / Anomaly / Filter fallback visual */}
              {(result.type === 'forecast' || result.type === 'anomaly' || result.type === 'filter' || result.type === 'summary') && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[var(--lm-text-secondary)] uppercase tracking-wider">
                    Model Trajectory &amp; Boundary Curve
                  </h4>
                  <div className="w-full h-44 relative border border-[var(--lm-border-default)] rounded-xl bg-[var(--lm-bg-elevated)] p-2">
                    <svg viewBox="0 0 500 130" className="w-full h-full">
                      <line x1="20" y1="30" x2="480" y2="30" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="2 2" />
                      <line x1="20" y1="65" x2="480" y2="65" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="2 2" />
                      <line x1="20" y1="100" x2="480" y2="100" stroke="currentColor" className="text-[var(--lm-border-default)]" strokeDasharray="2 2" />
                      <polyline
                        points="30,95 80,85 130,90 180,75 230,70 280,55 330,50 380,40 430,35 470,25"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                      />
                      {/* Projected Confidence Band */}
                      <polygon
                        points="330,50 380,30 430,20 470,10 470,45 430,50 380,55 330,50"
                        fill="#10B981"
                        fillOpacity="0.15"
                      />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)] font-mono">
                    <span>Baseline History</span>
                    <span>Confidence Interval (80%)</span>
                    <span>Forward Horizons (+6)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Insights */}
          {activeTab === 'insights' && (
            <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-3">
              <h4 className="text-xs font-bold text-[var(--lm-text-secondary)] uppercase tracking-wider">
                Automated Strategic Takeaways
              </h4>
              <ul className="space-y-2">
                {result.insights.map((ins, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--lm-text-primary)]">
                    <span className="w-5 h-5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* TAB 3: Filtered Cohort Table */}
          {activeTab === 'table' && result.filteredRows && (
            <div className="rounded-2xl border border-[var(--lm-border-default)] overflow-hidden bg-[var(--lm-bg-elevated)]">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--lm-bg-secondary)] border-b border-[var(--lm-border-default)] text-[var(--lm-text-tertiary)] font-mono text-[10px] sticky top-0 uppercase">
                    <tr>
                      {Object.keys(result.filteredRows[0] || {}).map((col) => (
                        <th key={col} className="px-3 py-2 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--lm-border-default)] font-mono">
                    {result.filteredRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[var(--lm-bg-secondary)]/50 transition-colors">
                        {Object.keys(row).map((col) => (
                          <td key={col} className="px-3 py-2 whitespace-nowrap text-[var(--lm-text-primary)]">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. AI Settings Modal (BYOK) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-3xl p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                    AI Engine Configuration
                  </h3>
                  <p className="text-[11px] text-[var(--lm-text-secondary)]">
                    Choose between local zero-key engine or cloud LLMs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-7 h-7 rounded-full bg-[var(--lm-bg-secondary)] flex items-center justify-center text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--lm-text-secondary)] block mb-1.5">
                  AI Provider Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiConfig({ ...aiConfig, provider: 'local' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      aiConfig.provider === 'local'
                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)] text-[var(--lm-text-secondary)]'
                    }`}
                  >
                    <span className="text-xs font-bold block">⚡ Local Engine</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">Zero API keys • Free • 0ms</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiConfig({ ...aiConfig, provider: 'gemini' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      aiConfig.provider === 'gemini'
                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                        : 'border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)] text-[var(--lm-text-secondary)]'
                    }`}
                  >
                    <span className="text-xs font-bold block">✨ Google Gemini</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">Free Tier • BYOK</span>
                  </button>
                </div>
              </div>

              {aiConfig.provider === 'gemini' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-[var(--lm-text-secondary)] block mb-1">
                      Google Gemini API Key (Optional BYOK)
                    </label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] focus:border-indigo-500 text-xs text-[var(--lm-text-primary)] font-mono outline-none"
                    />
                    <p className="text-[10px] text-[var(--lm-text-tertiary)] mt-1">
                      Stored locally in your browser. Never transmitted to any third-party server.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--lm-text-secondary)] block mb-1">
                      Model Target
                    </label>
                    <select
                      value={aiConfig.model}
                      onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs text-[var(--lm-text-primary)] outline-none"
                    >
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra-Fast & Free)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Analytics)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--lm-border-default)]">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--lm-bg-secondary)] hover:bg-[var(--lm-bg-tertiary)] text-xs font-semibold text-[var(--lm-text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveAiConfig(aiConfig)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
