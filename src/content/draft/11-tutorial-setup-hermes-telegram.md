---
title: "Tutorial Setup Hermes Agent & Telegram Gateway di VPS"
description: "Tutorial lengkap cara install Hermes Agent AI di VPS Docker, konfigurasi provider, dan menghubungkannya dengan Telegram gateway untuk akses dari chat."
tags: ["hermes", "docker", "telegram", "vps", "ai", "devops"]
draft: true
---

### Apa itu Hermes Agent?

Hermes Agent adalah AI agent open-source buatan Nous Research yang bisa diakses dari terminal, Telegram, Discord, dan berbagai platform lainnya. Berbeda dengan chatbot biasa yang hanya menerima perintah teks, Hermes memiliki akses ke system tools sehingga bisa menjalankan perintah shell, membaca dan menulis file, browsing web, serta mengerjakan task kompleks secara autonomous.

Keunggulan utama Hermes:
- Provider-agnostic, bisa menggunakan OpenRouter, Anthropic, DeepSeek, atau LLM lokal
- Punya persistent memory antar sesi
- Bisa diakses lewat Telegram, Discord, Slack, dan platform lainnya
- Support cron job untuk task berulang
- Bisa install skill untuk nambah kemampuan

### Prasyarat

Sebelum memulai, pastikan hal berikut sudah tersedia:

- VPS dengan OS Linux (Ubuntu 22.04+ direkomendasikan)
- Docker sudah terinstall
- Domain (opsional, bisa pakai IP aja)
- Akun Telegram untuk bikin bot
- API key dari provider LLM (OpenRouter, Anthropic, DeepSeek, dll)

### Installasi Hermes Agent

Installasi cukup mudah, tinggal jalankan script installer resmi:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

Script ini akan mendownload dan menginstall Hermes Agent beserta dependensinya. Setelah selesai, verifikasi dengan:

```bash
hermes --version
```

### Konfigurasi Awal

Jalankan setup wizard untuk konfigurasi dasar:

```bash
hermes setup
```

Wizard akan memandu memilih model provider dan mengatur terminal backend. Alternatifnya, bisa juga menggunakan `hermes model` untuk milih provider secara interaktif.

Jika ingin menggunakan custom provider (misalnya DeepSeek), tambahkan API key ke file `.env`:

```bash
echo "DEEPSEEK_API_KEY=sk-xxx" >> ~/.hermes/.env
```

Pastikan konfigurasi berjalan lancar dengan mengecek status:

```bash
hermes doctor
```

### Setup Docker Sandbox

Hermes bisa berjalan di dalam Docker container sebagai sandbox. Ini berguna untuk isolasi dan keamanan. Konfigurasi terminal backend ada di `config.yaml`:

```bash
hermes config set terminal.backend docker
hermes config set terminal.timeout 180
```

Jika ingin mengakses Docker dari dalam sandbox (misalnya untuk monitoring container), mount Docker socket:

```bash
hermes config set terminal.docker_volumes '["/var/run/docker.sock:/var/run/docker.sock"]'
```

**Catatan penting:** Setelah mengubah konfigurasi Docker, restart gateway agar container sandbox baru dibuat:

```bash
hermes gateway restart
```

Jika ada perubahan volume mount, container lama harus dihapus manual:

```bash
docker rm -f <nama_container>
hermes gateway restart
```

### Setup Telegram Gateway

#### 1. Buat Bot Telegram

Buka Telegram, cari **@BotFather**, lalu kirim perintah:

```
/newbot
```

Ikuti instruksi untuk memberi nama bot dan username. BotFather akan memberikan **HTTP API token**, simpan token ini.

#### 2. Konfigurasi Gateway

Jalankan wizard setup gateway Hermes:

```bash
hermes gateway setup
```

Pilih platform **Telegram**, lalu masukkan bot token yang didapat dari BotFather.

Atau bisa juga dikonfigurasi manual di `~/.hermes/config.yaml`:

```yaml
gateway:
  platforms:
    telegram:
      enabled: true
      bot_token: "TOKEN_DARI_BOTFATHER"
      allowed_chats: []
```

Biarkan `allowed_chats` kosong jika ingin semua chat bisa mengakses bot.

#### 3. Jalankan Gateway

Untuk testing, jalankan gateway di foreground:

```bash
hermes gateway run
```

Jika berhasil, akan muncul log bahwa bot sudah online. Kirim pesan ke bot Telegram untuk testing.

Untuk production, install sebagai service:

```bash
hermes gateway install
hermes gateway start
```

Cek status gateway:

```bash
hermes gateway status
```

### Setup Home Channel

Setelah bot online di Telegram, invite bot ke grup yang diinginkan. Kemudian kirim pesan dari grup tersebut:

```
/sethome
```

Perintah ini akan menjadikan grup tersebut sebagai **home channel**, semua output dari cron job dan notifikasi akan dikirim ke sini.

Namun ada satu kendala: Telegram **Basic Group** tidak memiliki menu Administrators. Bot harus di-upgrade ke **Supergroup** dulu. Caranya:

1. Buka grup Telegram
2. Klik nama grup -> Edit
3. Aktifkan **Topics**
4. Grup otomatis ter-upgrade ke Supergroup
5. Buka Group Info -> Administrators -> Add Admin
6. Pilih bot Hermes, berikan izin minimal **Read Messages**

Setelah itu, bot akan bisa merespon mention dan perintah di grup.

### Testing

Coba kirim pesan ke bot atau grup:

```
Halo, apa kabar?
```

Hermes akan merespon langsung. Untuk perintah cepat tanpa replying:

```
hermes cek status server
```

### Troubleshooting

**Gateway tidak merespon di grup:**
Pastikan grup sudah Supergroup dan bot sudah jadi admin dengan izin Read Messages.

**Gateway crash setelah restart:**
Cek log error:

```bash
grep -i "error" ~/.hermes/logs/gateway.log | tail -20
```

**Container sandbox error:**
Jika ada perubahan konfigurasi Docker, hapus container sandbox lama dan restart gateway.

### Ringkasan

Yang didapatkan dari tutorial ini:

- Hermes Agent terinstall di VPS dengan Docker sandbox
- Terhubung dengan provider LLM pilihan
- Telegram gateway aktif dan bisa diakses dari chat pribadi maupun grup
- Bot bisa menjalankan perintah, monitoring server, dan task otomatis

Selanjutnya bisa ditambahkan cron job untuk laporan harian, install skill tambahan, atau menghubungkan ke platform lain seperti Discord atau Slack.
