'use strict';

/**
 * Lumetric Data Intelligence, Geo Cartography, and Document Treatment Service
 */

const cloudConnectorsStore = [
  {
    id: 'conn-snowflake-01',
    name: 'Production Enterprise Snowflake DW',
    type: 'Snowflake',
    host: 'xy12345.us-east-1.snowflakecomputing.com',
    database: 'ANALYTICS_PROD',
    schema: 'PUBLIC',
    status: 'connected',
    lastSync: '2 minutes ago',
    recordsSyncCount: 1482000
  },
  {
    id: 'conn-s3-lake-02',
    name: 'AWS S3 Parquet Lakehouse',
    type: 'Amazon S3',
    host: 's3.us-west-2.amazonaws.com',
    database: 'lake-lumetric-eu-west',
    schema: 'telemetry_v1',
    status: 'connected',
    lastSync: '14 minutes ago',
    recordsSyncCount: 8930400
  },
  {
    id: 'conn-bigquery-03',
    name: 'Google BigQuery Global Metrics',
    type: 'BigQuery',
    host: 'bigquery.googleapis.com',
    database: 'gcp-corp-prod',
    schema: 'revenue_intelligence',
    status: 'connected',
    lastSync: '1 hour ago',
    recordsSyncCount: 4120000
  },
  {
    id: 'conn-postgres-04',
    name: 'Internal OLTP Operational DB',
    type: 'PostgreSQL 16',
    host: 'db-replica-01.internal.lumetric.net',
    database: 'production_main',
    schema: 'core',
    status: 'syncing',
    lastSync: 'Just now',
    recordsSyncCount: 320150
  }
];

const tabularRecords = [
  { id: 'ACC-101', accountName: 'AlphaCorp Global', region: 'North America', planTier: 'Enterprise', arrUsd: 185000, nps: 84, churnRiskPct: 4.2, auditStatus: 'Verified' },
  { id: 'ACC-102', accountName: 'Metropolis Data Systems', region: 'Europe', planTier: 'Enterprise', arrUsd: 240000, nps: 92, churnRiskPct: 2.1, auditStatus: 'Verified' },
  { id: 'ACC-103', accountName: 'Zenith Logistics Tech', region: 'Asia Pacific', planTier: 'Growth', arrUsd: 78000, nps: 71, churnRiskPct: 18.4, auditStatus: 'Pending Review' },
  { id: 'ACC-104', accountName: 'Vanguard Health Analytics', region: 'North America', planTier: 'Enterprise', arrUsd: 310000, nps: 88, churnRiskPct: 3.5, auditStatus: 'Verified' },
  { id: 'ACC-105', accountName: 'Hyperion FinTech Lab', region: 'Europe', planTier: 'Growth', arrUsd: 125000, nps: 76, churnRiskPct: 12.0, auditStatus: 'Verified' },
];

module.exports = {
  cloudConnectorsStore,
  tabularRecords
};
