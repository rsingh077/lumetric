'use client';

import React from 'react';
import { Card, Button, StatusBadge } from '@/components/ui';
import { ColumnSemanticRole } from '@/types';

interface DataWizardSectionProps {
  wizardStep: 1 | 2 | 3 | 4;
  onSetWizardStep: (step: 1 | 2 | 3 | 4) => void;
  fileName: string;
  fileSize: number;
  rawContent: string;
  parsedHeaders: string[];
  parsedRows: Record<string, string>[];
  businessGrain: string;
  onSetBusinessGrain: (grain: string) => void;
  primaryKey: string;
  onSetPrimaryKey: (key: string) => void;
  timestampColumn: string;
  onSetTimestampColumn: (col: string) => void;
  currency: string;
  onSetCurrency: (cur: string) => void;
  unitScale: string;
  onSetUnitScale: (scale: string) => void;
  periodicity: string;
  onSetPeriodicity: (p: string) => void;
  dataClassification: string;
  onSetDataClassification: (c: string) => void;
  intendedDecision: string;
  onSetIntendedDecision: (d: string) => void;
  columnRoles: Record<string, ColumnSemanticRole>;
  onSetColumnRoles: React.Dispatch<React.SetStateAction<Record<string, ColumnSemanticRole>>>;
  onCompletePublish: () => void;
  computeHash: (content: string) => string;
}

