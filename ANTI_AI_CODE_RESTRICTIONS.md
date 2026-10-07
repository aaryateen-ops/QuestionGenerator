# 🚫 ANTI_AI_CODE_RESTRICTIONS.md
### Strict Guidelines to Eliminate AI Hallmarks & Ensure Human-Grade Craftsmanship

This document establishes non-negotiable rules. Any pattern commonly produced by automated code generators or naive LLM prompts is **strictly forbidden**. Everything built in this project must reflect the taste, pragmatism, and discipline of a seasoned Principal Engineer.

---

## 1. Code Comments & Documentation

| ❌ Strictly Forbidden (AI Clichés) | ✅ Mandatory Standard (Senior Human Engineer) |
|---|---|
| Redundant "what" comments: <br>`// Import express`<br>`// Function to generate question paper`<br>`// Set state of loading to true` | Write self-documenting code with meaningful variable and function names. Only use comments to explain **"why"** (architectural rationale, business constraints, non-obvious algorithmic trade-offs). |
| Header comments on every file: <br>`/** Author: AI, Date: Today, File: user.js **/` | Clean file heads without auto-generated noise. |
| Commented-out dead code or abandoned debug blocks left behind. | No dead code. Clean Git commits track history; files stay pristine. |

---

## 2. Frontend, UI Design & Aesthetic Realism

| ❌ Strictly Forbidden (AI Clichés) | ✅ Mandatory Standard (Senior Human Engineer) |
|---|---|
| **The "Purple AI Gradient Syndrome":**<br>`bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600`, glowing neon borders, random glassmorphism `backdrop-blur-md bg-white/10`. | **Institutional, High-Utility Enterprise Palette:**<br>Clean slate/zinc neutrals (`#0f172a`, `#1e293b`, `#f8fafc`), deep navy/indigo accents, crisp borders (`border-slate-200 / 800`), and thoughtful typography designed for reading density. |
| **Cheesy AI Marketing Buzzwords:**<br>*"Supercharge your exam generation with revolutionary cutting-edge AI power"* on headers. | **Real Academic Terminology:**<br>*"Question Paper Composer"*, *"Bloom's Taxonomy Cognitive Distribution"*, *"Course Outcome (CO) Mapping & OBE Attainment"*, *"Master Question Repository"*. |
| **Identical 3-Column Floating Cards:**<br>Three cards with `hover:scale-105 transition-all duration-300` and oversized generic Lucide icons. | **Functional Academic Layouts:**<br>Data tables with sorting/filtering, split-pane exam previewers, collapsible question banks, sticky paper summary bars showing live mark distribution. |
| **Unprintable Paper Layouts:**<br>Web-only cards that look awful when printed. | **Pixel-Perfect Print Style (`@media print`):**<br>Conforms to university examination paper standards (Standard header, Regulation code, Question tabular layout, Marks, Bloom Level, Course Outcome columns, Page breaks). |

---

## 3. Backend Architecture & Code Structure

| ❌ Strictly Forbidden (AI Clichés) | ✅ Mandatory Standard (Senior Human Engineer) |
|---|---|
| **The "God File" Monolith:**<br>Dumping 1,000 lines in `server.js` or `app.py` containing routes, database logic, schemas, and helpers all mashed together. | **Domain-Driven Modular Separation:**<br>`/controllers`, `/services`, `/repositories` (or `/db`), `/routes`, `/validators`, `/middlewares`, `/utils`. Every file has one clear responsibility. |
| **Copy-Paste Try/Catch:**<br>Writing `try { ... } catch (err) { res.status(500).json({ message: err.message }) }` identically on 25 endpoints. | **Centralized Error Handling:**<br>Custom domain error hierarchy (`AppError`, `NotFoundError`, `ValidationError`, `ConflictError`), centralized error middleware, and consistent structured JSON error responses. |
| **Hardcoded Environment Config:**<br>`const PORT = 5000; const SECRET = "mysecret123";` directly in source files. | **Strict Configuration Schema:**<br>Environment variables loaded and validated on startup (`zod` or strict schema). Server fails fast if required environment variables are missing. |

---

## 4. NLP & Algorithmic Authenticity

| ❌ Strictly Forbidden (AI Clichés) | ✅ Mandatory Standard (Senior Human Engineer) |
|---|---|
| **Fake "AI" Stubs:**<br>Using `Math.random() > 0.5 ? "Apply" : "Remember"` or hardcoded random confidence scores like `0.942`. | **Real NLP & Cognitive Classification Engine:**<br>Real text tokenization, lemmatization, part-of-speech (POS) tagging, Bloom's cognitive action-verb mapping (Anderson & Krathwohl taxonomy), and confidence calculation based on linguistic cues. |
| **Naive Random Selection:**<br>Just picking questions randomly and hoping marks match the total. | **Constraint-Satisfaction Paper Composer:**<br>Deterministic backtracking / dynamic programming algorithm that guarantees exact marks, balanced Bloom's taxonomy proportions, uniform unit coverage, and internal choice requirements. |

---

## 5. Database & Data Integrity

| ❌ Strictly Forbidden (AI Clichés) | ✅ Mandatory Standard (Senior Human Engineer) |
|---|---|
| Storing everything as unindexed, unstructured JSON strings in SQL tables. | Fully normalized relational schema with primary keys, foreign keys with explicit `ON DELETE CASCADE/RESTRICT`, and composite indexes on search columns (`subject_id`, `bloom_level`, `difficulty`, `unit`). |
| Unrealistic fake data: `"Question 1", "Lorem ipsum dolor", "John Doe"`. | Authentic academic engineering datasets (e.g., Computer Science / AI subjects like *Data Structures*, *Database Management Systems*, *Machine Learning*, *Operating Systems*) with genuine exam questions, proper marks, and realistic CO statements. |

---

## 6. Frontend State & Engineering Rigor

| ❌ Strictly Forbidden (AI Clichés) | ✅ Mandatory Standard (Senior Human Engineer) |
|---|---|
| Infinite re-renders or missing dependency arrays in `useEffect`. | Predictable, idiomatic state handling. Dedicated hooks or stores for business logic. |
| Primitive browser `alert()` or `prompt()` calls for user interactions. | Accessible modals, confirmation dialogs, and non-blocking toast notifications. |
| Silent empty states or unhandled network failures. | Polished loading skeletons, intuitive zero-data empty states with action buttons, and descriptive network error banners. |
