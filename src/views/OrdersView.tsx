import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2, Clock, ShieldCheck, ArrowRight, FileText } from 'lucide-react';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export const OrdersView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchOrders();
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
      <div className="space-y-1 pb-4 border-b border-[var(--border-subtle)]">
        <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block">
          Billing & Purchases
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
          Order History & Receipts
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Review your official digital publishing invoices and transaction references.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 mx-auto border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl p-8 space-y-3 shadow-[var(--card-shadow)]">
          <ShoppingBag className="w-10 h-10 mx-auto text-[var(--accent-gold)]" />
          <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">No Orders Recorded</h3>
          <p className="text-xs text-[var(--text-muted)]">You haven't completed any purchases yet.</p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg cursor-pointer"
          >
            Explore eBooks
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-[var(--card-shadow)]">
              <div className="p-4 sm:p-5 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider">Order Reference</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{order.id}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider">Date</span>
                  <span className="text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider">Total Paid</span>
                  <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
                    {order.total === 0 ? 'FREE' : `₹${order.total}`}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider">Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Paid & Delivered</span>
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-5 divide-y divide-[var(--border-subtle)]">
                {order.items.map(item => (
                  <div key={item.bookId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded shadow-xs shrink-0 bg-slate-900"
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif font-bold text-sm text-[var(--text-primary)] truncate">{item.title}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">TXN: {order.transactionReference}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums shrink-0">
                      {item.price === 0 ? 'FREE' : `₹${item.price}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Licensed to {order.customerName} ({order.customerEmail})</span>
                </span>
                <button
                  onClick={() => onNavigate('library')}
                  className="font-bold text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] flex items-center gap-1 cursor-pointer"
                >
                  <span>Open In Library</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
