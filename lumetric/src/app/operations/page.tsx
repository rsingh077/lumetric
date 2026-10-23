'use client';

import React, { useState, useMemo } from 'react';
import { Card, Button, StatusBadge, Input } from '@/components/ui';

interface OrchestratorJob {
  id: string;
  pipeline: string;
  trigger: 'Schedule (Cron)' | 'Manual Ad-hoc' | 'Webhook';
  status: 'succeeded' | 'running' | 'queued' | 'failed';
  startedAt: string;
  duration: string;
  resourceUse: string;
  checkpoint: string;
  logs?: string[];
}

const INITIAL_JOBS: OrchestratorJob[] = [
  {
    id: 'job-run-9021',
    pipeline: 'Enterprise ARR Reconciliation & Ingestion',
    trigger: 'Schedule (Cron)',
    status: 'succeeded',
    startedAt: 'Today 04:00 UTC',
    duration: '42s',
    resourceUse: '1.2 vCPU • 820MB',
    checkpoint: 'Step 5: Published gold layer to DuckDB',
    logs: [
      '[04:00:00] Initializing Docker worker sandbox (cgroup limit: 2GB)...',
      '[04:00:02] Ingesting Parquet snapshot into memory buffer...',
      '[04:00:18] Checking invariant: zero duplicate customer keys...',
      '[04:00:35] Computing semi-additive monthly ARR cohort rollup...',
      '[04:00:42] Success: Gold layer table swap committed with zero downtime.',
    ],
  },
  {
    id: 'job-run-9020',
    pipeline: 'Daily Churn Risk Scoring Batch',
    trigger: 'Schedule (Cron)',
    status: 'succeeded',
    startedAt: 'Today 03:00 UTC',
    duration: '1m 15s',
    resourceUse: '2.0 vCPU • 1.4GB',
    checkpoint: 'Scored 1,240 accounts to audit table',
    logs: [
      '[03:00:00] Worker spinup complete. Pulling model weights v1.4.0...',
      '[03:00:15] Feeding 1,240 account feature vectors into LightGBM predictor...',
      '[03:01:02] In-fold calibration asserted (Brier score: 0.042)...',
      '[03:01:15] Success: Scored predictions written to data warehouse.',
    ],
  },
  {
    id: 'job-run-9019',
    pipeline: 'External CRM Telemetry Sync',
    trigger: 'Webhook',
    status: 'succeeded',
    startedAt: 'Yesterday 22:30 UTC',
    duration: '28s',
    resourceUse: '0.8 vCPU • 410MB',
    checkpoint: 'Incremental append 142 records with hash check',
    logs: [
      '[22:30:00] Webhook payload received from Salesforce EventBus...',
      '[22:30:04] Validating schema constraints against contract spec...',
      '[22:30:22] Appending 142 verified delta records...',
      '[22:30:28] Success: Checkpoint hash anchored to audit log.',
    ],
  },
  {
    id: 'job-run-9018',
    pipeline: 'WACC Sensitivity Grid Recomputation',
    trigger: 'Manual Ad-hoc',
    status: 'failed',
    startedAt: 'Yesterday 17:15 UTC',
    duration: '12s',
    resourceUse: '1.0 vCPU • 520MB',
    checkpoint: 'Error: Terminal growth rate (3.5%) exceeded WACC (3.2%)',
    logs: [
      '[17:15:00] Initializing ad-hoc DCF discount valuation worker...',
      '[17:15:05] Loading scenario variables: WACC = 3.2%, Growth = 3.5%...',
      '[17:15:12] FATAL: Convergence constraint violated. Terminal growth cannot exceed discount rate.',
      '[17:15:12] Rollback executed: zero dirty state persisted.',
    ],
  },
];

