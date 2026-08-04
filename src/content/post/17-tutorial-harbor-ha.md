---
title: "Harbor HA dengan External PostgreSQL dan Redis Sentinel"
description: "Tutorial membangun Harbor 2.15.2 HA cluster dengan external PostgreSQL Patroni, Redis Sentinel, HAProxy, dan Keepalived di 3 node. Plus failover testing."
tags: ["harbor", "devops", "high-availability", "postgresql", "redis", "haproxy", "tutorial"]
draft: false
publishDate: "2026-08-04"
---

**Stack:** Harbor 2.15.2 - PostgreSQL 18.4 (Patroni) - Redis 7 (Sentinel) - HAProxy - Keepalived - 3 Node

---

## Arsitektur

```
Floating IP (publik)
    │
    ▼
Port 192.168.10.200 (standalone, Floating IP attach permanen)
    │
    ▼
Keepalived VIP 192.168.10.200 (pindah antar node via VRRP unicast)
    │
    ▼
HAProxy (*:80, *:15432, *:15433, *:8404)
    │
    ├──► Harbor (port 8080) -- 3 node, round-robin
    ├──► PostgreSQL (port 5432) -- 3 node, via 15432 (all) & 15433 (leader only)
    └──► Redis Sentinel -- direct dari Harbor (no HAProxy)
```

| Port | Service | Keterangan |
|---|---|---|
| 80 | Harbor UI & API | Load-balanced ke 3 node Harbor |
| 15432 | PostgreSQL (all nodes) | Round-robin, bisa kena replica |
| 15433 | PostgreSQL (leader only) | Health check Patroni API, hanya Leader |
| 8404 | HAProxy Stats | Monitoring |

---

## Prasyarat

- PostgreSQL + Patroni HA (3 node) running
- Redis + Sentinel (3 node) running
- Docker & Docker Compose terinstall di 3 node
- HAProxy + Keepalived terinstall (unicast VRRP)
- Database `registry` + user `harbor` sudah dibuat
- Port `192.168.10.200` dibuat di OpenStack + allowed_address_pairs di port `.21`, `.22`, `.23`
- Floating IP publik attach permanen ke port `192.168.10.200`

---

## Step 1: Konfigurasi HAProxy

Di semua 3 node:

```bash
sudo tee /etc/haproxy/haproxy.cfg << 'EOF'
global
    log /dev/log local0
    maxconn 4096

defaults
    log global
    timeout connect 5s
    timeout client 60s
    timeout server 60s

frontend harbor_frontend
    bind *:80
    mode http
    default_backend harbor_backend

backend harbor_backend
    mode http
    balance roundrobin
    option httpchk GET /api/v2.0/ping
    http-check send hdr Host 192.168.10.200
    http-check expect status 200
    server harbor01 192.168.10.21:8080 check inter 5s
    server harbor02 192.168.10.22:8080 check inter 5s
    server harbor03 192.168.10.23:8080 check inter 5s

listen postgresql
    bind *:15432
    mode tcp
    option tcplog
    server pg01 192.168.10.21:5432 check inter 3s
    server pg02 192.168.10.22:5432 check inter 3s
    server pg03 192.168.10.23:5432 check inter 3s

listen postgresql_leader
    bind *:15433
    mode tcp
    option tcplog
    balance first
    server pg01 192.168.10.21:5432 check inter 3s port 8008
    server pg02 192.168.10.22:5432 check inter 3s port 8008
    server pg03 192.168.10.23:5432 check inter 3s port 8008

listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats auth admin:admin
EOF

sudo systemctl reload haproxy
```

**Penjelasan critical:**

- `postgresql` (15432): round-robin ke semua node PG -- buat backup, monitoring, read query
- `postgresql_leader` (15433): health check via Patroni API port 8008, cuma Leader yang terima koneksi -- buat Harbor (WRITE)
- `balance first`: all traffic ke server pertama yang UP (Leader), fallback kalau mati
- `http-check send hdr Host 192.168.10.200`: Harbor validasi Host header, harus match `hostname` di `harbor.yml`

---

## Step 2: Verifikasi HAProxy

```bash
# Cek stats
curl -s -u admin:admin http://192.168.10.200:8404/stats | grep -c "UP"

# Test port 15432 (all PG nodes)
psql -h 192.168.10.200 -p 15432 -U postgres -c "SELECT inet_server_addr();"

# Test port 15433 (Leader only)
psql -h 192.168.10.200 -p 15433 -U postgres -c "SELECT pg_is_in_recovery();"
# Harus: f (false = Leader)
```

> Password PostgreSQL: `P@ssw0rdDB`

---

## Step 3: Download & Konfigurasi Harbor

Di semua 3 node:

```bash
cd ~
wget -q https://github.com/goharbor/harbor/releases/download/v2.15.2/harbor-offline-installer-v2.15.2.tgz
tar -xzf harbor-offline-installer-v2.15.2.tgz
cd harbor
cp harbor.yml.tmpl harbor.yml
```

### harbor.yml -- sesuaikan dengan ini:

