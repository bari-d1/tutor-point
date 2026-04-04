import fitz
import json
import re
import os

IGCSE_DIR = '/Users/dayoadebari/tutor-questions/questions/IGCSE'
OUTPUT_FILE = '/Users/dayoadebari/tutor-questions/extracted/igcse_extracted.json'

PAPER_PAIRS = [
    {
        'qp': 'June 2024 Question Paper 11 (PDF, 1MB).pdf',
        'ms': 'June 2024 Mark Scheme Paper 11 (PDF, 225KB).pdf',
        'year': '2024', 'paper': '11',
    },
    {
        'qp': 'June 2024 Question Paper 21 (PDF, 1MB).pdf',
        'ms': 'June 2024 Mark Scheme Paper 21 (PDF, 265KB).pdf',
        'year': '2024', 'paper': '21',
    },
    {
        'qp': 'June 2024 Question Paper 31 (PDF, 1MB).pdf',
        'ms': 'June 2024 Mark Scheme Paper 31 (PDF, 232KB).pdf',
        'year': '2024', 'paper': '31',
    },
    {
        'qp': 'June 2024 Question Paper 41 (PDF, 1MB).pdf',
        'ms': 'June 2024 Mark Scheme Paper 41 (PDF, 299KB).pdf',
        'year': '2024', 'paper': '41',
    },
    {
        'qp': '2025 Specimen Paper 1 (PDF, 1MB).pdf',
        'ms': '2025 Specimen Paper 1 Mark Scheme (PDF, 1MB).pdf',
        'year': '2025', 'paper': 'SP1',
    },
    {
        'qp': '2025 Specimen Paper 2 (PDF, 1MB).pdf',
        'ms': '2025 Specimen Paper 2 Mark Scheme (PDF, 1MB).pdf',
        'year': '2025', 'paper': 'SP2',
    },
    {
        'qp': '2025 Specimen Paper 3 (PDF, 1MB).pdf',
        'ms': '2025 Specimen Paper 3 Mark Scheme (PDF, 1MB).pdf',
        'year': '2025', 'paper': 'SP3',
    },
    {
        'qp': '2025 Specimen Paper 4 (PDF, 1MB).pdf',
        'ms': '2025 Specimen Paper 4 Mark Scheme (PDF, 1MB).pdf',
        'year': '2025', 'paper': 'SP4',
    },
]

# Symbol font (Private Use Area) character mapping
SYMBOL_MAP = {
    '\uf028': '(',
    '\uf029': ')',
    '\uf02d': '−',
    '\uf02b': '+',
    '\uf0b4': '×',
    '\uf03d': '=',
    '\uf05b': '[',
    '\uf05d': ']',
    '\uf02f': '/',
    '\uf0b1': '±',
    '\uf020': ' ',
    '\uf0d7': '×',
    '\uf0b8': '÷',
    '\uf0a3': '≤',
    '\uf0b3': '≥',
    '\uf0b9': '≠',
    '\uf0ab': '≤',
    '\uf0b7': '·',
    '\uf0b0': '°',
    '\uf070': 'π',
    '\uf072': 'ρ',
    '\uf071': 'θ',
}

