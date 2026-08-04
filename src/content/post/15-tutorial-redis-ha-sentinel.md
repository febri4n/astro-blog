---
title: "Redis High Availability dengan Sentinel"
description: "Tutorial membangun Redis HA cluster menggunakan Sentinel di tiga node dengan Docker Compose, dari setup master-replica hingga uji failover otomatis."
tags: ["redis", "devops", "high-availability", "harbor", "tutorial"]
draft: false
publishDate: "2026-08-04"
---

Redis adalah salah satu database in-memory paling populer untuk caching dan session store. Ketika Redis digunakan di environment production, single point of failure adalah risiko yang harus diantisipasi. Sentinel adalah solusi bawaan Redis untuk high availability yang menangani monitoring, notifikasi, dan failover otomatis tanpa perlu tools tambahan.

Artikel ini akan memandu kamu membangun Redis HA cluster dengan Sentinel di tiga node, lengkap dengan uji failover.

## Arsitektur

Kita akan membangun cluster dengan tiga node Docker:

| Node | IP | Redis | Sentinel |
|---|---|---|---|
| `harbor-01` | 192.168.10.21 | Master | Ya |
| `harbor-02` | 192.168.10.22 | Replica | Ya |
| `harbor-03` | 192.168.10.23 | Replica | Ya |

**Stack:** Redis 7 Alpine · Docker Compose · 3 Node

Sentinel menggunakan quorum 2, artinya minimal 2 sentinel harus setuju sebelum failover dieksekusi. Ini mencegah split-brain ketika terjadi network partition.

## Prasyarat

Pastikan Docker dan Docker Compose sudah terinstall di ketiga node:

```bash
docker --version && docker compose version
```

---

## Node 1: harbor-01 (Master)

Node ini akan menjadi master awal. Konfigurasi Redis tidak memerlukan directive `replicaof` karena ini adalah master.

```bash
mkdir -p ~/redis && cd ~/redis

sudo tee redis.conf << 'EOF'
port 6379
bind 0.0.0.0
requirepass RedisPass2024!
masterauth RedisPass2024!
appendonly yes
EOF

sudo tee sentinel.conf << 'EOF'
port 26379
bind 0.0.0.0
sentinel monitor harbor-redis 192.168.10.21 6379 2
sentinel auth-pass harbor-redis RedisPass2024!
sentinel announce-ip 192.168.10.21
sentinel announce-port 26379
sentinel down-after-milliseconds harbor-redis 5000
sentinel failover-timeout harbor-redis 10000
sentinel parallel-syncs harbor-redis 1
EOF

sudo tee docker-compose.yml << 'EOF'
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf

  sentinel:
    image: redis:7-alpine
    container_name: sentinel
    restart: unless-stopped
    ports:
      - "26379:26379"
    volumes:
      - ./sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis

volumes:
  redis-data:
EOF

sudo docker compose up -d
```

**Penjelasan konfigurasi Sentinel:**

- `sentinel monitor` mendefinisikan nama cluster (`harbor-redis`), IP master, port, dan quorum (2).
- `sentinel announce-ip` memastikan Sentinel mengumumkan IP yang benar ke client, penting di environment multi-node.
- `down-after-milliseconds 5000` artinya Sentinel akan menandai node sebagai down setelah 5 detik tidak ada respons.
- `failover-timeout 10000` memberi batas 10 detik untuk proses failover.
- `parallel-syncs 1` membatasi hanya satu replica yang sync bersamaan, menjaga performa master.

---

## Node 2: harbor-02 (Replica)

Node ini dikonfigurasi sebagai replica dari master di harbor-01.

```bash
mkdir -p ~/redis && cd ~/redis

sudo tee redis.conf << 'EOF'
port 6379
bind 0.0.0.0
requirepass RedisPass2024!
masterauth RedisPass2024!
replicaof 192.168.10.21 6379
appendonly yes
EOF

sudo tee sentinel.conf << 'EOF'
port 26379
bind 0.0.0.0
sentinel monitor harbor-redis 192.168.10.21 6379 2
sentinel auth-pass harbor-redis RedisPass2024!
sentinel announce-ip 192.168.10.22
sentinel announce-port 26379
sentinel down-after-milliseconds harbor-redis 5000
sentinel failover-timeout harbor-redis 10000
sentinel parallel-syncs harbor-redis 1
EOF

sudo tee docker-compose.yml << 'EOF'
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf

  sentinel:
    image: redis:7-alpine
    container_name: sentinel
    restart: unless-stopped
    ports:
      - "26379:26379"
    volumes:
      - ./sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis

volumes:
  redis-data:
EOF

sudo docker compose up -d
```

