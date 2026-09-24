"""Compare editable Word content with the source used for PDF generation."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
compact = lambda text: re.sub(r'\s+', '', text)
with zipfile.ZipFile('site/resume.docx') as archive:
    root = ET.fromstring(archive.read('word/document.xml'))
    actual = ''.join(n.text or '' for n in root.findall('.//w:t', ns))
    expected = ''.join(json.loads(Path('artifacts/resume-docx-source.json').read_text()))
    assert compact(actual) == compact(expected), 'DOCX text differs from PDF source'
    assert len(root.findall('.//w:sectPr', ns)) == 3
    assert len(root.findall('.//w:drawing', ns)) == 6
    assert root.findall('.//w:tbl', ns), 'Editable layout tables are missing'
    rels = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
    links = [r.attrib['Target'] for r in rels if r.attrib.get('TargetMode') == 'External']
    assert links and all(url.startswith(('https://', 'mailto:')) for url in links)
    settings = ET.fromstring(archive.read('word/settings.xml'))
    assert settings.find('w:documentProtection', ns) is None
print('PASS: DOCX text parity, 3 sections, 6 images, editable tables, links and no editing lock')
