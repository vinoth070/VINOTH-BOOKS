export interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  coverImage: string;
  pdfUrl?: string;
  epubUrl?: string;
  sampleContent: { chapterTitle: string; content: string }[];
  originalPrice: number;
  sellingPrice: number;
  language: string;
  pages: number;
  isbn?: string;
  publicationDate: string;
  tags: string[];
  featured: boolean;
  bestSeller: boolean;
  isFree: boolean;
  status: 'published' | 'draft';
  keyLearnings: string[];
  tableOfContents: string[];
  salesCount: number;
  rating: number;
  reviewCount: number;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  bookCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  library: string[];
  wishlist?: string[];
  photoURL?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  language?: string;
  theme?: 'dark' | 'light' | 'system';
  emailVerified?: boolean;
  notifications?: {
    emailUpdates?: boolean;
    orderAlerts?: boolean;
    newsletter?: boolean;
  };
  reading_progress?: Record<string, {
    bookId?: string;
    chapterIndex: number;
    totalChapters?: number;
    percent: number;
    chapterTitle?: string;
    updatedAt: string;
  }>;
  reading_goal?: {
    target: number;
    month: string;
    completedCount?: number;
    updatedAt: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpiPaymentConfig {
  enabled: boolean;
  upiId: string;
  payeeName: string;
  qrImageUrl?: string;
  instructions?: string;
  updatedAt?: string;
}

export interface CartItem {
  book: Book;
}

export interface OrderItem {
  bookId: string;
  title: string;
  price: number;
  coverImage: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'cancelled' | 'captured' | 'settlement_initiated' | 'settlement_completed' | 'pending_verification' | 'rejected';
  paymentMethod?: string;
  upiTransactionRef?: string;
  upiReceiptUrl?: string;
  verificationNote?: string;
  rejectionReason?: string;
  settlementStatus?: 'pending' | 'processing' | 'settled';
  settlementId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionReference: string;
  paymentMode?: 'test' | 'live';
  isDemoData?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'hidden';
  createdAt: string;
}

export interface FeedbackReply {
  id: string;
  senderRole: 'admin';
  senderName: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerFeedback {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  category: 'general' | 'order' | 'technical' | 'suggestion';
  status: 'open' | 'replied' | 'resolved' | 'archived';
  replies: FeedbackReply[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  expiresAt: string;
  isActive: boolean;
  usageCount: number;
}

export interface PaymentSettingsPublic {
  mode: 'test' | 'live';
  activeKeyId: string;
  testKeyId?: string;
  liveKeyId?: string;
  isTestConfigured: boolean;
  isLiveConfigured: boolean;
  currency: string;
  isLiveConfirmed: boolean;
  hasTestSecret: boolean;
  hasLiveSecret: boolean;
  hasWebhookSecret?: boolean;
  updatedAt?: string;
}

export interface WebsiteSettings {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportHours: string;
  announcementBanner: {
    enabled: boolean;
    text: string;
    linkText?: string;
  };
  currencySymbol: string;
  maintenanceMode: boolean;
}

export interface LegalPages {
  privacyPolicy: string;
  termsConditions: string;
  refundPolicy: string;
  deliveryPolicy: string;
  contactSupport: {
    email: string;
    responseHours: string;
    supportNote: string;
  };
}

export interface AnalyticsSummary {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    paidOrdersCount: number;
    totalSales: number;
    totalCustomers: number;
    totalBooks: number;
    publishedBooks: number;
    draftBooks: number;
    totalCategories: number;
    averageRating: number;
  };
  categoryRevenue: Record<string, number>;
  bestSellers: {
    id: string;
    title: string;
    category: string;
    price: number;
    salesCount: number;
    revenue: number;
    coverImage: string;
  }[];
  monthlySales: { month: string; sales: number; revenue: number }[];
  dailyOrders: { date: string; orders: number; revenue: number }[];
  recentOrders: Order[];
  recentReviews: Review[];
  customerActivity: { id: string; name: string; email: string; action: string; time: string }[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  adminEmail: string;
  ip?: string;
  timestamp: string;
}
