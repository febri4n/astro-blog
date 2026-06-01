---
title: "Akses Dashboard Hermes via SSH Port Forwarding"
description: "Cara menjalankan web dashboard Hermes Agent di VPS dan mengaksesnya dari browser lokal menggunakan SSH port forwarding melalui Termius, tanpa membuka port ke internet."
tags: ["hermes", "tutorial", "devops", "ssh", "linux"]
draft: true
---

### Kenapa Perlu Dashboard?

Hermes Agent biasanya dioperasikan lewat CLI di terminal atau via bot Telegram/Discord. Tapi ada kalanya kamu butuh antarmuka visual untuk:

- Mengelola konfigurasi provider dan model
- Melihat daftar session yang aktif
- Memonitor cron job yang berjalan
- Mengatur API key secara visual

Hermes Agent menyediakan **web dashboard** yang bisa dijalankan langsung dari terminal VPS. Dashboard ini berupa aplikasi web FastAPI + Uvicorn yang berjalan di localhost.

Masalahnya, VPS biasanya tidak memiliki desktop browser. Solusinya: **SSH port forwarding** — terowongan aman yang membawa traffic dari browser lokal ke dashboard di VPS tanpa perlu membuka port ke internet.

| Metode | Keamanan | Cocok untuk |
|--------|----------|-------------|
| SSH tunnel (port forwarding) | Tinggi — traffic terenkripsi, tanpa port terbuka | Pengguna Termius, mobile |
| Buka port langsung (0.0.0.0) | Rendah — dashboard terekspos internet | Darurat, akses dari perangkat lain |

Tutorial ini fokus pada metode SSH tunnel menggunakan **Termius**, karena itulah yang paling aman dan relevan untuk akses dari HP.

> [!TIP]
> Gunakan Termius
> Semua langkah port forwarding di tutorial ini menggunakan Termius sebagai SSH client. Jika menggunakan terminal biasa, perintah `ssh -L 9119:localhost:9119 user@vps-anda` bisa digunakan sebagai alternatif.

### Prasyarat

Sebelum memulai, pastikan hal berikut sudah tersedia:

- VPS dengan Hermes Agent terinstall
- SSH key atau password untuk login ke VPS
- Termius terinstall di HP atau laptop
- Browser di perangkat yang sama dengan Termius

### Step 1: Install Dependencies Dashboard

Secara default, Hermes Agent tidak menyertakan dependencies web dashboard untuk menghemat ruang. Kamu perlu menginstallnya secara terpisah.

SSH ke VPS, lalu jalankan:

```bash
pip install hermes-agent[web]
```

Perintah ini menginstall FastAPI, Uvicorn, dan library pendukung lainnya.

> [!NOTE]
> Virtual Environment
> Jika Hermes diinstall di virtual environment (venv), pastikan venv sudah aktif sebelum menjalankan perintah di atas. Biasanya Hermes menggunakan venv di `~/.hermes/venv/` atau `~/.local/share/hermes/venv/`.

Verifikasi installasi dengan mengecek apakah perintah `hermes dashboard` bisa diakses:

```bash
hermes dashboard --help
```

Output yang diharapkan:

```
Usage: hermes dashboard [options]

Launch the web dashboard — a browser-based UI for managing configuration,
API keys, and monitoring sessions.
```

### Step 2: Jalankan Dashboard di VPS

Dashboard berjalan di VPS dan mendengarkan koneksi di port tertentu. Secara default, Hermes dashboard hanya terikat ke **127.0.0.1** (localhost) — artinya hanya proses di VPS yang bisa mengaksesnya.

Jalankan dashboard:

```bash
hermes dashboard
```

Output yang muncul:

```
Dashboard running at http://127.0.0.1:9119
```

> [!WARNING]
> Jangan Gunakan --insecure
> Flag `--insecure` mengizinkan binding ke 0.0.0.0, yang berarti dashboard bisa diakses dari internet tanpa enkripsi. Jangan gunakan di VPS publik. Selalu gunakan SSH tunnel.

Biarkan terminal ini tetap terbuka. Dashboard akan terus berjalan selama proses ini aktif.

### Step 3: Setup Port Forwarding di Termius

Ini adalah langkah paling penting. Kamu akan membuat terowongan SSH dari perangkat lokal ke VPS.

1. Buka Termius, tap koneksi SSH VPS kamu
2. Tap **Settings** (ikon roda gigi)
3. Tap **Port Forwarding**
4. Tap **Add New**
5. Isi dengan nilai berikut:

