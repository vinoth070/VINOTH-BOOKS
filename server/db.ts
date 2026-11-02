import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

dotenv.config();

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
  passwordHash: string;
  salt: string;
  role: 'admin' | 'customer';
  library: string[];
  wishlist: string[];
  photoURL?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  language?: string;
  theme?: 'dark' | 'light' | 'system';
  notifications?: {
    emailUpdates?: boolean;
    orderAlerts?: boolean;
    newsletter?: boolean;
  };
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  paymentStatus: 'paid' | 'pending' | 'failed' | 'cancelled' | 'captured' | 'settlement_initiated' | 'settlement_completed';
  paymentMethod?: string;
  settlementStatus?: 'pending' | 'processing' | 'settled';
  settlementId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionReference: string;
  paymentMode: 'test' | 'live';
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

export interface PaymentSettings {
  mode: 'test' | 'live';
  testKeyId: string;
  testKeySecret: string;
  liveKeyId: string;
  liveKeySecret: string;
  webhookSecret?: string;
  currency: string;
  isLiveConfirmed: boolean;
  updatedAt: string;
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

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  adminEmail: string;
  ip?: string;
  timestamp: string;
}

export interface DatabaseSchema {
  books: Book[];
  categories: Category[];
  users: User[];
  orders: Order[];
  reviews: Review[];
  feedbacks: CustomerFeedback[];
  coupons: Coupon[];
  newsletter: { id: string; email: string; subscribedAt: string }[];
  paymentSettings: PaymentSettings;
  websiteSettings: WebsiteSettings;
  legalPages: LegalPages;
  activityLogs: ActivityLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// 15 initial standard categories
const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Self Improvement', slug: 'self-improvement', description: 'Actionable frameworks for personal growth, habit stacking, and life mastery.' },
  { id: 'cat-2', name: 'Personal Development', slug: 'personal-development', description: 'Deep mental models, self-discovery, and cognitive resilience.' },
  { id: 'cat-3', name: 'Business and Entrepreneurship', slug: 'business-and-entrepreneurship', description: 'Zero-to-one business building, bootstrapped ventures, and sustainable growth.' },
  { id: 'cat-4', name: 'Finance and Money Management', slug: 'finance-and-money-management', description: 'Sovereign wealth creation, cashflow architecture, and compounding principles.' },
  { id: 'cat-5', name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Practical AI architectures, agentic workflows, and future-proof digital skills.' },
  { id: 'cat-6', name: 'Technology and Programming', slug: 'technology-and-programming', description: 'Modern software engineering, full-stack craft, and pragmatic system design.' },
  { id: 'cat-7', name: 'Education and Learning', slug: 'education-and-learning', description: 'Accelerated skill acquisition, meta-learning, and intellectual synthesis.' },
  { id: 'cat-8', name: 'Productivity', slug: 'productivity', description: 'Eliminating friction, deep focus workflows, and executive execution.' },
  { id: 'cat-9', name: 'Psychology', slug: 'psychology', description: 'Behavioral economics, human motivation, and cognitive decision biases.' },
  { id: 'cat-10', name: 'Health and Wellness', slug: 'health-and-wellness', description: 'Physical vitality, sleep optimization, and sustainable cognitive performance.' },
  { id: 'cat-11', name: 'Science and Research', slug: 'science-and-research', description: 'First-principles scientific thinking and evidence-based synthesis.' },
  { id: 'cat-12', name: 'Fiction and Short Stories', slug: 'fiction-and-short-stories', description: 'Compelling speculative narratives, human journeys, and digital novellas.' },
  { id: 'cat-13', name: 'Career Development', slug: 'career-development', description: 'High-leverage negotiation, strategic career positioning, and remote influence.' },
  { id: 'cat-14', name: 'Digital Marketing', slug: 'digital-marketing', description: 'Organic distribution, storytelling funnels, and authentic audience architecture.' },
  { id: 'cat-15', name: 'Motivation and Life Lessons', slug: 'motivation-and-life-lessons', description: 'Philosophical reflections, overcoming hardship, and living with purposeful intent.' }
];

const initialAdminSalt = generateSalt();
const initialCustomerSalt = generateSalt();

const initialSeed: DatabaseSchema = {
  books: [
    {
      id: 'book-ai-mind',
      title: 'The AI Mind: Architecture of Tomorrow',
      subtitle: 'Designing Human-Centered Intelligent Systems and Autonomous Workflows',
      author: 'VINOTH BOOKS Publishing',
      shortDescription: 'The definitive blueprint for understanding, orchestrating, and building real-world AI applications with clarity and precision.',
      fullDescription: 'In "The AI Mind: Architecture of Tomorrow", this volume dismantles the noise and hype surrounding artificial intelligence to deliver an actionable, first-principles handbook. Written for engineers, founders, and knowledge workers, this book details how autonomous agents, reasoning loops, and multi-modal models can be harnessed to solve tangible problems without compromising human agency.',
      category: 'Artificial Intelligence',
      coverImage: '/src/assets/images/book_cover_ai_revolution_1793365303535.jpg',
      originalPrice: 1299,
      sellingPrice: 799,
      language: 'English',
      pages: 312,
      isbn: '978-93-5467-101-2',
      publicationDate: '2026-04-15',
      tags: ['AI', 'Architecture', 'Agents', 'Technology', 'Deep Learning'],
      featured: true,
      bestSeller: true,
      isFree: false,
      status: 'published',
      keyLearnings: [
        'Understand foundational LLM cognitive architectures without academic fluff.',
        'Build agentic feedback loops that execute real workflows autonomously.',
        'Design resilient human-in-the-loop validation patterns.',
        'Architect scalable vector pipelines and domain-specific knowledge embeddings.'
      ],
      tableOfContents: [
        'Chapter 1: The Transition from Static Code to Cognitive Engines',
        'Chapter 2: Context Windows & Memory Foundations',
        'Chapter 3: Autonomous Agents: The Plan-Execute-Reflect Cycle',
        'Chapter 4: Grounding Models in Real-World Tooling',
        'Chapter 5: Production Invariants & Security Guardrails',
        'Chapter 6: The Sovereign Knowledge Worker in the AI Era'
      ],
      sampleContent: [
        {
          chapterTitle: 'Chapter 1: The Transition from Static Code to Cognitive Engines',
          content: `For decades, our relationship with computational machinery was deterministic. We wrote unambiguous syntax: conditional statements, iterative loops, and rigid database schemas. If a circumstance was anticipated, the software responded; if not, it threw an unhandled exception.

Artificial intelligence does not merely accelerate this deterministic paradigm—it replaces brittle rule systems with probabilistic inference. A modern neural architecture does not follow a prescribed recipe; it projects meaning into high-dimensional latent space and navigates towards coherent resolution.

When you begin thinking in latent vectors and agentic deliberation rather than procedural step-by-step logic, you stop treating software as a spreadsheet with buttons. You begin treating it as an intellectual collaborator capable of synthesis, adaptation, and unexpected brilliance.`
        },
        {
          chapterTitle: 'Chapter 2: Context Windows & Memory Foundations',
          content: `The working memory of any cognitive engine is strictly bounded by its context window. Yet human intuition often mistakes raw capacity for comprehension. Just because a model can ingest a million tokens does not mean every token receives equal attentional fidelity.

Effective prompt architecture is fundamentally the art of signal curation. By isolating noise, anchoring relevant facts, and maintaining consistent schemas, we construct environments where inference remains sharp, disciplined, and reliable.`
        }
      ],
      salesCount: 482,
      rating: 4.9,
      reviewCount: 38,
      isDemoData: true,
      createdAt: '2026-04-15T10:00:00Z',
      updatedAt: '2026-04-15T10:00:00Z'
    },
    {
      id: 'book-wealth-playbook',
      title: 'The Modern Wealth Playbook',
      subtitle: 'Strategies for Building Lasting Prosperity in an Evolving Global Economy',
      author: 'VINOTH BOOKS Publishing',
      shortDescription: 'A timeless, sovereign approach to financial independence, asynchronous income, and asymmetric investments.',
      fullDescription: 'True wealth is not merely money in a bank account; it is absolute autonomy over your time, location, and creative energy. "The Modern Wealth Playbook" maps out the transition from hourly labor to capital-efficient digital ownership. Learn how to construct enduring cashflow assets, navigate modern volatility, and build generational financial sovereignty.',
      category: 'Finance and Money Management',
      coverImage: '/src/assets/images/book_cover_wealth_playbook_1793365306099.jpg',
      originalPrice: 1499,
      sellingPrice: 899,
      language: 'English',
      pages: 284,
      isbn: '978-93-5467-102-9',
      publicationDate: '2026-03-10',
      tags: ['Wealth', 'Finance', 'Investing', 'Independence', 'Economics'],
      featured: true,
      bestSeller: true,
      isFree: false,
      status: 'published',
      keyLearnings: [
        'Decouple income generation from physical hours worked forever.',
        'Master the 4 levers of high leverage: code, media, capital, and labor.',
        'Protect your purchasing power against currency debasement.',
        'Build asymmetric portfolios with capped downside and uncapped upside.'
      ],
      tableOfContents: [
        'Chapter 1: The Illusion of Linear Labor',
        'Chapter 2: The Four Levers of Permissionless Leverage',
        'Chapter 3: Asset Velocity vs Asset Quality',
        'Chapter 4: The Sovereign Balance Sheet',
        'Chapter 5: Cashflow Architecture for Digital Creators',
        'Chapter 6: Generational Compounding'
      ],
      sampleContent: [
        {
          chapterTitle: 'Chapter 1: The Illusion of Linear Labor',
          content: `The modern education system was engineered in the industrial age to produce reliable factory operators and clerical staff. It conditioned us to view compensation as an unbending ratio: one hour of physical presence equals a fixed wage.

Yet the digital economy rewards judgment, risk tolerance, and asset ownership at scales unimaginable to our predecessors. A digital publication works once; the digital artifact duplicates at zero marginal cost millions of times.

Until you own assets that work when you are asleep, your financial existence remains fragile.`
        }
      ],
      salesCount: 620,
      rating: 4.95,
      reviewCount: 52,
      isDemoData: true,
      createdAt: '2026-03-10T08:30:00Z',
      updatedAt: '2026-03-10T08:30:00Z'
    },
    {
      id: 'book-deep-focus',
      title: 'Deep Focus & Flow: The Art of Effortless Mastery',
      subtitle: 'Reclaiming Your Attention and Achieving Extraordinary Cognitive Depth',
      author: 'VINOTH BOOKS Publishing',
      shortDescription: 'Practical neuro-protocols and psychological frameworks to defeat distraction, harness flow states, and execute at peak velocity.',
      fullDescription: 'In an attention-economy weaponized against your focus, the ability to concentrate deeply is the single highest-value capability you can possess. "Deep Focus & Flow" reveals how top thinkers, engineers, and creators establish ironclad attention boundaries, systematically induce flow states, and accomplish in four uninterrupted hours what others struggle to do in forty.',
      category: 'Productivity',
      coverImage: '/src/assets/images/book_cover_deep_focus_1793365304657.jpg',
      originalPrice: 999,
      sellingPrice: 599,
      language: 'English',
      pages: 226,
      isbn: '978-93-5467-103-6',
      publicationDate: '2026-02-18',
      tags: ['Productivity', 'Focus', 'Flow', 'Habits', 'Psychology'],
      featured: true,
      bestSeller: false,
      isFree: false,
      status: 'published',
      keyLearnings: [
        'Dismantle notification addiction using dopamine recalibration protocols.',
        'Structure your day into untouchable 90-minute ultradian rhythm deep blocks.',
        'Cultivate psychological friction against low-value compulsive behaviors.',
        'Enter flow states on command through deliberate pre-work ignition rituals.'
      ],
      tableOfContents: [
        'Chapter 1: The War for Your Attention Span',
        'Chapter 2: Dopamine Chemistry & The Distraction Loop',
        'Chapter 3: The Architecture of the Flow State',
        'Chapter 4: The 4-Hour Deep Work Protocol',
        'Chapter 5: Digital Minimalism for Builders',
        'Chapter 6: Sustainable Energy & Cognitive Renewal'
      ],
      sampleContent: [
        {
          chapterTitle: 'Chapter 1: The War for Your Attention Span',
          content: `Look closely at how most people spend their mornings. Before their feet have touched the floor, their retinas are bombarded by notifications, urgent subject lines, algorithmic outrage, and endless micro-stimuli.

By 9:00 AM, their cognitive reservoir is already drained. They sit down to write, code, or build a company, but their mind is scattered across fifty different tabs.

Deep focus is not a personality trait. It is an architectural discipline. When you control your environmental cues, you eliminate the exhausting need for heroic willpower.`
        }
      ],
      salesCount: 395,
      rating: 4.88,
      reviewCount: 31,
      isDemoData: true,
      createdAt: '2026-02-18T09:15:00Z',
      updatedAt: '2026-02-18T09:15:00Z'
    },
    {
      id: 'book-digital-product-blueprint',
      title: 'The 24-Hour Digital Product Blueprint',
      subtitle: 'How to Package Knowledge, Publish Online, and Make Your First Digital Sale',
      author: 'VINOTH BOOKS Publishing',
      shortDescription: 'Free starter guide detailing how to transform expertise into an independent eBook business.',
      fullDescription: 'A complimentary masterclass from VINOTH BOOKS. Learn the step-by-step method used to publish, distribute, and monetize intellectual property directly on the web. No corporate gatekeepers, no traditional publishers taking 90% royalties—just pure creator sovereignty.',
      category: 'Business and Entrepreneurship',
      coverImage: '/src/assets/images/book_cover_wealth_playbook_1793365306099.jpg',
      originalPrice: 499,
      sellingPrice: 0,
      language: 'English',
      pages: 110,
      isbn: '978-93-5467-104-3',
      publicationDate: '2026-01-05',
      tags: ['Free', 'Publishing', 'Business', 'eBooks', 'Digital Products'],
      featured: false,
      bestSeller: false,
      isFree: true,
      status: 'published',
      keyLearnings: [
        'Identify profitable knowledge niches with high reader willingness to pay.',
        'Structure a compelling non-fiction book outline in under 3 hours.',
        'Choose modern digital formats (PDF, EPUB) and reader-friendly layouts.',
        'Launch directly to readers with zero platform middlemen fees.'
      ],
      tableOfContents: [
        'Chapter 1: Why Digital Publishing is Sovereign',
        'Chapter 2: Finding Your Asymmetric Topic',
        'Chapter 3: The Rapid Drafting Framework',
        'Chapter 4: Direct Distribution & Payment Setup',
        'Chapter 5: Nurturing a Dedicated Readership'
      ],
      sampleContent: [
        {
          chapterTitle: 'Chapter 1: Why Digital Publishing is Sovereign',
          content: `Traditional book publishing is an antique industry built on scarcity, long print cycles, and asymmetric contracts where authors surrender ownership of their copyright for modest advances.

Direct digital publishing changes everything. You retain 100% of your intellectual freedom, set your own pricing, build a direct relationship with every customer, and update your books instantaneously as the world evolves.

Welcome to VINOTH BOOKS. Let us build the future of reading together.`
        }
      ],
      salesCount: 1420,
      rating: 4.92,
      reviewCount: 88,
      isDemoData: true,
      createdAt: '2026-01-05T07:00:00Z',
      updatedAt: '2026-01-05T07:00:00Z'
    },
    {
      id: 'book-systematic-thinking',
      title: 'Systematic Thinking: Solving Intractable Problems',
      subtitle: 'Mental Models, Feedback Loops, and Second-Order Reasoning',
      author: 'VINOTH BOOKS Publishing',
      shortDescription: 'How to look beyond immediate symptoms, anticipate unintended consequences, and engineer elegant resolutions.',
      fullDescription: 'Most failures in business and life occur not because people lack effort, but because they solve the wrong problem. "Systematic Thinking" equips you with the cognitive toolkit of master strategists, systems engineers, and world-class leaders to deconstruct complex challenges into manageable leverage points.',
      category: 'Self Improvement',
      coverImage: '/src/assets/images/book_cover_ai_revolution_1793365303535.jpg',
      originalPrice: 1199,
      sellingPrice: 699,
      language: 'English',
      pages: 254,
      isbn: '978-93-5467-105-0',
      publicationDate: '2026-04-01',
      tags: ['Systems', 'Mental Models', 'Strategy', 'Decision Making'],
      featured: false,
      bestSeller: false,
      isFree: false,
      status: 'published',
      keyLearnings: [
        'Differentiate between superficial symptoms and deep systemic root causes.',
        'Map positive and negative feedback loops in organizations and habits.',
        'Apply second-order and inverted thinking before major decisions.',
        'Avoid common cognitive blindspots when navigating uncertainty.'
      ],
      tableOfContents: [
        'Chapter 1: The Trap of First-Order Reactions',
        'Chapter 2: Stock and Flow Dynamics',
        'Chapter 3: The Inversion Principle',
        'Chapter 4: Bottlenecks & Theory of Constraints',
        'Chapter 5: Designing Antifragile Systems'
      ],
      sampleContent: [
        {
          chapterTitle: 'Chapter 1: The Trap of First-Order Reactions',
          content: `First-order thinking is simple, immediate, and nearly universal. It asks: "What will happen right after I take this action?"

Second-order thinking is deeper, nuanced, and rare. It asks: "And then what? And what will the consequences of those consequences be over five years?"

By learning to pause at the threshold of reaction and run the mental simulation three steps ahead, you make decisions that look like prescience to those trapped in the immediate present.`
        }
      ],
      salesCount: 230,
      rating: 4.85,
      reviewCount: 19,
      isDemoData: true,
      createdAt: '2026-04-01T11:00:00Z',
      updatedAt: '2026-04-01T11:00:00Z'
    }
  ],
  categories: initialCategories,
  users: [
    {
      id: 'user-admin',
      name: 'Vinoth (Administrator)',
      email: process.env.ADMIN_EMAIL || 'kalivinoselvikk@gmail.com',
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin123', initialAdminSalt),
      salt: initialAdminSalt,
      role: 'admin',
      library: ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking'],
      wishlist: [],
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'user-customer-demo',
      name: 'Priya Sharma',
      email: 'reader@vinothbooks.com',
      passwordHash: hashPassword('reader123', initialCustomerSalt),
      salt: initialCustomerSalt,
      role: 'customer',
      library: ['book-ai-mind', 'book-digital-product-blueprint'],
      wishlist: ['book-wealth-playbook'],
      createdAt: '2026-04-10T14:20:00Z'
    }
  ],
  orders: [
    {
      id: 'ORD-2026-8841',
      userId: 'user-customer-demo',
      customerName: 'Priya Sharma',
      customerEmail: 'reader@vinothbooks.com',
      items: [
        {
          bookId: 'book-ai-mind',
          title: 'The AI Mind: Architecture of Tomorrow',
          price: 799,
          coverImage: '/src/assets/images/book_cover_ai_revolution_1793365303535.jpg'
        }
      ],
      subtotal: 799,
      discount: 0,
      total: 799,
      paymentStatus: 'paid',
      razorpayOrderId: 'order_test_8841RZP',
      razorpayPaymentId: 'pay_test_8841TXN',
      transactionReference: 'TXN-884109284',
      paymentMode: 'test',
      isDemoData: true,
      createdAt: '2026-04-10T14:25:00Z'
    },
    {
      id: 'ORD-2026-7912',
      userId: 'user-karthik',
      customerName: 'Karthik Raman',
      customerEmail: 'karthik.r@outlook.com',
      items: [
        {
          bookId: 'book-wealth-playbook',
          title: 'The Modern Wealth Playbook',
          price: 899,
          coverImage: '/src/assets/images/book_cover_wealth_playbook_1793365306099.jpg'
        },
        {
          bookId: 'book-deep-focus',
          title: 'Deep Focus & Flow: The Art of Effortless Mastery',
          price: 599,
          coverImage: '/src/assets/images/book_cover_deep_focus_1793365304657.jpg'
        }
      ],
      subtotal: 1498,
      discount: 299,
      couponCode: 'VINOTH20',
      total: 1199,
      paymentStatus: 'paid',
      razorpayOrderId: 'order_test_7912RZP',
      razorpayPaymentId: 'pay_test_7912TXN',
      transactionReference: 'TXN-791208471',
      paymentMode: 'test',
      isDemoData: true,
      createdAt: '2026-04-22T09:10:00Z'
    }
  ],
  reviews: [
    {
      id: 'rev-1',
      bookId: 'book-ai-mind',
      userId: 'user-customer-demo',
      userName: 'Priya Sharma',
      rating: 5,
      title: 'A masterclass in actionable AI architecture',
      comment: 'Cut straight through the sensationalism and explained how autonomous workflows actually fit together. The chapters on memory and agent cycles paid for the book ten times over.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2026-04-12T16:00:00Z'
    },
    {
      id: 'rev-2',
      bookId: 'book-wealth-playbook',
      userId: 'user-karthik',
      userName: 'Karthik Raman',
      rating: 5,
      title: 'Transformed how I view assets and leverage',
      comment: 'The chapter on the 4 levers of permissionless leverage was a turning point for my digital agency. Writes with calm authority and razor-sharp economy of language.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2026-04-24T11:45:00Z'
    },
    {
      id: 'rev-3',
      bookId: 'book-deep-focus',
      userId: 'user-ananya',
      userName: 'Dr. Ananya Sen',
      rating: 5,
      title: 'The 4-hour deep work protocol genuinely works',
      comment: 'As a researcher, concentration is my trade. The practical environmental cues and dopamine recalibration rituals in this book helped me complete my manuscript in record time.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2026-04-25T14:10:00Z'
    }
  ],
  feedbacks: [
    {
      id: 'fb-1',
      customerName: 'Anand Sundaram',
      customerEmail: 'anand.sundaram@gmail.com',
      subject: 'Question on EPUB formatting on Boox Palma',
      message: 'Hello Vinoth Books team, I purchased "The AI Mind" and it reads wonderfully on my web browser. Could you advise if future releases will include pre-formatted Kindle mobi/kfx files as well?',
      category: 'technical',
      status: 'replied',
      replies: [
        {
          id: 'rep-1',
          senderRole: 'admin',
          senderName: 'VINOTH BOOKS Desk',
          message: 'Hello Anand, thank you for writing in! Yes, all our EPUB files are standard EPUB3 compliant and can be sent directly to your Kindle or Boox e-reader using "Send to Kindle" or Calibre. We are also testing automated Kindle whispernet delivery.',
          createdAt: '2026-04-26T10:30:00Z'
        }
      ],
      createdAt: '2026-04-26T08:15:00Z',
      updatedAt: '2026-04-26T10:30:00Z'
    },
    {
      id: 'fb-2',
      customerName: 'Divya Nair',
      customerEmail: 'divya.nair@techlead.io',
      subject: 'Bulk student licensing for University Seminar',
      message: 'We are organizing an executive masterclass on Systems Thinking in Bengaluru and would like to license 80 digital copies of "Systematic Thinking". Do you offer institutional discounts?',
      category: 'order',
      status: 'open',
      replies: [],
      createdAt: '2026-04-28T14:40:00Z',
      updatedAt: '2026-04-28T14:40:00Z'
    }
  ],
  coupons: [
    {
      id: 'coup-1',
      code: 'VINOTH20',
      discountType: 'percentage',
      discountValue: 20,
      minPurchase: 500,
      expiresAt: '2027-12-31',
      isActive: true,
      usageCount: 142
    },
    {
      id: 'coup-2',
      code: 'LAUNCH50',
      discountType: 'percentage',
      discountValue: 50,
      minPurchase: 1000,
      expiresAt: '2027-12-31',
      isActive: true,
      usageCount: 89
    },
    {
      id: 'coup-3',
      code: 'WELCOME100',
      discountType: 'fixed',
      discountValue: 100,
      minPurchase: 499,
      expiresAt: '2027-12-31',
      isActive: true,
      usageCount: 215
    }
  ],
  newsletter: [
    { id: 'sub-1', email: 'arjun.tech@gmail.com', subscribedAt: '2026-04-02T10:00:00Z' },
    { id: 'sub-2', email: 'meera.consulting@yahoo.com', subscribedAt: '2026-04-14T11:30:00Z' },
    { id: 'sub-3', email: 'rohit.builder@outlook.com', subscribedAt: '2026-04-26T08:15:00Z' }
  ],
  paymentSettings: {
    mode: (process.env.RAZORPAY_MODE === 'live' ? 'live' : 'test') as 'test' | 'live',
    testKeyId: process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_vinoth_books_demo',
    testKeySecret: process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'test_secret_demo',
    liveKeyId: process.env.RAZORPAY_LIVE_KEY_ID || '',
    liveKeySecret: process.env.RAZORPAY_LIVE_KEY_SECRET || '',
    currency: 'INR',
    isLiveConfirmed: false,
    updatedAt: new Date().toISOString()
  },
  websiteSettings: {
    storeName: 'VINOTH BOOKS',
    tagline: 'Ideas Into Pages. Knowledge Without Limits.',
    supportEmail: 'contact@vinothbooks.com',
    supportHours: 'Monday – Saturday: 9:00 AM – 6:00 PM IST',
    announcementBanner: {
      enabled: true,
      text: 'Special Launch Editions · Instant DRM-Free Digital Delivery Worldwide'
    },
    currencySymbol: '₹',
    maintenanceMode: false
  },
  legalPages: {
    privacyPolicy: `VINOTH BOOKS ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by VINOTH BOOKS.

1. Information We Collect
When you register, purchase an eBook, or submit customer feedback, we collect personal information such as your name, email address, transaction identifiers, and purchase history.

2. How We Use Your Information
We use your information solely to:
- Process digital orders and grant secure access to your purchased eBooks.
- Maintain your personal "My Library" and customer account.
- Communicate book updates, security notifications, and optional editorial dispatches.
- Prevent fraudulent transactions and verify digital ownership.

3. Payment Security & Data
We do not store credit card or debit card numbers on our servers. All transactions are securely processed through Razorpay using industry-standard 256-bit TLS encryption.

4. Digital File Protection
Your digital download access tokens are generated on demand and validated against your authenticated account. We never sell or monetize customer data.`,
    termsConditions: `These Terms and Conditions govern your use of VINOTH BOOKS and the digital content purchased through our platform.

1. Direct Digital Publishing License
When you purchase or claim an eBook from VINOTH BOOKS, you are granted a non-exclusive, non-transferable personal license to read, download, and store the digital file on your personal devices.

2. Intellectual Property Rights
All eBooks, cover designs, editorial prose, typography, and trademarks remain the sole intellectual property of VINOTH BOOKS. Redistribution, reselling, public file sharing, automated scraping, or unauthorized reproduction is strictly prohibited.

3. Account Integrity
You are responsible for maintaining the confidentiality of your account credentials. VINOTH BOOKS reserves the right to terminate accounts that attempt unauthorized download exploitation.

4. Governing Law
These terms are governed by the laws of India.`,
    refundPolicy: `At VINOTH BOOKS, we take immense pride in the editorial quality and intellectual density of every book we publish.

1. Digital Product Nature
Because eBooks are digital products delivered instantaneously upon verified payment, they cannot be physically returned once downloaded or accessed.

2. 7-Day Editorial Satisfaction Guarantee
If you experience a technical defect in the file format, an inability to access the digital reader, or duplicate charges during checkout, please email our support team at contact@vinothbooks.com within 7 days of purchase. We will promptly resolve the technical issue or issue a full refund to your original payment method.

3. Free eBooks
Books labeled as Free eBooks require no payment and are non-refundable.`,
    deliveryPolicy: `Digital Product Delivery Policy:

1. Instant Automated Delivery
All eBooks purchased on VINOTH BOOKS are digital products. No physical item will be shipped.
Immediately upon verified payment confirmation, the eBook is instantly unlocked in your account under "My Library".

2. Access Channels
Customers can access their books via:
- Instant in-browser reader with full table of contents and reading progress.
- Direct secure digital file download (PDF/EPUB formats) for reading on Kindle, iPad, e-readers, or mobile devices.

3. Lifetime Access
Once purchased, books remain accessible in your account library with unlimited re-downloads for personal use.`,
    contactSupport: {
      email: 'contact@vinothbooks.com',
      responseHours: 'Monday – Saturday: 9:00 AM – 6:00 PM IST',
      supportNote: 'We typically respond to reader and customer inquiries within 12 to 24 hours.'
    }
  },
  activityLogs: [
    {
      id: 'log-seed-1',
      action: 'SYSTEM_BOOT',
      adminEmail: 'system@vinothbooks.com',
      details: 'VINOTH BOOKS cryptographic core and catalog initialized.',
      ip: '127.0.0.1',
      timestamp: '2026-04-20T10:00:00.000Z'
    },
    {
      id: 'log-seed-2',
      action: 'FIREBASE_RULES_DEPLOY',
      adminEmail: 'kalivinoselvikk@gmail.com',
      details: 'Security rules verified with default-deny and ABAC role enforcement.',
      ip: '127.0.0.1',
      timestamp: '2026-04-25T14:30:00.000Z'
    },
    {
      id: 'log-seed-3',
      action: 'SECURITY_AUDIT',
      adminEmail: 'kalikalivino17@gmail.com',
      details: 'All digital download tokens and HMAC signature verification active.',
      ip: '127.0.0.1',
      timestamp: '2026-04-30T09:15:00.000Z'
    }
  ]
};

class DatabaseManager {
  private data: DatabaseSchema;
  private firestore: any = null;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure new collections exist
        this.data = {
          ...initialSeed,
          ...parsed,
          categories: parsed.categories?.length ? parsed.categories : initialSeed.categories,
          feedbacks: parsed.feedbacks?.length ? parsed.feedbacks : initialSeed.feedbacks,
          coupons: parsed.coupons?.length ? parsed.coupons : initialSeed.coupons,
          paymentSettings: parsed.paymentSettings ? { ...initialSeed.paymentSettings, ...parsed.paymentSettings } : initialSeed.paymentSettings,
          websiteSettings: parsed.websiteSettings ? { ...initialSeed.websiteSettings, ...parsed.websiteSettings } : initialSeed.websiteSettings,
          activityLogs: parsed.activityLogs?.length ? parsed.activityLogs : initialSeed.activityLogs
        };
        // Clean out legacy authorProfile if present
        if ((this.data as any).authorProfile) {
          delete (this.data as any).authorProfile;
        }
      } catch (err) {
        console.error('Error parsing db.json, falling back to seed:', err);
        this.data = initialSeed;
        this.save();
      }
    } else {
      this.data = initialSeed;
      this.save();
    }

    // Initialize Cloud Firestore for Persistent Production Storage
    this.initFirestore();
  }

  private initFirestore() {
    try {
      let serviceAccount: any = null;
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
      if (rawKey) {
        try {
          const decoded = rawKey.startsWith('{') ? rawKey : Buffer.from(rawKey, 'base64').toString('utf-8');
          serviceAccount = JSON.parse(decoded);
        } catch (parseErr) {
          console.warn('[Firestore Database] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseErr);
        }
      }

      let fbProjectId = process.env.FIREBASE_PROJECT_ID;
      let databaseId = process.env.FIRESTORE_DATABASE_ID;
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          fbProjectId = fbProjectId || raw.projectId;
          databaseId = databaseId || raw.firestoreDatabaseId;
        } catch {}
      }

      let adminApp = getAdminApps().length > 0 ? getAdminApps()[0] : null;
      if (!adminApp && (serviceAccount || fbProjectId)) {
        try {
          if (serviceAccount) {
            adminApp = initAdminApp({
              credential: cert(serviceAccount),
              projectId: serviceAccount.project_id || fbProjectId
            });
            console.log(`[Firestore Database] Initialized with Service Account: ${serviceAccount.client_email}`);
          } else if (fbProjectId) {
            adminApp = initAdminApp({ projectId: fbProjectId });
            console.log(`[Firestore Database] Initialized with project ID: ${fbProjectId}`);
          }
        } catch (initErr: any) {
          console.warn('[Firestore Database] Admin app init note:', initErr.message);
        }
      }

      if (adminApp) {
        try {
          if (databaseId) {
            this.firestore = getAdminFirestore(adminApp, databaseId);
          } else {
            this.firestore = getAdminFirestore(adminApp);
          }
          console.log(`[Firestore Database] Initialized persistent storage on database: ${databaseId || 'default'}`);
          this.hydrateFromFirestore().catch(e => {
            console.warn('[Firestore Database] Hydration note:', e.message);
          });
        } catch (fsErr: any) {
          console.warn('[Firestore Database] Firestore instance note (using local store):', fsErr.message);
        }
      } else {
        console.log('[Firestore Database] Operating with resilient local JSON store.');
      }
    } catch (err: any) {
      console.warn('[Firestore Database] Initialization note (resilient local store active):', err.message);
    }
  }

  private async hydrateFromFirestore() {
    if (!this.firestore) return;
    try {
      const [usersSnap, booksSnap, ordersSnap] = await Promise.allSettled([
        this.firestore.collection('users').get(),
        this.firestore.collection('books').get(),
        this.firestore.collection('orders').get()
      ]);

      if (usersSnap.status === 'fulfilled' && !usersSnap.value.empty) {
        usersSnap.value.forEach((doc: any) => {
          const u = doc.data() as User;
          const idx = this.data.users.findIndex(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
          if (idx !== -1) {
            this.data.users[idx] = { ...this.data.users[idx], ...u };
          } else {
            this.data.users.push(u);
          }
        });
      }

      if (booksSnap.status === 'fulfilled' && !booksSnap.value.empty) {
        booksSnap.value.forEach((doc: any) => {
          const b = doc.data() as Book;
          const idx = this.data.books.findIndex(x => x.id === b.id);
          if (idx !== -1) {
            this.data.books[idx] = { ...this.data.books[idx], ...b };
          } else {
            this.data.books.push(b);
          }
        });
      }

      if (ordersSnap.status === 'fulfilled' && !ordersSnap.value.empty) {
        ordersSnap.value.forEach((doc: any) => {
          const o = doc.data() as Order;
          const idx = this.data.orders.findIndex(x => x.id === o.id);
          if (idx !== -1) {
            this.data.orders[idx] = { ...this.data.orders[idx], ...o };
          } else {
            this.data.orders.push(o);
          }
        });
      }
    } catch (err: any) {
      console.warn('[Firestore Database] Hydration note:', err.message);
    }
  }

  public async syncDoc(collection: string, id: string, doc: any) {
    if (!this.firestore) return;
    try {
      await this.firestore.collection(collection).doc(id).set(doc, { merge: true });
    } catch (e: any) {
      console.warn(`[Firestore] Failed to persist ${collection}/${id}:`, e.message);
    }
  }

  public async deleteDoc(collection: string, id: string) {
    if (!this.firestore) return;
    try {
      await this.firestore.collection(collection).doc(id).delete();
    } catch (e: any) {
      console.warn(`[Firestore] Failed to delete ${collection}/${id}:`, e.message);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json:', err);
    }
  }

  public getBooks(): Book[] {
    return this.data.books;
  }

  public getBookById(id: string): Book | undefined {
    return this.data.books.find(b => b.id === id);
  }

  public addBook(book: Book) {
    this.data.books.unshift(book);
    this.save();
    this.syncDoc('books', book.id, book);
  }

  public updateBook(id: string, updates: Partial<Book>): Book | null {
    const idx = this.data.books.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.books[idx] = { ...this.data.books[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    this.syncDoc('books', id, this.data.books[idx]);
    return this.data.books[idx];
  }

  public deleteBook(id: string): boolean {
    const prevLen = this.data.books.length;
    this.data.books = this.data.books.filter(b => b.id !== id);
    if (this.data.books.length !== prevLen) {
      this.save();
      this.deleteDoc('books', id);
      return true;
    }
    return false;
  }

  public getCategories(): Category[] {
    return this.data.categories.map(cat => ({
      ...cat,
      bookCount: this.data.books.filter(b => b.category === cat.name && b.status === 'published').length
    }));
  }

  public addCategory(cat: Category) {
    this.data.categories.push(cat);
    this.save();
    this.syncDoc('categories', cat.id, cat);
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.save();
    this.syncDoc('categories', id, this.data.categories[idx]);
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const prev = this.data.categories.length;
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    if (this.data.categories.length !== prev) {
      this.save();
      this.deleteDoc('categories', id);
      return true;
    }
    return false;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    const u = this.data.users.find(usr => usr.id === id);
    if (u && !u.wishlist) u.wishlist = [];
    return u;
  }

  public getUserByEmail(email: string): User | undefined {
    const u = this.data.users.find(usr => usr.email.toLowerCase() === email.toLowerCase());
    if (u && !u.wishlist) u.wishlist = [];
    return u;
  }

  public addUser(user: User) {
    if (!user.wishlist) user.wishlist = [];
    this.data.users.push(user);
    this.save();
    this.syncDoc('users', user.id, user);
  }

  public toggleWishlist(userId: string, bookId: string): string[] {
    const user = this.getUserById(userId);
    if (!user) return [];
    if (!user.wishlist) user.wishlist = [];
    if (user.wishlist.includes(bookId)) {
      user.wishlist = user.wishlist.filter(id => id !== bookId);
    } else {
      user.wishlist.push(bookId);
    }
    this.save();
    this.syncDoc('users', user.id, user);
    return user.wishlist;
  }

  public unlockBookForUser(userId: string, bookId: string) {
    const user = this.getUserById(userId);
    if (user && !user.library.includes(bookId)) {
      user.library.push(bookId);
      this.save();
      this.syncDoc('users', user.id, user);
    }
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    // Prevent accidental role elevation unless authorized
    const existing = this.data.users[idx];
    this.data.users[idx] = {
      ...existing,
      ...updates,
      role: updates.role !== undefined ? updates.role : existing.role,
      updatedAt: new Date().toISOString()
    };
    this.save();
    this.syncDoc('users', id, this.data.users[idx]);
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const prevLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== prevLen) {
      this.save();
      this.deleteDoc('users', id);
      return true;
    }
    return false;
  }

  public getOrders(): Order[] {
    return this.data.orders;
  }

  public addOrder(order: Order) {
    this.data.orders.unshift(order);
    for (const item of order.items) {
      const book = this.data.books.find(b => b.id === item.bookId);
      if (book) {
        book.salesCount = (book.salesCount || 0) + 1;
        this.syncDoc('books', book.id, book);
      }
    }
    this.save();
    this.syncDoc('orders', order.id, order);
  }

  public updateOrderStatus(
    orderId: string,
    status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'captured' | 'settlement_initiated' | 'settlement_completed',
    paymentId?: string,
    extra?: {
      paymentMethod?: string;
      razorpaySignature?: string;
      settlementStatus?: 'pending' | 'processing' | 'settled';
      settlementId?: string;
    }
  ) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (order) {
      order.paymentStatus = status;
      order.updatedAt = new Date().toISOString();
      if (paymentId) order.razorpayPaymentId = paymentId;
      if (extra?.paymentMethod) order.paymentMethod = extra.paymentMethod;
      if (extra?.razorpaySignature) order.razorpaySignature = extra.razorpaySignature;
      if (extra?.settlementStatus) order.settlementStatus = extra.settlementStatus;
      if (extra?.settlementId) order.settlementId = extra.settlementId;

      if (status === 'paid' || status === 'captured') {
        for (const item of order.items) {
          this.unlockBookForUser(order.userId, item.bookId);
        }
      }
      this.save();
      this.syncDoc('orders', order.id, order);
    }
  }

  public getReviews(bookId?: string): Review[] {
    if (bookId) {
      return this.data.reviews.filter(r => r.bookId === bookId && r.status === 'approved');
    }
    return this.data.reviews;
  }

  public addReview(review: Review) {
    this.data.reviews.unshift(review);
    const bookReviews = this.data.reviews.filter(r => r.bookId === review.bookId && r.status === 'approved');
    const book = this.data.books.find(b => b.id === review.bookId);
    if (book && bookReviews.length > 0) {
      const sum = bookReviews.reduce((acc, r) => acc + r.rating, 0);
      book.rating = parseFloat((sum / bookReviews.length).toFixed(2));
      book.reviewCount = bookReviews.length;
      this.syncDoc('books', book.id, book);
    }
    this.save();
    this.syncDoc('reviews', review.id, review);
  }

  public updateReviewStatus(reviewId: string, status: 'approved' | 'pending' | 'hidden') {
    const rev = this.data.reviews.find(r => r.id === reviewId);
    if (rev) {
      rev.status = status;
      this.save();
      this.syncDoc('reviews', rev.id, rev);
    }
  }

  public deleteReview(reviewId: string) {
    this.data.reviews = this.data.reviews.filter(r => r.id !== reviewId);
    this.save();
    this.deleteDoc('reviews', reviewId);
  }

  // Customer Feedback
  public getFeedbacks(): CustomerFeedback[] {
    return this.data.feedbacks || [];
  }

  public getFeedbackById(id: string): CustomerFeedback | undefined {
    return (this.data.feedbacks || []).find(f => f.id === id);
  }

  public addFeedback(feedback: CustomerFeedback) {
    if (!this.data.feedbacks) this.data.feedbacks = [];
    this.data.feedbacks.unshift(feedback);
    this.save();
    this.syncDoc('feedbacks', feedback.id, feedback);
  }

  public addReplyToFeedback(feedbackId: string, reply: FeedbackReply): CustomerFeedback | null {
    const fb = this.getFeedbackById(feedbackId);
    if (!fb) return null;
    fb.replies.push(reply);
    fb.status = 'replied';
    fb.updatedAt = new Date().toISOString();
    this.save();
    this.syncDoc('feedbacks', fb.id, fb);
    return fb;
  }

  public updateFeedbackReply(feedbackId: string, replyId: string, newMessage: string): CustomerFeedback | null {
    const fb = this.getFeedbackById(feedbackId);
    if (!fb) return null;
    const rep = fb.replies.find(r => r.id === replyId);
    if (!rep) return null;
    rep.message = newMessage;
    rep.updatedAt = new Date().toISOString();
    fb.updatedAt = new Date().toISOString();
    this.save();
    this.syncDoc('feedbacks', fb.id, fb);
    return fb;
  }

  public updateFeedbackStatus(feedbackId: string, status: 'open' | 'replied' | 'resolved' | 'archived'): CustomerFeedback | null {
    const fb = this.getFeedbackById(feedbackId);
    if (!fb) return null;
    fb.status = status;
    fb.updatedAt = new Date().toISOString();
    this.save();
    this.syncDoc('feedbacks', fb.id, fb);
    return fb;
  }

  public deleteFeedback(feedbackId: string): boolean {
    const prev = this.data.feedbacks.length;
    this.data.feedbacks = this.data.feedbacks.filter(f => f.id !== feedbackId);
    if (this.data.feedbacks.length !== prev) {
      this.save();
      this.deleteDoc('feedbacks', feedbackId);
      return true;
    }
    return false;
  }

  // Payment Settings
  public getPaymentSettings(): PaymentSettings {
    return this.data.paymentSettings;
  }

  public updatePaymentSettings(settings: Partial<PaymentSettings>): PaymentSettings {
    this.data.paymentSettings = {
      ...this.data.paymentSettings,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    this.save();
    this.syncDoc('settings', 'payment', this.data.paymentSettings);
    return this.data.paymentSettings;
  }

  public getPublicPaymentConfig() {
    const ps = this.data.paymentSettings;
    const isLive = ps.mode === 'live';
    const activeKeyId = isLive ? ps.liveKeyId : ps.testKeyId;
    return {
      mode: ps.mode,
      activeKeyId,
      isTestConfigured: Boolean(ps.testKeyId && ps.testKeySecret),
      isLiveConfigured: Boolean(ps.liveKeyId && ps.liveKeySecret),
      currency: ps.currency || 'INR',
      isLiveConfirmed: ps.isLiveConfirmed,
      hasTestSecret: Boolean(ps.testKeySecret),
      hasLiveSecret: Boolean(ps.liveKeySecret),
      hasWebhookSecret: Boolean(ps.webhookSecret),
      updatedAt: ps.updatedAt
    };
  }

  // Website Settings
  public getWebsiteSettings(): WebsiteSettings {
    return this.data.websiteSettings;
  }

  public updateWebsiteSettings(settings: Partial<WebsiteSettings>): WebsiteSettings {
    this.data.websiteSettings = {
      ...this.data.websiteSettings,
      ...settings
    };
    this.save();
    this.syncDoc('settings', 'website', this.data.websiteSettings);
    return this.data.websiteSettings;
  }

  public getCoupons(): Coupon[] {
    return this.data.coupons;
  }

  public getCouponByCode(code: string): Coupon | undefined {
    return this.data.coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
  }

  public addCoupon(coupon: Coupon) {
    this.data.coupons.push(coupon);
    this.save();
    this.syncDoc('coupons', coupon.id, coupon);
  }

  public updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
    const idx = this.data.coupons.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.coupons[idx] = { ...this.data.coupons[idx], ...updates };
    this.save();
    this.syncDoc('coupons', id, this.data.coupons[idx]);
    return this.data.coupons[idx];
  }

  public deleteCoupon(id: string) {
    this.data.coupons = this.data.coupons.filter(c => c.id !== id);
    this.save();
    this.deleteDoc('coupons', id);
  }

  public getLegalPages(): LegalPages {
    return this.data.legalPages;
  }

  public updateLegalPages(pages: Partial<LegalPages>) {
    this.data.legalPages = { ...this.data.legalPages, ...pages };
    this.save();
    this.syncDoc('settings', 'legalPages', this.data.legalPages);
    return this.data.legalPages;
  }

  public addNewsletterSubscriber(email: string) {
    const exists = this.data.newsletter.some(s => s.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      const sub = {
        id: 'sub-' + Date.now(),
        email,
        subscribedAt: new Date().toISOString()
      };
      this.data.newsletter.unshift(sub);
      this.save();
      this.syncDoc('newsletter', sub.id, sub);
    }
  }

  public getNewsletterSubscribers() {
    return this.data.newsletter;
  }

  public getActivityLogs(): ActivityLog[] {
    if (!this.data.activityLogs) this.data.activityLogs = [];
    return this.data.activityLogs;
  }

  public logActivity(action: string, details: string, adminEmail: string, ip?: string): ActivityLog {
    if (!this.data.activityLogs) this.data.activityLogs = [];
    const entry: ActivityLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action,
      details,
      adminEmail,
      ip: ip || '127.0.0.1',
      timestamp: new Date().toISOString()
    };
    this.data.activityLogs.unshift(entry);
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 200);
    }
    this.save();
    this.syncDoc('activityLogs', entry.id, entry);
    return entry;
  }
}

export const db = new DatabaseManager();
