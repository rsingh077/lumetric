'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { OFFICIAL_INDIA_STATES, IndiaStateEntity } from '@/components/charts/indiaStatesData';
import { OFFICIAL_US_STATES, USStateEntity } from '@/components/charts/usStatesData';
import { REAL_WORLD_COUNTRIES, WorldCountryEntity } from '@/components/charts/worldCountriesData';

export type MapMode = 'india' | 'us' | 'world';

interface MarketData {
  records: number;
  revenueFormatted: string;
  share: string;
  hub: string;
  tier: string;
}

// Preset rich metrics for high-velocity markets
const INDIA_MARKET_PRESETS: Record<string, MarketData> = {
  MH: { records: 48200, revenueFormatted: '₹4,289 Cr', share: '34.8%', hub: 'Mumbai Financial Capital', tier: 'Tier-1 Growth Hub' },
  KA: { records: 36400, revenueFormatted: '₹3,240 Cr', share: '26.2%', hub: 'Bengaluru Tech & AI Corridor', tier: 'Tier-1 Innovation Hub' },
  GJ: { records: 29800, revenueFormatted: '₹2,650 Cr', share: '21.4%', hub: 'Ahmedabad & GIFT City', tier: 'Tier-1 Free-Zone' },
  DL: { records: 24100, revenueFormatted: '₹2,140 Cr', share: '17.3%', hub: 'National Capital Region', tier: 'Sovereign Procurement Hub' },
  TN: { records: 22500, revenueFormatted: '₹1,980 Cr', share: '15.9%', hub: 'Chennai Automotive & Export', tier: 'Industrial Hub' },
  TG: { records: 19800, revenueFormatted: '₹1,750 Cr', share: '14.1%', hub: 'Hyderabad Bio & Cloud Hub', tier: 'High-Tech Center' },
  UP: { records: 18200, revenueFormatted: '₹1,580 Cr', share: '12.8%', hub: 'Noida & Lucknow Belt', tier: 'Northern Corridor' },
  WB: { records: 14300, revenueFormatted: '₹1,240 Cr', share: '10.1%', hub: 'Kolkata Eastern Logistics', tier: 'Trade Gateway' },
  RJ: { records: 11200, revenueFormatted: '₹980 Cr', share: '7.9%', hub: 'Jaipur Green Energy Hub', tier: 'Developing Market' },
  KL: { records: 9400, revenueFormatted: '₹820 Cr', share: '6.6%', hub: 'Kochi Port & Digital Health', tier: 'Maritime Gateway' },
  PB: { records: 8600, revenueFormatted: '₹750 Cr', share: '6.1%', hub: 'Ludhiana & Chandigarh Agri-Tech', tier: 'Agri-Industrial' },
  HR: { records: 15400, revenueFormatted: '₹1,340 Cr', share: '10.8%', hub: 'Gurugram Corporate Center', tier: 'Corporate Nexus' },
  AP: { records: 10800, revenueFormatted: '₹940 Cr', share: '7.6%', hub: 'Visakhapatnam Port & Coast', tier: 'Coastal Corridor' },
  MP: { records: 11900, revenueFormatted: '₹1,020 Cr', share: '8.2%', hub: 'Indore & Bhopal Logistics', tier: 'Central Gateway' },
  JK: { records: 6400, revenueFormatted: '₹540 Cr', share: '4.3%', hub: 'Srinagar Crown Valley', tier: 'Northern Sovereign Tier' },
  LADAKH: { records: 2800, revenueFormatted: '₹240 Cr', share: '1.9%', hub: 'Leh Solar & Defense Center', tier: 'Strategic Territory' },
};

