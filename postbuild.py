"""After `vite build`: move <meta charset> and the page's own <title> to the very top of
dist/index.html (claude.ai reads the page title from the first 8 KB, and Vite puts the
inlined CSS and JS first). Only the real page title is moved — bundled libraries contain
<title> strings of their own inside their code, which must stay untouched."""
import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "index.html")
s = open(p).read()
TITLE = "<title>BHSC Amplification Estimate</title>"
if s.count(TITLE) != 1:
    raise SystemExit(f"expected exactly one {TITLE!r} in dist/index.html")
s = s.replace(TITLE, "", 1)
if s.startswith('<meta charset="utf-8">'):
    s = s[len('<meta charset="utf-8">'):]
open(p, "w").write('<meta charset="utf-8">\n' + TITLE + "\n" + s.lstrip("\n"))
