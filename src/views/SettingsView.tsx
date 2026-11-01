import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon, Shield, Moon, Sun, Monitor, Globe, Check, Eye, EyeOff,
  AlertTriangle, Save, RotateCcw, KeyRound, Smartphone, Mail, Sparkles, LogOut, Trash2,
  Camera, Upload, X, Bell, RefreshCw
} from 'lucide-react';
import { useAuth, evaluatePasswordRules, isPasswordStrong } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../services/apiClient';
import { uploadProfilePicture, validateImageFile } from '../services/avatarService';
import { resolveAvatarUrl } from '../utils/imageUrl';

interface SettingsViewProps {
  onNavigate: (view: string) => void;
  initialTab?: 'profile' | 'account' | 'preferences' | 'security' | 'language';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate, initialTab = 'profile' }) => {
  const {
    user,
    token,
    logout,
    forgotPassword,
    resendVerificationEmail,
    updateUserProfile,
    removeProfilePicture
  } = useAuth();

  const { theme, resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, t, supportedLanguages, dir, isRTL } = useI18n();

  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences' | 'security' | 'language'>(
    initialTab === 'account' ? 'account' : initialTab === 'preferences' ? 'preferences' : initialTab === 'security' ? 'security' : initialTab === 'language' ? 'language' : 'profile'
  );

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Picture Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification Preferences State
  const [emailUpdates, setEmailUpdates] = useState(user?.notifications?.emailUpdates ?? true);
  const [orderAlerts, setOrderAlerts] = useState(user?.notifications?.orderAlerts ?? true);
  const [newsletter, setNewsletter] = useState(user?.notifications?.newsletter ?? true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email verification status
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMsg, setVerificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account Deletion State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search Language State
  const [searchLangQuery, setSearchLangQuery] = useState('');

  // Sync state when user record changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      if (user.notifications) {
        setEmailUpdates(user.notifications.emailUpdates ?? true);
        setOrderAlerts(user.notifications.orderAlerts ?? true);
        setNewsletter(user.notifications.newsletter ?? true);
      }
    }
  }, [user]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Native File Picker Change Handler (works on desktop files, mobile gallery, and file manager)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setAvatarMsg({ type: 'error', text: validation.error || 'Invalid image file.' });
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const localUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(localUrl);
  };

  // Cancel file selection
  const handleCancelSelection = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    setAvatarMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save / Upload Profile Picture
  const handleSaveProfilePicture = async () => {
    if (!selectedFile || !user) return;

    setUploadLoading(true);
    setUploadProgress(0);
    setAvatarMsg(null);

    try {
      // 1. Upload to Firebase Storage with progress tracking
      const downloadUrl = await uploadProfilePicture(user.id, selectedFile, (pct) => {
        setUploadProgress(pct);
      });

      // 2. Persist in user record (updates state, localStorage, Firebase Auth, and Firestore)
      const res = await updateUserProfile({
        photoURL: downloadUrl,
        avatar: downloadUrl
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update user profile with image URL.');
      }

      setAvatarMsg({
        type: 'success',
        text: 'Profile picture uploaded and saved successfully! Updated across your reader space.'
      });

      // Clear pending selection
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setAvatarMsg({
        type: 'error',
        text: err.message || 'Failed to upload profile picture. Please verify connection and retry.'
      });
      setUploadProgress(null);
    } finally {
      setUploadLoading(false);
    }
  };

  // Remove Profile Picture
  const handleRemoveProfilePicture = async () => {
    if (!user) return;
    setUploadLoading(true);
    setAvatarMsg(null);
    try {
      await removeProfilePicture();
      handleCancelSelection();
      setAvatarMsg({ type: 'success', text: 'Profile picture removed. Restored default monogram avatar.' });
    } catch (err: any) {
      setAvatarMsg({ type: 'error', text: err.message || 'Failed to remove profile picture.' });
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle Profile Details Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setProfileSaving(true);
    setProfileMsg(null);

    try {
      const res = await updateUserProfile({
        name: displayName.trim(),
        phone: phone.trim(),
        bio: bio.trim()
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to save profile changes.');
      }

      setProfileMsg({ type: 'success', text: t('settings.saved', 'Profile information updated successfully!') });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Save Notification Preferences
  const handleSavePreferences = async () => {
    if (!user) return;
    setPrefsSaving(true);
    setPrefsMsg(null);

    try {
      const notifications = {
        emailUpdates,
        orderAlerts,
        newsletter
      };

      const res = await updateUserProfile({
        notifications,
        theme
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to save preferences.');
      }

      setPrefsMsg({ type: 'success', text: 'Reader preferences saved and persisted.' });
    } catch (err: any) {
      setPrefsMsg({ type: 'error', text: err.message || 'Error saving preferences' });
    } finally {
      setPrefsSaving(false);
    }
  };

  // Handle Resend Verification Email
  const handleResendVerification = async () => {
    setVerificationLoading(true);
    setVerificationMsg(null);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setVerificationMsg({ type: 'success', text: res.message || 'Verification email sent. Please check your inbox.' });
      } else {
        setVerificationMsg({ type: 'error', text: res.error || 'Could not send verification email.' });
      }
    } catch (err: any) {
      setVerificationMsg({ type: 'error', text: err.message || 'Failed to send verification email' });
    } finally {
      setVerificationLoading(false);
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
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });

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
      await apiClient.delete('/api/auth/delete-account');
      await logout();
      onNavigate('home');
    } catch (err: any) {
      alert(err.message || 'Error deleting account');
      setDeleteLoading(false);
    }
  };

  const filteredLanguages = supportedLanguages.filter(l =>
    l.name.toLowerCase().includes(searchLangQuery.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(searchLangQuery.toLowerCase()) ||
    l.code.toLowerCase().includes(searchLangQuery.toLowerCase())
  );

  const passwordRules = evaluatePasswordRules(newPassword);
  const activeAvatar = previewUrl || resolveAvatarUrl(user?.photoURL, user?.avatar, user?.name);
  const hasCustomAvatar = Boolean(user?.photoURL || user?.avatar);

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
            {t('settings.subtitle', 'Manage your personal profile, credentials, appearance, and reading language.')}
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 bg-[var(--bg-surface-elevated)] px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] self-start sm:self-auto shadow-xs">
            <img
              src={resolveAvatarUrl(user.photoURL, user.avatar, user.name)}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--accent-gold)] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[160px]">{user.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[160px]">{user.email}</p>
              <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                {user.role === 'admin' ? 'Publisher Admin' : 'Verified Reader'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Navigation Tabs (Mobile pills / Desktop sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        
        {/* Navigation Tabs */}
        <aside className="lg:col-span-1 space-y-1.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1 lg:gap-1.5 no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`whitespace-nowrap shrink-0 lg:w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <UserIcon className="w-4 h-4" />
              <span>{t('settings.profile', 'Profile Settings')}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`whitespace-nowrap shrink-0 lg:w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <KeyRound className="w-4 h-4" />
              <span>Account Credentials</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`whitespace-nowrap shrink-0 lg:w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Bell className="w-4 h-4" />
              <span>Preferences</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`whitespace-nowrap shrink-0 lg:w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Shield className="w-4 h-4" />
              <span>{t('settings.security', 'Privacy & Security')}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`whitespace-nowrap shrink-0 lg:w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'language'
                ? 'bg-[var(--accent-gold)] text-[#0B1325] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Globe className="w-4 h-4" />
              <span>{t('settings.language', 'Language')}</span>
            </div>
            <span className="hidden lg:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/10 text-current">
              {language.toUpperCase()}
            </span>
          </button>
        </aside>

        {/* Tab Content Body */}
        <section className="lg:col-span-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-8 shadow-sm">
          
          {/* TAB 1: PROFILE SETTINGS & AVATAR UPLOAD */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  {t('settings.profile', 'Profile Settings')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Upload your customized profile picture and manage your reader contact information.
                </p>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* PROFILE PICTURE MANAGEMENT SECTION (Feature Requirement #4) */}
              {/* ------------------------------------------------------------- */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>Profile Picture</span>
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Select a portrait photo from your computer, mobile gallery, or device files (JPG, PNG, WEBP max 5MB).
                    </p>
                  </div>

                  {uploadProgress !== null && (
                    <span className="text-xs font-mono font-bold text-[var(--accent-gold)] bg-[var(--accent-gold-muted)] px-2.5 py-1 rounded-full">
                      Uploading: {uploadProgress}%
                    </span>
                  )}
                </div>

                {avatarMsg && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                      avatarMsg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-500 border border-red-500/30'
                    }`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{avatarMsg.text}</span>
                  </div>
                )}

                {/* Avatar Display + Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  {/* Current / Preview Avatar Image */}
                  <div className="relative group shrink-0">
                    <img
                      src={activeAvatar}
                      alt={user?.name || 'Reader Avatar'}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-[var(--accent-gold)] shadow-md bg-[var(--bg-surface-card)] transition-all"
                    />
                    {previewUrl && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-xs">
                        Preview
                      </span>
                    )}
                  </div>

                  {/* Actions & File Trigger */}
                  <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                    {/* Hidden native file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Upload profile picture"
                    />

                    {/* Button Controls */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      {/* Prominent Change Profile Picture button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadLoading}
                        className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{selectedFile ? 'Select Different Photo' : 'Change Profile Picture'}</span>
                      </button>

                      {/* If user has a custom picture and hasn't staged a new one */}
                      {hasCustomAvatar && !selectedFile && (
                        <button
                          type="button"
                          onClick={handleRemoveProfilePicture}
                          disabled={uploadLoading}
                          className="px-3.5 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Picture</span>
                        </button>
                      )}
                    </div>

                    {/* Pending Preview Staging Bar */}
                    {selectedFile && (
                      <div className="p-3.5 rounded-xl bg-[var(--bg-surface-card)] border border-[var(--border-strong)] space-y-2.5 text-left animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                          <span className="text-[11px] text-emerald-500 font-bold">Ready to Save</span>
                        </div>

                        {/* Upload progress indicator */}
                        {uploadProgress !== null && (
                          <div className="w-full bg-[var(--bg-surface-muted)] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[var(--accent-gold)] h-full transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleSaveProfilePicture}
                            disabled={uploadLoading}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{uploadLoading ? 'Uploading...' : 'Save Profile Picture'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelSelection}
                            disabled={uploadLoading}
                            className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-[var(--text-muted)]">
                      Your avatar is displayed in the navigation bar, book reviews, reader dashboard, and personal reading space.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-6">
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

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                      {t('auth.email', 'Email Address')}
                    </label>
                    {user?.emailVerified ? (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Verified Email
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Pending Verification
                      </span>
                    )}
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
                    Primary email addresses are bound to your verified authentication identity.
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
                    placeholder="e.g. Focus on artificial intelligence architectures, systems thinking, and independent business."
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
            </div>
          )}

          {/* TAB 2: ACCOUNT & CREDENTIALS */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  Account Credentials & Sessions
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Manage password updates, verified email security, and multi-device sessions.
                </p>
              </div>

              {/* Email Verification Box */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Email Verification Status
                    </span>
                  </div>
                  {user?.emailVerified ? (
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Email Verified & Authenticated
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full">
                      Unverified
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-secondary)]">
                  Registered account email: <strong className="text-[var(--text-primary)]">{user?.email}</strong>
                </p>

                {verificationMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      verificationMsg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    <span>{verificationMsg.text}</span>
                  </div>
                )}

                {!user?.emailVerified && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={verificationLoading}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verificationLoading ? 'animate-spin' : ''}`} />
                    <span>{verificationLoading ? 'Sending...' : 'Resend Verification Email'}</span>
                  </button>
                )}
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
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

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
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

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

              {/* Session Information */}
              <div className="border-t border-[var(--border-subtle)] pt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Account Session Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Account ID</span>
                    <span className="font-mono text-xs truncate block text-[var(--text-primary)]">{user?.id}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Account Role</span>
                    <span className="font-semibold text-xs text-[var(--accent-gold)] uppercase block">
                      {user?.role === 'admin' ? 'Administrator' : 'Reader'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Books in Library</span>
                    <span className="font-semibold text-xs text-[var(--text-primary)] block">
                      {user?.library?.length || 0} Owned eBooks
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
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
                    type="button"
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
            </div>
          )}

          {/* TAB 3: PREFERENCES & NOTIFICATIONS */}
          {activeTab === 'preferences' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  Reader Preferences & Appearance
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Configure visual theme contrast and notification dispatches.
                </p>
              </div>

              {prefsMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                    prefsMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-500 border border-red-500/30'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{prefsMsg.text}</span>
                </div>
              )}

              {/* Theme Selection */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Appearance & Contrast</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <h4 className="font-semibold text-sm text-[var(--text-primary)]">Light Mode</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Warm parchment tones, optimal for bright daytime reading.
                    </p>
                  </button>

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
                    <h4 className="font-semibold text-sm text-[var(--text-primary)]">Dark Mode</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Deep obsidian luxury with gold accents, gentle on the eyes.
                    </p>
                  </button>

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
                    <h4 className="font-semibold text-sm text-[var(--text-primary)]">System Default</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Synchronize with operating system dark/light mode preference.
                    </p>
                  </button>
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="border-t border-[var(--border-subtle)] pt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span>Notification Preferences</span>
                </h3>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)]">
                    <input
                      type="checkbox"
                      checked={emailUpdates}
                      onChange={(e) => setEmailUpdates(e.target.checked)}
                      className="mt-0.5 rounded text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">New eBook Releases</span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        Receive announcements when new volumes are published in your favorite categories.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)]">
                    <input
                      type="checkbox"
                      checked={orderAlerts}
                      onChange={(e) => setOrderAlerts(e.target.checked)}
                      className="mt-0.5 rounded text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">Order & Download Confirmations</span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        Get instant transaction receipts and download access links for purchased eBooks.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-strong)]">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                      className="mt-0.5 rounded text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">VINOTH BOOKS Private Dispatch</span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        Curated editorial essays, author notes, and systems thinking masterclasses.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    disabled={prefsSaving}
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{prefsSaving ? 'Saving...' : 'Save Preferences'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY & SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="border-b border-[var(--border-subtle)] pb-4">
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  {t('settings.security', 'Privacy & Security')}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Cryptographic verification, storage sovereignty, and data protection.
                </p>
              </div>

              {/* Security Pillars Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Attribute-Based Access Control</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Firestore security rules enforce strict user boundary isolation. No reader can view or modify other accounts.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center gap-2 text-[var(--accent-gold)]">
                    <KeyRound className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">HMAC Signature Tokens</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Digital eBook download tokens are digitally signed with cryptographic SHA-256 verification.
                  </p>
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

          {/* TAB 5: LANGUAGE SETTINGS */}
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