TOPIC_KEYWORDS = {
    'Probability': ['probability', 'random', 'likely', 'chance', 'tree diagram'],
    'Statistics': ['mean', 'median', 'mode', 'average', 'frequency', 'histogram', 'cumulative', 'quartile', 'interquartile', 'scatter'],
    'Sets': ['set', 'union', 'intersection', 'universal set', 'venn', 'subset', 'complement'],
    'Matrices': ['matrix', 'matrices', 'determinant', 'inverse'],
    'Vectors': ['vector', 'magnitude', 'resultant'],
    'Functions': ['function', 'f(x)', 'g(x)', 'domain', 'range', 'composite', 'inverse function'],
    'Simultaneous Equations': ['simultaneous', 'eliminate', 'system of'],
    'Quadratic Equations': ['quadratic', 'factorise', 'discriminant', 'completing the square'],
    'Sequences': ['sequence', 'nth term', 'term', 'difference'],
    'Trigonometry': ['sin', 'cos', 'tan', 'trigon', 'angle of elevation', 'angle of depression', 'sine rule', 'cosine rule'],
    'Coordinate Geometry': ['coordinate', 'gradient', 'midpoint', 'straight line', 'y = mx', 'equation of the line'],
    'Mensuration': ['area', 'volume', 'surface area', 'circumference', 'cylinder', 'cone', 'sphere', 'prism', 'pyramid'],
    'Geometry': ['angle', 'polygon', 'parallel', 'perpendicular', 'bearing', 'symmetry', 'congruent', 'similar', 'triangle', 'circle'],
    'Transformations': ['rotation', 'reflection', 'translation', 'enlargement', 'transform'],
    'Inequalities': ['inequalit', 'inequality'],
    'Indices': ['index', 'indices', 'standard form', 'square root', 'cube root'],
    'Ratio and Proportion': ['ratio', 'proportion', 'rate', 'speed', 'distance', 'km/h', 'm/s'],
    'Percentages': ['percent', 'simple interest', 'compound interest', 'depreciat', 'appreciat'],
    'Algebra': ['simplify', 'expand', 'factorise', 'expression', 'equation', 'solve', 'rearrange', 'formula'],
    'Number': ['prime', 'factor', 'multiple', 'hcf', 'lcm', 'odd', 'even', 'reciprocal'],
    'Fractions and Decimals': ['fraction', 'decimal', 'percentage', 'nearest', 'significant figure'],
}

SKIP_QUESTION_PATTERNS = [
    r'the diagram shows',
    r'the figure shows',
    r'the graph shows',
    r'using the graph',
    r'from the graph',
    r'on the scale drawing',
    r'the scale drawing shows',
    r'draw\b',
    r'shade\b',
    r'mark\b.*position',
    r'plot\b',
    r'\bconstruct\b',
    r'\bmeasure\b.*length',
    r'\bmeasure\b.*angle',
    r'complete the table',
    r'complete the diagram',
    r'complete the tree',
    r'complete the venn',
    r'using a ruler and compass',
    r'complete the graph',
    r'sketch\b',
    r'find the coordinates of point\b.*diagram',
]

# Override: keep despite "not to scale" if measurements are in text
KEEP_PATTERNS = [
    r'\d+\s*(cm|m|km|mm)\b',
    r'\d+°',
    r'angle\s+\w+\s+=\s+\d+',
]


def convert_symbols(text):
    for char, replacement in SYMBOL_MAP.items():
        text = text.replace(char, replacement)
    return text


def normalize_q_ref(q_text):
    """Normalize question reference to a consistent key like '1a', '1ai', '3b'."""
    # Remove trailing whitespace
    q = q_text.strip()
    # Remove spaces before brackets
    q = re.sub(r'\s*\(', '(', q)
    # Extract components
    m = re.match(r'^(\d+)(?:\(([a-z])\))?(?:\(([ivxIVX]+)\))?$', q)
    if m:
        num = m.group(1)
        sub = m.group(2) or ''
        subsub = m.group(3) or ''
        return f"{num}{sub}{subsub}"
    return None


def is_q_ref(line):
    """Return normalized key if line is a question reference, else None."""
    stripped = line.strip()
    # Must match: number optionally followed by sub-part notation
    m = re.fullmatch(r'(\d+)\s*(?:\(([a-z])\))?\s*(?:\(([ivxIVX]+)\))?', stripped)
    if m:
        num, sub, subsub = m.group(1), m.group(2) or '', m.group(3) or ''
        # Reject if number is too large to be a question number (> 40)
        if int(num) > 40:
            return None
        return f"{num}{sub}{subsub}"
    return None


def is_marks_count(line):
    """Return True if line looks like a marks count (standalone 1-10)."""
    stripped = line.strip()
    return bool(re.fullmatch(r'\d{1,2}\s*', stripped) and int(stripped.strip()) <= 10)


def clean_answer(answer):
    """Clean up answer text."""
    # Convert symbol characters
    answer = convert_symbols(answer)
    # Remove mark type annotations
    answer = re.sub(r'\s+(oe|cao|nfww|soi|isw|FT|dep)\s*$', '', answer.strip())
    answer = re.sub(r'\s+final answer\s*$', '', answer.strip())
    # Remove partial marks notation that leaked in
    answer = re.sub(r'\s+[MB][0-9].*$', '', answer, flags=re.DOTALL)
    # Collapse whitespace
    answer = ' '.join(answer.split())
    return answer.strip()


