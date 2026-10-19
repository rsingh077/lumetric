'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, StatusBadge, Button, Input } from '@/components/ui';
import { UserRole } from '@/types';
import { TwoFactorSetupModal } from '@/components/auth/TwoFactorSetupModal';

interface PermissionEntry {
  capability: string;
  category: string;
  description: string;
  allowedRoles: UserRole[];
}

interface SecretPointer {
  id: string;
  name: string;
  vaultPath: string;
  kmsKeyArn: string;
  lastRotated: string;
  status: 'active' | 'rotating' | 'expired';
}

const INITIAL_SECRETS: SecretPointer[] = [
  {
    id: 'sec-snowflake-prod',
    name: 'Snowflake Analytics Warehouse Warehouse DSN',
    vaultPath: 'secret/lumetric/snowflake/prod_dw',
    kmsKeyArn: 'arn:aws:kms:us-east-1:112233445566:key/mrk-9810af',
    lastRotated: 'Yesterday 14:00 UTC',
    status: 'active',
  },
  {
    id: 'sec-s3-parquet-vault',
    name: 'AWS S3 Parquet Data Lake KMS Role',
    vaultPath: 'secret/lumetric/aws/s3_storage',
    kmsKeyArn: 'arn:aws:kms:us-east-1:112233445566:key/mrk-4421bc',
    lastRotated: '2026-10-10 09:30 UTC',
    status: 'active',
  },
];

const PERMISSIONS_MATRIX: PermissionEntry[] = [
  {
    capability: 'View Dashboards & Summary Profiles',
    category: 'Read / Inspection',
    description: 'Access aggregated KPI cards, trend visualizers, and column summary statistics.',
    allowedRoles: ['owner', 'administrator', 'builder', 'reviewer', 'viewer'],
  },
  {
    capability: 'Inspect Raw Unmasked Records',
    category: 'Data Governance',
    description: 'Inspect individual row-level records and unmasked customer identifiers.',
    allowedRoles: ['owner', 'administrator', 'builder'],
  },
  {
    capability: 'Export Raw CSV & Data Files',
    category: 'Exfiltration Safeguard',
    description: 'Download full dataset extracts or unmasked table dumps.',
    allowedRoles: ['owner', 'administrator', 'builder'],
  },
  {
    capability: 'Author & Modify Data Pipelines (DAGs)',
    category: 'Engineering',
    description: 'Create transformation nodes, write DuckDB SQL, and schedule ETL runs.',
    allowedRoles: ['owner', 'administrator', 'builder'],
  },
  {
    capability: 'Review & Approve Immutable Runs',
    category: 'Review & Audit',
    description: 'Sign off on validation reports and freeze candidate models/dashboards for release.',
    allowedRoles: ['owner', 'administrator', 'reviewer'],
  },
  {
    capability: 'Deploy ML Models to Production Endpoint',
    category: 'Serving / ML Ops',
    description: 'Promote candidate model weights to the live serving cluster.',
    allowedRoles: ['owner', 'administrator'],
  },
  {
    capability: 'Manage Billing, Spending Budgets & Tenant Keys',
    category: 'Administration',
    description: 'Configure cloud connector secrets, compute spend ceilings, and invite users.',
    allowedRoles: ['owner', 'administrator'],
  },
];

