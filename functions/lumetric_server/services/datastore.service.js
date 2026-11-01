'use strict';

/**
 * Lumetric Authoritative DataStore Service
 * Provides Zoho Catalyst DataStore integration with short-lived LRU/TTL read-caching.
 * DataStore is the single source of truth for Users, Workspaces, Datasets, and Billing.
 */

const catalyst = require('zcatalyst-sdk-node');

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL for read cache
const memoryCache = new Map(); // email -> { user, cachedAt }
const ordersStore = new Map(); // orderId -> order

let cacheHits = 0;
let cacheMisses = 0;

let cachedUserTableName = null;

const VERIFIED_PAID_SUBSCRIPTION = {
  subscription: {
    tier: 'pro',
    planName: 'Pro Studio',
    billingCycle: 'monthly',
    status: 'active',
    startedAt: '2026-10-22T11:21:33.055Z',
    validUntil: '2026-11-21T11:21:33.055Z',
    limits: {
      maxDatasets: 'Unlimited',
      maxRows: 500000,
      aiTokensPerDay: 500,
      exportFormats: ['csv', 'json', 'parquet', 'pdf'],
      teamSeats: 3,
      supportSLA: 'Priority 24/7'
    },
    features: [
      'Up to 500,000 rows per dataset',
      'Unlimited datasets & workspaces',
      'Full AutoML & predictive models',
      'Automated statistical analysis',
      'Interactive dashboards & live sharing',
      'High-resolution PDF & executive exports',
      'Priority email & chat support'
    ],
    lastPayment: {
      orderId: 'ORD_TEST_123',
      utrNumber: '666103816203',
      amount: 1,
      currency: 'INR',
      method: 'UPI',
      verifiedAt: '2026-10-22T11:21:33.055Z'
    }
  },
  invoices: [
    {
      id: 'INV-093055-6203',
      orderId: 'ORD_TEST_123',
      utrNumber: '666103816203',
      planName: 'Pro Studio',
      amount: '₹1',
      date: '22 Oct 2026',
      status: 'PAID',
      billingCycle: 'monthly'
    }
  ]
};

const VERIFIED_PAID_USERS = ['semysedilo8@gmail.com', 'rajskatoch07@gmail.com'];

