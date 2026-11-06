import csv, io, json, re
from pathlib import Path
from fastapi import HTTPException

MAX_BYTES = 4 * 1024 * 1024
FORMATS = {'.pdf', '.docx', '.txt', '.csv', '.json'}
def extract(filename: str, data: bytes):
    extension = Path(filename).suffix.lower()
    if extension not in FORMATS: raise HTTPException(400, 'Supported formats: PDF, DOCX, TXT, CSV, JSON.')
    if len(data) > MAX_BYTES: raise HTTPException(413, 'Documents must be 4 MB or smaller.')
    try:
        if extension == '.pdf':
            import pymupdf
            with pymupdf.open(stream=data, filetype='pdf') as doc:
                if len(doc) > 150: raise HTTPException(400, 'Maximum 150 pages per document.')
                pages = [(i+1, p.get_text()) for i, p in enumerate(doc)]
        elif extension == '.docx':
            import zipfile
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if sum(f.file_size for f in z.infolist()) > 20 * 1024 * 1024: raise HTTPException(400, 'Expanded document too large.')
            from docx import Document
            doc = Document(io.BytesIO(data))
            text = '\n'.join([p.text for p in doc.paragraphs] + [' | '.join(c.text for c in r.cells) for t in doc.tables for r in t.rows])
            pages = [(1, text)]
        else:
            text = data.decode('utf-8-sig')
            if extension == '.json': text = json.dumps(json.loads(text), ensure_ascii=False, indent=2)
            if extension == '.csv': text = '\n'.join(' | '.join(row) for row in csv.reader(io.StringIO(text)))
            pages = [(1, text)]
        result = []
        for page, text in pages:
            text = re.sub(r'[ \t]+', ' ', text).strip()
            words = text.split()
            for start in range(0, len(words), 180):
                chunk = ' '.join(words[start:start+220])
                if chunk: result.append((page, chunk))
        if not result: raise HTTPException(400, 'No extractable text. Scanned PDFs require OCR before upload.')
        if sum(len(t) for _, t in result) > 500000: raise HTTPException(400, 'Extracted document exceeds 500,000 characters.')
        return result
    except HTTPException: raise
    except Exception: raise HTTPException(400, 'The document could not be read. Check that it is valid and not encrypted.')
