---
title: "Monitoring Server & Docker Containers Otomatis dengan Bash + Cron"
description: "Tutorial membuat script monitoring server Linux yang memantau CPU, memory, disk, dan Docker containers lalu dikirim otomatis via cron setiap hari."
tags: ["docker", "monitoring", "bash", "cron", "linux", "devops"]
draft: true
---

### Kenapa Perlu Monitoring Server?

Kalau lo punya VPS atau server sendiri, pasti pernah ngalamin tiba-tiba aplikasi lemot atau container mati tanpa tau penyebabnya. Masalahnya, lo gak mungkin 24 jam mantengin terminal. Solusinya sederhana -- bikin script monitoring yang jalan otomatis tiap hari dan ngasih tau kondisi server lewat chat.

Di tutorial ini, gue bakal nunjukin cara bikin script bash yang monitor resource system (CPU, memory, disk), ngecek status Docker containers, dan deteksi kalo ada container baru atau yang ilang.

### Prasyarat

Sebelum mulai, pastiin lo punya ini:

- Server Linux (Ubuntu/Debian)
- Docker udah terinstall
- Cron udah jalan (`systemctl status cron`)
- Akses root atau sudo

### Script Monitoring

Kita bakal bikin script yang isinya 3 bagian utama:

#### 1. Cek System Resources

Bagian pertama ini ngambil data system pake command bawaan Linux:

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

Data ini dikumpulin pake command standar kayak `top`, `free`, dan `df` -- jadi gak perlu install tools tambahan. Nanti kalo CPU atau memory udah di atas 80%, script bakal otomatis kasih tanda peringatan.

#### 2. Cek Docker Containers

Bagian kedua ngecek container yang lagi running, berhenti, atau crash loop:

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

**Catatan penting:** Waktu pertama bikin script ini, gue pake `docker ps -q | grep -c . || echo 0` buat ngitung container. Ternyata itu buggy -- pas gak ada container, `echo "" | wc -l` balikin 1 bukan 0. Solusinya pake `wc -l` langsung, yang lebih reliable.

#### 3. Deteksi Perubahan Container

Fitur kerennya -- script ini nyimpen state container kemarin di `/tmp/.hermes_monitor/containers.txt`. Besoknya, script bandingin daftar container hari ini sama kemarin pake `comm`:

```bash
if [ -f "$STATE_FILE" ]; then
    awk -F'|' '{print $1}' /tmp/current_ct.txt | sort > /tmp/current_names.txt
    awk -F'|' '{print $1}' "$STATE_FILE" | sort > /tmp/prev_names.txt
    NEW_NAMES=$(comm -13 /tmp/prev_names.txt /tmp/current_names.txt)
    REMOVED_NAMES=$(comm -23 /tmp/prev_names.txt /tmp/current_names.txt)
fi
```

Kalo ada container baru, bakal muncul tanda ➕. Kalo ada yang ilang, tanda ➖. Berguna banget buat detect kalo container crash dan di-restart otomatis -- lo bakal tau ada perubahan meskipun container sekarang lagi running.

### Setup Cron

Biar script jalan otomatis, tinggal tambahin ke crontab:

```bash
crontab -e
```

Terus tambahin baris ini (jalan jam 7 pagi setiap hari):

```bash
0 7 * * * /home/user/scripts/daily-report.sh
```

Tapi kalo lo pake Hermes Agent, cara lebih bersihnya pake cron job bawaan Hermes:

```
hermes cron create \
  --schedule "0 7 * * *" \
  --script ~/.hermes/scripts/daily-report.sh \
  --no-agent
```

Parameter `--no-agent` ini penting -- artinya script jalan **tanpa LLM**, outputnya langsung dikirim. Jadi gak ada biaya token sama sekali, cuma eksekusi script doang.

### Output Script

Hasilnya bakal keliatan kayak gini:

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
   • **nginx-proxy** — `Up 2 days`
   • **app-backend** — `Up 14 hours`

━━━━━━━━━━━━━━━━━━━
⏰ 30/05/2026 07:00:04
```

Kalo ada container yang mati atau disk mau penuh, emojinya berubah dari ✅ jadi ⚠️, jadi lo langsung tau ada yang perlu dicek.

### Ringkasan

Yang lo dapet dari tutorial ini:

- **Script monitoring** -- pake command bawaan Linux, gak perlu install extra tools
- **Docker integration** -- tau berapa container running, stopped, dan crash
- **Change detection** -- tau kalo ada container baru atau ilang dari kemarin
- **Zero-cost cron** -- kalo pake Hermes `--no-agent`, gak ada biaya token

Script lengkapnya bisa lo simpen di `~/.hermes/scripts/daily-report.sh` atau di mana aja yang lo mau. Tinggal atur cron, dan setiap pagi lo bakal dapet laporan kondisi server tanpa perlu manual ngecek satu-satu.
