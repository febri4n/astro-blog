// Cloudflare Pages Function — /personal.txt
//
// Surat personal yang dibuka pakai password. Isinya dikirim apa adanya sebagai
// text/plain HANYA setelah password benar.
//
// Model keamanan (jujur, sesuai kondisi repo yang publik):
//   - Password TIDAK disimpan sebagai teks. Yang ada di file ini hanya verifier
//     PBKDF2-SHA256 (salt acak + 10.000 iterasi) yang tidak bisa dibalik.
//   - Isi surat ada di content/personal-letter.js — sengaja di luar public/ supaya
//     tidak ikut ter-deploy sebagai aset statis. File itu hanya bisa dibaca lewat
//     function ini, bukan lewat URL.
//   - Karena repo-nya publik, verifier-nya juga publik: orang yang menemukan repo
//     ini bisa mencoba brute-force offline. Iterasi PBKDF2 dipilih 10.000 karena
//     Workers free tier punya limit CPU ~10 ms per request (10k ≈ 3 ms per derive).
//     Anggap ini gerbang untuk akses kasual, bukan vault.
//
// Cookie: token = PBKDF2(password, salt_session) -> hanya hash-nya yang disimpan,
// jadi cookie tidak bisa dipalsukan dari isi repo.

import content from "../content/personal-letter.js";

const PBKDF2_ITERATIONS = 10000;
const SALT_PASSWORD = "0381224113677f205a67d7cac9d561be";
const PASSWORD_HASH = "de6095786eae9b59559776d29c9eee3f6f676c61318c4ab6558ba7e5673f2ed5";
const SALT_SESSION = "d39c1a9d46f63e14d20e11f857fa8376";
const SESSION_TOKEN_HASH = "71f850fa7c3a21a102cea6d071e3a0ff85e6e4c943ae3281dfac959886f6f8c2";

const COOKIE_NAME = "personal_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari
const FAIL_DELAY_MS = 400;                 // memperlambat percobaan password online

const ENC = new TextEncoder();

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes) {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

async function pbkdf2Hex(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", ENC.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", ENC.encode(text));
  return bytesToHex(new Uint8Array(digest));
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = ENC.encode(a);
  const y = ENC.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

const NO_INDEX = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

function plainText(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", ...NO_INDEX, ...extra },
  });
}

function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...NO_INDEX, ...extra },
  });
}

function loginPage(message = "") {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Berkas terkunci</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0d1117;
    color: #e6edf3; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 1.5rem;
  }
  .card { width: 100%; max-width: 26rem; border: 1px solid #30363d; border-radius: 12px; padding: 1.75rem; background: #161b22; }
  h1 { font-size: 1rem; margin: 0 0 .4rem; letter-spacing: .05em; text-transform: uppercase; }
  p { font-size: .8rem; line-height: 1.55; color: #8b949e; margin: 0 0 1.2rem; }
  label { display: block; font-size: .75rem; color: #8b949e; margin-bottom: .4rem; }
  input { width: 100%; padding: .65rem .75rem; font: inherit; font-size: .85rem; background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; }
  input:focus { outline: none; border-color: #58a6ff; }
  button { width: 100%; margin-top: .9rem; padding: .7rem; font: inherit; font-size: .8rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; background: #238636; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
  button:hover { background: #2ea043; }
  .msg { margin: 0 0 1rem; font-size: .8rem; color: #f85149; }
</style>
</head>
<body>
  <main class="card">
    <h1>🔒 Berkas terkunci</h1>
    <p>Halaman ini diproteksi. Masukkan password yang kamu terima untuk membuka isinya.</p>
    ${message ? `<p class="msg">${message}</p>` : ""}
    <form method="POST" action="/personal.txt">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus required />
      <button type="submit">Buka</button>
    </form>
  </main>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Aman kalau function ini kelak dipakai sebagai catch-all.
  if (url.pathname !== "/personal.txt") return next();

  // Keluar
  if (url.searchParams.get("logout") === "1") {
    return html(loginPage("Kamu sudah keluar. Masukkan password lagi kalau mau buka ulang."), 200, {
      "set-cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    });
  }

  // Login
  if (request.method === "POST") {
    let submitted = "";
    try {
      const form = await request.formData();
      submitted = String(form.get("password") || "");
    } catch {
      submitted = "";
    }

    const candidate = await pbkdf2Hex(submitted, SALT_PASSWORD);
    if (safeEqual(candidate, PASSWORD_HASH)) {
      const token = await pbkdf2Hex(submitted, SALT_SESSION);
      return plainText(content, {
        "set-cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, FAIL_DELAY_MS));
    return html(loginPage("Password-nya belum tepat. Coba lagi ya."), 401);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD, POST", ...NO_INDEX } });
  }

  // Sudah pernah login?
  const cookie = getCookie(request, COOKIE_NAME);
  if (cookie && safeEqual(await sha256Hex(cookie), SESSION_TOKEN_HASH)) {
    return plainText(content);
  }

  return html(loginPage());
}