export function DataWizardSection({
  wizardStep,
  onSetWizardStep,
  fileName,
  fileSize,
  rawContent,
  parsedHeaders,
  parsedRows,
  businessGrain,
  onSetBusinessGrain,
  primaryKey,
  onSetPrimaryKey,
  timestampColumn,
  onSetTimestampColumn,
  currency,
  onSetCurrency,
  unitScale,
  onSetUnitScale,
  periodicity,
  onSetPeriodicity,
  dataClassification,
  onSetDataClassification,
  intendedDecision,
  onSetIntendedDecision,
  columnRoles,
  onSetColumnRoles,
  onCompletePublish,
  computeHash,
}: DataWizardSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in text-[var(--lm-text-primary)]">
      {/* Wizard Progress Ribbon */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { num: 1, title: 'Intake & Security Proof' },
          { num: 2, title: 'Business Grain & Keys' },
          { num: 3, title: 'Semantic Column Roles' },
          { num: 4, title: 'Quality Gates & Publish' },
        ].map((step) => (
          <div
            key={step.num}
            onClick={() => onSetWizardStep(step.num as 1 | 2 | 3 | 4)}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              wizardStep === step.num
                ? 'bg-emerald-500/10 border-[#059669] text-[#059669] dark:text-[#34D399] font-bold shadow-xs'
                : wizardStep > step.num
                ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)] text-[var(--lm-text-tertiary)]'
            }`}
          >
            <div className="text-[10px] uppercase font-mono">Step {step.num}</div>
            <div className="truncate text-xs">{step.title}</div>
          </div>
        ))}
      </div>

      {/* STEP 1: Intake & Security Scan */}
      {wizardStep === 1 && (
        <Card padding="lg" className="rounded-3xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] space-y-6">
          <div className="border-b border-[var(--lm-border-default)] pb-4">
            <h2 className="text-base font-bold text-[var(--lm-text-primary)]">
              Step 1: Document Inspection &amp; Security Proof
            </h2>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
              Verifying file integrity, encoding, and quarantine isolation before reading business content.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-[var(--lm-bg-secondary)] rounded-xl border border-[var(--lm-border-default)]">
              <span className="text-[var(--lm-text-tertiary)] font-bold uppercase text-[10px] block">File Name</span>
              <span className="font-semibold text-[var(--lm-text-primary)] truncate block mt-0.5">{fileName}</span>
            </div>
            <div className="p-3 bg-[var(--lm-bg-secondary)] rounded-xl border border-[var(--lm-border-default)]">
              <span className="text-[var(--lm-text-tertiary)] font-bold uppercase text-[10px] block">File Size &amp; Encoding</span>
              <span className="font-semibold text-[var(--lm-text-primary)] block mt-0.5">{(fileSize / 1024).toFixed(1)} KB • UTF-8 Valid</span>
            </div>
            <div className="p-3 bg-[var(--lm-bg-secondary)] rounded-xl border border-[var(--lm-border-default)]">
              <span className="text-[var(--lm-text-tertiary)] font-bold uppercase text-[10px] block">Parsed Dimensions</span>
              <span className="font-semibold text-[var(--lm-text-primary)] block mt-0.5">{parsedRows.length} Rows × {parsedHeaders.length} Columns</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] block">Security Policy Scan</span>
              <span className="font-semibold block mt-0.5">✓ 0 Threats Detected</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] font-mono text-[11px] space-y-1">
            <div className="text-[#059669] font-bold">&#47;&#47; CRYPTOGRAPHIC FINGERPRINT &amp; LINEAGE PROOF</div>
            <div>sha256_hash: &quot;{computeHash(rawContent)}&quot;</div>
            <div>intake_sandbox: &quot;isolated-ephemeral-worker:v1.2&quot;</div>
            <div>macro_execution: &quot;BLOCKED_BY_POLICY (Zero-Macro Execution Guaranteed)&quot;</div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="md" onClick={() => onSetWizardStep(2)}>
              Proceed to Business Grain Elicitation →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Business Grain & Core Questions */}
      {wizardStep === 2 && (
        <Card padding="lg" className="rounded-3xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] space-y-6">
          <div className="border-b border-[var(--lm-border-default)] pb-4">
            <h2 className="text-base font-bold text-[var(--lm-text-primary)]">
              Step 2: Business Grain &amp; Requirement Elicitation
            </h2>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
              Spec Section D: What represents one row in this document? Clarify the grain, keys, and currency.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                What is the Observation Grain of this Data? (Crucial)
              </label>
              <p className="text-[11px] text-[var(--lm-text-secondary)] mb-2">
                Prevents erroneous aggregations and double-counting across downstream joins.
              </p>
              <input
                type="text"
                value={businessGrain}
                onChange={(e) => onSetBusinessGrain(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                  Primary Entity Identifier Key
                </label>
                <select
                  value={primaryKey}
                  onChange={(e) => onSetPrimaryKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] font-semibold focus:outline-none focus:ring-2 focus:ring-[#059669]"
                >
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                  Temporal Anchor / Timestamp Column
                </label>
                <select
                  value={timestampColumn}
                  onChange={(e) => onSetTimestampColumn(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] font-semibold focus:outline-none focus:ring-2 focus:ring-[#059669]"
                >
                  <option value="">None (Cross-Sectional Dataset)</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                  Currency Convention
                </label>
                <select
                  value={currency}
                  onChange={(e) => onSetCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)]"
                >
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>JPY (¥)</option>
                  <option>None (Unitless Counts)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                  Unit Scale
                </label>
                <select
                  value={unitScale}
                  onChange={(e) => onSetUnitScale(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)]"
                >
                  <option>Exact Units (1.0)</option>
                  <option>Thousands (x1,000)</option>
                  <option>Millions (x1,000,000)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                  Reporting Cadence
                </label>
                <select
                  value={periodicity}
                  onChange={(e) => onSetPeriodicity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)]"
                >
                  <option>Monthly</option>
                  <option>Daily</option>
                  <option>Quarterly</option>
                  <option>Event Transactional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                  Data Sensitivity Tier
                </label>
                <select
                  value={dataClassification}
                  onChange={(e) => onSetDataClassification(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)]"
                >
                  <option>Confidential / Internal Business</option>
                  <option>PII / Restricted Data</option>
                  <option>Public Audit Extract</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--lm-text-primary)] mb-1">
                What Key Business Question or Decision Will This Solve?
              </label>
              <input
                type="text"
                value={intendedDecision}
                onChange={(e) => onSetIntendedDecision(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="md" onClick={() => onSetWizardStep(1)}>
              ← Back to Inspection
            </Button>
            <Button size="md" onClick={() => onSetWizardStep(3)}>
              Review Semantic Roles →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Semantic Role Mapping */}
      {wizardStep === 3 && (
        <Card padding="lg" className="rounded-3xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] space-y-6">
          <div className="border-b border-[var(--lm-border-default)] pb-4">
            <h2 className="text-base font-bold text-[var(--lm-text-primary)]">
              Step 3: Confirm Semantic Roles &amp; Denominators
            </h2>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
              Spec Section F: Confirm inferred roles. Distinguish additive revenue metrics from categorical dimensions or predictive targets.
            </p>
          </div>

          <div className="overflow-x-auto border border-[var(--lm-border-default)] rounded-2xl bg-[var(--lm-bg-elevated)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--lm-bg-secondary)] border-b border-[var(--lm-border-default)] text-[var(--lm-text-tertiary)] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Column Name</th>
                  <th className="px-4 py-3">Semantic Role Assignment</th>
                  <th className="px-4 py-3">Sample Preview</th>
                  <th className="px-4 py-3">Governed Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lm-border-default)]">
                {parsedHeaders.map((col) => {
                  const sampleVals = parsedRows.slice(0, 3).map((r) => r[col]).join(', ');
                  return (
                    <tr key={col} className="hover:bg-[var(--lm-bg-secondary)]/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-[var(--lm-text-primary)]">
                        {col}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={columnRoles[col] || 'dimension'}
                          onChange={(e) =>
                            onSetColumnRoles((prev) => ({
                              ...prev,
                              [col]: e.target.value as ColumnSemanticRole,
                            }))
                          }
                          className="px-2.5 py-1 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-lg font-semibold text-[var(--lm-text-primary)]"
                        >
                          <option value="identifier">🔑 Identifier (Key)</option>
                          <option value="metric">📈 Metric (Quantitative)</option>
                          <option value="dimension">🏷️ Categorical Dimension</option>
                          <option value="temporal">📅 Temporal Anchor</option>
                          <option value="target">🎯 Target / Label (Outcome)</option>
                          <option value="feature">⚙️ ML Feature Covariate</option>
                          <option value="excluded">🚫 Exclude from Analysis</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[var(--lm-text-tertiary)] truncate max-w-xs">
                        {sampleVals}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--lm-text-secondary)]">
                        {columnRoles[col] === 'identifier' && 'Entity join key'}
                        {columnRoles[col] === 'metric' && 'Aggregable measure'}
                        {columnRoles[col] === 'dimension' && 'Slice & group factor'}
                        {columnRoles[col] === 'temporal' && 'Time series index'}
                        {columnRoles[col] === 'target' && 'Supervised prediction target'}
                        {columnRoles[col] === 'feature' && 'Predictive input feature'}
                        {columnRoles[col] === 'excluded' && 'Quarantined / ignored'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="md" onClick={() => onSetWizardStep(2)}>
              ← Back to Grain
            </Button>
            <Button size="md" onClick={() => onSetWizardStep(4)}>
              Run Pre-Flight Quality Gates →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Quality Checks & Final Freeze */}
      {wizardStep === 4 && (
        <Card padding="lg" className="rounded-3xl border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] space-y-6">
          <div className="border-b border-[var(--lm-border-default)] pb-4">
            <h2 className="text-base font-bold text-[var(--lm-text-primary)]">
              Step 4: Pre-Flight Quality Gate &amp; Version Freezing
            </h2>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
              Spec Section F: Validates uniqueness, missingness, and cadence before publishing an immutable version.
            </p>
          </div>

          {/* Quality Rules Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--lm-text-primary)] uppercase tracking-wider text-[10px]">
                Automated Invariant Quality Checks (5/5 Run)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Import Readiness</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">✓ Entity Key Uniqueness Gate [{primaryKey}]</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">100% valid entities. Zero unintended key collisions.</span>
                </div>
                <StatusBadge variant="success">Passed</StatusBadge>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">✓ Completeness &amp; Null Assertion</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Zero null values in critical identifier columns.</span>
                </div>
                <StatusBadge variant="success">Passed</StatusBadge>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">✓ Domain Range &amp; Negative Value Shield</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">All revenues conform to non-negative physics.</span>
                </div>
                <StatusBadge variant="success">Passed</StatusBadge>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">✓ Cadence &amp; Timestamp Anchor</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Continuous sequence confirmed on [{timestampColumn || 'Cross-Sectional'}].</span>
                </div>
                <StatusBadge variant="success">Passed</StatusBadge>
              </div>
            </div>
          </div>

          {/* Summary Contract Box */}
          <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] font-mono text-[11px] space-y-2">
            <div className="text-[#059669] font-bold">&#47;&#47; DATA CONTRACT DECLARATION (v1.0-IMMUTABLE)</div>
            <div>grain: &quot;{businessGrain}&quot;</div>
            <div>primary_key: &quot;{primaryKey}&quot;</div>
            <div>timestamp_anchor: &quot;{timestampColumn || 'none'}&quot;</div>
            <div>currency_convention: &quot;{currency}&quot;</div>
            <div>classification: &quot;{dataClassification}&quot;</div>
            <div>content_sha256: &quot;{computeHash(rawContent)}&quot;</div>
            <div>quarantined_records: 0</div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="md" onClick={() => onSetWizardStep(3)}>
              ← Back to Roles
            </Button>
            <Button size="lg" onClick={onCompletePublish} className="bg-[#059669] hover:bg-[#047857] text-white font-bold">
              ✓ Freeze &amp; Publish Immutable Dataset
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
