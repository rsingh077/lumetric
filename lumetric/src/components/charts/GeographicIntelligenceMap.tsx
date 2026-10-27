'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GlobeIcon, MaximizeIcon } from '@/components/icons';
import { REAL_WORLD_COUNTRIES, WorldCountryEntity } from './worldCountriesData';
import { OFFICIAL_INDIA_STATES, IndiaStateEntity } from './indiaStatesData';
import { OFFICIAL_US_STATES, USStateEntity } from './usStatesData';
import { parseNumeric } from '@/lib/csvParser';

export type GeographicGranularity = 'world' | 'us-states' | 'india-states';

export interface GeographicIntelligenceMapProps {
  rows: Record<string, string>[];
  allDatasetRows?: Record<string, string>[];
  columns?: { name: string; inferredType?: string }[];
  currentMetric: string;
  metricLabel?: string;
  isCurrency?: boolean;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface GeoEntity {
  id: string;
  code?: string;
  name: string;
  label: string;
  subLabel?: string;
  d: string;
  centroid: [number, number];
  aliases: string[];
  parentRegion?: string;
}

// ============================================================================
// 1. REAL WORLD 176 SOVEREIGN COUNTRIES FROM TOPOLOGICAL ATLAS (1000 x 520)
// ============================================================================
const WORLD_ENTITIES: GeoEntity[] = REAL_WORLD_COUNTRIES.map((c: WorldCountryEntity) => ({
  id: c.code.toLowerCase(),
  code: c.code,
  name: c.name,
  label: c.name,
  subLabel: `${c.code} • Sovereign Country`,
  d: c.d,
  centroid: c.centroid,
  aliases: c.aliases,
  parentRegion: 'Global',
}));

// ============================================================================
// 2. OFFICIAL SURVEY OF INDIA 37 STATES & UNION TERRITORIES (650 x 750)
// ============================================================================
const INDIA_ENTITIES: GeoEntity[] = OFFICIAL_INDIA_STATES;

// ============================================================================
// 3. OFFICIAL UNITED STATES 50 STATES + DC (900 x 550)
// ============================================================================
const US_ENTITIES: GeoEntity[] = OFFICIAL_US_STATES;

// Helper to determine if a value strictly matches an alias
function matchesAliasStrict(rawVal: string, alias: string): boolean {
  if (!rawVal || !alias) return false;
  const v = rawVal.toLowerCase().trim();
  const a = alias.toLowerCase().trim();

  // Exact match
  if (v === a) return true;

  // For short acronyms (<= 3 chars like 'in', 'ca', 'us', 'la', 'up', 'mp'), ONLY exact match is allowed
  if (a.length <= 3) return false;

  // For longer words (>= 4 chars like 'india', 'california', 'united states', 'maharashtra'), match word boundaries
  const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRegex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return wordRegex.test(v);
}

// Compact metric formatter
function formatMetricVal(val: number, isCurrency = false): string {
  const prefix = isCurrency ? '$' : '';
  if (Math.abs(val) >= 1_000_000_000) {
    return `${prefix}${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `${prefix}${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${prefix}${(val / 1_000).toFixed(1)}k`;
  }
  return `${prefix}${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

export function GeographicIntelligenceMap({
  rows,
  allDatasetRows = rows,
  columns = [],
  currentMetric,
  metricLabel,
  isCurrency = false,
  selectedRegion,
  onSelectRegion,
  className = '',
  isExpanded = false,
  onToggleExpand,
}: GeographicIntelligenceMapProps) {
  const [userModeOverride, setUserModeOverride] = useState<GeographicGranularity | null>(null);
  const [inspectedEntityId, setInspectedEntityId] = useState<string | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{
    entity: GeoEntity;
    totalVal: number;
    count: number;
    percentage: number;
    x: number;
    y: number;
  } | null>(null);

  // Expanded View Interactive Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [radarActive, setRadarActive] = useState<boolean>(true);
  const [radarX, setRadarX] = useState<number>(0);
  const [mouseCoords, setMouseCoords] = useState<{ lat: string; lon: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 1. INTELLIGENT AUTO-DETECTION ENGINE
  const detectedGranularity = useMemo<{
    mode: GeographicGranularity;
    reason: string;
  }>(() => {
    let worldScore = 0;
    let indiaStateScore = 0;
    let usStateScore = 0;

    const sampleRows = allDatasetRows.slice(0, 300);

    // Identify candidate columns
    const geoColNames = columns
      .filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('country') ||
          n.includes('nation') ||
          n.includes('state') ||
          n.includes('province') ||
          n.includes('region') ||
          n.includes('city') ||
          n.includes('location') ||
          n.includes('territory')
        );
      })
      .map((c) => c.name);

    const targetCols = geoColNames.length > 0 ? geoColNames : Object.keys(sampleRows[0] || {});

    sampleRows.forEach((r) => {
      targetCols.forEach((col) => {
        const rawVal = (r[col] || '').trim();
        if (!rawVal) return;

        const isCountryCol = col.toLowerCase().includes('country') || col.toLowerCase().includes('nation');
        const isStateCol = col.toLowerCase().includes('state') || col.toLowerCase().includes('province');

        // Check World matches
        WORLD_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => matchesAliasStrict(rawVal, alias))) {
            worldScore += isCountryCol ? 10 : 4;
          }
        });

        // Check India State matches
        INDIA_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => matchesAliasStrict(rawVal, alias))) {
            indiaStateScore += isStateCol ? 10 : 4;
          }
        });

        // Check US State matches
        US_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => matchesAliasStrict(rawVal, alias))) {
            usStateScore += isStateCol ? 10 : 4;
          }
        });
      });
    });

    // Scoring resolution: pick the strongest matching granularity
    if (indiaStateScore > worldScore && indiaStateScore > usStateScore && indiaStateScore >= 8) {
      return {
        mode: 'india-states',
        reason: 'India State & Regional Dataset',
      };
    }
    if (usStateScore > worldScore && usStateScore > indiaStateScore && usStateScore >= 8) {
      return {
        mode: 'us-states',
        reason: 'United States State Dataset',
      };
    }

    // Default to World map (Universal Global View matching user reference)
    return {
      mode: 'world',
      reason: 'Real Sovereign World Map (176 Countries)',
    };
  }, [allDatasetRows, columns]);

  // Active granularity (User override takes precedence)
  const activeGranularity = userModeOverride || detectedGranularity.mode;

  // Current entity registry
  const currentRegistry = useMemo(() => {
    if (activeGranularity === 'india-states') {
      return {
        viewBox: '0 0 650 750',
        width: 650,
        height: 750,
        entities: INDIA_ENTITIES,
        mapTitle: 'Survey of India (37 States & Union Territories)',
      };
    }
    if (activeGranularity === 'us-states') {
      return {
        viewBox: '0 0 900 550',
        width: 900,
        height: 550,
        entities: US_ENTITIES,
        mapTitle: 'United States (50 States & DC)',
      };
    }
    return {
      viewBox: '0 0 1000 520',
      width: 1000,
      height: 520,
      entities: WORLD_ENTITIES,
      mapTitle: 'Real Geographic World Intelligence (176 Sovereign Countries)',
    };
  }, [activeGranularity]);

  // Animated Radar Scan Beam
  useEffect(() => {
    if (!radarActive) return;
    let animFrame: number;
    let curX = 0;
    const speed = isExpanded ? 3.2 : 2.0;
    const maxX = currentRegistry.width + 60;

    const tick = () => {
      curX += speed;
      if (curX > maxX) curX = -50;
      setRadarX(curX);
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [radarActive, isExpanded, currentRegistry.width]);

  // Reset Zoom on Collapse or Granularity Switch
  useEffect(() => {
    if (!isExpanded) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isExpanded, activeGranularity]);

  // Metric Aggregator & Entity Mapping
  const entityDataMap = useMemo(() => {
    const dataMap = new Map<string, { totalVal: number; count: number; intensity: number }>();
    let grandTotal = 0;
    let maxEntityVal = 0;

    // Initialize map
    currentRegistry.entities.forEach((ent) => {
      dataMap.set(ent.id, { totalVal: 0, count: 0, intensity: 0 });
    });

    const targetCols = columns.length > 0 ? columns.map((c) => c.name) : Object.keys(rows[0] || {});

    rows.forEach((r) => {
      let metricNum = 1;
      if (currentMetric && r[currentMetric] !== undefined) {
        const parsed = parseNumeric(r[currentMetric]);
        metricNum = parsed !== null && !isNaN(parsed) ? parsed : 1;
      }

      currentRegistry.entities.forEach((ent) => {
        const matches = targetCols.some((col) => {
          const val = r[col];
          return ent.aliases.some((alias) => matchesAliasStrict(val, alias));
        });

        if (matches) {
          const cur = dataMap.get(ent.id)!;
          cur.totalVal += metricNum;
          cur.count += 1;
          grandTotal += metricNum;
          if (cur.totalVal > maxEntityVal) {
            maxEntityVal = cur.totalVal;
          }
        }
      });
    });

    // Compute relative intensities (0.0 to 1.0)
    dataMap.forEach((entry) => {
      entry.intensity = maxEntityVal > 0 ? Math.min(1, Math.max(0, entry.totalVal / maxEntityVal)) : 0;
    });

    return { map: dataMap, grandTotal, maxVal: maxEntityVal };
  }, [rows, currentRegistry, columns, currentMetric]);

  // List of active highlighted countries/states with data
  const activeHighlightedEntities = useMemo(() => {
    return currentRegistry.entities
      .filter((ent) => {
        const d = entityDataMap.map.get(ent.id);
        return (d?.totalVal || 0) > 0 || (d?.count || 0) > 0;
      })
      .map((ent) => {
        const d = entityDataMap.map.get(ent.id)!;
        const pct = entityDataMap.grandTotal > 0 ? (d.totalVal / entityDataMap.grandTotal) * 100 : 0;
        return {
          entity: ent,
          totalVal: d.totalVal,
          count: d.count,
          percentage: pct,
        };
      })
      .sort((a, b) => b.totalVal - a.totalVal);
  }, [currentRegistry, entityDataMap]);

  // Sorted entities alphabetically for dropdown list
  const alphabeticalEntities = useMemo(() => {
    return [...currentRegistry.entities].sort((a, b) => a.name.localeCompare(b.name));
  }, [currentRegistry]);

  // Sync inspected entity when selectedRegion changes externally
  useEffect(() => {
    if (!selectedRegion || selectedRegion === 'all') {
      setInspectedEntityId(null);
      return;
    }
    const matched = currentRegistry.entities.find((ent) =>
      ent.aliases.some((alias) => matchesAliasStrict(selectedRegion, alias))
    );
    if (matched) {
      setInspectedEntityId(matched.id);
    }
  }, [selectedRegion, currentRegistry]);

  const isEntitySelected = (ent: GeoEntity) => {
    if (inspectedEntityId && inspectedEntityId === ent.id) return true;
    if (!selectedRegion || selectedRegion === 'all') return false;
    const lowerSel = selectedRegion.toLowerCase();
    return ent.aliases.some((alias) => matchesAliasStrict(lowerSel, alias));
  };

  // Focus zoom onto a specific entity (e.g. India, Texas, Maharashtra)
  const focusEntity = (ent: GeoEntity) => {
    const cx = ent.centroid?.[0] ?? currentRegistry.width / 2;
    const cy = ent.centroid?.[1] ?? currentRegistry.height / 2;
    const targetScale = activeGranularity === 'world' ? 2.5 : 1.9;
    const offsetX = -(cx * targetScale - currentRegistry.width / 2);
    const offsetY = -(cy * targetScale - currentRegistry.height / 2);
    setZoomLevel(targetScale);
    setPanOffset({ x: offsetX, y: offsetY });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Handle entity click on map
  const handleEntityClick = (ent: GeoEntity) => {
    const isSelected = isEntitySelected(ent);
    if (isSelected && selectedRegion === ent.name) {
      onSelectRegion('all');
      setInspectedEntityId(null);
      resetZoom();
    } else {
      onSelectRegion(ent.name);
      setInspectedEntityId(ent.id);
      focusEntity(ent);
    }
  };

  // Handle dropdown selection
  const handleDropdownSelect = (entityId: string) => {
    if (!entityId || entityId === 'all') {
      onSelectRegion('all');
      setInspectedEntityId(null);
      resetZoom();
      return;
    }
    const entity = currentRegistry.entities.find((e) => e.id === entityId);
    if (entity) {
      onSelectRegion(entity.name);
      setInspectedEntityId(entity.id);
      focusEntity(entity);
    }
  };

  // Currently inspected entity data dossier
  const inspectedData = useMemo(() => {
    if (!inspectedEntityId) return null;
    const entity = currentRegistry.entities.find((e) => e.id === inspectedEntityId);
    if (!entity) return null;
    const data = entityDataMap.map.get(entity.id);
    const totalVal = data?.totalVal || 0;
    const count = data?.count || 0;
    const percentage = entityDataMap.grandTotal > 0 ? (totalVal / entityDataMap.grandTotal) * 100 : 0;
    const avgVal = count > 0 ? totalVal / count : 0;

    return {
      entity,
      totalVal,
      count,
      percentage,
      avgVal,
      hasData: count > 0 || totalVal > 0,
    };
  }, [inspectedEntityId, currentRegistry, entityDataMap]);

  // Tooltip & Mouse Interactions
  const handleMouseEnter = (ent: GeoEntity, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const data = entityDataMap.map.get(ent.id);
    const totalVal = data?.totalVal || 0;
    const count = data?.count || 0;
    const percentage = entityDataMap.grandTotal > 0 ? (totalVal / entityDataMap.grandTotal) * 100 : 0;

    setHoveredEntity({
      entity: ent,
      totalVal,
      count,
      percentage,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (hoveredEntity) {
      setHoveredEntity((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            }
          : null
      );
    }

    // Rough spherical coordinates calculation for HUD telemetry readout
    if (activeGranularity === 'world') {
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const lon = Math.round((relX * 360 - 180) * 10) / 10;
      const lat = Math.round(((0.5 - relY) * 160) * 10) / 10;
      setMouseCoords({
        lat: lat >= 0 ? `${lat.toFixed(1)}°N` : `${Math.abs(lat).toFixed(1)}°S`,
        lon: lon >= 0 ? `${lon.toFixed(1)}°E` : `${Math.abs(lon).toFixed(1)}°W`,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredEntity(null);
    setMouseCoords(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between select-none ${className}`}
    >
      {/* 1. MAP HEADER & COMPACT RESPONSIVE CONTROLS */}
      <div className="pb-3 mb-2.5 border-b border-[var(--lm-border-default)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <GlobeIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight">
                {currentRegistry.mapTitle}
              </h3>
              {activeHighlightedEntities.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeHighlightedEntities.length} Active Market{activeHighlightedEntities.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--lm-text-tertiary)] mt-0.5 flex items-center gap-1.5">
              <span>{userModeOverride ? 'Manual View' : `⚡ Auto: ${detectedGranularity.reason}`}</span>
              <span>•</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {metricLabel || currentMetric}
              </span>
            </p>
          </div>

          {/* Granularity Switcher Pills */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl text-[11px] font-medium border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setUserModeOverride(null)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                userModeOverride === null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Automatically select view based on dataset"
            >
              🤖 Auto
            </button>
            <button
              onClick={() => setUserModeOverride('world')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeGranularity === 'world' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌍 World
            </button>
            <button
              onClick={() => setUserModeOverride('india-states')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeGranularity === 'india-states' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇮🇳 India
            </button>
            <button
              onClick={() => setUserModeOverride('us-states')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeGranularity === 'us-states' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇺🇸 US
            </button>

            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className={`p-1.5 rounded-lg transition-all ${
                  isExpanded
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isExpanded ? 'Collapse Map' : 'Expand Map with Animated Radar & Telemetry HUD'}
              >
                <MaximizeIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 1.1 TERRITORY DROPDOWN INSPECTOR & FILTER CONTROLS BAR */}
        <div className="mt-2.5 pt-2 border-t border-[var(--lm-border-default)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)] whitespace-nowrap flex items-center gap-1">
              <span>📍</span>
              <span>Inspect Territory:</span>
            </span>

            {/* Dropdown Country / State Selector */}
            <select
              value={inspectedEntityId || ''}
              onChange={(e) => handleDropdownSelect(e.target.value)}
              className="w-full text-xs font-medium py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all">
                🌐 Select Territory ({activeGranularity === 'world' ? '176 Countries' : activeGranularity === 'india-states' ? '37 States & UTs' : '51 US States'})
              </option>

              {activeHighlightedEntities.length > 0 && (
                <optgroup label={`📊 Active Data Markets (${activeHighlightedEntities.length})`}>
                  {activeHighlightedEntities.map((item) => (
                    <option key={`active-${item.entity.id}`} value={item.entity.id}>
                      ⭐ {item.entity.name} — {formatMetricVal(item.totalVal, isCurrency)} ({item.count.toLocaleString()} records)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="🗺️ All Sovereign Territories (A-Z)">
                {alphabeticalEntities.map((ent) => {
                  const data = entityDataMap.map.get(ent.id);
                  const hasRows = (data?.count || 0) > 0;
                  return (
                    <option key={`all-${ent.id}`} value={ent.id}>
                      {ent.name} {ent.code ? `(${ent.code})` : ''} {hasRows ? '• Active' : ''}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          {/* Quick Active Filter State */}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            {selectedRegion && selectedRegion !== 'all' ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate max-w-[140px]">
                  {selectedRegion}
                </span>
                <button
                  onClick={() => {
                    onSelectRegion('all');
                    setInspectedEntityId(null);
                    resetZoom();
                  }}
                  className="text-emerald-800 dark:text-emerald-200 hover:text-red-500 font-bold ml-1 text-xs"
                  title="Clear Filter"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-[var(--lm-text-tertiary)] italic">
                Showing all global regions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. REAL SVG GEOGRAPHIC MAP CANVAS WITH ANIMATED RADAR & TELEMETRY */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? 'h-[520px] bg-[#0E1E2E]' : 'h-80 bg-[#122A42]'
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* EXPANDED TELEMETRY HUD BAR (Top Left Overlay) */}
        {isExpanded && (
          <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-emerald-500/30 text-white text-[11px] font-mono shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-emerald-400 tracking-wider">RADAR SCANNER</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">
                {activeHighlightedEntities.length > 0
                  ? `Active: ${activeHighlightedEntities[0].entity.name} (${activeHighlightedEntities[0].count.toLocaleString()} rows)`
                  : 'Scanning Active Geo Datasets'}
              </span>
            </div>

            <button
              onClick={() => setRadarActive(!radarActive)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            >
              {radarActive ? '⏸ Pause Sweep' : '▶ Resume Sweep'}
            </button>

            {activeHighlightedEntities.length > 0 && (
              <button
                onClick={() => focusEntity(activeHighlightedEntities[0].entity)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-[10px] font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                🎯 Focus {activeHighlightedEntities[0].entity.name}
              </button>
            )}
          </div>
        )}

        {/* EXPANDED ZOOM CONTROLS (Top Right Overlay) */}
        {isExpanded && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-white text-xs shadow-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.4))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
            <span className="px-1.5 text-[10px] font-mono text-emerald-400 font-semibold min-w-10 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.5, z + 0.4))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={resetZoom}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset View"
            >
              ⟲
            </button>
          </div>
        )}

        {/* EXPANDED BOTTOM COORDINATES & ACTIVE MARKET TICKER */}
        {isExpanded && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-[11px] pointer-events-none">
            <div className="flex items-center gap-2">
              {mouseCoords && (
                <div className="px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-slate-300 font-mono text-[10px]">
                  📍 {mouseCoords.lat}, {mouseCoords.lon}
                </div>
              )}
            </div>

            {/* Quick Leaderboard Pills */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {activeHighlightedEntities.slice(0, 3).map((item) => (
                <button
                  key={item.entity.id}
                  onClick={() => handleEntityClick(item.entity)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium backdrop-blur-md border transition-all cursor-pointer ${
                    isEntitySelected(item.entity)
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-semibold">{item.entity.name}</span>
                  <span className="text-emerald-300 font-mono">
                    {formatMetricVal(item.totalVal, isCurrency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAIN SVG VECTOR WORLD MAP */}
        <svg
          ref={svgRef}
          viewBox={currentRegistry.viewBox}
          className="w-full h-full max-h-full drop-shadow-md transition-all duration-300"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Emerald Country Glow Filter */}
            <filter id="countryActiveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10B981" floodOpacity="0.85" />
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#059669" floodOpacity="0.45" />
            </filter>

            {/* Ocean Nautical Gradient (Authentic Deep Slate Blue) */}
            <radialGradient id="nauticalOcean" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#153654" />
              <stop offset="100%" stopColor="#0B1C2B" />
            </radialGradient>

            {/* Active Country Emerald Gradient */}
            <linearGradient id="emeraldCountryFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Radar Beam Horizontal Linear Gradient */}
            <linearGradient id="radarSweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="70%" stopColor="#10B981" stopOpacity="0.18" />
              <stop offset="98%" stopColor="#34D399" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Ocean Base Layer */}
          <rect width="100%" height="100%" fill="url(#nauticalOcean)" rx="14" />

          {/* Graticule Latitude & Longitude Coordinate Grid (Cartography) */}
          {activeGranularity === 'world' && (
            <g className="opacity-20 pointer-events-none" stroke="#64748B" strokeWidth="0.5" strokeDasharray="3,3">
              <line x1="0" y1="130" x2="1000" y2="130" />
              <line x1="0" y1="260" x2="1000" y2="260" />
              <line x1="0" y1="390" x2="1000" y2="390" />
              <line x1="200" y1="0" x2="200" y2="520" />
              <line x1="400" y1="0" x2="400" y2="520" />
              <line x1="600" y1="0" x2="600" y2="520" />
              <line x1="800" y1="0" x2="800" y2="520" />
            </g>
          )}

          {/* Sovereign Vector Territories (Countries or States) */}
          {currentRegistry.entities.map((ent) => {
            const data = entityDataMap.map.get(ent.id);
            const hasData = (data?.totalVal || 0) > 0 || (data?.count || 0) > 0;
            const isSelected = isEntitySelected(ent);

            // Crisp White landmasses on deep navy ocean, active glowing Emerald
            let fillColor = '#FFFFFF';
            let strokeColor = '#122A42';
            let strokeWidth = 0.5;

            if (isSelected) {
              fillColor = '#10B981';
              strokeColor = '#FFFFFF';
              strokeWidth = 2.0;
            } else if (hasData) {
              fillColor = 'url(#emeraldCountryFill)';
              strokeColor = '#34D399';
              strokeWidth = 1.4;
            }

            return (
              <path
                key={ent.id}
                d={ent.d}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={hasData || isSelected ? 'url(#countryActiveGlow)' : undefined}
                className={`transition-all duration-200 cursor-pointer ${
                  hasData || isSelected
                    ? 'hover:filter hover:brightness-125 hover:stroke-white hover:stroke-[2px]'
                    : 'opacity-90 hover:opacity-100 hover:fill-slate-100 hover:stroke-slate-300'
                }`}
                onMouseEnter={(e) => handleMouseEnter(ent, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleEntityClick(ent)}
              />
            );
          })}

          {/* Active Highlighted Countries/States — Pulsing Sonar Rings & Badges */}
          {activeHighlightedEntities.map(({ entity: ent }) => {
            const isSelected = isEntitySelected(ent);
            const cx = ent.centroid?.[0] ?? 0;
            const cy = ent.centroid?.[1] ?? 0;

            return (
              <g
                key={`active-beacon-${ent.id}`}
                transform={`translate(${cx}, ${cy})`}
                className="pointer-events-none select-none"
              >
                {/* Sonar Pulse Wave 1 */}
                <circle
                  r="14"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  className="animate-ping opacity-60"
                  style={{ animationDuration: '2.5s' }}
                />

                {/* Sonar Pulse Wave 2 (Offset) */}
                <circle
                  r="22"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="1"
                  className="animate-ping opacity-30"
                  style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}
                />

                {/* Centroid Glowing Pinpoint */}
                <circle
                  r={isSelected ? 6 : 4.5}
                  fill={isSelected ? '#10B981' : '#059669'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="drop-shadow-md"
                />

                {/* Country/State Code Label */}
                <text
                  y={13}
                  textAnchor="middle"
                  className="text-[9px] font-black fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] font-sans tracking-wide"
                >
                  {(ent.code || ent.id).toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* ANIMATED RADAR SWEEP BEAM */}
          {radarActive && (
            <g className="pointer-events-none">
              <rect
                x={radarX - 60}
                y="0"
                width="60"
                height={currentRegistry.height}
                fill="url(#radarSweepGradient)"
              />
              <line
                x1={radarX}
                y1="0"
                x2={radarX}
                y2={currentRegistry.height}
                stroke="#6EE7B7"
                strokeWidth="1.5"
                opacity="0.9"
                filter="url(#countryActiveGlow)"
              />
            </g>
          )}
        </svg>

        {/* Floating Precision Hover Tooltip */}
        {hoveredEntity && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs whitespace-nowrap transition-all duration-75"
            style={{
              left: `${Math.max(80, Math.min(hoveredEntity.x, (containerRef.current?.clientWidth || 400) - 80))}px`,
              top: `${Math.max(55, hoveredEntity.y)}px`,
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{hoveredEntity.entity.name}</span>
              {hoveredEntity.entity.code && (
                <span className="text-[10px] text-slate-400 font-mono">
                  [{hoveredEntity.entity.code}]
                </span>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-200">
              <div>
                <span className="text-slate-400">Total: </span>
                <span className="font-bold text-emerald-300">
                  {formatMetricVal(hoveredEntity.totalVal, isCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Share: </span>
                <span className="font-semibold">
                  {hoveredEntity.percentage.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">Records: </span>
                <span className="font-semibold">{hoveredEntity.count.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-emerald-400/80 flex items-center gap-1">
              <span>💡</span>
              <span>Click to inspect given data and filter dashboard</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. INDIVIDUAL TERRITORY GIVEN DATA INSPECTOR DOSSIER CARD */}
      {inspectedData && (
        <div className="mt-3 p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900 text-white border border-emerald-500/35 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Territory Identity */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm font-black text-emerald-400 font-mono">
                {inspectedData.entity.code || inspectedData.entity.id.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {inspectedData.entity.name}
                  </h4>
                  {inspectedData.hasData ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Market
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      Zero Dataset Rows
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {inspectedData.entity.subLabel || inspectedData.entity.parentRegion || 'Territorial Division'}
                </p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex-1">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Total {metricLabel || currentMetric}
                </span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {formatMetricVal(inspectedData.totalVal, isCurrency)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Market Share
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {inspectedData.percentage.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Records / Rows
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {inspectedData.count.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Avg / Record
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {formatMetricVal(inspectedData.avgVal, isCurrency)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-center">
              <button
                onClick={() => focusEntity(inspectedData.entity)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Center & Zoom to Territory"
              >
                🎯 Focus
              </button>
              <button
                onClick={() => {
                  onSelectRegion('all');
                  setInspectedEntityId(null);
                  resetZoom();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                title="Clear Filter"
              >
                ✕ Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAP FOOTER METADATA */}
      <div className="flex items-center justify-between pt-2.5 px-1 text-[11px] text-[var(--lm-text-tertiary)]">
        <div className="flex items-center gap-1.5">
          <span>Active Filter:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {selectedRegion && selectedRegion !== 'all' ? selectedRegion : 'Global (All Regions)'}
          </span>
          {selectedRegion && selectedRegion !== 'all' && (
            <button
              onClick={() => {
                onSelectRegion('all');
                setInspectedEntityId(null);
                resetZoom();
              }}
              className="text-[10px] text-red-500 hover:underline ml-1 cursor-pointer font-medium"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="text-[10px] text-slate-400">
          {activeGranularity === 'world'
            ? '176 sovereign countries • Natural Mercator Projection'
            : activeGranularity === 'india-states'
            ? 'Survey of India • 37 States & UTs'
            : '50 States & DC • Albers USA Projection'}
        </div>
      </div>
    </div>
  );
}
