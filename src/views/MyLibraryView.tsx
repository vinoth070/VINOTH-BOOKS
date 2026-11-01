import React, { useState, useEffect } from 'react';
import { BookOpen, Download, ShieldCheck, ArrowRight, BookMarked, Search } from 'lucide-react';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../services/apiClient';
import { FALLBACK_BOOKS } from '../data/fallbackData';
import { resolveBookCover } from '../utils/imageUrl';

interface MyLibraryViewProps {
  onOpenReader: (book: Book) => void;
  onSelectBook: (book: Book) => void;
  onNavigate: (view: string) => void;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({ onOpenReader, onSelectBook, onNavigate }) => {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await apiClient.get<{ library: Book[] }>('/api/library');
        if (data && Array.isArray(data.library)) {
          setLibraryBooks(data.library);
        } else {
          throw new Error('No library returned');
        }
      } catch (err) {
        // Fallback for static/offline: match user.library IDs against FALLBACK_BOOKS
        if (user?.library && user.library.length > 0) {
          const matched = FALLBACK_BOOKS.filter(b => user.library.includes(b.id));
          setLibraryBooks(matched);
        } else {
          setLibraryBooks([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, [token, user]);

  const handleDownload = async (book: Book) => {
    try {
      setDownloadingId(book.id);
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
    } catch {
      // Fallback client text download
    } finally {
      setDownloadingId(null);
    }

    try {
      const content = `VINOTH BOOKS DIGITAL EDITION\nTitle: ${book.title}\nAuthor: ${book.author}\n\n${book.fullDescription}\n\nKey Learnings:\n${(book.keyLearnings || []).join('\n')}`;
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
      alert('Unable to download file.');
    }
  };

  const filteredBooks = libraryBooks.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block">
            Personal Reader Portal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            My Digital Library
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Welcome, <strong>{user?.name}</strong>. Access your perpetual digital book collection, read online, or download offline formats.
          </p>
        </div>

        {libraryBooks.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your library..."
              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-24 space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
          <p className="font-serif text-sm text-[var(--text-secondary)]">Retrieving purchased licenses...</p>
        </div>
      ) : libraryBooks.length === 0 ? (
        <div className="text-center py-20 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl p-8 max-w-lg mx-auto space-y-4 shadow-[var(--card-shadow)]">
          <div className="w-14 h-14 mx-auto rounded-full bg-[var(--bg-surface-muted)] flex items-center justify-center text-[var(--accent-gold)]">
            <BookMarked className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)]">Your Library is Empty</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            You have not purchased or claimed any books yet. Explore Vinoth's independent catalog or download our complimentary starter guides.
          </p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-6 py-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors cursor-pointer"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredBooks.map(book => (
            <div
              key={book.id}
              className="bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-[var(--card-shadow)] hover:shadow-xl flex flex-col justify-between transition-all"
            >
              <div className="p-5 flex gap-4">
                <img
                  src={resolveBookCover(book.coverImage)}
                  alt={book.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-28 object-cover rounded-lg shadow-xs shrink-0 bg-slate-900"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--accent-gold)] font-bold block truncate">
                    {book.category}
                  </span>
                  <h3
                    onClick={() => onSelectBook(book)}
                    className="font-serif text-base font-bold text-[var(--text-primary)] line-clamp-2 hover:text-[var(--accent-gold)] cursor-pointer leading-snug"
                  >
                    {book.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">By {book.author}</p>
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified License</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenReader(book)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Online</span>
                </button>
                <button
                  type="button"
                  disabled={downloadingId === book.id}
                  onClick={() => handleDownload(book)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold uppercase tracking-wider bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{downloadingId === book.id ? 'Preparing...' : 'Download'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
