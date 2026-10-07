// Renderer halaman personal: mengubah teks surat (content/personal-letter.js)
// menjadi satu halaman HTML yang enak dibaca dan enak dipresentasikan.
//
// Teksnya TIDAK diubah — hanya dikelompokkan: heading (## ), paragraf, daftar
// bernomor, dan bullet. Dua perlakuan khusus:
//   - "Values" -> empat kartu bernomor (judul + penjelasan)
//   - "Green Flags" + "Red Flags" -> dua panel berdampingan
//
// Render dilakukan saat request, jadi kalau teks suratnya diedit, tampilannya
// ikut menyesuaikan sendiri tanpa perlu build ulang.

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Pecah teks jadi blok. Baris lanjutan digabung: paragraf ke paragraf, baris
 *  kedua pada list jadi `body` dari item (judul tetap baris pertamanya). */
export function parseBlocks(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let open = null;
  const close = () => {
    if (open) blocks.push(open);
    open = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line === "") {
      close();
      continue;
    }
    if (line.startsWith("## ")) {
      close();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }

    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      if (!open || open.type !== "ol") {
        close();
        open = { type: "ol", items: [] };
      }
      open.items.push({ label: num[1], title: num[2].trim(), body: "" });
      continue;
    }

    if (line.startsWith("- ")) {
      if (!open || open.type !== "ul") {
        close();
        open = { type: "ul", items: [] };
      }
      open.items.push({ title: line.slice(2).trim(), body: "" });
      continue;
    }

    // Lanjutan
    if (open && open.type === "p") {
      open.text = `${open.text} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }
    if (open && (open.type === "ol" || open.type === "ul")) {
      const last = open.items[open.items.length - 1];
      last.body = `${last.body} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }

    close();
    open = { type: "p", text: line };
  }
  close();
  return blocks;
}

const itemText = (it) => `${it.title} ${it.body}`.replace(/\s+/g, " ").trim();

