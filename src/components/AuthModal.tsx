import React, { useState } from 'react';
import {
  X, Lock, ShieldCheck, Mail, Check, AlertCircle, Eye, EyeOff,
  ArrowRight, Sparkles, RefreshCw
} from 'lucide-react';
import { useAuth, evaluatePasswordRules, isPasswordStrong, isDisposableEmail } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess?: () => void;
  onCustomerLoginSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAdminLoginSuccess, onCustomerLoginSuccess }) => {
  const { login, register, signInWithGoogle, forgotPassword, resendVerificationEmail } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time evaluation of password rules for sign up
  const passwordRules = evaluatePasswordRules(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValidToRegister =
    name.trim().length > 0 &&
    email.includes('@') &&
    !isDisposableEmail(email) &&
    isPasswordStrong(passwordRules) &&
    passwordsMatch;

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setError(res.error || 'Google authentication failed');
      } else {
        onClose();
        if (res.user?.role === 'admin') {
          if (onAdminLoginSuccess) onAdminLoginSuccess();
          else window.location.hash = '#/admin';
        } else {
          if (onCustomerLoginSuccess) onCustomerLoginSuccess();
          else window.location.hash = '#/home';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'login') {
        const res = await login(cleanEmail, password);
        if (!res.success) {
          if (res.requiresEmailVerification) {
            setPendingVerificationEmail(cleanEmail);
            setMode('verify');
          } else {
            setError(res.error || 'Invalid email or password');
          }
        } else {
          onClose();
          if (res.user?.role === 'admin') {
            if (onAdminLoginSuccess) onAdminLoginSuccess();
            else window.location.hash = '#/admin';
          } else {
            if (onCustomerLoginSuccess) onCustomerLoginSuccess();
            else window.location.hash = '#/home';
          }
        }
      } else if (mode === 'register') {
        if (!passwordsMatch) {
          setError('Passwords do not match. Please re-enter.');
          setLoading(false);
          return;
        }

        if (isDisposableEmail(cleanEmail)) {
          setError('Temporary or disposable email services are blocked. Please provide a genuine email address.');
          setLoading(false);
          return;
        }

        if (!isPasswordStrong(passwordRules)) {
          setError('Please fulfill all password security criteria in the checklist below.');
          setLoading(false);
          return;
        }

        const res = await register(name, cleanEmail, password);
        if (!res.success) {
          setError(res.error || 'Account registration failed');
        } else {
          setPendingVerificationEmail(cleanEmail);
          setMode('verify');
          setSuccessMsg('Account created! A verification link has been sent to your email.');
        }
      } else if (mode === 'forgot') {
        const res = await forgotPassword(cleanEmail);
        if (!res.success) {
          setError(res.error || 'Failed to send password reset');
        } else {
          setSuccessMsg(res.message || 'Password reset link sent to your email.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setSuccessMsg(res.message || 'Verification email resent successfully!');
      } else {
        setError(res.error || 'Failed to resend verification email');
      }
    } catch (err: any) {
      setError(err.message || 'Error sending email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-auto my-auto bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold-muted)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] truncate">
                {mode === 'login' && 'Sign In to VINOTH BOOKS'}
                {mode === 'register' && 'Create Your Account'}
                {mode === 'forgot' && 'Reset Your Password'}
                {mode === 'verify' && 'Verify Your Email'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Tabs for Login vs Register */}
          {mode !== 'forgot' && mode !== 'verify' && (
            <div className="flex border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className={`pb-3 text-xs font-bold uppercase tracking-wider flex-1 text-center transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'border-b-2 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                className={`pb-3 text-xs font-bold uppercase tracking-wider flex-1 text-center transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'border-b-2 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                New Customer (Sign Up)
              </button>
            </div>
          )}

          {/* Error Message banner */}
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Success Message banner */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* 1. GOOGLE ONE-CLICK AUTH (For both Sign In & Sign Up) */}
          {(mode === 'login' || mode === 'register') && (
            <div>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl text-xs font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {/* Official Google SVG Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{mode === 'login' ? 'Sign In with Google' : 'Sign Up with Google'}</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-subtle)]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-[var(--bg-surface)] px-2.5 text-[var(--text-muted)]">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. EMAIL VERIFICATION PENDING SCREEN */}
          {mode === 'verify' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                  Confirm Your Email Ownership
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  We have dispatched a verification email to:
                  <br />
                  <strong className="text-[var(--text-primary)] font-mono">{pendingVerificationEmail || email}</strong>
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Click the link inside the email to activate your account. Once verified, you can sign in to access your purchased books and reading library.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="w-full py-2.5 bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Resend Verification Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-xs text-[var(--accent-gold)] hover:underline pt-1 cursor-pointer font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* 3. FORGOT PASSWORD VIEW */}
          {mode === 'forgot' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Enter your registered account email. We will send a secure password reset link to your inbox.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="text-xs text-[var(--accent-gold)] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 4. MAIN FORM: SIGN IN OR SIGN UP */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Anand Sharma"
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reader@vinothbooks.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                />
              </div>

              {/* Password field with Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                      className="text-[11px] text-[var(--accent-gold)] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full px-3.5 py-2.5 pr-10 text-xs bg-[var(--bg-surface-card)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[var(--border-subtle)] focus:border-[var(--accent-gold)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
                  )}
                </div>
              )}

              {/* LIVE PASSWORD STRENGTH CHECKLIST (Sign Up only) */}
              {mode === 'register' && (
                <div className="p-3.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)] block">
                    Password Security Checklist
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                        passwordRules.minLength ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-transparent'
                      }`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={passwordRules.minLength ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                        passwordRules.hasUpper ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-transparent'
                      }`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={passwordRules.hasUpper ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
                        At least one uppercase letter (A–Z)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                        passwordRules.hasLower ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-transparent'
                      }`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={passwordRules.hasLower ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
                        At least one lowercase letter (a–z)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                        passwordRules.hasNumber ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-transparent'
                      }`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={passwordRules.hasNumber ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
                        At least one number (0–9)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                        passwordRules.hasSpecial ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-transparent'
                      }`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={passwordRules.hasSpecial ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
                        At least one special character (!@#$%^&*...)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || (mode === 'register' && !isFormValidToRegister)}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? 'Verifying...'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Customer Account'}
              </button>
            </form>
          )}

          {/* Privacy & Direct Guarantee Notice */}
          <div className="pt-2 text-center text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>End-to-End Encrypted Session · Firebase Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
