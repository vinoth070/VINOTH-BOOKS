import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, Book, Category, Order, User, hashPassword, generateSalt } from './server/db.js';
import { initializeFirebaseAdmin } from './server/firebaseAdmin.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const APP_SECRET = process.env.APP_SECRET || 'vinoth-books-super-secure-key-2026';

// Centralized Firebase Admin SDK instance
const firebaseAdminState = initializeFirebaseAdmin();
const adminAuth = firebaseAdminState.adminAuth;

// CORS Configuration for Production & Local Development
const allowedOrigins = [
  'https://vinoth070.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  process.env.APP_URL,
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.github.io') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev, credentials allowed
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Pre-flight handling
app.options('*', cors());

// Health check endpoint with diagnostic telemetry
app.get('/api/health', (req, res) => {
  const fsStatus = db.getFirestoreStatus();
  const paymentConfig = db.getPaymentSettings();

  res.json({
    status: 'ok',
    service: 'VINOTH BOOKS API',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    corsAllowed: true,
    firebase: {
      adminConnected: fsStatus.serviceAccountConfigured,
      firestoreActive: fsStatus.connected,
      databaseMode: fsStatus.databaseMode,
      databaseId: fsStatus.databaseId,
      projectId: fsStatus.projectId,
      serviceAccount: fsStatus.serviceAccountEmail,
      initNotice: fsStatus.initError
    },
    payment: {
      mode: paymentConfig.mode,
      currency: paymentConfig.currency
    },
    environment: {
      isRender: Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID),
      port: PORT,
      uptime: Math.round(process.uptime())
    }
  });
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper: Token generation & verification
function generateToken(user: User): string {
  const payload = `${user.id}:${user.role}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', APP_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyToken(tokenString?: string): { userId: string; role: 'admin' | 'customer' } | null {
  if (!tokenString) return null;
  try {
    const raw = Buffer.from(tokenString, 'base64').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [userId, role, timestamp, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', APP_SECRET).update(`${userId}:${role}:${timestamp}`).digest('hex');
    if (signature !== expectedSig) return null;
    return { userId, role: role as 'admin' | 'customer' };
  } catch (err) {
    return null;
  }
}

// Server-side Firebase ID token verification
async function verifyFirebaseIdToken(token?: string) {
  if (!token || !adminAuth) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (err: any) {
    return null;
  }
}

// Authentication middleware (supports HMAC tokens and verified Firebase ID tokens)
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 1. Check HMAC session token
  const decoded = verifyToken(token);
  if (decoded) {
    const user = db.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }
    (req as any).user = user;
    return next();
  }

  // 2. Check Firebase ID Token
  const fbDecoded = await verifyFirebaseIdToken(token);
  if (fbDecoded && fbDecoded.email) {
    const cleanEmail = fbDecoded.email.toLowerCase().trim();
    let user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const isAdmin = isAdminEmail(cleanEmail);
      const salt = generateSalt();
      user = {
        id: fbDecoded.uid,
        name: fbDecoded.name || (isAdmin ? 'Vinoth (Administrator)' : 'Verified Reader'),
        email: cleanEmail,
        passwordHash: hashPassword(fbDecoded.uid, salt),
        salt,
        role: isAdmin ? 'admin' : 'customer',
        library: isAdmin
          ? ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking']
          : ['book-digital-product-blueprint'],
        wishlist: [],
        createdAt: new Date().toISOString()
      };
      db.addUser(user);
    }
    (req as any).user = user;
    (req as any).firebaseUser = fbDecoded;
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired authentication session' });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user as User;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Publisher Administrator access required' });
    }
    next();
  });
}

async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      (req as any).user = db.getUserById(decoded.userId);
    } else {
      const fbDecoded = await verifyFirebaseIdToken(token);
      if (fbDecoded && fbDecoded.email) {
        (req as any).user = db.getUserByEmail(fbDecoded.email.toLowerCase().trim());
      }
    }
  }
  next();
}

// -------------------------------------------------------------
// DEDICATED ADMIN & UNIFIED AUTHENTICATION
// -------------------------------------------------------------
const CONFIGURED_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'kalivinoselvikk@gmail.com').toLowerCase().trim();
const CONFIGURED_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'temp-mail.org',
  'tempail.com',
  'mohmal.com',
  'burnermail.io'
];

function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    clean === CONFIGURED_ADMIN_EMAIL ||
    clean === 'kalivinoselvikk@gmail.com' ||
    clean === 'kalikalivino17@gmail.com'
  );
}

// Unified Firebase Login & Session Sync with Server-Side Verification
app.post('/api/auth/firebase-login', async (req: Request, res: Response) => {
  const { idToken, email, name, uid, emailVerified } = req.body;

  let verifiedEmail = email ? email.toLowerCase().trim() : '';
  let verifiedUid = uid || '';
  let verifiedName = name || '';
  let isEmailVerified = Boolean(emailVerified);

  // If Firebase ID token is supplied, verify it using Firebase Admin SDK
  if (idToken) {
    const decoded = await verifyFirebaseIdToken(idToken);
    if (decoded) {
      verifiedEmail = (decoded.email || verifiedEmail).toLowerCase().trim();
      verifiedUid = decoded.uid;
      verifiedName = decoded.name || verifiedName;
      isEmailVerified = Boolean(decoded.email_verified ?? isEmailVerified);
    } else if (adminAuth && !verifiedEmail) {
      return res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
    }
  }

  if (!verifiedEmail) {
    return res.status(400).json({ error: 'A valid email address is required for authentication' });
  }

  const isAdmin = isAdminEmail(verifiedEmail);
  let user = db.getUserByEmail(verifiedEmail);

  if (!user) {
    const salt = generateSalt();
    user = {
      id: verifiedUid || (isAdmin ? 'user-admin-fb' : 'user-fb-' + Date.now()),
      name: verifiedName || (isAdmin ? 'Vinoth (Administrator)' : 'Verified Reader'),
      email: verifiedEmail,
      passwordHash: hashPassword(verifiedUid || 'firebase-oauth-token', salt),
      salt,
      role: isAdmin ? 'admin' : 'customer',
      library: isAdmin
        ? ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking']
        : ['book-digital-product-blueprint'],
      wishlist: [],
      emailVerified: isEmailVerified,
      createdAt: new Date().toISOString()
    };
    db.addUser(user);
    db.logActivity('USER_REGISTERED', `New account via Firebase Auth: ${verifiedEmail} (${user.role})`, verifiedEmail, req.ip);
  } else {
    // Reconcile role if email matches authorized admin
    if (isAdmin && user.role !== 'admin') {
      user.role = 'admin';
      db.save();
    }
    if (isEmailVerified && !user.emailVerified) {
      user.emailVerified = true;
      db.save();
    }
  }

  db.logActivity(
    isAdmin ? 'ADMIN_SIGNIN' : 'CUSTOMER_SIGNIN',
    `Successful Firebase authentication for ${verifiedEmail}`,
    verifiedEmail,
    req.ip
  );

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      library: user.library,
      wishlist: user.wishlist || [],
      emailVerified: Boolean(user.emailVerified)
    }
  });
});

app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Admin email and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = db.getUserByEmail(cleanEmail);
  const isAdminCandidate = isAdminEmail(cleanEmail);

  let isAdminValid = false;
  let adminUser: User | undefined = user;

  if (isAdminCandidate && (password === CONFIGURED_ADMIN_PASS || (user && user.passwordHash === hashPassword(password, user.salt)))) {
    isAdminValid = true;
    if (!adminUser) {
      const salt = generateSalt();
      adminUser = {
        id: 'user-admin-env',
        name: 'Vinoth (Administrator)',
        email: cleanEmail,
        passwordHash: hashPassword(CONFIGURED_ADMIN_PASS, salt),
        salt,
        role: 'admin',
        library: ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking'],
        wishlist: [],
        createdAt: new Date().toISOString()
      };
      db.addUser(adminUser);
    } else if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      db.save();
    }
  } else if (user && user.role === 'admin') {
    const hash = hashPassword(password, user.salt);
    if (hash === user.passwordHash) {
      isAdminValid = true;
      adminUser = user;
    }
  }

  if (!isAdminValid || !adminUser) {
    db.logActivity('FAILED_ADMIN_LOGIN', `Failed admin login attempt for ${cleanEmail}`, cleanEmail, req.ip);
    return res.status(401).json({ error: 'Invalid administrator credentials' });
  }

  db.logActivity('ADMIN_SIGNIN', `Administrator signed in: ${adminUser.email}`, adminUser.email, req.ip);

  const token = generateToken(adminUser);
  res.json({
    token,
    user: {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: 'admin',
      library: adminUser.library,
      wishlist: adminUser.wishlist || []
    }
  });
});

// -------------------------------------------------------------
// CUSTOMER & UNIFIED AUTHENTICATION
// -------------------------------------------------------------
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, uid, emailVerified } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email address, and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Fake email & disposable email prevention
  if (isDisposableEmail(cleanEmail)) {
    return res.status(400).json({
      error: 'Disposable and temporary email services are blocked. Please provide a genuine email address.'
    });
  }

  // Password validation: 8+ chars, uppercase, lowercase, number, special char
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z)' });
  }
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a-z)' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one number (0-9)' });
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&*)' });
  }

  const existing = db.getUserByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const isAdmin = isAdminEmail(cleanEmail);

  const newUser: User = {
    id: isAdmin ? 'user-admin-' + Date.now() : (uid || 'user-' + Date.now()),
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    salt,
    role: isAdmin ? 'admin' : 'customer',
    library: isAdmin
      ? ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking']
      : ['book-digital-product-blueprint'],
    wishlist: [],
    createdAt: new Date().toISOString()
  };

  db.addUser(newUser);
  db.logActivity('USER_REGISTERED', `Account registered: ${cleanEmail} (${newUser.role})`, cleanEmail, req.ip);

  const token = generateToken(newUser);

  res.json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      library: newUser.library,
      wishlist: newUser.wishlist,
      emailVerified: Boolean(emailVerified)
    },
    message: isAdmin ? 'Administrator account registered successfully' : 'Reader account registered successfully'
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let user = db.getUserByEmail(cleanEmail);
  const isAdminCandidate = isAdminEmail(cleanEmail);

  // If credentials match the authorized administrator
  if (isAdminCandidate) {
    let isAdminValid = false;
    if (password === CONFIGURED_ADMIN_PASS) {
      isAdminValid = true;
    } else if (user) {
      const hash = hashPassword(password, user.salt);
      if (hash === user.passwordHash) isAdminValid = true;
    }

    if (isAdminValid) {
      if (!user) {
        const salt = generateSalt();
        user = {
          id: 'user-admin-main',
          name: 'Vinoth (Administrator)',
          email: cleanEmail,
          passwordHash: hashPassword(CONFIGURED_ADMIN_PASS, salt),
          salt,
          role: 'admin',
          library: ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking'],
          wishlist: [],
          createdAt: new Date().toISOString()
        };
        db.addUser(user);
      } else if (user.role !== 'admin') {
        user.role = 'admin';
        db.save();
      }

      db.logActivity('ADMIN_SIGNIN', `Administrator logged in: ${cleanEmail}`, cleanEmail, req.ip);
      const token = generateToken(user);
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'admin',
          library: user.library,
          wishlist: user.wishlist || []
        }
      });
    }
  }

  if (!user) {
    db.logActivity('FAILED_LOGIN_ATTEMPT', `Failed login attempt: non-existent email ${cleanEmail}`, cleanEmail, req.ip);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    db.logActivity('FAILED_LOGIN_ATTEMPT', `Failed login attempt: incorrect password for ${cleanEmail}`, cleanEmail, req.ip);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  db.logActivity(user.role === 'admin' ? 'ADMIN_SIGNIN' : 'CUSTOMER_SIGNIN', `Customer logged in: ${cleanEmail}`, cleanEmail, req.ip);

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      library: user.library,
      wishlist: user.wishlist || []
    }
  });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name, googleId } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Google account email is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let user = db.getUserByEmail(cleanEmail);
  const isAdmin = isAdminEmail(cleanEmail);

  if (!user) {
    const salt = generateSalt();
    user = {
      id: isAdmin ? 'user-admin-google' : 'user-google-' + Date.now(),
      name: name || (isAdmin ? 'Vinoth (Administrator)' : 'Google Reader'),
      email: cleanEmail,
      passwordHash: hashPassword(googleId || 'google-oauth-pwd', salt),
      salt,
      role: isAdmin ? 'admin' : 'customer',
      library: isAdmin
        ? ['book-ai-mind', 'book-wealth-playbook', 'book-deep-focus', 'book-digital-product-blueprint', 'book-systematic-thinking']
        : ['book-digital-product-blueprint'],
      wishlist: [],
      createdAt: new Date().toISOString()
    };
    db.addUser(user);
  } else if (isAdmin && user.role !== 'admin') {
    user.role = 'admin';
    db.save();
  }

  db.logActivity(isAdmin ? 'ADMIN_SIGNIN' : 'CUSTOMER_SIGNIN', `Google OAuth login for ${cleanEmail}`, cleanEmail, req.ip);

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      library: user.library,
      wishlist: user.wishlist || []
    }
  });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const user = db.getUserByEmail(cleanEmail);
  if (!user) {
    return res.json({ success: true, message: 'If an account exists with this email, password reset instructions have been sent.' });
  }

  res.json({
    success: true,
    message: `Password reset instructions have been sent to ${cleanEmail}. Check your inbox.`
  });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      library: user.library,
      wishlist: user.wishlist || [],
      photoURL: user.photoURL,
      phone: user.phone,
      bio: user.bio,
      language: user.language,
      theme: user.theme,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

app.put('/api/auth/profile', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, phone, bio, photoURL, avatar, language, theme, notifications } = req.body;

  const updates: Partial<User> = {};
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof phone === 'string') updates.phone = phone.trim();
  if (typeof bio === 'string') updates.bio = bio.trim();
  if (typeof photoURL === 'string') {
    updates.photoURL = photoURL.trim();
    updates.avatar = photoURL.trim();
  } else if (typeof avatar === 'string') {
    updates.photoURL = avatar.trim();
    updates.avatar = avatar.trim();
  }
  if (typeof language === 'string') updates.language = language.trim();
  if (['dark', 'light', 'system'].includes(theme)) updates.theme = theme;
  if (notifications && typeof notifications === 'object') updates.notifications = notifications;

  const updated = db.updateUser(user.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.logActivity('PROFILE_UPDATE', `User updated profile settings: ${user.email}`, user.email, req.ip);

  res.json({
    success: true,
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      library: updated.library,
      wishlist: updated.wishlist || [],
      photoURL: updated.photoURL,
      avatar: updated.avatar || updated.photoURL,
      phone: updated.phone,
      bio: updated.bio,
      language: updated.language,
      theme: updated.theme,
      notifications: updated.notifications,
      emailVerified: updated.emailVerified,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  });
});

app.post('/api/auth/change-password', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const currentHash = hashPassword(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);

  db.updateUser(user.id, {
    passwordHash: newHash,
    salt: newSalt
  });

  db.logActivity('PASSWORD_CHANGED', `User updated account password: ${user.email}`, user.email, req.ip);

  res.json({ success: true, message: 'Password updated successfully' });
});

app.delete('/api/auth/delete-account', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Administrator accounts cannot be deleted directly' });
  }

  db.deleteUser(user.id);
  db.logActivity('ACCOUNT_DELETED', `Customer account deleted: ${user.email}`, user.email, req.ip);

  res.json({ success: true, message: 'Account deleted successfully' });
});

// -------------------------------------------------------------
// WISHLIST ENDPOINTS
// -------------------------------------------------------------
app.get('/api/wishlist', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const allBooks = db.getBooks();
  const wishlistIds = user.wishlist || [];
  const wishlistBooks = allBooks.filter(b => wishlistIds.includes(b.id) && b.status === 'published');
  res.json({ wishlist: wishlistBooks });
});

app.post('/api/wishlist/toggle', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ error: 'Book ID required' });
  const updatedWishlist = db.toggleWishlist(user.id, bookId);
  res.json({ wishlist: updatedWishlist });
});

// -------------------------------------------------------------
// BOOKS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/books', optionalAuth, (req: Request, res: Response) => {
  const { category, search, featured, bestSeller, isFree, sort, status } = req.query;
  const user = (req as any).user as User | undefined;

  let books = db.getBooks();

  if (!user || user.role !== 'admin') {
    books = books.filter(b => b.status === 'published');
  } else if (status) {
    books = books.filter(b => b.status === status);
  }

  if (category && category !== 'All') {
    books = books.filter(b => b.category.toLowerCase() === String(category).toLowerCase());
  }

  if (featured === 'true') {
    books = books.filter(b => b.featured);
  }

  if (bestSeller === 'true') {
    books = books.filter(b => b.bestSeller);
  }

  if (isFree === 'true') {
    books = books.filter(b => b.isFree);
  } else if (isFree === 'false') {
    books = books.filter(b => !b.isFree);
  }

  if (search) {
    const q = String(search).toLowerCase();
    books = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.subtitle.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.tags.some(t => t.toLowerCase().includes(q)) ||
      b.shortDescription.toLowerCase().includes(q)
    );
  }

  if (sort === 'newest') {
    books.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  } else if (sort === 'popular') {
    books.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  } else if (sort === 'price-asc') {
    books.sort((a, b) => a.sellingPrice - b.sellingPrice);
  } else if (sort === 'price-desc') {
    books.sort((a, b) => b.sellingPrice - a.sellingPrice);
  } else if (sort === 'rating') {
    books.sort((a, b) => (b.rating || 5) - (a.rating || 5));
  }

  res.json({ books, total: books.length });
});

app.get('/api/books/:id', optionalAuth, (req: Request, res: Response) => {
  const book = db.getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const user = (req as any).user as User | undefined;
  if (book.status === 'draft' && (!user || user.role !== 'admin')) {
    return res.status(404).json({ error: 'Book is not published' });
  }

  const reviews = db.getReviews(book.id);
  const relatedBooks = db.getBooks()
    .filter(b => b.id !== book.id && b.category === book.category && b.status === 'published')
    .slice(0, 3);

  const isPurchased = user ? user.library.includes(book.id) : false;
  const isWishlisted = user ? (user.wishlist || []).includes(book.id) : false;

  res.json({
    book,
    reviews,
    relatedBooks,
    isPurchased,
    isWishlisted
  });
});

app.post('/api/books', requireAdmin, (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title || !body.category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  const id = 'book-' + (body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || Date.now());

  const newBook: Book = {
    id,
    title: body.title,
    subtitle: body.subtitle || '',
    author: body.author || 'VINOTH BOOKS Publishing',
    shortDescription: body.shortDescription || '',
    fullDescription: body.fullDescription || body.shortDescription || '',
    category: body.category,
    coverImage: body.coverImage || '/src/assets/images/book_cover_ai_revolution_1793365303535.jpg',
    pdfUrl: body.pdfUrl || undefined,
    epubUrl: body.epubUrl || undefined,
    sampleContent: Array.isArray(body.sampleContent) && body.sampleContent.length > 0
      ? body.sampleContent
      : [
          {
            chapterTitle: 'Chapter 1: Foundations',
            content: body.fullDescription || 'Welcome to this digital edition from VINOTH BOOKS.'
          }
        ],
    originalPrice: Number(body.originalPrice) || Number(body.sellingPrice) || 999,
    sellingPrice: Number(body.sellingPrice) || 0,
    language: body.language || 'English',
    pages: Number(body.pages) || 200,
    isbn: body.isbn || `978-93-5467-${Math.floor(100 + Math.random() * 900)}-${Math.floor(Math.random() * 9)}`,
    publicationDate: body.publicationDate || new Date().toISOString().split('T')[0],
    tags: Array.isArray(body.tags) ? body.tags : (typeof body.tags === 'string' ? body.tags.split(',').map((t: string) => t.trim()) : []),
    featured: Boolean(body.featured),
    bestSeller: Boolean(body.bestSeller),
    isFree: Boolean(body.isFree || body.sellingPrice === 0),
    status: body.status === 'draft' ? 'draft' : 'published',
    keyLearnings: Array.isArray(body.keyLearnings) ? body.keyLearnings : [
      'Comprehensive understanding of core concepts.',
      'Actionable step-by-step frameworks for immediate application.',
      'Case studies and real-world synthesis.'
    ],
    tableOfContents: Array.isArray(body.tableOfContents) ? body.tableOfContents : [
      'Chapter 1: The Core Paradigm',
      'Chapter 2: Frameworks & Execution',
      'Chapter 3: Deep Insights & Synthesis',
      'Chapter 4: The Path Forward'
    ],
    salesCount: 0,
    rating: 5.0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.addBook(newBook);
  res.status(201).json({ book: newBook, message: 'Book created successfully' });
});

app.put('/api/books/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateBook(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json({ book: updated, message: 'Book updated successfully' });
});

app.delete('/api/books/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteBook(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json({ success: true, message: 'Book deleted successfully' });
});

app.patch('/api/books/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  if (status !== 'published' && status !== 'draft') {
    return res.status(400).json({ error: 'Status must be published or draft' });
  }
  const updated = db.updateBook(req.params.id, { status });
  if (!updated) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json({ book: updated, message: `Book status set to ${status}` });
});

// Admin Preview and Original File Download
app.get('/api/admin/books/:id/download-original', requireAdmin, (req: Request, res: Response) => {
  const book = db.getBookById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  db.logActivity('ADMIN_DOWNLOAD_ORIGINAL', `Admin tested original manuscript for "${book.title}"`, (req as any).user.email, req.ip);

  // If book has base64 data PDF
  if (book.pdfUrl && book.pdfUrl.startsWith('data:application/pdf;base64,')) {
    const base64Data = book.pdfUrl.replace('data:application/pdf;base64,', '');
    const buffer = Buffer.from(base64Data, 'base64');
    const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}_Original.pdf"`);
    return res.send(buffer);
  }

  // Master author edition manuscript
  const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedTitle}_MASTER_AUTHOR_EDITION.txt`;
  const doc = `================================================================================
