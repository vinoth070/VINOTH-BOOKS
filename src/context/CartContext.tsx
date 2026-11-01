import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book, CartItem } from '../types';
import { apiClient } from '../services/apiClient';

interface CartContextType {
  items: CartItem[];
  addToCart: (book: Book) => void;
  removeFromCart: (bookId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  appliedCoupon: { code: string; discount: number; message?: string } | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  total: number;
  buyNow: (book: Book) => void;
  isItemInCart: (bookId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vb_cart_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; message?: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('vb_cart_v2', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to sync cart to storage:', e);
    }
  }, [items]);

  const addToCart = (book: Book) => {
    setItems(prev => {
      if (prev.some(i => i.book.id === book.id)) {
        return prev;
      }
      return [...prev, { book }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (bookId: string) => {
    setItems(prev => prev.filter(i => i.book.id !== bookId));
    if (items.length <= 1) {
      setAppliedCoupon(null);
    }
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const isItemInCart = (bookId: string) => items.some(i => i.book.id === bookId);

  const buyNow = (book: Book) => {
    if (!isItemInCart(book.id)) {
      setItems(prev => [...prev, { book }]);
    }
    setIsCheckoutOpen(true);
  };

  const subtotal = items.reduce((acc, item) => acc + item.book.sellingPrice, 0);

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { success: false, message: 'Please enter a coupon code' };
    }

    try {
      const data = await apiClient.post<{ valid: boolean; code: string; discount: number; message?: string; error?: string }>('/api/coupons/apply', {
        code: trimmed,
        subtotal
      });

      if (!data?.valid) {
        return {
          success: false,
          message: data?.error || 'Invalid or expired coupon code'
        };
      }

      setAppliedCoupon({
        code: data.code,
        discount: data.discount,
        message: data.message
      });

      return {
        success: true,
        message: data.message || `Coupon ${data.code} applied! Saved ₹${data.discount}`
      };
    } catch {
      // Local fallback in case backend is unreachable
      if (trimmed === 'VINOTH20') {
        const disc = Math.round((subtotal * 20) / 100);
        setAppliedCoupon({
          code: 'VINOTH20',
          discount: disc,
          message: 'Coupon VINOTH20 applied (20% OFF)'
        });
        return { success: true, message: 'Coupon VINOTH20 applied! Saved 20%' };
      }
      return { success: false, message: 'Unable to validate coupon code. Please try again.' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        subtotal,
        discount,
        total,
        buyNow,
        isItemInCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
