"""Split a Claude Design .dc.html into its logic (<script data-dc-script>),
its template (<x-dc>) and the <style> blocks of its <helmet>."""
import re, sys
src, base = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf8").read()
i = s.index("data-dc-script"); j = s.index(">", i); k = s.index("</script>", j)
open(base + ".js", "w").write(s[j + 1:k])
tpl = s[s.index("<x-dc>"):s.index("</x-dc>")]
open(base + ".tpl.html", "w").write(tpl)
h = tpl[:tpl.index("</helmet>")]
open(base + ".helmet.css", "w").write("\n".join(re.findall(r"<style>([\s\S]*?)</style>", h)))
