import os
import json
import random
import re
import httpx
from typing import Dict, List, Any, Optional, Tuple
from app.engine.bloom_classifier import BloomClassifierEngine

class LLMQuestionSynthesizer:
    """
    Generative AI Question Synthesizer.
    Empowers the examination platform with generative intelligence
    to create novel, curriculum-aligned, mathematically rigorous examination
    questions on demand for any topic, syllabus unit, lecture notes/PDF text,
    marks weightage, and Bloom's cognitive level.
    
    Supports:
    1. Direct Google Gemini API (gemini-3-flash-preview, gemini-3.5-flash, gemini-flash-latest) integration.
    2. Adaptive Academic Procedural Generator (zero-dependency fallback).
    3. Multiple Question Types: MCQ (with 4 choices & key), SHORT (2M/5M), LONG (10M/16M).
    4. Text & Document Grounding (Syllabus notes, PDFs, or lecture text).
    """

    PROCEDURAL_TEMPLATES: Dict[str, Dict[str, List[str]]] = {
        "L1": {
            "templates": [
                "State the formal definition and fundamental principles of {topic}.",
                "List the core properties and foundational governing laws of {topic}.",
                "Identify the primary characteristics and prerequisite boundary conditions for {topic}.",
                "State four significant real-world or theoretical applications of {topic}."
            ]
        },
        "L2": {
            "templates": [
                "Explain the working mechanism and conceptual framework of {topic} with appropriate illustrations.",
                "Describe the procedural steps and standard methodology associated with {topic}.",
                "Discuss the theoretical significance of {topic} and contrast it with related fundamental concepts.",
                "Illustrate the practical working principle of {topic} using a representative academic example."
            ]
        },
        "L3": {
            "templates": [
                "Calculate the principal parameters and values for a practical problem based on {topic}.",
                "Solve for the unknown quantities by applying the governing formulas and theorems of {topic}.",
                "Demonstrate the step-by-step mathematical or analytical solution for a problem in {topic}.",
                "Apply the core methodologies of {topic} to evaluate the outcome under standard conditions."
            ]
        },
        "L4": {
            "templates": [
                "Analyze the structural trade-offs and operational differences between {topic} and its primary alternatives.",
                "Differentiate between theoretical predictions and empirical behavior in {topic}.",
                "Deconstruct the key factors influencing the stability, efficiency, or accuracy of {topic}.",
                "Compare and critically analyze two alternative approaches commonly used to address {topic}."
            ]
        },
        "L5": {
            "templates": [
                "Critically evaluate the performance trade-offs and potential limitations of applying {topic} in practice.",
                "Justify why specific standard methodologies in {topic} are preferred under rigorous problem constraints.",
                "Assess the error margins and precision requirements associated with analytical models in {topic}.",
                "Defend a chosen methodological formulation for {topic} using established academic benchmarks."
            ]
        },
        "L6": {
            "templates": [
                "Design a comprehensive framework or generalized solution strategy utilizing {topic} to resolve complex scenarios.",
                "Formulate a novel analytical variant or optimized approach based on {topic} to improve efficiency.",
                "Devise an integrated model combining the principles of {topic} with interrelated core curriculum concepts.",
                "Construct an end-to-end procedural strategy leveraging {topic} to optimize academic problem resolution."
            ]
        }
    }

    PROCEDURAL_MCQ_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
        "L1": [
            {
                "stem": "Which of the following statements most accurately defines {topic}?",
                "correct": "A systematic conceptual and analytical framework governed by established domain principles",
                "distractors": [
                    "A purely arbitrary empirical conjecture lacking theoretical validation",
                    "A transient boundary artifact that is universally disregarded in formal analysis",
                    "An unregulated process operating outside standard scientific invariants"
                ]
            },
            {
                "stem": "Identify the primary governing characteristic of {topic}:",
                "correct": "Consistent adherence to underlying theoretical constraints under verified boundary conditions",
                "distractors": [
                    "Unpredictable variance in core properties regardless of initial state",
                    "Total absence of quantifiable parameters or mathematical relationships",
                    "Arbitrary divergence under standard reference conditions"
                ]
            }
        ],
        "L2": [
            {
                "stem": "Explain the foundational mechanism of {topic}. Which explanation correctly characterizes its operation?",
                "correct": "It decomposes complex domain challenges into structured, invariant analytical stages",
                "distractors": [
                    "It bypasses all prerequisite validation stages to force immediate convergence",
                    "It substitutes formal principles with non-reproducible heuristic assumptions",
                    "It eliminates intermediate constraints at the expense of theoretical validity"
                ]
            },
            {
                "stem": "Why is {topic} considered essential within its curriculum domain?",
                "correct": "It optimizes analytical rigor and minimizes redundant recomputation or error",
                "distractors": [
                    "It completely eliminates the necessity for empirical validation across all contexts",
                    "It guarantees zero computational or analytical complexity in all scenarios",
                    "It replaces all existing foundational theories without requiring verification"
                ]
            }
        ],
        "L3": [
            {
                "stem": "Apply the governing equations or rules of {topic} to a standard test scenario. What is the expected result?",
                "correct": "The derived solution converges strictly according to theoretical bounds and problem parameters",
                "distractors": [
                    "Indeterminate oscillating values violating conservation laws",
                    "Immediate undefined divergence with loss of physical significance",
                    "Inversion of expected equilibrium without external perturbation"
                ]
            }
        ],
        "L4": [
            {
                "stem": "Analyze the primary performance or stability constraint in {topic}. Which factor represents the critical bottleneck?",
                "correct": "Sensitivity to initial boundary conditions and interaction across coupled parameters",
                "distractors": [
                    "Irrelevant cosmetic notation conventions in documentation",
                    "Arbitrary fluctuations unrelated to underlying governing equations",
                    "Superficial typographical differences in problem formulation"
                ]
            }
        ],
        "L5": [
            {
                "stem": "When critically evaluating {topic} for complex problem solving, which trade-off is of highest priority?",
                "correct": "Precision and theoretical validity versus computational feasibility and resource constraints",
                "distractors": [
                    "Arbitrary stylistic preferences versus standard mathematical rigor",
                    "Superficial terminology choices versus verified empirical evidence",
                    "Speed of manual notation versus rigorous validation of results"
                ]
            }
        ],
        "L6": [
            {
                "stem": "When designing an advanced system or solution incorporating {topic}, which strategy best guarantees robust outcomes?",
                "correct": "A modular architecture with systematic validation checkpoints and continuous feedback loops",
                "distractors": [
                    "Removing all validation stages to expedite solution generation",
                    "Relying solely on unverified trial-and-error without mathematical constraints",
                    "Suppressing all error indicators to present an apparently smooth solution"
                ]
            }
        ]
    }

    @classmethod
    async def validate_api_key(cls, api_key: str) -> Dict[str, Any]:
        """
        Validates the provided Gemini API key against Google's API using standard ListModels probe,
        followed by a fast 1-token generation test to confirm active model readiness.
        """
        clean_key = (api_key or "").strip()
        if not clean_key:
            return {"valid": False, "model": "gemini-3-flash-preview", "error": "API Key cannot be empty."}

        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={clean_key}"
        headers = {"x-goog-api-key": clean_key, "Content-Type": "application/json"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])]
                    
                    # Preference order for fast, high-quality models
                    preferred_order = [
                        "gemini-3-flash-preview",
                        "gemini-3.5-flash",
                        "gemini-3.6-flash",
                        "gemini-3.5-flash-lite",
                        "gemini-3.7-flash",
                        "gemini-3.8-flash",
                        "gemini-flash-latest",
                        "gemini-robotics-er-2-preview"
                    ]
                    
                    detected_model = "gemini-3-flash-preview"
                    for cand in preferred_order:
                        if cand in models:
                            # Quick generation probe to verify model is actually responding (not 503)
                            try:
                                probe_url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand}:generateContent?key={clean_key}"
                                probe_res = await client.post(
                                    probe_url,
                                    json={"contents": [{"parts": [{"text": "hi"}]}]},
                                    headers=headers,
                                    timeout=4.0
                                )
                                if probe_res.status_code == 200:
                                    detected_model = cand
                                    break
                            except Exception:
                                continue
                    else:
                        flash_models = [m for m in models if "flash" in m and "tts" not in m and "image" not in m]
                        detected_model = flash_models[0] if flash_models else "gemini-3-flash-preview"

                    # Persist key cleanly to runtime environment and .env
                    os.environ["GEMINI_API_KEY"] = clean_key
                    try:
                        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
                        lines = []
                        if os.path.exists(env_path):
                            with open(env_path, "r", encoding="utf-8") as f:
                                lines = [l for l in f.readlines() if not l.strip().startswith("GEMINI_API_KEY=")]
                        lines.append(f"GEMINI_API_KEY={clean_key}\n")
                        with open(env_path, "w", encoding="utf-8") as f:
                            f.writelines(lines)
                    except Exception:
                        pass

                    return {
                        "valid": True,
                        "model": detected_model,
                        "message": f"Gemini API key is active and successfully authenticated with Google AI Studio ({detected_model} online)."
                    }
                elif resp.status_code in (400, 401, 403):
                    try:
                        err_data = resp.json()
                        msg = err_data.get("error", {}).get("message", "API key not valid.")
                    except Exception:
                        msg = "API key not valid. Please check your Google AI Studio credentials."
                    return {
                        "valid": False,
                        "model": "gemini-3-flash-preview",
                        "error": f"Google Gemini Error ({resp.status_code}): {msg}"
                    }
                else:
                    return {
                        "valid": False,
                        "model": "gemini-3-flash-preview",
                        "error": f"Google returned HTTP {resp.status_code}: {resp.text[:120]}"
                    }
        except httpx.TimeoutException:
            return {
                "valid": False,
                "model": "gemini-3-flash-preview",
                "error": "Timeout connecting to Google Gemini API (exceeded 10s). Check your internet connection."
            }
        except Exception as e:
            return {
                "valid": False,
                "model": "gemini-3-flash-preview",
                "error": f"Network error connecting to Gemini API: {str(e)}"
            }

    @classmethod
    async def generate_questions(
        cls,
        topic: str,
        bloom_level: str,
        marks: int,
        difficulty: str = "MEDIUM",
        question_type: str = "SHORT",
        count: int = 1,
        api_key: Optional[str] = None,
        context_text: Optional[str] = None,
        subject_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes brand-new questions using Gemini API or procedural fallback.
        Supports MCQ (with options and key), SHORT, and LONG questions, optionally grounded
        in uploaded document / lecture notes text.
        """
        api_key_to_use = api_key or os.getenv("GEMINI_API_KEY")
        gemini_error = None

        if api_key_to_use:
            try:
                gemini_questions, model_used = await cls._generate_via_gemini(
                    topic=topic,
                    bloom_level=bloom_level,
                    marks=marks,
                    difficulty=difficulty,
                    question_type=question_type,
                    count=count,
                    api_key=api_key_to_use,
                    context_text=context_text,
                    subject_name=subject_name
                )
                return {
                    "questions": gemini_questions,
                    "engine_used": f"Google Gemini ({model_used})",
                    "gemini_error": None
                }
            except Exception as e:
                gemini_error = str(e)
                print(f"[LLM Synthesizer] Gemini API call failed: {e}. Falling back to procedural engine.")

        procedural_questions = cls._generate_procedural(
            topic=topic,
            bloom_level=bloom_level,
            marks=marks,
            difficulty=difficulty,
            question_type=question_type,
            count=count
        )
        return {
            "questions": procedural_questions,
            "engine_used": "Academic Scenario Procedural Generator",
            "gemini_error": f"Gemini API note: {gemini_error}" if gemini_error else None
        }

    @classmethod
    async def _generate_via_gemini(
        cls,
        topic: str,
        bloom_level: str,
        marks: int,
        difficulty: str,
        question_type: str,
        count: int,
        api_key: str,
        context_text: Optional[str] = None,
        subject_name: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], str]:
        is_mcq = question_type.upper() == "MCQ"
        
        context_clause = ""
        if context_text and len(context_text.strip()) > 20:
            snippet = context_text.strip()[:3000]
            context_clause = f"\nREFERENCE SYLLABUS / LECTURE NOTES CONTEXT:\n\"\"\"\n{snippet}\n\"\"\"\nFormulate questions grounded strictly in the concepts provided in this reference text."

        domain = f"{subject_name}" if subject_name else "University and Higher Secondary Academic Curriculum"

        if is_mcq:
            prompt = f"""You are an expert Examination Paper Setter and Senior Academic Professor in {domain}.
Generate exactly {count} distinct, authentic, high-quality examination MULTIPLE CHOICE QUESTIONS (MCQs) based on:
- Subject / Field: "{domain}"
- Target Topic / Concept: "{topic}"
- Target Bloom's Taxonomy Cognitive Level: {bloom_level} (L1: Remember, L2: Understand, L3: Apply, L4: Analyze, L5: Evaluate, L6: Create)
- Marks Weightage: {marks} Marks
- Difficulty: {difficulty}
{context_clause}

Rules:
1. Topic Fidelity: Ground questions strictly in "{topic}". If this is Mathematics, formulate authentic mathematical problems, formulas, equations, or proofs (e.g., NCERT / CBSE / University curriculum). If Science or Engineering, formulate authentic domain-specific questions.
2. Math Notation: For all mathematical equations, variables, matrices, integrals, or formulas, use standard LaTeX enclosed in dollar signs (e.g. $x^2 + y^2 = 1$, $\\int_0^1 x dx$, $\\begin{{bmatrix}} a & b \\\\ c & d \\end{{bmatrix}}$) so they render cleanly.
3. Bloom's Alignment: The question stem MUST start with an appropriate Bloom's Taxonomy action verb conforming to {bloom_level} (e.g. Find, Solve, Calculate, Identify, Determine, Evaluate).
4. Provide exactly 4 options labeled "A", "B", "C", and "D". Options must be realistic, challenging, and plausible choices with exactly 1 unambiguously correct option and 3 plausible distractors.
5. Explicitly state the correct option key ("A", "B", "C", or "D") in "correct_answer".
6. Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "question_text": "Stem of question...",
    "question_type": "MCQ",
    "options": {{
      "A": "First option...",
      "B": "Second option...",
      "C": "Third option...",
      "D": "Fourth option..."
    }},
    "correct_answer": "B",
    "action_verb": "find",
    "bloom_level": "{bloom_level}",
    "difficulty": "{difficulty}",
    "marks": {marks}
  }}
]
Do not wrap in backticks or markdown, output only raw JSON.
"""
        else:
            prompt = f"""You are an expert Examination Paper Setter and Senior Academic Professor in {domain}.
