"""Claude Design .dc template (x-dc) -> TSX render body.

Usage: python3 dc2tsx.py <template.html> <out.tsx-fragment> <out.css> <hover-prefix> <ds-names>
Emits: a JSX expression (the template body without <helmet>) using bare
identifiers for renderVals keys, plus a CSS file with the style-hover /
style-active rules as generated classes. Prints the root identifiers used.
"""
import re, sys, json

src, out_jsx, out_css, prefix = sys.argv[1:5]
t = open(src, encoding="utf8").read()
t = t[t.index("</helmet>") + len("</helmet>"):]
t = t[: t.rindex("</x-dc>")] if "</x-dc>" in t else t
t = re.sub(r"<!--[\s\S]*?-->", "", t)

VOID = {"img", "input", "br", "link", "meta", "source", "hr"}
TOKEN = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:=\"[^\"]*\")?)*)\s*(/?)>", re.S)
ATTR = re.compile(r"([^\s=>/]+)(?:=\"([^\"]*)\")?")
EXPR = re.compile(r"\{\{\s*([\s\S]*?)\s*\}\}")

used = set()
locals_stack = []
JS_WORDS = {"true", "false", "null", "undefined", "this", "new", "typeof", "Math", "String", "Number", "JSON", "Object", "Array", "window", "document", "$index"}


def note_ids(expr):
    s = re.sub(r"'(?:\\.|[^'])*'|\"(?:\\.|[^\"])*\"|`(?:\\.|[^`])*`", "", expr)
    for m in re.finditer(r"(?<![.\w$])([A-Za-z_$][\w$]*)", s):
        name = m.group(1)
        if name in JS_WORDS or any(name in l for l in locals_stack):
            continue
        # object-literal keys like {a: 1} are rare in templates; ignore "x:" right after { or ,
        tail = s[m.end():].lstrip()
        if tail.startswith(":") and not tail.startswith("::"):
            prev = s[: m.start()].rstrip()
            if prev.endswith("{") or prev.endswith(","):
                continue
        used.add(name)


def expr(e):
    note_ids(e)
    return e


def tmpl(value):
    """A string with {{ }} parts -> JS expression."""
    parts = EXPR.split(value)
    if len(parts) == 3 and parts[0] == "" and parts[2] == "":
        return "(" + expr(parts[1]) + ")"
    out = []
    for i, p in enumerate(parts):
        if i % 2:
            out.append("${" + expr(p) + "}")
        else:
            out.append(p.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${"))
    return "`" + "".join(out) + "`"


def camel(prop):
    if prop.startswith("--"):
        return json.dumps(prop)
    p = prop.strip()
    if p.startswith("-ms-"):
        p = "ms-" + p[4:]
    elif p.startswith("-"):
        p = p[1:]
        p = p[0].upper() + p[1:] if p else p
        p = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), p)
        return p
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), p)


def split_decls(css):
    decls, depth, cur, q = [], 0, "", None
    i = 0
    while i < len(css):
        c = css[i]
        if css.startswith("{{", i):
            j = css.index("}}", i)
            cur += css[i:j + 2]; i = j + 2; continue
        if q:
            cur += c
            if c == q: q = None
        elif c in "'\"":
            q = c; cur += c
        elif c == "(":
            depth += 1; cur += c
        elif c == ")":
            depth -= 1; cur += c
        elif c == ";" and depth == 0:
            decls.append(cur); cur = ""
        else:
            cur += c
        i += 1
    if cur.strip():
        decls.append(cur)
    return [d for d in decls if d.strip()]


def style_obj(css):
    items = []
    for d in split_decls(css):
        if ":" not in d:
            continue
        k, v = d.split(":", 1)
        k, v = k.strip(), v.strip()
        if not k:
            continue
        items.append(camel(k) + ": " + tmpl(v) if "{{" in v else camel(k) + ": " + json.dumps(v))
    return "{{" + ", ".join(items) + "}}"


hover_rules = []
ATTR_MAP = {"class": "className", "for": "htmlFor", "tabindex": "tabIndex", "readonly": "readOnly",
            "maxlength": "maxLength", "autocomplete": "autoComplete", "autofocus": "autoFocus",
            "srcset": "srcSet", "crossorigin": "crossOrigin", "colspan": "colSpan"}
BOOL_ATTRS = {"muted", "loop", "playsInline", "autoPlay", "autoplay", "disabled", "checked", "required", "hidden", "readOnly", "multiple"}


