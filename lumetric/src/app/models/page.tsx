'use client';

import React, { useState } from 'react';
import { Card, Button, StatusBadge, Input } from '@/components/ui';
import { PlusIcon } from '@/components/icons';

interface ModelEntry {
  version: string;
  name: string;
  task: 'Classification' | 'Regression' | 'Clustering';
  algorithm: string;
  datasetVersion: string;
  status: 'deployed' | 'approved' | 'reviewed' | 'draft' | 'retired';
  primaryMetric: string;
  metricValue: string;
  calibrationScore: string;
  trainedAt: string;
  cardSummary: string;
}

const INITIAL_MODELS: ModelEntry[] = [
  {
    version: 'v1.4.0',
    name: 'Enterprise Customer Churn Classifier',
    task: 'Classification',
    algorithm: 'LightGBM Gradient Boosting',
    datasetVersion: 'arr_cohorts_v2.4',
    status: 'deployed',
    primaryMetric: 'PR-AUC',
    metricValue: '0.884',
    calibrationScore: 'Brier: 0.042 (Calibrated)',
    trainedAt: '2026-10-16 18:20 UTC',
    cardSummary: 'Predicts high-probability renewal risk 90 days before contract expiry. Preprocessing strictly fitted in-fold.',
  },
  {
    version: 'v1.3.2',
    name: 'Enterprise Customer Churn Classifier',
    task: 'Classification',
    algorithm: 'Random Forest (100 Trees)',
    datasetVersion: 'arr_cohorts_v2.3',
    status: 'approved',
    primaryMetric: 'PR-AUC',
    metricValue: '0.841',
    calibrationScore: 'Brier: 0.061',
    trainedAt: '2026-10-14 11:10 UTC',
    cardSummary: 'Predecessor model; retained for reproducible audit verification and rollback benchmark.',
  },
  {
    version: 'v2.0-candidate',
    name: 'Expansion ARR Elasticity Regressor',
    task: 'Regression',
    algorithm: 'ElasticNet Regularized OLS',
    datasetVersion: 'expansion_signals_v1',
    status: 'reviewed',
    primaryMetric: 'RMSE',
    metricValue: '$3,820',
    calibrationScore: 'R²: 0.74',
    trainedAt: '2026-10-17 08:30 UTC',
    cardSummary: 'Evaluates feature attribution of CSM touchpoints vs seat utilization. Under final validation gate review.',
  },
];

