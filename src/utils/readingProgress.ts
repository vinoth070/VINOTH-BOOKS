/**
 * VINOTH BOOKS — Reading Progress Tracker
 * Persists chapter index, completion percentage, and last reading timestamp
 * for each user and book in localStorage, with multi-tab / custom event sync.
 */

export interface ReadingProgressData {
  bookId: string;
  chapterIndex: number;
  totalChapters: number;
  percent: number;
  chapterTitle?: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'vb_reading_progress_';

function getKey(userId: string | undefined, bookId: string): string {
  const uid = userId ? userId.trim() : 'guest';
  return `${STORAGE_PREFIX}${uid}_${bookId}`;
}

export function saveReadingProgress(
  userId: string | undefined,
  bookId: string,
  chapterIndex: number,
  totalChapters: number,
  chapterTitle?: string
): ReadingProgressData {
  const safeTotal = Math.max(1, totalChapters);
  const safeIndex = Math.max(0, Math.min(chapterIndex, safeTotal - 1));
  const percent = Math.min(100, Math.max(0, Math.round(((safeIndex + 1) / safeTotal) * 100)));

  const progress: ReadingProgressData = {
    bookId,
    chapterIndex: safeIndex,
    totalChapters: safeTotal,
    percent,
    chapterTitle: chapterTitle || `Chapter ${safeIndex + 1}`,
    updatedAt: new Date().toISOString()
  };

  try {
    const key = getKey(userId, bookId);
    localStorage.setItem(key, JSON.stringify(progress));
    
    // Also store a global index mapping for quick library lookups
    const indexKey = `vb_progress_index_${userId || 'guest'}`;
    const rawIndex = localStorage.getItem(indexKey);
    const progressMap: Record<string, number> = rawIndex ? JSON.parse(rawIndex) : {};
    progressMap[bookId] = percent;
    localStorage.setItem(indexKey, JSON.stringify(progressMap));

    // Dispatch event for reactive UI updates across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vb-reading-progress-updated', {
        detail: { userId: userId || 'guest', bookId, progress }
      }));
    }
  } catch (err) {
    console.warn('Unable to persist reading progress to localStorage:', err);
  }

  return progress;
}

export function getReadingProgress(
  userId: string | undefined,
  bookId: string
): ReadingProgressData | null {
  try {
    const key = getKey(userId, bookId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingProgressData;
  } catch (err) {
    return null;
  }
}

export function getAllReadingProgress(
  userId: string | undefined
): Record<string, ReadingProgressData> {
  const result: Record<string, ReadingProgressData> = {};
  if (typeof window === 'undefined') return result;

  try {
    const uid = userId ? userId.trim() : 'guest';
    const prefix = `${STORAGE_PREFIX}${uid}_`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const bookId = key.substring(prefix.length);
        const raw = localStorage.getItem(key);
        if (raw) {
          result[bookId] = JSON.parse(raw);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading all reading progress:', err);
  }

  return result;
}
