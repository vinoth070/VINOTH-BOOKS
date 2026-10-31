import React from 'react';
import { Heart, ShoppingBag, ArrowRight, BookOpen } from 'lucide-react';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { BookCard } from '../components/BookCard';

interface WishlistViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
  onNavigate: (view: string) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  books,
  onSelectBook,
  onOpenReader,
  onNavigate
}) => {
  const { wishlist } = useAuth();
  const { t } = useI18n();
  const wishlistedBooks = books.filter(b => wishlist.includes(b.id) && b.status === 'published');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
      <div className="space-y-1 pb-4 border-b border-[var(--border-subtle)]">
        <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block">
          Saved For Later
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
          My Reading Wishlist ({wishlistedBooks.length})
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Books you've bookmarked for future reading, study, and research.
        </p>
      </div>

      {wishlistedBooks.length === 0 ? (
        <div className="text-center py-20 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl p-8 max-w-lg mx-auto space-y-4 shadow-[var(--card-shadow)]">
          <div className="w-14 h-14 mx-auto rounded-full bg-[var(--bg-surface-muted)] flex items-center justify-center text-[var(--accent-gold)]">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)]">Your Wishlist is Empty</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Click the heart icon on any eBook card in the bookstore to save it to your personal wishlist.
          </p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-6 py-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors cursor-pointer"
          >
            Explore eBooks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {wishlistedBooks.map(book => (
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
  );
};