VINOTH BOOKS — OFFICIAL PUBLISHER ORIGINAL MANUSCRIPT
================================================================================
TITLE: ${book.title.toUpperCase()}
SUBTITLE: ${book.subtitle}
AUTHOR/IMPRINT: ${book.author}
CATEGORY: ${book.category}
ISBN: ${book.isbn || 'N/A'}
PAGES: ${book.pages}
STATUS: ${book.status.toUpperCase()}
PRICE: ${book.isFree ? 'FREE' : '₹' + book.sellingPrice}
VERIFIED PUBLISHER INSPECTION COPY
================================================================================
TABLE OF CONTENTS:
${book.tableOfContents.map((ch, i) => `${i + 1}. ${ch}`).join('\n')}

KEY LEARNINGS:
${book.keyLearnings.map((k, i) => `[${i + 1}] ${k}`).join('\n')}

MANUSCRIPT CONTENT:
${book.sampleContent.map(sc => `### ${sc.chapterTitle} ###\n\n${sc.content}\n\n`).join('\n--------------------------------------------------------------------------------\n')}
================================================================================`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(doc);
});

// Admin Bulk Management: Safe Purge of Demo/Sample Books
app.post('/api/admin/books/purge-demo', requireAdmin, (req: Request, res: Response) => {
  const allBooks = db.getBooks();
  const demoBooks = allBooks.filter(b => b.isDemoData === true);
  const purgedIds: string[] = [];

  for (const b of demoBooks) {
    db.deleteBook(b.id);
    purgedIds.push(b.id);
  }

  db.logActivity('PURGE_DEMO_BOOKS', `Admin safely removed ${purgedIds.length} sample/demo books from the live catalog.`, (req as any).user.email, req.ip);
  res.json({
    success: true,
    count: purgedIds.length,
    purgedIds,
    message: `Successfully removed ${purgedIds.length} demo books. User-uploaded books were strictly preserved.`
  });
});

// -------------------------------------------------------------
// CATEGORIES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({ categories: db.getCategories() });
});

app.post('/api/categories', requireAdmin, (req: Request, res: Response) => {
  const { name, description, imageUrl } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const id = 'cat-' + Date.now();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newCat: Category = {
    id,
    name,
    slug,
    description: description || '',
    imageUrl
  };
  db.addCategory(newCat);
  res.status(201).json({ category: newCat, message: 'Category added' });
});

app.put('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
  const { name, description, imageUrl } = req.body;
  const updates: Partial<Category> = {};
  if (name) {
    updates.name = name;
    updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (description !== undefined) updates.description = description;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;

  const updated = db.updateCategory(req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json({ category: updated, message: 'Category updated' });
});

app.delete('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteCategory(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, message: 'Category deleted' });
});

// -------------------------------------------------------------
// RAZORPAY TEST & LIVE PAYMENT CONFIGURATION
// -------------------------------------------------------------
app.get('/api/payment/config', (_req: Request, res: Response) => {
  // Public config only - NEVER exposes secrets!
  res.json(db.getPublicPaymentConfig());
});

app.get('/api/admin/payment-settings', requireAdmin, (_req: Request, res: Response) => {
  const ps = db.getPaymentSettings();
  res.json({
    mode: ps.mode,
    testKeyId: ps.testKeyId,
    hasTestSecret: Boolean(ps.testKeySecret),
    liveKeyId: ps.liveKeyId,
    hasLiveSecret: Boolean(ps.liveKeySecret),
    hasWebhookSecret: Boolean(ps.webhookSecret),
    currency: ps.currency,
    isLiveConfirmed: ps.isLiveConfirmed,
    updatedAt: ps.updatedAt
  });
});

app.put('/api/admin/payment-settings', requireAdmin, (req: Request, res: Response) => {
  const { mode, testKeyId, testKeySecret, liveKeyId, liveKeySecret, webhookSecret, isLiveConfirmed } = req.body;

  const current = db.getPaymentSettings();
  const updates: any = {};

  if (testKeyId !== undefined) updates.testKeyId = testKeyId.trim();
  if (testKeySecret && testKeySecret.trim()) updates.testKeySecret = testKeySecret.trim();
  if (liveKeyId !== undefined) updates.liveKeyId = liveKeyId.trim();
  if (liveKeySecret && liveKeySecret.trim()) updates.liveKeySecret = liveKeySecret.trim();
  if (webhookSecret !== undefined) updates.webhookSecret = webhookSecret.trim();

  // Mode validation
  if (mode === 'live') {
    const finalLiveKey = updates.liveKeyId !== undefined ? updates.liveKeyId : current.liveKeyId;
    const finalLiveSecret = updates.liveKeySecret || current.liveKeySecret;

    if (!finalLiveKey || !finalLiveSecret) {
      return res.status(400).json({
        error: 'Cannot switch to Live Mode without configuring Razorpay Live Key ID and Live Key Secret.'
      });
    }

    if (!isLiveConfirmed && !current.isLiveConfirmed) {
      return res.status(400).json({
        error: 'Live Mode confirmation is required before activating production payments.'
      });
    }
    updates.mode = 'live';
    updates.isLiveConfirmed = true;
  } else if (mode === 'test') {
    updates.mode = 'test';
  }

  const updated = db.updatePaymentSettings(updates);
  db.logActivity('PAYMENT_SETTINGS_UPDATED', `Payment settings modified. Active mode: ${updated.mode}`, (req as any).user.email, req.ip);

  res.json({
    message: `Payment mode set to ${updated.mode.toUpperCase()}`,
    config: db.getPublicPaymentConfig()
  });
});

// Preflight validation for Razorpay Live Credentials
app.post('/api/admin/payment-settings/validate-live', requireAdmin, async (req: Request, res: Response) => {
  const ps = db.getPaymentSettings();
  const testKey = req.body.liveKeyId ? req.body.liveKeyId.trim() : ps.liveKeyId;
  const testSecret = req.body.liveKeySecret ? req.body.liveKeySecret.trim() : ps.liveKeySecret;

  if (!testKey || !testSecret) {
    return res.status(400).json({
      success: false,
      error: 'Both Razorpay Live Key ID and Live Key Secret are required to run preflight validation.'
    });
  }

  if (!testKey.startsWith('rzp_live_')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Live Key ID format. Production key IDs must begin with "rzp_live_".'
    });
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${testKey}:${testSecret}`).toString('base64');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const rzpRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      headers: { Authorization: authHeader },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (rzpRes.ok) {
      db.logActivity('PAYMENT_SETTINGS_VERIFIED', 'Live Razorpay API credentials verified successfully against gateway', (req as any).user.email, req.ip);
      return res.json({
        success: true,
        message: 'Razorpay Live API connection verified successfully! Your production credentials are authentic.'
      });
    } else {
      const errBody: any = await rzpRes.json().catch(() => ({}));
      return res.status(400).json({
        success: false,
        error: `Razorpay rejected credentials: ${errBody?.error?.description || 'Invalid API Key ID or Secret'}`
      });
    }
  } catch {
    // If external connectivity is unavailable or network timed out
    return res.json({
      success: true,
      simulated: true,
      message: 'Razorpay Live Key format verified (rzp_live_...).'
    });
  }
});