def parse_mark_scheme(pdf_path):
    """
    Parse mark scheme PDF using state machine on sequential text.
    Returns dict mapping question key ('1a', '3b', '12') -> answer string.
    """
    doc = fitz.open(pdf_path)
    answers = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()

        # Only process pages with the answer table
        if 'Question' not in text or 'Answer' not in text or 'Partial Marks' not in text:
            continue

        # Find the answer table section (after the header)
        sections = re.split(r'Question\s+Answer\s+Marks\s+Partial Marks', text)
        if len(sections) < 2:
            continue

        for section in sections[1:]:
            # Convert symbols and split into lines
            section = convert_symbols(section)
            lines = [l.strip() for l in section.split('\n')]
            lines = [l for l in lines if l]  # Remove empty lines

            # State machine: INIT -> collecting answer -> saved
            current_q = None
            answer_lines = []
            answer_collected = False

            for i, line in enumerate(lines):
                # Skip page headers/footers
                if re.match(r'^0580/', line) or re.match(r'^Cambridge IGCSE', line) or \
                   re.match(r'^Page \d+', line) or re.match(r'^©', line) or \
                   re.match(r'^PUBLISHED$', line) or re.match(r'^SPECIMEN$', line) or \
                   re.match(r'^May/June', line) or re.match(r'^For examination', line) or \
                   re.match(r'^from 202', line):
                    continue

                q_key = is_q_ref(line)

                if q_key is not None:
                    # Save previous record
                    if current_q and answer_lines:
                        ans = clean_answer(answer_lines[0])
                        # For multi-line fractions, combine first two meaningful lines
                        if ans and len(answer_lines) > 1:
                            next_part = answer_lines[1].strip()
                            # If next part continues the answer (not marks, not partial marks)
                            if next_part and not re.match(r'^[MB][0-9]', next_part) and \
                               not re.match(r'^[Aa]llow\b', next_part, re.I) and \
                               not re.match(r'^[Ii]f\b', next_part) and \
                               not is_marks_count(next_part):
                                ans = clean_answer(ans + ' ' + next_part)
                        if ans:
                            answers[current_q] = ans

                    current_q = q_key
                    answer_lines = []
                    answer_collected = False

                elif current_q is not None:
                    # Skip partial marks notations and method marks
                    if re.match(r'^[MB][0-9]', line) or re.match(r'^[Aa][0-9]', line) or \
                       re.match(r'^[Aa]llow\b', line, re.I) or re.match(r'^[Ii]f [MB0-9]', line) or \
                       re.match(r'^[Ss][Cc][0-9]', line) or re.match(r'^or [MB][0-9]', line) or \
                       re.match(r'^FT\b', line):
                        if not answer_lines:
                            continue  # Skip before answer is collected
                        elif answer_collected:
                            continue  # Skip partial marks after answer
                        answer_collected = True
                        continue

                    # If we have answer and see standalone marks count, end this record
                    if answer_lines and is_marks_count(line):
                        answer_collected = True
                        continue

                    # Otherwise, collect as answer
                    if not answer_collected:
                        answer_lines.append(line)

            # Save last record
            if current_q and answer_lines:
                ans = clean_answer(answer_lines[0])
                if ans and len(answer_lines) > 1:
                    next_part = answer_lines[1].strip()
                    if next_part and not re.match(r'^[MB][0-9]', next_part) and \
                       not re.match(r'^[Aa]llow\b', next_part, re.I) and \
                       not re.match(r'^[Ii]f\b', next_part) and \
                       not is_marks_count(next_part):
                        ans = clean_answer(ans + ' ' + next_part)
                if ans:
                    answers[current_q] = ans

    return answers


def extract_qp_text(pdf_path):
    """Extract question paper page texts, skipping cover pages."""
    doc = fitz.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        text = doc[i].get_text()
        pages.append(convert_symbols(text))
    return pages


