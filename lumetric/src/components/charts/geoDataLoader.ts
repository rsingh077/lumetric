/**
 * Lumetric Asynchronous Lazy Geo-Atlas Data Loader
 * Dynamically loads heavy TopoJSON sovereign boundary datasets on-demand,
 * preventing 850KB+ of topological vector paths from blocking initial page loads.
 */

import type { IndiaStateEntity } from './indiaStatesData';
import type { USStateEntity } from './usStatesData';
import type { WorldCountryEntity } from './worldCountriesData';

export type GeographicGranularity = 'world' | 'us-states' | 'india-states';

export interface GeoEntity {
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

const geoDatasetCache = new Map<GeographicGranularity, GeoEntity[]>();

export async function getGeoDataset(granularity: GeographicGranularity): Promise<GeoEntity[]> {
  const cached = geoDatasetCache.get(granularity);
  if (cached) return cached;

  let entities: GeoEntity[] = [];

  switch (granularity) {
    case 'india-states': {
      const { OFFICIAL_INDIA_STATES } = await import('./indiaStatesData');
      entities = OFFICIAL_INDIA_STATES.map((s: IndiaStateEntity) => ({
        id: s.code.toLowerCase(),
        code: s.code,
        name: s.name,
        label: s.name,
        subLabel: s.subLabel || `${s.code} • India Territory`,
        d: s.d,
        centroid: s.centroid,
        aliases: s.aliases,
        parentRegion: 'India'
      }));
      break;
    }

    case 'us-states': {
      const { OFFICIAL_US_STATES } = await import('./usStatesData');
      entities = OFFICIAL_US_STATES.map((s: USStateEntity) => ({
        id: s.code.toLowerCase(),
        code: s.code,
        name: s.name,
        label: s.name,
        subLabel: `${s.code} • US State`,
        d: s.d,
        centroid: s.centroid,
        aliases: s.aliases,
        parentRegion: 'United States'
      }));
      break;
    }

    case 'world':
    default: {
      const { REAL_WORLD_COUNTRIES } = await import('./worldCountriesData');
      entities = REAL_WORLD_COUNTRIES.map((c: WorldCountryEntity) => ({
        id: c.code.toLowerCase(),
        code: c.code,
        name: c.name,
        label: c.name,
        subLabel: `${c.code} • Sovereign Country`,
        d: c.d,
        centroid: c.centroid,
        aliases: c.aliases,
        parentRegion: 'Global'
      }));
      break;
    }
  }

  geoDatasetCache.set(granularity, entities);
  return entities;
}
