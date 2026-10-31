import React, { useState, useEffect } from 'react';
import {
  User as UserIcon, Shield, Moon, Sun, Monitor, Globe, Check, Eye, EyeOff,
  AlertTriangle, Save, RotateCcw, KeyRound, Smartphone, Mail, Sparkles, LogOut, Trash2
} from 'lucide-react';
import { useAuth, evaluatePasswordRules, isPasswordStrong } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { db, doc, updateDoc } from '../firebase';

interface SettingsViewProps {
  onNavigate: (view: string) => void;
  initialTab?: 'profile' | 'security' | 'appearance' | 'language';
}

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80'
];

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate, initialTab = 'profile' }) => {
  const { user, token, logout, forgotPassword, refreshUser } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, t, supportedLanguages, dir, isRTL } = useI18n();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'language'>(initialTab);

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || AVATAR_OPTIONS[0]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account Deletion State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search Language State
  const [searchLangQuery, setSearchLangQuery] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      if (user.photoURL) setPhotoURL(user.photoURL);
    }
  }, [user]);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setProfileSaving(true);
    setProfileMsg(null);

    try {
      // 1. Sync with backend database
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: displayName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          photoURL: photoURL.trim(),
          language,
          theme
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      // 2. Sync with Cloud Firestore
      if (user?.id) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            name: displayName.trim(),
            phone: phone.trim(),
            bio: bio.trim(),
            photoURL: photoURL.trim(),
            updatedAt: new Date().toISOString()
          });
        } catch (fbErr) {
          console.warn('Firestore profile sync note:', fbErr);
        }
      }

      await refreshUser();
      setProfileMsg({ type: 'success', text: t('settings.saved', 'Profile updated successfully!') });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    const rules = evaluatePasswordRules(newPassword);
    if (!isPasswordStrong(rules)) {
      setPasswordMsg({ type: 'error', text: 'Password must fulfill all security criteria (8+ chars, upper, lower, number, special symbol).' });
      return;
    }

    setPasswordSaving(true);
    setPasswordMsg(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordMsg({ type: 'success', text: 'Your password was changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Error updating password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Could not delete account');
        setDeleteLoading(false);
        return;
      }
      await logout();
      onNavigate('home');
    } catch {
      alert('Network error deleting account');
      setDeleteLoading(false);
    }
  };

  const filteredLanguages = supportedLanguages.filter(l =>
    l.name.toLowerCase().includes(searchLangQuery.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(searchLangQuery.toLowerCase()) ||
    l.code.toLowerCase().includes(searchLangQuery.toLowerCase())
  );

  const passwordRules = evaluatePasswordRules(newPassword);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="mb-8 border-b border-[var(--border-subtle)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-gold)]">
            {t('nav.settings', 'Account Settings')}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">
            {t('settings.title', 'Customer Account Settings')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {t('settings.subtitle', 'Manage your personal profile, security credentials, appearance, and language.')}
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 bg-[var(--bg-surface-elevated)] px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] self-start sm:self-auto">
            <img
              src={photoURL || AVATAR_OPTIONS[0]}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--accent-gold)]"
            />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[160px]">{user.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[160px]">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Layout: Sidebar Tabs + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        
        {/* Navigation Tabs */}
        <aside className="lg:col-span-1 space-y-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4" />
              <span>{t('settings.profile', 'Profile Settings')}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4" />
              <span>{t('settings.security', 'Account Security')}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4" />
              <span>{t('settings.appearance', 'Appearance')}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'language'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4" />
              <span>{t('settings.language', 'Language Settings')}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/10 text-current">
              {language.toUpperCase()}
            </span>
          </button>
        </aside>

        {/* Tab Content Body */}
        <section className="lg:col-span-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-8 shadow-sm">
          
          {/* TAB 1: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  {t('settings.profile', 'Profile Settings')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Update your reader identity, contact phone, and avatar.
                </p>
              </div>

              {profileMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                    profileMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-500 border border-red-500/30'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{profileMsg.text}</span>
                </div>
              )}

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Choose Reader Avatar
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {AVATAR_OPTIONS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoURL(url)}
                      className={`relative w-12 h-12 rounded-full overflow-hidden transition-all cursor-pointer ring-offset-2 ring-offset-[var(--bg-surface)] ${
                        photoURL === url ? 'ring-2 ring-[var(--accent-gold)] scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                      {photoURL === url && (
                        <div className="absolute inset-0 bg-[var(--accent-gold)]/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  {t('auth.name', 'Full Name')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>

              {/* Verified Email Address (Read-only for security) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    {t('auth.email', 'Email Address')}
                  </label>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Verified Email
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-muted)] cursor-not-allowed"
                  />
                  <Mail className="absolute right-3.5 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Primary email addresses are bound to your verified Firebase security identity.
                </p>
              </div>

              {/* Contact Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Phone Number (Optional for order notifications)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                  <Smartphone className="absolute right-3.5 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </div>

              {/* Reader Bio / Reading Interests */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Reading Interests & Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Interested in Systems Thinking, Artificial Intelligence architecture, and personal leverage."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      setDisplayName(user.name);
                      setPhone(user.phone || '');
                      setBio(user.bio || '');
                      setProfileMsg(null);
                    }
                  }}
                  className="px-4 py-2.5 text-xs font-semibold border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{profileSaving ? t('settings.saving', 'Saving...') : t('settings.save', 'Save Changes')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ACCOUNT SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  {t('settings.security', 'Account Security')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Manage password credentials, multi-device sessions, and account integrity.
                </p>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>{t('settings.changePassword', 'Change Password')}</span>
                </h3>

                {passwordMsg && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-500 border border-red-500/30'
                    }`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 pr-10 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 pr-10 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password rules indicator */}
                  {newPassword.length > 0 && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${passwordRules.minLength ? 'text-emerald-500 font-semibold' : 'text-[var(--text-muted)]'}`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>At least 8 characters in length</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasUpper ? 'text-emerald-500 font-semibold' : 'text-[var(--text-muted)]'}`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasLower ? 'text-emerald-500 font-semibold' : 'text-[var(--text-muted)]'}`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasNumber ? 'text-emerald-500 font-semibold' : 'text-[var(--text-muted)]'}`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>One numeric digit (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasSpecial ? 'text-emerald-500 font-semibold' : 'text-[var(--text-muted)]'}`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>One special symbol (!@#$%^&*)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    {t('auth.confirmPassword', 'Confirm New Password')}
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={async () => {
                      if (user?.email) {
                        await forgotPassword(user.email);
                        setPasswordMsg({ type: 'success', text: `A secure password reset link was sent to ${user.email}` });
                      }
                    }}
                    className="text-xs text-[var(--accent-gold)] hover:underline cursor-pointer"
                  >
                    {t('auth.forgotPassword', 'Send password reset link to email')}
                  </button>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* Device Sessions */}
              <div className="border-t border-[var(--border-subtle)] pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2">
                  Session & Device Security
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                  Sign out from active web browsers or mobile sessions if you used a shared or public computer.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      logout();
                      onNavigate('home');
                    }}
                    className="px-4 py-2.5 text-xs font-semibold bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)] text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>{t('nav.signOut', 'Sign Out of Current Session')}</span>
                  </button>

                  <button
                    onClick={() => {
                      localStorage.clear();
                      logout();
                      onNavigate('home');
                    }}
                    className="px-4 py-2.5 text-xs font-semibold border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{t('settings.signOutAll', 'Sign Out from All Devices')}</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="border-t border-red-500/20 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                  Once your customer account is deleted, your permanent access to purchased eBooks in My Library will be permanently revoked.
                </p>
                {!deleteConfirmOpen ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('settings.deleteAccount', 'Delete Customer Account')}</span>
                  </button>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                    <p className="text-xs text-red-500 font-semibold">
                      Are you absolutely certain? This will delete your profile and library credentials permanently.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(false)}
                        className="px-3.5 py-2 text-xs font-medium bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE SETTINGS */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  {t('settings.appearance', 'Appearance')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Customize the visual contrast and reading ambiance of VINOTH BOOKS across all pages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] ring-2 ring-[var(--accent-gold)] shadow-sm'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <Sun className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">Light Mode</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Warm parchment tones, optimal for bright daytime reading and sharp serif typography.
                  </p>
                  {theme === 'light' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent-gold)] mt-3">
                      <Check className="w-3.5 h-3.5" /> Active Theme
                    </span>
                  )}
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] ring-2 ring-[var(--accent-gold)] shadow-sm'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                    <Moon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">Dark Mode</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Deep obsidian luxury aesthetic with gold accents, gentle on the eyes in low light.
                  </p>
                  {theme === 'dark' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent-gold)] mt-3">
                      <Check className="w-3.5 h-3.5" /> Active Theme
                    </span>
                  )}
                </button>

                {/* System Default */}
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                    theme === 'system'
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] ring-2 ring-[var(--accent-gold)] shadow-sm'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">System Default</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Automatically synchronize with your operating system’s current dark/light preference.
                  </p>
                  {theme === 'system' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent-gold)] mt-3">
                      <Check className="w-3.5 h-3.5" /> Active ({resolvedTheme})
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                Note: Theme preferences are automatically synchronized across devices when you are logged into your account.
              </div>
            </div>
          )}

          {/* TAB 4: LANGUAGE SETTINGS */}
          {activeTab === 'language' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                      {t('settings.language', 'Language Settings')}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Choose your preferred interface language. All menus, buttons, catalog tags, and account sections adapt immediately.
                    </p>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] rounded-full border border-[var(--accent-gold)]/30">
                    30 Supported Languages
                  </span>
                </div>
              </div>

              {/* RTL Notice if active language is RTL */}
              {isRTL && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs flex items-center gap-2.5">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{t('settings.rtlNotice', 'This language uses Right-to-Left (RTL) reading layout.')}</span>
                </div>
              )}

              {/* Search Languages */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('settings.searchLanguage', 'Search 30 supported languages...')}
                  value={searchLangQuery}
                  onChange={(e) => setSearchLangQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--text-muted)]" />
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredLanguages.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[var(--accent-gold)] text-[#0B1325] border-[var(--accent-gold)] shadow-sm font-bold scale-[1.01]'
                          : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-xs leading-tight">{lang.nativeName}</p>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-[#0B1325]/80' : 'text-[var(--text-muted)]'}`}>
                          {lang.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {lang.dir === 'rtl' && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-black/15 text-current' : 'bg-[var(--bg-surface-muted)] text-[var(--text-muted)]'}`}>
                            RTL
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#0B1325] text-[var(--accent-gold)] flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>Selected: <strong className="text-[var(--text-primary)]">{supportedLanguages.find(l => l.code === language)?.name} ({supportedLanguages.find(l => l.code === language)?.nativeName})</strong></span>
                <span>Direction: <strong className="uppercase text-[var(--text-primary)]">{dir}</strong></span>
              </div>
            </div>
          )}

        </section>
      </div>

    </div>
  );
};