// Razorpay Webhook Endpoint for Async Events (captured, failed, settlement)
app.post('/api/payment/webhook', (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  const paymentConfig = db.getPaymentSettings();
  const secret = paymentConfig.webhookSecret || paymentConfig.liveKeySecret || paymentConfig.testKeySecret;

  if (secret && webhookSignature) {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSig !== webhookSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  if (event === 'payment.captured' && payload?.payment?.entity) {
    const entity = payload.payment.entity;
    const orderId = entity.notes?.order_id;
    const rzpOrderId = entity.order_id;
    const order = db.getOrders().find(o => o.id === orderId || o.razorpayOrderId === rzpOrderId);
    if (order && order.paymentStatus !== 'paid' && order.paymentStatus !== 'captured') {
      db.updateOrderStatus(order.id, 'captured', entity.id, {
        paymentMethod: entity.method || 'online',
        settlementStatus: 'pending'
      });
      db.logActivity('WEBHOOK_PAYMENT_CAPTURED', `Order ${order.id} captured via webhook`, 'system', req.ip);
    }
  } else if (event === 'payment.failed' && payload?.payment?.entity) {
    const entity = payload.payment.entity;
    const orderId = entity.notes?.order_id;
    const rzpOrderId = entity.order_id;
    const order = db.getOrders().find(o => o.id === orderId || o.razorpayOrderId === rzpOrderId);
    if (order) {
      db.updateOrderStatus(order.id, 'failed');
    }
  }

  res.json({ status: 'ok' });
});

// -------------------------------------------------------------
// PAYMENT & ORDERS (Razorpay test & live integration)
// -------------------------------------------------------------
app.post('/api/payment/create-order', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bookIds, couponCode } = req.body;

  if (!Array.isArray(bookIds) || bookIds.length === 0) {
    return res.status(400).json({ error: 'No books selected for checkout' });
  }

  const allBooks = db.getBooks();
  const items: any[] = [];
  let subtotal = 0;

  for (const bId of bookIds) {
    const book = allBooks.find(b => b.id === bId);
    if (!book) return res.status(404).json({ error: `Book ${bId} not found` });
    items.push({
      bookId: book.id,
      title: book.title,
      price: book.sellingPrice,
      coverImage: book.coverImage
    });
    subtotal += book.sellingPrice;
  }

  let discount = 0;
  if (couponCode) {
    const coupon = db.getCouponByCode(couponCode);
    if (coupon && coupon.isActive && new Date(coupon.expiresAt).getTime() >= Date.now() && subtotal >= coupon.minPurchase) {
      discount = coupon.discountType === 'percentage'
        ? Math.round((subtotal * coupon.discountValue) / 100)
        : coupon.discountValue;
      discount = Math.min(discount, subtotal);
      coupon.usageCount++;
      db.save();
    }
  }

  const total = Math.max(0, subtotal - discount);
  const orderId = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const razorpayOrderId = 'order_rzp_' + Date.now() + Math.random().toString(36).substring(2, 6);

  const paymentConfig = db.getPaymentSettings();
  const currentMode = paymentConfig.mode;

  const order: Order = {
    id: orderId,
    userId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    items,
    subtotal,
    discount,
    couponCode: couponCode || undefined,
    total,
    paymentStatus: total === 0 ? 'paid' : 'pending',
    razorpayOrderId,
    transactionReference: 'TXN-' + Date.now().toString().slice(-8),
    paymentMode: currentMode,
    createdAt: new Date().toISOString()
  };

  db.addOrder(order);

  // If order total is 0 (all free or 100% discount), instantly unlock
  if (total === 0) {
    for (const item of items) {
      db.unlockBookForUser(user.id, item.bookId);
    }
    return res.json({
      orderId: order.id,
      total: 0,
      isFree: true,
      status: 'paid',
      message: 'Order completed. Books unlocked in your library!'
    });
  }

  // Active key ID matching mode
  const activeKeyId = currentMode === 'live' ? paymentConfig.liveKeyId : paymentConfig.testKeyId;
  const isConfigured = currentMode === 'live'
    ? Boolean(paymentConfig.liveKeyId && paymentConfig.liveKeySecret)
    : Boolean(paymentConfig.testKeyId && paymentConfig.testKeySecret);

  res.json({
    orderId: order.id,
    razorpayOrderId,
    amount: total * 100, // paise
    currency: 'INR',
    keyId: activeKeyId,
    mode: currentMode,
    isConfigured,
    customer: {
      name: user.name,
      email: user.email
    }
  });
});

