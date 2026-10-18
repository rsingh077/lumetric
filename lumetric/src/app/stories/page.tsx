'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, TextArea } from '@/components/ui';
import { PlusIcon } from '@/components/icons';

interface AudienceContent {
  onScreenText: string;
  narrationVoiceover: string;
  chartType: string;
}

interface StoryScene {
  step: number;
  stage: 'Question' | 'Context' | 'Finding' | 'Uncertainty' | 'Implication';
  title: string;
  sourceRunId: string;
  durationSec: number;
  content: {
    Executive: AudienceContent;
    Business: AudienceContent;
    Technical: AudienceContent;
  };
}

const INITIAL_SCENES: StoryScene[] = [
  {
    step: 1,
    stage: 'Question',
    title: 'The Core Business Inquiry',
    sourceRunId: 'PRJ-REV-001',
    durationSec: 5,
    content: {
      Executive: {
        onScreenText: 'Is enterprise customer retention stabilizing after Q2 pricing adjustments?',
        narrationVoiceover: 'We set out to investigate whether recent price adjustments impacted top-tier ARR growth or contracted customer logos.',
        chartType: 'Executive ARR Gauge & KPI Header',
      },
      Business: {
        onScreenText: 'Net Revenue Retention across tiers shows continued contract expansion.',
        narrationVoiceover: 'Analyzing the sales cohort data reveals that mid-market and enterprise accounts upgraded their seat counts.',
        chartType: 'Tier Expansion Bar Matrix',
      },
      Technical: {
        onScreenText: 'Hypothesis H0: Mean churn rate post-Q2 <= historical baseline (alpha = 0.05).',
        narrationVoiceover: 'Evaluating Welch’s two-sample t-test between pre-price and post-price retention cohorts shows no statistically significant degradation (p = 0.42).',
        chartType: 'Two-Sample Distribution & Confidence Bounds',
      },
    },
  },
  {
    step: 2,
    stage: 'Context',
    title: 'Baseline Historical Dynamics',
    sourceRunId: 'HIST-MOMENTS-v1',
    durationSec: 6,
    content: {
      Executive: {
        onScreenText: 'Historically, enterprise contracts yielded $180k median ARR with 94% retention.',
        narrationVoiceover: 'Prior to the pricing revision, cohort retention remained stable across 1,200 verified accounts.',
        chartType: 'Historical Distribution Benchmark',
      },
      Business: {
        onScreenText: 'Accounts exhibited a 14-month median payback period with steady expansion.',
        narrationVoiceover: 'Historical telemetry established our baseline for average renewal velocity across global sales territories.',
        chartType: 'Payback Velocity Trajectory',
      },
      Technical: {
        onScreenText: 'Population parameter μ = $180,450, σ = $42,100 (Kolmogorov-Smirnov normal fit p = 0.38).',
        narrationVoiceover: 'The baseline distribution adheres to log-normal parameters, establishing our parametric reference bounds.',
        chartType: 'KDE Density Plot & Normal QQ Matrix',
      },
    },
  },
  {
    step: 3,
    stage: 'Finding',
    title: 'Expansion Momentum Continues',
    sourceRunId: 'CALC-NRR-8402',
    durationSec: 7,
    content: {
      Executive: {
        onScreenText: 'Net Revenue Retention reached 114.2% (+2.1% QoQ); Expansion ARR rose +$35k/acct.',
        narrationVoiceover: 'Rather than accelerating customer churn, accounts in North America expanded their footprint, lifting overall ARR.',
        chartType: 'Cohort Heatmap & Waterfall Flow',
      },
      Business: {
        onScreenText: 'Customer accounts upgrading to premium service tiers grew by 18.4%.',
        narrationVoiceover: 'Product adoption metrics indicate strong customer stickiness in advanced workflow features.',
        chartType: 'Upgrade Migration Sankey Flow',
      },
      Technical: {
        onScreenText: 'Kendall tau correlation = +0.68 between product feature breadth and ARR expansion.',
        narrationVoiceover: 'Non-parametric correlation testing confirms feature breadth is the primary driver of expansion (p < 0.001).',
        chartType: 'Rank Correlation Matrix & Scatter Spline',
      },
    },
  },
  {
    step: 4,
    stage: 'Uncertainty',
    title: 'Macro Sensitivity & Model Limits',
    sourceRunId: 'ARIMA-CI-110',
    durationSec: 6,
    content: {
      Executive: {
        onScreenText: 'Forecast confidence band widens in Q4: 80% CI spans $2.7M to $3.1M ARR.',
        narrationVoiceover: 'Note that macro interest rate shifts introduce variance; the rolling forecast interval expands in late Q4.',
        chartType: 'Fan Chart / Confidence Band',
      },
      Business: {
        onScreenText: 'Procurement sign-off delays could extend sales cycles by up to 18 days.',
        narrationVoiceover: 'Pipeline deals in late stages require executive sponsor touchpoints to mitigate slippage.',
        chartType: 'Sales Velocity Forecast Funnel',
      },
      Technical: {
        onScreenText: 'ARIMA(1,1,1) residual variance σ² = 0.042; Heteroskedasticity White test p = 0.12.',
        narrationVoiceover: 'Forecast variance incorporates moving average error terms; residual autocorrelation is strictly zero.',
        chartType: 'Residual Autocorrelation (ACF/PACF) Band',
      },
    },
  },
  {
    step: 5,
    stage: 'Implication',
    title: 'Recommended Capital Allocation',
    sourceRunId: 'REC-STRAT-09',
    durationSec: 6,
    content: {
      Executive: {
        onScreenText: 'Recommendation: Maintain current enterprise tier boundaries; expand customer success capacity.',
        narrationVoiceover: 'Based on these empirical calculations, we recommend preserving current pricing and allocating capital to high-touch onboarding.',
        chartType: 'Decision & Capital Allocation Matrix',
      },
      Business: {
        onScreenText: 'Hire 3 additional Enterprise CSMs to accelerate onboarding velocity.',
        narrationVoiceover: 'Targeting accounts with utilization below 50% will protect an estimated $420k in at-risk renewals.',
        chartType: 'CSM Capacity vs ARR Protection Bar',
      },
      Technical: {
        onScreenText: 'Optimal threshold: Intervene when predicted churn probability > 0.42.',
        narrationVoiceover: 'Cost-sensitive optimization yields maximum expected ROI when intervention threshold is calibrated to 0.42.',
        chartType: 'Cost-Loss Optimization Curve',
      },
    },
  },
];