const CSS = `
:root {
  color-scheme: light;
  --bg: #faf6f0; --card: #ffffff; --ink: #1f1c19; --muted: #6f665c;
  --accent: #b03a52; --accent-soft: #fdeef1;
  --green: #2f7d5d; --green-soft: #ecf7f1;
  --amber: #a8641a; --amber-soft: #fdf4e8;
  --line: #ece3d8;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans);
  font-size: 17px; line-height: 1.75; -webkit-text-size-adjust: 100%;
}
.bg-wash {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(900px 480px at 12% -8%, #fdeef1 0%, rgba(253,238,241,0) 60%),
    radial-gradient(800px 420px at 92% 6%, #fdf4e8 0%, rgba(253,244,232,0) 62%);
}
.progress {
  position: fixed; top: 0; left: 0; height: 3px; width: 0; z-index: 40;
  background: linear-gradient(90deg, var(--accent), #d97757); transition: width .12s linear;
}
.nav {
  position: sticky; top: 0; z-index: 30; backdrop-filter: blur(12px);
  background: rgba(250,246,240,.82); border-bottom: 1px solid var(--line);
}
.nav-inner {
  max-width: 46rem; margin: 0 auto; padding: .6rem 1.25rem;
  display: flex; gap: .5rem; overflow-x: auto; scrollbar-width: none;
}
.nav-inner::-webkit-scrollbar { display: none; }
.nav a {
  flex: 0 0 auto; font-family: var(--mono); font-size: .68rem; letter-spacing: .04em;
  text-transform: uppercase; text-decoration: none; color: var(--muted);
  border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: .34rem .7rem;
}
.nav a:hover { color: var(--accent); border-color: rgba(176,58,82,.4); }
.page { max-width: 46rem; margin: 0 auto; padding: 2.4rem 1.25rem 4rem; }

.hero { text-align: center; padding: .5rem 0 1.6rem; }
.avatar {
  width: 108px; height: 108px; border-radius: 50%; object-fit: cover;
  border: 3px solid #fff; box-shadow: 0 0 0 1px var(--line), 0 18px 34px -20px rgba(31,28,25,.5);
}
.eyebrow {
  display: inline-block; margin: 1.1rem 0 .55rem; font-family: var(--mono);
  font-size: .68rem; letter-spacing: .14em; text-transform: uppercase;
  color: var(--accent); background: var(--accent-soft); border-radius: 999px; padding: .3rem .75rem;
}
.hero h1 { font-family: var(--serif); font-size: clamp(1.9rem, 6vw, 2.6rem); margin: 0 0 .3rem; letter-spacing: -.01em; }
.hero .sub { color: var(--muted); font-size: .92rem; margin: 0; }
.lead { margin-top: 1.7rem; }
.lead p { font-size: 1.07rem; line-height: 1.8; }

.sec {
  background: var(--card); border: 1px solid var(--line); border-radius: 18px;
  padding: 1.5rem 1.4rem; margin-top: 1.15rem;
  box-shadow: 0 20px 40px -34px rgba(31,28,25,.45);
  opacity: 0; transform: translateY(12px); transition: opacity .55s ease, transform .55s ease;
}
.sec.on { opacity: 1; transform: none; }
.sec h2 {
  font-family: var(--serif); font-size: 1.3rem; margin: 0 0 .9rem; padding-left: .8rem;
  border-left: 3px solid var(--accent); line-height: 1.3;
}
.sec p { margin: 0 0 .95rem; }
.sec p:last-child { margin-bottom: 0; }

.values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
.value { border: 1px solid var(--line); border-radius: 14px; padding: .95rem 1rem; background: #fffdfb; }
.value .num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.65rem; height: 1.65rem; border-radius: 50%; background: var(--accent-soft);
  color: var(--accent); font-family: var(--mono); font-size: .78rem; margin-bottom: .5rem;
}
.value strong { display: block; font-family: var(--serif); font-size: 1.05rem; margin-bottom: .25rem; }
.value p { font-size: .94rem; margin: 0; }

.flags { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; align-items: start; }
.flag { border-radius: 14px; padding: 1rem; border: 1px solid var(--line); }
.flag.green { background: var(--green-soft); border-color: rgba(47,125,93,.25); }
.flag.red { background: var(--amber-soft); border-color: rgba(168,100,26,.25); }
.flag .tag {
  display: inline-flex; align-items: center; gap: .35rem; font-family: var(--mono);
  font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; margin-bottom: .6rem;
}
.flag.green .tag { color: var(--green); }
.flag.red .tag { color: var(--amber); }
.flag ul { margin: 0; padding-left: 1.05rem; }
.flag li { font-size: .94rem; margin-bottom: .5rem; }
.flag li:last-child { margin-bottom: 0; }

.bullets { margin: 0 0 .95rem; padding-left: 1.15rem; }
.bullets li { margin-bottom: .45rem; }
.bullets li:last-child { margin-bottom: 0; }

.actions { display: flex; flex-wrap: wrap; gap: .55rem; justify-content: center; margin-top: 2rem; }
.actions button, .actions a {
  font: inherit; font-size: .78rem; font-family: var(--mono); letter-spacing: .04em;
  text-decoration: none; cursor: pointer; padding: .55rem .9rem; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; color: var(--muted);
}
.actions button:hover, .actions a:hover { color: var(--accent); border-color: rgba(176,58,82,.4); }
.foot { text-align: center; color: var(--muted); font-size: .8rem; margin-top: 1.5rem; }

@media (max-width: 560px) {
  body { font-size: 16px; }
  .values, .flags { grid-template-columns: minmax(0, 1fr); }
  .page { padding: 1.4rem 1rem 3rem; }
  .sec { padding: 1.25rem 1.1rem; }
}
@media print {
  .nav, .progress, .actions { display: none !important; }
  body { background: #fff; }
  .bg-wash { display: none; }
  .sec { box-shadow: none; opacity: 1 !important; transform: none !important; break-inside: avoid; }
  .page { padding: 0; max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sec { opacity: 1; transform: none; transition: none; }
  html { scroll-behavior: auto; }
}
`;

function flagPanel(color, heading, items, paras = []) {
  const tag = color === "green" ? "✓ Bisa jadi nilai plus" : "⚠ Sebaiknya kamu tahu";
  const intro = paras.map((p) => `<p>${esc(p)}</p>`).join("");
  return `<div class="flag ${color}">
    <div class="tag">${tag} · ${esc(heading)}</div>
    ${intro}
    <ul>${items.map((it) => `<li>${esc(itemText(it))}</li>`).join("")}</ul>
  </div>`;
}

/**
 * @param {string} text isi surat apa adanya
 * @param {{avatar?: string, name?: string, role?: string, textHref?: string}} opts
 */
