import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, RefreshCw, Truck, Mail, Clock } from 'lucide-react';
import { LegalPages } from '../types';
import { apiClient } from '../services/apiClient';

interface LegalViewProps {
  initialTab?: 'privacy' | 'terms' | 'refund' | 'delivery' | 'contact';
}

const DEFAULT_LEGAL: LegalPages = {
  privacyPolicy: "At VINOTH BOOKS, your personal privacy and intellectual data autonomy are fundamental principles. We never sell, rent, or monetize your personal reading history, purchases, or account information. Payment transactions are processed directly via PCI-DSS compliant payment gateways with bank-grade encryption.",
  termsConditions: "By accessing VINOTH BOOKS or acquiring digital content through our marketplace, you receive a personal, perpetual, non-exclusive license to download, read, and maintain copies of purchased eBooks for your own personal library. Redistribution or unauthorized resale without express written permission from Vinoth is prohibited.",
  refundPolicy: "Due to the non-tangible, irrevocable nature of digital downloads, sales of eBooks on VINOTH BOOKS are generally final. However, if you experience technical issues accessing your purchased file or made an accidental duplicate purchase, our support desk will issue an immediate refund upon verification within 7 business days.",
  deliveryPolicy: "All eBooks and digital publications on VINOTH BOOKS are delivered instantly upon successful completion of payment. You will receive immediate access in 'My Library' with online reader capabilities and direct file download options.",
  contactSupport: {
    email: "kalivinoselvikk@gmail.com",
    responseHours: "Monday to Saturday, 9:00 AM – 7:00 PM IST",
    supportNote: "Vinoth directly reviews reader inquiries and feedback."
  }
};

export const LegalView: React.FC<LegalViewProps> = ({ initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'refund' | 'delivery' | 'contact'>(initialTab);
  const [legal, setLegal] = useState<LegalPages>(DEFAULT_LEGAL);

  useEffect(() => {
    apiClient.get<{ legal: LegalPages }>('/api/legal')
      .then(data => {
        if (data?.legal) setLegal(data.legal);
      })
      .catch(() => {
        // Keep DEFAULT_LEGAL
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
      {/* Page Title */}
      <div className="space-y-2 pb-4 border-b border-[#E5DFD3]">
        <span className="text-xs uppercase tracking-widest text-[#C89B3C] font-semibold block">
          Publishing Governance & Reader Protections
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1325]">
          Legal & Business Policies
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Transparent policies governing digital ownership, licensing, privacy, and customer satisfaction at VINOTH BOOKS.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E5DFD3] pb-3 text-xs">
        {[
          { id: 'terms', label: 'Terms & Conditions', icon: FileText },
          { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
          { id: 'delivery', label: 'Digital Delivery Policy', icon: Truck },
          { id: 'refund', label: 'Refund Policy', icon: RefreshCw },
          { id: 'contact', label: 'Contact & Support', icon: Mail }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0B1325] text-white font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-[#D5CDC0]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="bg-white border border-[#E5DFD3] rounded-xl p-6 sm:p-10 shadow-2xs">
        {activeTab === 'terms' && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B1325]">Terms & Conditions</h2>
            <div className="prose text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {legal?.termsConditions}
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B1325]">Privacy Policy</h2>
            <div className="prose text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {legal?.privacyPolicy}
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B1325]">Digital Product Delivery Policy</h2>
            <div className="prose text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {legal?.deliveryPolicy}
            </div>
          </div>
        )}

        {activeTab === 'refund' && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B1325]">Editorial Satisfaction & Refund Policy</h2>
            <div className="prose text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {legal?.refundPolicy}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold text-[#0B1325]">Direct Publisher Support</h2>
              <p className="text-xs text-slate-600">
                Have a question about a digital publication, bulk educational order, or reader account?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F5F0E8] border border-[#E5DFD3] rounded-lg space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Mail className="w-4 h-4 text-[#C89B3C]" />
                  <span>Direct Publisher Email</span>
                </div>
                <p className="text-xs text-slate-700 font-mono">
                  {legal?.contactSupport.email || 'contact@vinothbooks.com'}
                </p>
              </div>

              <div className="p-4 bg-[#F5F0E8] border border-[#E5DFD3] rounded-lg space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <Clock className="w-4 h-4 text-[#C89B3C]" />
                  <span>Support Hours</span>
                </div>
                <p className="text-xs text-slate-700">
                  {legal?.contactSupport.responseHours || 'Mon – Sat: 9:00 AM – 6:00 PM IST'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {legal?.contactSupport.supportNote || 'We typically respond to reader and customer inquiries within 12 to 24 hours.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
