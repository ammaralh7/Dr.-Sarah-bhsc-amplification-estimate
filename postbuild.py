"""After `vite build`: move the page's own <title> and <meta> tags to the very top of
dist/index.html. Vite puts the inlined CSS and JS first, but claude.ai reads the page title from
the first 8 KB, and phones need the viewport tag early. Only the page's own tags are moved: they
sit after the last </script>. Bundled libraries contain <title> and <meta> strings of their own
inside their code, which must stay untouched."""
import os
import re

p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "index.html")
s = open(p).read()
TITLE = "<title>BHSC Amplification Estimate</title>"
CHARSET = '<meta charset="utf-8">'
if s.count(TITLE) != 1:
    raise SystemExit(f"expected exactly one {TITLE!r} in dist/index.html")
if "</script>" not in s:
    raise SystemExit("expected the inlined </script> in dist/index.html")
s = s.replace(TITLE, "", 1)
cut = s.rfind("</script>") + len("</script>")
body, tail = s[:cut], s[cut:]
metas = [m for m in re.findall(r"<meta [^>]*>", tail) if m != CHARSET]
tail = re.sub(r"<meta [^>]*>\n?", "", tail)
s = body + tail
if s.startswith(CHARSET):
    s = s[len(CHARSET):]
open(p, "w").write("\n".join([CHARSET, TITLE, *metas]) + "\n" + s.lstrip("\n"))
