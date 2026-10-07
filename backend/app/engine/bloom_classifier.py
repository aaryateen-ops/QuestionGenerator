import re
from typing import Dict, List, Optional, Tuple

class BloomClassifierEngine:
    """
    NLP Cognitive Classification Engine based on the Revised Bloom's Taxonomy
    (Anderson & Krathwohl, 2001).
    
    Performs linguistic tokenization, action verb extraction, multi-verb resolution,
    and cognitive level assignment with confidence scoring and explainability.
    """

    TAXONOMY_LEVELS: Dict[str, Dict[str, any]] = {
        "L1": {
            "name": "Remember",
            "tier": 1,
            "description": "Recall facts and basic concepts",
            "verbs": {
                "define", "list", "state", "recall", "repeat", "reproduce", "identify",
                "name", "label", "match", "recognize", "record", "memorize", "quote",
                "recite", "enumerate", "tabularize", "mention", "specify", "outline",
                "who", "what", "where", "when", "which"
            }
        },
        "L2": {
            "name": "Understand",
            "tier": 2,
            "description": "Explain ideas or concepts",
            "verbs": {
                "explain", "describe", "discuss", "summarize", "paraphrase", "interpret",
                "classify", "clarify", "illustrate", "express", "locate", "report",
                "review", "translate", "comprehend", "demonstrate understanding", "exemplify",
                "give examples", "rephrase", "rewrite", "generalize", "infer"
            }
        },
        "L3": {
            "name": "Apply",
            "tier": 3,
            "description": "Use information in new situations",
            "verbs": {
                "apply", "calculate", "solve", "compute", "implement", "execute",
                "convert", "transform", "demonstrate", "operate", "practice", "schedule",
                "sketch", "employ", "simulate", "manipulate", "modify", "trace",
                "construct", "run", "determine", "show", "utilize", "translate into code", "derive"
            }
        },
        "L4": {
            "name": "Analyze",
            "tier": 4,
            "description": "Draw connections among ideas",
            "verbs": {
                "analyze", "compare", "contrast", "differentiate", "distinguish",
                "deconstruct", "examine", "investigate", "categorize", "separate",
                "test", "question", "criticize", "break down", "discriminate",
                "diagram", "correlate", "delineate", "dichotomize", "inspect",
                "detect anomalies", "dissect"
            }
        },
        "L5": {
            "name": "Evaluate",
            "tier": 5,
            "description": "Justify a stand or decision",
            "verbs": {
                "evaluate", "justify", "assess", "judge", "rate", "validate",
                "critique", "defend", "appraise", "argue", "prioritize", "recommend",
                "select", "conclude", "estimate", "measure", "weigh", "score",
                "benchmark", "verify", "support", "prove"
            }
        },
        "L6": {
            "name": "Create",
            "tier": 6,
            "description": "Produce new or original work",
            "verbs": {
                "design", "create", "formulate", "develop", "compose",
                "generate", "plan", "produce", "synthesize", "devise", "invent",
                "architect", "build", "assemble", "propose", "reorganize", "reconstruct",
                "integrate", "innovate"
            }
        }
    }

    # Common CS compound nouns that should not be mistaken for action verbs
    IGNORE_PHRASES: List[str] = [
        "data structure",
        "file structure",
        "control structure",
        "network structure",
        "tree structure"
    ]

    # Multi-word keyphrases with distinct Bloom categorization
    COMPOUND_PHRASES: List[Tuple[str, str]] = [
        ("compare and contrast", "L4"),
        ("critically assess", "L5"),
        ("critically evaluate", "L5"),
        ("give an example of", "L2"),
        ("explain the working of", "L2"),
        ("step by step execution", "L3"),
        ("design and implement", "L6"),
        ("design an algorithm", "L6"),
        ("write an algorithm", "L6"),
        ("write a program", "L3"),
        ("calculate the time complexity", "L3"),
        ("compute the shortest path", "L3"),
        ("differentiate between", "L4"),
        ("state the differences between", "L4"),
        ("what is meant by", "L1"),
        ("what are the advantages of", "L2"),
        ("what are the disadvantages of", "L2"),
        ("justify why", "L5"),
        ("prove that", "L5"),
        ("draw the architecture of", "L2"),
    ]

    # Simple stemmer mappings for common grammatical variants
    STEM_MAP: Dict[str, str] = {
        "defines": "define", "defined": "define", "defining": "define", "definition": "define",
        "explains": "explain", "explained": "explain", "explaining": "explain", "explanation": "explain",
        "calculates": "calculate", "calculated": "calculate", "calculating": "calculate", "calculation": "calculate",
        "computes": "compute", "computed": "compute", "computing": "compute", "computation": "compute",
        "solves": "solve", "solved": "solve", "solving": "solve", "solution": "solve",
        "analyzes": "analyze", "analyzed": "analyze", "analyzing": "analyze", "analysis": "analyze",
        "compares": "compare", "compared": "compare", "comparing": "compare", "comparison": "compare",
        "contrasts": "contrast", "contrasted": "contrast", "contrasting": "contrast",
        "differentiates": "differentiate", "differentiated": "differentiate", "differentiation": "differentiate",
        "evaluates": "evaluate", "evaluated": "evaluate", "evaluating": "evaluate", "evaluation": "evaluate",
        "justifies": "justify", "justified": "justify", "justifying": "justify", "justification": "justify",
        "designs": "design", "designed": "design", "designing": "design",
        "formulates": "formulate", "formulated": "formulate", "formulating": "formulate",
        "develops": "develop", "developed": "develop", "developing": "develop", "development": "develop",
        "implements": "implement", "implemented": "implement", "implementing": "implement", "implementation": "implement",
        "demonstrates": "demonstrate", "demonstrated": "demonstrate", "demonstrating": "demonstrate",
        "constructs": "construct", "constructed": "construct", "constructing": "construct",
        "identifies": "identify", "identified": "identify", "identifying": "identify",
        "lists": "list", "listed": "list", "listing": "list",
        "describes": "describe", "described": "describe", "describing": "describe", "description": "describe",
        "distinguishes": "distinguish", "distinguished": "distinguish",
        "illustrates": "illustrate", "illustrated": "illustrate", "illustrating": "illustrate"
    }

    @classmethod
    def _lemmatize(cls, token: str) -> str:
        token = token.lower().strip()
        return cls.STEM_MAP.get(token, token)

    @classmethod
    def classify(cls, question_text: str) -> Dict[str, any]:
        """
        Analyzes question text and returns:
        - predicted_bloom_level: "L1" to "L6"
        - level_name: "Remember", "Understand", etc.
        - confidence_score: float (0.0 to 1.0)
        - primary_verb: string
        - detected_verbs: list of candidate matches
        - rationale: detailed human-readable explanation
        """
        if not question_text or not question_text.strip():
            return {
                "question_text": "",
                "predicted_bloom_level": "L2",
                "level_name": "Understand",
                "confidence_score": 0.5,
                "primary_verb": None,
                "detected_verbs": [],
                "rationale": "Empty question string supplied; default to foundational level."
            }

        text_lower = question_text.lower().strip()
        detected_matches = []

        # Mask out common noun phrases so they don't produce false verb matches
        sanitized_text = text_lower
        for phrase in cls.IGNORE_PHRASES:
            sanitized_text = sanitized_text.replace(phrase, phrase.replace(" ", "_"))

        # 1. Multi-word phrase matching
        for phrase, level in cls.COMPOUND_PHRASES:
            if phrase in text_lower:
                pos = text_lower.find(phrase)
                # Boost priority if phrase is at the beginning of sentence
                weight = 2.5 if pos == 0 else 1.5
                detected_matches.append({
                    "verb": phrase,
                    "bloom_level": level,
                    "level_name": cls.TAXONOMY_LEVELS[level]["name"],
                    "tier": cls.TAXONOMY_LEVELS[level]["tier"],
                    "weight": weight,
                    "position": pos
                })

        # 2. Token extraction & Single verb matching
        tokens = re.findall(r"\b[a-zA-Z\-]+\b", sanitized_text)
        for idx, raw_token in enumerate(tokens):
            if "_" in raw_token:
                continue
            lemma = cls._lemmatize(raw_token)
            for level_code, level_data in cls.TAXONOMY_LEVELS.items():
                if lemma in level_data["verbs"]:
                    # Leading imperative verb at position 0 gets highest authoritative weight
                    if idx == 0:
                        base_weight = 2.8
                    elif idx <= 2:
                        base_weight = 1.8
                    else:
                        base_weight = 0.9

                    detected_matches.append({
                        "verb": lemma,
                        "bloom_level": level_code,
                        "level_name": level_data["name"],
                        "tier": level_data["tier"],
                        "weight": base_weight,
                        "position": idx
                    })

        # 3. Decision Heuristic
        if not detected_matches:
            # Fallback heuristic: Check for descriptive keywords
            if any(k in text_lower for k in ["what", "who", "when", "name"]):
                chosen_level = "L1"
                rationale = "No explicit action verb detected, but fact-seeking question stems indicate foundational knowledge recall."
                conf = 0.65
                primary_verb = "factual_inquiry"
            elif any(k in text_lower for k in ["why", "how", "significance", "need for"]):
                chosen_level = "L2"
                rationale = "Interrogative phrasing ('why' / 'how') indicates comprehension and conceptual understanding."
                conf = 0.70
                primary_verb = "conceptual_inquiry"
            elif any(k in text_lower for k in ["steps", "procedure", "algorithm", "flowchart"]):
                chosen_level = "L3"
                rationale = "Procedural keywords suggest procedural application of concepts."
                conf = 0.68
                primary_verb = "procedure_inquiry"
            else:
                chosen_level = "L2"
                rationale = "Standard conceptual question with general explanatory scope."
                conf = 0.60
                primary_verb = "general_scope"

            return {
                "question_text": question_text,
                "predicted_bloom_level": chosen_level,
                "level_name": cls.TAXONOMY_LEVELS[chosen_level]["name"],
                "confidence_score": conf,
                "primary_verb": primary_verb,
                "detected_verbs": [],
                "rationale": rationale
            }

        # Subordinate verb heuristic:
        # e.g., "Explain how to solve..." or "Describe the method to design..."
        # If leading verb is "explain/describe" followed by "solve/design",
        # check if it is asking for an explanation of a method (L2) vs demanding execution (L3/L6).
        if len(detected_matches) > 1:
            first_verb = detected_matches[0]["verb"]
            if first_verb in ["explain", "describe", "discuss"] and len(tokens) > 2:
                # Check if sentence has "how to" or "steps to"
                if "how to" in text_lower or "steps to" in text_lower:
                    leading_match = detected_matches[0]
                    return {
                        "question_text": question_text,
                        "predicted_bloom_level": "L2",
                        "level_name": "Understand",
                        "confidence_score": 0.88,
                        "primary_verb": first_verb,
                        "detected_verbs": detected_matches,
                        "rationale": f"Leading verb '{first_verb}' followed by 'how to/steps to' establishes the cognitive demand as conceptual comprehension (L2)."
                    }

        # Otherwise, pick highest cognitive tier with weighting
        # Sort by: (weight * tier) descending, but favor leading imperative verb
        def score_match(m):
            pos_penalty = 0.85 if m["position"] > 4 else 1.0
            return (m["tier"] * 1.2 + m["weight"]) * pos_penalty

        sorted_matches = sorted(detected_matches, key=score_match, reverse=True)
        winner = sorted_matches[0]

        # Calculate confidence
        if len(detected_matches) == 1:
            confidence = 0.92 if winner["position"] <= 2 else 0.82
            rationale = f"Primary imperative verb '{winner['verb']}' strongly maps to Bloom's {winner['bloom_level']} ({winner['level_name']})."
        else:
            top_level = winner["bloom_level"]
            agreeing = [m for m in detected_matches if m["bloom_level"] == top_level]
            confidence = min(0.95, 0.80 + (0.05 * len(agreeing)))
            rationale = (
                f"Resolved compound question stems. Governing action verb '{winner['verb']}' "
                f"carries primary cognitive demand of Level {winner['bloom_level']} ({winner['level_name']})."
            )

        return {
            "question_text": question_text,
            "predicted_bloom_level": winner["bloom_level"],
            "level_name": winner["level_name"],
            "confidence_score": round(confidence, 2),
            "primary_verb": winner["verb"],
            "detected_verbs": detected_matches,
            "rationale": rationale
        }
