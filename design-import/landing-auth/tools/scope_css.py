"""Scope a stylesheet under one class: every selector gets the scope prefix;
:root / html / body become the scope itself. @keyframes and @font-face stay
global; @media / @supports recurse."""
import re, sys

SCOPE = sys.argv[1]
ins = sys.argv[2:-1]
out = sys.argv[-1]


def strip_comments(css):
    return re.sub(r"/\*[\s\S]*?\*/", "", css)


def scope_selector(sel):
    sel = sel.strip()
    if not sel:
        return sel
    parts = []
    for s in split_top(sel, ","):
        s = s.strip()
        s2 = re.sub(r"^(:root|html|body)(?=$|[\s.:\[>+~])", SCOPE, s)
        if s2 != s:
            parts.append(s2)
            continue
        if s.startswith("::selection") or s.startswith("::-"):
            parts.append(f"{SCOPE} {s}, {SCOPE}{s}")
            continue
        # an attribute selector on the scope's own root element too
        parts.append(f"{SCOPE} {s}")
    return ", ".join(parts)


def split_top(s, ch):
    out, depth, cur = [], 0, ""
    for c in s:
        if c in "([":
            depth += 1
        elif c in ")]":
            depth -= 1
        if c == ch and depth == 0:
            out.append(cur); cur = ""
        else:
            cur += c
    out.append(cur)
    return out


def walk(css):
    res, i = [], 0
    while i < len(css):
        j = css.find("{", i)
        if j < 0:
            res.append(css[i:])
            break
        head = css[i:j].strip()
        # find the matching brace
        depth, k = 0, j
        while k < len(css):
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        body = css[j + 1:k]
        if head.startswith("@import"):
            pass
        if head.startswith("@media") or head.startswith("@supports") or head.startswith("@container"):
            res.append(head + "{" + walk(body) + "}")
        elif head.startswith("@keyframes") or head.startswith("@font-face") or head.startswith("@property"):
            res.append(head + "{" + body + "}")
        else:
            # @import lines before the rule
            imports = re.findall(r"@import[^;]*;", head)
            head = re.sub(r"@import[^;]*;", "", head).strip()
            res.extend(imports)
            if re.fullmatch(r"\s*(html|body)(\s*,\s*(html|body))*\s*", head):
                # overflow on the scope would make it a scroll container and break
                # position:sticky inside; SiteClients sets it on the real <body>.
                body = re.sub(r"overflow(-x|-y)?\s*:[^;]*;?", "", body)
            res.append(scope_selector(head) + "{" + body + "}")
        i = k + 1
    return "\n".join(r for r in res if r.strip())


css = "\n".join(strip_comments(open(p, encoding="utf8").read()) for p in ins)
css = re.sub(r"@import[^;]*;", "", css)
open(out, "w").write(walk(css) + "\n")
