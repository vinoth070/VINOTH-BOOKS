import React, { useState, useEffect } from 'react';
import {
  BookOpen, Download, ShieldCheck, ArrowRight, BookMarked, Search,
  Target, Trophy, Sparkles, Edit3, X, Check, Flame
} from 'lucide-react';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../services/apiClient';
import { FALLBACK_BOOKS } from '../data/fallbackData';
import { resolveBookCover } from '../utils/imageUrl';
import { getAllReadingProgress, ReadingProgressData } from '../utils/readingProgress';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface MyLibraryViewProps {
  onOpenReader: (book: Book) => void;
  onSelectBook: (book: Book) => void;
  onNavigate: (view: string) => void;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({ onOpenReader, onSelectBook, onNavigate }) => {
  const { user, token, refreshUser } = useAuth();
  const { t } = useI18n();
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgressData>>({});

  // Reading Goal states
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const [goalTarget, setGoalTarget] = useState<number>(user?.reading_goal?.target || 3);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  useEffect(() => {
    if (user?.reading_goal?.target) {
      setGoalTarget(user.reading_goal.target);
    }
  }, [user?.reading_goal?.target]);

  useEffect(() => {
    const updateProgress = () => {
      const local = getAllReadingProgress(user?.id);
      const remote = (user?.reading_progress as Record<string, ReadingProgressData>) || {};
      setProgressMap({ ...remote, ...local });
    };
    updateProgress();
    window.addEventListener('vb-reading-progress-updated', updateProgress);
    return () => window.removeEventListener('vb-reading-progress-updated', updateProgress);
  }, [user?.id, user?.reading_progress]);

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

  // Calculate completed books (percent >= 100)
  const completedBooks = libraryBooks.filter(book => (progressMap[book.id]?.percent || 0) >= 100);
  const completedCount = completedBooks.length;
  const activeTarget = user?.reading_goal?.target || goalTarget || 3;
  const goalProgressPercent = Math.min(100, Math.round((completedCount / activeTarget) * 100));

  const handleSaveGoal = async (targetVal: number) => {
    try {
      setIsSavingGoal(true);
      const newGoal = {
        target: targetVal,
        month: currentMonthKey,
        updatedAt: new Date().toISOString()
      };

      // 1. Backend sync
      try {
        await apiClient.post('/api/user/reading-goal', { target: targetVal, month: currentMonthKey });
      } catch (e) {
        // Continue if offline/static
      }

      // 2. Direct Firestore sync
      if (user?.id) {
        try {
          await setDoc(doc(db, 'users', user.id), { reading_goal: newGoal }, { merge: true });
        } catch (e) {
          console.warn('Firestore reading goal sync note:', e);
        }
      }

      if (user) {
        user.reading_goal = newGoal;
      }
      setGoalTarget(targetVal);
      setIsGoalModalOpen(false);
      await refreshUser();
    } finally {
      setIsSavingGoal(false);
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

      {/* MONTHLY READING GOAL FEATURE WIDGET */}
      {user && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--bg-surface-card)] via-[var(--bg-surface-elevated)] to-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 shadow-[var(--card-shadow)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-gold-muted)] border border-[var(--accent-gold)]/20 flex items-center justify-center text-[var(--accent-gold)] shrink-0 shadow-xs">
                {goalProgressPercent >= 100 ? (
                  <Trophy className="w-5 h-5 text-[var(--accent-gold)] animate-bounce" />
                ) : (
                  <Target className="w-5 h-5 text-[var(--accent-gold)]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    {currentMonthLabel} Reading Goal
                  </h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    goalProgressPercent >= 100
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30'
                  }`}>
                    {goalProgressPercent >= 100 ? 'Goal Completed! 🎉' : `${completedCount} of ${activeTarget} Books`}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {goalProgressPercent >= 100
                    ? `Brilliant work! You completed your target of ${activeTarget} books this month.`
                    : goalProgressPercent > 0
                    ? `You've finished ${completedCount} book${completedCount === 1 ? '' : 's'}. Only ${activeTarget - completedCount} more to hit your monthly goal!`
                    : `Aim to read ${activeTarget} books this month. Open any title to begin tracking your progress.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Adjust Target</span>
              </button>
            </div>
          </div>

          {/* Visual Goal Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Monthly Completion</span>
              </span>
              <span className="font-bold text-[var(--accent-gold)]">{goalProgressPercent}%</span>
            </div>
            <div className="w-full bg-[var(--bg-surface-muted)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)] p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B38A38] via-[#D4AF37] to-[#F3E5AB] transition-all duration-500 shadow-xs"
                style={{ width: `${goalProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* EDIT GOAL MODAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--accent-gold)]" />
                <h4 className="font-serif text-lg font-bold text-[var(--text-primary)]">Set Reading Goal</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              How many eBooks do you plan to complete in <strong>{currentMonthLabel}</strong>?
            </p>

            {/* Preset Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setGoalTarget(num)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    goalTarget === num
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] shadow-xs'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {num} {num === 1 ? 'Book' : 'Books'}
                </button>
              ))}
            </div>

            {/* Stepper Input */}
            <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] rounded-xl">
              <span className="text-xs text-[var(--text-secondary)]">Custom target:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGoalTarget(Math.max(1, goalTarget - 1))}
                  className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)] text-sm font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-base text-[var(--accent-gold)] w-6 text-center">
                  {goalTarget}
                </span>
                <button
                  type="button"
                  onClick={() => setGoalTarget(Math.min(20, goalTarget + 1))}
                  className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)] text-sm font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingGoal}
                onClick={() => handleSaveGoal(goalTarget)}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingGoal ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#0B1325] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Goal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Reading Progress Indicator */}
              <div className="px-5 pb-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)] font-medium">Reading Progress</span>
                  <span className="font-mono font-bold text-[var(--accent-gold)]">
                    {progressMap[book.id]?.percent || 0}%
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-surface-muted)] h-1.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className="bg-[var(--accent-gold)] h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressMap[book.id]?.percent || 0}%` }}
                  />
                </div>
                {progressMap[book.id]?.chapterTitle && (
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    Last read: {progressMap[book.id].chapterTitle}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenReader(book)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {(progressMap[book.id]?.percent || 0) > 0
                      ? `Resume (${progressMap[book.id]?.percent}%)`
                      : 'Read Online'}
                  </span>
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