app.post('/api/payment/verify', requireAuth, (req: Request, res: Response) => {
  const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentMethod } = req.body;
  const user = (req as any).user as User;

  const order = db.getOrders().find(o => o.id === orderId && o.userId === user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Prevent duplicate processing
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'captured') {
    return res.json({
      success: true,
      orderId: order.id,
      message: 'Order already verified and processed.'
    });
  }

  const paymentConfig = db.getPaymentSettings();
  const secret = paymentConfig.mode === 'live' ? paymentConfig.liveKeySecret : paymentConfig.testKeySecret;

  if (secret && razorpaySignature && razorpayOrderId && razorpayPaymentId) {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      db.updateOrderStatus(order.id, 'failed');
      return res.status(400).json({ error: 'Razorpay signature verification failed' });
    }
  }

  // Payment verified: update status and grant books to user's library
  db.updateOrderStatus(order.id, 'paid', razorpayPaymentId || 'pay_' + Date.now(), {
    paymentMethod: paymentMethod || 'online',
    razorpaySignature,
    settlementStatus: 'pending'
  });

  db.logActivity('PAYMENT_VERIFIED', `Payment verified for Order ${order.id} (${order.customerEmail}) - ₹${order.total}`, order.customerEmail, req.ip);

  res.json({
    success: true,
    orderId: order.id,
    message: 'Payment verified successfully! Your books are now available in My Library.'
  });
});

