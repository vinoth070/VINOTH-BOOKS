import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageByCode, Language } from '../i18n/languages';
import { getTranslation } from '../i18n/translations';
import { useAuth } from './AuthContext';
import { db, doc, updateDoc } from '../firebase';

interface I18nContextType {
  language: string;
  currentLanguage: Language;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  setLanguage: (langCode: string) => Promise<void>;
  t: (key: string, defaultVal?: string) => string;
  supportedLanguages: Language[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [language, setLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vinoth_books_language');
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch {}
    return DEFAULT_LANGUAGE;
  });

  const currentLanguage = getLanguageByCode(language);
  const dir = currentLanguage.dir;
  const isRTL = dir === 'rtl';

  // Synchronize document direction and lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    if (isRTL) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language, dir, isRTL]);

  // Synchronize with authenticated user's saved preference
  useEffect(() => {
    if (user?.language && user.language !== language && SUPPORTED_LANGUAGES.some(l => l.code === user.language)) {
      setLanguageState(user.language);
      localStorage.setItem('vinoth_books_language', user.language);
    }
  }, [user?.language]);

  const setLanguage = async (newLangCode: string) => {
    const valid = SUPPORTED_LANGUAGES.find(l => l.code === newLangCode);
    if (!valid) return;

    setLanguageState(newLangCode);
    try {
      localStorage.setItem('vinoth_books_language', newLangCode);
    } catch {}

    // Save to user account in Firestore and backend if signed in
    if (user?.id) {
      try {
        await Promise.allSettled([
          updateDoc(doc(db, 'users', user.id), { language: newLangCode }),
          fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('vb_token') || ''}`
            },
            body: JSON.stringify({ language: newLangCode })
          })
        ]);
      } catch (err) {
        console.warn('Could not persist language to user profile:', err);
      }
    }
  };

  const t = (key: string, defaultVal?: string): string => {
    return getTranslation(language, key, defaultVal);
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        currentLanguage,
        dir,
        isRTL,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
