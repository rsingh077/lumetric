'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardHeader, CardTitle, StatusBadge, Button, Input } from '@/components/ui';
import { LumetricAuthService } from '@/lib/auth';

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
    priceINR: 799,
    annualPriceINR: 7990,
    priceUSD: 12,
    annualPriceUSD: 120,
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

  const [utrNumber, setUtrNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load live subscription & plans
  useEffect(() => {
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

  // Initiate Checkout & Generate Dynamic UPI QR
  const handleOpenCheckout = async (plan: PlanConfig) => {
    setSelectedPlanForUpgrade(plan);
    setCheckoutStep('qr');
    setVerificationError(null);
    setUtrNumber('');

    const res = await LumetricAuthService.createPaymentOrder(plan.id, billingCycle);
    if (res.success && res.orderId && res.amount && res.upiDeepLink) {
      setOrderData({
        orderId: res.orderId,
        amount: res.amount,
        merchantVpa: res.merchantVpa || 'lumetric@icici',
        upiDeepLink: res.upiDeepLink
      });

      try {
        const qr = await QRCode.toDataURL(res.upiDeepLink, {
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
    }
  };

  // Submit & Verify UPI Payment
  const handleVerifyUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData || !selectedPlanForUpgrade) return;

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setVerificationError('Please enter a valid 12-digit UTR or Bank Transaction reference number.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    const res = await LumetricAuthService.verifyUpiPayment({
      orderId: orderData.orderId,
      utrNumber: cleanUtr,
      planId: selectedPlanForUpgrade.id,
      billingCycle
    });

    setIsVerifying(false);

    if (res.success && res.subscription) {
      setCurrentSubscription(res.subscription);
      setCheckoutStep('success');
      setToastMessage(`✓ ${res.message || 'Subscription activated successfully!'}`);
      setTimeout(() => setToastMessage(null), 5000);

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
                onClick={() => handleOpenCheckout(DEFAULT_PLANS[1])}
                className="bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46] text-white shadow-md shadow-emerald-950/20"
              >
                Upgrade to Pro (₹799/mo) →
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
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 ${
                isPro
                  ? 'bg-gradient-to-b from-[#FAF8F5] to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/20 border-2 border-[#059669] shadow-xl shadow-emerald-950/10'
                  : 'bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] shadow-xs'
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
                  <Button variant="secondary" disabled className="w-full font-bold">
                    Current Active Plan
                  </Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#FAF8F5] dark:bg-[#111C17] border border-[#E5D9C8]/40 dark:border-emerald-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-[var(--lm-text-primary)] max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPlanForUpgrade(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            {checkoutStep === 'qr' ? (
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#059669] tracking-wider block">
                    Zero-Fee Direct Payment Gateway
                  </span>
                  <h3 className="text-xl font-extrabold text-[var(--lm-text-primary)]">
                    Upgrade to {selectedPlanForUpgrade.name}
                  </h3>
                  <p className="text-xs text-[var(--lm-text-secondary)] mt-0.5">
                    Order Reference: <span className="font-mono font-bold">{orderData?.orderId || 'Generating...'}</span>
                  </p>
                </div>

                {/* Payment Method Tabs */}
                <div className="grid grid-cols-2 p-1 bg-[var(--lm-bg-secondary)] rounded-2xl border border-[var(--lm-border-default)]">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'bg-[#059669] text-white shadow-sm'
                        : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
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
                        : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                    }`}
                  >
                    💳 Card / Net Banking
                  </button>
                </div>

                {paymentMethod === 'upi' ? (
                  <div className="space-y-4">
                    {/* Amount Highlight */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                      <div>
                        <span className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold block">Total Payable</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">Zero surcharge / platform cuts</span>
                      </div>
                      <span className="text-2xl font-black text-[#059669] font-mono">
                        ₹{orderData?.amount?.toLocaleString('en-IN') || selectedPlanForUpgrade.priceINR}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI Dynamic QR Code" className="w-52 h-52 rounded-xl shadow-xs" />
                      ) : (
                        <div className="w-52 h-52 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                          Generating Dynamic UPI QR...
                        </div>
                      )}
                      <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-2.5">
                        UPI VPA: <strong className="text-slate-900 dark:text-white">{orderData?.merchantVpa || 'lumetric@icici'}</strong>
                      </span>
                    </div>

                    {/* Mobile UPI Deep Link */}
                    {orderData?.upiDeepLink && (
                      <a
                        href={orderData.upiDeepLink}
                        className="block w-full py-2.5 px-4 rounded-xl text-center font-bold text-xs bg-slate-900 dark:bg-slate-800 text-white hover:bg-black transition-all shadow-sm"
                      >
                        📲 Tap to Pay via GPay / PhonePe / Paytm / BHIM
                      </a>
                    )}

                    {/* Step 2: Verification Form */}
                    <form onSubmit={handleVerifyUpi} className="space-y-3 pt-2 border-t border-[var(--lm-border-default)]">
                      <div>
                        <label className="text-xs font-bold text-[var(--lm-text-primary)] block mb-1">
                          Step 2: Enter 12-Digit Bank UTR / Reference Number
                        </label>
                        <p className="text-[11px] text-[var(--lm-text-secondary)] mb-2">
                          Once payment completes in your UPI app, copy the 12-digit UTR from your bank transaction details to activate your plan instantly.
                        </p>
                        <Input
                          label=""
                          placeholder="e.g. 429810293812"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="font-mono text-sm tracking-widest font-bold"
                          required
                        />
                      </div>

                      {verificationError && (
                        <p className="text-xs text-red-600 font-semibold">{verificationError}</p>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        loading={isVerifying}
                        className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-2.5 cursor-pointer shadow-md"
                      >
                        {isVerifying ? 'Verifying Bank UTR...' : 'Verify Payment & Unlock Entitlements →'}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-4 p-5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-center">
                    <span className="text-2xl block mb-2">🏢</span>
                    <h4 className="text-sm font-bold text-[var(--lm-text-primary)]">Corporate Card &amp; Global Invoicing</h4>
                    <p className="text-xs text-[var(--lm-text-secondary)] leading-relaxed">
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
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-lg">
                  ✓
                </div>
                <h3 className="text-2xl font-black text-[var(--lm-text-primary)]">Payment Confirmed!</h3>
                <p className="text-xs text-[var(--lm-text-secondary)] max-w-sm mx-auto">
                  Your account has been elevated to <strong className="text-[#059669]">{selectedPlanForUpgrade.name}</strong>. High-capacity datasets, 2FA, and executive exports are now fully unlocked.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-bold px-8 py-2.5 cursor-pointer"
                >
                  Enter Studio with {selectedPlanForUpgrade.name}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
