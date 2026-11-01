import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/contexts/AppContext';
import DashboardsPage from '@/app/dashboards/page';

describe('Dashboard Component Rendering', () => {
  test('Renders clean empty state when no dataset is selected', () => {
    render(
      <AppProvider>
        <DashboardsPage />
      </AppProvider>
    );

    expect(screen.getByText(/no tabular dataset ingested yet/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ ingest dataset in data studio/i)).toBeInTheDocument();
  });

  test('Empty state contains guidance copy for tabular ingestion', () => {
    render(
      <AppProvider>
        <DashboardsPage />
      </AppProvider>
    );

    expect(screen.getByText(/your workspace is clean/i)).toBeInTheDocument();
  });
});