export function renderLetterPage(text, opts = {}) {
  const { avatar = "/avatar.jpg", name = "Febrian", role = "Cloud Engineer", textHref = "/personal.txt" } = opts;

  const blocks = parseBlocks(text);
  const firstHeading = blocks.findIndex((b) => b.type === "h2");
  const intro = (firstHeading === -1 ? blocks : blocks.slice(0, firstHeading)).filter((b) => b.type === "p");
  const rest = firstHeading === -1 ? [] : blocks.slice(firstHeading);

  const green = [];
  const red = [];
  const greenParas = [];
  const redParas = [];
  const cards = [];
  const nav = [];
  let flagsId = null;

  let i = 0;
  while (i < rest.length) {
    const heading = rest[i];
    if (heading.type !== "h2") {
      i++;
      continue;
    }
    const body = [];
    i++;
    while (i < rest.length && rest[i].type !== "h2") {
      body.push(rest[i]);
      i++;
    }

    const items = body.filter((b) => b.items).flatMap((b) => b.items);
    // Paragraf bebas di dalam satu bagian juga harus ikut tampil, bukan dibuang.
    const paras = body.filter((b) => b.type === "p").map((b) => b.text);

    if (/green/i.test(heading.text)) {
      green.push(...items);
      greenParas.push(...paras);
    }
    if (/red/i.test(heading.text)) {
      red.push(...items);
      redParas.push(...paras);
    }
    if (/flags/i.test(heading.text)) {
      if (!flagsId) {
        flagsId = "flags";
        nav.push(`<a href="#flags">Flags</a>`);
      }
      continue;
    }

    const id = slug(heading.text);
    nav.push(`<a href="#${id}">${esc(heading.text)}</a>`);

    if (/^values$/i.test(heading.text.trim())) {
      cards.push(`<section class="sec" id="${id}"><h2>${esc(heading.text)}</h2>
        ${paras.map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="values">${items
          .map(
            (it) => `<div class="value">
              <span class="num">${esc(it.label || "")}</span>
              <strong>${esc(it.title)}</strong>
              ${it.body ? `<p>${esc(it.body)}</p>` : ""}
            </div>`,
          )
          .join("")}</div></section>`);
      continue;
    }

    const inner = body
      .map((b) => {
        if (b.type === "p") return `<p>${esc(b.text)}</p>`;
        if (b.items) return `<ul class="bullets">${b.items.map((it) => `<li>${esc(itemText(it))}</li>`).join("")}</ul>`;
        return "";
      })
      .join("\n");
    cards.push(`<section class="sec" id="${id}"><h2>${esc(heading.text)}</h2>${inner}</section>`);
  }

  if (green.length || red.length) {
    cards.push(`<section class="sec" id="${flagsId || "flags"}"><h2>Flags</h2>
      <div class="flags">
        ${green.length || greenParas.length ? flagPanel("green", "Potential Green Flags", green, greenParas) : ""}
        ${red.length || redParas.length ? flagPanel("red", "Possible Red Flags", red, redParas) : ""}
      </div></section>`);
  }

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#faf6f0" />
<title>${esc(name)} — versi personal</title>
<style>${CSS}</style>
</head>
<body>
<div class="bg-wash"></div>
<div class="progress" id="progress"></div>
<nav class="nav"><div class="nav-inner">${nav.join("")}</div></nav>

<main class="page">
  <header class="hero">
    <img class="avatar" src="${esc(avatar)}" alt="${esc(name)}" width="108" height="108" />
    <div class="eyebrow">Versi personal</div>
    <h1>${esc(name)}</h1>
    <p class="sub">${esc(role)}</p>
  </header>

  <div class="sec lead on">${intro.map((b) => `<p>${esc(b.text)}</p>`).join("\n")}</div>

  ${cards.join("\n  ")}

  <div class="actions">
    <button type="button" onclick="window.print()">Cetak / simpan PDF</button>
    <a href="${esc(textHref)}">Versi teks (.txt)</a>
    <a href="?logout=1">Keluar</a>
  </div>
  <p class="foot">Versi personal — hanya untuk yang diberi akses.</p>
</main>

<script>
(function () {
  var bar = document.getElementById("progress");
  var onScroll = function () {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var secs = document.querySelectorAll(".sec");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("on");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    secs.forEach(function (s) { io.observe(s); });
  } else {
    secs.forEach(function (s) { s.classList.add("on"); });
  }
})();
</script>
</body>
</html>`;
}
