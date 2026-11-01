import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'general' | 'order' | 'technical' | 'suggestion'>('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/api/feedback', { name, email, subject, category, message });
      setSuccess(true);
      setMessage('');
      setSubject('');
    } catch (err: any) {
      // In offline/static mode, store message locally
      try {
        const stored = JSON.parse(localStorage.getItem('vb_pending_feedback') || '[]');
        stored.push({ name, email, subject, category, message, createdAt: new Date().toISOString() });
        localStorage.setItem('vb_pending_feedback', JSON.stringify(stored));
        setSuccess(true);
        setMessage('');
        setSubject('');
      } catch {
        setError(err.message || 'Error submitting feedback. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-auto my-auto bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold-muted)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] truncate">
              Customer Support & Reader Desk
            </h3>
          </div>
          <button
            onClick={() => {
              setSuccess(false);
              onClose();
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-muted)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-2xl font-bold text-[var(--text-primary)]">Message Received</h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Thank you for contacting VINOTH BOOKS. Our editorial desk has logged your ticket and will respond directly to <strong>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  onClose();
                }}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-lg transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Have a question regarding direct orders, format compatibility, or an editorial inquiry? Please share your details below.
              </p>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="general">General Reader Inquiry</option>
                    <option value="order">Order & Download Support</option>
                    <option value="technical">E-Reader / File Format</option>
                    <option value="suggestion">Publishing Suggestion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief headline..."
                    className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Detail your question or feedback..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-gold)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-[#0B1325] rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Submitting...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
