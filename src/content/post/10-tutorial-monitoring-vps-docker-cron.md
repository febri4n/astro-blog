---
title: "Tutorial Monitoring VPS & Docker Otomatis dengan Bash + Cron"
publishDate: "30 May 2026"
description: "Tutorial membuat script monitoring server Linux yang memantau CPU, memory, disk, dan Docker containers lalu dikirim otomatis via cron setiap hari."
tags: ["docker", "monitoring", "bash", "cron", "linux", "devops"]
---

### Kenapa Perlu Monitoring Server?

Jika memiliki VPS atau server sendiri, pasti pernah mengalami aplikasi tiba-tiba lemot atau container mati tanpa diketahui penyebabnya. Masalahnya, tidak mungkin 24 jam terus memantau terminal. Solusinya sederhana, buat script monitoring yang berjalan otomatis setiap hari dan mengirimkan kondisi server.

Di tutorial ini, akan dibahas cara membuat script bash untuk memonitor resource system (CPU, memory, disk), mengecek status Docker containers, dan mendeteksi jika ada container baru atau yang hilang.

### Prasyarat

Sebelum memulai, pastikan hal berikut sudah tersedia:

- Server Linux (Ubuntu/Debian)
- Docker sudah terinstall
- Cron sudah berjalan (`systemctl status cron`)
- Akses root atau sudo

### Script Monitoring

Script yang akan dibuat memiliki 3 bagian utama:

#### 1. Cek System Resources

Bagian pertama mengambil data system menggunakan command bawaan Linux:

```bash
#!/bin/bash

# Uptime
UPTIME=$(uptime -p | sed 's/up //')

# CPU
CPU_PCT=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}' | head -1 || echo "0")
CPU_INT=$(printf "%.0f" "$CPU_PCT" 2>/dev/null || echo "0")

# Memory
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
MEM_PCT=$(( MEM_USED * 100 / MEM_TOTAL ))

# Disk
DISK_INFO=$(df -h / | awk 'NR==2 {print $5, $3, $4, $2}')
DISK_PCT=$(echo "$DISK_INFO" | awk '{print $1}')
DISK_FREE=$(echo "$DISK_INFO" | awk '{print $3}')
```

Data dikumpulkan menggunakan command standar seperti `top`, `free`, dan `df`. Tidak perlu menginstall tools tambahan. Jika CPU atau memory sudah di atas 80%, script akan otomatis memberikan tanda peringatan.

#### 2. Cek Docker Containers

Bagian kedua mengecek container yang sedang running, berhenti, atau crash loop:

```bash
if docker ps &>/dev/null; then
    RUNNING=$(docker ps --format '{{.Names}}|{{.Status}}|{{.Image}}')
    STOPPED=$(docker ps -a --filter "status=exited" --format '{{.Names}}|{{.Status}}|{{.Image}}')
    CRASHING=$(docker ps -a --filter "status=restarting" --format '{{.Names}}|{{.Status}}|{{.Image}}')

    # Count containers
    RUNNING_COUNT=$(docker ps -q | wc -l)
    STOPPED_COUNT=$(docker ps -aq --filter "status=exited" | wc -l)
fi
```

**Catatan penting:** Saat pertama membuat script ini, penggunaan `docker ps -q | grep -c . || echo 0` untuk menghitung container ternyata bermasalah. Ketika tidak ada container, `echo "" | wc -l` mengembalikan 1 bukan 0. Solusinya menggunakan `wc -l` langsung yang lebih reliable.

#### 3. Deteksi Perubahan Container

Fitur menarik dari script ini adalah kemampuannya menyimpan state container kemarin di `/tmp/.hermes_monitor/containers.txt`. Keesokan harinya, script membandingkan daftar container hari ini dengan kemarin menggunakan `comm`:

```bash
if [ -f "$STATE_FILE" ]; then
    awk -F'|' '{print $1}' /tmp/current_ct.txt | sort > /tmp/current_names.txt
    awk -F'|' '{print $1}' "$STATE_FILE" | sort > /tmp/prev_names.txt
    NEW_NAMES=$(comm -13 /tmp/prev_names.txt /tmp/current_names.txt)
    REMOVED_NAMES=$(comm -23 /tmp/prev_names.txt /tmp/current_names.txt)
fi
```

Jika ada container baru, akan muncul tanda ➕. Jika ada yang hilang, tanda ➖. Fitur ini sangat berguna untuk mendeteksi jika container crash dan di-restart otomatis. Perubahan akan terlihat meskipun container saat ini sedang running.

### Setup Cron

Agar script berjalan otomatis, tambahkan ke crontab:

```bash
crontab -e
```

Kemudian tambahkan baris ini (berjalan jam 7 pagi setiap hari):

```bash
0 7 * * * /home/user/scripts/daily-report.sh
```

Jika menggunakan Hermes Agent, cara yang lebih bersih adalah menggunakan cron job bawaan Hermes:

```
hermes cron create \
  --schedule "0 7 * * *" \
  --script ~/.hermes/scripts/daily-report.sh \
  --no-agent
```

Parameter `--no-agent` penting karena membuat script berjalan tanpa LLM, output langsung dikirim. Jadi tidak ada biaya token yang terpakai, hanya eksekusi script saja.

### Output Script

Hasilnya akan terlihat seperti berikut:

```
📋 **Laporan Harian Server**
━━━━━━━━━━━━━━━━━━━
🖥 **System Resources**
   Uptime    : 1 hour, 23 minutes
   Load      : 1.29, 0.53, 0.23
   CPU       : 5% ✅
   Memory    : 32% (638MB / 1967MB) ✅
   Disk      : 32% (12G / 40G) ✅
   Free      : 26G tersisa

🐳 **Docker Containers**
   Running  : 2 ✅
   Stopped  : 0 ✅

✅ **Running:**
   • **nginx-proxy** -- `Up 2 days`
   • **app-backend** -- `Up 14 hours`

━━━━━━━━━━━━━━━━━━━
⏰ 30/05/2026 07:00:04
```

Jika ada container yang mati atau disk hampir penuh, emoji berubah dari ✅ menjadi ⚠️, sehingga langsung terlihat ada yang perlu dicek.

### Ringkasan

Yang didapatkan dari tutorial ini:

- **Script monitoring** menggunakan command bawaan Linux, tidak perlu install tools tambahan
- **Docker integration** untuk mengetahui jumlah container running, stopped, dan crash
- **Change detection** untuk mendeteksi jika ada container baru atau hilang dari kemarin
- **Zero-cost cron** jika menggunakan Hermes `--no-agent`, tidak ada biaya token

Script lengkap bisa disimpan di `~/.hermes/scripts/daily-report.sh` atau di direktori manapun. Cukup atur cron, dan setiap pagi akan mendapatkan laporan kondisi server tanpa perlu manual mengecek satu per satu.