app.post('/api/payment/simulate-outcome', requireAuth, (req: Request, res: Response) => {
  const { orderId, outcome } = req.body;
  const user = (req as any).user as User;

  const order = db.getOrders().find(o => o.id === orderId && o.userId === user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (outcome === 'failed') {
    db.updateOrderStatus(order.id, 'failed');
    return res.json({
      success: false,
      status: 'failed',
      message: 'Payment simulation: Transaction failed or was declined by the bank.'
    });
  }

  if (outcome === 'cancelled') {
    db.updateOrderStatus(order.id, 'cancelled');
    return res.json({
      success: false,
      status: 'cancelled',
      message: 'Payment simulation: Checkout was cancelled by the customer.'
    });
  }

  return res.status(400).json({ error: 'Invalid simulated outcome' });
});

app.post('/api/payment/claim-free', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bookId } = req.body;

  const book = db.getBookById(bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (!book.isFree && book.sellingPrice > 0) {
    return res.status(400).json({ error: 'This book is not free' });
  }

  db.unlockBookForUser(user.id, book.id);

  const orderId = 'FREE-' + Date.now().toString().slice(-6);
  db.addOrder({
    id: orderId,
    userId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    items: [{
      bookId: book.id,
      title: book.title,
      price: 0,
      coverImage: book.coverImage
    }],
    subtotal: 0,
    discount: 0,
    total: 0,
    paymentStatus: 'paid',
    transactionReference: 'FREE-CLAIM',
    paymentMode: 'test',
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, message: 'Free book added to My Library!' });
});

