import React, { useState } from 'react';
import { ShieldCheck, Mail, MessageSquare } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenFeedback: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenFeedback }) => {
  return (
    <footer className="bg-[var(--bg-surface)] text-[var(--text-primary)] border-t border-[var(--border-subtle)] transition-colors duration-200">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div>
              <h4 className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                VINOTH BOOKS
              </h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Independent digital publishing house and direct-to-customer eBook store founded by Vinoth. Delivering high-density non-fiction, systems thinking, and actionable knowledge directly to readers worldwide.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Mail className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>contact@vinothbooks.com</span>
            </div>
          </div>

          {/* Publishing Catalog */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              eBook Catalog
            </h5>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li>
                <button onClick={() => onNavigate('explore')} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  All Published eBooks
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('categories')} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Browse by Category
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore', { filter: 'bestseller' })} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Bestselling Titles
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore', { filter: 'free' })} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Complimentary Guides
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('library')} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Reader Library Access
                </button>
              </li>
            </ul>
          </div>

          {/* Reader Support & Policies */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              Customer Support & Policies
            </h5>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li>
                <button onClick={onOpenFeedback} className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5 font-medium cursor-pointer">
                  <MessageSquare className="w-3 h-3 text-[var(--accent-gold)]" />
                  <span>Customer Support Desk</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { tab: 'delivery' })} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Digital Delivery Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { tab: 'refund' })} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  7-Day Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { tab: 'terms' })} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { tab: 'privacy' })} className="hover:text-[var(--accent-gold)] transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Payment & Security Promise */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)]">
              Direct Publishing Guarantee
            </h5>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              When you purchase directly from VINOTH BOOKS, your digital eBook is delivered instantaneously with DRM-free reading freedom across your personal devices.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Razorpay Verified · Instant Digital Delivery</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-14 pt-8 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-4">
          <p>© {new Date().getFullYear()} VINOTH BOOKS. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('legal', { tab: 'terms' })} className="hover:text-[var(--accent-gold)] cursor-pointer">Terms</button>
            <span>·</span>
            <button onClick={() => onNavigate('legal', { tab: 'privacy' })} className="hover:text-[var(--accent-gold)] cursor-pointer">Privacy</button>
            <span>·</span>
            <button onClick={onOpenFeedback} className="hover:text-[var(--accent-gold)] cursor-pointer">Support</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