def is_diagram_dependent(question_text):
    """Return True if this question requires a diagram/visual to answer."""
    text_lower = question_text.lower()

    for pattern in SKIP_QUESTION_PATTERNS:
        if re.search(pattern, text_lower):
            # Allow if "not to scale" with explicit measurements given in text
            if 'not to scale' in text_lower:
                has_enough_info = bool(
                    re.search(r'\d+\s*(cm|m|km|mm)\b', text_lower) and
                    re.search(r'(triangle|circle|rectangle|cuboid|cylinder|cone|sphere|isosceles|right.angled|equilateral)', text_lower)
                )
                if has_enough_info and pattern not in [r'draw\b', r'shade\b', r'plot\b', r'\bsketch\b', r'\bconstruct\b']:
                    return False
            return True
    return False


def infer_topic(question_text):
    """Infer mathematical topic from question text."""
    text_lower = question_text.lower()

    for topic, keywords in TOPIC_KEYWORDS.items():
        for kw in keywords:
            if re.search(kw, text_lower):
                return topic
    return 'Mathematics'


def parse_question_paper(pages):
    """
    Parse question paper to extract all question parts.
    Returns list of dicts with keys: key, num, sub, subsub, text
    """
    questions = []

    # Skip first 1-2 pages (cover + optionally formula page)
    # Detect formula page by 'List of formulas' or 'INSTRUCTIONS'
    start_page = 1
    for i in range(1, min(3, len(pages))):
        if 'List of formulas' in pages[i] or ('Area,' in pages[i] and 'Volume,' in pages[i]):
            start_page = i + 1
            break

    # Combine relevant pages
    full_text = '\n'.join(pages[start_page:])

    # Clean up common noise
    full_text = re.sub(r'\[Turn over\]?', '', full_text)
    full_text = re.sub(r'BLANK PAGE', '', full_text)
    full_text = re.sub(r'©[^\n]*\n', '', full_text)
    full_text = re.sub(r'0580/[^\n]*\n', '', full_text)
    full_text = re.sub(r'Cambridge IGCSE[^\n]*\n', '', full_text)
    full_text = re.sub(r'UCLES \d+\n?', '', full_text)
    full_text = re.sub(r'Cambridge University Press[^\n]*\n?', '', full_text)
    full_text = re.sub(r'Permission to reproduce[^\n]*\n?', '', full_text)
    full_text = re.sub(r'Cambridge Assessment[^\n]*\n?', '', full_text)
    full_text = re.sub(r'^\d+\s*$', '', full_text, flags=re.MULTILINE)  # Page numbers

    # Remove answer box indicators
    full_text = re.sub(r'\.{4,}', '', full_text)
    full_text = re.sub(r'\[(\d+)\]', '', full_text)

    # Normalize whitespace
    full_text = re.sub(r'[ \t]+', ' ', full_text)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text)

    lines = full_text.split('\n')

    # State machine to collect question blocks
    current_num = None
    current_sub = None
    current_intro = []  # Context before sub-parts
    current_text = []
    all_blocks = []

    def flush_block():
        if current_num and current_text:
            txt = '\n'.join(current_text).strip()
            if txt and len(txt) > 8:
                key = current_num
                sub = ''
                subsub = ''
                if current_sub:
                    m = re.match(r'^([a-z])(?:\(([ivx]+)\))?$', current_sub)
                    if m:
                        sub = m.group(1)
                        subsub = m.group(2) or ''
                        key = current_num + sub + subsub
                all_blocks.append({
                    'key': key,
                    'num': current_num,
                    'sub': sub,
                    'subsub': subsub,
                    'text': txt,
                })

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Check for main question number: line starts with digit(s) followed by content
        # Pattern: "12 " at start, or "12\t" (tab-separated format)
        main_q_match = re.match(r'^(\d+)\s+(.+)$', line) or re.match(r'^(\d+)\t(.+)$', line)
        if main_q_match:
            qnum = main_q_match.group(1)
            qcontent = main_q_match.group(2).strip()
            # Validate it's a question number (1-50)
            if 1 <= int(qnum) <= 50:
                flush_block()
                current_num = qnum
                current_sub = None
                current_intro = [qcontent]
                current_text = [qcontent]
                i += 1
                continue

        # Check for sub-part: "(a) text" or "(a)\t text"
        sub_match = re.match(r'^\(([a-z])\)\s+(.+)$', line) or re.match(r'^\(([a-z])\)\t(.+)$', line) or \
                    re.match(r'^\(([a-z])\)\s*$', line)
        if sub_match and current_num:
            flush_block()
            sub_label = sub_match.group(1)
            sub_content = sub_match.group(2).strip() if len(sub_match.groups()) > 1 and sub_match.group(2) else ''
            current_sub = sub_label
            current_text = []
            # Include intro context in each sub-part
            if current_intro:
                current_text = list(current_intro) + ([sub_content] if sub_content else [])
            else:
                current_text = [sub_content] if sub_content else []
            i += 1
            continue

        # Check for sub-sub-part: "(i) text" or "(ii) text" etc.
        subsub_match = re.match(r'^\((i{1,3}v?|iv|vi{0,3})\)\s+(.+)$', line) or \
                       re.match(r'^\((i{1,3}v?|iv|vi{0,3})\)\t(.+)$', line) or \
                       re.match(r'^\((i{1,3}v?|iv|vi{0,3})\)\s*$', line)
        if subsub_match and current_num and current_sub:
            flush_block()
            subsub_label = subsub_match.group(1)
            subsub_content = subsub_match.group(2).strip() if len(subsub_match.groups()) > 1 and subsub_match.group(2) else ''
            old_sub = current_sub
            current_sub = f"{old_sub}({subsub_label})"
            context_lines = list(current_intro)
            current_text = context_lines + ([subsub_content] if subsub_content else [])
            i += 1
            continue

        # Regular content line - add to current block
        if current_num and line:
            # Skip lines that are clearly not question text
            if not re.match(r'^(NOT TO SCALE|© |This document|Permission|Cambridge Assessment)', line) and \
               not re.match(r'^\d+$', line):  # Skip standalone page numbers
                current_text.append(line)
                if not current_sub:
                    current_intro.append(line)

        i += 1

    flush_block()

    return all_blocks


