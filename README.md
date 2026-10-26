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

**For everyday use and project explanation:** double-click `START_PROJECT.bat`. It checks/starts the servers and opens both the app and `PROJECT_GUIDE.html` in your browser. The standalone guide includes architecture, the demo sequence, viva answers and optional Hinglish speaking notes. Use `OPEN_PROJECT_GUIDE.bat` to open only the guide without starting servers.

### Option 1: Quick Launch (All-in-One)
Double-click:
```bat
start_all.bat
```

The launcher creates a dedicated Python 3.11 environment in `backend/.venv`, installs the pinned dependency lockfile, and waits for a healthy backend before launching the frontend. Run `powershell -File scripts/start.ps1 -Target setup` once to prepare dependencies separately. See [startup, backup and restore instructions](docs/operations.md).

### Option 2: Run Separately in Terminals
**Terminal 1 (Backend):**
```powershell
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```
Web Studio URL: `http://localhost:5173`

## Access and academic approval

Sign-in is required for course, question, paper, upload and AI operations. Administrators assign faculty to courses under **Faculty & Users → Course assignments**. Public registration creates an unassigned faculty account; it cannot create administrators. New administrator accounts require an existing administrator or the private bootstrap command `.\.venv\Scripts\python.exe -m app.db.bootstrap_admin`, run after `cd backend`.

Source configuration defaults to `DEMO_MODE=false`. This existing local installation explicitly opts into `DEMO_MODE=true` in its ignored `.env` so its demo accounts remain available through deliberate sign-in. Never deploy demo mode: `ENVIRONMENT=production` requires a private random `SECRET_KEY` of at least 32 characters and rejects demo mode. Development generates a persistent private key in ignored `backend/.local/signing.key`. Default-password demo accounts are disabled outside demo mode; accounts whose passwords have changed are preserved.

New and existing questions start as **Draft**. Faculty review the content, formulas and answer keys, add a reviewer comment, and mark questions **Reviewed**. Administrators can then mark them **Approved**. The paper composer and replacement selector use only approved questions. Editing content or changing syllabus mappings returns a question to draft; unchanged updates preserve its approval. Review decisions retain content snapshots in the history panel. Existing saved papers remain readable, with quality checks flagging unapproved or changed repository versions.

The repository has server pagination, review filters, batch review, exact duplicate prevention and advisory similar-question checks over the latest 1,000 course entries. Gemini keys entered in the UI are session-only and cleared on account switches; key validation never overwrites shared backend credentials. Template output is explicitly labelled as requiring academic review.

---

## Snap & Scan physical copies

In **Question Synthesizer → Scan Physical Copy**, capture or upload a JPEG, PNG, WebP, or HEIC under 10 MB. Review and rotate the photo, then choose **Extract questions from photo** or **Generate new similar questions**. Review the editable text and rendered formulas before saving. Missing extracted MCQ answer keys require faculty confirmation; the scanner never fills in a default answer.

In **Question Repository → Add Question → Manual Entry**, **Scan Copy** fills the first extracted question into the form, including marks, Bloom level, options, and suggested unit/CO. Use the synthesizer to review all questions from a multi-question page. Scans create drafts; repository writes happen only when you save.

Scanning requires a Gemini key from the existing settings panel or the backend `GEMINI_API_KEY` environment variable. `GEMINI_VISION_MODEL` defaults to `gemini-2.5-flash` and can select another compatible vision model. The endpoint is `POST /api/v1/nlp/scan-image` (multipart form). HEIC decoding, MIME/content checks, a 25 megapixel limit, and bounded reads run before provider processing. Camera access needs HTTPS or localhost; file upload remains available when permission is denied.

All explicit math delimiters are normalized to `$...$` without rewriting formula contents. Ambiguous, malformed, truncated, or unreadable responses fail with actionable errors rather than procedural substitutes. Instructors should verify OCR against the photo; model output cannot guarantee perfect transcription. Image data is sent inline to Google's Gemini API and is not stored by this application. See [Gemini image input documentation](https://ai.google.dev/gemini-api/docs/image-understanding).

## 🧪 Running the Automated Verification Suite

To execute the NLP benchmark suite, scan and ingestion tests, and constraint solver tests:
```powershell
$env:PYTHONPATH="d:\All Project of AntiGravity\Question Generator Project\backend"
backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```
The suite covers Bloom classification, paper composition, image validation and vision responses, syllabus mapping, and PDF/DOCX ingestion.
