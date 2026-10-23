'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS = ['⚡', '📊', '🚀', '🔬', '🧠', '🏢', '💎', '🎯', '💡', '🌐', '🛡️', '📈'];

const PRESET_NAMES = [
  'Executive Intelligence',
  'Growth Analytics Hub',
  'FinTech Science Lab',
  'Product & Cohorts Studio',
  'Personal Research Vault',
];

export function WorkspaceSettingsModal({ isOpen, onClose }: WorkspaceSettingsModalProps) {
  const {
    currentWorkspace,
    updateWorkspace,
    workspaces,
    deleteWorkspace,
    projects,
    currentProject,
    updateProject,
    currentUser,
    updateUserProfile,
  } = useApp();

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceIcon, setWorkspaceIcon] = useState('⚡');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [projectName, setProjectName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWorkspaceName(currentWorkspace?.name || '');
      setWorkspaceIcon(currentWorkspace?.icon || '⚡');
      setWorkspaceDesc(currentWorkspace?.description || '');
      setProjectName(currentProject?.name || (projects.length > 0 ? projects[0].name : 'Executive Intelligence'));
      setDisplayName(currentUser?.name || '');
      setOrgName(currentUser?.email ? '' : '');
      setSavedSuccess(false);
    }
  }, [isOpen, currentWorkspace, currentProject, projects, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setIsSaving(true);

    // 1. Update current workspace
    updateWorkspace(currentWorkspace.id, {
      name: workspaceName.trim(),
      icon: workspaceIcon,
      description: workspaceDesc.trim(),
    });

    // 2. Update project name if changed
    if (currentProject && projectName.trim() && projectName.trim() !== currentProject.name) {
      updateProject(currentProject.id, {
        name: projectName.trim(),
      });
    }

    // 3. Update user profile display name if changed
    if (displayName.trim() && displayName.trim() !== currentUser.name) {
      await updateUserProfile({
        name: displayName.trim(),
        organization: orgName.trim() || undefined,
      });
    }

    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleDelete = () => {
    if (workspaces.length <= 1) return;
    if (confirm(`Are you sure you want to delete workspace "${currentWorkspace.name}"?`)) {
      deleteWorkspace(currentWorkspace.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--lm-border-default)] bg-gradient-to-r from-[#059669]/15 via-emerald-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#059669] to-emerald-400 text-white flex items-center justify-center text-xl shadow-md">
              {workspaceIcon}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                Workspace &amp; Studio Branding
              </h3>
              <p className="text-[11px] text-[var(--lm-text-secondary)]">
                Customize your workspace name, icon, and display profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>✓</span>
              <span>Workspace &amp; profile branding successfully updated and synced!</span>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold text-[var(--lm-text-tertiary)] tracking-wider">
              Live Breadcrumb &amp; Header Preview
            </span>
            <div className="flex items-center gap-2 text-xs py-1">
              <span className="font-bold text-[var(--lm-text-primary)] flex items-center gap-1.5 bg-[var(--lm-bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--lm-border-default)]">
                <span>{workspaceIcon}</span>
                <span>{workspaceName.trim() || 'My Studio'}</span>
              </span>
              <span className="text-[var(--lm-text-tertiary)]">/</span>
              <span className="text-[var(--lm-text-secondary)] flex items-center gap-1 font-medium bg-[var(--lm-bg-elevated)] px-2 py-1 rounded-lg border border-[var(--lm-border-default)]">
                <span>📁</span>
                <span>{projectName.trim() || 'Executive Intelligence'}</span>
              </span>
              <span className="text-[var(--lm-text-tertiary)]">/</span>
              <span className="text-[var(--lm-text-tertiary)]">Studio Overview</span>
            </div>
          </div>

          {/* Workspace Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--lm-text-primary)]">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Analytics, Growth Intelligence"
              className="w-full px-3.5 py-2 text-sm bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-colors"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)]">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_NAMES.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setWorkspaceName(name)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:border-[#059669] border border-transparent transition-colors cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Workspace Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--lm-text-primary)]">
              Workspace Icon &amp; Badge
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setWorkspaceIcon(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all cursor-pointer ${
                    workspaceIcon === emoji
                      ? 'border-[#059669] bg-[#059669]/15 shadow-sm scale-105'
                      : 'border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] hover:border-slate-400'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Workspace Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--lm-text-primary)]">
              Workspace Objective / Tagline
            </label>
            <input
              type="text"
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              placeholder="e.g. Primary data science, cohort analysis & presentations"
              className="w-full px-3.5 py-2 text-xs bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-colors"
            />
          </div>

          {/* User Display Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--lm-text-primary)]">
                Your Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jazz Patel, Alex"
                className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-colors"
              />
              <p className="text-[10px] text-[var(--lm-text-tertiary)]">
                Replaces raw email handles in greetings and cards.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--lm-text-primary)]">
                Project Folder Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Executive Intelligence"
                className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-colors"
              />
              <p className="text-[10px] text-[var(--lm-text-tertiary)]">
                Primary project bucket in this workspace.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--lm-border-default)] flex items-center justify-between gap-3">
            {workspaces.length > 1 ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                Delete Workspace
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-tertiary)] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
