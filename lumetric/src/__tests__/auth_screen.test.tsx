import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from '@/contexts/AppContext';
import { AuthScreen } from '@/components/auth/AuthScreen';

// Mock scrollTo for jsdom
window.scrollTo = jest.fn();

describe('AuthScreen Component Flow', () => {
  test('Renders Sign In screen with email input and authentication buttons', () => {
    render(
      <AppProvider>
        <AuthScreen initialMode="signin" />
      </AppProvider>
    );

    const emailInputs = screen.getAllByPlaceholderText(/name@company\.com/i);
    expect(emailInputs.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  test('Allows user to type email and password', () => {
    render(
      <AppProvider>
        <AuthScreen initialMode="signin" />
      </AppProvider>
    );

    const emailInput = screen.getAllByPlaceholderText(/name@company\.com/i)[0] as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'founder@techexon.app' } });
    expect(emailInput.value).toBe('founder@techexon.app');

    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(passwordInput).toBeInTheDocument();
    fireEvent.change(passwordInput, { target: { value: 'MySecretPassword123!' } });
    expect(passwordInput.value).toBe('MySecretPassword123!');
  });

  test('Renders Sign Up mode when initialMode=signup', () => {
    render(
      <AppProvider>
        <AuthScreen initialMode="signup" />
      </AppProvider>
    );

    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send 6-digit verification code/i })).toBeInTheDocument();
  });
});