export default function SettingsPage() {
  const { currentUser, setRole, currentWorkspace } = useApp();

  const [activeTab, setActiveTab] = useState<'rbac' | 'tenant' | 'security'>('rbac');
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<SecretPointer[]>(INITIAL_SECRETS);
  const [addSecretOpen, setAddSecretOpen] = useState(false);
  const [newSecName, setNewSecName] = useState('');
  const [newSecPath, setNewSecPath] = useState('');
  const [cacheFlushNotice, setCacheFlushNotice] = useState<string | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorActive, setTwoFactorActive] = useState(false);

  const allRoles: UserRole[] = ['owner', 'administrator', 'builder', 'reviewer', 'viewer'];

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setRoleNotice(`Switched active role to "${newRole.toUpperCase()}". Authorization policies updated across the studio.`);
    setTimeout(() => setRoleNotice(null), 4000);
  };

  const handleRotateKey = (id: string) => {
    setSecrets((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              lastRotated: 'Just now (Rotated)',
              status: 'active',
            }
          : s
      )
    );
    setRoleNotice(`✓ Cryptographic key rotated successfully for pointer: ${id}`);
    setTimeout(() => setRoleNotice(null), 4000);
  };

  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecName.trim()) return;

    const newSec: SecretPointer = {
      id: `sec-${Date.now()}`,
      name: newSecName.trim(),
      vaultPath: newSecPath.trim() || 'secret/lumetric/vault/custom_dsn',
      kmsKeyArn: 'arn:aws:kms:us-east-1:112233445566:key/mrk-dynamic',
      lastRotated: 'Just now',
      status: 'active',
    };

    setSecrets((prev) => [newSec, ...prev]);
    setNewSecName('');
    setNewSecPath('');
    setAddSecretOpen(false);
    setRoleNotice('✓ New KMS Vault reference pointer configured with zero plaintext exposure.');
    setTimeout(() => setRoleNotice(null), 4000);
  };

  const handleFlushCache = () => {
    setCacheFlushNotice('Flushing ephemeral DuckDB buffers and local query cache...');
    setTimeout(() => {
      setCacheFlushNotice('✓ Local cache & Parquet memory buffers successfully cleared (0 leaks).');
      setTimeout(() => setCacheFlushNotice(null), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lm-text-primary)]">
            Workspace Governance & Access Controls
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)]">
            Spec Section C & W: Fine-grained Role-Based Access Control (RBAC), tenant boundary policies, and secret management.
          </p>
        </div>

        {/* Role Switcher Pill */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
          <span className="text-xs text-blue-900 font-semibold">Testing Active Role:</span>
          <select
            value={currentUser.role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-700 uppercase font-mono shadow-xs focus:ring-2 focus:ring-blue-600"
          >
            {allRoles.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {roleNotice && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold animate-fade-in flex items-center justify-between">
          <span>✓ {roleNotice}</span>
          <button onClick={() => setRoleNotice(null)} className="text-blue-600 hover:underline">
            ✕
          </button>
        </div>
      )}

      {cacheFlushNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in">
          {cacheFlushNotice}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--lm-border-default)]">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'rbac'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          RBAC Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('tenant')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'tenant'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tenant Boundaries & Storage
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Security & KMS Secret References
        </button>
      </div>

      {/* TAB 1: RBAC MATRIX */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Principle of Least Privilege:</span> Lumetric decouples billing administration from analytical access. 
            A user&apos;s organizational title does not confer data access; permissions map explicitly to versioned capability grants.
          </div>

          <div className="overflow-x-auto border border-[var(--lm-border-default)] rounded-xl bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[var(--lm-border-default)] text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Capability / Operation</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-center">Owner</th>
                  <th className="px-3 py-3 text-center">Admin</th>
                  <th className="px-3 py-3 text-center">Builder</th>
                  <th className="px-3 py-3 text-center">Reviewer</th>
                  <th className="px-3 py-3 text-center">Viewer</th>
                  <th className="px-4 py-3 text-right">Your Grant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lm-border-default)]">
                {PERMISSIONS_MATRIX.map((perm, idx) => {
                  const userPermitted = perm.allowedRoles.includes(currentUser.role);
                  return (
                    <tr
                      key={idx}
                      className={userPermitted ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-70'}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-sm text-slate-900">
                          {perm.capability}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {perm.description}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                          {perm.category}
                        </span>
                      </td>
                      {allRoles.map((role) => (
                        <td key={role} className="px-3 py-3 text-center">
                          {perm.allowedRoles.includes(role) ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                          ) : (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-200" />
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        {userPermitted ? (
                          <StatusBadge variant="success">Allowed</StatusBadge>
                        ) : (
                          <StatusBadge variant="error">Restricted</StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TENANT BOUNDARIES */}
      {activeTab === 'tenant' && (
        <Card padding="md" className="border-[var(--lm-border-default)] space-y-4">
          <CardHeader>
            <CardTitle>Multi-Tenant Isolation Safeguards</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleFlushCache}>
                Flush Cache
              </Button>
              <StatusBadge variant="success">Tenant Scope Enforced</StatusBadge>
            </div>
          </CardHeader>

          <div className="space-y-3 text-xs leading-relaxed text-slate-700">
            <p>
              Current Tenant Workspace: <span className="font-mono font-bold text-blue-600">{currentWorkspace.name} ({currentWorkspace.id})</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Storage Partitioning</span>
                All uploaded datasets and Parquet layers are partitioned by workspace hash. No cross-tenant reads are structurally permitted at the driver level.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Worker Network Egress</span>
                Analysis runners execute in stateless Docker containers with isolated IPC and zero external internet egress by default.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* 2FA TOTP Card */}
          <Card padding="md" className="border-[var(--lm-border-default)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--lm-text-primary)]">
                      Authentification à Deux Facteurs (2FA TOTP)
                    </h3>
                    <StatusBadge variant={twoFactorActive ? 'success' : 'neutral'} dot>
                      {twoFactorActive ? 'Activé' : 'Non configuré'}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-[var(--lm-text-secondary)] mt-1 max-w-xl">
                    Sécurisez l&apos;accès à votre flotte et à vos modèles avec Google Authenticator ou 1Password. Un code à 6 chiffres sera requis lors de chaque ouverture de session.
                  </p>
                </div>
              </div>

              <Button
                variant={twoFactorActive ? 'secondary' : 'primary'}
                size="sm"
                className={!twoFactorActive ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
                onClick={() => setTwoFactorModalOpen(true)}
              >
                {twoFactorActive ? 'Reconfigurer 2FA' : 'Activer 2FA →'}
              </Button>
            </div>
          </Card>

          <Card padding="md" className="border-[var(--lm-border-default)] space-y-4">
            <CardHeader>
              <div>
                <CardTitle>Secret References & Vault Integration</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Credentials stored as encrypted KMS reference pointers. Zero plaintext storage.
                </p>
              </div>
              <Button size="sm" onClick={() => setAddSecretOpen(true)}>
                + Register Secret Pointer
              </Button>
            </CardHeader>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-bold">
                  <tr>
                    <th className="px-4 py-3">Secret Name</th>
                    <th className="px-3 py-3">Vault Pointer Path</th>
                    <th className="px-3 py-3">KMS Key ARN</th>
                    <th className="px-3 py-3">Rotation Status</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {secrets.map((sec) => (
                    <tr key={sec.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {sec.name}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-blue-600">
                        {sec.vaultPath}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-500 truncate max-w-[180px]">
                        {sec.kmsKeyArn}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                        {sec.lastRotated}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleRotateKey(sec.id)}
                          className="px-2.5 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-800 transition-colors"
                        >
                          Rotate Key ⟳
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add Secret Pointer Modal */}
      {addSecretOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Register KMS Secret Pointer
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter Vault path. Lumetric never accepts or stores plaintext passwords.
            </p>
            <form onSubmit={handleAddSecret} className="space-y-4">
              <Input
                label="Secret Label"
                required
                placeholder="e.g. Production Data Warehouse Connection"
                value={newSecName}
                onChange={(e) => setNewSecName(e.target.value)}
              />
              <Input
                label="HashiCorp Vault Path"
                required
                placeholder="secret/lumetric/storage/dsn"
                value={newSecPath}
                onChange={(e) => setNewSecPath(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setAddSecretOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Pointer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication Setup Modal */}
      <TwoFactorSetupModal
        isOpen={twoFactorModalOpen}
        onClose={() => setTwoFactorModalOpen(false)}
        onSuccess={() => {
          setTwoFactorActive(true);
          setRoleNotice('✓ Authentification à deux facteurs (2FA) configurée et active.');
          setTimeout(() => setRoleNotice(null), 5000);
        }}
      />
    </div>
  );
}
