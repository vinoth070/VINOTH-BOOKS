import { Book, Category } from '../types';

export const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "cat-ai",
    name: "Artificial Intelligence",
    slug: "artificial-intelligence",
    description: "Cutting-edge publications on machine learning, autonomous systems, and neural architectures.",
    bookCount: 1
  },
  {
    id: "cat-focus",
    name: "Deep Work & Productivity",
    slug: "deep-work-productivity",
    description: "Mastery manuals on concentration, intentional living, and cognitive stamina.",
    bookCount: 1
  },
  {
    id: "cat-wealth",
    name: "Wealth & Independent Business",
    slug: "wealth-business",
    description: "Battle-tested frameworks for compounding capital, digital assets, and sovereign cash flow.",
    bookCount: 1
  }
];

export const FALLBACK_BOOKS: Book[] = [
  {
    id: "book-ai-mind",
    title: "The AI Mind: Architecture of Tomorrow",
    subtitle: "Designing Human-Centered Intelligent Systems and Autonomous Workflows",
    author: "VINOTH BOOKS Publishing",
    shortDescription: "The definitive blueprint for understanding, orchestrating, and building real-world AI applications with clarity and precision.",
    fullDescription: "In \"The AI Mind: Architecture of Tomorrow\", this volume dismantles the noise and hype surrounding artificial intelligence to deliver an actionable, first-principles handbook. Written for engineers, founders, and knowledge workers, this book details how autonomous agents, reasoning loops, and multi-modal models can be harnessed to solve tangible problems without compromising human agency.",
    category: "Artificial Intelligence",
    coverImage: "/src/assets/images/book_cover_ai_revolution_1793365303535.jpg",
    originalPrice: 1299,
    sellingPrice: 799,
    language: "English",
    pages: 312,
    isbn: "978-93-5467-101-2",
    publicationDate: "2026-04-15",
    tags: ["AI", "Architecture", "Agents", "Technology", "Deep Learning"],
    featured: true,
    bestSeller: true,
    isFree: false,
    status: "published",
    keyLearnings: [
      "Understand foundational LLM cognitive architectures without academic fluff.",
      "Build agentic feedback loops that execute real workflows autonomously.",
      "Design resilient human-in-the-loop validation patterns.",
      "Architect scalable vector pipelines and domain-specific knowledge embeddings."
    ],
    tableOfContents: [
      "Chapter 1: The Transition from Static Code to Cognitive Engines",
      "Chapter 2: Context Windows & Memory Foundations",
      "Chapter 3: Autonomous Agents: The Plan-Execute-Reflect Cycle",
      "Chapter 4: Grounding Models in Real-World Tooling",
      "Chapter 5: Production Invariants & Security Guardrails",
      "Chapter 6: The Sovereign Knowledge Worker in the AI Era"
    ],
    sampleContent: [
      {
        chapterTitle: "Chapter 1: The Transition from Static Code to Cognitive Engines",
        content: "For decades, our relationship with computational machinery was deterministic. We wrote unambiguous syntax: conditional statements, iterative loops, and rigid database schemas. If a circumstance was anticipated, the software responded; if not, it threw an unhandled exception.\n\nArtificial intelligence does not merely accelerate this deterministic paradigm—it replaces brittle rule systems with probabilistic inference. A modern neural architecture does not follow a prescribed recipe; it projects meaning into high-dimensional latent space and navigates towards coherent resolution.\n\nWhen you begin thinking in latent vectors and agentic deliberation rather than procedural step-by-step logic, you stop treating software as a spreadsheet with buttons. You begin treating it as an intellectual collaborator capable of synthesis, adaptation, and unexpected brilliance."
      },
      {
        chapterTitle: "Chapter 2: Context Windows & Memory Foundations",
        content: "The working memory of any cognitive engine is strictly bounded by its context window. Yet human intuition often mistakes raw capacity for comprehension. Just because a model can ingest a million tokens does not mean every token receives equal attentional fidelity.\n\nEffective prompt architecture is fundamentally the art of signal curation. By isolating noise, anchoring relevant facts, and maintaining consistent schemas, we construct environments where inference remains sharp, disciplined, and reliable."
      }
    ],
    salesCount: 482,
    rating: 4.9,
    reviewCount: 38,
    isDemoData: true,
    createdAt: "2026-04-15T10:00:00Z",
    updatedAt: "2026-04-15T10:00:00Z"
  },
  {
    id: "book-deep-focus",
    title: "Deep Focus: The Sovereign Attention Protocol",
    subtitle: "A Systematic Framework for High-Cognitive Output in a Hyper-Distracted Civilization",
    author: "Vinoth",
    shortDescription: "A ruthless elimination framework designed to liberate your intellect from algorithmic slot machines and reclaim sovereign concentration.",
    fullDescription: "Attention is the only irreproducible asset in an era of infinite synthetic media. \"Deep Focus: The Sovereign Attention Protocol\" offers a battle-hardened methodology to escape cognitive fragmentation. Drawing from neuroscience, behavioral economics, and high-performance computing paradigms, Vinoth demonstrates how to engineer environmental friction, eradicate compulsive digital reactivity, and execute hours of uninterrupted creative immersion.",
    category: "Deep Work & Productivity",
    coverImage: "/src/assets/images/book_cover_deep_focus_1793365304657.jpg",
    originalPrice: 999,
    sellingPrice: 599,
    language: "English",
    pages: 256,
    isbn: "978-93-5467-102-9",
    publicationDate: "2026-03-20",
    tags: ["Productivity", "Focus", "Neuroscience", "Mindset", "Deep Work"],
    featured: true,
    bestSeller: false,
    isFree: false,
    status: "published",
    keyLearnings: [
      "Re-sensitize your dopamine receptors through structured digital fasting.",
      "Construct high-friction environmental barricades against micro-interruptions.",
      "Implement the 90-minute Sovereign Immersion Block for high-leverage creative work.",
      "Decouple self-worth from busyness metrics and measure pure cognitive output."
    ],
    tableOfContents: [
      "Chapter 1: The Attention Extractive Economy",
      "Chapter 2: Dopaminergic Homeostasis & The Craving Loop",
      "Chapter 3: Engineering Friction: Architectural Defense",
      "Chapter 4: The 90-Minute Immersion Protocol",
      "Chapter 5: Asynchronous Communication as a Non-Negotiable Standard",
      "Chapter 6: The Long Horizons of Mastery"
    ],
    sampleContent: [
      {
        chapterTitle: "Chapter 1: The Attention Extractive Economy",
        content: "Every notification ping is a bid for your sovereign cognition. Silicon Valley's multi-trillion dollar empires are not software companies—they are attention-mining conglomerates. They employ legions of behavioural psychologists whose sole directive is to maximize time-on-device.\n\nTo assume you can resist this through sheer willpower is naive. Willpower is a depletable biological currency; algorithmic optimization is relentless, tireless, and infinitely parameterized. If you do not actively build walls around your attention, other people's priorities will colonize your life."
      }
    ],
    salesCount: 631,
    rating: 4.8,
    reviewCount: 47,
    isDemoData: true,
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-20T10:00:00Z"
  },
  {
    id: "book-wealth-playbook",
    title: "The Sovereign Wealth Playbook",
    subtitle: "Engineering Asymmetric Returns, Digital Cash Flows, and Generational Autonomy",
    author: "Vinoth",
    shortDescription: "First-principles strategies for escaping the wage trap, capturing digital leverage, and building resilient generational capital.",
    fullDescription: "True wealth is not measured in luxury liabilities—it is measured in the freedom to command your calendar without asking permission. \"The Sovereign Wealth Playbook\" provides an unvarnished masterclass in modern asset ownership. Learn how to transform linear labor into scalable digital products, leverage compounding capital vehicles, protect yourself against inflationary dilution, and construct an unshakeable financial foundation.",
    category: "Wealth & Independent Business",
    coverImage: "/src/assets/images/book_cover_wealth_playbook_1793365306099.jpg",
    originalPrice: 1499,
    sellingPrice: 899,
    language: "English",
    pages: 384,
    isbn: "978-93-5467-103-6",
    publicationDate: "2026-02-10",
    tags: ["Wealth", "Finance", "Investing", "Digital Assets", "Independence"],
    featured: true,
    bestSeller: true,
    isFree: false,
    status: "published",
    keyLearnings: [
      "Differentiate between prestige assets and cash-flow generating instruments.",
      "Harness permissionless digital leverage with zero marginal cost of reproduction.",
      "Execute barbell investment strategies that survive systemic volatility.",
      "Build sovereign personal cash reserves that immunize you against external shocks."
    ],
    tableOfContents: [
      "Chapter 1: The Architecture of True Freedom",
      "Chapter 2: Escaping Linear Wage Dependency",
      "Chapter 3: Digital Products: The Zero Marginal Cost Engine",
      "Chapter 4: Capital Compounding & Barbell Allocations",
      "Chapter 5: Inflationary Protection & Hard Asset Anchors",
      "Chapter 6: The Long Game: Generational Sovereign Capital"
    ],
    sampleContent: [
      {
        chapterTitle: "Chapter 1: The Architecture of True Freedom",
        content: "Most individuals spend their best cognitive decades trading the one asset they will never recover: time. They exchange forty hours of life per week for a fixed bi-weekly remuneration, perpetually constrained by the arithmetic ceiling of their own waking hours.\n\nSovereign wealth begins when you decouple earnings from physical presence. A book written once can be read ten thousand times. Code written once can execute ten million times. When you shift your energy from selling labor to owning scalable equity, everything changes."
      }
    ],
    salesCount: 894,
    rating: 4.9,
    reviewCount: 72,
    isDemoData: true,
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z"
  }
];
