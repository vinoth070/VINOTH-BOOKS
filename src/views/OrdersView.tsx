import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Download,
  AlertCircle,
  XCircle,
  Ban,
  QrCode,
  CreditCard,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../services/apiClient';
import { resolveBookCover } from '../utils/imageUrl';

interface OrdersViewProps {
  onNavigate: (view: string) => void;
  onSelectBook?: (book: any) => void;
  onOpenReader?: (bookId: string) => void;
}

type OrderFilter = 'all' | 'paid' | 'pending' | 'failed';

export const OrdersView: React.FC<OrdersViewProps> = ({
  onNavigate,
  onSelectBook,
  onOpenReader
}) => {
  const { token, user } = useAuth();
  const { retryPayment } = useCart();
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ orders: Order[] }>('/api/orders');
      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      // Fallback to local cached orders
      try {
        const cached = JSON.parse(localStorage.getItem('vb_client_orders') || '[]');
        setOrders(cached);
      } catch {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOrders();
    else setLoading(false);
  }, [token]);

  const handleDownload = (bookId: string, title: string) => {
    setDownloadingId(bookId);
    try {
      const link = document.createElement('a');
      link.href = `/api/books/${bookId}/download`;
      link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'paid') {
      return order.paymentStatus === 'paid' || order.paymentStatus === 'captured';
    }
    if (filter === 'pending') {
      return order.paymentStatus === 'pending' || order.paymentStatus === 'pending_verification';
    }
    if (filter === 'failed') {
      return order.paymentStatus === 'failed' || order.paymentStatus === 'cancelled';
    }
    return true;
  });

  const totalSpent = orders
    .filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'captured')
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const renderStatusBadge = (order: Order) => {
    switch (order.paymentStatus) {
      case 'paid':
      case 'captured':
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Paid & Delivered</span>
          </span>
        );
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>UPI Verification Pending</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-full text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            <span>Payment Incomplete</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full text-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Payment Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400 bg-slate-500/10 border border-slate-500/30 px-2.5 py-1 rounded-full text-xs">
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 bg-slate-500/10 px-2.5 py-1 rounded-full text-xs">
            <span>{order.paymentStatus}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-1.5">
          <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block">
            Billing & Invoices
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            My Orders & Purchases
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Review your digital book purchase receipts, transaction references, and retry payments for pending orders.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh orders list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block font-medium">Total Orders</span>
          <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 block">{orders.length}</span>
        </div>
        <div className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-medium">Completed</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'captured').length}
          </span>
        </div>
        <div className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm">
          <span className="text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider block font-medium">Pending / Action</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {orders.filter(o => o.paymentStatus !== 'paid' && o.paymentStatus !== 'captured').length}
          </span>
        </div>
        <div className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm">
          <span className="text-[11px] text-[var(--accent-gold)] uppercase tracking-wider block font-medium">Total Spent</span>
          <span className="text-2xl font-bold text-[var(--text-primary)] mt-1 block font-mono">
            ₹{totalSpent.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            filter === 'all'
              ? 'bg-[var(--accent-gold)] text-[#0B1325]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            filter === 'paid'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
          }`}
        >
          Completed ({orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'captured').length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            filter === 'pending'
              ? 'bg-amber-500 text-slate-950'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
          }`}
        >
          Pending / Verifying ({orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'pending_verification').length})
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            filter === 'failed'
              ? 'bg-rose-500 text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
          }`}
        >
          Failed / Action Needed ({orders.filter(o => o.paymentStatus === 'failed' || o.paymentStatus === 'cancelled').length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-9 h-9 mx-auto border-3 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Loading your purchase records...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl p-8 space-y-4 shadow-[var(--card-shadow)]">
          <ShoppingBag className="w-12 h-12 mx-auto text-[var(--accent-gold)] opacity-80" />
          <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
            {filter === 'all' ? 'No Orders Recorded Yet' : `No ${filter} orders found`}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            {filter === 'all'
              ? "Browse our curated collection of business, AI, technology, and wealth building eBooks to begin your reading journey."
              : `You have no orders matching the "${filter}" filter criteria.`}
          </p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg cursor-pointer shadow-sm transition-transform active:scale-95"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map(order => {
            const isCompleted = order.paymentStatus === 'paid' || order.paymentStatus === 'captured';
            const isPendingVerification = order.paymentStatus === 'pending_verification';
            const needsAction = ['failed', 'pending', 'cancelled'].includes(order.paymentStatus);

            return (
              <div
                key={order.id}
                className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-[var(--card-shadow)] transition-all hover:border-[var(--accent-gold)]/40"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">
                      Order Reference
                    </span>
                    <span className="font-mono font-bold text-[var(--text-primary)] text-sm tracking-wide">
                      {order.id}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">
                      Purchase Date
                    </span>
                    <span className="text-[var(--text-secondary)] font-medium">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">
                      Amount
                    </span>
                    <span className="font-mono font-bold text-[var(--text-primary)] text-sm tabular-nums">
                      {order.total === 0 ? 'FREE' : `₹${order.total}`}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider font-semibold">
                      Payment Status
                    </span>
                    {renderStatusBadge(order)}
                  </div>
                </div>

                {/* Items in this Order */}
                <div className="p-5 divide-y divide-[var(--border-subtle)]">
                  {order.items.map(item => (
                    <div
                      key={item.bookId}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={resolveBookCover(item.coverImage)}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded-md shadow-xs shrink-0 bg-slate-900 border border-[var(--border-subtle)]"
                        />
                        <div className="min-w-0 space-y-1">
                          <h4 className="font-serif font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                            <span className="font-mono">
                              TXN: {order.transactionReference || order.id}
                            </span>
                            {order.upiTransactionRef && (
                              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                UTR: {order.upiTransactionRef}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {item.price === 0 ? 'FREE' : `₹${item.price}`}
                        </span>

                        {/* Read Online Button for completed orders */}
                        {isCompleted && onOpenReader && (
                          <button
                            onClick={() => onOpenReader(item.bookId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] cursor-pointer transition-colors shadow-xs"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Online</span>
                          </button>
                        )}

                        {/* Download Button for completed orders */}
                        {isCompleted && (
                          <button
                            onClick={() => handleDownload(item.bookId, item.title)}
                            disabled={downloadingId === item.bookId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] cursor-pointer transition-colors"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingId === item.bookId ? 'animate-bounce' : ''}`} />
                            <span>PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Notice / UTR Info */}
                {isPendingVerification && (
                  <div className="px-5 py-3 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <p className="font-semibold">UPI Payment Verification in Progress</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Your submitted UTR ({order.upiTransactionRef || 'Pending'}) is being verified by our finance team against bank records. Your eBook will unlock automatically upon approval.
                      </p>
                    </div>
                  </div>
                )}

                {needsAction && (
                  <div className="px-5 py-3 bg-rose-500/10 border-t border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <p className="font-semibold">Payment Incomplete or Declined</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        The transaction was not completed. You can retry paying now via UPI QR or Razorpay without placing a new duplicate order.
                      </p>
                    </div>
                  </div>
                )}

                {/* Card Footer: License & Actions */}
                <div className="px-5 py-3.5 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-xs sm:max-w-md">
                      Licensed to: {order.customerName} ({order.customerEmail})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto">
                    {/* Retry Payment Button for failed/pending orders */}
                    {needsAction && (
                      <button
                        onClick={() => retryPayment(order)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Payment</span>
                      </button>
                    )}

                    {/* Open in Library for completed orders */}
                    {isCompleted && (
                      <button
                        onClick={() => onNavigate('library')}
                        className="font-bold text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Open in My Library</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
