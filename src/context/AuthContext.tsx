import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
  FirebaseUser
} from '../firebase';

// Disposable / temporary email blocklist
export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'temp-mail.org',
  'tempail.com',
  'mohmal.com',
  'burnermail.io'
];

export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

// Password strength checklist validator
export interface PasswordValidationRules {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordRules(password: string): PasswordValidationRules {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
  };
}

export function isPasswordStrong(rules: PasswordValidationRules): boolean {
  return (
    rules.minLength &&
    rules.hasUpper &&
    rules.hasLower &&
    rules.hasNumber &&
    rules.hasSpecial
  );
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  unverifiedEmail: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string; requiresEmailVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string; requiresEmailVerification?: boolean }>;
  resendVerificationEmail: () => Promise<{ success: boolean; message?: string; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  wishlist: string[];
  toggleWishlist: (bookId: string) => Promise<void>;
  isWishlisted: (bookId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vb_token'));
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vb_guest_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync session with backend to get authoritative role, library & wishlist
  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (Array.isArray(data.user.wishlist)) {
          setWishlist(data.user.wishlist);
        }
      } else {
        localStorage.removeItem('vb_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // Synchronize backend auth with Firebase user
  const syncWithBackend = async (firebaseUser: FirebaseUser, fallbackName?: string) => {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch('/api/auth/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || fallbackName || 'Reader',
        emailVerified: firebaseUser.emailVerified
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to authenticate on backend');
    }

    localStorage.setItem('vb_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (Array.isArray(data.user.wishlist)) {
      setWishlist(data.user.wishlist);
    }
    return data.user;
  };

  // Sign In with Email & Password
  const login = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim();
      let fbUser: FirebaseUser | null = null;

      // 1. Attempt Firebase Auth first
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = cred.user;
      } catch (fbErr: any) {
        // If user does not exist in Firebase Auth yet, try backend legacy/admin migration
        console.warn('Firebase login check, checking backend credentials:', fbErr.message);
      }

      // 2. Call backend login for verification & role resolution
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid email or password' };
      }

      // Check email verification for customers (unless admin)
      if (data.user.role !== 'admin' && fbUser && !fbUser.emailVerified && !data.user.emailVerified) {
        setUnverifiedEmail(cleanEmail);
        return {
          success: false,
          error: 'Please verify your email address to access your bookstore account. Check your inbox for the verification link.',
          requiresEmailVerification: true
        };
      }

      localStorage.setItem('vb_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setUnverifiedEmail(null);
      if (Array.isArray(data.user.wishlist)) {
        setWishlist(data.user.wishlist);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  // Google Sign In & Sign Up
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const syncedUser = await syncWithBackend(fbUser);
      setUnverifiedEmail(null);
      return { success: true, user: syncedUser };
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      return { success: false, error: err.message || 'Google authentication failed' };
    }
  };

  // Register New Customer Account
  const register = async (name: string, email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      // Check disposable email
      if (isDisposableEmail(cleanEmail)) {
        return {
          success: false,
          error: 'Disposable or temporary email addresses are blocked. Please use your genuine personal or corporate email.'
        };
      }

      // Validate password rules
      const rules = evaluatePasswordRules(password);
      if (!isPasswordStrong(rules)) {
        return {
          success: false,
          error: 'Password does not meet security requirements. Please check the strength checklist below.'
        };
      }

      // 1. Create in Firebase Auth
      let fbUser: FirebaseUser | null = null;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = cred.user;
        // Send email verification
        await sendEmailVerification(cred.user);
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
        }
        console.warn('Firebase user creation note:', fbErr.message);
      }

      // 2. Register on Backend
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          uid: fbUser?.uid,
          emailVerified: fbUser?.emailVerified ?? false
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Account registration failed' };
      }

      setUnverifiedEmail(cleanEmail);
      return {
        success: true,
        user: data.user,
        requiresEmailVerification: true
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to register account' };
    }
  };

  // Resend email verification
  const resendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true, message: 'Verification email sent! Please check your inbox and spam folder.' };
      }
      return { success: false, error: 'No active registration session found. Please sign in to request a verification email.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resend verification email' };
    }
  };

  // Forgot password
  const forgotPassword = async (email: string) => {
    try {
      const cleanEmail = email.trim();
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch (fbErr) {
        console.warn('Firebase reset note:', fbErr);
      }
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      return { success: true, message: data.message || `Password reset instructions sent to ${cleanEmail}.` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send password reset' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signout note:', err);
    }
    localStorage.removeItem('vb_token');
    setToken(null);
    setUser(null);
    setUnverifiedEmail(null);
  };

  // Refresh user data from server
  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  // Toggle wishlist
  const toggleWishlist = async (bookId: string) => {
    if (!token || !user) {
      setWishlist(prev => {
        const next = prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId];
        localStorage.setItem('vb_guest_wishlist', JSON.stringify(next));
        return next;
      });
      return;
    }

    try {
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist || []);
        setUser(prev => prev ? { ...prev, wishlist: data.wishlist || [] } : null);
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    }
  };

  const isWishlisted = (bookId: string) => wishlist.includes(bookId);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        unverifiedEmail,
        login,
        signInWithGoogle,
        register,
        resendVerificationEmail,
        forgotPassword,
        logout,
        refreshUser,
        wishlist,
        toggleWishlist,
        isWishlisted
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