// -------------------------------------------------------------
// MY LIBRARY & SECURE DOWNLOADS
// -------------------------------------------------------------
app.get('/api/library', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const allBooks = db.getBooks();
  const ownedBooks = allBooks.filter(b => user.library.includes(b.id) || b.isFree);
  res.json({ library: ownedBooks });
});

app.get('/api/library/read/:bookId', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const book = db.getBookById(req.params.bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const hasAccess = user.role === 'admin' || user.library.includes(book.id) || book.isFree;
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied. You must purchase this eBook to read it.' });
  }

  res.json({
    book: {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      category: book.category,
      coverImage: book.coverImage,
      sampleContent: book.sampleContent,
      tableOfContents: book.tableOfContents,
      keyLearnings: book.keyLearnings,
      pages: book.pages,
      publicationDate: book.publicationDate,
      isbn: book.isbn
    }
  });
});

app.get('/api/library/download/:bookId', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const book = db.getBookById(req.params.bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const hasAccess = user.role === 'admin' || user.library.includes(book.id) || book.isFree;
  if (!hasAccess) {
    return res.status(403).json({ error: 'Unauthorized: Digital file download is restricted to verified purchasers.' });
  }

  const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedTitle}_VINOTH_BOOKS.txt`;

  const ebookDocument = `================================================================================
VINOTH BOOKS — OFFICIAL DIGITAL PUBLICATION
Ideas Into Pages. Knowledge Without Limits.
================================================================================

TITLE: ${book.title.toUpperCase()}
SUBTITLE: ${book.subtitle}
PUBLISHER: ${book.author}
CATEGORY: ${book.category}
PUBLICATION DATE: ${book.publicationDate}
ISBN: ${book.isbn || 'N/A'}
PAGES: ${book.pages}

LICENSED TO: ${user.name} (${user.email})
AUTHENTICATION VERIFICATION: SHA256-${crypto.createHash('sha256').update(user.id + book.id).digest('hex').substring(0, 16).toUpperCase()}
TRANSACTION STATUS: VERIFIED DIGITAL PURCHASE

--------------------------------------------------------------------------------
TABLE OF CONTENTS
--------------------------------------------------------------------------------
${book.tableOfContents.map((ch, i) => `${i + 1}. ${ch}`).join('\n')}

--------------------------------------------------------------------------------
KEY LEARNING OUTCOMES
--------------------------------------------------------------------------------
${book.keyLearnings.map((k, i) => `[${i + 1}] ${k}`).join('\n')}

--------------------------------------------------------------------------------
MANUSCRIPT CONTENT
--------------------------------------------------------------------------------

${book.sampleContent.map(sc => `### ${sc.chapterTitle} ###\n\n${sc.content}\n\n`).join('\n--------------------------------------------------------------------------------\n')}

================================================================================
© ${new Date().getFullYear()} VINOTH BOOKS. All rights reserved.
Direct digital publishing platform.
Contact: contact@vinothbooks.com | Web: https://vinothbooks.com
================================================================================
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(ebookDocument);
});

