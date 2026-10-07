// Gerbang password untuk halaman personal (dipakai /personal dan /personal.txt).
//
// Password tidak disimpan sebagai teks: yang ada hanya verifier PBKDF2-SHA256
// 10.000 iterasi (10k ≈ 3 ms di V8, aman terhadap limit CPU Workers free tier).
// Cookie sesi = PBKDF2(password, salt_session); yang disimpan hanya SHA-256-nya,
// jadi cookie tidak bisa dipalsukan dari isi repo.

export const PBKDF2_ITERATIONS = 10000;
const SALT_PASSWORD = "0381224113677f205a67d7cac9d561be";
const PASSWORD_HASH = "de6095786eae9b59559776d29c9eee3f6f676c61318c4ab6558ba7e5673f2ed5";
const SALT_SESSION = "d39c1a9d46f63e14d20e11f857fa8376";
const SESSION_TOKEN_HASH = "71f850fa7c3a21a102cea6d071e3a0ff85e6e4c943ae3281dfac959886f6f8c2";

export const COOKIE_NAME = "personal_auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari
const FAIL_DELAY_MS = 400;                        // perlambat percobaan password online

export const HEADERS_LOCKED = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

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

/** Password benar? Sesuaikan juga jeda saat gagal. */
export async function verifyPassword(submitted) {
  const ok = safeEqual(await pbkdf2Hex(submitted, SALT_PASSWORD), PASSWORD_HASH);
  if (!ok) await new Promise((resolve) => setTimeout(resolve, FAIL_DELAY_MS));
  return ok;
}

/** Cookie sesi untuk password yang sudah terbukti benar. */
export async function sessionCookie(password) {
  const token = await pbkdf2Hex(password, SALT_SESSION);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Sudah login sebelumnya? */
export async function isAuthenticated(request) {
  const cookie = getCookie(request, COOKIE_NAME);
  if (!cookie) return false;
  return safeEqual(await sha256Hex(cookie), SESSION_TOKEN_HASH);
}

export function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", ...extra },
  });
}

export function plainText(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", ...HEADERS_LOCKED, ...extra },
  });
}

/** Halaman login, senada dengan halaman personalnya. */
export function loginPageHtml(message = "") {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Berkas terkunci</title>
<style>
  :root {
    color-scheme: light;
    --bg: #faf6f0; --card: #fff; --ink: #1f1c19; --muted: #6f665c;
    --accent: #b03a52; --line: #ece3d8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
    background: radial-gradient(1200px 600px at 50% -10%, #fdeef1 0%, var(--bg) 55%);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .card {
    width: 100%; max-width: 25rem; background: var(--card); border: 1px solid var(--line);
    border-radius: 18px; padding: 2rem 1.75rem; box-shadow: 0 18px 40px -24px rgba(31,28,25,.35);
  }
  .lock { font-size: 1.6rem; }
  h1 {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    font-size: 1.4rem; margin: .6rem 0 .5rem;
  }
  p { font-size: .9rem; line-height: 1.6; color: var(--muted); margin: 0 0 1.3rem; }
  label { display: block; font-size: .78rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: .45rem; }
  input {
    width: 100%; padding: .75rem .85rem; font: inherit; font-size: .95rem;
    border: 1px solid var(--line); border-radius: 10px; background: #fffdfb; color: var(--ink);
  }
  input:focus { outline: 2px solid rgba(176,58,82,.25); border-color: var(--accent); }
  button {
    width: 100%; margin-top: 1rem; padding: .8rem; font: inherit; font-size: .95rem; font-weight: 600;
    color: #fff; background: var(--accent); border: 0; border-radius: 10px; cursor: pointer;
  }
  button:hover { background: #9c3047; }
  .msg { color: #b3261e; font-size: .85rem; margin: 0 0 1rem; }
</style>
</head>
<body>
  <main class="card">
    <div class="lock">🔒</div>
    <h1>Berkas terkunci</h1>
    <p>Halaman ini diproteksi. Masukkan password yang kamu terima untuk membuka isinya.</p>
    ${message ? `<p class="msg">${message}</p>` : ""}
    <form method="POST">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus required />
      <button type="submit">Buka</button>
    </form>
  </main>
</body>
</html>`;
}