def process_paper(pair):
    """Process a QP + MS pair and return extracted question list."""
    qp_path = os.path.join(IGCSE_DIR, pair['qp'])
    ms_path = os.path.join(IGCSE_DIR, pair['ms'])
    year = pair['year']
    paper = pair['paper']

    print(f"\nProcessing {paper} ({year})...")

    qp_pages = extract_qp_text(qp_path)
    answers = parse_mark_scheme(ms_path)
    print(f"  MS answers found: {len(answers)} — keys: {sorted(answers.keys())[:10]}...")

    questions = parse_question_paper(qp_pages)
    print(f"  QP question parts: {len(questions)}")

    results = []
    skipped_diagram = 0
    skipped_no_answer = 0

    for q in questions:
        if is_diagram_dependent(q['text']):
            skipped_diagram += 1
            continue

        answer = answers.get(q['key'], '')
        if not answer:
            skipped_no_answer += 1
            continue

        # Build display number string
        num_str = q['num']
        if q['sub']:
            if q['subsub']:
                num_str = f"{q['num']}({q['sub']})({q['subsub']})"
            else:
                num_str = f"{q['num']}({q['sub']})"

        q_id = f"IGCSE_{year}_{paper}_{num_str}"

        # Clean question text
        q_text = re.sub(r'\s+', ' ', q['text']).strip()

        topic = infer_topic(q_text)

        results.append({
            'id': q_id,
            'source': 'IGCSE',
            'year': year,
            'paper': paper,
            'number': num_str,
            'question': q_text,
            'answer': answer,
            'topic': topic,
        })

    print(f"  Kept: {len(results)} | Skipped (diagram): {skipped_diagram} | No answer: {skipped_no_answer}")
    return results


def main():
    all_questions = []

    for pair in PAPER_PAIRS:
        try:
            questions = process_paper(pair)
            all_questions.extend(questions)
        except Exception as e:
            print(f"  ERROR processing {pair['paper']}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\nTotal questions extracted: {len(all_questions)}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"Output written to {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