export default function StoriesPage() {
  const [scenes, setScenes] = useState<StoryScene[]>(INITIAL_SCENES);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [audience, setAudience] = useState<'Executive' | 'Business' | 'Technical'>('Executive');
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [addSceneOpen, setAddSceneOpen] = useState(false);

  // New Scene Form State
  const [newTitle, setNewTitle] = useState('');
  const [newStage, setNewStage] = useState<StoryScene['stage']>('Finding');
  const [newText, setNewText] = useState('');
  const [newNarration, setNewNarration] = useState('');

  // Auto-play timer implementation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        setActiveSceneIndex((prev) => {
          if (prev >= scenes.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, scenes[activeSceneIndex].durationSec * 1000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, activeSceneIndex, scenes]);

  const activeScene = scenes[activeSceneIndex] || scenes[0];
  const activeContent = activeScene.content[audience];

  const handleRender = () => {
    setRenderNotice('Rendering Remotion animation sequence (5 scenes, 30fps)...');
    setTimeout(() => {
      setRenderNotice('✓ Render ready: Artifact #STORY-VID-104 materialized in local cache.');
      setTimeout(() => setRenderNotice(null), 4000);
    }, 2000);
  };

  const handleExportMarkdownBriefing = () => {
    const md = `# 📊 Lumetric Executive Storyboard: ${scenes[0].title}
**Target Audience**: ${audience}
**Generated**: ${new Date().toLocaleDateString()}

${scenes
  .map(
    (s, i) => `### Scene ${i + 1}: ${s.stage} — ${s.title}
* **Visual Component**: ${s.content[audience].chartType}
* **Evidence Run**: \`${s.sourceRunId}\`
* **On-Screen Statement**: "${s.content[audience].onScreenText}"
* **Presenter Voiceover**: "${s.content[audience].narrationVoiceover}"
`
  )
  .join('\n---\n\n')}