export default function OperationsPage() {
  const [jobs, setJobs] = useState<OrchestratorJob[]>(INITIAL_JOBS);
  const [selectedJob, setSelectedJob] = useState<OrchestratorJob>(INITIAL_JOBS[0]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [paused, setPaused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLogNotice, setCopiedLogNotice] = useState(false);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchStatus = statusFilter === 'all' || j.status === statusFilter;
      const matchSearch =
        j.pipeline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.checkpoint.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [jobs, statusFilter, searchQuery]);

  const handleTriggerRun = () => {
    setIsTriggering(true);
    const newId = `job-run-${Math.floor(1000 + Math.random() * 9000)}`;
    const runningJob: OrchestratorJob = {
      id: newId,
      pipeline: 'Ad-hoc Cohort Retention & Churn Scoring',
      trigger: 'Manual Ad-hoc',
      status: 'running',
      startedAt: 'Just now',
      duration: 'In progress...',
      resourceUse: '1.5 vCPU • 650MB',
      checkpoint: 'Executing Step 2: Applying in-fold imputation',
      logs: [
        `[${new Date().toLocaleTimeString()}] Spawning isolated container runner...`,
        `[${new Date().toLocaleTimeString()}] Mounting DuckDB in-memory workspace...`,
        `[${new Date().toLocaleTimeString()}] Processing records with zero data leakage...`,
      ],
    };

    setJobs((prev) => [runningJob, ...prev]);
    setSelectedJob(runningJob);

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newId
            ? {
                ...j,
                status: 'succeeded',
                duration: '3.4s',
                checkpoint: 'Completed: Checkpoint verified and cached.',
                logs: [
                  ...(j.logs || []),
                  `[${new Date().toLocaleTimeString()}] Checkpoint verified: SHA-256 integrity passed.`,
                  `[${new Date().toLocaleTimeString()}] Success: Execution exited with code 0.`,
                ],
              }
            : j
        )
      );
      setSelectedJob((prev) =>
        prev.id === newId
          ? {
              ...prev,
              status: 'succeeded',
              duration: '3.4s',
              checkpoint: 'Completed: Checkpoint verified and cached.',
            }
          : prev
      );
      setIsTriggering(false);
    }, 2200);
  };

  const handleRetryJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'running',
              duration: 'Retrying...',
              checkpoint: 'Re-evaluating mathematical convergence boundaries...',
            }
          : j
      )
    );

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'succeeded',
                duration: '18s',
                checkpoint: 'Recovered: Terminal growth rate clamped to 2.8% (< WACC 3.2%).',
                logs: [
                  ...(j.logs || []),
                  `[${new Date().toLocaleTimeString()}] Retry initiated by user. Boundary clamped.`,
                  `[${new Date().toLocaleTimeString()}] Sensitivity grid recomputed successfully.`,
                ],
              }
            : j
        )
      );
      setSelectedJob((prev) =>
        prev.id === jobId
          ? {
              ...prev,
              status: 'succeeded',
              duration: '18s',
              checkpoint: 'Recovered: Terminal growth rate clamped to 2.8% (< WACC 3.2%).',
            }
          : prev
      );
    }, 1800);
  };

  const handleCopyLogs = () => {
    const text = (selectedJob.logs || [selectedJob.checkpoint]).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogNotice(true);
    setTimeout(() => setCopiedLogNotice(false), 3000);
  };

  const handleExportAuditJson = () => {
    const payload = {
      clusterId: 'dagster-prod-cluster-01',
      exportedAt: new Date().toISOString(),
      activeJobs: jobs,
      totalRuns: jobs.length,
      successRate: `${((jobs.filter((j) => j.status === 'succeeded').length / jobs.length) * 100).toFixed(1)}%`,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orchestrator_audit_dossier_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lm-text-primary)]">
            Operations & Orchestration Console
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)]">
            Monitor pipeline executions, schedule data syncs, and view system health and runtime metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Resume All Schedules' : 'Pause All Schedules'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportAuditJson}
          >
            Export Audit (JSON) ↓
          </Button>
          <Button
            size="sm"
            onClick={handleTriggerRun}
            disabled={isTriggering}
          >
            {isTriggering ? 'Executing Run...' : 'Trigger Pipeline Run'}
          </Button>
        </div>
      </div>

      {paused && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between animate-fade-in">
          <span>⚠️ All automated background cron schedules are currently paused. Manual runs remain enabled.</span>
          <button onClick={() => setPaused(false)} className="underline font-bold text-amber-800">
            Resume Now
          </button>
        </div>
      )}

      {/* Cluster & Worker Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="rounded-2xl">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
            Orchestrator Core
          </span>
          <div className="text-base font-bold text-[var(--lm-text-primary)] mt-1">
            Dagster Engine v1.8
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            ● Status: Healthy (0 degraded queues)
          </div>
        </Card>

        <Card padding="sm" className="rounded-2xl">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
            Worker Sandboxes
          </span>
          <div className="text-base font-bold text-[var(--lm-text-primary)] mt-1">
            Isolated Docker Runners
          </div>
          <div className="text-xs text-[var(--lm-text-secondary)] mt-1">
            Pool: 4 active / 8 max concurrency
          </div>
        </Card>

        <Card padding="sm" className="rounded-2xl">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
            Job Delivery Semantics
          </span>
          <div className="text-base font-bold text-[var(--lm-text-primary)] mt-1">
            Idempotent Execution
          </div>
          <div className="text-xs text-blue-600 font-medium mt-1">
            Checkpoints & atomic table swap
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="w-full sm:w-72">
          <Input
            label=""
            placeholder="Search runs, pipelines, checkpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="py-1 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['all', 'succeeded', 'running', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Jobs Layout: Table on Left + Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="overflow-x-auto border border-[var(--lm-border-default)] rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[var(--lm-border-default)] text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Job ID & Pipeline</th>
                  <th className="px-3 py-3">Trigger Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Execution Time</th>
                  <th className="px-3 py-3">Compute Burden</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lm-border-default)]">
                {filteredJobs.map((j) => {
                  const isSelected = selectedJob.id === j.id;
                  return (
                    <tr
                      key={j.id}
                      onClick={() => setSelectedJob(j)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block truncate max-w-[220px]">
                          {j.pipeline}
                        </span>
                        <span className="font-mono text-[10px] text-blue-600 font-bold">{j.id}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{j.trigger}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          variant={j.status === 'succeeded' ? 'success' : j.status === 'failed' ? 'error' : 'info'}
                          dot
                        >
                          {j.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                        {j.startedAt} ({j.duration})
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                        {j.resourceUse}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {j.status === 'failed' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryJob(j.id);
                            }}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-colors"
                          >
                            Retry ⟳
                          </button>
                        ) : (
                          <button className="text-slate-400 hover:text-slate-700 font-semibold text-[11px]">
                            Logs →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Terminal & Checkpoint Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <Card padding="md" className="border-[var(--lm-border-default)] space-y-3 rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--lm-border-default)] pb-2.5">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Stdout & Checkpoint Stream
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedJob.id}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyLogs}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
                >
                  {copiedLogNotice ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Pipeline:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                  {selectedJob.pipeline}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exit Checkpoint:</span>
                <span className="font-mono text-slate-700 text-right text-[11px]">
                  {selectedJob.checkpoint}
                </span>
              </div>
            </div>

            {/* Terminal Window */}
            <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-200 space-y-1.5 overflow-x-auto max-h-56">
              {(selectedJob.logs || [
                `[00:00:01] Spawning container for ${selectedJob.pipeline}...`,
                `[00:00:08] Processing checkpoint: ${selectedJob.checkpoint}`,
                `[00:00:15] Completed with status: ${selectedJob.status.toUpperCase()}`,
              ]).map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('FATAL') || log.includes('Error')
                      ? 'text-rose-400 font-semibold'
                      : log.includes('Success')
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>

            {selectedJob.status === 'failed' && (
              <Button size="sm" onClick={() => handleRetryJob(selectedJob.id)} className="w-full text-xs">
                Retry Failed Job with Clamped Bounds
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