export default function ModelsPage() {
  const [models, setModels] = useState<ModelEntry[]>(INITIAL_MODELS);
  const [selectedModel, setSelectedModel] = useState<ModelEntry>(INITIAL_MODELS[0]);
  const [trainModalOpen, setTrainModalOpen] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [newModelName, setNewModelName] = useState('Renewal Risk Predictor');
  const [newModelTask, setNewModelTask] = useState<'Classification' | 'Regression'>('Classification');

  // Interactive Live Inference Playground State
  const [simUtil, setSimUtil] = useState(68);
  const [simARR, setSimARR] = useState(145000);
  const [simTickets, setSimTickets] = useState(4);
  const [simTenure, setSimTenure] = useState(24);
  const [inferenceResult, setInferenceResult] = useState<{
    score: number;
    riskCategory: 'Low Risk' | 'Moderate Attention' | 'High Risk';
    confidence: string;
    topDriver: string;
  }>({
    score: 0.24,
    riskCategory: 'Low Risk',
    confidence: '95% CI: [0.19 — 0.29]',
    topDriver: 'High Seat Utilization (+34% retention signal)',
  });

  const handleStartTraining = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTraining(true);
    setTrainProgress(15);

    const interval = setInterval(() => {
      setTrainProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            const candidate: ModelEntry = {
              version: `v${(models.length + 1) * 0.5 + 1}.0-candidate`,
              name: newModelName,
              task: newModelTask,
              algorithm: newModelTask === 'Classification' ? 'XGBoost Classifier (Early Stopping)' : 'Lasso Regularized Regression',
              datasetVersion: 'saas_arr_retention_sample.csv',
              status: 'reviewed',
              primaryMetric: newModelTask === 'Classification' ? 'PR-AUC' : 'RMSE',
              metricValue: newModelTask === 'Classification' ? '0.892' : '$2,910',
              calibrationScore: 'Brier: 0.038 (Calibrated)',
              trainedAt: 'Just now',
              cardSummary: 'Trained with 5-fold stratified cross-validation and strict leak-free preprocessing.',
            };
            setModels((curr) => [candidate, ...curr]);
            setSelectedModel(candidate);
            setIsTraining(false);
            setTrainProgress(0);
            setTrainModalOpen(false);
          }, 600);
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  const handleDeploy = (version: string) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.version === version) {
          return { ...m, status: 'deployed' };
        }
        if (m.status === 'deployed') {
          return { ...m, status: 'approved' };
        }
        return m;
      })
    );
    setSelectedModel((prev) => (prev.version === version ? { ...prev, status: 'deployed' } : prev));
  };

  const handleRunInference = () => {
    // Deterministic simulation formula based on input parameters
    const utilFactor = (100 - simUtil) / 100;
    const ticketFactor = Math.min(1, simTickets / 10);
    const tenureFactor = Math.max(0, (36 - simTenure) / 36);
    const rawScore = Math.min(0.98, Math.max(0.04, 0.45 * utilFactor + 0.35 * ticketFactor + 0.20 * tenureFactor));
    const rounded = Math.round(rawScore * 100) / 100;

    let cat: 'Low Risk' | 'Moderate Attention' | 'High Risk' = 'Low Risk';
    if (rounded >= 0.60) cat = 'High Risk';
    else if (rounded >= 0.35) cat = 'Moderate Attention';

    let topDriver = 'Healthy utilization keeps churn probability minimal.';
    if (simTickets >= 6) topDriver = 'Elevated support tickets flagged as leading risk indicator.';
    else if (simUtil <= 40) topDriver = 'Critically depressed seat usage is the dominant churn signal.';

    setInferenceResult({
      score: rounded,
      riskCategory: cat,
      confidence: `95% CI: [${Math.max(0, rounded - 0.05).toFixed(2)} — ${Math.min(1, rounded + 0.05).toFixed(2)}]`,
      topDriver,
    });
  };

  const handleExportModelCard = () => {
    const cardData = {
      modelName: selectedModel.name,
      version: selectedModel.version,
      task: selectedModel.task,
      algorithm: selectedModel.algorithm,
      primaryMetric: `${selectedModel.primaryMetric}: ${selectedModel.metricValue}`,
      calibrationScore: selectedModel.calibrationScore,
      datasetLineage: selectedModel.datasetVersion,
      status: selectedModel.status,
      trainedAt: selectedModel.trainedAt,
      governanceNotes: selectedModel.cardSummary,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(cardData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_card_${selectedModel.version}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lm-text-primary)]">
            Machine Learning Models & Registry
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)]">
            Train, evaluate, and deploy predictive models to forecast revenue, churn, and customer lifetime value.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setTrainModalOpen(true)}
            icon={<PlusIcon className="w-3.5 h-3.5" />}
          >
            Train Candidate Model
          </Button>
        </div>
      </div>

      {/* Model Registry Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--lm-text-primary)]">
            Registered Models ({models.length})
          </h2>
          <span className="text-xs text-slate-500">
            Active in cluster: <strong className="text-emerald-600 font-mono">1 Deployed</strong>
          </span>
        </div>

        <div className="overflow-x-auto border border-[var(--lm-border-default)] rounded-xl bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[var(--lm-border-default)] text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Model Name & Version</th>
                <th className="px-3 py-3">Task & Algorithm</th>
                <th className="px-3 py-3">Validation Metric</th>
                <th className="px-3 py-3">Calibration</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3">Dataset Lineage</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--lm-border-default)]">
              {models.map((m) => {
                const isSelected = selectedModel.version === m.version;
                return (
                  <tr
                    key={m.version}
                    onClick={() => setSelectedModel(m)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-[var(--lm-text-primary)]">
                        {m.name}
                      </div>
                      <span className="font-mono text-[10px] text-blue-600 font-bold">
                        Version: {m.version}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{m.task}</div>
                      <div className="text-[11px] text-slate-500">{m.algorithm}</div>
                    </td>
                    <td className="px-3 py-3 font-mono">
                      <span className="font-bold text-[var(--lm-text-primary)]">{m.metricValue}</span>
                      <span className="text-[10px] text-slate-400 block">({m.primaryMetric})</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                      {m.calibrationScore}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        variant={m.status === 'deployed' ? 'success' : m.status === 'approved' ? 'info' : 'warning'}
                        dot
                      >
                        {m.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {m.datasetVersion}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {m.status !== 'deployed' && (
                          <button
                            onClick={() => handleDeploy(m.version)}
                            className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                          >
                            Deploy →
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedModel(m)}
                          className="text-slate-500 hover:text-slate-900 font-semibold text-[11px]"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Inspector & Interactive Live Prediction Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Model Card Metadata */}
        <div className="lg:col-span-7 space-y-4">
          {selectedModel && (
            <Card padding="md" className="border-[var(--lm-border-default)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--lm-border-default)] pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                    Model Card (Standardized Documentation)
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedModel.name} ({selectedModel.version})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={selectedModel.status === 'deployed' ? 'success' : 'info'}>
                    {selectedModel.status.toUpperCase()}
                  </StatusBadge>
                  <Button size="sm" variant="secondary" onClick={handleExportModelCard} className="text-xs py-1">
                    Export JSON
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <span className="font-semibold text-slate-800 block">Intended Action & Scope:</span>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedModel.cardSummary}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-slate-800 block">Safeguards & Exclusions:</span>
                  <ul className="list-disc list-inside text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1">
                    <li>Strict in-fold target encoding prevents label leakage.</li>
                    <li>Excluded features: demographic & protected identifiers.</li>
                    <li>Cross-validation: 5-Fold Stratified sampling.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--lm-border-default)] text-xs">
                <span className="text-slate-500 font-mono">
                  Trained: {selectedModel.trainedAt}
                </span>
                {selectedModel.status !== 'deployed' && (
                  <Button size="sm" onClick={() => handleDeploy(selectedModel.version)}>
                    Promote to Live Serving Endpoint
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Interactive Live Inference Calculator */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="border-[var(--lm-border-default)] space-y-4 bg-slate-50/50">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono text-blue-600 uppercase font-bold">
                Live Inference Sandbox
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Predictive Feature Simulator
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 font-semibold mb-1">
                  <span>Seat Utilization:</span>
                  <span className="font-mono text-blue-600">{simUtil}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={simUtil}
                  onChange={(e) => setSimUtil(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 font-semibold mb-1">
                  <span>Contract ARR ($):</span>
                  <span className="font-mono text-blue-600">${simARR.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="500000"
                  step="5000"
                  value={simARR}
                  onChange={(e) => setSimARR(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Support Tickets (30d)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={simTickets}
                    onChange={(e) => setSimTickets(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={simTenure}
                    onChange={(e) => setSimTenure(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <Button size="sm" onClick={handleRunInference} className="w-full text-xs">
                Compute Live Prediction Score
              </Button>

              {/* Inference Output Badge */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Model Probability:</span>
                  <span className={`text-sm font-bold font-mono ${
                    inferenceResult.riskCategory === 'High Risk' ? 'text-rose-600' :
                    inferenceResult.riskCategory === 'Moderate Attention' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {(inferenceResult.score * 100).toFixed(0)}% Churn Probability
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Classification:</span>
                  <span className="font-semibold text-slate-900">{inferenceResult.riskCategory}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {inferenceResult.confidence}
                </div>
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 font-medium leading-tight">
                  💡 {inferenceResult.topDriver}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Train Candidate Modal */}
      {trainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Train Candidate ML Model
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Executes in an isolated worker with strict cross-validation.
            </p>
            <form onSubmit={handleStartTraining} className="space-y-4">
              <Input
                label="Model Name"
                required
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Predictive Task
                </label>
                <select
                  value={newModelTask}
                  onChange={(e) => setNewModelTask(e.target.value as 'Classification' | 'Regression')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Classification">Classification (Binary / Multi-class)</option>
                  <option value="Regression">Regression (Continuous Numeric)</option>
                </select>
              </div>

              {isTraining && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Training 5-Fold Cross-Validation...</span>
                    <span>{trainProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${trainProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={isTraining}
                  onClick={() => setTrainModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isTraining}>
                  {isTraining ? 'Training Model...' : 'Start Model Training'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
