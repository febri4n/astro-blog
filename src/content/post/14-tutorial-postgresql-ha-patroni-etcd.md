---
title: "PostgreSQL High Availability dengan Patroni dan etcd"
description: "Tutorial lengkap membangun PostgreSQL HA cluster menggunakan Patroni dan etcd di Ubuntu 26.04, dari hasil trial-error langsung di production."
tags: ["postgresql", "devops", "high-availability", "harbor", "tutorial"]
draft: false
publishDate: "2026-08-03"
---

Membangun PostgreSQL yang highly available seringkali lebih rumit dari yang dibayangkan. Dokumentasi resmi biasanya hanya mencakup skenario ideal, sementara di lapangan banyak jebakan yang tidak terduga. Artikel ini adalah hasil dari proses build, break, dan fix selama setup PostgreSQL HA untuk backend Harbor registry, dan ditulis agar kamu tidak perlu mengulangi kesalahan yang sama.

## Arsitektur

Kita akan membangun cluster dengan komposisi berikut:

| Node | IP | etcd | PostgreSQL |
|---|---|---|---|
| `harbor-db-01` | 192.168.10.11 | Ya | Ya |
| `harbor-db-02` | 192.168.10.12 | Ya | Ya |
| `harbor-util-01` | 192.168.10.21 | Ya | Tidak |

**Stack:** Ubuntu 26.04 LTS · PostgreSQL 18.4 · Patroni 4.1.4 · etcd 3.5.33

Mengapa 3 node etcd tapi hanya 2 node PostgreSQL? etcd membutuhkan quorum 3 node (2n+1) untuk menghindari split-brain. PostgreSQL sendiri tidak memerlukan quorum karena Patroni yang menangani leader election melalui etcd. Satu node tambahan (`harbor-util-01`) cukup ringan dan bisa digabung dengan service monitoring.

---

## Fase 1: etcd Cluster (Semua 3 Node)

### 1.1: Download dan Install etcd

Jebakan pertama: `apt install etcd` tidak berfungsi di Ubuntu 24.04 ke atas. etcd sudah dihapus dari repositori resmi, jadi kita harus install dari binary.

Jebakan kedua: **jangan gunakan etcd v3.7+**. Patroni 4.1.x masih menggunakan etcd v2 API melalui library `python-etcd`, dan v2 API dinonaktifkan secara default sejak etcd v3.6. Gunakan **v3.5.33**.

```bash
ETCD_VER="v3.5.33"
wget -q "https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz"
tar xzf etcd-${ETCD_VER}-linux-amd64.tar.gz
sudo mv etcd-${ETCD_VER}-linux-amd64/etcd etcd-${ETCD_VER}-linux-amd64/etcdctl etcd-${ETCD_VER}-linux-amd64/etcdutl /usr/local/bin/
rm -rf etcd-${ETCD_VER}-linux-amd64*
```

### 1.2: Buat System User dan Direktori Data

```bash
sudo groupadd --system etcd 2>/dev/null
sudo useradd --system --home /var/lib/etcd -g etcd etcd 2>/dev/null
sudo mkdir -p /var/lib/etcd
sudo chown -R etcd:etcd /var/lib/etcd
```

### 1.3: Systemd Service

Jalankan di semua 3 node:

