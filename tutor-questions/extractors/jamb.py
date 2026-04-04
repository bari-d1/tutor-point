import fitz  # pymupdf
import json
import base64
import re
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── API Key ───────────────────────────────────────────────────────────────────
API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not API_KEY:
    print("ERROR: No API key found.")
    print("Set it with: export GEMINI_API_KEY=your-key-here")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
PDF_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("Jamb-Mathematics-Past-Questions.pdf")
OUTPUT_PATH = Path("jamb_question_bank.json")

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={API_KEY}"

# ── Diagram detection ─────────────────────────────────────────────────────────
DIAGRAM_PHRASES = [
    "diagram above", "diagram below", "figure above", "figure below",
    "table above", "table below", "chart above", "chart below",
    "graph above", "graph below", "histogram above", "histogram below",
    "pie chart above", "pie chart below", "bar chart above", "bar chart below",
    "venn diagram above", "venn diagram below",
    "from the figure", "from the diagram", "from the chart", "from the graph",
    "the diagram shows", "the figure shows", "shown above", "shown below",
    "in the figure", "in the diagram",
]

# ── Prompts ───────────────────────────────────────────────────────────────────
QUESTION_PROMPT = """You are extracting multiple choice maths questions from a JAMB past paper page image.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.

For each question extract:
- number: integer question number
- question: full question text (clean, no leading number)
- optionA: text for option A
- optionB: text for option B
- optionC: text for option C
- optionD: text for option D
- correct: the letter of the correct answer (A, B, C or D) — only if an answer key is visible on this page

Rules:
- Skip question 1 entirely (it asks about paper type, not maths)
- If a question references a diagram, figure, graph, chart, histogram or Venn diagram image on the page, set "skip": true
- If the question text is incomplete because it continues on another page, set "incomplete": true
- Use plain text for maths — write "x^2" not superscripts, "sqrt(x)" not symbols, "1/2" not fractions
- If no questions are visible return []

Example output:
[
  {
    "number": 4,
    "question": "A student measures a piece of rope and found it was 1.26m long. If the actual length was 1.25m, what was the percentage error?",
    "optionA": "0.40%",
    "optionB": "0.01%",
    "optionC": "0.25%",
    "optionD": "0.80%",
    "correct": "D"
  },
  {
    "number": 11,
    "question": "Which of the Venn diagrams below represents P' intersect Q' intersect R'?",
    "optionA": "Diagram A",
    "optionB": "Diagram B",
    "optionC": "Diagram C",
    "optionD": "Diagram D",
    "skip": true
  }
]

Extract all maths questions from this JAMB past paper page. Return only a JSON array."""

ANSWER_KEY_PROMPT = """Extract the answer key from this JAMB past paper page.
Return ONLY a valid JSON array of objects with number and correct letter.
Example: [{"number": 1, "correct": "B"}, {"number": 2, "correct": "C"}]
If no answer key is visible, return [].
No markdown, no explanation."""

YEAR_PROMPT = """Look at this JAMB past paper page and tell me which exam year it belongs to.
Return ONLY a JSON object like: {"year": "2015"}
If you cannot determine the year, return: {"year": null}
No markdown, no explanation."""

# ── Gemini API call ───────────────────────────────────────────────────────────

def call_gemini(image_b64, prompt, max_tokens=4000):
    """Call Gemini API with an image and prompt."""
    payload = {
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": "image/png",
                        "data": image_b64
                    }
                },
                {
                    "text": prompt
                }
            ]
        }],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.1
        }
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        GEMINI_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Strip markdown fences if model added them
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'^```\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            return text
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        raise Exception(f"HTTP {e.code}: {body}")

# ── Helpers ───────────────────────────────────────────────────────────────────

def page_to_base64(page):
    """Render a PDF page to a base64 PNG."""
    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat)
    return base64.standard_b64encode(pix.tobytes("png")).decode()

def is_diagram_dependent(q):
    """Check if question text references a diagram."""
    text = (q.get("question", "") + " " +
            q.get("optionA", "") + " " + q.get("optionB", "") + " " +
            q.get("optionC", "") + " " + q.get("optionD", "")).lower()
    return any(phrase in text for phrase in DIAGRAM_PHRASES)

