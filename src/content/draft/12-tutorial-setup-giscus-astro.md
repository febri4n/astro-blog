---
title: "Tutorial Setup Giscus Comments di Blog Astro"
description: "Tutorial menambahkan kolom komentar gratis ke blog Astro menggunakan Giscus yang terintegrasi dengan GitHub Discussions, lengkap dengan dark mode."
tags: ["astro", "blog", "tutorial", "devops", "giscus", "github"]
draft: true
---

### Kenapa Perlu Kolom Komentar?

Setelah beberapa waktu ngeblog, pasti muncul keinginan untuk mendengar feedback dari pembaca. Masalahnya, sebagian besar platform komentar pihak ketiga:

- **Disqus** terlalu berat dan penuh iklan
- **Facebook Comments** mengharuskan login Facebook
- **Utterances** hanya support GitHub login, tetapi dependen pada GitHub Issues

Giscus hadir sebagai solusi yang menarik. Kolom komentar disimpan langsung di **GitHub Discussions** repository blog. Jadi setiap komentar adalah diskusi di repo GitHub. Ringan, gratis, bebas iklan, dan otomatis sinkron dengan repository.

### Prasyarat

Sebelum memulai, pastikan hal berikut sudah tersedia:

- Repository GitHub untuk blog (misal `username/astro-blog`)
- GitHub Discussions sudah diaktifkan di repository tersebut
- Blog sudah bisa diakses publik (tidak di localhost saja)

### Step 1: Aktifkan GitHub Discussions

GitHub Discussions harus diaktifkan terlebih dahulu di repository blog.

> [!TIP]
> Gunakan Kategori Announcements
> Giscus menggunakan kategori Announcements secara default. Kategori ini membatasi siapa yang bisa membuat thread baru — hanya repository owner. Pengguna lain hanya bisa berkomentar.

Buka repository di GitHub, masuk ke **Settings** &gt; **Features**, centang **Discussions**. Setelah itu akan muncul tab **Discussions** di repository.

Selanjutnya, buat satu kategori untuk komentar. Giscus menggunakan kategori **Announcements** secara default, karena kategori ini hanya mengizinkan repository owner yang bisa membuat thread baru. Pengguna lain hanya bisa berkomentar.

> [!NOTE]
> Discussions vs Issues
> Giscus menggunakan GitHub Discussions, bukan Issues. Perbedaannya: Discussions punya fitur kategorisasi, voting, dan tampilan forum yang lebih cocok untuk komentar blog. Issues lebih cocok untuk tracking bugs.

### Step 2: Install Giscus App

Kunjungi https://github.com/apps/giscus, klik **Install**. Pilih repository blog dan approve.

### Step 3: Dapatkan Konfigurasi dari giscus.app

Buka https://giscus.app di browser, masukkan nama repository (format `username/repo`).

Halaman akan menampilkan konfigurasi yang diperlukan. Bagian penting yang perlu dicatat:

| Parameter | Keterangan |
|-----------|------------|
| `data-repo` | Nama repository |
| `data-repo-id` | ID unik repository |
| `data-category` | Nama kategori (Announcements) |
| `data-category-id` | ID unik kategori |
| `data-mapping` | Mapping pathname (gunakan `pathname`) |

> [!WARNING]
> Repository Harus Publik
> Giscus hanya bisa digunakan pada repository **publik**. Repository private tidak bisa menggunakan Giscus karena GitHub Discussions untuk repo private tidak mendukung autentikasi eksternal.

Untuk mendapatkan `data-repo-id` dan `data-category-id`, bisa menggunakan browser console setelah memilih kategori:

```
document.querySelectorAll('select').forEach(sel => {
  if (sel.closest('label')?.textContent?.includes('category')) {
    console.log(Array.from(sel.options).map(o => ({
      value: o.value,
      text: o.textContent.trim()
    })));
  }
});
```

### Step 4: Buat Komponen Giscus

