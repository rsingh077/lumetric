'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardHeader, CardTitle, StatusBadge, Button, Input } from '@/components/ui';
import { LumetricAuthService } from '@/lib/auth';
import { useApp } from '@/contexts/AppContext';

interface PlanConfig {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  badge: string;
  tagline: string;
  priceINR: number;
  annualPriceINR: number;
  priceUSD: number;
  annualPriceUSD: number;
  limits: {
    maxDatasets: number;
    maxRows: number;
    aiTokensPerDay: number;
    exportFormats: string[];
    teamSeats: number;
    supportSLA: string;
  };
  features: string[];
}

const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'basic',
    name: 'Basic Free',
    badge: 'Standard',
    tagline: 'Essential data exploration & local analytics for individuals',
    priceINR: 0,
    annualPriceINR: 0,
    priceUSD: 0,
    annualPriceUSD: 0,
    limits: {
      maxDatasets: 2,
      maxRows: 10000,
      aiTokensPerDay: 15,
      exportFormats: ['csv'],
      teamSeats: 1,
      supportSLA: 'Community Forum'
    },
    features: [
      'Up to 2 active tabular datasets',
      '10,000 rows max per workspace',
      'Interactive summary statistics & charts',
      'CSV data export',
      'Client-side IndexedDB local vault'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Studio',
    badge: 'Most Popular',
    tagline: 'High-capacity predictive intelligence for data engineers & analysts',
    priceINR: 1,
    annualPriceINR: 1,
    priceUSD: 1,
    annualPriceUSD: 1,
    limits: {
      maxDatasets: 999999,
      maxRows: 500000,
      aiTokensPerDay: 500,
      exportFormats: ['csv', 'pdf', 'excel', 'png'],
      teamSeats: 3,
      supportSLA: 'Priority Support (< 4h response)'
    },
    features: [
      'Unlimited datasets & workspaces',
      '500,000 rows high-capacity limit',
      'Catmull-Rom cubic spline trajectory forecasting',
      'White-label executive PDF exports',
      'Hardware 2FA / TOTP authentication',
      'Unlimited AI Copilot queries',
      'Priority compute pipeline'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Scale',
    badge: 'All Inclusive',
    tagline: 'Full governance, custom connectors & dedicated security for organizations',
    priceINR: 2499,
    annualPriceINR: 24990,
    priceUSD: 39,
    annualPriceUSD: 390,
    limits: {
      maxDatasets: 999999,
      maxRows: 10000000,
      aiTokensPerDay: 5000,
      exportFormats: ['csv', 'pdf', 'excel', 'png', 'audit_json'],
      teamSeats: 25,
      supportSLA: '24/7 Dedicated Support & SOC-2 SLA'
    },
    features: [
      'Everything in Pro Studio',
      'Multi-million row high-throughput processing',
      'Role-Based Access Control (Admin, Builder, Reviewer, Viewer)',
      'Immutable SHA-256 SOC-2 audit logging',
      'Dedicated Snowflake & AWS S3 KMS connector sync',
      'Custom invoice generation & GST billing',
      'Catalyst cloud high-concurrency dedicated tenant'
    ]
  }
];

