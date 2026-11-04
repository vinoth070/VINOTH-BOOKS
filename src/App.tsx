import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { CartProvider, useCart } from './context/CartContext';
import { Book, Category } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ReaderModal } from './components/ReaderModal';
import { AuthModal } from './components/AuthModal';
import { FeedbackModal } from './components/FeedbackModal';

import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { BookDetailsView } from './views/BookDetailsView';
import { CategoriesView } from './views/CategoriesView';
import { MyLibraryView } from './views/MyLibraryView';
import { OrdersView } from './views/OrdersView';
import { WishlistView } from './views/WishlistView';
import { SettingsView } from './views/SettingsView';
import { LegalView } from './views/LegalView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Lock } from 'lucide-react';
import { apiClient, getApiUrl } from './services/apiClient';
import { FALLBACK_BOOKS, FALLBACK_CATEGORIES } from './data/fallbackData';

function MainApp() {
  const { user, token, logout, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { buyNow, authRequiredAction, setAuthRequiredAction, setIsCheckoutOpen } = useCart();
  const { t } = useI18n();

  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [books, setBooks] = useState<Book[]>(FALLBACK_BOOKS);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [demoBooksPurged, setDemoBooksPurged] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [readerBookId, setReaderBookId] = useState<string | null>(null);

  // Trigger auth modal if any action requires login
  useEffect(() => {
    if (authRequiredAction) {
      setIsAuthModalOpen(true);
    }
  }, [authRequiredAction]);

  // Centralized Real-Time Cloud Firestore Sync across all devices
  useEffect(() => {
    let unsubBooks: () => void = () => {};
    let unsubCats: () => void = () => {};
    let unsubMeta: () => void = () => {};

    const initCloudSync = async () => {
      try {
        const { db } = await import('./firebase');
        const { collection, doc, onSnapshot } = await import('firebase/firestore');

        // 1. Listen for catalog meta (e.g. demo books purged flag)
        unsubMeta = onSnapshot(doc(db, 'settings', 'catalog_meta'), (snap) => {
          if (snap.exists() && snap.data()?.demoBooksPurged) {
            setDemoBooksPurged(true);
          }
        }, (err) => console.warn('Catalog meta listener:', err.message));

        // 2. Listen to real-time books collection
        unsubBooks = onSnapshot(collection(db, 'books'), (snap) => {
          if (!snap.empty) {
            const cloudBooks: Book[] = [];
            snap.forEach(d => {
              cloudBooks.push({ id: d.id, ...(d.data() as any) } as Book);
            });
            setBooks(cloudBooks);
          }
        }, (err) => console.warn('Firestore books listener:', err.message));

        // 3. Listen to real-time categories collection
        unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
          if (!snap.empty) {
            const cloudCats: Category[] = [];
            snap.forEach(d => {
              cloudCats.push({ id: d.id, ...(d.data() as any) } as Category);
            });
            setCategories(cloudCats);
          }
        }, (err) => console.warn('Firestore categories listener:', err.message));
      } catch (err: any) {
        console.warn('Real-time sync init notice:', err.message);
      }
    };

    initCloudSync();

    return () => {
      unsubBooks();
      unsubCats();
      unsubMeta();
    };
  }, []);

  // Fetch initial books and categories from API / fallback
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBooks, resCats] = await Promise.allSettled([
        apiClient.get<{ books: Book[] }>('/api/books'),
        apiClient.get<{ categories: Category[] }>('/api/categories')
      ]);

      if (resBooks.status === 'fulfilled' && Array.isArray(resBooks.value?.books) && resBooks.value.books.length > 0) {
        setBooks(resBooks.value.books);
      } else if (!demoBooksPurged) {
        setBooks(FALLBACK_BOOKS);
      } else {
        setBooks([]);
      }

      if (resCats.status === 'fulfilled' && Array.isArray(resCats.value?.categories) && resCats.value.categories.length > 0) {
        setCategories(resCats.value.categories);
      } else {
        setCategories(FALLBACK_CATEGORIES);
      }
    } catch (err) {
      console.warn('Fallback catalog notice:', err);
      if (!demoBooksPurged) {
        setBooks(FALLBACK_BOOKS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle hash and pathname changes for browser history back/forward & GitHub Pages SPA
  useEffect(() => {
    const handleRoute = () => {
      let route = window.location.hash.replace(/^#\/?/, '') || '';
      if (!route) {
        const rawPath = window.location.pathname.replace(import.meta.env.BASE_URL, '').replace(/^\//, '');
        if (rawPath) route = rawPath;
      }
      route = route || 'home';

      if (route.startsWith('book/')) {
        const id = route.replace('book/', '');
        setCurrentView('book');
        setViewParams({ bookId: id });
      } else if (['home', 'explore', 'categories', 'library', 'orders', 'wishlist', 'settings', 'legal', 'admin'].includes(route)) {
        setCurrentView(route);
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  // Silent automatic redirect for non-admin users reaching admin route
  useEffect(() => {
    if (!isAuthLoading && currentView === 'admin' && user && !isAdmin) {
      navigateTo('home');
    }
  }, [currentView, user, isAdmin, isAuthLoading]);

  const navigateTo = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    if (view === 'book' && params.bookId) {
      window.location.hash = `#/book/${params.bookId}`;
    } else {
      window.location.hash = `#/${view}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    if (['admin', 'library', 'orders', 'settings'].includes(currentView)) {
      navigateTo('home');
    }
  };

  const handleSelectBook = (book: Book) => {
    navigateTo('book', { bookId: book.id });
  };

  const handleOpenReader = (book: Book) => {
    setReaderBookId(book.id);
  };

  const handleDownload = async (book: Book) => {
    if (!token && !user) {
      setAuthRequiredAction({ type: 'download', book });
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const res = await apiClient.rawFetch(`/api/library/download/${book.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_VINOTH_BOOKS.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
    } catch (fetchErr) {
      console.warn('Backend download failed, generating client download:', fetchErr);
    }

    // Client-side download fallback for offline / GitHub Pages mode
    try {
      const content = `VINOTH BOOKS — DIGITAL EDITION
=============================================
Title: ${book.title}
Subtitle: ${book.subtitle}
Author: ${book.author}
Category: ${book.category}
ISBN: ${book.isbn || 'N/A'}
Publication Date: ${book.publicationDate}
Language: ${book.language}

DESCRIPTION
-----------
${book.fullDescription}

KEY LEARNINGS
-------------
${(book.keyLearnings || []).map((k, i) => `${i + 1}. ${k}`).join('\n')}

TABLE OF CONTENTS
-----------------
${(book.tableOfContents || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}

SAMPLE CHAPTERS
---------------
${(book.sampleContent || []).map(sc => `\n### ${sc.chapterTitle}\n\n${sc.content}\n`).join('\n')}

=============================================
Purchased through VINOTH BOOKS Official Marketplace
https://vinoth070.github.io/VINOTH-BOOKS/
`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_VINOTH_BOOKS.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Unable to generate download file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Top Banner for Publisher Direct Guarantee */}
      <div className="bg-[var(--bg-surface-elevated)] text-[var(--accent-gold)] px-4 py-1.5 text-center text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase border-b border-[var(--border-subtle)] flex items-center justify-center gap-2">
        <span>{t('hero.badge', 'Official Publishing House of Author Vinoth')} · Direct-to-Reader Delivery</span>
      </div>

      {/* Primary Top Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        books={books}
        onSelectBook={handleSelectBook}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            books={books}
            categories={categories}
            onSelectBook={handleSelectBook}
            onNavigate={navigateTo}
            onOpenReader={handleOpenReader}
          />
        )}

        {currentView === 'explore' && (
          <ExploreView
            books={books}
            categories={categories}
            initialCategory={viewParams.category}
            initialFilter={viewParams.filter}
            initialSort={viewParams.sort}
            onSelectBook={handleSelectBook}
            onOpenReader={handleOpenReader}
          />
        )}

        {currentView === 'book' && viewParams.bookId && (
          <BookDetailsView
            bookId={viewParams.bookId}
            onBack={() => navigateTo('explore')}
            onSelectBook={handleSelectBook}
            onOpenReader={handleOpenReader}
            onDownload={handleDownload}
          />
        )}

        {currentView === 'categories' && (
          <CategoriesView
            categories={categories}
            onSelectCategory={(categoryName) => navigateTo('explore', { category: categoryName })}
          />
        )}

        {currentView === 'library' && (
          <MyLibraryView
            onOpenReader={handleOpenReader}
            onSelectBook={handleSelectBook}
            onNavigate={navigateTo}
          />
        )}

        {currentView === 'orders' && (
          <OrdersView
            onNavigate={navigateTo}
            onSelectBook={handleSelectBook}
            onOpenReader={(bookId: string) => {
              const book = books.find(b => b.id === bookId || (b as any).slug === bookId);
              if (book) handleOpenReader(book);
            }}
          />
        )}

        {currentView === 'wishlist' && (
          <WishlistView
            books={books}
            onSelectBook={handleSelectBook}
            onOpenReader={handleOpenReader}
            onNavigate={navigateTo}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            onNavigate={navigateTo}
            initialTab={viewParams.tab || 'profile'}
          />
        )}

        {currentView === 'legal' && (
          <LegalView initialTab={viewParams.tab || 'terms'} />
        )}

        {currentView === 'admin' && (
          isAuthLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-gold)] border-t-transparent animate-spin" />
              <p className="text-xs text-[var(--text-muted)] font-mono">Verifying credentials...</p>
            </div>
          ) : isAdmin ? (
            <ErrorBoundary fallbackTitle="Admin Workspace Recovery">
              <AdminDashboardView
                books={books}
                categories={categories}
                onRefreshData={fetchData}
                onSelectBook={handleSelectBook}
                onOpenReader={handleOpenReader}
                onLogout={handleLogout}
              />
            </ErrorBoundary>
          ) : user && !isAdmin ? (
            /* Protected Route: Logged In as Non-Admin Customer */
            <div className="max-w-md mx-auto py-24 px-4 text-center space-y-5 animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                  Access Denied (403)
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Your customer account ({user.email}) does not have publisher administrator privileges. The Publisher Portal is strictly restricted to the authorized administrator.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigateTo('library')}
                  className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer font-bold"
                >
                  <span>Go to Customer Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('home')}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          ) : !user ? (
            /* Protected Route: Not Logged In */
            <div className="max-w-md mx-auto py-24 px-4 text-center space-y-5 animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent-gold)] shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                  Administrator Access Required
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  The Publisher Management Dashboard is restricted to the authorized administrator. Please sign in with your administrator account to access this area.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer font-bold"
                >
                  <Lock className="w-3.5 h-3.5 text-[#0B1325]" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => navigateTo('home')}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          ) : null
        )}
      </main>

      {/* Global Footer (shown on all pages except full-screen admin view) */}
      {currentView !== 'admin' && (
        <Footer
          onNavigate={navigateTo}
          onOpenFeedback={() => setIsFeedbackOpen(true)}
        />
      )}

      {/* Global Cart Slide-Over Drawer */}
      <CartDrawer />

      {/* Global Checkout Modal */}
      <CheckoutModal
        onSuccess={(_orderId) => {
          fetchData();
        }}
      />

      {/* Global In-Browser eBook Reader */}
      {readerBookId && (
        <ReaderModal
          bookId={readerBookId}
          onClose={() => setReaderBookId(null)}
        />
      )}

      {/* Customer & Unified Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthRequiredAction(null);
        }}
        intendedAction={authRequiredAction}
        onAdminLoginSuccess={() => navigateTo('admin')}
        onCustomerLoginSuccess={() => {
          setIsAuthModalOpen(false);
          if (authRequiredAction) {
            const pending = authRequiredAction;
            setAuthRequiredAction(null);
            setTimeout(() => {
              if (pending.type === 'buy' && pending.book) {
                buyNow(pending.book);
              } else if (pending.type === 'download' && pending.book) {
                handleDownload(pending.book);
              } else if (pending.type === 'checkout') {
                setIsCheckoutOpen(true);
              }
            }, 300);
          } else {
            navigateTo('home');
          }
        }}
      />

      {/* Public Customer Feedback & Inquiries Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <CartProvider>
            <MainApp />
          </CartProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
