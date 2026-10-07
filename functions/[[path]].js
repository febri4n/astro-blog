// Cloudflare Pages Function — halaman personal ber-password.
//
//   /personal.html   halaman yang enak dibaca / dipresentasikan
//   /personal        sama dengan di atas
//   /personal.txt    teks mentah suratnya, buat yang mau copy-paste
//
// Tampilan halaman ada di content/personal-page-html.js, teks suratnya di
// content/personal-letter.js. Keduanya di luar public/, jadi tidak pernah ter-deploy
// sebagai aset statis dan tidak punya URL sendiri.

import content from "../content/personal-letter.js";
import pageHtml from "../content/personal-page-html.js";
import {
  HEADERS_LOCKED,
  clearedCookie,
  html,
  isAuthenticated,
  loginPageHtml,
  plainText,
  sessionCookie,
  verifyPassword,
} from "../lib/personal-gate.js";

const PAGE_PATHS = ["/personal.html", "/personal"];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  const wantsText = path === "/personal.txt";
  const wantsPage = PAGE_PATHS.includes(path);

  // Path lain (termasuk /content/... dan /lib/...) tetap diserahkan ke aset statis.
  if (!wantsText && !wantsPage) return next();

  // Sub-path di bawah /personal diarahkan ke halaman utamanya.
  if (!wantsText && url.pathname !== path) {
    return new Response(null, { status: 308, headers: { location: "/personal.html" } });
  }

  // Keluar
  if (url.searchParams.get("logout") === "1") {
    return html(loginPageHtml("Kamu sudah keluar. Masukkan password lagi kalau mau buka ulang."), 200, {
      "set-cookie": clearedCookie(),
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

    if (await verifyPassword(submitted)) {
      const body = wantsText ? plainText(content) : html(pageHtml);
      const headers = new Headers(body.headers);
      headers.append("set-cookie", await sessionCookie(submitted));
      return new Response(body.body, { status: 200, headers });
    }
    return html(loginPageHtml("Password-nya belum tepat. Coba lagi ya."), 401);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD, POST", ...HEADERS_LOCKED },
    });
  }

  if (!(await isAuthenticated(request))) return html(loginPageHtml());

  return wantsText ? plainText(content) : html(pageHtml);
}
