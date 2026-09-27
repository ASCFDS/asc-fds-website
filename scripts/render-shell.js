import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const header = readFileSync("partials/header.html", "utf8").trim();
const footer = readFileSync("partials/footer.html", "utf8").trim();
for (const file of [
  ...readdirSync(".").filter((f) => f.endsWith(".html")),
  "spende/index.html",
]) {
  const path = file.includes("spende") ? "/spende" : "/" + file;
  let nav = header.replace(
    /<a([^>]*?)href="([^"]+)"([^>]*)>/g,
    (match, before, href, after) => {
      if (href !== path || before.includes("brand")) return match;
      if (before.includes("class="))
        before = before.replace('class="', 'class="active ');
      else before += ' class="active" ';
      return `<a${before}href="${href}"${after} aria-current="page">`;
    },
  );
  let s = readFileSync(file, "utf8")
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, nav)
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer);
  if (!s.includes('id="assistant-root"'))
    s = s.replace("</body>", '  <div id="assistant-root"></div>\n</body>');
  writeFileSync(file, s);
}