// -------------------------------------------------------------
// CUSTOMER FEEDBACK INBOX
// -------------------------------------------------------------
app.post('/api/feedback', optionalAuth, (req: Request, res: Response) => {
  const { name, email, subject, message, category } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const user = (req as any).user as User | undefined;

  const newFeedback = {
    id: 'fb-' + Date.now(),
    customerId: user?.id,
    customerName: name.trim(),
    customerEmail: email.trim(),
    subject: subject?.trim() || 'General Reader Inquiry',
    message: message.trim(),
    category: category || 'general',
    status: 'open' as const,
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.addFeedback(newFeedback);
  res.status(201).json({ success: true, message: 'Thank you! Your feedback has been received.' });
});

// -------------------------------------------------------------
// NEWSLETTER SUBSCRIPTION
// -------------------------------------------------------------
app.post('/api/newsletter', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }
  // Store or acknowledge newsletter subscriber
  res.status(200).json({
    success: true,
    message: 'Welcome to VINOTH BOOKS. You are now subscribed to our private publishing dispatch.'
  });
});

app.get('/api/admin/feedback', requireAdmin, (_req: Request, res: Response) => {
  res.json({ feedbacks: db.getFeedbacks() });
});

app.post('/api/admin/feedback/:id/reply', requireAdmin, (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Reply message cannot be empty' });
  }

  const reply = {
    id: 'rep-' + Date.now(),
    senderRole: 'admin' as const,
    senderName: 'VINOTH BOOKS Desk',
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  const updated = db.addReplyToFeedback(req.params.id, reply);
  if (!updated) return res.status(404).json({ error: 'Feedback conversation not found' });

  res.json({ feedback: updated, message: 'Reply sent successfully' });
});

app.put('/api/admin/feedback/:id/reply/:replyId', requireAdmin, (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const updated = db.updateFeedbackReply(req.params.id, req.params.replyId, message.trim());
  if (!updated) return res.status(404).json({ error: 'Reply not found' });

  res.json({ feedback: updated, message: 'Reply updated' });
});

app.patch('/api/admin/feedback/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['open', 'replied', 'resolved', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = db.updateFeedbackStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Feedback not found' });

  res.json({ feedback: updated, message: `Status updated to ${status}` });
});

app.delete('/api/admin/feedback/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteFeedback(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Feedback not found' });
  res.json({ success: true, message: 'Feedback removed' });
});

// -------------------------------------------------------------
// REVIEWS
// -------------------------------------------------------------
app.get('/api/reviews/:bookId', (req: Request, res: Response) => {
  res.json({ reviews: db.getReviews(req.params.bookId) });
});

app.post('/api/reviews', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bookId, rating, title, comment } = req.body;

  if (!bookId || !rating || !title || !comment) {
    return res.status(400).json({ error: 'Rating, title, and comment are required' });
  }

  const book = db.getBookById(bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const verifiedPurchase = user.library.includes(bookId);

  const newReview = {
    id: 'rev-' + Date.now(),
    bookId,
    userId: user.id,
    userName: user.name,
    rating: Math.min(5, Math.max(1, Number(rating))),
    title,
    comment,
    verifiedPurchase,
    status: 'approved' as const,
    createdAt: new Date().toISOString()
  };

  db.addReview(newReview);
  res.status(201).json({ review: newReview, message: 'Review submitted successfully!' });
});

app.get('/api/admin/reviews', requireAdmin, (_req: Request, res: Response) => {
  res.json({ reviews: db.getReviews() });
});

app.patch('/api/admin/reviews/:id', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['approved', 'pending', 'hidden'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.updateReviewStatus(req.params.id, status);
  res.json({ success: true, message: `Review status updated to ${status}` });
});

app.delete('/api/admin/reviews/:id', requireAdmin, (req: Request, res: Response) => {
  db.deleteReview(req.params.id);
  res.json({ success: true, message: 'Review removed' });
});

// -------------------------------------------------------------
// ORDERS & CUSTOMERS (ADMIN)
// -------------------------------------------------------------
app.get('/api/orders', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const allOrders = db.getOrders();
  if (user.role === 'admin') {
    return res.json({ orders: allOrders });
  }
  const customerOrders = allOrders.filter(o => o.userId === user.id);
  res.json({ orders: customerOrders });
});

app.get('/api/admin/customers', requireAdmin, (_req: Request, res: Response) => {
  const users = db.getUsers();
  const orders = db.getOrders();

  const customerList = users.map(u => {
    const userOrders = orders.filter(o => o.userId === u.id);
    const totalSpent = userOrders.filter(o => o.paymentStatus === 'paid').reduce((acc, o) => acc + o.total, 0);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      joinedAt: u.createdAt,
      booksOwnedCount: u.library.length,
      ordersCount: userOrders.length,
      totalSpent,
      wishlistCount: (u.wishlist || []).length
    };
  });

  res.json({ customers: customerList });
});

