"""Build an isolated design preview: python3 scripts/preview-design.py."""
from pathlib import Path
import re
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
subprocess.run(['python3', 'build.py'], cwd=root, check=True)
preview = root / 'artifacts/design-preview'
preview.mkdir(parents=True, exist_ok=True)
for lang in ('', 'en'):
    folder = preview / lang
    folder.mkdir(exist_ok=True)
    prefix = '../' if lang else ''
    for source in (root / 'site' / lang).glob('*.html'):
        html = source.read_text().replace('</head>', f'<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="{prefix}preview.css"></head>')
        html = re.sub(r'<meta name="ga-measurement-id"[^>]*>', '', html)
        (folder / source.name).write_text(html)
    for ext in ('pdf', 'docx'):
        target = folder / f'resume.{ext}'
        if not target.exists():
            target.symlink_to(root / 'site' / lang / target.name)
assets = preview / 'assets'
if not assets.exists():
    assets.symlink_to(root / 'site/assets', target_is_directory=True)
shutil.copyfile(root / 'templates/design-preview.css', preview / 'preview.css')
assert len(list(preview.rglob('*.html'))) == 6
print(f'Preview ready: {preview}')
print('Run: python3 -m http.server 4180 --bind 127.0.0.1 --directory artifacts/design-preview')