```yaml
hostname: 192.168.10.200
data_volume: /data
harbor_admin_password: HarborAdmin123!

http:
  port: 8080

# HTTPS di-comment -- SSL di-handle Nginx Proxy Manager

# Hapus/dikomentari bagian database dan redis bawaan (embedded)

# ---- EXTERNAL BACKENDS ----

external_database:
  harbor:
    host: 192.168.10.200
    port: 15433
    db_name: registry
    username: harbor
    password: HarborDBPass2024
    ssl_mode: disable
    max_idle_conns: 100
    max_open_conns: 900
    connect_retries: 10
    connect_retry_delay: 5s

external_redis:
  host: 192.168.10.21:26379,192.168.10.22:26379,192.168.10.23:26379
  password: RedisPass2024!
  sentinel_master_set: harbor-redis
  registry_db_index: 1
  jobservice_db_index: 2
  trivy_db_index: 5
  idle_timeout_seconds: 30

storage_service:
  s3:
    accesskey: YOUR_ACCESS_KEY
    secretkey: YOUR_SECRET_KEY
    region: us-east-1
    regionendpoint: https://s3.example.com
    bucket: harbor-registry
    secure: true
```

> Catatan:
> - `port: 15433` = PostgreSQL leader-only via HAProxy (WRITE safe)
> - Redis Sentinel langsung, tidak lewat HAProxy
> - Storage bisa pakai filesystem dulu kalau belum ada S3

### Persistent volume:

```bash
sudo mkdir -p /data
sudo chmod 777 /data
```

---

## Step 4: Install Harbor

### harbor-01 duluan:

```bash
cd ~/harbor
sudo ./install.sh --with-trivy
```

### Verifikasi container:

```bash
sudo docker compose ps
# Harus semua UP: core, portal, registry, jobservice, nginx, harbor-log, trivy-adapter

sudo docker compose logs core | tail -5
# Tidak ada ERROR atau FATAL

curl -s http://192.168.10.21:8080/api/v2.0/ping
# Harus: Pong
```

### Login Harbor UI:

```
http://192.168.10.200
admin / HarborAdmin123!
```

### Jika login gagal "read-only transaction":

Pastikan `harbor.yml` pakai `port: 15433` (bukan 15432). Re-install:

```bash
sudo docker compose down
sudo ./install.sh --with-trivy
```

---

## Step 5: Install di harbor-02 & harbor-03

Copy `harbor.yml` dari harbor-01, jalankan:

```bash
cd ~/harbor
sudo ./install.sh --with-trivy
```

Verifikasi:

```bash
curl -s http://192.168.10.22:8080/api/v2.0/ping
curl -s http://192.168.10.23:8080/api/v2.0/ping
```

Cek HAProxy stats -- semua backend Harbor harus hijau (UP).

---

## Step 6: Docker Login & Push

### Tambahin insecure registry (kalau belum ada SSL):

```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "insecure-registries": ["192.168.10.200"]
}
EOF
sudo systemctl restart docker
```

### Test:

```bash
docker login 192.168.10.200
# admin / HarborAdmin123!

docker pull alpine:latest
docker tag alpine:latest 192.168.10.200/library/alpine:test
docker push 192.168.10.200/library/alpine:test
```

---

## Step 7: Test Failover

### PostgreSQL failover:

```bash
# Stop Patroni di Leader
sudo systemctl stop patroni

# Cek HAProxy stats -- pg02/pg03 harus naik jadi UP
curl -s -u admin:admin http://192.168.10.200:8404/stats | grep postgresql_leader

# Test via Harbor UI -- login harus tetap bisa
```

### Harbor failover:

```bash
# Stop Harbor di satu node
cd ~/harbor
sudo docker compose stop

# Cek UI -- tetap bisa (LB redirect ke node lain)
curl -s http://192.168.10.200/api/v2.0/ping

# Balikin
sudo docker compose start
```

### Redis failover:

```bash
# Di node master Redis
sudo docker compose stop redis

# Cek sentinel di node lain
sudo docker exec -it sentinel redis-cli -p 26379 SENTINEL master harbor-redis

# Harbor harus tetap jalan (Redis buat session/task queue)
```

---

## Ringkasan Port

| Port | Service | Dari | Ke |
|---|---|---|---|
| 80 | Harbor UI | Client → VIP → HAProxy | Harbor 8080 |
| 8080 | Harbor internal | HAProxy health check | Harbor container |
| 15432 | PG all nodes | Manual/admin | PG 5432 (round-robin) |
| 15433 | PG leader only | Harbor container | PG 5432 (dicek via Patroni 8008) |
| 5432 | PG instance | Patroni | PostgreSQL |
| 8008 | Patroni API | HAProxy health check | Patroni |
| 26379 | Sentinel | Harbor container | Sentinel |
| 8404 | HAProxy Stats | Admin browser | HAProxy |

---

## Dependencies

```
Harbor install ──depends──► HAProxy port 15433 ready
                           PostgreSQL Leader running
                           Redis Sentinel quorum 2/3
                           Database registry + user harbor created
                           Docker installed
```

---

## Pitfall

| Gejala | Penyebab | Solusi |
|---|---|---|
| Login gagal: `read-only transaction` | Harbor konek ke replica PG | Pakai port 15433 (leader-only via HAProxy) |
| HAProxy backend Harbor merah | Host header mismatch | Sesuaikan `http-check send hdr Host` dengan `hostname` di `harbor.yml` |
| Harbor container restart terus | Port 5432 conflict dengan PG | Pakai `external_database` dengan port HAProxy (15433) |
| Redis sentinel: `num-other-sentinels: 1` | Sentinel announce IP Docker internal | Tambah `sentinel announce-ip <host_ip>` di config |
| Harbor prepare error: `KeyError` | Config YAML kurang field | Gunakan template asli `harbor.yml.tmpl`, jangan bikin dari nol |
| `data_volume` kosong error | Variable `$data_path` tidak diset | Tambahkan `data_volume: /data` di `harbor.yml` |