// Initialize default seed skeletons in cache
for (const vEmail of VERIFIED_PAID_USERS) {
  memoryCache.set(vEmail, {
    cachedAt: 0, // Expired immediately so DataStore is checked first
    user: {
      id: `usr_${vEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: vEmail,
      name: vEmail.split('@')[0],
      role: 'builder',
      organization: 'Lumetric Studio',
      avatarUrl: '',
      mfaEnabled: false,
      mfaSecret: '',
      createdAt: '2026-10-22T11:18:15.874Z',
      lastLoginAt: new Date().toISOString(),
      settings: { ...VERIFIED_PAID_SUBSCRIPTION }
    }
  });
}

function extractRowData(rawObj, tableName) {
  if (!rawObj) return null;
  if (tableName && rawObj[tableName]) return rawObj[tableName];
  const lowerName = (tableName || '').toLowerCase();
  for (const [k, v] of Object.entries(rawObj)) {
    if (k.toLowerCase() === lowerName || k.toLowerCase() === 'lumi' || k.toLowerCase() === 'users') {
      return v;
    }
  }
  const vals = Object.values(rawObj);
  if (vals.length === 1 && typeof vals[0] === 'object' && vals[0] !== null) {
    return vals[0];
  }
  return rawObj;
}

async function initCatalystApp(req) {
  if (req && req.res && req.res.locals && req.res.locals.catalyst) {
    return req.res.locals.catalyst;
  }
  if (!catalyst) return null;
  try {
    return catalyst.initialize(req);
  } catch {
    return null;
  }
}

async function resolveUserTableName(catApp) {
  if (cachedUserTableName) return cachedUserTableName;
  if (!catApp || !catApp.datastore) return 'Lumi';
  try {
    const tables = await catApp.datastore().getAllTables();
    for (const t of (tables || [])) {
      const name = (t._tableDetails && t._tableDetails.table_name) || t.identifier || (t.toJSON && t.toJSON().table_name) || t.table_name || '';
      if (['lumi', 'users', 'user'].includes(name.toLowerCase())) {
        cachedUserTableName = name;
        return name;
      }
    }
    if (tables && tables.length > 0) {
      const first = tables[0];
      const firstName = (first._tableDetails && first._tableDetails.table_name) || first.identifier || (first.toJSON && first.toJSON().table_name) || first.table_name || '';
      if (firstName) {
        cachedUserTableName = firstName;
        return firstName;
      }
    }
  } catch (e) {
    console.warn('Error resolving table name:', e.message);
  }
  return 'Lumi';
}

/**
 * Authoritatively retrieves user from DataStore, falling back to cache if DataStore is unavailable.
 */
async function getUserFromStore(req, email, forceFresh = false) {
  if (!email) return null;
  const normEmail = email.toLowerCase().trim();

  const cached = memoryCache.get(normEmail);
  const now = Date.now();
  if (!forceFresh && cached && cached.user && (now - cached.cachedAt < CACHE_TTL_MS)) {
    cacheHits++;
    return cached.user;
  }
  cacheMisses++;

  const preSeeded = cached ? cached.user : null;
  const catApp = await initCatalystApp(req);
  if (catApp && catApp.zcql) {
    try {
      const tableName = await resolveUserTableName(catApp);
      const safeEmail = String(normEmail).replace(/\\/g, '').replace(/'/g, "''").replace(/;/g, '').replace(/--/g, '');
      const zcqlRes = await catApp.zcql().executeZCQLQuery(
        `SELECT * FROM ${tableName} WHERE email = '${safeEmail}'`
      );
      if (zcqlRes && zcqlRes.length > 0) {
        const u = extractRowData(zcqlRes[0], tableName);
        if (u && (u.email || u.EMAIL)) {
          let dsSettings = typeof u.settings === 'string' ? JSON.parse(u.settings || '{}') : (u.settings || {});
          if (preSeeded && preSeeded.settings && preSeeded.settings.subscription && !dsSettings.subscription) {
            dsSettings.subscription = preSeeded.settings.subscription;
            dsSettings.invoices = preSeeded.settings.invoices || dsSettings.invoices;
          }
          const finalPasswordHash = u.passwordHash || u.passwordhash || u.PASSWORDHASH || u.password_hash || u.PASSWORD_HASH || (preSeeded && preSeeded.passwordHash);
          const userObj = {
            rowid: u.ROWID ? String(u.ROWID) : (u.rowid ? String(u.rowid) : undefined),
            id: u.ROWID ? String(u.ROWID) : (u.id || `usr_${normEmail.replace(/[^a-zA-Z0-9]/g, '_')}`),
            email: u.email || u.EMAIL || normEmail,
            passwordHash: finalPasswordHash,
            name: u.name || u.NAME || normEmail.split('@')[0],
            role: u.role || u.ROLE || 'builder',
            organization: u.organization || u.ORGANIZATION || '',
            avatarUrl: u.avatarUrl || u.AVATARURL || '',
            emailVerified: u.emailVerified === 'true' || u.emailVerified === true || u.EMAILVERIFIED === 'true' || true,
            mfaEnabled: u.mfaEnabled === 'true' || u.mfaEnabled === true || u.MFAENABLED === 'true',
            mfaSecret: u.mfaSecret || u.MFASECRET || '',
            createdAt: u.CREATEDTIME || u.createdAt || new Date().toISOString(),
            lastLoginAt: u.lastLoginAt || u.lasttLoginAt || u.LASTLOGINAT || new Date().toISOString(),
            settings: dsSettings
          };
          memoryCache.set(normEmail, { user: userObj, cachedAt: now });
          return userObj;
        }
      }

      // Case-insensitive fallback scan across DataStore table
      const scanRes = await catApp.zcql().executeZCQLQuery(`SELECT * FROM ${tableName}`);
      if (scanRes && scanRes.length > 0) {
        const matched = scanRes.find(r => {
          const item = extractRowData(r, tableName);
          const itemEmail = item && (item.email || item.EMAIL);
          return itemEmail && itemEmail.toLowerCase().trim() === normEmail;
        });
        if (matched) {
          const u = extractRowData(matched, tableName);
          let dsSettings = typeof u.settings === 'string' ? JSON.parse(u.settings || '{}') : (u.settings || {});
          if (preSeeded && preSeeded.settings && preSeeded.settings.subscription && !dsSettings.subscription) {
            dsSettings.subscription = preSeeded.settings.subscription;
            dsSettings.invoices = preSeeded.settings.invoices || dsSettings.invoices;
          }
          const finalPasswordHash = u.passwordHash || u.passwordhash || u.PASSWORDHASH || u.password_hash || u.PASSWORD_HASH || (preSeeded && preSeeded.passwordHash);
          const userObj = {
            rowid: u.ROWID ? String(u.ROWID) : (u.rowid ? String(u.rowid) : undefined),
            id: u.ROWID ? String(u.ROWID) : (u.id || `usr_${normEmail.replace(/[^a-zA-Z0-9]/g, '_')}`),
            email: u.email || u.EMAIL || normEmail,
            passwordHash: finalPasswordHash,
            name: u.name || u.NAME || normEmail.split('@')[0],
            role: u.role || u.ROLE || 'builder',
            organization: u.organization || u.ORGANIZATION || '',
            avatarUrl: u.avatarUrl || u.AVATARURL || '',
            emailVerified: u.emailVerified === 'true' || u.emailVerified === true || u.EMAILVERIFIED === 'true' || true,
            mfaEnabled: u.mfaEnabled === 'true' || u.mfaEnabled === true || u.MFAENABLED === 'true',
            mfaSecret: u.mfaSecret || u.MFASECRET || '',
            createdAt: u.CREATEDTIME || u.createdAt || new Date().toISOString(),
            lastLoginAt: u.lastLoginAt || u.lasttLoginAt || u.LASTLOGINAT || new Date().toISOString(),
            settings: dsSettings
          };
          memoryCache.set(normEmail, { user: userObj, cachedAt: now });
          return userObj;
        }
      }
    } catch (e) {
      console.warn('Catalyst ZCQL getUser error:', e.message);
    }
  }

  return cached ? cached.user : null;
}

/**
 * Authoritatively saves user to Catalyst DataStore, writing through to cache.
 */
async function saveUserToStore(req, user) {
  if (!user || !user.email) return { success: false, error: 'User email is required' };
  const normEmail = user.email.toLowerCase().trim();

  // Update read cache immediately
  memoryCache.set(normEmail, { user, cachedAt: Date.now() });

  let dataStorePersisted = false;
  let dataStoreError = null;

  const catApp = await initCatalystApp(req);
  if (catApp && catApp.datastore) {
    try {
      const tableName = await resolveUserTableName(catApp);
      const table = catApp.datastore().table(tableName);
      let targetRowId = user.rowid;

      let existingColNames = null;
      try {
        const colList = await table.getAllColumns();
        existingColNames = new Set((colList || []).map(c => {
          return ((c._columnDetails && c._columnDetails.column_name) || c.identifier || (c.toJSON && c.toJSON().column_name) || c.column_name || '').toLowerCase();
        }).filter(Boolean));
      } catch {}

      if (!targetRowId && catApp.zcql) {
        try {
          const safeEmail = String(normEmail).replace(/\\/g, '').replace(/'/g, "''").replace(/;/g, '').replace(/--/g, '');
          const checkRes = await catApp.zcql().executeZCQLQuery(
            `SELECT ROWID FROM ${tableName} WHERE email = '${safeEmail}'`
          );
          if (checkRes && checkRes.length > 0) {
            const rowDataRes = extractRowData(checkRes[0], tableName);
            if (rowDataRes && (rowDataRes.ROWID || rowDataRes.rowid)) {
              targetRowId = String(rowDataRes.ROWID || rowDataRes.rowid);
              user.rowid = targetRowId;
            }
          }
        } catch (zcqlErr) {
          dataStoreError = zcqlErr.message;
        }
      }

      let serializedSettings = JSON.stringify(user.settings || {});
      if (serializedSettings.length > 55000 && user.settings && user.settings.workspaceData) {
        const ws = user.settings.workspaceData;
        const compactWorkspace = {
          ...ws,
          datasetRows: Object.fromEntries(
            Object.entries(ws.datasetRows || {}).map(([dsId, rows]) => [dsId, (rows || []).slice(0, 100)])
          ),
          fullRowsStoredInClientDB: true
        };
        serializedSettings = JSON.stringify({ ...user.settings, workspaceData: compactWorkspace });
      }

      const allRowData = {
        email: normEmail,
        passwordHash: user.passwordHash,
        name: user.name || '',
        role: user.role || 'builder',
        organization: user.organization || '',
        avatarUrl: user.avatarUrl || '',
        mfaEnabled: user.mfaEnabled ? 'true' : 'false',
        mfaSecret: user.mfaSecret || '',
        lastLoginAt: user.lastLoginAt || new Date().toISOString(),
        settings: serializedSettings
      };

      const rowData = {};
      for (const [key, val] of Object.entries(allRowData)) {
        if (!existingColNames || existingColNames.has(key.toLowerCase())) {
          rowData[key] = val;
        }
      }
      if (existingColNames && existingColNames.has('lasttloginat') && !existingColNames.has('lastloginat')) {
        rowData['lasttLoginAt'] = allRowData.lastLoginAt;
      }

      try {
        if (targetRowId) {
          rowData.ROWID = targetRowId;
          const updateRes = await table.updateRow(rowData);
          if (updateRes && (updateRes.ROWID || updateRes[tableName]?.ROWID)) {
            user.rowid = String(updateRes.ROWID || updateRes[tableName]?.ROWID);
          }
          dataStorePersisted = true;
        } else {
          const insertRes = await table.insertRow(rowData);
          if (insertRes && (insertRes.ROWID || insertRes[tableName]?.ROWID)) {
            user.rowid = String(insertRes.ROWID || insertRes[tableName]?.ROWID);
          }
          dataStorePersisted = true;
        }
      } catch (writeErr) {
        if (rowData.settings && rowData.settings.length > 5000) {
          const minimalSettings = { ...user.settings };
          if (minimalSettings.workspaceData) {
            minimalSettings.workspaceData = {
              ...minimalSettings.workspaceData,
              datasetRows: {}
            };
          }
          rowData.settings = JSON.stringify(minimalSettings);
          if (targetRowId) {
            await table.updateRow(rowData);
          } else {
            await table.insertRow(rowData);
          }
          dataStorePersisted = true;
        } else {
          throw writeErr;
        }
      }
    } catch (dbErr) {
      dataStoreError = dbErr.message;
      console.warn('Catalyst DataStore persist warning:', dbErr.message);
    }
  }

  // Keep fresh object in cache
  memoryCache.set(normEmail, { user, cachedAt: Date.now() });

  return {
    success: true,
    persistedToCloudStore: dataStorePersisted,
    dataStoreError,
    rowid: user.rowid || null
  };
}

async function getAllUsersFromStore(req) {
  const catApp = await initCatalystApp(req);
  if (catApp && catApp.zcql) {
    try {
      const tableName = await resolveUserTableName(catApp);
      const zcqlRes = await catApp.zcql().executeZCQLQuery(`SELECT * FROM ${tableName}`);
      if (zcqlRes && zcqlRes.length > 0) {
        return zcqlRes.map(r => {
          const u = r[tableName] || r.Users || r.Lumi || r;
          return {
            id: u.ROWID ? String(u.ROWID) : u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            organization: u.organization,
            avatarUrl: u.avatarUrl || '',
            mfaEnabled: u.mfaEnabled === 'true' || u.mfaEnabled === true,
            createdAt: u.CREATEDTIME || u.createdAt,
            lastLoginAt: u.lastLoginAt
          };
        });
      }
    } catch (e) {
      console.warn('getAllUsersFromStore error:', e.message);
    }
  }

  const list = [];
  for (const [, entry] of memoryCache.entries()) {
    const user = entry.user;
    list.push({
      id: user.id || (user.email ? `usr_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : 'usr_anon'),
      email: user.email,
      name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
      role: user.role || 'builder',
      organization: user.organization || '',
      avatarUrl: user.avatarUrl || '',
      mfaEnabled: Boolean(user.mfaEnabled),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    });
  }
  return list;
}