const US_MARKET_PRESETS: Record<string, MarketData> = {
  CA: { records: 52100, revenueFormatted: '$5.21M', share: '38.2%', hub: 'Silicon Valley & Pacific', tier: 'Tier-1 Tech Hub' },
  TX: { records: 44200, revenueFormatted: '$4.42M', share: '32.4%', hub: 'Austin & Houston Corridor', tier: 'Energy & Compute' },
  NY: { records: 39800, revenueFormatted: '$3.98M', share: '29.1%', hub: 'Manhattan Financial Center', tier: 'Global Capital' },
  WA: { records: 28400, revenueFormatted: '$2.84M', share: '20.8%', hub: 'Seattle Cloud Infrastructure', tier: 'Enterprise Cloud' },
  FL: { records: 26100, revenueFormatted: '$2.61M', share: '19.1%', hub: 'Miami Fintech & Trade', tier: 'High-Growth Nexus' },
  IL: { records: 21900, revenueFormatted: '$2.19M', share: '16.0%', hub: 'Chicago Commodities Center', tier: 'Logistics Core' },
};

const WORLD_MARKET_PRESETS: Record<string, MarketData> = {
  IN: { records: 142000, revenueFormatted: '$14.2M', share: '42.1%', hub: 'South Asian Digital Powerhouse', tier: 'Primary Hub' },
  US: { records: 128000, revenueFormatted: '$12.8M', share: '38.0%', hub: 'North American Enterprise Zone', tier: 'Tier-1 Market' },
  DE: { records: 64000, revenueFormatted: '$6.4M', share: '19.0%', hub: 'European Industrial Engine', tier: 'Manufacturing' },
  GB: { records: 58000, revenueFormatted: '$5.8M', share: '17.2%', hub: 'London Global Banking Hub', tier: 'Fintech Center' },
  JP: { records: 52000, revenueFormatted: '$5.2M', share: '15.4%', hub: 'Tokyo Advanced Robotics', tier: 'High-Precision Tech' },
  SG: { records: 41000, revenueFormatted: '$4.1M', share: '12.2%', hub: 'Southeast Asian Trade Gateway', tier: 'Strategic Nexus' },
  AU: { records: 36000, revenueFormatted: '$3.6M', share: '10.7%', hub: 'Sydney Asia-Pacific Cloud Zone', tier: 'APAC Center' },
};

