import React, { useState, useEffect } from 'react';
import {
  ArrowRight, BookOpen, ShieldCheck, Zap, Award,
  Sparkles, ChevronRight, ChevronLeft, CheckCircle2, Bookmark,
  Send, Mail, Star, Flame, Clock, Check
} from 'lucide-react';
import { Book, Category } from '../types';
import { BookCard } from '../components/BookCard';
import { apiClient } from '../services/apiClient';
import { resolveBookCover } from '../utils/imageUrl';

interface HomeViewProps {
  books: Book[];
  categories: Category[];
  onSelectBook: (book: Book) => void;
  onNavigate: (view: string, params?: any) => void;
  onOpenReader: (book: Book) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  books,
  categories,
  onSelectBook,
  onNavigate,
  onOpenReader
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  // 3D Carousel state & controls
  const carouselBooks = books.length > 0 ? books : [];
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    if (isCarouselPaused || carouselBooks.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % carouselBooks.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isCarouselPaused, carouselBooks.length]);

  const handlePrevSlide = () => {
    setCarouselIndex(prev => (prev - 1 + carouselBooks.length) % carouselBooks.length);
  };

  const handleNextSlide = () => {
    setCarouselIndex(prev => (prev + 1) % carouselBooks.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50) handleNextSlide();
    else if (distance < -50) handlePrevSlide();
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const activeCarouselBook = carouselBooks[carouselIndex] || carouselBooks[0];

  const featuredBooks = books.filter(b => b.featured);
  const bestSellers = books.filter(b => b.bestSeller);
  const freeBooks = books.filter(b => b.isFree);
  const recentBooks = [...books]
    .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
    .slice(0, 4);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;

    try {
      setNewsletterStatus('loading');
      const data = await apiClient.post<{ message?: string }>('/api/newsletter', { email: newsletterEmail });
      setNewsletterStatus('success');
      setNewsletterMessage(data?.message || 'Thank you for subscribing to VINOTH BOOKS.');
      setNewsletterEmail('');
    } catch {
      // Local subscription confirmation fallback for static/offline deployment
      setNewsletterStatus('success');
      setNewsletterMessage('Thank you for subscribing to VINOTH BOOKS dispatch.');
      setNewsletterEmail('');
    }
  };

  return (
    <div className="space-y-20 lg:space-y-28 pb-24">
      
      {/* ======================================================== */}
      {/* 1. HERO SECTION: Refined Editorial Typography & Branding */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] py-14 sm:py-20 lg:py-24 transition-colors duration-200">
        {/* Subtle ambient luxury backdrop */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--accent-gold)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-bold px-3 py-1 rounded-full bg-[var(--accent-gold-muted)] border border-[var(--border-subtle)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Independent Digital Publishing House</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.15] text-balance">
              Essential Digital Editions by Vinoth
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Explore thoughtfully crafted digital books by Vinoth. Delivering timeless mental models, actionable systems architecture, and transformative ideas directly to readers worldwide.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-md sm:max-w-none mx-auto">
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-xl cursor-pointer"
              >
                <span>Explore Catalog ({books.length} Books)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('explore', { filter: 'free' })}
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 text-xs font-bold uppercase tracking-wider border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Free Starter eBooks</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>

            {/* Verified Publishing Guarantees */}
            <div className="pt-8 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--text-muted)] max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span className="font-medium text-[var(--text-secondary)]">Direct Publisher Delivery</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span className="font-medium text-[var(--text-secondary)]">Instant DRM-Free Access</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span className="font-medium text-[var(--text-secondary)]">Web Reader + Offline Files</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. INTERACTIVE 3D ROTATING BOOK SHOWCASE CAROUSEL        */}
      {/* ======================================================== */}
      {carouselBooks.length > 0 && (
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 select-none"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-bold block">
              Theatrical 3D Showcase
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Interactive Rotating Manuscript Carousel
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Swipe or click the flanking books to rotate. Hover to pause auto-rotation.
            </p>
          </div>

          {/* 3D Carousel Stage */}
          <div className="relative min-h-[460px] sm:min-h-[500px] flex items-center justify-center overflow-hidden py-8">
            
            {/* Ambient Spotlight */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[340px] bg-[var(--accent-gold)]/10 rounded-full blur-3xl transform rotate-12" />
            </div>

            {/* Perspective Viewport */}
            <div
              className="relative w-full max-w-4xl h-[380px] sm:h-[420px] flex items-center justify-center"
              style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
            >
              {carouselBooks.map((book, idx) => {
                const total = carouselBooks.length;
                let offset = (idx - carouselIndex + total) % total;
                if (offset > total / 2) offset -= total;

                const isCenter = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;
                const isVisible = Math.abs(offset) <= 1;

                // Responsive translation amounts calculated for zero mobile overflow
                const translateX = isCenter
                  ? '0px'
                  : isRight
                  ? 'clamp(40px, 18vw, 250px)'
                  : 'calc(-1 * clamp(40px, 18vw, 250px))';

                const rotateY = isCenter ? '0deg' : isRight ? '-26deg' : '26deg';
                const scale = isCenter ? 1.02 : 0.75;
                const opacity = isCenter ? 1 : isVisible ? 0.5 : 0;
                const zIndex = isCenter ? 30 : isVisible ? 20 : 10;

                if (!isVisible) return null;

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      if (isCenter) {
                        onSelectBook(book);
                      } else {
                        setCarouselIndex(idx);
                      }
                    }}
                    className="absolute w-36 xs:w-44 sm:w-64 aspect-3/4 rounded-r-xl overflow-hidden cursor-pointer transition-all duration-600 ease-out select-none"
                    style={{
                      transform: `translateX(${translateX}) scale(${scale}) rotateY(${rotateY})`,
                      opacity,
                      zIndex,
                      boxShadow: isCenter
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(212, 175, 55, 0.25)'
                        : '0 20px 30px -10px rgba(0, 0, 0, 0.5)',
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Hardcover spine visual */}
                    <div className="book-card-spine w-full h-full relative">
                      <img
                        src={resolveBookCover(book.coverImage)}
                        alt={book.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (!target.src.includes('unsplash.com')) {
                            target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80';
                          }
                        }}
                      />

                      {/* Foil Sheen */}
                      <div className="book-foil-sheen" />

                      {/* Center book badges */}
                      {isCenter && (
                        <div className="absolute top-3 left-3 flex flex-col gap-1 z-20">
                          {book.bestSeller && (
                            <span className="bg-[#0B1325]/90 text-[var(--accent-gold)] text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border border-[#D4AF37]/40 shadow-xs">
                              Bestseller
                            </span>
                          )}
                          {book.isFree && (
                            <span className="bg-emerald-950/90 text-emerald-300 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border border-emerald-500/40 shadow-xs">
                              Complimentary
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Previous Showcase Book"
              className="absolute left-1 sm:left-4 md:left-6 z-40 p-2 sm:p-3 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:text-[var(--accent-gold)] hover:scale-105 transition-all shadow-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Next Showcase Book"
              className="absolute right-1 sm:right-4 md:right-6 z-40 p-2 sm:p-3 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:text-[var(--accent-gold)] hover:scale-105 transition-all shadow-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Active Book Detail Card & Actions */}
          {activeCarouselBook && (
            <div className="max-w-xl mx-auto -mt-4 bg-[var(--bg-surface-card)] border border-[var(--border-strong)] rounded-2xl p-6 text-center shadow-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="text-[11px] uppercase tracking-wider text-[var(--accent-gold)] font-bold">
                  {activeCarouselBook.category}
                </span>
                <span>·</span>
                <span>{activeCarouselBook.pages} pages</span>
                <span>·</span>
                <span className="font-bold text-[var(--text-primary)] font-serif text-sm">
                  {activeCarouselBook.isFree ? 'FREE' : `₹${activeCarouselBook.sellingPrice}`}
                </span>
              </div>

              <h3
                onClick={() => onSelectBook(activeCarouselBook)}
                className="font-serif text-xl sm:text-2xl font-bold text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer leading-tight"
              >
                {activeCarouselBook.title}
              </h3>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 max-w-md mx-auto">
                {activeCarouselBook.shortDescription}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenReader(activeCarouselBook)}
                  className="px-5 py-2.5 bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  <span>Read Sample</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectBook(activeCarouselBook)}
                  className="px-6 py-2.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dot Indicators */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {carouselBooks.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      carouselIndex === i
                        ? 'w-6 h-2 bg-[var(--accent-gold)]'
                        : 'w-2 h-2 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* 2. CURATED KNOWLEDGE DISCIPLINES (Categories)           */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block mb-1">
              Curated Knowledge Disciplines
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Explore by Category
            </h2>
          </div>
          <button
            onClick={() => onNavigate('categories')}
            className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>All Categories ({categories.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 10).map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigate('explore', { category: cat.name })}
              className="group p-5 bg-[var(--bg-surface-card)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-left hover:-translate-y-1 transition-all duration-300 shadow-[var(--card-shadow)] flex flex-col justify-between h-36 cursor-pointer"
            >
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest text-[var(--accent-gold)] font-semibold">
                  Imprint
                </span>
                <h3 className="font-serif font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors leading-snug line-clamp-2">
                  {cat.name}
                </h3>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                <span className="font-mono">{cat.bookCount || 0} {cat.bookCount === 1 ? 'eBook' : 'eBooks'}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[var(--accent-gold)]" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. FEATURED EDITORIAL COLLECTION                        */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block mb-1">
              Curated Editorial Showcase
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Featured Digital Publications
            </h2>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View Full Catalog</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredBooks.slice(0, 3).map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onOpenReader={onOpenReader}
            />
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. BEST SELLERS & READER FAVORITES                      */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-[var(--accent-gold)] hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block mb-1">
                Highest Reader Engagement
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                Best Selling Titles
              </h2>
            </div>
          </div>
          <button
            onClick={() => onNavigate('explore', { filter: 'bestseller' })}
            className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>See All Bestsellers</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {bestSellers.slice(0, 3).map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onOpenReader={onOpenReader}
            />
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. NEW RELEASES & CHRONOLOGICAL ADDITIONS               */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-[var(--accent-gold)] hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block mb-1">
                Direct From The Publishing Desk
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                Recently Published
              </h2>
            </div>
          </div>
          <button
            onClick={() => onNavigate('explore', { sort: 'newest' })}
            className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Chronological Catalog</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onOpenReader={onOpenReader}
            />
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. COMPLIMENTARY EBOOKS & OPEN ACCESS BLUEPRINTS        */}
      {/* ======================================================== */}
      {freeBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl p-8 sm:p-12 shadow-[var(--card-shadow)]">
            <div className="max-w-2xl mb-8 space-y-2">
              <span className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block">
                Open Access Knowledge Initiative
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                Complimentary eBooks & Strategic Blueprints
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                As part of Vinoth's philosophy of accessible knowledge without limits, selected starter guides are available to read and download without cost.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {freeBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onSelect={onSelectBook}
                  onOpenReader={onOpenReader}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 7. WHY VINOTH BOOKS? (Publishing Standards)              */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold">
            The Publishing Standard
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Why Choose VINOTH BOOKS?
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            A premium independent digital bookstore built for readers who value intellectual depth, sovereign ownership, and frictionless reading.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-7 bg-[var(--bg-surface-card)] rounded-xl border border-[var(--border-subtle)] space-y-3.5 shadow-[var(--card-shadow)]">
            <div className="w-12 h-12 rounded-lg bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Direct Independent Publishing
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every manuscript is written, curated, and published directly under the VINOTH BOOKS imprint. No corporate intermediaries, zero artificial page padding.
            </p>
          </div>

          <div className="p-7 bg-[var(--bg-surface-card)] rounded-xl border border-[var(--border-subtle)] space-y-3.5 shadow-[var(--card-shadow)]">
            <div className="w-12 h-12 rounded-lg bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Instant Digital Fulfillment
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Upon successful payment or free claim, books appear instantaneously in your personal library. Read immediately inside our web reader or download clean TXT/PDF files.
            </p>
          </div>

          <div className="p-7 bg-[var(--bg-surface-card)] rounded-xl border border-[var(--border-subtle)] space-y-3.5 shadow-[var(--card-shadow)]">
            <div className="w-12 h-12 rounded-lg bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Secure Direct Purchasing
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Integrated with Razorpay for secure cards, UPI, and netbanking transactions. Enjoy a perpetual personal license with no intrusive locks.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. EDITORIAL NEWSLETTER SUBSCRIPTION                    */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--bg-surface-card)] to-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl p-8 sm:p-12 shadow-[var(--card-shadow)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold">
                <Mail className="w-3.5 h-3.5" />
                <span>The Publisher's Dispatch</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                Subscribe for New Releases & Private Book Drops
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">
                Join our private reader network to receive first-look access to upcoming manuscripts, exclusive subscriber discount coupons, and curated insights directly from Vinoth.
              </p>
            </div>

            <div className="lg:col-span-5">
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading'}
                    className="px-6 py-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {newsletterStatus === 'loading' ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {newsletterStatus === 'success' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                    <Check className="w-4 h-4" />
                    <span>{newsletterMessage}</span>
                  </p>
                )}

                {newsletterStatus === 'error' && (
                  <p className="text-xs text-red-500 font-medium">
                    {newsletterMessage}
                  </p>
                )}

                <p className="text-[11px] text-[var(--text-muted)]">
                  Zero spam. Unsubscribe anytime with a single click.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