| Field | Isi |
|-------|-----|
| Type | Local |
| Source Port | `9119` |
| Destination | `127.0.0.1:9119` |

6. Simpan dan kembali ke layar utama
7. Tap koneksi untuk SSH login seperti biasa

> [!NOTE]
> Source Port vs Destination
> **Source Port** adalah port di perangkat lokal kamu (HP/laptop). **Destination** adalah alamat yang akan dituju di VPS. Karena dashboard hanya mendengarkan di 127.0.0.1 (localhost VPS), destination-nya tetap `127.0.0.1:9119`.

Setelah SSH berhasil login, Termius secara otomatis membuat terowongan. Kamu bisa membiarkan Termius tetap terkoneksi — port forwarding aktif selama sesi SSH aktif.

### Step 4: Buka Dashboard di Browser

Buka browser di perangkat yang sama dengan Termius, lalu akses:

```
http://localhost:9119
```

Jika semua langkah benar, kamu akan melihat dashboard Hermes dengan antarmuka web yang menampilkan:

- Informasi sistem dan versi Hermes
- Konfigurasi provider dan model
- Daftar session
- Status cron job

> [!TIP]
> Troubleshooting
> Jika halaman tidak muncul, coba beberapa hal berikut:
> - Pastikan dashboard masih berjalan (cek terminal SSH yang menjalankan `hermes dashboard`)
> - Pastikan port forwarding aktif di Termius Settings
> - Coba gunakan `http://127.0.0.1:9119` sebagai pengganti `localhost`
> - Restart dashboard dengan `Ctrl+C` lalu `hermes dashboard` lagi

### Step 5: Jalankan Dashboard di Background

Agar dashboard tidak mati saat terminal SSH ditutup, kamu bisa menjalankannya di background menggunakan `nohup` atau `screen`.

**Menggunakan nohup:**

```bash
nohup hermes dashboard --no-open > ~/.hermes/dashboard.log 2>&1 &
```

**Menggunakan screen:**

```bash
screen -S hermes-dashboard
hermes dashboard --no-open
# Tekan Ctrl+A, lalu D untuk detach
```

Untuk kembali ke session screen:

```bash
screen -r hermes-dashboard
```

> [!WARNING]
> Background Process
> Dashboard akan tetap berjalan meskipun kamu logout dari SSH. Pastikan untuk menghentikannya secara manual jika tidak digunakan dengan `hermes dashboard --stop`.

### Konfigurasi Tambahan

Dashboard memiliki beberapa opsi yang bisa disesuaikan:

| Opsi | Default | Fungsi |
|------|---------|--------|
| `--port` | 9119 | Port yang digunakan dashboard |
| `--host` | 127.0.0.1 | Alamat binding (jangan ubah ke 0.0.0.0 tanpa SSH tunnel) |
| `--tui` | off | Aktifkan tab Chat di browser (perlu `pip install hermes-agent[web,pty]`) |
| `--no-open` | — | Jangan buka browser otomatis (berguna di VPS tanpa GUI) |
| `--stop` | — | Hentikan dashboard yang berjalan |
| `--status` | — | Lihat daftar dashboard yang sedang berjalan |

**Mengganti port** (misal port 8080 karena 9119 sudah dipakai):

```bash
hermes dashboard --port 8080 --no-open
```

Sesuaikan port forwarding di Termius menjadi:

| Field | Isi |
|-------|-----|
| Source Port | `8080` |
| Destination | `127.0.0.1:8080` |

Kemudian akses `http://localhost:8080` di browser.

**Akses dari perangkat berbeda** (misal dashboard jalan di VPS, browser di HP):

Pastikan Termius berjalan di HP (bukan laptop). Port forwarding bekerja dari mana saja selama Termius terkoneksi ke VPS.

### Ringkasan

Yang didapatkan dari tutorial ini:

- **Dashboard Hermes** — antarmuka web untuk mengelola konfigurasi dan session
- **SSH port forwarding** — akses aman tanpa buka port ke internet
- **Termius integration** — port forwarding dari HP tanpa perlu terminal command line
- **Background service** — dashboard tetap jalan meskipun SSH terputus

Dengan kombinasi dashboard + port forwarding, kamu bisa mengelola Hermes Agent secara visual dari mana saja, cukup bermodalkan koneksi SSH dan browser.