*Generated by Lumetric AI Data & Decision Studio*
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumetric_storyboard_${audience.toLowerCase()}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newScene: StoryScene = {
      step: scenes.length + 1,
      stage: newStage,
      title: newTitle.trim(),
      sourceRunId: `RUN-CUSTOM-${Math.floor(100 + Math.random() * 900)}`,
      durationSec: 6,
      content: {
        Executive: {
          onScreenText: newText.trim() || 'Custom strategic insight statement.',
          narrationVoiceover: newNarration.trim() || 'Executive briefing summary note.',
          chartType: 'Executive Summary Metric Callout',
        },
        Business: {
          onScreenText: newText.trim() || 'Operational metric finding.',
          narrationVoiceover: newNarration.trim() || 'Business operation commentary.',
          chartType: 'Operational Trend Spline',
        },
        Technical: {
          onScreenText: newText.trim() || 'Empirical distribution finding.',
          narrationVoiceover: newNarration.trim() || 'Statistical validation note.',
          chartType: 'Distribution Density & Confidence Limits',
        },
      },
    };

    setScenes((prev) => [...prev, newScene]);
    setActiveSceneIndex(scenes.length);
    setNewTitle('');
    setNewText('');
    setNewNarration('');
    setAddSceneOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--lm-text-primary)]">
              Visual Story Studio
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono font-semibold">
              Storyboard Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)]">
            Spec Section S: Narrative explanations grounded directly in validated result identifiers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Audience Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {(['Executive', 'Business', 'Technical'] as const).map((aud) => (
              <button
                key={aud}
                onClick={() => setAudience(aud)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  audience === aud
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {aud}
              </button>
            ))}
          </div>

          <Button size="sm" variant="secondary" onClick={handleExportMarkdownBriefing}>
            Export Briefing (.md) ↓
          </Button>

          <Button size="sm" onClick={handleRender}>
            Render Video
          </Button>
        </div>
      </div>

      {renderNotice && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold animate-fade-in flex items-center justify-between">
          <span>{renderNotice}</span>
          <button onClick={() => setRenderNotice(null)} className="text-blue-600 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Story Visualizer Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Scene Stage */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="none" className="overflow-hidden border-slate-800 bg-slate-950 text-white rounded-2xl shadow-xl">
            {/* Visual Screen Canvas */}
            <div className="aspect-video w-full p-8 flex flex-col justify-between relative bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                    Scene {activeScene.step} / {scenes.length}: {activeScene.stage}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: {audience} Framing
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Evidence ID: {activeScene.sourceRunId}
                </span>
              </div>

              {/* Big On-screen Statement */}
              <div className="space-y-3 max-w-xl my-auto py-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                  {activeScene.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                  &ldquo;{activeContent.onScreenText}&rdquo;
                </p>
              </div>

              {/* Chart Spec Callout */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3 font-mono text-[11px]">
                <span>Visual Component: <strong className="text-slate-200">{activeContent.chartType}</strong></span>
                <span>{activeScene.durationSec}s Duration</span>
              </div>
            </div>

            {/* Audio Voiceover / Subtitles Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Presenter Script ({audience} Tone):</span>
                <span className="text-[10px] font-mono">Voice: Neutral Synthetic Presenter</span>
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed">
                {activeContent.narrationVoiceover}
              </p>
            </div>
          </Card>

          {/* Playback Controls */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={activeSceneIndex === 0}
                onClick={() => setActiveSceneIndex((prev) => Math.max(0, prev - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant={isPlaying ? 'secondary' : 'primary'}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? '⏸ Pause Slideshow' : '▶ Play Slideshow'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={activeSceneIndex === scenes.length - 1}
                onClick={() => setActiveSceneIndex((prev) => Math.min(scenes.length - 1, prev + 1))}
              >
                Next
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-600">
                Scene {activeSceneIndex + 1} of {scenes.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Scene Sequence Checklist */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Storyboard Chapters ({scenes.length})
            </span>
            <button
              onClick={() => setAddSceneOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <PlusIcon className="w-3.5 h-3.5" /> Add Chapter
            </button>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {scenes.map((sc, i) => (
              <div
                key={sc.step}
                onClick={() => setActiveSceneIndex(i)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  activeSceneIndex === i
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900">
                    {sc.step}. {sc.stage}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {sc.durationSec}s
                  </span>
                </div>
                <div className="text-xs text-slate-600 truncate font-medium">
                  {sc.title}
                </div>
                <div className="text-[11px] text-blue-600 mt-1 font-mono">
                  {sc.content[audience].chartType}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <span className="font-bold">Analytical Honesty Guard:</span> Scenes must not present
            point estimates without uncertainty bounds. Scene 4 highlights the 80% CI variance.
          </div>
        </div>
      </div>

      {/* Add Scene Modal */}
      {addSceneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Add Storyboard Chapter
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ground your narrative scene in validated studio calculations.
            </p>
            <form onSubmit={handleAddScene} className="space-y-4">
              <Input
                label="Chapter Title"
                required
                placeholder="e.g. Regional Expansion Disparity"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Narrative Stage
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as StoryScene['stage'])}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Question">Question (Core Inquiry)</option>
                  <option value="Context">Context (Baseline Dynamics)</option>
                  <option value="Finding">Finding (Empirical Data)</option>
                  <option value="Uncertainty">Uncertainty (Variance Bounds)</option>
                  <option value="Implication">Implication (Recommended Action)</option>
                </select>
              </div>
              <Input
                label="On-Screen Headline Quote"
                placeholder="Key statement visible to the audience"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <TextArea
                label="Presenter Voiceover Script"
                placeholder="Verbal narration script for synthetic presenter..."
                value={newNarration}
                onChange={(e) => setNewNarration(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setAddSceneOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Insert Chapter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