Generate exactly {count} distinct, authentic, high-quality examination questions based on:
- Subject / Field: "{domain}"
- Target Topic / Concept: "{topic}"
- Question Type: {question_type} ({'Short Answer Question (2 Marks)' if marks <= 3 else 'Long Answer / Detailed Analytical Problem'})
- Target Bloom's Taxonomy Cognitive Level: {bloom_level} (L1: Remember, L2: Understand, L3: Apply, L4: Analyze, L5: Evaluate, L6: Create)
- Marks Weightage: {marks} Marks
- Difficulty: {difficulty}
{context_clause}

Rules:
1. Topic Fidelity: Formulate questions directly and strictly on "{topic}".
   - If the topic is from Mathematics (e.g., NCERT / CBSE / University syllabus), formulate authentic mathematical problems with equations, matrices, determinants, integrals, or relations.
   - If Science or Engineering, formulate authentic problem scenarios strictly adhering to that subject.
2. Math Notation: For all mathematical expressions, equations, determinants, matrices, and symbols, use standard LaTeX enclosed in dollar signs (e.g. $f(x) = \\sin(x)$, $\\begin{{vmatrix}} a & b \\\\ c & d \\end{{vmatrix}}$, $|\\text{{adj}}(A)|$) so they render cleanly.
3. Bloom's Alignment: The question stem MUST start with an appropriate Bloom's Taxonomy action verb conforming to {bloom_level} (e.g. L1: State, Define; L2: Explain, Describe; L3: Solve, Find, Calculate, Evaluate, Determine, Compute; L4: Analyze, Differentiate; L5: Justify, Evaluate; L6: Design, Formulate).
4. The question must be self-contained, syllabus-aligned, and directly solvable.
5. Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "question_text": "Full examination question stem...",
    "question_type": "{question_type}",
    "action_verb": "solve",
    "bloom_level": "{bloom_level}",
    "difficulty": "{difficulty}",
    "marks": {marks}
  }}
]
Do not wrap in backticks or markdown, output only raw JSON.
"""

        clean_key = api_key.strip()
        headers = {"Content-Type": "application/json", "x-goog-api-key": clean_key}

        # Cascade of valid Gemini models — gemini-3-flash-preview is tested active and fastest
        candidate_models = [
            "gemini-3-flash-preview",
            "gemini-3.5-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
            "gemini-flash-latest",
            "gemini-robotics-er-2-preview"
        ]

        last_error = "No models available"
        async with httpx.AsyncClient(timeout=20.0) as client:
            for model_name in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={clean_key}"
                
                gen_config = {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048,
                    "responseMimeType": "application/json"
                }

                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": gen_config
                }

                try:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            continue
                        parts = candidates[0].get("content", {}).get("parts", [])
                        raw_text = "".join([p.get("text", "") for p in parts if "text" in p]).strip()
                        
                        # Robust JSON extraction
                        m = re.search(r'```(?:json)?\s*(\[\s*\{.*?\}\s*\])\s*```', raw_text, re.DOTALL)
                        if m:
                            clean_json = m.group(1)
                        else:
                            s = raw_text.find('[')
                            e = raw_text.rfind(']')
                            if s != -1 and e != -1 and e > s:
                                clean_json = raw_text[s:e+1]
                            else:
                                clean_json = raw_text
                        
                        parsed = json.loads(clean_json)

                        results = []
                        for item in parsed:
                            nlp_check = BloomClassifierEngine.classify(item["question_text"])
                            
                            opts_str = None
                            correct_ans = item.get("correct_answer")
                            if is_mcq or item.get("question_type") == "MCQ":
                                opts = item.get("options")
                                if isinstance(opts, dict):
                                    opts_str = json.dumps(opts)
                                elif isinstance(opts, str):
                                    opts_str = opts
                                if not correct_ans:
                                    correct_ans = "A"

                            results.append({
                                "question_text": item["question_text"],
                                "marks": marks,
                                "bloom_level": nlp_check["predicted_bloom_level"],
                                "difficulty": difficulty,
                                "question_type": question_type,
                                "options": opts_str,
                                "correct_answer": correct_ans,
                                "action_verb": nlp_check["primary_verb"],
                                "confidence_score": nlp_check["confidence_score"],
                                "source": f"Google Gemini ({model_name})"
                            })
                        return results, model_name
                    elif resp.status_code in (404, 503, 429):
                        last_error = f"Model {model_name} HTTP {resp.status_code}: {resp.text[:80]}"
                        continue
                    else:
                        last_error = f"Model {model_name} HTTP {resp.status_code}: {resp.text[:80]}"
                except Exception as e:
                    last_error = f"Model {model_name} error: {str(e)}"
                    continue

        raise RuntimeError(f"All Gemini models unavailable: {last_error}")

    @classmethod
    def _generate_procedural(
        cls,
        topic: str,
        bloom_level: str,
        marks: int,
        difficulty: str,
        question_type: str,
        count: int
    ) -> List[Dict[str, Any]]:
        is_mcq = question_type.upper() == "MCQ"

        if is_mcq:
            templates = cls.PROCEDURAL_MCQ_TEMPLATES.get(bloom_level, cls.PROCEDURAL_MCQ_TEMPLATES["L2"])
            results = []
            keys = ["A", "B", "C", "D"]

            for i in range(count):
                tpl = templates[i % len(templates)]
                stem = tpl["stem"].format(topic=topic)
                
                correct_text = tpl["correct"]
                distractors = tpl["distractors"][:3]
                
                # Pick correct key
                correct_idx = i % 4
                correct_key = keys[correct_idx]
                
                choices = {}
                d_idx = 0
                for k_idx, k in enumerate(keys):
                    if k_idx == correct_idx:
                        choices[k] = correct_text
                    else:
                        choices[k] = distractors[d_idx % len(distractors)]
                        d_idx += 1

                nlp_check = BloomClassifierEngine.classify(stem)
                results.append({
                    "question_text": stem,
                    "marks": marks,
                    "bloom_level": nlp_check["predicted_bloom_level"],
                    "difficulty": difficulty,
                    "question_type": "MCQ",
                    "options": json.dumps(choices),
                    "correct_answer": correct_key,
                    "action_verb": nlp_check["primary_verb"],
                    "confidence_score": nlp_check["confidence_score"],
                    "source": "Academic Scenario Procedural Generator"
                })
            return results

        # Procedural SHORT or LONG
        level_config = cls.PROCEDURAL_TEMPLATES.get(bloom_level, cls.PROCEDURAL_TEMPLATES["L2"])
        templates = level_config["templates"]

        results = []
        for i in range(count):
            tpl = templates[i % len(templates)]
            formatted_text = tpl.format(topic=topic)

            nlp_check = BloomClassifierEngine.classify(formatted_text)
            results.append({
                "question_text": formatted_text,
                "marks": marks,
                "bloom_level": nlp_check["predicted_bloom_level"],
                "difficulty": difficulty,
                "question_type": question_type,
                "options": None,
                "correct_answer": None,
                "action_verb": nlp_check["primary_verb"],
                "confidence_score": nlp_check["confidence_score"],
                "source": "Academic Scenario Procedural Generator"
            })
        return results
