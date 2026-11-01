/**
 * Lumetric Asynchronous Web Worker Data Profiler
 * Transparently delegates large dataset parsing (RFC 4180 CSV/TSV) and statistical
 * column inference to a Web Worker, preventing main UI thread freezing.
 */

import { ColumnProfile } from '@/types';
import { parseCSVStrict, healDatasetRows, parseNumeric } from './csvParser';

export interface ParseProfileOptions {
  delimiter?: string;
  columnRoles?: Record<string, ColumnProfile['semanticRole']>;
}

export interface ParseProfileResult {
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
  detectedDelimiter: string;
  columns: ColumnProfile[];
  suggestedPrimaryKey: string;
  suggestedTimestamp: string;
}

export interface ProfileRowsOptions {
  columnRoles?: Record<string, ColumnProfile['semanticRole']>;
}

export interface ProfileRowsResult {
  columns: ColumnProfile[];
  suggestedPrimaryKey: string;
  suggestedTimestamp: string;
}

// Inline fallback / worker script content for universal compatibility across Catalyst, Capacitor, and Next.js
let sharedWorker: Worker | null = null;
let messageIdCounter = 0;
const pendingCallbacks = new Map<
  number,
  { resolve: (data: unknown) => void; reject: (err: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof window.Worker === 'undefined') {
    return null;
  }

  if (sharedWorker) return sharedWorker;

  try {
    // Attempt standard public worker path first
    const workerPath = '/workers/dataProfiler.worker.js';
    sharedWorker = new Worker(workerPath);
  } catch (_err) {
    try {
      // Fallback for subpath environments like /app/ on Zoho Catalyst
      const appWorkerPath = '/app/workers/dataProfiler.worker.js';
      sharedWorker = new Worker(appWorkerPath);
    } catch (innerErr) {
      console.warn('Web Worker instantiation unavailable; falling back to main-thread processing.', innerErr);
      return null;
    }
  }

  if (sharedWorker) {
    sharedWorker.onmessage = (e: MessageEvent) => {
      const { id, success, result, error } = e.data;
      const cb = pendingCallbacks.get(id);
      if (cb) {
        pendingCallbacks.delete(id);
        if (success) {
          cb.resolve(result);
        } else {
          cb.reject(new Error(error || 'Worker execution failed'));
        }
      }
    };

    sharedWorker.onerror = (e) => {
      console.warn('Worker runtime error:', e.message);
    };
  }

  return sharedWorker;
}

function callWorker<T>(action: string, payload: unknown): Promise<T> {
  const worker = getWorker();
  if (!worker) {
    return Promise.reject(new Error('No worker available'));
  }

  return new Promise<T>((resolve, reject) => {
    const id = ++messageIdCounter;
    pendingCallbacks.set(id, { resolve: resolve as (data: unknown) => void, reject });
    worker.postMessage({ id, action, payload });
  });
}

/**
 * Synchronous in-thread fallback for SSR or environments without Web Worker support.
 */
function parseAndProfileSync(text: string, options: ParseProfileOptions = {}): ParseProfileResult {
  const rawGrid = parseCSVStrict(text, options.delimiter);
  if (!rawGrid || rawGrid.length < 2) {
    throw new Error('Dataset must contain at least a header row and one valid data record.');
  }

  const rawHeaders = rawGrid[0].map((h, i) => {
    const trimmed = String(h || '').trim();
    return trimmed.length > 0 ? trimmed : `col_${i + 1}`;
  });

  const seenHeaders: Record<string, number> = {};
  const headers = rawHeaders.map((h) => {
    if (seenHeaders[h]) {
      seenHeaders[h]++;
      return `${h}_${seenHeaders[h]}`;
    }
    seenHeaders[h] = 1;
    return h;
  });

  const rawRows: Array<Record<string, string>> = [];
  for (let r = 1; r < rawGrid.length; r++) {
    const rowArr = rawGrid[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = rowArr[c] !== undefined ? String(rowArr[c]).trim() : '';
    }
    rawRows.push(obj);
  }

  const rows = healDatasetRows(rawRows);
  const profileRes = profileRowsSync(rows, headers, options);

  return {
    headers,
    rows,
    rowCount: rows.length,
    detectedDelimiter: options.delimiter || ',',
    columns: profileRes.columns,
    suggestedPrimaryKey: profileRes.suggestedPrimaryKey,
    suggestedTimestamp: profileRes.suggestedTimestamp,
  };
}

