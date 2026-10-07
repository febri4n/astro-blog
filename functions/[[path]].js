// Cloudflare Pages Function — halaman personal ber-password.
//
//   /personal       halaman yang enak dibaca / dipresentasikan
//   /personal.txt   teks mentahnya, buat yang mau copy-paste
//
// Isi surat diimpor dari content/personal-letter.js (di luar public/, jadi tidak
// pernah ter-deploy sebagai aset statis dan tidak punya URL sendiri).

import content from "../content/personal-letter.js";
import { renderLetterPage } from "../content/personal-page.js";
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

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  const wantsText = path === "/personal.txt";
  const wantsPage = path === "/personal";

  // Path lain (termasuk /content/... dan /lib/...) tetap diserahkan ke aset statis.
  if (!wantsText && !wantsPage) return next();

  // Sub-path di bawah /personal diarahkan ke halaman utamanya.
  if (!wantsText && url.pathname !== "/personal") {
    return new Response(null, { status: 308, headers: { location: "/personal" } });
  }

  const serve = async (password) => {
    if (wantsText) return plainText(content);
    return html(renderLetterPage(content, { avatar: "/avatar.jpg" }));
  };

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
      const body = await serve(submitted);
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

  if (await isAuthenticated(request)) return serve(null);

  return html(loginPageHtml());
}