export function LandingGeoMapDemo() {
  const [mode, setMode] = useState<MapMode>('india');
  const [selectedId, setSelectedId] = useState<string>('MH');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [radarOffset, setRadarOffset] = useState<number>(0);

  // Switch default selected territory when mode changes
  useEffect(() => {
    if (mode === 'india') setSelectedId('MH');
    else if (mode === 'us') setSelectedId('CA');
    else setSelectedId('IN');
  }, [mode]);

  // Smooth radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarOffset((prev) => (prev >= 100 ? 0 : prev + 1.2));
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Registry based on active mode
  const currentRegistry = useMemo(() => {
    if (mode === 'india') {
      return {
        viewBox: '0 0 650 750',
        title: 'Survey of India (37 States & Union Territories)',
        flag: '🇮🇳',
        currencySymbol: '₹',
        entities: OFFICIAL_INDIA_STATES.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          d: s.d,
          centroid: s.centroid,
        })),
        presets: INDIA_MARKET_PRESETS,
      };
    }
    if (mode === 'us') {
      return {
        viewBox: '0 0 900 550',
        title: 'United States Geological Survey (51 States & DC)',
        flag: '🇺🇸',
        currencySymbol: '$',
        entities: OFFICIAL_US_STATES.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          d: s.d,
          centroid: s.centroid,
        })),
        presets: US_MARKET_PRESETS,
      };
    }
    return {
      viewBox: '0 0 1000 520',
      title: 'Real World Topological Atlas (176 Sovereign Nations)',
      flag: '🌍',
      currencySymbol: '$',
      entities: REAL_WORLD_COUNTRIES.map((c) => ({
        id: c.code,
        code: c.code,
        name: c.name,
        d: c.d,
        centroid: c.centroid,
      })),
      presets: WORLD_MARKET_PRESETS,
    };
  }, [mode]);

  // Helper to fetch or dynamically compute territory metrics
  const getEntityMetrics = (id: string, name: string): MarketData => {
    const upperId = id.toUpperCase();
    if (currentRegistry.presets[upperId]) {
      return currentRegistry.presets[upperId];
    }
    // Deterministic pseudo-metrics for any territory
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const recs = (hash % 120 + 15) * 85;
    const rev = (recs * 0.089).toFixed(1);
    const sh = ((recs / 140000) * 100).toFixed(1);
    return {
      records: recs,
      revenueFormatted: mode === 'india' ? `₹${rev} Cr` : `$${rev}k`,
      share: `${sh}%`,
      hub: `${name} Regional Sector`,
      tier: 'Active Data Market',
    };
  };

  const activeEntity = useMemo(() => {
    const found = currentRegistry.entities.find(
      (e) => e.id.toLowerCase() === selectedId.toLowerCase()
    );
    return found || currentRegistry.entities[0];
  }, [currentRegistry, selectedId]);

  const activeMetrics = useMemo(() => {
    return getEntityMetrics(activeEntity.id, activeEntity.name);
  }, [activeEntity, mode]);

  const hoveredEntity = useMemo(() => {
    if (!hoveredId) return null;
    return currentRegistry.entities.find((e) => e.id.toLowerCase() === hoveredId.toLowerCase()) || null;
  }, [currentRegistry, hoveredId]);

  const hoveredMetrics = useMemo(() => {
    if (!hoveredEntity) return null;
    return getEntityMetrics(hoveredEntity.id, hoveredEntity.name);
  }, [hoveredEntity, mode]);

  return (
    <div className="bg-[#0C1A29] p-4 sm:p-6 rounded-2xl border border-slate-700/80 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[460px]">
      {/* 1. TOP CONTROL BAR: TITLE & MAP GRANULARITY TOGGLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <div className="text-xs font-mono font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>{currentRegistry.flag}</span>
            <span className="text-emerald-400 uppercase">{currentRegistry.title}</span>
          </div>
        </div>

        {/* Granularity Switcher: India / US / World */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-700/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('india')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'india'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇮🇳 India (37 States)
          </button>
          <button
            type="button"
            onClick={() => setMode('world')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'world'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌍 World (176)
          </button>
          <button
            type="button"
            onClick={() => setMode('us')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'us'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇺🇸 US (51)
          </button>
        </div>
      </div>

      {/* 2. TERRITORY DROPDOWN INSPECTOR */}
      <div className="mt-3 flex items-center gap-2.5 z-10">
        <label className="text-[11px] font-mono text-slate-400 whitespace-nowrap flex items-center gap-1">
          <span>📍</span>
          <span>Inspect Territory:</span>
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 max-w-sm text-xs font-medium py-1.5 px-3 rounded-xl bg-slate-900/90 text-white border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer shadow-sm"
        >
          <optgroup label="⭐ High-Velocity Market Hubs">
            {Object.keys(currentRegistry.presets).map((key) => {
              const ent = currentRegistry.entities.find((e) => e.id.toUpperCase() === key.toUpperCase());
              if (!ent) return null;
              const p = currentRegistry.presets[key];
              return (
                <option key={ent.id} value={ent.id}>
                  ⭐ {ent.name} — {p.revenueFormatted} ({p.records.toLocaleString()} rows)
                </option>
              );
            })}
          </optgroup>
          <optgroup label="All Sovereign Territories">
            {currentRegistry.entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name} ({ent.id})
              </option>
            ))}
          </optgroup>
        </select>

        <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Live Geo Projection
        </span>
      </div>

      {/* 3. AUTHENTIC SVG GEOGRAPHICAL MAP CANVAS */}
      <div className="relative my-4 w-full h-[260px] sm:h-[300px] flex items-center justify-center overflow-hidden rounded-xl bg-[#091420] border border-slate-800 shadow-inner">
        {/* Real-time Hover Tooltip */}
        {hoveredEntity && hoveredMetrics && (
          <div className="absolute top-2 left-2 z-30 pointer-events-none px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-white text-xs shadow-xl animate-in fade-in">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>●</span>
              <span>{hoveredEntity.name}</span>
            </div>
            <div className="text-[10px] text-slate-300 font-mono mt-0.5">
              {hoveredMetrics.revenueFormatted} • {hoveredMetrics.records.toLocaleString()} records ({hoveredMetrics.share})
            </div>
          </div>
        )}

        {/* Nautical & Coordinate Grid Background */}
        <svg
          viewBox={currentRegistry.viewBox}
          className="w-full h-full max-h-full drop-shadow-md select-none transition-transform duration-300"
        >
          <defs>
            {/* Deep Ocean Nautical Gradient */}
            <radialGradient id="demoOcean" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#122A42" />
              <stop offset="100%" stopColor="#081420" />
            </radialGradient>

            {/* Selected Territory Emerald Glow Filter */}
            <filter id="demoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10B981" floodOpacity="0.9" />
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#059669" floodOpacity="0.5" />
            </filter>

            {/* Radar Sweep Gradient */}
            <linearGradient id="radarDemoSweep" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="70%" stopColor="#10B981" stopOpacity="0.15" />
              <stop offset="98%" stopColor="#34D399" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Ocean Base Layer */}
          <rect width="100%" height="100%" fill="url(#demoOcean)" rx="10" />

          {/* Cartographic Coordinate Latitude / Longitude Grid */}
          <g className="opacity-15 pointer-events-none" stroke="#64748B" strokeWidth="0.5" strokeDasharray="4,4">
            <line x1="0" y1="20%" x2="100%" y2="20%" />
            <line x1="0" y1="40%" x2="100%" y2="40%" />
            <line x1="0" y1="60%" x2="100%" y2="60%" />
            <line x1="0" y1="80%" x2="100%" y2="80%" />
            <line x1="25%" y1="0" x2="25%" y2="100%" />
            <line x1="50%" y1="0" x2="50%" y2="100%" />
            <line x1="75%" y1="0" x2="75%" y2="100%" />
          </g>

          {/* REAL GEOGRAPHICAL TERRITORIES (Rendered from official SVG vector paths) */}
          {currentRegistry.entities.map((ent) => {
            const isSelected = ent.id.toLowerCase() === selectedId.toLowerCase();
            const isHovered = hoveredId && ent.id.toLowerCase() === hoveredId.toLowerCase();
            const isPreset = Boolean(currentRegistry.presets[ent.id.toUpperCase()]);

            let fillColor = '#FFFFFF';
            let strokeColor = '#132B40';
            let strokeWidth = 0.5;

            if (isSelected) {
              fillColor = '#10B981';
              strokeColor = '#FFFFFF';
              strokeWidth = 2.0;
            } else if (isHovered) {
              fillColor = '#34D399';
              strokeColor = '#FFFFFF';
              strokeWidth = 1.6;
            } else if (isPreset) {
              fillColor = '#D1FAE5';
              strokeColor = '#059669';
              strokeWidth = 0.8;
            }

            return (
              <path
                key={ent.id}
                d={ent.d}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={isSelected || isHovered ? 'url(#demoGlow)' : undefined}
                className="transition-all duration-150 cursor-pointer hover:opacity-100"
                onClick={() => setSelectedId(ent.id)}
                onMouseEnter={() => setHoveredId(ent.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}

          {/* Radar Sweep Line */}
          <rect
            x={`${radarOffset}%`}
            y="0"
            width="6%"
            height="100%"
            fill="url(#radarDemoSweep)"
            className="pointer-events-none select-none opacity-80"
          />

          {/* Active Centroid Sonar Beacon for Selected Territory */}
          {activeEntity.centroid && (
            <g
              transform={`translate(${activeEntity.centroid[0]}, ${activeEntity.centroid[1]})`}
              className="pointer-events-none select-none"
            >
              <circle r="18" fill="none" stroke="#10B981" strokeWidth="1.5" className="animate-ping opacity-60" />
              <circle r="9" fill="#10B981" opacity="0.4" />
              <circle r="4.5" fill="#FFFFFF" stroke="#047857" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      {/* 4. REAL-TIME TERRITORY DOSSIER CARD */}
      <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-emerald-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center text-xs border border-emerald-500/30 shrink-0">
            {activeEntity.id}
          </div>
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <span>{activeEntity.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 font-normal">
                {activeMetrics.tier}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {activeMetrics.hub} • <strong className="text-slate-200 font-mono">{activeMetrics.records.toLocaleString()}</strong> Records • {activeMetrics.share} Share
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
          <div className="font-mono font-extrabold text-emerald-400 text-base leading-none">
            {activeMetrics.revenueFormatted}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
            Primary Volume Index
          </div>
        </div>
      </div>
    </div>
  );
}
