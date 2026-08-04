---
title: "Load Balancing PostgreSQL dengan HAProxy dan Keepalived"
description: "Tutorial lengkap setup HAProxy load balancer dengan Keepalived VRRP failover untuk PostgreSQL HA cluster, termasuk konfigurasi Harbor registry, health check Patroni API, dan strategi leader-only routing."
tags: ["haproxy", "keepalived", "postgresql", "high-availability", "load-balancing", "devops", "tutorial"]
draft: false
publishDate: "2026-08-04"
---

Setelah berhasil membangun PostgreSQL HA cluster dengan Patroni dan etcd, langkah berikutnya adalah menyediakan akses yang reliable ke database tersebut. Aplikasi seperti Harbor registry tidak bisa langsung terkoneksi ke IP node PostgreSQL individual karena node bisa gagal kapan saja. Di sinilah HAProxy dan Keepalived berperan: HAProxy menjadi load balancer yang mendistribusikan koneksi ke node PostgreSQL yang sehat, sementara Keepalived menyediakan Virtual IP (VIP) yang selalu mengarah ke load balancer yang aktif.

Artikel ini mencakup setup lengkap dari instalasi, konfigurasi, verifikasi, sampai test failover. Semua konfigurasi ditulis apa adanya berdasarkan hasil deploy di production.

**Stack:** HAProxy 3.2, Keepalived 2.3, Ubuntu 26.04

---

## Arsitektur

```
Floating IP (Publik)
    │
    ▼
Port 192.168.10.200 (standalone, Floating IP attach permanen disini)
    │  ARP: siapa punya 192.168.10.200?
    │  ← Keepalived MASTER jawab
    ▼
192.168.10.200 (VIP Keepalived, pindah antar node)
    │
    ▼
HAProxy (port 80, 15432, 15433, 8404 - jalan di 3 node)
    │
    ├──► Harbor (port 8080, 3 node) via port 80
    ├──► PostgreSQL all nodes (15432) - round-robin
    └──► PostgreSQL leader only (15433) - health check Patroni API
```

| Node | IP | Keepalived | HAProxy |
|---|---|---|---|
| harbor-01 | 192.168.10.21 | MASTER (priority 100) | Ya |
| harbor-02 | 192.168.10.22 | BACKUP (priority 90) | Ya |
| harbor-03 | 192.168.10.23 | BACKUP (priority 80) | Ya |

---

## Prasyarat

- PostgreSQL + Patroni sudah berjalan di ketiga node
- OpenStack: buat port `192.168.10.200` (standalone, tidak attach ke instance)
- OpenStack: allowed address pairs `192.168.10.200` ditambahkan ke port `192.168.10.21`, `.22`, `.23`

```bash
openstack port set --allowed-address ip-address=192.168.10.200 <PORT_21>
openstack port set --allowed-address ip-address=192.168.10.200 <PORT_22>
openstack port set --allowed-address ip-address=192.168.10.200 <PORT_23>
```

- Floating IP publik attach permanen ke port `192.168.10.200` (bukan ke instance)

**Keuntungan setup ini:** Floating IP tidak perlu pindah. Keepalived VRRP auto-resolve ARP untuk `192.168.10.200` ke node MASTER. Nol notify script.

---

## Install

Di semua 3 node:

```bash
sudo apt install -y haproxy keepalived
```

---

## Konfigurasi HAProxy