**Perbedaan utama dari harbor-01:**

- `replicaof 192.168.10.21 6379` di `redis.conf` membuat Redis ini menjadi replica dari master.
- `sentinel announce-ip` diubah ke `192.168.10.22` (IP node ini).
- `sentinel monitor` tetap mengarah ke `192.168.10.21` karena Sentinel memonitor master yang dikenal saat startup.

---

## Node 3: harbor-03 (Replica)

Konfigurasi identik dengan harbor-02, hanya berbeda di IP announce.

```bash
mkdir -p ~/redis && cd ~/redis

sudo tee redis.conf << 'EOF'
port 6379
bind 0.0.0.0
requirepass RedisPass2024!
masterauth RedisPass2024!
replicaof 192.168.10.21 6379
appendonly yes
EOF

sudo tee sentinel.conf << 'EOF'
port 26379
bind 0.0.0.0
sentinel monitor harbor-redis 192.168.10.21 6379 2
sentinel auth-pass harbor-redis RedisPass2024!
sentinel announce-ip 192.168.10.23
sentinel announce-port 26379
sentinel down-after-milliseconds harbor-redis 5000
sentinel failover-timeout harbor-redis 10000
sentinel parallel-syncs harbor-redis 1
EOF

sudo tee docker-compose.yml << 'EOF'
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf

  sentinel:
    image: redis:7-alpine
    container_name: sentinel
    restart: unless-stopped
    ports:
      - "26379:26379"
    volumes:
      - ./sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis

volumes:
  redis-data:
EOF

sudo docker compose up -d
```

---

## Verifikasi

Setelah semua node berjalan, lakukan verifikasi untuk memastikan cluster berfungsi dengan benar.

### Cek Role Redis

```bash
docker exec -it redis redis-cli -a RedisPass2024! INFO replication | grep role
```

Hasil yang diharapkan: `role:master` di harbor-01, `role:slave` di harbor-02 dan harbor-03.

### Info Master dari Sentinel

```bash
docker exec -it sentinel redis-cli -p 26379 SENTINEL master harbor-redis
```

Output harus menunjukkan:
- IP master: `192.168.10.21`
- `num-slaves: 2`
- `num-other-sentinels: 2`

### Daftar Sentinel

```bash
docker exec -it sentinel redis-cli -p 26379 SENTINEL sentinels harbor-redis
```

Perintah ini menampilkan semua instance Sentinel yang terdaftar di cluster.

### Cek Status Replikasi

```bash
docker exec -it redis redis-cli -a RedisPass2024! INFO replication | grep -E "master_link_status|master_sync"
```

Semua replica harus menunjukkan `master_link_status:up`.

---

## Uji Failover

Sekarang kita akan mensimulasikan master down dan melihat Sentinel melakukan failover otomatis.

### Simulasi Master Down

Jalankan di harbor-01:

```bash
sudo docker compose stop redis
```

Ini menghentikan container Redis master tanpa menghentikan Sentinel.

### Pantau Failover

Jalankan di harbor-02 atau harbor-03:

```bash
docker exec -it sentinel redis-cli -p 26379 SENTINEL master harbor-redis
```

Dalam waktu sekitar 5 detik (sesuai `down-after-milliseconds`), Sentinel akan mendeteksi master down dan memilih master baru dari harbor-02 atau harbor-03. Perintah di atas akan menunjukkan IP master baru setelah failover selesai.

### Kembalikan harbor-01

```bash
# Di harbor-01
sudo docker compose start redis
```

Redis di harbor-01 akan otomatis bergabung kembali sebagai replica dari master baru.

---

## Perintah Sehari-hari

```bash
# Status container
sudo docker compose ps

# Log Redis
sudo docker compose logs redis -f

# Log Sentinel (berguna untuk debug failover)
sudo docker compose logs sentinel -f

# Restart semua service
sudo docker compose restart
```

---

## Catatan Penting

- **Quorum harus ganjil:** Sentinel menggunakan voting untuk memutuskan failover. Dengan 3 sentinel dan quorum 2, cluster tetap bisa memilih master baru meskipun 1 sentinel mati.
- **Password harus konsisten:** `requirepass` dan `masterauth` harus sama di semua node. Tanpa `masterauth`, replica tidak bisa melakukan autentikasi ke master setelah failover.
- **`announce-ip` wajib di-set:** Di environment multi-host, Sentinel menggunakan IP ini untuk memberitahu client tentang lokasi master. Tanpa ini, client bisa mendapatkan IP yang salah (misalnya IP Docker internal).
- **Data persist dengan AOF:** `appendonly yes` memastikan data tidak hilang saat container restart. Gunakan volume Docker untuk persistensi data.
