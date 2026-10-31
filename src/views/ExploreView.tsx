import React, { useState, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, BookOpen, X, RefreshCw } from 'lucide-react';
import { Book, Category } from '../types';
import { BookCard } from '../components/BookCard';

interface ExploreViewProps {
  books: Book[];
  categories: Category[];
  initialCategory?: string;
  initialFilter?: string;
  initialSort?: string;
  onSelectBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  books,
  categories,
  initialCategory,
  initialFilter,
  initialSort,
  onSelectBook,
  onOpenReader
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'under500' | '500to1000' | 'above1000'>(
    initialFilter === 'free' ? 'free' : 'all'
  );
  const [sortBy, setSortBy] = useState<string>(initialSort || (initialFilter === 'bestseller' ? 'popular' : 'popular'));
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Synchronize when parent navigation changes filter/category/sort
  React.useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialFilter === 'free') setPriceFilter('free');
    else if (initialFilter === 'bestseller') setSortBy('popular');
    else if (initialFilter === 'all') setPriceFilter('all');
    if (initialSort) setSortBy(initialSort);
  }, [initialCategory, initialFilter, initialSort]);

  // Filter & Search logic
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = book.title.toLowerCase().includes(q);
        const matchesSubtitle = book.subtitle.toLowerCase().includes(q);
        const matchesAuthor = book.author.toLowerCase().includes(q);
        const matchesCategory = book.category.toLowerCase().includes(q);
        const matchesTags = book.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSubtitle && !matchesAuthor && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All' && book.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Price filter
      if (priceFilter === 'free' && (!book.isFree && book.sellingPrice > 0)) return false;
      if (priceFilter === 'under500' && (book.isFree || book.sellingPrice >= 500)) return false;
      if (priceFilter === '500to1000' && (book.sellingPrice < 500 || book.sellingPrice > 1000)) return false;
      if (priceFilter === 'above1000' && book.sellingPrice <= 1000) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popular') return (b.salesCount || 0) - (a.salesCount || 0);
      if (sortBy === 'newest') return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
      if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'rating') return (b.rating || 5) - (a.rating || 5);
      return 0;
    });
  }, [books, searchQuery, selectedCategory, priceFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setPriceFilter('all');
    setSortBy('popular');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
      {/* Top Title & Search bar */}
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block">
            Digital Publishing Library
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Explore All eBooks
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xl">
            Filter by domain, search topics, or discover timeless independent manuscripts authored by Vinoth.
          </p>
        </div>

        {/* Search input with live feedback */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by book title, keyword, or domain..."
              className="w-full pl-10 pr-10 py-3 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3.5 py-3 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="popular">Sort: Most Popular</option>
              <option value="newest">Sort: Newest First</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className="lg:hidden px-3.5 py-3 text-xs font-bold bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid & Filters Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Filter Sidebar (Desktop) */}
        <aside className={`${isFilterDrawerOpen ? 'block' : 'hidden'} lg:block space-y-6`}>
          {/* Category Filter */}
          <div className="p-5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-3 shadow-[var(--card-shadow)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              Categories
            </h3>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[var(--accent-gold)] text-[#0B1325] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>All Categories</span>
                <span className="font-mono text-[11px] opacity-80">{books.length}</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.name.toLowerCase()
                      ? 'bg-[var(--accent-gold)] text-[#0B1325] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate mr-2">{cat.name}</span>
                  <span className="font-mono text-[11px] opacity-80">{cat.bookCount || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="p-5 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl space-y-3 shadow-[var(--card-shadow)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              Price Range
            </h3>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Prices' },
                { id: 'free', label: 'Free eBooks Only' },
                { id: 'under500', label: 'Under ₹500' },
                { id: '500to1000', label: '₹500 — ₹1,000' },
                { id: 'above1000', label: 'Above ₹1,000' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriceFilter(opt.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    priceFilter === opt.id
                      ? 'bg-[var(--accent-gold)] text-[#0B1325] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters button */}
          {(selectedCategory !== 'All' || priceFilter !== 'all' || searchQuery) && (
            <button
              onClick={resetFilters}
              className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-surface-muted)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>Reset All Filters</span>
            </button>
          )}
        </aside>

        {/* Right Column: Books Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active filter summary bar */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-subtle)]">
            <span>
              Showing <strong className="text-[var(--text-primary)]">{filteredBooks.length}</strong> {filteredBooks.length === 1 ? 'eBook' : 'eBooks'}
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </span>
            {(selectedCategory !== 'All' || priceFilter !== 'all' || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-[var(--accent-gold)] font-bold hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {filteredBooks.length === 0 ? (
            <div className="text-center py-20 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl space-y-4 p-8 shadow-[var(--card-shadow)]">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bg-surface-muted)] flex items-center justify-center text-[var(--accent-gold)]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">No eBooks Found</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                We couldn't find any books matching your specific search or filter criteria. Try expanding your search or clearing active filters.
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] cursor-pointer"
              >
                View All Published Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredBooks.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  onSelect={onSelectBook}
                  onOpenReader={onOpenReader}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
