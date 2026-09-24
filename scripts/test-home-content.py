"""Every home editor field must reach the generated page, escaped as text."""
import importlib.util
import tempfile
from html import escape
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('site_builder', root / 'build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
expected = []

def replace_fields(node, path='home'):
    for key, value in node.items():
        if isinstance(value, dict):
            replace_fields(value, path + '.' + key)
        else:
            node[key] = path + '.' + key + '<test>&'
            expected.append(escape(node[key]))

replace_fields(builder.DATA['home'])
with tempfile.TemporaryDirectory() as directory:
    builder.SITE = Path(directory)
    (builder.SITE / 'assets').symlink_to(root / 'site/assets', target_is_directory=True)
    builder.portfolio()
    builder.home()
    html = (builder.SITE / 'index.html').read_text()
    for value in expected:
        assert value in html, 'Home editor field not rendered: ' + value
print('PASS: all home editor fields render and escape HTML')