```bash
sudo tee /etc/systemd/system/etcd.service << 'EOF'
[Unit]
Description=etcd
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=etcd
Group=etcd
EnvironmentFile=/etc/default/etcd
ExecStart=/usr/local/bin/etcd
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

### 1.4: Konfigurasi per Node

Perhatikan bahwa `ETCD_ENABLE_V2="true"` wajib ada agar Patroni bisa terhubung. Dan untuk cluster baru, semua node harus menggunakan `ETCD_INITIAL_CLUSTER_STATE="new"`.

**`harbor-db-01` (192.168.10.11):**

```bash
sudo tee /etc/default/etcd << 'EOF'
ETCD_NAME="etcd-db01"
ETCD_LISTEN_PEER_URLS="http://192.168.10.11:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.10.11:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.10.11:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.10.11:2379"
ETCD_INITIAL_CLUSTER="etcd-db01=http://192.168.10.11:2380,etcd-db02=http://192.168.10.12:2380,etcd-util01=http://192.168.10.21:2380"
ETCD_INITIAL_CLUSTER_TOKEN="my-etcd-cluster-token"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_ENABLE_V2="true"
EOF
```

**`harbor-db-02` (192.168.10.12):**

```bash
sudo tee /etc/default/etcd << 'EOF'
ETCD_NAME="etcd-db02"
ETCD_LISTEN_PEER_URLS="http://192.168.10.12:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.10.12:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.10.12:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.10.12:2379"
ETCD_INITIAL_CLUSTER="etcd-db01=http://192.168.10.11:2380,etcd-db02=http://192.168.10.12:2380,etcd-util01=http://192.168.10.21:2380"
ETCD_INITIAL_CLUSTER_TOKEN="my-etcd-cluster-token"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_ENABLE_V2="true"
EOF
```

**`harbor-util-01` (192.168.10.21):**

```bash
sudo tee /etc/default/etcd << 'EOF'
ETCD_NAME="etcd-util01"
ETCD_LISTEN_PEER_URLS="http://192.168.10.21:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.10.21:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.10.21:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.10.21:2379"
ETCD_INITIAL_CLUSTER="etcd-db01=http://192.168.10.11:2380,etcd-db02=http://192.168.10.12:2380,etcd-util01=http://192.168.10.21:2380"
ETCD_INITIAL_CLUSTER_TOKEN="my-etcd-cluster-token"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_ENABLE_V2="true"
EOF
```

### 1.5: Start etcd

**Ini jebakan paling kritis.** Ketiga node harus dijalankan dalam waktu sekitar 60 detik. Satu node saja tidak akan mencapai quorum dan akan terus timeout. Solusinya: buka 3 terminal, ketik perintah di ketiganya, lalu tekan Enter bersamaan.

```bash
sudo systemctl enable etcd && sudo systemctl start etcd
```

### 1.6: Verifikasi etcd Cluster

```bash
etcdctl member list
```

Output yang diharapkan:

```
a1b2c3d4e5f6, started, etcd-db01, http://192.168.10.11:2380, http://192.168.10.11:2379, false
b2c3d4e5f6a1, started, etcd-db02, http://192.168.10.12:2380, http://192.168.10.12:2379, false
c3d4e5f6a1b2, started, etcd-util01, http://192.168.10.21:2380, http://192.168.10.21:2379, false
```

Health check:

```bash
etcdctl endpoint health --endpoints=192.168.10.11:2379,192.168.10.12:2379,192.168.10.21:2379
```

---

## Fase 2: PostgreSQL + Patroni

### 2.1: Install PostgreSQL dan Patroni

Jalankan di db-01 dan db-02:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib python3-pip python3-psycopg2
sudo pip3 install 'patroni[etcd]' --break-system-packages
sudo systemctl stop postgresql && sudo systemctl disable postgresql
```

> Perhatikan tanda kutip di `'patroni[etcd]'`. Tanpa kutip, bash akan menginterpretasikan tanda kurung siku sebagai wildcard.

### 2.1b: Verifikasi Versi PostgreSQL

Setelah install, pastikan versi PostgreSQL sesuai:

```bash
pg_config --version     # Harus menampilkan versi yang terinstall
ls /usr/lib/postgresql/ # Pastikan direktori versi ada (misal: 18)
```

Sesuaikan semua path di langkah berikutnya jika versi berbeda.

### 2.2: Siapkan Direktori Data

```bash
sudo mkdir -p /var/lib/postgresql/18/main
sudo chown -R postgres:postgres /var/lib/postgresql/18
sudo chmod 700 /var/lib/postgresql/18/main
```

**Jebakan penting:** JANGAN menyalin `postgresql.conf` dari `/etc/postgresql/18/main/` ke direktori data. Pada Ubuntu 24.04+, konfigurasi default mereferensikan `include_dir 'conf.d'` yang tidak tersedia di direktori data, menyebabkan PostgreSQL gagal start dengan error FATAL. Biarkan direktori data benar-benar kosong, Patroni yang akan menulis konfigurasinya sendiri saat bootstrap.

### 2.3: Konfigurasi Patroni

**`harbor-db-01` (192.168.10.11):**

