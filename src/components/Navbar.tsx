import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShoppingBag, BookMarked, User as UserIcon, ShieldAlert, LogOut,
  Search, Heart, MessageSquare, Sun, Moon, Monitor, ChevronDown,
  Globe, Settings, Check, LayoutGrid, X, Star, Flame, Sparkles, Tag, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { resolveAvatarUrl } from '../utils/imageUrl';
import { Book } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuthModal: () => void;
  onOpenFeedback: () => void;
  books?: Book[];
  onSelectBook?: (book: Book) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuthModal,
  onOpenFeedback,
  books = [],
  onSelectBook
}) => {
  const { user, logout, wishlist, isAdmin } = useAuth();
  const { items, setIsCartOpen } = useCart();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, t, supportedLanguages } = useI18n();
  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  // Dropdown states
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLangInput, setSearchLangInput] = useState('');

  // Refs for click outside
  const workspaceRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cartCount = items.length;
  const wishlistCount = wishlist.length;

  // Auto-focus search input when search opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (workspaceRef.current && !workspaceRef.current.contains(target)) {
        setWorkspaceOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (langRef.current && !langRef.current.contains(target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modals on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWorkspaceOpen(false);
        setSearchOpen(false);
        setLangDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme switcher helper
  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light Mode', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: 'Dark Mode', icon: <Moon className="w-3.5 h-3.5" /> },
    { mode: 'system', label: 'System Theme', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  // Filtered languages for selector
  const filteredLanguages = useMemo(() => {
    return supportedLanguages.filter(l =>
      l.name.toLowerCase().includes(searchLangInput.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchLangInput.toLowerCase()) ||
      l.code.toLowerCase().includes(searchLangInput.toLowerCase())
    );
  }, [supportedLanguages, searchLangInput]);

  const currentLangObj = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  // Persistent live real-time book search filtering
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return books.filter(b => {
      const matchTitle = b.title.toLowerCase().includes(query);
      const matchAuthor = b.author?.toLowerCase().includes(query);
      const matchDesc = (b.shortDescription || '').toLowerCase().includes(query);
      const matchCategory = (b.category || '').toLowerCase().includes(query);
      const matchTag = b.tags && b.tags.some(t => t.toLowerCase().includes(query));
      return matchTitle || matchAuthor || matchDesc || matchCategory || matchTag;
    }).slice(0, 8); // top 8 matches
  }, [books, searchQuery]);

  const handleBookClick = (book: Book) => {
    setSearchOpen(false);
    if (onSelectBook) {
      onSelectBook(book);
    } else {
      onNavigate('details', { id: book.id });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-page)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-colors duration-200 w-full max-w-full overflow-x-clip">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
        
        {/* ======================================================== */}
        {/* LEFT SIDE: Brand Logo + Workspace Menu Dropdown          */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center cursor-pointer transition-all duration-200 select-none"
            aria-label="VINOTH BOOKS Home"
          >
            <span className="font-serif text-lg sm:text-2xl font-extrabold tracking-wider text-[var(--text-primary)] leading-none group-hover:text-[var(--accent-gold)] transition-colors whitespace-nowrap">
              VINOTH BOOKS
            </span>
          </button>

          {/* Workspace Menu Dropdown Trigger */}
          <div className="relative" ref={workspaceRef}>
            <button
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                workspaceOpen
                  ? 'bg-[var(--accent-gold)] text-[#0B1325] border-[var(--accent-gold)] shadow-xs'
                  : 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]'
              }`}
              aria-label="Toggle Workspace Menu"
              aria-expanded={workspaceOpen}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="tracking-wide">Workspace</span>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200 shrink-0 ${workspaceOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Workspace Dropdown Panel */}
            {workspaceOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl py-2 z-50 text-xs backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[85vh] overflow-y-auto">
                
                {/* 1. Account / Sign In Status Header */}
                <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50 rounded-t-xl">
                  {user ? (
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={resolveAvatarUrl(user.photoURL, user.avatar, user.name)}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[var(--accent-gold)]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[var(--text-primary)] truncate">{user.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                          <span className={`inline-block mt-0.5 text-[9px] uppercase tracking-wider font-bold ${isAdmin ? 'text-[var(--accent-gold)]' : 'text-emerald-500'}`}>
                            {isAdmin ? 'Publisher Admin' : 'Verified Reader'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setWorkspaceOpen(false);
                          onNavigate('home');
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Sign Out"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-xs text-[var(--text-primary)]">Welcome, Reader</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Sign in to sync library & orders</p>
                      </div>
                      <button
                        onClick={() => {
                          setWorkspaceOpen(false);
                          onOpenAuthModal();
                        }}
                        className="px-3 py-1.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        {t('nav.signIn', 'Sign In')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Primary Navigation Links */}
                <div className="py-1.5 border-b border-[var(--border-subtle)]">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Navigation
                  </div>
                  
                  <button
                    onClick={() => { setWorkspaceOpen(false); onNavigate('home'); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      currentView === 'home'
                        ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
                    }`}
                  >
                    <span>{t('nav.home', 'Home')}</span>
                  </button>

                  <button
                    onClick={() => { setWorkspaceOpen(false); onNavigate('explore'); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      currentView === 'explore'
                        ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
                    }`}
                  >
                    <span>{t('nav.explore', 'Explore Books')}</span>
                  </button>

                  <button
                    onClick={() => { setWorkspaceOpen(false); onNavigate('categories'); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      currentView === 'categories'
                        ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] font-bold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
                    }`}
                  >
                    <span>{t('nav.categories', 'Categories')}</span>
                  </button>

                  <button
                    onClick={() => { setWorkspaceOpen(false); onNavigate('explore', { filter: 'bestseller' }); }}
                    className="w-full text-left px-3.5 py-2 flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('nav.bestSellers', 'Best Sellers')}</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded">Hot</span>
                  </button>

                  <button
                    onClick={() => { setWorkspaceOpen(false); onNavigate('explore', { sort: 'newest' }); }}
                    className="w-full text-left px-3.5 py-2 flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t('nav.newReleases', 'New Releases')}</span>
                    </span>
                  </button>

                  <button
                    onClick={() => { setWorkspaceOpen(false); onNavigate('explore', { filter: 'free' }); }}
                    className="w-full text-left px-3.5 py-2 flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('nav.freeBooks', 'Free eBooks')}</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded">Free</span>
                  </button>
                </div>

                {/* 3. Publisher Dashboard Section (If Admin) */}
                {isAdmin && (
                  <div className="py-1.5 border-b border-[var(--border-subtle)] bg-[var(--accent-gold)]/5">
                    <button
                      onClick={() => { setWorkspaceOpen(false); onNavigate('admin'); }}
                      className={`w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-[var(--accent-gold)] font-bold hover:bg-[var(--accent-gold-muted)] transition-colors cursor-pointer ${
                        currentView === 'admin' ? 'bg-[var(--accent-gold-muted)]' : ''
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 text-[var(--accent-gold)]" />
                      <span>{t('nav.dashboard', 'Publisher Dashboard')}</span>
                    </button>
                  </div>
                )}

                {/* 4. Reader Library & Account Links */}
                {user && (
                  <div className="py-1.5 border-b border-[var(--border-subtle)]">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      My Account
                    </div>

                    <button
                      onClick={() => { setWorkspaceOpen(false); onNavigate('library'); }}
                      className="w-full text-left px-3.5 py-2 flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <BookMarked className="w-4 h-4 text-[var(--accent-gold)]" />
                        <span>{t('nav.library', 'My Library')}</span>
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                        {user.library?.length || 0} books
                      </span>
                    </button>

                    <button
                      onClick={() => { setWorkspaceOpen(false); onNavigate('orders'); }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-[var(--text-muted)]" />
                      <span>{t('nav.orders', 'Order History')}</span>
                    </button>

                    <button
                      onClick={() => { setWorkspaceOpen(false); onNavigate('settings'); }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                      <span>{t('nav.settings', 'Account Settings')}</span>
                    </button>
                  </div>
                )}

                {/* 5. Theme & Support Options */}
                <div className="pt-1.5 px-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] py-1">
                    <span>Appearance:</span>
                    <div className="flex items-center gap-1 bg-[var(--bg-surface-elevated)] p-1 rounded-lg border border-[var(--border-subtle)]">
                      {themeOptions.map(opt => (
                        <button
                          key={opt.mode}
                          onClick={() => setTheme(opt.mode)}
                          className={`p-1.5 rounded transition-all cursor-pointer ${
                            theme === opt.mode
                              ? 'bg-[var(--accent-gold)] text-[#0B1325]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                          title={opt.label}
                        >
                          {opt.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setWorkspaceOpen(false);
                      onOpenFeedback();
                    }}
                    className="w-full mt-2 py-1.5 text-center text-[11px] font-semibold text-[var(--accent-gold)] hover:underline flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Customer Support & Feedback</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT SIDE: EXACTLY 4 PRIMARY ACTIONS                    */}
        {/* 1. Search | 2. Language | 3. Cart | 4. Favorites        */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* ACTION 1: Real-Time Persistent Search */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                searchOpen
                  ? 'bg-[var(--accent-gold)] text-[#0B1325] border-[var(--accent-gold)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] border-transparent hover:border-[var(--border-subtle)]'
              }`}
              title={t('common.search', 'Search Catalog')}
              aria-label="Search Catalog"
              aria-expanded={searchOpen}
            >
              <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>

            {/* Live Interactive Search Dropdown Panel */}
            {searchOpen && (
              <div className="fixed sm:absolute top-18 sm:top-full left-2 right-2 sm:left-auto sm:right-0 sm:mt-2 sm:w-[420px] bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-3 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search Input Box */}
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, or description..."
                    className="w-full pl-9 pr-8 py-2 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Real-Time Dropdown Results */}
                <div className="mt-2.5 max-h-[380px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {searchQuery.trim() ? (
                    searchResults.length > 0 ? (
                      <div>
                        <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          Matching Books ({searchResults.length})
                        </div>
                        {searchResults.map(book => (
                          <div
                            key={book.id}
                            onClick={() => handleBookClick(book)}
                            className="p-2 rounded-xl hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer flex items-center gap-3 group"
                          >
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded-md shadow-xs shrink-0 ring-1 ring-[var(--border-subtle)]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&q=80';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors truncate">
                                {book.title}
                              </h4>
                              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                by {book.author}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                  {book.category}
                                </span>
                                <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  {book.rating?.toFixed(1) || '4.9'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-[var(--accent-gold)]">
                                {book.isFree ? 'FREE' : formatPrice(book.sellingPrice)}
                              </span>
                              <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-end gap-1 group-hover:text-[var(--accent-gold)] mt-0.5">
                                <span>View</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                        <p className="font-semibold text-[var(--text-secondary)]">No books found</p>
                        <p className="text-[11px] mt-1">No title, author, or description matched "{searchQuery}"</p>
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            onNavigate('explore');
                          }}
                          className="mt-3 text-[11px] font-bold text-[var(--accent-gold)] hover:underline inline-block"
                        >
                          Browse Full Catalog →
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="py-2">
                      <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Popular Quick Searches
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Fiction', 'Self-Help', 'Finance', 'Technology', 'Bestsellers', 'Free'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setSearchQuery(tag)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--accent-gold-muted)] hover:text-[var(--accent-gold)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACTION 2: 30-Language Selector Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5"
              aria-label="Select Language"
              title={`Active Language: ${currentLangObj.name} (${currentLangObj.nativeName})`}
              aria-expanded={langDropdownOpen}
            >
              <Globe className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                {language}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            </button>

            {langDropdownOpen && (
              <div className="fixed sm:absolute top-18 sm:top-full left-2 right-2 sm:left-auto sm:right-0 sm:mt-2 sm:w-68 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl py-2 z-50 text-xs backdrop-blur-xl animate-in fade-in duration-150">
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

                <div className="max-h-60 overflow-y-auto py-1">
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

          {/* ACTION 3: Shopping Cart Button with Live Badge */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] border border-transparent hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
            title={t('nav.cart', 'Cart')}
            aria-label="Open Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[var(--text-primary)]" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--accent-gold)] text-[#0B1325] text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums shadow-xs animate-in zoom-in-50">
                {cartCount}
              </span>
            )}
          </button>

          {/* ACTION 4: Favorites / Wishlist Button with Live Badge */}
          <button
            onClick={() => onNavigate('wishlist')}
            className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] border border-transparent hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
            title={t('nav.wishlist', 'Wishlist / Favorites')}
            aria-label="Wishlist / Favorites"
          >
            <Heart className={`w-5 h-5 transition-transform active:scale-90 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'text-[var(--text-primary)]'}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums shadow-xs animate-in zoom-in-50">
                {wishlistCount}
              </span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