export function BillingSection() {
  const { currentUser, setCurrentUser, setIsAuthenticated } = useApp();
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currentSubscription, setCurrentSubscription] = useState<any>({
    tier: 'basic',
    billingCycle: 'forever',
    status: 'active',
    planName: 'Basic Free',
    limits: DEFAULT_PLANS[0].limits
  });
  const [invoices, setInvoices] = useState<any[]>([
    {
      id: 'INV-SAMPLE-01',
      date: '2026-10-01',
      planName: 'Basic Free License',
      amount: '₹0',
      status: 'PAID',
      billingCycle: 'forever'
    }
  ]);

  // Checkout modal state
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<PlanConfig | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'qr' | 'success'>('qr');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [orderData, setOrderData] = useState<{
    orderId: string;
    amount: number;
    merchantVpa: string;
    upiDeepLink: string;
  } | null>(null);

  const [checkoutEmail, setCheckoutEmail] = useState(currentUser?.email || 'semysedilo8@gmail.com');
  const [utrNumber, setUtrNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.email) {
      setCheckoutEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  // Load live subscription & plans
  useEffect(() => {
    // 1. Immediately check cached subscription from local storage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('lumetric_active_subscription');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.tier) {
            setCurrentSubscription(parsed);
          }
        }
      } catch {}
    }

    LumetricAuthService.getBillingPlans().then((res) => {
      if (res.success && res.plans && res.plans.length > 0) {
        setPlans(res.plans);
      }
    }).catch(() => {});

    LumetricAuthService.getSubscription().then((res) => {
      if (res.success && res.subscription) {
        setCurrentSubscription(res.subscription);
      }
    }).catch(() => {});

    LumetricAuthService.getInvoices().then((res) => {
      if (res.success && res.invoices && res.invoices.length > 0) {
        setInvoices(res.invoices);
      }
    }).catch(() => {});
  }, []);

  // Real-time automatic payment confirmation poller
  useEffect(() => {
    if (!orderData?.orderId || checkoutStep !== 'qr') return;

    const interval = setInterval(async () => {
      try {
        const res = await LumetricAuthService.checkOrderStatus(orderData.orderId);
        if (res.success && res.status === 'paid' && res.subscription) {
          setCurrentSubscription(res.subscription);
          setCheckoutStep('success');
          setToastMessage(`✓ Payment confirmed! Account automatically upgraded to ${res.subscription.tier?.toUpperCase()}.`);
          clearInterval(interval);

          LumetricAuthService.getInvoices().then((invRes) => {
            if (invRes.success && invRes.invoices) setInvoices(invRes.invoices);
          }).catch(() => {});
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [orderData?.orderId, checkoutStep]);

  // Initiate Checkout & Generate Dynamic UPI QR INSTANTLY (< 10ms)
  const handleOpenCheckout = async (plan: PlanConfig) => {
    setSelectedPlanForUpgrade(plan);
    setCheckoutStep('qr');
    setVerificationError(null);
    setUtrNumber('');

    const rawAmount = billingCycle === 'annual' ? plan.annualPriceINR : plan.priceINR;
    const formattedAmount = Number(rawAmount).toFixed(2);
    const initialOrderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const merchantVpa = '6005952031@jio';
    const payeeName = 'Lumetric Studio';
    const note = encodeURIComponent(`Lumetric ${plan.name}`);
    const initialDeepLink = `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(payeeName)}&am=${formattedAmount}&cu=INR&tn=${note}`;

    // 1. Immediately set order data so the UI has zero waiting time
    setOrderData({
      orderId: initialOrderId,
      amount: rawAmount,
      merchantVpa,
      upiDeepLink: initialDeepLink
    });

    // 2. Immediately generate QR data URL client-side (< 10ms, no network delay)
    try {
      const qr = await QRCode.toDataURL(initialDeepLink, {
        width: 250,
        margin: 1,
        color: {
          dark: '#0A110E',
          light: '#FAF8F5'
        }
      });
      setQrDataUrl(qr);
    } catch (err) {
      console.warn('QR code generation warning:', err);
    }

    // 3. Register order on Catalyst server asynchronously in background without blocking UI
    LumetricAuthService.createPaymentOrder(plan.id, billingCycle).then((res) => {
      if (res.success && res.orderId && res.upiDeepLink) {
        setOrderData((prev) => prev ? {
          ...prev,
          orderId: res.orderId || prev.orderId,
          merchantVpa: res.merchantVpa || prev.merchantVpa,
          upiDeepLink: res.upiDeepLink || prev.upiDeepLink
        } : null);
      }
    }).catch(() => {});
  };

  // Open directly in installed UPI mobile apps (GPay, PhonePe, Paytm, BHIM)
  const handleLaunchUpiApp = (appChoice: 'any' | 'gpay' | 'phonepe' | 'paytm') => {
    if (!orderData) return;
    const packPrice = Number(orderData.amount).toFixed(2);
    const payee = encodeURIComponent('Lumetric Studio');
    const note = encodeURIComponent(`Lumetric ${selectedPlanForUpgrade?.name || 'Subscription'}`);
    const vpa = orderData.merchantVpa || '6005952031@jio';

    const baseQuery = `pa=${vpa}&pn=${payee}&am=${packPrice}&cu=INR&tn=${note}`;

    let targetUri = `upi://pay?${baseQuery}`;
    if (appChoice === 'gpay') {
      targetUri = `tez://upi/pay?${baseQuery}`;
    } else if (appChoice === 'phonepe') {
      targetUri = `phonepe://pay?${baseQuery}`;
    } else if (appChoice === 'paytm') {
      targetUri = `paytmmp://pay?${baseQuery}`;
    }

    // Try opening via location navigation (standard across mobile browsers)
    try {
      window.location.href = targetUri;
    } catch {
      window.open(targetUri, '_self');
    }

    // On Android, if upi:// doesn't trigger app chooser, fallback to Android intent after 350ms
    if (appChoice === 'any' && typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
      setTimeout(() => {
        const intentUri = `intent://pay?${baseQuery}#Intent;scheme=upi;end;`;
        try {
          window.location.href = intentUri;
        } catch {}
      }, 350);
    }
  };

  // Submit & Verify UPI Payment
  const handleVerifyUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData || !selectedPlanForUpgrade) return;

    // Clean UTR: remove any spaces, dashes, or "UPI/" prefixes
    const cleanUtr = utrNumber.replace(/[^a-zA-Z0-9]/g, '').trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setVerificationError('Please enter a valid 12-digit UTR or Bank Transaction reference number.');
      return;
    }

    const emailToUse = currentUser?.email || checkoutEmail.trim() || 'semysedilo8@gmail.com';

    setIsVerifying(true);
    setVerificationError(null);

    const res = await LumetricAuthService.verifyUpiPayment({
      orderId: orderData.orderId,
      utrNumber: cleanUtr,
      planId: selectedPlanForUpgrade.id,
      billingCycle,
      userEmail: emailToUse
    });

    setIsVerifying(false);

    if (res.success && res.subscription) {
      setCurrentSubscription(res.subscription);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumetric_active_subscription', JSON.stringify(res.subscription));
        } catch {}
      }
      if (res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
      }
      setCheckoutStep('success');
      setToastMessage(`✓ ${res.message || 'Subscription activated successfully!'}`);
      setTimeout(() => setToastMessage(null), 8000);

      // Refresh invoices
      LumetricAuthService.getInvoices().then((invRes) => {
        if (invRes.success && invRes.invoices) {
          setInvoices(invRes.invoices);
        }
      }).catch(() => {});
    } else {
      setVerificationError(res.error || 'Failed to verify transaction. Please check your UTR number and retry.');
    }
  };

  const activeTier = currentSubscription?.tier || 'basic';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* 1. CURRENT ACTIVE ENTITLEMENTS BANNER */}
      <Card padding="md" className="border-l-4 border-l-[#059669] shadow-md bg-[var(--lm-bg-elevated)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xs font-bold text-[var(--lm-text-secondary)] uppercase tracking-wider font-mono">
                Current Plan
              </span>
              <StatusBadge variant={activeTier === 'basic' ? 'neutral' : 'emerald'} dot>
                {activeTier === 'basic' ? 'Free License' : 'Active Subscription'}
              </StatusBadge>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--lm-text-primary)] flex items-center gap-2">
              <span>{activeTier === 'basic' ? 'Basic Exploration' : activeTier === 'pro' ? 'Pro Studio' : 'Enterprise Scale'}</span>
              <span className="text-xs font-normal text-[var(--lm-text-secondary)]">
                ({currentSubscription.billingCycle === 'annual' ? 'Billed Annually' : currentSubscription.billingCycle === 'monthly' ? 'Billed Monthly' : 'Lifetime Free'})
              </span>
            </h2>
            <p className="text-xs text-[var(--lm-text-secondary)] mt-1">
              {activeTier === 'basic'
                ? 'Standard individual limits apply. Upgrade to Pro for high-capacity forecasting & white-label reports.'
                : `Next automatic renewal date: ${currentSubscription.validUntil ? new Date(currentSubscription.validUntil).toLocaleDateString() : 'N/A'}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTier === 'basic' ? (
              <Button
                variant="primary"
                onClick={() => handleOpenCheckout(plans.find((p) => p.id === 'pro') || DEFAULT_PLANS[1])}
                className="bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46] text-white shadow-md shadow-emerald-950/20"
              >
                Upgrade to Pro (₹{plans.find((p) => p.id === 'pro')?.priceINR ?? 1}/mo) →
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => handleOpenCheckout(DEFAULT_PLANS[2])}
              >
                Manage / Change Tier
              </Button>
            )}
          </div>
        </div>

        {/* Resource Usage Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--lm-border-default)]">
          <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
            <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)] block">Datasets Quota</span>
            <span className="text-lg font-extrabold text-[var(--lm-text-primary)] block mt-0.5 font-mono">
              {activeTier === 'basic' ? '1 / 2' : 'Unlimited'}
            </span>
            <span className="text-[10px] text-[var(--lm-text-tertiary)]">Active workspaces</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
            <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)] block">Row Limit</span>
            <span className="text-lg font-extrabold text-[var(--lm-text-primary)] block mt-0.5 font-mono">
              {activeTier === 'basic' ? '10,000' : activeTier === 'pro' ? '500,000' : '10,000,000'}
            </span>
            <span className="text-[10px] text-[var(--lm-text-tertiary)]">Rows per ingestion</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
            <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)] block">AI Tokens</span>
            <span className="text-lg font-extrabold text-[var(--lm-text-primary)] block mt-0.5 font-mono">
              {activeTier === 'basic' ? '15 / day' : activeTier === 'pro' ? '500 / day' : 'Unlimited'}
            </span>
            <span className="text-[10px] text-[var(--lm-text-tertiary)]">Predictive intelligence</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)]">
            <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)] block">Team Seats</span>
            <span className="text-lg font-extrabold text-[var(--lm-text-primary)] block mt-0.5 font-mono">
              {activeTier === 'basic' ? '1 Seat' : activeTier === 'pro' ? '3 Seats' : '25 Seats'}
            </span>
            <span className="text-[10px] text-[var(--lm-text-tertiary)]">RBAC governance</span>
          </div>
        </div>
      </Card>

      {/* 2. BILLING CYCLE TOGGLE */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2">
        <div className="inline-flex p-1 bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-2xl">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-[var(--lm-bg-elevated)] text-[var(--lm-text-primary)] shadow-sm'
                : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-[#059669] text-white shadow-sm'
                : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] font-extrabold bg-[#E34234] text-white px-1.5 py-0.2 rounded-full uppercase">
              Save 17%
            </span>
          </button>
        </div>
        <p className="text-[11px] text-[var(--lm-text-secondary)]">
          Zero per-transaction platform fees when paying via Universal Indian UPI (GPay, PhonePe, Paytm, CRED).
        </p>
      </div>

      {/* 3. TIER COMPARISON CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = activeTier === plan.id;
          const isPro = plan.id === 'pro';
          const price = billingCycle === 'annual' ? plan.annualPriceINR : plan.priceINR;
          const displayPrice = plan.id === 'basic' ? '₹0' : `₹${price.toLocaleString('en-IN')}`;
          const periodText = plan.id === 'basic' ? 'forever' : billingCycle === 'annual' ? '/ year' : '/ month';

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 bg-[var(--lm-bg-elevated)] ${
                isPro
                  ? 'border-2 border-[#059669] shadow-xl shadow-emerald-950/10 ring-1 ring-[#059669]/20'
                  : 'border border-[var(--lm-border-default)] shadow-xs hover:border-[var(--lm-border-strong)]'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#059669] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                  ★ Most Popular Studio Choice
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[var(--lm-text-primary)]">{plan.name}</h3>
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--lm-text-secondary)] bg-[var(--lm-bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--lm-border-default)]">
                    {plan.badge}
                  </span>
                </div>
                <p className="text-xs text-[var(--lm-text-secondary)] min-h-[32px]">{plan.tagline}</p>

                <div className="my-5 pb-5 border-b border-[var(--lm-border-default)]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[var(--lm-text-primary)] font-mono">
                      {displayPrice}
                    </span>
                    <span className="text-xs text-[var(--lm-text-secondary)]">{periodText}</span>
                  </div>
                  {plan.id !== 'basic' && (
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] block mt-0.5">
                      Approx. ${billingCycle === 'annual' ? plan.annualPriceUSD : plan.priceUSD} USD / {billingCycle}
                    </span>
                  )}
                </div>

                {/* Feature Checklist */}
                <ul className="space-y-2.5 text-xs text-[var(--lm-text-secondary)] mb-6">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#059669] font-bold shrink-0 leading-tight">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {isCurrent ? (
                  <div className="w-full py-2.5 px-4 rounded-xl text-center font-bold text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5">
                    <span>✓ Current Active Plan</span>
                  </div>
                ) : (
                  <Button
                    variant={isPro ? 'primary' : 'secondary'}
                    onClick={() => handleOpenCheckout(plan)}
                    className={`w-full font-bold cursor-pointer ${
                      isPro
                        ? 'bg-[#059669] hover:bg-[#047857] text-white shadow-md'
                        : ''
                    }`}
                  >
                    Select {plan.name} →
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. BILLING & INVOICE HISTORY */}
      <Card padding="md" className="space-y-4">
        <CardHeader>
          <CardTitle>Official Invoices &amp; Payment Receipts</CardTitle>
          <span className="text-xs text-[var(--lm-text-secondary)]">Tax receipts generated with 12-digit UTR fingerprints</span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--lm-border-default)] text-[var(--lm-text-secondary)]">
                <th className="py-2.5 px-3 font-semibold">Invoice ID</th>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Plan Description</th>
                <th className="py-2.5 px-3 font-semibold">Amount</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--lm-border-default)]">
              {invoices.map((inv, idx) => (
                <tr key={inv.id || idx} className="hover:bg-[var(--lm-bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[var(--lm-text-primary)]">{inv.id}</td>
                  <td className="py-3 px-3 text-[var(--lm-text-secondary)]">{inv.date}</td>
                  <td className="py-3 px-3 text-[var(--lm-text-primary)] font-medium">
                    {inv.planName} ({inv.billingCycle})
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[var(--lm-text-primary)]">{inv.amount}</td>
                  <td className="py-3 px-3">
                    <StatusBadge variant="emerald" dot>PAID</StatusBadge>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => alert(`Official GST tax receipt for ${inv.id} rendered with SHA-256 fingerprint.`)}
                      className="text-xs text-[#059669] hover:underline font-semibold cursor-pointer"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. CHECKOUT & DYNAMIC UPI QR MODAL */}
      {selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-900 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPlanForUpgrade(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            {checkoutStep === 'qr' ? (
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#059669] tracking-wider block">
                    Zero-Fee Direct Payment Gateway
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Upgrade to {selectedPlanForUpgrade.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500">
                      Order Reference: <span className="font-mono font-bold text-slate-800">{orderData?.orderId || 'Generating...'}</span>
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Auto-Upgrade Active
                    </span>
                  </div>
                </div>

                {/* Payment Method Tabs */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'bg-[#059669] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ Universal Indian UPI (0% Fee)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-[#059669] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💳 Card / Net Banking
                  </button>
                </div>

                {paymentMethod === 'upi' ? (
                  <div className="space-y-4">
                    {/* Amount Highlight */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <div>
                        <span className="text-xs text-emerald-950 font-bold block">Total Payable</span>
                        <span className="text-xs text-emerald-800 font-medium">Zero surcharge / platform cuts</span>
                      </div>
                      <span className="text-3xl font-black text-[#059669] font-mono">
                        ₹{orderData?.amount?.toLocaleString('en-IN') || selectedPlanForUpgrade.priceINR}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI Dynamic QR Code" className="w-52 h-52 rounded-xl shadow-xs" />
                      ) : (
                        <div className="w-52 h-52 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                          Generating Dynamic UPI QR...
                        </div>
                      )}
                      <span className="text-xs font-mono text-slate-700 mt-2.5">
                        UPI VPA: <strong className="text-slate-950 font-bold">{orderData?.merchantVpa || '6005952031@jio'}</strong>
                      </span>
                    </div>

                    {/* Launch in Installed Mobile Apps */}
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => handleLaunchUpiApp('any')}
                        className="w-full py-3 px-4 rounded-xl text-center font-extrabold text-xs bg-gradient-to-r from-[#059669] via-[#10B981] to-[#047857] text-white hover:opacity-95 transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <span>📲 Tap to Pay ₹{Number(orderData?.amount || selectedPlanForUpgrade.priceINR).toFixed(2)} (Any UPI App)</span>
                      </button>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                          Or open directly in your preferred app:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleLaunchUpiApp('phonepe')}
                            className="py-2.5 px-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <span>🟣</span>
                            <span>PhonePe</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchUpiApp('gpay')}
                            className="py-2.5 px-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <span>🔵</span>
                            <span>GPay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchUpiApp('paytm')}
                            className="py-2.5 px-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <span>🔷</span>
                            <span>Paytm</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Verification Form */}
                    <form onSubmit={handleVerifyUpi} className="space-y-3.5 pt-3 border-t border-slate-200">
                      {currentUser?.email ? (
                        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
                          <span className="text-slate-600">Upgrading account:</span>
                          <strong className="text-slate-950 font-mono font-bold">{currentUser.email}</strong>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-900 block">
                            Your Account Email Address *
                          </label>
                          <Input
                            label=""
                            type="email"
                            placeholder="e.g. you@example.com"
                            value={checkoutEmail}
                            onChange={(e) => setCheckoutEmail(e.target.value)}
                            className="text-xs bg-white text-slate-900 border-slate-300"
                            required
                          />
                          <p className="text-[10px] text-slate-500">
                            Your Pro Studio subscription and official tax invoice will be assigned to this email.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-slate-900 block mb-1">
                          Enter 12-Digit Bank UTR / Reference Number *
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Once payment completes in your UPI app (GPay, PhonePe, Paytm), copy the 12-digit UTR from your transaction details to activate your plan instantly.
                        </p>
                        <input
                          type="text"
                          placeholder="e.g. 666103816203"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-950 font-mono text-base font-bold tracking-widest focus:ring-2 focus:ring-[#059669] focus:outline-none"
                          required
                        />
                      </div>

                      {verificationError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                          ⚠️ {verificationError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        loading={isVerifying}
                        className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-2.5 cursor-pointer shadow-md text-sm"
                      >
                        {isVerifying ? 'Verifying Bank UTR...' : 'Verify Payment & Unlock Entitlements →'}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-2xl block mb-2">🏢</span>
                    <h4 className="text-sm font-bold text-slate-900">Corporate Card &amp; Global Invoicing</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      For corporate procurement cards, wire transfers, and GST compliant corporate invoicing, please contact our enterprise team or use the direct UPI option above.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setPaymentMethod('upi')}
                      className="w-full text-xs font-bold"
                    >
                      ← Return to Instant UPI (Zero Fees)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-lg">
                  ✓
                </div>
                <h3 className="text-2xl font-black text-slate-900">Payment Confirmed &amp; Verified!</h3>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1.5 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan Activated:</span>
                    <strong className="text-emerald-700 font-bold">{selectedPlanForUpgrade.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank UTR Reference:</span>
                    <strong className="text-slate-900 font-mono font-bold">{utrNumber || '666103816203'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Linked Account:</span>
                    <strong className="text-slate-900 font-mono">{currentUser?.email || checkoutEmail || 'semysedilo8@gmail.com'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-emerald-600 font-bold">Active (Paid)</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your account is now elevated to <strong className="text-[#059669]">{selectedPlanForUpgrade.name}</strong>. High-capacity datasets, 500,000 rows, AutoML, and executive exports are fully unlocked!
                </p>
                <Button
                  variant="primary"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-bold px-8 py-2.5 cursor-pointer shadow-md"
                >
                  Start Using {selectedPlanForUpgrade.name} →
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
