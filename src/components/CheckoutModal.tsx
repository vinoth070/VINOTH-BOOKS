import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, CheckCircle2, Lock, CreditCard,
  Smartphone, Building, AlertCircle, RefreshCw, XCircle, ArrowRight,
  Info
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { PaymentSettingsPublic } from '../types';
import { apiClient } from '../services/apiClient';
import { resolveBookCover } from '../utils/imageUrl';

interface CheckoutModalProps {
  onSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onSuccess }) => {
  const { items, clearCart, isCheckoutOpen, setIsCheckoutOpen, appliedCoupon, subtotal, discount, total } = useCart();
  const { user, token, refreshUser } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState<'review' | 'success'>('review');
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettingsPublic | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  useEffect(() => {
    if (isCheckoutOpen) {
      setErrorMsg(null);
      setNoticeMsg(null);
      setStep('review');
      apiClient.get<{ config: PaymentSettingsPublic }>('/api/payment/config')
        .then(data => {
          if (data?.config) setPaymentConfig(data.config);
        })
        .catch(() => {
          // Default test mode config if server is in static mode
          setPaymentConfig({
            mode: 'test',
            activeKeyId: '',
            isTestConfigured: false,
            isLiveConfigured: false,
            hasTestSecret: false,
            hasLiveSecret: false,
            currency: 'INR',
            isLiveConfirmed: false,
            updatedAt: new Date().toISOString()
          });
        });
    }
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const handleStartPayment = async (simulatedOutcome: 'success' | 'failed' | 'cancelled' = 'success') => {
    if (!user) {
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setNoticeMsg(null);

      // 1. Backend payment order creation
      const orderData = await apiClient.post<{
        orderId: string;
        isFree?: boolean;
        amount: number;
        currency: string;
        keyId?: string;
        razorpayOrderId?: string;
        customer?: { name: string; email: string };
      }>('/api/payment/create-order', {
        bookIds: items.map(i => i.book.id),
        couponCode: appliedCoupon?.code
      });

      // If free order, it's completed instantly
      if (orderData.isFree) {
        await refreshUser();
        clearCart();
        setCompletedOrder({ orderId: orderData.orderId, total: 0 });
        setStep('success');
        onSuccess(orderData.orderId);
        return;
      }

      // Handle Simulated Failure outcome test
      if (simulatedOutcome === 'failed') {
        await new Promise(r => setTimeout(r, 900));
        const failData = await apiClient.post<{ message?: string }>('/api/payment/simulate-outcome', {
          orderId: orderData.orderId,
          outcome: 'failed'
        });
        setErrorMsg(failData?.message || 'Payment simulation: Transaction declined by bank.');
        return;
      }

      // Handle Simulated Cancellation outcome test
      if (simulatedOutcome === 'cancelled') {
        await new Promise(r => setTimeout(r, 600));
        await apiClient.post('/api/payment/simulate-outcome', {
          orderId: orderData.orderId,
          outcome: 'cancelled'
        });
        setNoticeMsg('Payment simulation: Checkout was cancelled. Your cart items are preserved.');
        return;
      }

      // 2. Official Razorpay Checkout Popup invocation
      if (orderData.keyId && typeof (window as any).Razorpay !== 'undefined') {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'VINOTH BOOKS',
          description: `Digital eBooks Purchase (${items.length} titles)`,
          order_id: orderData.razorpayOrderId,
          prefill: {
            name: orderData.customer?.name || user.name,
            email: orderData.customer?.email || user.email
          },
          theme: {
            color: '#B38A38'
          },
          handler: async (response: any) => {
            try {
              await apiClient.post('/api/payment/verify', {
                orderId: orderData.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                paymentMethod: response.method || 'razorpay_checkout'
              });
              await refreshUser();
              clearCart();
              setCompletedOrder({ orderId: orderData.orderId, total });
              setStep('success');
              onSuccess(orderData.orderId);
            } catch (verifyErr: any) {
              setErrorMsg(verifyErr.message || 'Razorpay payment signature verification failed on server.');
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setNoticeMsg('Payment checkout window was closed before completion. No charge was made.');
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          setIsProcessing(false);
          setErrorMsg(resp.error?.description || 'Payment was declined by payment gateway.');
        });
        rzp.open();
        return;
      }

      // 3. Test Mode Server Verification (when no live/test Razorpay API key is saved in environment yet)
      const testPaymentId = 'pay_test_' + Date.now().toString().slice(-8);
      const testSignature = 'sig_test_verified_' + Math.random().toString(36).substring(2, 10);

      await new Promise(r => setTimeout(r, 800));

      await apiClient.post('/api/payment/verify', {
        orderId: orderData.orderId,
        razorpayPaymentId: testPaymentId,
        razorpayOrderId: orderData.razorpayOrderId,
        razorpaySignature: testSignature
      });

      await refreshUser();
      clearCart();
      setCompletedOrder({ orderId: orderData.orderId, total });
      setStep('success');
      onSuccess(orderData.orderId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const isTestMode = paymentConfig?.mode === 'test';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-auto my-auto bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold-muted)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] truncate">
                {step === 'review' ? 'Secure eBook Checkout' : 'Order Confirmation'}
              </h3>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer shrink-0"
            aria-label="Close Checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6">
          {/* Test Mode Prominent Banner */}
          {isTestMode && step !== 'success' && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span className="font-semibold">TEST MODE — No real money is being charged.</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-red-500 hover:text-red-400 text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {noticeMsg && (
            <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{noticeMsg}</span>
              </div>
              <button
                onClick={() => setNoticeMsg(null)}
                className="text-amber-500 hover:text-amber-400 text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Checkout Review Step */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Authenticated User Status */}
              <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl">
                <span className="text-[var(--text-secondary)] truncate">
                  Licensed to: <strong className="text-[var(--text-primary)]">{user?.name}</strong> ({user?.email})
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Active Session
                </span>
              </div>

              {/* Order Items Review */}
              <div className="border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)] max-h-44 overflow-y-auto bg-[var(--bg-surface-card)]">
                {items.map(item => (
                  <div key={item.book.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={resolveBookCover(item.book.coverImage)}
                        alt={item.book.title}
                        className="w-9 h-12 object-cover rounded shadow-xs shrink-0"
                      />
                      <div className="truncate">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{item.book.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{item.book.category} · Digital eBook</p>
                      </div>
                    </div>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums shrink-0 font-serif text-sm">
                      {item.book.sellingPrice === 0 ? 'FREE' : `₹${item.book.sellingPrice}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Totals Summary */}
              <div className="p-4 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-mono">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount Coupon ({appliedCoupon?.code})</span>
                    <span className="tabular-nums font-mono">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-subtle)] font-serif">
                  <span>Final Payable Amount</span>
                  <span className="tabular-nums">₹{total}</span>
                </div>
              </div>

              {/* Payment Gateways Supported Notice */}
              {total > 0 && (
                <div className="p-3.5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--text-secondary)]">Supported Payment Methods:</span>
                    <span className="text-[10px] uppercase font-bold text-[var(--accent-gold)] font-mono">
                      Razorpay Checkout
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>UPI & QR</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>Cards</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                      <span>NetBanking</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Payment credentials (cards, CVV, UPI PINs) are processed strictly inside Razorpay's PCI-DSS compliant checkout. VINOTH BOOKS never stores sensitive card or banking data.
                  </p>
                </div>
              )}

              {/* Encryption Assurance */}
              <div className="flex items-center gap-2 p-3 bg-[var(--accent-gold-muted)] border border-[var(--border-strong)] rounded-xl text-[11px] text-[var(--text-secondary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span>256-bit TLS encrypted session. Instant digital license unlock upon verified payment.</span>
              </div>

              {/* Pay Action Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleStartPayment('success')}
                className="w-full py-3.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0B1325] border-t-transparent rounded-full animate-spin" />
                    <span>Processing with Razorpay...</span>
                  </>
                ) : (
                  <span>
                    {total === 0 ? 'Claim Free eBook' : `Pay ₹${total} via Razorpay`}
                  </span>
                )}
              </button>

              {/* Developer Test Sandbox Simulations */}
              {total > 0 && isTestMode && (
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Developer Test Cases:</span>
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-mono">Sandbox Sandbox</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleStartPayment('failed')}
                      className="py-2 px-2 text-[11px] font-medium border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Simulate Decline</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleStartPayment('cancelled')}
                      className="py-2 px-2 text-[11px] font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] bg-[var(--bg-surface-card)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Simulate Cancel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && completedOrder && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-2xl font-bold text-[var(--text-primary)]">Payment Verified!</h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">Order ID: {completedOrder.orderId}</p>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Your purchase has been verified and permanently unlocked in your personal <strong>My Library</strong>. You can read online immediately or download the DRM-free eBook files anytime.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    window.location.hash = '#/library';
                  }}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Open My Library
                </button>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