Buat file baru di `src/components/Giscus.astro`:

```astro
<div id="giscus-container" class="mt-12">
  <h3 class="mb-4 text-base font-semibold">💬 Komentar</h3>
  <p class="mb-6 text-xs text-textColor/50">
    Komentar via GitHub Discussions.
  </p>
  <script src="https://giscus.app/client.js"
    data-repo="username/astro-blog"
    data-repo-id="[REPO_ID]"
    data-category="Announcements"
    data-category-id="[CATEGORY_ID]"
    data-mapping="pathname"
    data-strict="1"
    data-reactions-enabled="1"
    data-emit-metadata="0"
    data-input-position="top"
    data-theme="preferred_color_scheme"
    data-lang="id"
    data-loading="lazy"
    crossorigin="anonymous"
    async></script>
</div>
```

Ganti `[REPO_ID]` dan `[CATEGORY_ID]` dengan nilai yang didapat dari giscus.app.

### Step 5: Integrasikan ke Layout Blog

Buka layout post (biasanya `src/layouts/BlogPost.astro`), import komponen Giscus dan tempatkan di dalam artikel, setelah konten dan sebelum penutup:

```astro
---
import Giscus from "@/components/Giscus.astro";
---
{/* Related posts section */}
<Giscus />
```

### Step 6: Sinkronisasi Dark Mode

Salah satu tantangan menggunakan Giscus dengan blog yang memiliki toggle dark/light mode adalah tema komentar harus sinkron dengan tema blog. Giscus menyediakan mekanisme `setConfig` untuk mengganti tema secara dinamis.

Tambahkan script berikut di komponen Giscus:

```astro
<script>
  function getGiscusTheme() {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "dark" ? "dark" : "light";
  }

  function setGiscusTheme() {
    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe)
      iframe.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: getGiscusTheme() } } },
        "https://giscus.app"
      );
  }

  // Pantau perubahan tema blog
  new MutationObserver(() => setGiscusTheme()).observe(
    document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    }
  );

  document.addEventListener("giscus:loaded", () => setGiscusTheme());
</script>
```

Cara kerjanya:
- Saat pertama load, script membaca atribut `data-theme` di elemen `<html>`
- MutationObserver memantau perubahan tema
- Setiap kali tema berubah, Giscus dikirim pesan untuk mengganti temanya juga
- Event `giscus:loaded` memastikan tema diterapkan setelah Giscus selesai dimuat

### Step 7: Verifikasi

Setelah semua terpasang, coba lakukan hal berikut:

1. Buka halaman post yang sudah ditambahkan Giscus
2. Scroll ke bagian komentar, pastikan form komentar muncul
3. Tes login dengan akun GitHub
4. Coba toggle dark/light mode, pastikan tema komentar ikut berubah
5. Kirim komentar test, lalu cek di GitHub repository &gt; Discussions &gt; Announcements

> [!CAUTION]
> Cache Browser
> Jika Giscus tidak muncul setelah setup, coba hapus cache browser atau buka di tab incognito. Kadang script Giscus butuh hard refresh (Ctrl+Shift+R) untuk mendeteksi konfigurasi baru.

> [!IMPORTANT]
> Data Tersimpan di GitHub
> Semua komentar disimpan di GitHub Discussions repository kamu. Jika repository dihapus, komentar akan hilang. Pastikan repository tetap eksis selama blog masih aktif.

### Ringkasan

Yang didapatkan dari tutorial ini:

- **Komentar gratis** tanpa iklan dan tanpa database sendiri
- **Integrasi GitHub** sehingga komentar tersimpan sebagai diskusi di repository
- **Dark mode sync** sehingga tampilan komentar tetap konsisten dengan tema blog
- **Anti-spam** karena menggunakan GitHub authentication

Dengan Giscus, pengunjung bisa memberikan feedback, bertanya, atau berdiskusi langsung di setiap artikel tanpa harus meninggalkan blog.
