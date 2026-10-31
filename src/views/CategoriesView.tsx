import React from 'react';
import { Compass, BookOpen, ArrowRight } from 'lucide-react';
import { Category } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  onSelectCategory: (categoryName: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ categories, onSelectCategory }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-2xl space-y-3">
        <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-bold block">
          Knowledge Disciplines
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)]">
          Curated Book Categories
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Explore independent publications categorized across disciplines, from artificial intelligence and financial sovereignty to deep productivity and human psychology.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat.name)}
            className="group p-7 bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-2xl hover:-translate-y-1 transition-all duration-300 shadow-[var(--card-shadow)] hover:shadow-2xl cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--accent-gold)] font-bold">
                  {idx < 9 ? `0${idx + 1}` : idx + 1}.
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {cat.bookCount || 0} {cat.bookCount === 1 ? 'eBook' : 'eBooks'}
                </span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors leading-snug">
                {cat.name}
              </h3>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {cat.description || 'Comprehensive digital manuscripts and practical guides published under VINOTH BOOKS.'}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