function profileRowsSync(
  rows: Array<Record<string, string>>,
  headers: string[],
  options: ProfileRowsOptions = {}
): ProfileRowsResult {
  const columnRoles = options.columnRoles || {};
  let suggestedPrimaryKey = '';
  let suggestedTimestamp = '';

  const columns: ColumnProfile[] = headers.map((colName) => {
    const values = rows.map((r) => r[colName] ?? '');
    const nullCount = values.filter(
      (v) => v === '' || v.toLowerCase() === 'null' || v.toLowerCase() === 'nan'
    ).length;

    const nonNulls = values.filter((v) => v !== '' && v.toLowerCase() !== 'null');
    const uniqueSet = new Set(nonNulls);
    const uniqueCount = uniqueSet.size;
    const sampleValues = Array.from(uniqueSet).slice(0, 5);

    const numericValues = nonNulls
      .map((v) => parseNumeric(v))
      .filter((n): n is number => n !== null && !isNaN(n));

    const isNumeric = numericValues.length >= nonNulls.length * 0.7 && nonNulls.length > 0;
    const isDate =
      nonNulls.length > 0 &&
      nonNulls.slice(0, 50).every((v) => !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/')));
    const isBoolean =
      nonNulls.length > 0 &&
      nonNulls.every((v) => ['true', 'false', '0', '1'].includes(v.toLowerCase()));

    let inferredType: ColumnProfile['inferredType'] = 'string';
    let stats: Partial<ColumnProfile> = {};

    if (isBoolean) {
      inferredType = 'boolean';
    } else if (isNumeric) {
      const isInt = numericValues.every((num) => Number.isInteger(num));
      inferredType = isInt ? 'integer' : 'float';

      const sorted = [...numericValues].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / sorted.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
      const stdDev = Math.sqrt(variance);

      stats = {
        min,
        max,
        mean: Number(mean.toFixed(2)),
        median,
        stdDev: Number(stdDev.toFixed(2)),
      };
    } else if (isDate) {
      inferredType = 'date';
      const sortedDates = [...nonNulls].sort();
      stats = {
        earliestDate: sortedDates[0],
        latestDate: sortedDates[sortedDates.length - 1],
      };
    } else {
      const lengths = nonNulls.map((v) => v.length);
      stats = {
        minLength: lengths.length > 0 ? Math.min(...lengths) : 0,
        maxLength: lengths.length > 0 ? Math.max(...lengths) : 0,
      };
    }

    let role = columnRoles[colName];
    if (!role) {
      if (uniqueCount === rows.length && /id|key|code|uuid|guid/i.test(colName)) {
        role = 'identifier';
      } else if (inferredType === 'date' || /date|time|timestamp|period|month|year/i.test(colName)) {
        role = 'temporal';
      } else if (inferredType === 'integer' || inferredType === 'float') {
        role = 'metric';
      } else {
        role = 'dimension';
      }
    }

    if (role === 'identifier' && !suggestedPrimaryKey) {
      suggestedPrimaryKey = colName;
    }
    if (role === 'temporal' && !suggestedTimestamp) {
      suggestedTimestamp = colName;
    }

    return {
      name: colName,
      inferredType,
      semanticRole: role,
      totalCount: values.length,
      nullCount,
      uniqueCount,
      sampleValues,
      ...stats,
    };
  });

  if (!suggestedPrimaryKey) {
    const idCand = columns.find((c) => c.semanticRole === 'identifier');
    suggestedPrimaryKey = idCand ? idCand.name : headers[0] || 'id';
  }

  return {
    columns,
    suggestedPrimaryKey,
    suggestedTimestamp,
  };
}

/**
 * Universal asynchronous parse and profile API.
 * Delegates to Web Worker if available, otherwise executes cleanly on main thread.
 */
export async function parseAndProfileDatasetAsync(
  text: string,
  options: ParseProfileOptions = {}
): Promise<ParseProfileResult> {
  try {
    return await callWorker<ParseProfileResult>('PARSE_AND_PROFILE', { text, options });
  } catch (_err) {
    return parseAndProfileSync(text, options);
  }
}

/**
 * Universal asynchronous profile rows API.
 */
export async function profileDatasetRowsAsync(
  rows: Array<Record<string, string>>,
  headers: string[],
  options: ProfileRowsOptions = {}
): Promise<ProfileRowsResult> {
  try {
    return await callWorker<ProfileRowsResult>('PROFILE_ROWS', { rows, headers, options });
  } catch (_err) {
    return profileRowsSync(rows, headers, options);
  }
}
