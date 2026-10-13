// Cloudflare Pages Function — /personal.txt
//
// Sisa dari halaman personal yang sudah selesai masa pakainya: halaman
// /personal dan /personal.html sudah dihapus, yang tinggal cuma teks mentah
// suratnya di balik password.
//
// Kalau teks ini juga tidak diperlukan lagi, hapus file ini beserta
// content/personal-letter.js dan lib/personal-gate.js.

import content from "../content/personal-letter.js";
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

  if (path !== "/personal.txt") return next();

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
      const body = plainText(content);
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

  return plainText(content);
}
