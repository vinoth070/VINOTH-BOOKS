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
import { Lock } from 'lucide-react';

function MainApp() {
  const { user, token, logout, isAdmin } = useAuth();
  const { t } = useI18n();

  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [readerBookId, setReaderBookId] = useState<string | null>(null);

  // Fetch initial books and categories
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [resBooks, resCats] = await Promise.all([
        fetch('/api/books', { headers }),
        fetch('/api/categories')
      ]);

      if (resBooks.ok) {
        const data = await resBooks.json();
        setBooks(data.books || []);
      }

      if (resCats.ok) {
        const data = await resCats.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle hash changes for browser history back/forward
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '') || 'home';
      if (hash.startsWith('book/')) {
        const id = hash.replace('book/', '');
        setCurrentView('book');
        setViewParams({ bookId: id });
      } else if (['home', 'explore', 'categories', 'library', 'orders', 'wishlist', 'settings', 'legal', 'admin'].includes(hash)) {
        setCurrentView(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Silent automatic redirect for non-admin users reaching admin route
  useEffect(() => {
    if (currentView === 'admin' && user && !isAdmin) {
      navigateTo('home');
    }
  }, [currentView, user, isAdmin]);

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
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/library/download/${book.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_VINOTH_BOOKS.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Network error downloading file');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
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
          <OrdersView onNavigate={navigateTo} />
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
          isAdmin ? (
            <AdminDashboardView
              books={books}
              categories={categories}
              onRefreshData={fetchData}
              onSelectBook={handleSelectBook}
              onOpenReader={handleOpenReader}
              onLogout={handleLogout}
            />
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
        onClose={() => setIsAuthModalOpen(false)}
        onAdminLoginSuccess={() => navigateTo('admin')}
        onCustomerLoginSuccess={() => navigateTo('home')}
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