def extract_questions(image_b64, page_num):
    try:
        raw = call_gemini(image_b64, QUESTION_PROMPT, max_tokens=4000)
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ⚠ Page {page_num}: JSON parse error — {e}")
        return []
    except Exception as e:
        print(f"  ⚠ Page {page_num}: API error — {e}")
        return []

def extract_answer_key(image_b64, page_num):
    try:
        raw = call_gemini(image_b64, ANSWER_KEY_PROMPT, max_tokens=1000)
        return json.loads(raw)
    except Exception as e:
        print(f"  ⚠ Page {page_num} answer key error: {e}")
        return []

def detect_year(image_b64, page_num):
    try:
        raw = call_gemini(image_b64, YEAR_PROMPT, max_tokens=50)
        data = json.loads(raw)
        return data.get("year")
    except:
        return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not PDF_PATH.exists():
        print(f"ERROR: PDF not found at {PDF_PATH}")
        print(f"Usage: python3 {sys.argv[0]} path/to/your.pdf")
        sys.exit(1)

    print(f"Opening {PDF_PATH.name}...")
    doc = fitz.open(str(PDF_PATH))
    total_pages = len(doc)
    print(f"Total pages: {total_pages}")
    print(f"Model: {GEMINI_MODEL} (free tier)\n")

    all_questions_raw = []
    answer_keys = {}
    current_year = None

    for page_num in range(total_pages):
        page = doc[page_num]
        print(f"Page {page_num + 1}/{total_pages}...", end=" ", flush=True)

        image_b64 = page_to_base64(page)

        # Detect year
        detected_year = detect_year(image_b64, page_num + 1)
        if detected_year:
            current_year = detected_year
        year_label = current_year or "UNKNOWN"

        # Extract questions
        questions = extract_questions(image_b64, page_num + 1)

        # Extract answer key
        answers = extract_answer_key(image_b64, page_num + 1)
        if answers:
            if year_label not in answer_keys:
                answer_keys[year_label] = {}
            for a in answers:
                answer_keys[year_label][str(a["number"])] = a["correct"]
            print(f"✓ {len(questions)} questions, {len(answers)} answers [{year_label}]")
        else:
            print(f"✓ {len(questions)} questions [{year_label}]")

        for q in questions:
            q["_year"] = year_label
            all_questions_raw.append(q)

    doc.close()

    # Build final bank
    print(f"\nBuilding question bank...")

    seen_ids = set()
    bank = []
    skipped_diagram = 0
    skipped_incomplete = 0
    skipped_no_answer = 0
    skipped_duplicate = 0

    for q in all_questions_raw:
        year = q.get("_year", "UNKNOWN")
        number = q.get("number")

        if number == 1:
            continue

        if q.get("skip") or is_diagram_dependent(q):
            skipped_diagram += 1
            continue

        if q.get("incomplete"):
            skipped_incomplete += 1
            continue

        if not all([q.get("question"), q.get("optionA"), q.get("optionB"),
                    q.get("optionC"), q.get("optionD")]):
            continue

        correct = q.get("correct")
        if not correct and year in answer_keys:
            correct = answer_keys[year].get(str(number))

        if not correct:
            skipped_no_answer += 1
            continue

        question_id = f"JAMB_{year}_{number}"

        if question_id in seen_ids:
            skipped_duplicate += 1
            continue
        seen_ids.add(question_id)

        bank.append({
            "id": question_id,
            "source": "JAMB",
            "year": year,
            "number": number,
            "question": q["question"].strip(),
            "optionA": q["optionA"].strip(),
            "optionB": q["optionB"].strip(),
            "optionC": q["optionC"].strip(),
            "optionD": q["optionD"].strip(),
            "correct": correct.upper(),
            "topic": None
        })

    bank.sort(key=lambda x: (x["year"], x["number"]))

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(bank, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"✅ Done!")
    print(f"   Questions extracted:  {len(bank)}")
    print(f"   Skipped (diagram):    {skipped_diagram}")
    print(f"   Skipped (incomplete): {skipped_incomplete}")
    print(f"   Skipped (no answer):  {skipped_no_answer}")
    print(f"   Skipped (duplicate):  {skipped_duplicate}")
    print(f"   Output: {OUTPUT_PATH}")
    print(f"\nSample questions:")
    for q in bank[:3]:
        print(f"  [{q['id']}] {q['question'][:70]}...")
        print(f"           Correct: {q['correct']}")

if __name__ == "__main__":
    main()