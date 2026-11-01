import React, { useState, useEffect } from 'react';
import { X, BookOpen, ChevronLeft, ChevronRight, Type, Sun, Moon, Coffee, ShieldCheck } from 'lucide-react';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { FALLBACK_BOOKS } from '../data/fallbackData';

interface ReaderModalProps {
  bookId: string;
  onClose: () => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({ bookId, onClose }) => {
  const { token, user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [readerTheme, setReaderTheme] = useState<'paper' | 'dark' | 'light'>('paper');
  const [isTocOpen, setIsTocOpen] = useState(false);

  useEffect(() => {
    const fetchReaderContent = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<{ book: Book }>(`/api/library/read/${bookId}`);
        if (data?.book) {
          setBook(data.book);
        } else {
          throw new Error('Book not found');
        }
      } catch (err: any) {
        // Fallback to bundled book sample content
        const fallback = FALLBACK_BOOKS.find(b => b.id === bookId);
        if (fallback) {
          setBook(fallback);
        } else {
          setError(err.message || 'Error loading reader content');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReaderContent();
  }, [bookId, token]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && book && currentChapterIndex < book.sampleContent.length - 1) {
        setCurrentChapterIndex(prev => prev + 1);
      }
      if (e.key === 'ArrowLeft' && currentChapterIndex > 0) {
        setCurrentChapterIndex(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, currentChapterIndex, onClose]);

  const currentChapter = book?.sampleContent[currentChapterIndex];
  const progressPercent = book && book.sampleContent.length > 0
    ? Math.round(((currentChapterIndex + 1) / book.sampleContent.length) * 100)
    : 0;

  const fontClass = {
    sm: 'text-base leading-relaxed',
    base: 'text-lg leading-relaxed',
    lg: 'text-xl leading-loose',
    xl: 'text-2xl leading-loose'
  }[fontSize];

  const themeStyles = {
    paper: 'bg-[#FBF8F1] text-[#2C2416] border-[#E8DEC8]',
    dark: 'bg-[#0B1220] text-[#E2E8F0] border-[#1E293B]',
    light: 'bg-white text-[#0F172A] border-slate-200'
  }[readerTheme];

  const headerTheme = {
    paper: 'bg-[#F4ECE1] border-[#E2D5BE] text-[#2C2416]',
    dark: 'bg-[#0F172A] border-[#1E293B] text-slate-100',
    light: 'bg-slate-50 border-slate-200 text-slate-900'
  }[readerTheme];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Reading Navigation Bar */}
      <header className={`flex items-center justify-between px-3 sm:px-8 py-2.5 sm:py-3.5 border-b shadow-sm ${headerTheme}`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BookOpen className="w-5 h-5 text-[#C89B3C] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold truncate tracking-tight">
              {book ? book.title : 'Loading Digital Book...'}
            </h2>
            <p className="text-xs opacity-75 truncate">
              {book ? `By ${book.author} · Chapter ${currentChapterIndex + 1} of ${book.sampleContent?.length || 1}` : 'Preparing reader...'}
            </p>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Table of Contents Button */}
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="px-3 py-1.5 text-xs font-medium rounded border border-current/20 hover:bg-black/5 transition-colors"
            title="Table of Contents"
          >
            Contents
          </button>

          {/* Theme switchers */}
          <div className="hidden sm:flex items-center rounded border border-current/20 p-0.5 gap-1">
            <button
              onClick={() => setReaderTheme('paper')}
              className={`p-1.5 rounded text-xs transition-colors ${readerTheme === 'paper' ? 'bg-[#D4AF37]/20 text-[#845E1B] font-semibold' : 'opacity-60 hover:opacity-100'}`}
              title="Warm Paper"
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => setReaderTheme('light')}
              className={`p-1.5 rounded text-xs transition-colors ${readerTheme === 'light' ? 'bg-slate-200 text-slate-900 font-semibold' : 'opacity-60 hover:opacity-100'}`}
              title="Clean White"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setReaderTheme('dark')}
              className={`p-1.5 rounded text-xs transition-colors ${readerTheme === 'dark' ? 'bg-slate-800 text-amber-300 font-semibold' : 'opacity-60 hover:opacity-100'}`}
              title="Midnight Navy"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* Font Size controls */}
          <div className="flex items-center gap-1 border border-current/20 rounded px-1.5 py-1">
            <Type className="w-3.5 h-3.5 opacity-60 mr-1" />
            <button
              onClick={() => setFontSize(prev => prev === 'xl' ? 'lg' : prev === 'lg' ? 'base' : 'sm')}
              className="px-1 text-xs hover:font-bold opacity-70 hover:opacity-100"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="text-[10px] opacity-40">/</span>
            <button
              onClick={() => setFontSize(prev => prev === 'sm' ? 'base' : prev === 'base' ? 'lg' : 'xl')}
              className="px-1 text-xs hover:font-bold opacity-70 hover:opacity-100"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Close Reader */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 transition-colors ml-2"
            title="Exit Reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-black/10 h-1">
        <div
          className="h-full bg-[#C89B3C] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Reader Body */}
      <div className={`flex-1 relative overflow-hidden flex ${themeStyles}`}>
        {/* Table of contents sidebar */}
        {isTocOpen && book && (
          <aside className={`w-72 sm:w-80 h-full border-r overflow-y-auto p-6 z-20 shadow-xl shrink-0 ${headerTheme}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold">Chapters & Index</h3>
              <button
                onClick={() => setIsTocOpen(false)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {book.sampleContent.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
                    setIsTocOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded text-sm transition-colors ${
                    currentChapterIndex === idx
                      ? 'bg-[#C89B3C]/15 font-semibold text-[#8F6B1E]'
                      : 'hover:bg-black/5 opacity-80'
                  }`}
                >
                  <span className="text-xs opacity-60 block">Chapter {idx + 1}</span>
                  {ch.chapterTitle}
                </button>
              ))}
            </div>

            {book.keyLearnings && book.keyLearnings.length > 0 && (
              <div className="mt-8 pt-6 border-t border-current/15">
                <h4 className="text-xs uppercase tracking-wider font-semibold mb-3 opacity-70">
                  Key Takeaways
                </h4>
                <ul className="text-xs space-y-2 opacity-80">
                  {book.keyLearnings.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#C89B3C]">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}

        {/* Main Reading Flow */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 sm:py-16">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-8 h-8 border-2 border-[#C89B3C] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-serif">Opening digital edition...</p>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#0B1325] text-white rounded hover:bg-[#1A2642]"
              >
                Return to Store
              </button>
            </div>
          )}

          {book && currentChapter && !loading && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="space-y-2 pb-6 border-b border-current/10">
                <span className="text-xs uppercase tracking-widest text-[#C89B3C] font-semibold">
                  Chapter {currentChapterIndex + 1} of {book.sampleContent.length}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  {currentChapter.chapterTitle}
                </h1>
              </div>

              {/* Chapter Content with pristine typography */}
              <div className={`font-serif ${fontClass} whitespace-pre-line tracking-normal space-y-6 opacity-95`}>
                {currentChapter.content}
              </div>

              {/* Watermark & Reader Verification */}
              <div className="pt-12 mt-12 border-t border-current/10 text-xs opacity-60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C89B3C]" />
                  <span>Licensed to {user ? user.name : 'Authorized Reader'}</span>
                </div>
                <span>VINOTH BOOKS — Official Digital Edition</span>
              </div>

              {/* Chapter Pagination Controls */}
              <div className="pt-8 flex items-center justify-between">
                <button
                  disabled={currentChapterIndex === 0}
                  onClick={() => setCurrentChapterIndex(prev => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded border border-current/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Chapter
                </button>

                <span className="text-xs opacity-60">
                  {currentChapterIndex + 1} / {book.sampleContent.length}
                </span>

                <button
                  disabled={currentChapterIndex >= book.sampleContent.length - 1}
                  onClick={() => setCurrentChapterIndex(prev => Math.min(book.sampleContent.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded border border-current/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 transition-colors"
                >
                  Next Chapter
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