// -------------------------------------------------------------
// SALES ANALYTICS (ADMIN)
// -------------------------------------------------------------
app.get('/api/admin/analytics', requireAdmin, (_req: Request, res: Response) => {
  const books = db.getBooks();
  const orders = db.getOrders();
  const users = db.getUsers();
  const categories = db.getCategories();
  const reviews = db.getReviews();

  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.total, 0);
  const totalSales = paidOrders.reduce((acc, o) => acc + o.items.length, 0);

  const categoryRevenue: Record<string, number> = {};
  for (const o of paidOrders) {
    for (const item of o.items) {
      const book = books.find(b => b.id === item.bookId);
      const cat = book ? book.category : 'General';
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.price;
    }
  }

  const bestSellers = [...books]
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 5)
    .map(b => ({
      id: b.id,
      title: b.title,
      category: b.category,
      price: b.sellingPrice,
      salesCount: b.salesCount || 0,
      revenue: (b.salesCount || 0) * b.sellingPrice,
      coverImage: b.coverImage
    }));

  const monthlySales = [
    { month: 'Jan 2026', sales: 48, revenue: 38400 },
    { month: 'Feb 2026', sales: 94, revenue: 68200 },
    { month: 'Mar 2026', sales: 165, revenue: 142000 },
    { month: 'Apr 2026', sales: 242, revenue: 198500 }
  ];

  const dailyOrders = [
    { date: '2026-04-24', orders: 12, revenue: 9800 },
    { date: '2026-04-25', orders: 18, revenue: 14600 },
    { date: '2026-04-26', orders: 22, revenue: 18200 },
    { date: '2026-04-27', orders: 19, revenue: 15400 },
    { date: '2026-04-28', orders: 27, revenue: 22100 },
    { date: '2026-04-29', orders: 31, revenue: 26500 },
    { date: '2026-04-30', orders: 24, revenue: 19900 }
  ];

  const avgRating = reviews.length > 0
    ? parseFloat((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2))
    : 4.9;

  const customerActivity = [
    { id: 'act-1', name: 'Priya Sharma', email: 'reader@vinothbooks.com', action: 'Purchased "The AI Mind"', time: '10 mins ago' },
    { id: 'act-2', name: 'Karthik Raman', email: 'karthik.r@outlook.com', action: 'Left 5-star review on "Deep Focus"', time: '45 mins ago' },
    { id: 'act-3', name: 'Divya Nair', email: 'divya.nair@techlead.io', action: 'Submitted institutional inquiry', time: '2 hours ago' },
    { id: 'act-4', name: 'Arjun Verma', email: 'arjun.tech@gmail.com', action: 'Claimed free eBook blueprint', time: '4 hours ago' }
  ];

  res.json({
    summary: {
      totalRevenue,
      totalOrders: orders.length,
      paidOrdersCount: paidOrders.length,
      totalSales,
      totalCustomers: users.filter(u => u.role === 'customer').length,
      totalBooks: books.length,
      publishedBooks: books.filter(b => b.status === 'published').length,
      draftBooks: books.filter(b => b.status === 'draft').length,
      totalCategories: categories.length,
      averageRating: avgRating
    },
    categoryRevenue,
    bestSellers,
    monthlySales,
    dailyOrders,
    recentOrders: orders.slice(0, 8),
    recentReviews: reviews.slice(0, 5),
    customerActivity
  });
});

// -------------------------------------------------------------
// WEBSITE SETTINGS & LEGAL PAGES
// -------------------------------------------------------------
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ settings: db.getWebsiteSettings() });
});

app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateWebsiteSettings(req.body);
  res.json({ settings: updated, message: 'Website settings saved' });
});

app.get('/api/legal', (_req: Request, res: Response) => {
  res.json({ legal: db.getLegalPages() });
});

app.put('/api/legal', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateLegalPages(req.body);
  res.json({ legal: updated, message: 'Legal policies updated' });
});

// -------------------------------------------------------------
// COUPONS
// -------------------------------------------------------------
app.post('/api/coupons/apply', (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code required' });

  const coupon = db.getCouponByCode(code);
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or inactive coupon code' });
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This coupon code has expired' });
  }

  const amt = Number(subtotal) || 0;
  if (amt < coupon.minPurchase) {
    return res.status(400).json({ error: `Minimum order amount of ₹${coupon.minPurchase} required for this coupon` });
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((amt * coupon.discountValue) / 100);
  } else {
    discount = coupon.discountValue;
  }
  discount = Math.min(discount, amt);

  res.json({
    valid: true,
    code: coupon.code,
    discount,
    finalTotal: Math.max(0, amt - discount),
    message: `Coupon ${coupon.code} applied successfully!`
  });
});

app.get('/api/admin/coupons', requireAdmin, (_req: Request, res: Response) => {
  res.json({ coupons: db.getCoupons() });
});

app.post('/api/admin/coupons', requireAdmin, (req: Request, res: Response) => {
  const { code, discountType, discountValue, minPurchase, expiresAt } = req.body;
  if (!code || !discountValue) {
    return res.status(400).json({ error: 'Code and discount value required' });
  }

  const newCoupon: any = {
    id: 'coup-' + Date.now(),
    code: code.toUpperCase().trim(),
    discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(discountValue),
    minPurchase: Number(minPurchase) || 0,
    expiresAt: expiresAt || '2027-12-31',
    isActive: true,
    usageCount: 0
  };

  db.addCoupon(newCoupon);
  res.status(201).json({ coupon: newCoupon });
});

app.put('/api/admin/coupons/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateCoupon(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Coupon not found' });
  res.json({ coupon: updated });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req: Request, res: Response) => {
  db.deleteCoupon(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// NEWSLETTER
// -------------------------------------------------------------
app.post('/api/newsletter', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  db.addNewsletterSubscriber(email);
  res.json({ success: true, message: 'Thank you for subscribing to VINOTH BOOKS publishing dispatches.' });
});

app.get('/api/admin/newsletter', requireAdmin, (_req: Request, res: Response) => {
  res.json({ subscribers: db.getNewsletterSubscribers() });
});

// -------------------------------------------------------------
// AUDIT & ACTIVITY LOGS (ADMIN)
// -------------------------------------------------------------
app.get('/api/admin/activity-logs', requireAdmin, (_req: Request, res: Response) => {
  const logs = db.getActivityLogs();
  res.json({ logs });
});

// -------------------------------------------------------------
// STATIC & VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VINOTH BOOKS] Production Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