def attrs_jsx(tag, raw, ds):
    out, pseudos = [], []
    for m in ATTR.finditer(raw):
        name, val = m.group(1), m.group(2)
        if val is None:
            out.append(name); continue
        if tag == "x-import" and name in ("component-from-global-scope", "hint-size"):
            continue
        if name in ("hint-placeholder-count", "hint-placeholder-val", "hint-size"):
            continue
        if name.startswith("style-"):
            pseudos.append((name[6:], val)); continue
        if name == "style":
            out.append("style=" + style_obj(val)); continue
        if name in ATTR_MAP:
            name = ATTR_MAP[name]
        elif not (name.startswith("data-") or name.startswith("aria-")) and "-" in name:
            name = re.sub(r"-([a-z])", lambda mm: mm.group(1).upper(), name)
        if name in BOOL_ATTRS and val in ("true", "", name):
            out.append(name + "={true}"); continue
        if name.startswith("on") and name[2:3].isupper() and "{{" not in val:
            continue
        if "{{" in val:
            out.append(name + "={" + tmpl(val) + "}")
        elif tag == "x-import" and re.fullmatch(r"-?\d+(\.\d+)?", val):
            out.append(name + "={" + val + "}")
        else:
            out.append(name + "=" + json.dumps(val))
    cls = None
    if pseudos:
        cls = f"{prefix}{len(hover_rules)}"
        hover_rules.append((cls, pseudos))
        joined = " ".join(out)
        if "className=" in joined:
            out = [a if not a.startswith("className=") else _merge_class(a, cls) for a in out]
        else:
            out.append(f'className="{cls}"')
    return out


def _merge_class(a, cls):
    v = a[len("className="):]
    if v.startswith('"'):
        return 'className=' + json.dumps(json.loads(v) + " " + cls)
    return "className={(" + v[1:-1] + ') + " ' + cls + '"}'


def css_rule(css):
    return ";".join(d.strip() + " !important" for d in split_decls(css) if ":" in d)


NO_TEXT = {"svg", "path", "g", "defs", "table", "thead", "tbody", "tr", "select", "ul", "ol"}


def text_jsx(s, parent=None):
    if not s:
        return ""
    # HTML keeps a newline between tags as a (collapsible) space — the line
    # break opportunity between inline words; JSX would drop it.
    if parent not in NO_TEXT and re.search(r"\s*\n\s*", s):
        if not s.strip():
            return '{" "}'
        lead = '{" "}' if re.match(r"\s*\n", s) else ""
        trail = '{" "}' if re.search(r"\n\s*$", s) else ""
        return lead + text_jsx(s.strip(), "__inner") + trail
    parts = EXPR.split(s)
    out = []
    for i, p in enumerate(parts):
        if i % 2:
            out.append("{" + expr(p) + "}")
        else:
            out.append(p.replace("{", "{'{'}").replace("}", "{'}'}").replace(">", "&gt;"))
    return "".join(out)


pos, stack, buf = 0, [], []
ds_used = set()
for m in TOKEN.finditer(t):
    buf.append(text_jsx(t[pos:m.start()], stack[-1] if stack else None))
    pos = m.end()
    closing, tag, raw, selfc = m.group(1), m.group(2), m.group(3), m.group(4)
    if closing:
        top = stack.pop()
        assert top == tag, (top, tag, t[m.start() - 200:m.start()])
        if tag == "sc-if":
            buf.append("</>) : null}")
        elif tag == "sc-for":
            locals_stack.pop()
            buf.append("</React.Fragment>))}")
        elif tag == "x-import":
            buf.append("</" + stack_x.pop() + ">")
        else:
            buf.append(f"</{tag}>")
        continue
    if tag == "sc-if":
        val = dict((a.group(1), a.group(2)) for a in ATTR.finditer(raw))["value"]
        buf.append("{" + tmpl(val) + " ? (<>")
        stack.append(tag)
        continue
    if tag == "sc-for":
        a = dict((x.group(1), x.group(2)) for x in ATTR.finditer(raw))
        lst, asn = tmpl(a["list"]), a.get("as", "item")
        buf.append("{((" + lst + ") || []).map((" + asn + ": any, $index: number) => (<React.Fragment key={$index}>")
        locals_stack.append({asn, "$index"})
        stack.append(tag)
        continue
    if tag == "x-import":
        a = dict((x.group(1), x.group(2)) for x in ATTR.finditer(raw))
        comp = "Ds" + a["component-from-global-scope"].split(".")[-1]
        ds_used.add(comp)
        stack_x = globals().setdefault("stack_x", [])
        stack_x.append(comp)
        buf.append("<" + comp + " " + " ".join(attrs_jsx(tag, raw, True)) + ">")
        stack.append(tag)
        continue
    attrs = attrs_jsx(tag, raw, False)
    if tag in VOID or selfc:
        buf.append(f"<{tag} " + " ".join(attrs) + " />")
    else:
        buf.append(f"<{tag} " + " ".join(attrs) + ">")
        stack.append(tag)
buf.append(text_jsx(t[pos:]))
assert not stack, stack

open(out_jsx, "w").write("".join(buf).strip())
with open(out_css, "w") as f:
    for cls, pseudos in hover_rules:
        for pseudo, css in pseudos:
            assert "{{" not in css, css
            if pseudo in ("before", "after"):
                f.write(f".{cls}::{pseudo}{{{css}}}\n")
            else:
                f.write(f".{cls}:{pseudo}{{{css_rule(css)}}}\n")
print(json.dumps({"used": sorted(used), "ds": sorted(ds_used), "hover": len(hover_rules)}))
