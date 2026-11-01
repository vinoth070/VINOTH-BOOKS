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
  updateProfile,
  firebaseSignOut,
  onAuthStateChanged,
  FirebaseUser
} from '../firebase';
import { apiClient, ApiError } from '../services/apiClient';

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

const ADMIN_EMAILS = ['kalivinoselvikk@gmail.com', 'kalikalivino17@gmail.com'];

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
  updateUserProfile: (updates: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  removeProfilePicture: () => Promise<{ success: boolean; error?: string }>;
  wishlist: string[];
  toggleWishlist: (bookId: string) => Promise<void>;
  isWishlisted: (bookId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('vb_cached_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
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
      const data = await apiClient.get<{ user: User }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (data?.user) {
        setUser(data.user);
        if (Array.isArray(data.user.wishlist)) {
          setWishlist(data.user.wishlist);
        }
      } else {
        throw new Error('No user returned');
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('vb_token');
        setToken(null);
        setUser(null);
      } else if (auth.currentUser) {
        // Fallback for GitHub Pages static mode or server offline
        const fbUser = auth.currentUser;
        const isAdm = ADMIN_EMAILS.includes(fbUser.email?.toLowerCase().trim() || '');
        const fallbackUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Reader',
          email: fbUser.email || '',
          role: isAdm ? 'admin' : 'customer',
          library: [],
          wishlist: [],
          emailVerified: fbUser.emailVerified,
          createdAt: new Date().toISOString()
        };
        setUser(fallbackUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (!token) {
          await syncWithBackend(fbUser);
        }
      }
    });

    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }

    return () => unsubscribe();
  }, [token]);

  // Synchronize backend auth with Firebase user
  const syncWithBackend = async (firebaseUser: FirebaseUser, fallbackName?: string) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const data = await apiClient.post<{ token: string; user: User }>('/api/auth/firebase-login', {
        idToken,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || fallbackName || 'Reader',
        emailVerified: firebaseUser.emailVerified
      });

      localStorage.setItem('vb_token', data.token);
      setToken(data.token);
      setUser(data.user);
      if (Array.isArray(data.user.wishlist)) {
        setWishlist(data.user.wishlist);
      }
      return data.user;
    } catch (err: any) {
      // Graceful fallback for static GitHub Pages or server unreachable
      const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
      const isAdm = ADMIN_EMAILS.includes(cleanEmail);
      const clientUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || fallbackName || 'Reader',
        email: firebaseUser.email || '',
        role: isAdm ? 'admin' : 'customer',
        library: [],
        wishlist: [],
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date().toISOString()
      };
      const fallbackToken = `fb_${firebaseUser.uid}`;
      localStorage.setItem('vb_token', fallbackToken);
      setToken(fallbackToken);
      setUser(clientUser);
      return clientUser;
    }
  };

  // Sign In with Email & Password
  const login = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim();
      let fbUser: FirebaseUser | null = null;
      let fbAuthError: any = null;

      // 1. Attempt Firebase Auth first
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = cred.user;
      } catch (fbErr: any) {
        fbAuthError = fbErr;
        console.warn('Firebase login check, checking backend credentials:', fbErr.message);
      }

      // 2. Call backend login for verification & role resolution
      try {
        const data = await apiClient.post<{ token: string; user: User }>('/api/auth/login', {
          email: cleanEmail,
          password
        });

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
      } catch (apiErr: any) {
        // If backend failed but Firebase Auth succeeded (e.g. static hosting on GitHub Pages)
        if (fbUser) {
          const isAdm = ADMIN_EMAILS.includes(cleanEmail.toLowerCase());
          if (!isAdm && !fbUser.emailVerified) {
            setUnverifiedEmail(cleanEmail);
            return {
              success: false,
              error: 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
              requiresEmailVerification: true
            };
          }
          const clientUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Reader',
            email: cleanEmail,
            role: isAdm ? 'admin' : 'customer',
            library: [],
            wishlist: [],
            emailVerified: fbUser.emailVerified,
            createdAt: new Date().toISOString()
          };
          const fallbackToken = `fb_${fbUser.uid}`;
          localStorage.setItem('vb_token', fallbackToken);
          setToken(fallbackToken);
          setUser(clientUser);
          setUnverifiedEmail(null);
          return { success: true, user: clientUser };
        }

        // Return clear, user-friendly error
        const friendlyMessage = apiErr instanceof ApiError
          ? apiErr.message
          : (fbAuthError?.code === 'auth/wrong-password' || fbAuthError?.code === 'auth/invalid-credential')
            ? 'Invalid email or password. Please try again.'
            : (apiErr?.message || 'Invalid email or password');

        return { success: false, error: friendlyMessage };
      }
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
      const msg = err.code === 'auth/popup-closed-by-user'
        ? 'Sign-in cancelled. Please complete authentication in the popup window.'
        : (err.message || 'Google authentication failed');
      return { success: false, error: msg };
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
        await sendEmailVerification(cred.user);
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
        }
        console.warn('Firebase user creation note:', fbErr.message);
      }

      // 2. Register on Backend
      try {
        const data = await apiClient.post<{ token: string; user: User }>('/api/auth/register', {
          name: cleanName,
          email: cleanEmail,
          password,
          uid: fbUser?.uid,
          emailVerified: fbUser?.emailVerified ?? false
        });

        setUnverifiedEmail(cleanEmail);
        return {
          success: true,
          user: data.user,
          requiresEmailVerification: true
        };
      } catch (apiErr: any) {
        // If backend is static/offline but Firebase succeeded
        if (fbUser) {
          setUnverifiedEmail(cleanEmail);
          return {
            success: true,
            requiresEmailVerification: true
          };
        }
        return { success: false, error: apiErr.message || 'Account registration failed' };
      }
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
      let sentViaFirebase = false;
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        sentViaFirebase = true;
      } catch (fbErr) {
        console.warn('Firebase reset note:', fbErr);
      }

      try {
        const data = await apiClient.post<{ message: string }>('/api/auth/forgot-password', {
          email: cleanEmail
        });
        return { success: true, message: data.message || `Password reset instructions sent to ${cleanEmail}.` };
      } catch (apiErr) {
        if (sentViaFirebase) {
          return { success: true, message: `Password reset instructions sent to ${cleanEmail}. Please check your inbox.` };
        }
        return { success: false, error: 'Failed to send password reset. Please verify your email.' };
      }
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
    localStorage.removeItem('vb_cached_user');
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

  // Update profile attributes with immediate local state & persistent storage sync
  const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const mergedUser: User = {
      ...user,
      ...updates,
      photoURL: updates.photoURL !== undefined ? updates.photoURL : (updates.avatar !== undefined ? updates.avatar : user.photoURL),
      avatar: updates.avatar !== undefined ? updates.avatar : (updates.photoURL !== undefined ? updates.photoURL : user.avatar),
      updatedAt: new Date().toISOString()
    };

    setUser(mergedUser);
    try {
      localStorage.setItem('vb_cached_user', JSON.stringify(mergedUser));
    } catch {}

    // 1. Sync with Firebase Auth user profile
    try {
      if (auth.currentUser && (updates.photoURL !== undefined || updates.avatar !== undefined || updates.name !== undefined)) {
        await updateProfile(auth.currentUser, {
          displayName: updates.name ?? auth.currentUser.displayName,
          photoURL: (updates.photoURL ?? updates.avatar ?? auth.currentUser.photoURL) || ''
        });
      }
    } catch (fbErr) {
      console.warn('Firebase Auth profile update note:', fbErr);
    }

    // 2. Sync with Backend API if connected
    let serverUpdated = false;
    try {
      if (token) {
        const res = await apiClient.put<{ user: User }>('/api/auth/profile', updates);
        if (res?.user) {
          setUser(res.user);
          localStorage.setItem('vb_cached_user', JSON.stringify(res.user));
          serverUpdated = true;
        }
      }
    } catch (apiErr: any) {
      console.warn('Backend profile update note:', apiErr.message);
    }

    return { success: true, user: mergedUser };
  };

  // Remove profile picture
  const removeProfilePicture = async (): Promise<{ success: boolean; error?: string }> => {
    return updateUserProfile({ photoURL: '', avatar: '' });
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
      const data = await apiClient.post<{ wishlist: string[] }>('/api/wishlist/toggle', { bookId });
      if (data?.wishlist) {
        setWishlist(data.wishlist);
        setUser(prev => prev ? { ...prev, wishlist: data.wishlist } : null);
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
      // Fallback local toggle
      setWishlist(prev => {
        const next = prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId];
        return next;
      });
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
        updateUserProfile,
        removeProfilePicture,
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