Sama di semua 3 node:

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
```

**Catatan penting:**

- Port 15432: round-robin semua node PG - buat read query, backup, monitoring
- Port 15433: leader-only via Patroni API health check - buat Harbor (WRITE safe)
- `balance first`: semua trafik ke server pertama yang UP, fallback kalau mati
- Harbor frontend dikomentari sampai Harbor terinstall
- Port 15432 dipakai (bukan 5432) karena PostgreSQL sudah listen 5432 per node. Port 5432 hanya dipakai lokal oleh Patroni
- Stats optional, bisa dihapus kalau tidak butuh
- Nanti setelah Harbor terinstall, tambahkan frontend Harbor di config yang sama

---

## Konfigurasi Keepalived

**harbor-01** (priority 100, MASTER):

```bash
sudo tee /etc/keepalived/keepalived.conf << 'EOF'
vrrp_instance harbor_vip {
    state MASTER
    interface ens3
    virtual_router_id 51
    priority 100
    advert_int 1
    unicast_src_ip 192.168.10.21
    unicast_peer {
        192.168.10.22
        192.168.10.23
    }
    authentication {
        auth_type PASS
        auth_pass keepalived_secret
    }
    virtual_ipaddress {
        192.168.10.200
    }
}
EOF
```

**harbor-02** (priority 90, BACKUP):

```bash
sudo tee /etc/keepalived/keepalived.conf << 'EOF'
vrrp_instance harbor_vip {
    state BACKUP
    interface ens3
    virtual_router_id 51
    priority 90
    advert_int 1
    unicast_src_ip 192.168.10.22
    unicast_peer {
        192.168.10.21
        192.168.10.23
    }
    authentication {
        auth_type PASS
        auth_pass keepalived_secret
    }
    virtual_ipaddress {
        192.168.10.200
    }
}
EOF
```

**harbor-03** (priority 80, BACKUP):

```bash
sudo tee /etc/keepalived/keepalived.conf << 'EOF'
vrrp_instance harbor_vip {
    state BACKUP
    interface ens3
    virtual_router_id 51
    priority 80
    advert_int 1
    unicast_src_ip 192.168.10.23
    unicast_peer {
        192.168.10.21
        192.168.10.22
    }
    authentication {
        auth_type PASS
        auth_pass keepalived_secret
    }
    virtual_ipaddress {
        192.168.10.200
    }
}
EOF
```

> Ganti `ens3` dengan nama interface sesuai output `ip a`. Jangan pakai `enp1s0` atau asumsi.

---

## Start Service

Di semua 3 node:

```bash
sudo systemctl enable haproxy keepalived
sudo systemctl start haproxy keepalived
```

---

## Verifikasi

### VIP

```bash
ip a | grep 192.168.10.200
```

Harus muncul hanya di harbor-01.

### Role Keepalived

```bash
sudo journalctl -u keepalived --no-pager | grep "Entering"
```

harbor-01: `Entering MASTER STATE`, sisanya: `Entering BACKUP STATE`.

### HAProxy

```bash
sudo systemctl status haproxy --no-pager | head -3
```

Harus `active (running)`.

### Koneksi PostgreSQL

```bash
psql -h 192.168.10.200 -p 15432 -U postgres -c "SELECT inet_server_addr();"
```

Hasil akan berganti-ganti antara `192.168.10.21`, `.22`, `.23` (round-robin).

### Stats HAProxy

```
http://192.168.10.200:8404/stats
```

Login: `admin` / `admin`.

---

## Test Failover

```bash
# Di harbor-01 - stop keepalived
sudo systemctl stop keepalived

# Di harbor-02 - cek dalam 5 detik
ip a | grep 192.168.10.200
```

VIP harus pindah ke harbor-02. Koneksi PostgreSQL via `192.168.10.200:15432` tetap jalan.

```bash
# Balikin
sudo systemctl start keepalived   # di harbor-01
```

---

## Port Usage

| Port | Service | Keterangan |
|---|---|---|
| 80 | HAProxy (Harbor) | LB ke Harbor 8080 |
| 15432 | HAProxy (PostgreSQL all) | Round-robin semua node PG |
| 15433 | HAProxy (PostgreSQL leader) | Hanya Leader via Patroni API health check |
| 5432 | PostgreSQL (Patroni) | Listen per node |
| 8008 | Patroni REST API | Health check port 15433 |
| 8404 | HAProxy Stats | Monitoring dashboard |

---

## Pitfall

| Masalah | Penyebab | Solusi |
|---|---|---|
| Keepalived stuck BACKUP (init) | Interface salah | Cek dengan `ip a`, ganti `ens3` sesuai output |
| Semua node jadi MASTER | VRRP multicast diblokir OpenStack | Ganti ke unicast (`unicast_src_ip` + `unicast_peer`) |
| HAProxy gagal Address already in use | Port 5432 conflict dengan PostgreSQL | Gunakan port 15432 untuk HAProxy frontend |
| Harbor login gagal: read-only transaction | Harbor konek ke replica PG | Arahkan ke port 15433 (leader-only) |
| HAProxy config test `-c` sukses tapi service gagal | Port bentrok, file cert missing, atau binding ke IP belum ada | Cek error detail di `journalctl -u haproxy` |

---

## Penutup

Dengan HAProxy dan Keepalived, kamu mendapatkan single endpoint (`192.168.10.200`) yang selalu available untuk mengakses PostgreSQL cluster. Strategi dua port (15432 untuk all-nodes, 15433 untuk leader-only) memberi fleksibilitas maksimal: aplikasi read-heavy bisa pakai port 15432 untuk load balancing, sementara Harbor dan aplikasi write-critical pakai port 15433 yang dijamin selalu mengarah ke node leader.

Setup ini sudah diuji dengan stop/start Keepalived untuk simulasi failover dan hasilnya koneksi PostgreSQL tetap jalan tanpa intervensi manual. Selanjutnya, tinggal arahkan Harbor registry ke `192.168.10.200:15433` dan semua operasi write akan aman.