```bash
sudo tee /etc/patroni.yml << 'EOF'
scope: harbor
name: db01

etcd:
  hosts: 192.168.10.11:2379,192.168.10.12:2379,192.168.10.21:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        wal_keep_size: 512
        max_wal_senders: 10
        max_replication_slots: 10

  initdb:
  - encoding: UTF8
  - data-checksums

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 192.168.10.11:5432
  data_dir: /var/lib/postgresql/18/main
  bin_dir: /usr/lib/postgresql/18/bin
  pgpass: /tmp/pgpass
  authentication:
    replication:
      username: replicator
      password: ReplSecure!2024
    superuser:
      username: postgres
      password: StrongDBPass!2024
  parameters:
    unix_socket_directories: '/var/run/postgresql'

restapi:
  listen: 0.0.0.0:8008
  connect_address: 192.168.10.11:8008

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
EOF
```

**`harbor-db-02` (192.168.10.12):**

```bash
sudo tee /etc/patroni.yml << 'EOF'
scope: harbor
name: db02

etcd:
  hosts: 192.168.10.11:2379,192.168.10.12:2379,192.168.10.21:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        wal_keep_size: 512
        max_wal_senders: 10
        max_replication_slots: 10

  initdb:
  - encoding: UTF8
  - data-checksums

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 192.168.10.12:5432
  data_dir: /var/lib/postgresql/18/main
  bin_dir: /usr/lib/postgresql/18/bin
  pgpass: /tmp/pgpass
  authentication:
    replication:
      username: replicator
      password: ReplSecure!2024
    superuser:
      username: postgres
      password: StrongDBPass!2024
  parameters:
    unix_socket_directories: '/var/run/postgresql'

restapi:
  listen: 0.0.0.0:8008
  connect_address: 192.168.10.12:8008

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
EOF
```

### 2.4: Systemd Service untuk Patroni

Jalankan di db-01 dan db-02:

```bash
sudo tee /etc/systemd/system/patroni.service << 'EOF'
[Unit]
Description=Patroni for PostgreSQL HA
After=network-online.target etcd.service
Wants=network-online.target

[Service]
Type=simple
User=postgres
Group=postgres
ExecStart=/usr/local/bin/patroni /etc/patroni.yml
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
TimeoutSec=30
Restart=no

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

### 2.5: Start db-01 Terlebih Dahulu

Ini krusial: db-01 harus dijalankan lebih dulu dan ditunggu sampai menjadi Leader sebelum db-02 dijalankan. Jangan menjalankan keduanya bersamaan.

```bash
# Hanya di db-01:
sudo systemctl enable patroni && sudo systemctl start patroni
sleep 10
patronictl -c /etc/patroni.yml list
```

Output yang diharapkan:

```
| db01   | 192.168.10.11 | Leader  | running |  1 |
```

### 2.6: Start db-02

Setelah db-01 menjadi Leader, di db-02 **hapus data dir lama terlebih dahulu** (wajib jika ini bukan first-time startup, untuk menghindari `system ID mismatch`):

```bash
sudo rm -rf /var/lib/postgresql/18/main
sudo mkdir -p /var/lib/postgresql/18/main
sudo chown -R postgres:postgres /var/lib/postgresql/18
sudo chmod 700 /var/lib/postgresql/18/main

sudo systemctl enable patroni && sudo systemctl start patroni
sleep 8
patronictl -c /etc/patroni.yml list
```

Hasil akhir:

```
| db01   | 192.168.10.11 | Leader  | running   |  1 |
| db02   | 192.168.10.12 | Replica | streaming |  1 |
```

---

## Fase 3: Perbaiki Akses Replikasi

Jika db-02 menampilkan state `stopped` dengan error:

```
FATAL: no pg_hba.conf entry for replication connection
```

Ini terjadi karena bootstrap Patroni tidak selalu menambahkan konfigurasi akses untuk user replicator. Perbaiki di **Leader** (db-01):

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'StrongDBPass!2024';"

echo "host replication replicator 192.168.10.12/32 md5" | sudo -u postgres tee -a /var/lib/postgresql/18/main/pg_hba.conf
echo "host replication replicator 192.168.10.11/32 md5" | sudo -u postgres tee -a /var/lib/postgresql/18/main/pg_hba.conf

sudo -u postgres /usr/lib/postgresql/18/bin/pg_ctl -D /var/lib/postgresql/18/main reload
```