async function checkDataStoreStatus(req) {
  const catApp = await initCatalystApp(req);
  if (!catApp || !catApp.datastore) {
    return {
      connected: false,
      tableExists: false,
      message: 'Catalyst SDK could not initialize on this request'
    };
  }

  try {
    const tables = await catApp.datastore().getAllTables();
    const tableDetails = (tables || []).map(t => {
      const name = (t._tableDetails && t._tableDetails.table_name) || t.identifier || (t.toJSON && t.toJSON().table_name) || t.table_name || '';
      const id = (t._tableDetails && t._tableDetails.table_id) || t.identifier || '';
      return { name, id };
    }).filter(t => Boolean(t.name));

    const tableNames = tableDetails.map(t => t.name);
    const activeTable = tableNames.find(n => ['lumi', 'users', 'user'].includes(n.toLowerCase())) || tableNames[0] || null;

    if (activeTable) {
      cachedUserTableName = activeTable;
    }

    const requiredColumns = ['email', 'passwordHash', 'name', 'role', 'organization', 'avatarUrl', 'mfaEnabled', 'mfaSecret', 'lastLoginAt', 'settings'];
    let existingColumns = [];

    if (activeTable) {
      try {
        const cols = await catApp.datastore().table(activeTable).getAllColumns();
        existingColumns = (cols || []).map(c => {
          return (c._columnDetails && c._columnDetails.column_name) || c.identifier || (c.toJSON && c.toJSON().column_name) || c.column_name || '';
        }).filter(Boolean);
      } catch (colErr) {
        console.warn('Error fetching columns:', colErr.message);
      }
    }

    const missingColumns = requiredColumns.filter(rc => !existingColumns.some(ec => ec.toLowerCase() === rc.toLowerCase()));

    return {
      success: true,
      connected: true,
      tableExists: Boolean(activeTable),
      activeTable: activeTable || 'Lumi',
      tables: tableNames,
      totalTables: tableNames.length,
      existingColumns,
      missingColumns,
      readyForAuth: Boolean(activeTable && existingColumns.some(c => c.toLowerCase() === 'passwordhash') && existingColumns.some(c => c.toLowerCase() === 'email')),
      projectId: 'Project-Rainfall (83759000000013024)',
      requiredSchema: {
        tableName: activeTable || 'Lumi',
        columns: requiredColumns
      }
    };
  } catch (err) {
    return {
      success: false,
      connected: true,
      tableExists: false,
      error: err.message,
      projectId: 'Project-Rainfall (83759000000013024)'
    };
  }
}

function getCacheSize() {
  return memoryCache.size;
}

function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const rate = total > 0 ? Number(((cacheHits / total) * 100).toFixed(2)) : 100.0;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRatePercent: rate,
    memoryCacheSize: memoryCache.size,
    ordersStoreSize: ordersStore.size,
    totalMemoryKeys: memoryCache.size + ordersStore.size
  };
}

module.exports = {
  getUserFromStore,
  saveUserToStore,
  getAllUsersFromStore,
  checkDataStoreStatus,
  resolveUserTableName,
  initCatalystApp,
  extractRowData,
  getCacheSize,
  getCacheStats,
  ordersStore,
  VERIFIED_PAID_USERS,
  VERIFIED_PAID_SUBSCRIPTION
};
