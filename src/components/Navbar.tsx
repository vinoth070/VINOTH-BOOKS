import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag, BookMarked, User as UserIcon, ShieldAlert, LogOut,
  Search, Menu, X, Heart, MessageSquare, Sun, Moon, Monitor, ChevronDown,
  Globe, Settings, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: () => void;
  onOpenFeedback: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuthModal,
  onOpenFeedback
}) => {
  const { user, logout, wishlist, isAdmin } = useAuth();
  const { items, setIsCartOpen } = useCart();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, t, supportedLanguages, isRTL } = useI18n();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchLangInput, setSearchLangInput] = useState('');

  const themeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const cartCount = items.length;
  const wishlistCount = wishlist.length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light Mode', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: 'Dark Mode', icon: <Moon className="w-3.5 h-3.5" /> },
    { mode: 'system', label: 'System Theme', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  const currentThemeIcon = resolvedTheme === 'dark' ? (
    <Moon className="w-4 h-4 text-[var(--accent-gold)]" />
  ) : (
    <Sun className="w-4 h-4 text-[var(--accent-gold)]" />
  );

  const filteredLanguages = supportedLanguages.filter(l =>
    l.name.toLowerCase().includes(searchLangInput.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(searchLangInput.toLowerCase()) ||
    l.code.toLowerCase().includes(searchLangInput.toLowerCase())
  );

  const currentLangObj = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-page)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Brand Identity Wordmark: ONLY text logo "VINOTH BOOKS", no tagline */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="group text-left flex items-center cursor-pointer transition-all duration-200"
            aria-label="VINOTH BOOKS Home"
          >
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-[var(--text-primary)] leading-none group-hover:text-[var(--accent-gold)] transition-colors whitespace-nowrap">
              VINOTH BOOKS
            </span>
          </button>
        </div>

        {/* Desktop Editorial Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-medium text-[var(--text-secondary)]">
          <button
            onClick={() => onNavigate('home')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-[var(--text-primary)] ${
              currentView === 'home'
                ? 'text-[var(--text-primary)] font-bold border-b-2 border-[var(--accent-gold)]'
                : ''
            }`}
          >
            {t('nav.home', 'Home')}
          </button>

          <button
            onClick={() => onNavigate('explore')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-[var(--text-primary)] ${
              currentView === 'explore'
                ? 'text-[var(--text-primary)] font-bold border-b-2 border-[var(--accent-gold)]'
                : ''
            }`}
          >
            {t('nav.explore', 'Explore Books')}
          </button>

          <button
            onClick={() => onNavigate('categories')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-[var(--text-primary)] ${
              currentView === 'categories'
                ? 'text-[var(--text-primary)] font-bold border-b-2 border-[var(--accent-gold)]'
                : ''
            }`}
          >
            {t('nav.categories', 'Categories')}
          </button>

          <button
            onClick={() => onNavigate('explore', { filter: 'bestseller' })}
            className="whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-[var(--text-primary)]"
          >
            {t('nav.bestSellers', 'Best Sellers')}
          </button>

          <button
            onClick={() => onNavigate('explore', { sort: 'newest' })}
            className="whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-[var(--text-primary)]"
          >
            {t('nav.newReleases', 'New Releases')}
          </button>

          <button
            onClick={() => onNavigate('explore', { filter: 'free' })}
            className="whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-[var(--text-primary)] flex items-center gap-1.5"
          >
            <span>{t('nav.freeBooks', 'Free eBooks')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={`whitespace-nowrap transition-colors py-1 cursor-pointer text-[var(--accent-gold)] font-bold flex items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'border-b-2 border-[var(--accent-gold)]'
                  : ''
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>{t('nav.dashboard', 'Publisher Dashboard')}</span>
            </button>
          )}
        </nav>

        {/* Right-Hand Controls: Desktop full toolbar vs Mobile compact header */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* DESKTOP ONLY: Quick Search */}
          <button
            onClick={() => onNavigate('explore')}
            className="hidden lg:flex p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer"
            title={t('common.search', 'Search')}
            aria-label="Search catalog"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* DESKTOP ONLY: 30-Language Selector Dropdown */}
          <div className="relative hidden lg:block" ref={langRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer flex items-center gap-1.5"
              aria-label="Select Language"
              title={`Active Language: ${currentLangObj.name} (${currentLangObj.nativeName})`}
            >
              <Globe className="w-4 h-4 text-[var(--accent-gold)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {language}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-2xl py-2 z-50 text-xs backdrop-blur-xl animate-in fade-in duration-150">
                <div className="px-3 pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {t('nav.language', 'Language')} (30)
                    </span>
                    <button
                      onClick={() => {
                        setLangDropdownOpen(false);
                        onNavigate('settings', { tab: 'language' });
                      }}
                      className="text-[10px] text-[var(--accent-gold)] hover:underline"
                    >
                      All Settings →
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search languages..."
                    value={searchLangInput}
                    onChange={(e) => setSearchLangInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredLanguages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                        language === l.code
                          ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{l.nativeName}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">({l.name})</span>
                      </div>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP ONLY: Theme Switcher Dropdown */}
          <div className="relative hidden lg:block" ref={themeRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer flex items-center gap-1"
              aria-label="Switch theme mode"
              title={`Current Theme: ${theme.toUpperCase()} (${resolvedTheme} active)`}
            >
              {currentThemeIcon}
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-2xl py-1.5 z-50 text-xs backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  {t('nav.appearance', 'Appearance')}
                </div>
                {themeOptions.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      setTheme(opt.mode);
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      theme === opt.mode
                        ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    {theme === opt.mode && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DESKTOP ONLY: Customer Support button */}
          <button
            onClick={onOpenFeedback}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface-muted)] transition-all cursor-pointer"
            title="Customer Support & Feedback"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>{t('nav.support', 'Support')}</span>
          </button>

          {/* DESKTOP ONLY: Wishlist Link */}
          <button
            onClick={() => onNavigate('wishlist')}
            className="hidden lg:flex relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer"
            title={t('nav.wishlist', 'Wishlist')}
            aria-label="Wishlist"
          >
            <Heart className={`w-4.5 h-4.5 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
            {wishlistCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* SHARED (Desktop & Mobile): Shopping Cart button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer"
            title={t('nav.cart', 'Cart')}
            aria-label="Open Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[var(--text-primary)]" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--accent-gold)] text-[#0B1325] text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums shadow-xs">
                {cartCount}
              </span>
            )}
          </button>

          {/* DESKTOP ONLY: User Account / Auth Dropdown */}
          {user ? (
            <div className="relative hidden lg:block" ref={userRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  isAdmin
                    ? 'border-[var(--border-strong)] bg-[var(--bg-surface-card)] text-[var(--accent-gold)] shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
                }`}
              >
                {isAdmin ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                ) : user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                )}
                <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-2xl py-2 z-50 text-xs backdrop-blur-xl animate-in fade-in"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                    {isAdmin ? (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] px-2 py-0.5 rounded">
                        Authorized Publisher
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-[var(--text-muted)]">
                        Reader Account
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => onNavigate('admin')}
                      className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg-surface-muted)] flex items-center gap-2.5 text-[var(--accent-gold)] font-bold cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-[var(--accent-gold)]" />
                      <span>{t('nav.dashboard', 'Publisher Dashboard')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('library')}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg-surface-muted)] flex items-center gap-2.5 text-[var(--text-primary)] cursor-pointer"
                  >
                    <BookMarked className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>{t('nav.library', 'My Library')} ({user.library?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => onNavigate('wishlist')}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--bg-surface-muted)] flex items-center gap-2.5 text-[var(--text-primary)] cursor-pointer"
                  >
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>{t('nav.wishlist', 'Wishlist')} ({wishlistCount})</span>
                  </button>

                  <button
                    onClick={() => onNavigate('orders')}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--bg-surface-muted)] flex items-center gap-2.5 text-[var(--text-primary)] cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{t('nav.orders', 'Order History')}</span>
                  </button>

                  <button
                    onClick={() => onNavigate('settings')}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--bg-surface-muted)] flex items-center gap-2.5 text-[var(--text-primary)] cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{t('nav.settings', 'Account Settings')}</span>
                  </button>

                  <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 hover:bg-red-500/10 flex items-center gap-2 text-red-500 font-semibold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.signOut', 'Sign Out')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                {t('nav.signIn', 'Sign In')}
              </button>
            </div>
          )}

          {/* MOBILE ONLY: Compact Menu Hamburger Button (Three horizontal lines) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] rounded-lg transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE HAMBURGER MENU DRAWER (Only rendered on mobile / small screens) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-5 space-y-5 animate-in fade-in duration-200 max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          
          {/* 1. Mobile User Auth Status Header */}
          {user ? (
            <div className="p-3.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--accent-gold-muted)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[var(--text-primary)] truncate">{user.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                  <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-bold text-[var(--accent-gold)]">
                    {isAdmin ? 'Publisher Administrator' : 'Verified Reader'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  onNavigate('home');
                }}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthModal();
                }}
                className="w-full py-3 px-4 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>{t('nav.signIn', 'Sign In')} / Register</span>
              </button>
            </div>
          )}

          {/* 2. Mobile Catalog Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search books, topics, authors..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    onNavigate('explore', { search: val });
                    setMobileMenuOpen(false);
                  }
                }
              }}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* 3. Primary Mobile Navigation Links */}
          <nav className="flex flex-col space-y-1 text-sm font-medium text-[var(--text-primary)] divide-y divide-[var(--border-subtle)]/50">
            <div className="space-y-1 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-2">
                Catalog & Discovery
              </span>
              <button
                onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between ${
                  currentView === 'home' ? 'text-[var(--accent-gold)] font-bold bg-[var(--accent-gold-muted)]' : ''
                }`}
              >
                <span>{t('nav.home', 'Home')}</span>
              </button>
              <button
                onClick={() => { onNavigate('explore'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between ${
                  currentView === 'explore' ? 'text-[var(--accent-gold)] font-bold bg-[var(--accent-gold-muted)]' : ''
                }`}
              >
                <span>{t('nav.explore', 'Explore Books')}</span>
              </button>
              <button
                onClick={() => { onNavigate('categories'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between ${
                  currentView === 'categories' ? 'text-[var(--accent-gold)] font-bold bg-[var(--accent-gold-muted)]' : ''
                }`}
              >
                <span>{t('nav.categories', 'Categories')}</span>
              </button>
              <button
                onClick={() => { onNavigate('explore', { filter: 'bestseller' }); setMobileMenuOpen(false); }}
                className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between"
              >
                <span>{t('nav.bestSellers', 'Best Sellers')}</span>
              </button>
              <button
                onClick={() => { onNavigate('explore', { sort: 'newest' }); setMobileMenuOpen(false); }}
                className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between"
              >
                <span>{t('nav.newReleases', 'New Releases')}</span>
              </button>
              <button
                onClick={() => { onNavigate('explore', { filter: 'free' }); setMobileMenuOpen(false); }}
                className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between"
              >
                <span>{t('nav.freeBooks', 'Free eBooks')}</span>
                <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Open Access
                </span>
              </button>
            </div>

            {/* Reader Account & Library Links */}
            <div className="space-y-1 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-2">
                Personal Reader Space
              </span>
              {user && (
                <button
                  onClick={() => { onNavigate('library'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>{t('nav.library', 'My Library')}</span>
                  </div>
                  <span className="font-mono text-xs bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] px-2 py-0.5 rounded font-bold">
                    {user.library?.length || 0}
                  </span>
                </button>
              )}
              <button
                onClick={() => { onNavigate('wishlist'); setMobileMenuOpen(false); }}
                className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'}`} />
                  <span>{t('nav.wishlist', 'Wishlist')}</span>
                </div>
                <span className="font-mono text-xs bg-[var(--bg-surface-muted)] text-[var(--text-muted)] px-2 py-0.5 rounded">
                  {wishlistCount}
                </span>
              </button>
              <button
                onClick={() => { setIsCartOpen(true); setMobileMenuOpen(false); }}
                className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{t('nav.cart', 'Cart')}</span>
                </div>
                <span className="font-mono text-xs bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] px-2 py-0.5 rounded font-bold">
                  {cartCount}
                </span>
              </button>
              {user && (
                <>
                  <button
                    onClick={() => { onNavigate('orders'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[var(--text-muted)]" />
                      <span>{t('nav.orders', 'Order History')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { onNavigate('settings'); setMobileMenuOpen(false); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{t('nav.settings', 'Account Settings')}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => { onOpenFeedback(); setMobileMenuOpen(false); }}
                className="w-full text-left px-2 py-2 rounded-lg hover:text-[var(--accent-gold)] hover:bg-[var(--bg-surface-muted)] cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>{t('nav.support', 'Customer Support & Feedback')}</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-2 py-2 rounded-lg text-[var(--accent-gold)] font-bold cursor-pointer flex items-center gap-2 bg-[var(--accent-gold-muted)]"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t('nav.dashboard', 'Publisher Admin Dashboard')}</span>
                </button>
              )}
            </div>
          </nav>

          {/* 4. Mobile Language and Theme Selectors */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-4 text-xs">
            {/* Appearance switch */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] font-medium">{t('nav.appearance', 'Appearance')}:</span>
              <div className="flex items-center gap-1">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => setTheme(opt.mode)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                      theme === opt.mode
                        ? 'bg-[var(--accent-gold)] text-[#0B1325] font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection: 30 Languages with Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-medium flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  <span>{t('nav.language', 'Language')} ({supportedLanguages.length}):</span>
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-gold)]">
                  {currentLangObj.name} ({currentLangObj.nativeName})
                </span>
              </div>

              {/* Language Search in Mobile Menu */}
              <input
                type="text"
                placeholder="Search languages..."
                value={searchLangInput}
                onChange={(e) => setSearchLangInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
              />

              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] divide-y divide-[var(--border-subtle)]/40">
                {filteredLanguages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                      language === l.code
                        ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.nativeName}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">({l.name})</span>
                    </div>
                    {language === l.code && <Check className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