Restart db-02:

```bash
sudo systemctl restart patroni
```

---

## Fase 4: Uji Failover

Dari node manapun yang memiliki Patroni:

```bash
patronictl -c /etc/patroni.yml switchover
```

Ikuti prompt. Patroni akan mempromosikan replica menjadi Leader dan menurunkan Leader saat ini. Proses hanya sekitar 2 detik. Timeline (TL) akan naik — itu normal, menandakan terjadi pergantian leader.

---

## Fase 5: Firewall

```bash
# etcd (semua 3 node)
sudo ufw allow from 192.168.10.0/24 to any port 2379,2380 proto tcp
# PostgreSQL (db-01 dan db-02)
sudo ufw allow from 192.168.10.0/24 to any port 5432 proto tcp
# Patroni REST API (db-01 dan db-02)
sudo ufw allow from 192.168.10.0/24 to any port 8008 proto tcp
```

---

## Ringkasan Jebakan dan Solusi

Berikut adalah 10 jebakan yang ditemui selama proses build dan cara mengatasinya:

| Gejala | Penyebab | Solusi |
|---|---|---|
| `apt install etcd` gagal | etcd dihapus dari repo Ubuntu 24.04+ | Install dari binary GitHub (v3.5.33) |
| Patroni `404` pada `/v2/keys` | etcd v3.7+ menonaktifkan v2 API | Gunakan v3.5.33 + `ETCD_ENABLE_V2=true` |
| etcd `context deadline exceeded` | Hanya 1 dari 3 node berjalan | Start 3 node bersamaan dalam 60 detik |
| `conflicting environment variable` | Konflik flag `--enable-v2` dan env var | Hapus flag dari ExecStart, env var sudah cukup |
| `system ID mismatch` di Patroni | State cluster lama di etcd v2 masih tersisa | Hapus via `curl -X DELETE .../v2/keys/service?recursive=true` |
| `system ID mismatch` pada replica | Data dir replica berisi data dari percobaan sebelumnya | Hapus data dir replica (`rm -rf /var/.../main`) lalu restart Patroni |
| Patroni stuck `Replica stopped` | Data dir kotor + tidak ada leader | Hapus direktori data dan etcd keys, bootstrap ulang |
| PostgreSQL FATAL: config error | `postgresql.conf` sistem punya `include_dir` yang invalid | Biarkan Patroni menulis konfigurasi sendiri — data dir kosong |
| `no pg_hba.conf entry for replication` | Bootstrap Patroni tidak menambah akses replicator | Tambahkan manual di Leader lalu reload |
| `system ID mismatch` setelah cleanup | Pembersihan state etcd tidak lengkap (v2 vs v3) | Hapus key via v2 API (`curl`) dan v3 API (`etcdctl`) |

---

## Koneksi dari Aplikasi

Hubungkan aplikasi ke **Patroni REST API** untuk auto-discover Leader:

```
http://192.168.10.11:8008/read-write   -> 200 = Leader, 503 = Replica
http://192.168.10.12:8008/read-write   -> sama
```

Atau gunakan HAProxy di load balancer untuk auto-routing:

```haproxy
listen postgresql
    bind *:5432
    option tcp-check
    tcp-check connect port 5432
    server db01 192.168.10.11:5432 check
    server db02 192.168.10.12:5432 check
```

---

## Perintah Sehari-hari

```bash
# Status cluster
patronictl -c /etc/patroni.yml list

# Failover manual
patronictl -c /etc/patroni.yml switchover

# Reinisialisasi replica yang rusak
patronictl -c /etc/patroni.yml reinit harbor db02

# Kesehatan etcd
etcdctl endpoint health --endpoints=192.168.10.11:2379,192.168.10.12:2379,192.168.10.21:2379

# Monitoring log
sudo journalctl -u patroni -f
sudo journalctl -u etcd -f
```

---

Membangun PostgreSQL HA memang tidak sesederhana menjalankan `apt install`. Tapi dengan memahami jebakan-jebakan di atas, prosesnya menjadi jauh lebih mulus. Selamat mencoba.
