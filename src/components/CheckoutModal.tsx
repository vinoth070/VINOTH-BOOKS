import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, CheckCircle2, Lock, CreditCard,
  Smartphone, Building, AlertCircle, RefreshCw, XCircle, ArrowRight,
  Info, QrCode, Copy, Check, Wallet, RotateCcw
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { PaymentSettingsPublic, UpiPaymentConfig } from '../types';
import { apiClient } from '../services/apiClient';
import { resolveBookCover } from '../utils/imageUrl';

interface CheckoutModalProps {
  onSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onSuccess }) => {
  const {
    items, clearCart, isCheckoutOpen, setIsCheckoutOpen,
    retryOrder, cancelRetry,
    appliedCoupon, subtotal, discount, total
  } = useCart();
  const { user, token, refreshUser } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState<'review' | 'success'>('review');
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettingsPublic | null>(null);
  const [upiConfig, setUpiConfig] = useState<UpiPaymentConfig | null>(null);

  // Payment Selection: 'razorpay' or 'direct_upi'
  const [paymentChannel, setPaymentChannel] = useState<'razorpay' | 'direct_upi'>('razorpay');
  const [selectedRazorpayMethod, setSelectedRazorpayMethod] = useState<'all' | 'upi' | 'card' | 'netbanking' | 'wallet'>('all');

  // Direct UPI states
  const [upiUtr, setUpiUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmittingUpi, setIsSubmittingUpi] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Authoritative items and pricing resolution
  const displayItems = retryOrder
    ? retryOrder.items.map(it => ({
        id: it.bookId,
        title: it.title,
        price: it.price,
        coverImage: it.coverImage,
        category: 'Digital eBook'
      }))
    : items.map(i => ({
        id: i.book.id,
        title: i.book.title,
        price: i.book.sellingPrice,
        coverImage: i.book.coverImage,
        category: i.book.category
      }));

  const displaySubtotal = retryOrder ? retryOrder.subtotal : subtotal;
  const displayDiscount = retryOrder ? retryOrder.discount : discount;
  const displayTotal = retryOrder ? retryOrder.total : total;

  useEffect(() => {
    if (isCheckoutOpen) {
      setErrorMsg(null);
      setNoticeMsg(null);
      setStep('review');
      setUpiUtr('');

      // Fetch gateway public config
      apiClient.get<{ config?: PaymentSettingsPublic } & PaymentSettingsPublic>('/api/payment/config')
        .then(data => {
          const cfg = (data as any)?.config || data;
          if (cfg) setPaymentConfig(cfg);
        })
        .catch(() => {
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

      // Fetch Direct UPI settings
      apiClient.get<UpiPaymentConfig>('/api/payment/upi-config')
        .then(data => {
          if (data) setUpiConfig(data);
        })
        .catch(() => {
          setUpiConfig({
            enabled: true,
            upiId: 'vinothbooks@okhdfcbank',
            payeeName: 'VINOTH BOOKS',
            instructions: 'Transfer the exact amount to our UPI ID or scan the QR code. Enter the 12-digit UTR below for instant verification.',
            updatedAt: new Date().toISOString()
          });
        });
    }
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const handleClose = () => {
    setIsCheckoutOpen(false);
    cancelRetry();
  };

  const handleCopyUpiId = () => {
    const idToCopy = upiConfig?.upiId || 'vinothbooks@okhdfcbank';
    navigator.clipboard.writeText(idToCopy).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    });
  };

  // Submit Direct UPI Order (Supports Retry without duplicate order creation)
  const handleSubmitDirectUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedUtr = upiUtr.trim();
    if (!trimmedUtr || trimmedUtr.length < 6) {
      setErrorMsg('Please enter a valid 12-digit UPI Reference Number / UTR.');
      return;
    }

    try {
      setIsSubmittingUpi(true);
      setErrorMsg(null);
      setNoticeMsg(null);

      const payload = retryOrder
        ? { retryOrderId: retryOrder.id, upiTransactionRef: trimmedUtr }
        : {
            bookIds: items.map(i => i.book.id),
            clientBooks: items.map(i => i.book),
            couponCode: appliedCoupon?.code,
            upiTransactionRef: trimmedUtr
          };

      const res = await apiClient.post<{
        success: boolean;
        orderId: string;
        total: number;
        status: string;
        message: string;
      }>('/api/payment/submit-upi-order', payload);

      if (res?.success) {
        await refreshUser();
        clearCart();
        cancelRetry();
        setCompletedOrder({
          orderId: res.orderId,
          total: displayTotal,
          isUpiPending: true,
          utr: trimmedUtr,
          message: res.message
        });
        setStep('success');
        onSuccess(res.orderId);
      } else {
        throw new Error(res?.message || 'Failed to submit UPI order');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting UPI order. Please check your network and try again.');
    } finally {
      setIsSubmittingUpi(false);
    }
  };

  // Start Gateway Payment (Razorpay Checkout with safe retry handling)
  const handleStartPayment = async (simulatedOutcome: 'success' | 'failed' | 'cancelled' = 'success') => {
    if (!user) {
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setNoticeMsg(null);

      // 1. Authoritative Backend Payment Order Creation / Retry
      const payload = retryOrder
        ? { retryOrderId: retryOrder.id }
        : {
            bookIds: items.map(i => i.book.id),
            clientBooks: items.map(i => i.book),
            couponCode: appliedCoupon?.code
          };

      const orderData = await apiClient.post<{
        orderId: string;
        isFree?: boolean;
        amount: number;
        currency: string;
        keyId?: string | null;
        razorpayOrderId?: string | null;
        isRealOrder?: boolean;
        isRealKey?: boolean;
        isConfigured?: boolean;
        mode?: 'test' | 'live';
        customer?: { name: string; email: string };
      }>('/api/payment/create-order', payload);

      // If free order, completed immediately
      if (orderData.isFree) {
        await refreshUser();
        clearCart();
        cancelRetry();
        setCompletedOrder({ orderId: orderData.orderId, total: 0 });
        setStep('success');
        onSuccess(orderData.orderId);
        return;
      }

      // Handle Simulated Failure outcome test
      if (simulatedOutcome === 'failed') {
        await new Promise(r => setTimeout(r, 800));
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
      // A valid Razorpay checkout requires BOTH a real Key ID AND a valid Razorpay Order ID created on the server
      const hasRealCredentials = Boolean(
        orderData.keyId &&
        !orderData.keyId.includes('demo') &&
        orderData.keyId !== 'rzp_test_vinoth_books_demo' &&
        orderData.keyId.startsWith('rzp_')
      );

      const hasRegisteredOrder = Boolean(orderData.isRealOrder && orderData.razorpayOrderId);

      if (hasRealCredentials && hasRegisteredOrder && typeof (window as any).Razorpay !== 'undefined') {
        const options: any = {
          key: orderData.keyId,
          order_id: orderData.razorpayOrderId,
          amount: Math.round(orderData.amount),
          currency: orderData.currency || 'INR',
          name: 'VINOTH BOOKS',
          description: `Digital eBooks Purchase (${displayItems.length} titles)`,
          prefill: {
            name: orderData.customer?.name || user.name,
            email: orderData.customer?.email || user.email,
            contact: user.phone || '',
            ...(selectedRazorpayMethod !== 'all' ? { method: selectedRazorpayMethod } : {})
          },
          theme: {
            color: '#B38A38'
          },
          handler: async (response: any) => {
            try {
              await apiClient.post('/api/payment/verify', {
                orderId: orderData.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id || orderData.razorpayOrderId,
                razorpaySignature: response.razorpay_signature,
                paymentMethod: response.method || selectedRazorpayMethod || 'razorpay_checkout'
              });
              await refreshUser();
              clearCart();
              cancelRetry();
              setCompletedOrder({ orderId: orderData.orderId, total: displayTotal });
              setStep('success');
              onSuccess(orderData.orderId);
            } catch (verifyErr: any) {
              setErrorMsg(verifyErr.message || 'Razorpay payment signature verification failed on server.');
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setNoticeMsg('Payment checkout window was closed. You can retry anytime.');
            }
          }
        };

        // When user specifically chooses Card payment, launch Razorpay's Card interface directly
        if (selectedRazorpayMethod === 'card') {
          options.config = {
            display: {
              blocks: {
                card: {
                  name: 'Pay with Credit/Debit Card',
                  instruments: [{ method: 'card' }]
                }
              },
              sequence: ['block.card']
            }
          };
        }

        try {
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', (resp: any) => {
            setIsProcessing(false);
            const desc = resp.error?.description || resp.error?.reason || 'Payment declined by bank.';
            setErrorMsg(`Payment Failed: ${desc} You can retry or choose Direct UPI QR.`);
          });
          rzp.open();
          return;
        } catch (rzpInitErr: any) {
          console.warn('[Razorpay] Popup initialization error:', rzpInitErr);
          setErrorMsg('Failed to initialize Razorpay checkout. Please try again or use Direct UPI QR.');
          return;
        }
      }

      // If live credentials are active but server order failed or credentials are missing:
      if (orderData.mode === 'live' && (!hasRealCredentials || !hasRegisteredOrder)) {
        setErrorMsg('Razorpay Live Mode is active, but valid Live Key ID & Secret have not been verified on Render/backend to generate orders. Please configure credentials in Admin > Payment Settings, or switch to Direct UPI QR.');
        return;
      }

      // 3. Fallback Sandbox / Test Mode Checkout (when in test mode without an external gateway registered order)
      const testPaymentId = 'pay_sandbox_' + Date.now().toString().slice(-8);
      const testSignature = 'sig_sandbox_' + Math.random().toString(36).substring(2, 12);

      await new Promise(r => setTimeout(r, 600));

      await apiClient.post('/api/payment/verify', {
        orderId: orderData.orderId,
        razorpayPaymentId: testPaymentId,
        razorpayOrderId: orderData.razorpayOrderId || undefined,
        razorpaySignature: testSignature,
        paymentMethod: selectedRazorpayMethod !== 'all' ? selectedRazorpayMethod : 'sandbox_test'
      });

      await refreshUser();
      clearCart();
      cancelRetry();
      setCompletedOrder({ orderId: orderData.orderId, total: displayTotal });
      setStep('success');
      onSuccess(orderData.orderId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isTestMode = paymentConfig?.mode === 'test';
  const effectiveUpiId = upiConfig?.upiId || 'vinothbooks@okhdfcbank';
  const effectivePayee = upiConfig?.payeeName || 'VINOTH BOOKS';
  const upiQrUri = `upi://pay?pa=${effectiveUpiId}&pn=${encodeURIComponent(effectivePayee)}&am=${displayTotal}&cu=INR&tn=VINOTH_BOOKS_${retryOrder ? retryOrder.id : 'ORDER'}`;
  const qrImageSrc = upiConfig?.qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiQrUri)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-auto my-auto bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold-muted)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
              {retryOrder ? <RotateCcw className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] truncate">
                {retryOrder
                  ? `Retry Payment · ${retryOrder.id}`
                  : step === 'review'
                  ? 'Secure eBook Checkout'
                  : 'Order Confirmation'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer shrink-0"
            aria-label="Close Checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          {/* Test Mode Prominent Banner */}
          {isTestMode && step !== 'success' && paymentChannel === 'razorpay' && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span className="font-semibold">TEST MODE — Razorpay Sandbox simulation active.</span>
            </div>
          )}

          {/* Retry Notice Banner */}
          {retryOrder && step !== 'success' && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Retrying payment for order <strong>{retryOrder.id}</strong>. No duplicate order will be created.</span>
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
              <div className="border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)] max-h-40 overflow-y-auto bg-[var(--bg-surface-card)]">
                {displayItems.map(item => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={resolveBookCover(item.coverImage)}
                        alt={item.title}
                        className="w-9 h-12 object-cover rounded shadow-xs shrink-0"
                      />
                      <div className="truncate">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{item.category} · Digital eBook</p>
                      </div>
                    </div>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums shrink-0 font-serif text-sm">
                      {item.price === 0 ? 'FREE' : `₹${item.price}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Totals Summary */}
              <div className="p-4 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-mono">₹{displaySubtotal}</span>
                </div>
                {displayDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount Coupon ({appliedCoupon?.code || 'Applied'})</span>
                    <span className="tabular-nums font-mono">-₹{displayDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-subtle)] font-serif">
                  <span>Final Payable Amount</span>
                  <span className="tabular-nums font-bold text-[var(--accent-gold)]">₹{displayTotal}</span>
                </div>
              </div>

              {/* PAYMENT CHANNEL SELECTION TABS */}
              {displayTotal > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--text-primary)]">Choose Payment Method:</span>
                    <span className="text-[10px] text-[var(--accent-gold)] font-mono uppercase font-bold">100% Secure</span>
                  </div>

                  {/* Channel Switcher */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentChannel('razorpay')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        paymentChannel === 'razorpay'
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--text-primary)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Razorpay Gateway</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">UPI, Cards, NetBanking</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentChannel('direct_upi')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        paymentChannel === 'direct_upi'
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--text-primary)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Direct UPI QR</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">Scan & Pay via any App</p>
                      </div>
                    </button>
                  </div>

                  {/* CHANNEL 1: RAZORPAY SUB-METHOD FILTER PILLS */}
                  {paymentChannel === 'razorpay' && (
                    <div className="p-3.5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Select Preferred Instrument:</span>
                        <span className="font-mono text-[10px] text-[var(--accent-gold)] font-bold">256-bit TLS</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRazorpayMethod('all')}
                          className={`py-2 px-2.5 text-[11px] rounded-lg border font-medium transition-all text-center cursor-pointer ${
                            selectedRazorpayMethod === 'all'
                              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                          }`}
                        >
                          All Gateways
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRazorpayMethod('upi')}
                          className={`py-2 px-2.5 text-[11px] rounded-lg border font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedRazorpayMethod === 'upi'
                              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>UPI Apps</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRazorpayMethod('card')}
                          className={`py-2 px-2.5 text-[11px] rounded-lg border font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedRazorpayMethod === 'card'
                              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Cards</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRazorpayMethod('netbanking')}
                          className={`py-2 px-2.5 text-[11px] rounded-lg border font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedRazorpayMethod === 'netbanking'
                              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                          }`}
                        >
                          <Building className="w-3.5 h-3.5" />
                          <span>NetBanking</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-1">
                        Opens official Razorpay checkout supporting GPay, PhonePe, Paytm, CRED, RuPay, Visa, MasterCard, and 50+ Banks.
                      </p>
                    </div>
                  )}

                  {/* CHANNEL 2: DIRECT UPI QR TRANSFER */}
                  {paymentChannel === 'direct_upi' && (
                    <form onSubmit={handleSubmitDirectUpi} className="p-4 sm:p-5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-4">
                      {/* Book Summary Header */}
                      <div className="flex items-center gap-3 p-2.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)]">
                        {displayItems[0] && (
                          <img
                            src={resolveBookCover(displayItems[0].coverImage)}
                            alt={displayItems[0].title}
                            className="w-10 h-14 object-cover rounded shadow-xs shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {displayItems.length === 1 ? displayItems[0].title : `${displayItems[0]?.title} + ${displayItems.length - 1} more`}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Authoritative Price: <strong className="text-[var(--accent-gold)]">₹{displayTotal}</strong> · Order Reference: <span className="font-mono text-[10px]">{retryOrder ? retryOrder.id : 'Pending'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Large Responsive QR Code & Merchant Information */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
                        {/* High-Resolution QR Code */}
                        <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 shrink-0 text-center">
                          <img
                            src={qrImageSrc}
                            alt="Merchant UPI QR Code"
                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                          />
                          <p className="text-[10px] font-bold text-slate-700 mt-1.5 uppercase tracking-wider">
                            Scan with GPay / PhonePe / Paytm / BHIM
                          </p>
                        </div>

                        {/* Payment Target Details */}
                        <div className="space-y-2.5 text-xs flex-1 w-full min-w-0">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Verified Payee</span>
                            <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">{effectivePayee}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Merchant UPI ID (VPA)</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono font-bold text-xs sm:text-sm text-[var(--accent-gold)] bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] truncate select-all flex-1">
                                {effectiveUpiId}
                              </span>
                              <button
                                type="button"
                                onClick={handleCopyUpiId}
                                className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)] text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 font-medium"
                                title="Copy UPI ID"
                              >
                                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="text-[11px]">{copiedUpi ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Exact Amount to Pay</span>
                            <span className="font-serif font-bold text-xl text-[var(--accent-gold)]">₹{displayTotal}</span>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Instructions */}
                      <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[11px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                        {upiConfig?.instructions || '1. Scan the QR code or transfer to our UPI ID using GPay, PhonePe, Paytm, or BHIM.\n2. Pay the exact amount.\n3. Enter the 12-digit UPI Reference Number / UTR below.'}
                      </div>

                      {/* 12-Digit UTR Input with Validation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                          <span>Enter 12-Digit UPI Reference Number (UTR / Ref No.):</span>
                          <span className="text-[10px] text-[var(--accent-gold)] font-mono font-bold">Required</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={upiUtr}
                          onChange={e => setUpiUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                          placeholder="e.g. 412389102931"
                          maxLength={25}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none tracking-wider"
                        />
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Found in your banking / UPI app payment receipt under &quot;UPI Ref No.&quot; or &quot;UTR&quot;.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingUpi || upiUtr.trim().length < 6}
                        className="w-full py-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingUpi ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[#0B1325] border-t-transparent rounded-full animate-spin" />
                            <span>Submitting for Verification...</span>
                          </>
                        ) : (
                          <span>Submit Payment for Admin Verification</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Encryption Assurance */}
              <div className="flex items-center gap-2 p-3 bg-[var(--accent-gold-muted)] border border-[var(--border-strong)] rounded-xl text-[11px] text-[var(--text-secondary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span>256-bit TLS encrypted session. DRM-free digital licenses unlocked securely upon payment verification.</span>
              </div>

              {/* Razorpay Channel Pay Action Button */}
              {paymentChannel === 'razorpay' && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleStartPayment('success')}
                  className="w-full py-3.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0B1325] border-t-transparent rounded-full animate-spin" />
                      <span>Processing with Gateway...</span>
                    </>
                  ) : (
                    <span>
                      {displayTotal === 0 ? 'Claim Free eBook' : `Pay ₹${displayTotal} via Razorpay`}
                    </span>
                  )}
                </button>
              )}

              {/* Developer Test Sandbox Simulations */}
              {displayTotal > 0 && isTestMode && paymentChannel === 'razorpay' && (
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Developer Sandbox Test Cases:</span>
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-mono">Sandbox Mode</span>
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
              <div className={`w-14 h-14 mx-auto rounded-full border flex items-center justify-center shadow-xs ${
                completedOrder.isUpiPending
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }`}>
                {completedOrder.isUpiPending ? <Info className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                  {completedOrder.isUpiPending ? 'UPI Payment Submitted!' : 'Payment Verified!'}
                </h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">Order ID: {completedOrder.orderId}</p>
                {completedOrder.utr && (
                  <p className="text-[11px] text-[var(--accent-gold)] font-mono">UTR Reference: {completedOrder.utr}</p>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                {completedOrder.isUpiPending
                  ? 'Your Direct UPI reference has been submitted for administrator verification. Once verified, your digital eBooks will be automatically unlocked in your personal library.'
                  : 'Your purchase has been verified and permanently unlocked in your personal My Library. You can read online immediately or download the DRM-free eBook files anytime.'}
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    window.location.hash = '#/library';
                  }}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Open My Library
                </button>
                <button
                  type="button"
                  onClick={handleClose}
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
