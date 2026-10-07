import re
from typing import Dict, List, Optional, Tuple

class CourseOutcomeMapper:
    """
    Automated Course Outcome (CO) and Syllabus Unit Mapping Engine.
    Maps questions to the most relevant Syllabus Unit and Course Outcome
    by matching syllabus keywords and Bloom cognitive tier alignment.
    """

    @staticmethod
    def _tokenize_keywords(text: str) -> set:
        tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        # Filter common grammatical stop words
        stopwords = {
            "the", "and", "for", "with", "that", "this", "from", "which",
            "explain", "describe", "define", "calculate", "solve", "design",
            "given", "using", "using", "what", "how", "each", "such", "show"
        }
        return {t for t in tokens if t not in stopwords}

    @classmethod
    def suggest_mapping(
        cls,
        question_text: str,
        bloom_level: str,
        units: List[Dict[str, any]],
        course_outcomes: List[Dict[str, any]]
    ) -> Dict[str, any]:
        """
        Calculates lexical and conceptual overlap between question text
        and syllabus units + CO descriptions.
        """
        q_tokens = cls._tokenize_keywords(question_text)
        if not q_tokens:
            default_unit = units[0]["unit_number"] if units else 1
            default_co = course_outcomes[0]["code"] if course_outcomes else "CO1"
            return {
                "suggested_unit_number": default_unit,
                "suggested_co_code": default_co,
                "confidence": 0.5,
                "match_reason": "Default assignment due to minimal domain tokens."
            }

        unit_scores = []
        for unit in units:
            unit_text = f"{unit.get('title', '')} {unit.get('description', '')} {unit.get('topics', '')}"
            u_tokens = cls._tokenize_keywords(unit_text)
            overlap = q_tokens.intersection(u_tokens)
            score = len(overlap) * 2.5
            unit_scores.append((score, unit))

        # Sort units by relevance score
        unit_scores.sort(key=lambda x: x[0], reverse=True)
        best_unit_score, best_unit = unit_scores[0] if unit_scores else (0, None)
        
        # Match CO: Each unit typically corresponds to a CO, or match via CO description
        co_scores = []
        for co in course_outcomes:
            co_text = co.get("description", "")
            c_tokens = cls._tokenize_keywords(co_text)
            overlap = q_tokens.intersection(c_tokens)
            score = len(overlap) * 2.0
            
            # Bloom level proximity bonus
            target_bl = co.get("target_bloom_level", "")
            if target_bl and target_bl == bloom_level:
                score += 1.5
                
            co_scores.append((score, co))

        co_scores.sort(key=lambda x: x[0], reverse=True)
        best_co_score, best_co = co_scores[0] if co_scores else (0, None)

        # Fallback if both scores are low: Map Unit 1 -> CO1, Unit 2 -> CO2, etc.
        suggested_unit_num = best_unit["unit_number"] if best_unit else 1
        if best_co and best_co_score > 0:
            suggested_co = best_co["code"]
        else:
            # Map Unit N to CON if available
            co_code_match = f"CO{suggested_unit_num}"
            has_matching_co = any(c["code"] == co_code_match for c in course_outcomes)
            suggested_co = co_code_match if has_matching_co else (course_outcomes[0]["code"] if course_outcomes else "CO1")

        confidence = min(0.95, max(0.55, (best_unit_score + best_co_score) / 6.0))

        return {
            "suggested_unit_number": suggested_unit_num,
            "suggested_co_code": suggested_co,
            "confidence": round(confidence, 2),
            "match_reason": f"Matched unit keywords with {round(confidence * 100)}% topical relevance."
        }
