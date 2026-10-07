# AI-Powered Intelligent Question Paper Generator
### With Bloom's Taxonomy Classification & Course Outcome Mapping

Built according to production engineering principles outlined in [`DEVELOPER_DANNY.md`](file:///d:/All%20Project%20of%20AntiGravity/Question%20Generator%20Project/DEVELOPER_DANNY.md) and [`ANTI_AI_CODE_RESTRICTIONS.md`](file:///d:/All%20Project%20of%20AntiGravity/Question%20Generator%20Project/ANTI_AI_CODE_RESTRICTIONS.md).

---

## 🎯 System Overview

Educational assessment software that automates university examination paper creation while ensuring strict **Outcome-Based Education (OBE)** compliance and cognitive balance according to the **Revised Bloom's Taxonomy** (Anderson & Krathwohl).

### Core Capabilities:
1. **Linguistic NLP Bloom Classifier Engine (`app/engine/bloom_classifier.py`):**
   - Extracts root action verbs and keyphrases from raw question stems.
   - Categorizes questions into Bloom's 6 cognitive levels: **L1 Remember, L2 Understand, L3 Apply, L4 Analyze, L5 Evaluate, L6 Create**.
   - Resolves compound question stems (e.g. *"Explain and calculate..."*) using cognitive priority heuristics.
   - Provides confidence scores ($0.0 - 1.0$) and human-readable explainability rationale.
2. **Automated Course Outcome (CO) Engine (`app/engine/co_mapper.py`):**
   - Matches question text against syllabus units and Course Outcome learning objectives.
3. **Combinatorial Paper Composer (`app/engine/paper_composer.py`):**
   - Solves multi-constraint examination blueprints:
     - **Autonomous End-Semester (70 Marks):** Part A (10 questions $\times$ 2M = 20M compulsory) + Part B (5 questions $\times$ 10M = 50M with internal choice `Either/Or` per unit).
     - **Mid-Semester Internal (30 Marks):** Part A (5 $\times$ 2M = 10M) + Part B (2 $\times$ 10M = 20M).
   - Guarantees exact marks total, uniform unit coverage, target Bloom percentages, and zero question duplication.
4. **Interactive Question Swapper:**
   - Real-time search for compatible alternative questions from the repository matching the exact unit and marks.
   - One-click in-place replacement with instant re-calculation of Bloom and CO attainment analytics.
5. **Print-Ready Academic Layout (`@media print`):**
   - Conforms to standard university examination sheets (Institution header, register number box, time allowed, max marks, question table with `[CO]` and `[BL]` indicators).

---

## 🏗️ Technical Architecture

```
Question Generator Project/
├── backend/
│   ├── app/
│   │   ├── api/                 # REST Endpoints (subjects, questions, nlp, papers)
│   │   ├── core/                # Configuration, logging, exception classes
│   │   ├── db/                  # SQLite session, authentic engineering seed dataset
│   │   ├── engine/              # NLP Bloom Classifier, CO Mapper, Paper Composer
│   │   ├── models/              # SQLAlchemy 2.0 normalized relational entities
│   │   ├── schemas/             # Pydantic validation DTOs
│   │   └── main.py              # FastAPI application with CORS and error handlers
│   ├── tests/
│   │   ├── test_bloom_classifier.py # Benchmark suite (29 test cases, 100% pass)
│   │   └── test_paper_composer.py   # Constraint satisfaction & deduplication tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # API client
│   │   ├── components/
│   │   │   ├── Header.jsx           # Topbar with role switcher (Admin / Faculty)
│   │   │   ├── DashboardView.jsx    # Analytics & syllabus inventory
│   │   │   ├── NLPInspectorView.jsx # Live NLP laboratory & explainability
│   │   │   ├── QuestionBankView.jsx # Search, filter, CRUD & bulk import
│   │   │   ├── ExamComposerView.jsx # Blueprint builder with Bloom sliders
│   │   │   ├── PaperStudioView.jsx  # Paper preview with question swapper
│   │   │   └── PrintableExamView.jsx# University examination printable format
│   │   ├── App.jsx
│   │   └── index.css            # Tailwind CSS v4 & @media print styles
│   └── package.json
├── run_backend.bat              # Starts FastAPI server on port 8000
├── run_frontend.bat             # Starts Vite server on port 5173
└── start_all.bat                # Launches full stack concurrently
```

---

## 🚀 How to Run the Application

### Option 1: Quick Launch (All-in-One)
Double-click:
```bat
start_all.bat
```

### Option 2: Run Separately in Terminals
**Terminal 1 (Backend):**
```powershell
cd backend
$env:PYTHONPATH="."
py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```
Web Studio URL: `http://localhost:5173`

---

## 🧪 Running the Automated Verification Suite
To execute the NLP benchmark suite and constraint solver tests:
```powershell
$env:PYTHONPATH="d:\All Project of AntiGravity\Question Generator Project\backend"
py -3.14 -m pytest backend/tests -v
```
**Results:** `29 passed in 0.34s` (100% success rate).
