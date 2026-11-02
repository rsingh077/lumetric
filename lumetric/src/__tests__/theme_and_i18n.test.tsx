import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}

function LanguageConsumer() {
  const { language, setLanguage, t, formatCurrency, formatNumber } = useLanguage();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="title">{t('app.title')}</span>
      <span data-testid="formatted-currency">{formatCurrency(1500, 'USD')}</span>
      <span data-testid="formatted-number">{formatNumber(1250000)}</span>
      <button onClick={() => setLanguage('fr')}>Switch to French</button>
      <button onClick={() => setLanguage('es')}>Switch to Spanish</button>
      <button onClick={() => setLanguage('de')}>Switch to German</button>
    </div>
  );
}

describe('Theme and i18n Context Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  test('ThemeProvider toggles theme and persists to document attribute', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    const themeSpan = screen.getByTestId('current-theme');
    const initialTheme = themeSpan.textContent;
    expect(initialTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByText(/toggle theme/i));
    expect(themeSpan.textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    fireEvent.click(screen.getByText(/toggle theme/i));
    expect(themeSpan.textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('LanguageProvider switches language and delivers localized strings', () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toContain('Lumetric • AI Data & Document Studio');

    fireEvent.click(screen.getByText(/switch to french/i));
    expect(screen.getByTestId('current-lang').textContent).toBe('fr');
    expect(screen.getByTestId('title').textContent).toContain('Studio IA Données & Documents');

    fireEvent.click(screen.getByText(/switch to spanish/i));
    expect(screen.getByTestId('current-lang').textContent).toBe('es');
    expect(screen.getByTestId('title').textContent).toContain('Estudio de Datos y Documentos IA');

    fireEvent.click(screen.getByText(/switch to german/i));
    expect(screen.getByTestId('current-lang').textContent).toBe('de');
    expect(screen.getByTestId('title').textContent).toContain('KI Daten- & Dokumenten-Studio');
  });

  test('Skeleton components render with proper accessibility attributes', () => {
    render(
      <div>
        <Skeleton className="w-10 h-10" />
        <SkeletonCard lines={2} />
        <SkeletonChart height="200px" />
        <SkeletonTable rows={3} cols={4} />
      </div>
    );

    expect(screen.getByLabelText(/loading card content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loading visual chart data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loading data table/i)).toBeInTheDocument();
  });
});
