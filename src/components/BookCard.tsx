import React from 'react';
import { Star, ShoppingBag, BookOpen, Check, Heart, Eye } from 'lucide-react';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onOpenReader?: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, onOpenReader }) => {
  const { addToCart, buyNow, isItemInCart } = useCart();
  const { user, isWishlisted, toggleWishlist } = useAuth();
  const { t } = useI18n();

  const isPurchased = user ? user.library.includes(book.id) : false;
  const inCart = isItemInCart(book.id);
  const wishlisted = isWishlisted(book.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(book.id);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenReader) {
      onOpenReader(book);
    } else {
      onSelect(book);
    }
  };

  return (
    <article className="group bg-[var(--bg-surface-card)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 shadow-[var(--card-shadow)] hover:shadow-2xl">
      {/* 3D Book Cover Canvas with Spine Illusion */}
      <div
        onClick={() => onSelect(book)}
        className="book-perspective relative aspect-3/4 bg-[#070D1E] overflow-hidden cursor-pointer flex items-center justify-center p-3 select-none"
      >
        {/* The 3D Book Structure with spine and page edges */}
        <div className="book-card-spine w-full h-full relative rounded-r-md overflow-hidden shadow-[var(--spine-shadow)]">
          <img
            src={book.coverImage}
            alt={book.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />

          {/* Foil Reflection Sheen on Hover */}
          <div className="book-foil-sheen" />

          {/* Fallback layout underneath image */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-[#070D1E]/95 via-[#070D1E]/40 to-transparent pointer-events-none -z-0">
            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold">
              {book.category}
            </span>
            <h3 className="font-serif text-white font-bold text-base leading-snug line-clamp-2">
              {book.title}
            </h3>
          </div>
        </div>

        {/* Minimal Unboxed Editorial Tag (Zero-Pill Discipline) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {book.bestSeller && (
            <div className="bg-[#0B1325]/90 text-[#D4AF37] text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-xs border border-[#D4AF37]/30 backdrop-blur-md shadow-xs">
              Bestseller
            </div>
          )}
          {book.isFree && !book.bestSeller && (
            <div className="bg-emerald-950/90 text-emerald-300 text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-xs border border-emerald-500/30 backdrop-blur-md shadow-xs">
              Complimentary
            </div>
          )}
        </div>

        {/* Quick Action Overlay (Preview Eye & Wishlist Heart) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={handlePreviewClick}
            aria-label="Quick preview chapters"
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Read Sample Chapter"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                wishlisted ? 'fill-red-500 text-red-500' : 'text-white/90'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Book Metadata Info */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-[var(--bg-surface-card)]">
        <div className="space-y-1.5">
          {/* Metadata line with typographic dot separator */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="text-[11px] uppercase tracking-wider text-[var(--accent-gold)] font-semibold truncate">
              {book.category}
            </span>
            <span aria-hidden="true" className="opacity-40">·</span>
            <span>{book.pages} pages</span>
            <span aria-hidden="true" className="opacity-40">·</span>
            <span>{book.language || 'English'}</span>
          </div>

          <h3
            onClick={() => onSelect(book)}
            className="font-serif text-lg font-bold text-[var(--text-primary)] leading-snug line-clamp-2 hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
          >
            {book.title}
          </h3>

          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {book.shortDescription}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
              {book.rating ? book.rating.toFixed(1) : '5.0'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">({book.reviewCount || 12} reviews)</span>
          </div>
        </div>

        {/* Pricing and Direct Actions */}
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums font-serif">
                {book.isFree || book.sellingPrice === 0 ? 'FREE' : `₹${book.sellingPrice}`}
              </span>
              {!book.isFree && book.originalPrice > book.sellingPrice && book.sellingPrice > 0 && (
                <span className="text-xs text-[var(--text-muted)] line-through tabular-nums">
                  ₹{book.originalPrice}
                </span>
              )}
            </div>
            {!book.isFree && book.originalPrice > book.sellingPrice && book.sellingPrice > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Save {Math.round(((book.originalPrice - book.sellingPrice) / book.originalPrice) * 100)}%
              </span>
            )}
            {book.isFree && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Complimentary
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {isPurchased ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenReader && onOpenReader(book)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs font-bold cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t('books.read', 'Read')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(book)}
                  className="w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer text-center"
                >
                  {t('books.details', 'Details')}
                </button>
              </>
            ) : book.isFree ? (
              <>
                <button
                  type="button"
                  onClick={() => buyNow(book)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors shadow-xs font-bold cursor-pointer"
                >
                  <span>{t('books.freeBadge', 'Free')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(book)}
                  className="w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer text-center"
                >
                  {t('books.details', 'Details')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => addToCart(book)}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                    inCart
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold'
                      : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {inCart ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('books.inCart', 'In Cart')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{t('books.addToCart', 'Add')}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => buyNow(book)}
                  className="w-full py-2.5 px-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-all shadow-xs font-bold cursor-pointer"
                >
                  {t('books.buyNow', 'Buy Now')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
