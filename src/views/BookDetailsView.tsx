import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Star, ShoppingBag, BookOpen, ShieldCheck, Download,
  CheckCircle2, Globe, Heart, MessageSquare, Send, Sparkles, Check
} from 'lucide-react';
import { Book, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BookCard } from '../components/BookCard';
import { apiClient } from '../services/apiClient';
import { FALLBACK_BOOKS } from '../data/fallbackData';

interface BookDetailsViewProps {
  bookId: string;
  onBack: () => void;
  onSelectBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
  onDownload: (book: Book) => void;
}

export const BookDetailsView: React.FC<BookDetailsViewProps> = ({
  bookId,
  onBack,
  onSelectBook,
  onOpenReader,
  onDownload
}) => {
  const { addToCart, buyNow, isItemInCart } = useCart();
  const { user, token, isWishlisted, toggleWishlist } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);

  // Review submission state
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<{
          book: Book;
          reviews: Review[];
          relatedBooks: Book[];
          isPurchased: boolean;
        }>(`/api/books/${bookId}`);

        if (data?.book) {
          setBook(data.book);
          setReviews(data.reviews || []);
          setRelatedBooks(data.relatedBooks || []);
          setIsPurchased(data.isPurchased || false);
        } else {
          throw new Error('Book not found');
        }
      } catch (err) {
        // Fallback to bundled book details for static / offline mode
        const fallback = FALLBACK_BOOKS.find(b => b.id === bookId);
        if (fallback) {
          setBook(fallback);
          setRelatedBooks(FALLBACK_BOOKS.filter(b => b.id !== bookId));
          setIsPurchased(user?.library?.includes(bookId) || false);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bookId, token, user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || !newTitle.trim() || !newComment.trim()) return;
    if (!user) {
      alert('Please sign in to post a reader review');
      return;
    }
    try {
      setSubmittingReview(true);
      const data = await apiClient.post<{ message?: string; review?: Review }>('/api/reviews', {
        bookId: book.id,
        rating: newRating,
        title: newTitle.trim(),
        comment: newComment.trim()
      });
      setReviewSuccess('Review published successfully! Thank you for your feedback.');
      if (data?.review) {
        setReviews(prev => [data.review!, ...prev]);
      }
      setNewTitle('');
      setNewComment('');
    } catch {
      // Local fallback in offline / static mode
      const localReview: Review = {
        id: 'rev_' + Date.now(),
        bookId: book.id,
        userId: user.id,
        userName: user.name,
        rating: newRating,
        title: newTitle.trim(),
        comment: newComment.trim(),
        verifiedPurchase: isPurchased,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      setReviews(prev => [localReview, ...prev]);
      setReviewSuccess('Your review has been recorded and will appear publicly once verified.');
      setNewTitle('');
      setNewComment('');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-28 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-[var(--text-secondary)]">Retrieving book manuscript...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">eBook Not Found</h2>
        <p className="text-xs text-[var(--text-muted)]">The requested eBook is either unavailable or has been archived.</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg font-bold cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const inCart = isItemInCart(book.id);
  const wishlisted = isWishlisted(book.id);
  const discountPercent = book.originalPrice > book.sellingPrice && book.sellingPrice > 0
    ? Math.round(((book.originalPrice - book.sellingPrice) / book.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 space-y-16"
    >
      
      {/* Top Breadcrumb & Wishlist Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>

        <button
          onClick={() => toggleWishlist(book.id)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-red-500 transition-colors cursor-pointer"
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
          <span>{wishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
        </button>
      </div>

      {/* Main PDP Grid: 3D Book Presentation Left + Purchasing & Details Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left Column: 3D Book Mockup with Opening Motion */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          <div className="book-perspective p-4 flex justify-center">
            <motion.div
              initial={{ rotateY: -32, rotateX: 6, scale: 0.94, opacity: 0 }}
              animate={{ rotateY: -6, rotateX: 2, scale: 1, opacity: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="book-card-spine relative w-full max-w-sm aspect-3/4 rounded-r-xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] origin-left"
              style={{
                boxShadow: 'var(--spine-shadow)',
                transformStyle: 'preserve-3d'
              }}
            >
              <img
                src={book.coverImage}
                alt={book.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              <div className="book-foil-sheen" />

              {/* Minimal Unboxed Editorial Badge */}
              {book.bestSeller && (
                <div className="absolute top-4 left-4 bg-[#0B1325]/90 text-[var(--accent-gold)] text-[10px] tracking-wider uppercase font-bold px-2.5 py-1 rounded border border-[#D4AF37]/30 backdrop-blur-md">
                  Official Bestseller
                </div>
              )}
              {book.isFree && (
                <div className="absolute top-4 left-4 bg-emerald-950/90 text-emerald-300 text-[10px] tracking-wider uppercase font-bold px-2.5 py-1 rounded border border-emerald-500/30 backdrop-blur-md">
                  Complimentary eBook
                </div>
              )}
            </motion.div>
          </div>

          {/* Publishing Guarantees Strip */}
          <div className="p-4 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)] shadow-[var(--card-shadow)]">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Direct TXT & PDF Download</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Interactive Web Reader</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Razorpay Verified Gateway</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Perpetual Reader License</span>
            </div>
          </div>
        </div>

        {/* Right Column: Book Details & Contiguous Purchase Box */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-8"
        >
          
          {/* Metadata & Title Block */}
          <div className="space-y-3 pb-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="text-[11px] uppercase tracking-wider text-[var(--accent-gold)] font-bold">
                {book.category}
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span>Published {book.publicationDate}</span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span>{book.pages} Pages</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-[1.15]">
              {book.title}
            </h1>

            {book.subtitle && (
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
                {book.subtitle}
              </p>
            )}

            <div className="pt-2 flex items-center justify-between">
              <p className="text-xs text-[var(--text-secondary)]">
                Imprint: <strong className="text-[var(--text-primary)] font-serif text-sm">{book.author}</strong>
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
                  {book.rating ? book.rating.toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Direct Purchase Box */}
          <div className="p-6 bg-[var(--bg-surface-card)] border border-[var(--border-strong)] rounded-xl shadow-[var(--card-shadow)] space-y-5">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tabular-nums">
                  {book.isFree || book.sellingPrice === 0 ? 'FREE' : `₹${book.sellingPrice}`}
                </span>
                {!book.isFree && book.originalPrice > book.sellingPrice && book.sellingPrice > 0 && (
                  <span className="text-sm sm:text-base text-[var(--text-muted)] line-through tabular-nums">
                    ₹{book.originalPrice}
                  </span>
                )}
              </div>

              {!book.isFree && discountPercent > 0 && (
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded">
                  Save {discountPercent}% OFF
                </span>
              )}
              {book.isFree && (
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded">
                  Open Access Edition
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {isPurchased ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>You own this eBook! It is permanently available in your personal library.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenReader(book)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Read Online Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(book)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download eBook</span>
                    </button>
                  </div>
                </div>
              ) : book.isFree ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => buyNow(book)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors shadow-md cursor-pointer"
                  >
                    <span>Claim Free eBook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenReader(book)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-bold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>Read Free Sample</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => addToCart(book)}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                      inCart
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{inCart ? 'In Shopping Cart' : 'Add to Cart'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => buyNow(book)}
                    className="w-full py-3.5 px-4 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    <span>Buy Now (₹{book.sellingPrice})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Key Learning Takeaways */}
          {book.keyLearnings && book.keyLearnings.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  Key Learnings & Takeaways
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {book.keyLearnings.map((learning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 bg-[var(--bg-surface-card)] rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] shadow-xs"
                  >
                    <span className="font-mono text-[var(--accent-gold)] font-bold shrink-0">
                      0{idx + 1}.
                    </span>
                    <span className="leading-relaxed">{learning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editorial Synopsis */}
          <div className="space-y-3 pt-2">
            <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
              Editorial Synopsis
            </h3>
            <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {book.fullDescription}
            </div>
          </div>

          {/* Chapter Outline / Table of Contents */}
          {book.tableOfContents && book.tableOfContents.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                Table of Contents
              </h3>
              <div className="p-5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)] shadow-[var(--card-shadow)]">
                {book.tableOfContents.map((chapter, i) => (
                  <div key={i} className="py-2.5 text-xs text-[var(--text-primary)] flex items-center justify-between">
                    <span className="font-medium">{chapter}</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">Ch. 0{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publication Specifications */}
          <div className="space-y-3 pt-2">
            <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
              Publication Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-lg text-xs space-y-1">
                <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider">Format</span>
                <span className="font-semibold text-[var(--text-primary)]">TXT + PDF + Web</span>
              </div>
              <div className="p-3 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-lg text-xs space-y-1">
                <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider">Pages</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{book.pages}</span>
              </div>
              <div className="p-3 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-lg text-xs space-y-1">
                <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider">Language</span>
                <span className="font-semibold text-[var(--text-primary)]">{book.language}</span>
              </div>
              <div className="p-3 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-lg text-xs space-y-1">
                <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider">ISBN</span>
                <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)] truncate block">
                  {book.isbn || 'Direct Digital'}
                </span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Customer Reviews & Moderated Ratings */}
      <section className="pt-12 border-t border-[var(--border-subtle)] space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block mb-1">
              Reader Impressions
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Customer Reviews ({reviews.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
              {book.rating ? book.rating.toFixed(1) : '5.0'} out of 5
            </span>
          </div>
        </div>

        {/* Submit Review Form */}
        <div className="p-6 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-4 shadow-[var(--card-shadow)]">
          <h4 className="font-serif text-base font-bold text-[var(--text-primary)]">
            Submit a Reader Review
          </h4>

          {reviewSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
              {reviewSuccess}
            </div>
          )}

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Your Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star className={`w-5 h-5 ${star <= newRating ? 'fill-current' : 'opacity-30'}`} />
                  </button>
                ))}
                <span className="text-xs font-bold text-[var(--text-primary)] ml-2">{newRating} Stars</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Review Headline</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="E.g., An exceptional framework for digital thinkers"
                className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Detailed Feedback</label>
              <textarea
                required
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share how this book helped your career, thinking, or knowledge..."
                className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingReview ? 'Publishing...' : 'Publish Review'}</span>
            </button>
          </form>
        </div>

        {/* Existing Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">
              Be the first reader to share a review for this edition.
            </p>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[var(--text-primary)]">{rev.userName}</span>
                    {rev.verifiedPurchase && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Verified Reader</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>

                <h5 className="font-serif font-bold text-sm text-[var(--text-primary)]">{rev.title}</h5>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Books Showcase */}
      {relatedBooks.length > 0 && (
        <section className="pt-12 border-t border-[var(--border-subtle)] space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block mb-1">
                More in {book.category}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                Related Publications
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {relatedBooks.slice(0, 3).map((relBook) => (
              <BookCard
                key={relBook.id}
                book={relBook}
                onSelect={onSelectBook}
                onOpenReader={onOpenReader}
              />
            ))}
          </div>
        </section>
      )}

    </motion.div>
  );
};
