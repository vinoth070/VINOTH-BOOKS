import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Tag, ShieldCheck, Download, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { resolveBookCover } from '../utils/imageUrl';

export const CartDrawer: React.FC = () => {
  const {
    items,
    removeFromCart,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    discount,
    total,
    setAuthRequiredAction
  } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplying(true);
    setCouponError(null);
    const res = await applyCoupon(couponInput);
    setIsApplying(false);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    if (!user) {
      setAuthRequiredAction({ type: 'checkout' });
      return;
    }
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside className="w-screen max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                {t('cart.title', 'Shopping Cart')}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-gold)] text-[#0B1325]">
                {items.length}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--bg-surface-muted)] flex items-center justify-center text-[var(--text-muted)]">
                  <Tag className="w-8 h-8 text-[var(--accent-gold)]" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">Your Cart is Empty</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                  Explore Vinoth's independent books to start your personal digital library.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors cursor-pointer"
                >
                  Explore Books
                </button>
              </div>
            ) : (
              items.map(({ book }) => (
                <div
                  key={book.id}
                  className="flex gap-4 p-3.5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xs items-start"
                >
                  <img
                    src={resolveBookCover(book.coverImage)}
                    alt={book.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-22 object-cover rounded shadow-xs shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--accent-gold)] font-bold block">
                      {book.category}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{book.title}</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">By {book.author}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums font-serif">
                          {book.sellingPrice === 0 ? 'FREE' : `₹${book.sellingPrice}`}
                        </span>
                        {book.originalPrice > book.sellingPrice && book.sellingPrice > 0 && (
                          <span className="text-[11px] text-[var(--text-muted)] line-through tabular-nums">
                            ₹{book.originalPrice}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(book.id)}
                        className="text-xs text-red-500 hover:text-red-400 p-1 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove from cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] space-y-3 sm:space-y-4">
              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Coupon code (e.g. VINOTH20)"
                    className="flex-1 px-3 py-2 text-xs uppercase bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isApplying || !couponInput.trim()}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                  >
                    {isApplying ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                {appliedCoupon && (
                  <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discount})</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </form>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-[var(--text-primary)] tabular-nums">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount</span>
                    <span className="tabular-nums font-mono">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-subtle)] font-serif">
                  <span>Total Amount</span>
                  <span className="tabular-nums">₹{total}</span>
                </div>
              </div>

              {/* Guarantee text */}
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span>Instant digital access & lifetime re-downloads included.</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <span>{t('cart.checkout', 'Proceed to Checkout')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] text-center cursor-pointer"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
