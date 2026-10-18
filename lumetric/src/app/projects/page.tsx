'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, StatusBadge, Input, TextArea } from '@/components/ui';
import { FolderIcon, PlusIcon } from '@/components/icons';
import { Project } from '@/types';

export default function ProjectsPage() {
  const { currentWorkspace, projects, selectProject, createProject, currentProject, setActiveView } = useApp();

  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);

  // Sync with context projects
  const workspaceProjects = (localProjects.length ? localProjects : projects).filter(
    (p) => p.workspaceId === currentWorkspace.id
  );

  const filtered = workspaceProjects.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.objective && p.objective.toLowerCase().includes(filter.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(filter.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesText && matchesStatus;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newPrj = createProject(name.trim(), objective.trim(), description.trim());
    setLocalProjects((prev) => [newPrj, ...prev]);
    setName('');
    setObjective('');
    setDescription('');
    setModalOpen(false);
  };

  const handleToggleArchive = (projectId: string) => {
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, status: p.status === 'archived' ? 'active' : 'archived' }
          : p
      )
    );
  };

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to remove this project?')) {
      setLocalProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (currentProject?.id === projectId) {
        selectProject(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--lm-border-default)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--lm-text-primary)]">
            Projects Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lm-text-secondary)]">
            Investigative units scoped to <span className="font-semibold text-blue-600">{currentWorkspace.name}</span>.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          icon={<PlusIcon className="w-4 h-4" />}
          size="sm"
        >
          New Project
        </Button>
      </div>

      {/* Active Project Banner if selected */}
      {currentProject && (
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              ✓
            </span>
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Currently Active Project
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                {currentProject.name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => setActiveView('dashboards')}>
              View Dashboards →
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => selectProject(null)}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="w-full sm:w-72">
          <Input
            label=""
            placeholder="Search projects or objectives..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="py-1 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['all', 'active', 'draft', 'archived'].map((st) => (
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

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-12 rounded-2xl">
          <FolderIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Projects Match</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Try adjusting your search criteria or create a new project.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Create Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prj) => {
            const isSelected = currentProject?.id === prj.id;
            return (
              <Card
                key={prj.id}
                padding="md"
                className={`border flex flex-col justify-between rounded-2xl transition-all ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                    : 'border-[var(--lm-border-default)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                      {prj.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                      <StatusBadge
                        variant={prj.status === 'active' ? 'success' : prj.status === 'archived' ? 'stale' : 'neutral'}
                        dot
                      >
                        {prj.status}
                      </StatusBadge>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mb-1">
                    {prj.name}
                  </h3>

                  {prj.objective && (
                    <p className="text-xs text-blue-700 font-semibold mb-2 bg-blue-50/70 p-2 rounded-xl border border-blue-100">
                      {prj.objective}
                    </p>
                  )}

                  {prj.description && (
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      {prj.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--lm-border-default)] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {new Date(prj.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={isSelected ? 'secondary' : 'primary'}
                      onClick={() => selectProject(isSelected ? null : prj.id)}
                      className="text-xs py-1"
                    >
                      {isSelected ? 'Deselect' : 'Select'}
                    </Button>
                    <button
                      onClick={() => handleToggleArchive(prj.id)}
                      title={prj.status === 'archived' ? 'Unarchive' : 'Archive'}
                      className="p-1.5 text-xs text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      {prj.status === 'archived' ? '📤' : '📦'}
                    </button>
                    <button
                      onClick={() => handleDelete(prj.id)}
                      title="Delete project"
                      className="p-1.5 text-xs text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Create New Project
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Scoped in workspace: <span className="font-semibold text-blue-600">{currentWorkspace.name}</span>
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Project Name"
                required
                placeholder="e.g. Q4 Gross Margin & Channel Profitability"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Business Objective (Key Question)"
                placeholder="e.g. Determine whether discounting increases net contribution margin"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
              <TextArea
                label="Scope & Methodology Notes"
                placeholder="Assumptions, baseline period, intended decision audience"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
