# Dokumentasi Database Sistem Daftar Akun (COA) dan Pelaporan Jurnal

## 1. Overview Sistem

Sistem Daftar Akun (Chart of Accounts/COA) dan Jurnal merupakan modul akuntansi yang dirancang untuk mencatat transaksi keuangan masjid secara sistematis. Sistem ini menggunakan struktur hierarkis untuk Daftar Akun dan double-entry accounting untuk pencatatan jurnal, yang kemudian dapat digunakan untuk menghasilkan laporan keuangan otomatis.

### 1.1 Tujuan Sistem
- Menyediakan struktur akun yang terorganisir secara hierarkis
- Mencatat semua transaksi keuangan dalam jurnal dengan metode double-entry
- Menghasilkan laporan keuangan otomatis (Neraca, Laba Rugi, Arus Kas, Perubahan Ekuitas)
- Mendukung multi-tenancy dengan akun default global dan akun custom per masjid
- Mendukung tracking pembatasan penggunaan dana untuk akun tertentu

### 1.2 Glosarium Istilah

| Istilah English | Istilah Indonesia | Keterangan |
|----------------|------------------|------------|
| Account | Akun | Rekening dalam sistem akuntansi |
| Chart of Accounts (COA) | Daftar Akun | Daftar semua akun yang digunakan |
| Journal | Jurnal | Buku pencatatan transaksi |
| Journal Entry | Entri Jurnal | Satu baris pencatatan dalam jurnal |
| Journal Transaction | Transaksi Jurnal | Satu transaksi yang terdiri dari beberapa entri |
| Debit | Debit | Pencatatan sisi kiri (penerimaan untuk aset/beban) |
| Credit | Kredit | Pencatatan sisi kanan (penerimaan untuk kewajiban/ekuitas/pendapatan) |
| Asset | Aset | Harta/kekayaan |
| Liability | Kewajiban | Utang |
| Equity | Ekuitas | Modal |
| Revenue | Pendapatan | Pemasukan |
| Expense | Beban | Pengeluaran/biaya |
| Balance Sheet | Neraca | Laporan posisi keuangan |
| Income Statement | Laba Rugi | Laporan penghasilan komprehensif |
| Cash Flow | Arus Kas | Laporan arus kas |
| Statement of Changes in Equity | Perubahan Ekuitas | Laporan perubahan ekuitas |

---

## 2. Struktur Database

### 2.1 Tabel Akun (Account / Chart of Accounts)

Tabel `Account` menyimpan data Daftar Akun dengan struktur hierarkis menggunakan self-referencing relationship.

#### 2.1.1 Schema Tabel

```sql
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "AccountType" NOT NULL,
    "normalBalance" "NormalBalance" NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "pathCode" TEXT NOT NULL,
    "masjidId" TEXT,
    "restriction" "AccountRestriction",
    "report" "AccountReport",
    "category" "AccountCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
```

#### 2.1.2 Deskripsi Field

| Field | Tipe Data | Keterangan |
|-------|-----------|------------|
| `id` | TEXT (CUID) | Primary Key, identifier unik untuk setiap akun |
| `code` | TEXT | Kode akun (contoh: "1.1.1.01" untuk parent, "111101" untuk leaf dari FINALAKUN.md) |
| `name` | TEXT | Nama akun (contoh: "Kas Besar", "Pendapatan Jasa") |
| `parentId` | TEXT (Nullable) | Foreign Key ke `Account.id`, untuk struktur hierarkis |
| `type` | AccountType (Enum) | Tipe akun: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| `normalBalance` | NormalBalance (Enum) | DEBIT atau KREDIT - menentukan saldo normal akun |
| `isGroup` | BOOLEAN | `true` = akun group/header, `false` = akun detail |
| `pathCode` | TEXT | Full path code untuk tracking hierarki (contoh: "1.1.1.01") |
| `masjidId` | TEXT (Nullable) | Foreign Key ke `Masjid.id`. NULL = akun default global, NOT NULL = akun custom per masjid |
| `restriction` | AccountRestriction (Enum, Nullable) | `TANPA_PEMBATASAN` atau `DENGAN_PEMBATASAN`. NULL untuk group account, wajib untuk detail account |
| `report` | AccountReport (Enum, Nullable) | `NERACA` atau `LAPORAN_PENGHASILAN_KOMPREHENSIF`. NULL untuk group account, wajib untuk detail account |
| `category` | AccountCategory (Enum, Nullable) | Kategori akun: ASET_LANCAR, ASET_TIDAK_LANCAR, HUTANG_JANGKA_PENDEK, HUTANG_JANGKA_PANJANG, ASET_NETO, PENDAPATAN, BEBAN, PENGHASILAN_KOMPREHENSIF_LAIN. NULL untuk group account, wajib untuk detail account |
| `isActive` | BOOLEAN | Status aktif/nonaktif akun (default: true) |
| `createdAt` | TIMESTAMP | Waktu pembuatan record |
| `updatedAt` | TIMESTAMP | Waktu terakhir update record |

#### 2.1.3 Constraints dan Index

- **Primary Key**: `id`
- **Unique Constraint**: `(code, masjidId)` - Kode akun harus unik per masjid. NULL dianggap sebagai satu group untuk akun global.
- **Foreign Key**: 
  - `parentId` → `Account.id` (Self-referencing, ON DELETE SET NULL)
  - `masjidId` → `Masjid.id` (ON DELETE SET NULL)

#### 2.1.4 Business Rules

1. **Struktur Hierarkis**: 
   - Akun dapat memiliki parent (untuk membuat struktur hierarkis)
   - Contoh: "Aset" (1) → "Aset Lancar" (1.1) → "Kas dan Setara Kas" (1.1.1) → "Kas Besar" (1.1.1.01)

2. **Kode Akun**:
   - Format hierarkis menggunakan titik (.) sebagai separator
   - Kode harus unik dalam scope masjid yang sama
   - Akun global (masjidId = NULL) dapat digunakan sebagai template

3. **Multi-tenancy**:
   - `masjidId = NULL`: Akun default/global yang dapat digunakan semua masjid
   - `masjidId = 'xxx'`: Akun custom milik masjid tertentu
   - Masjid dapat menggunakan akun global atau membuat akun custom sendiri

4. **Group vs Detail Account**:
   - `isGroup = true`: Akun header/group, tidak dapat digunakan untuk jurnal
   - `isGroup = false`: Akun detail, dapat digunakan untuk pencatatan jurnal

5. **Pembatasan Penggunaan (restriction)**:
   - Field `restriction` di Account menentukan apakah akun memiliki pembatasan penggunaan dana
   - `TANPA_PEMBATASAN`: Akun tidak memiliki pembatasan (contoh: Kas Tunai umum)
   - `DENGAN_PEMBATASAN`: Akun memiliki pembatasan penggunaan dana (contoh: Kas Tunai Dengan Pembatasan)
   - Field ini NULL untuk group account, wajib diisi untuk detail account
   - Saat membuat JurnalEntry, jika `hasRestriction` tidak diisi, akan diambil dari `Account.restriction`

6. **Jenis Laporan (report)**:
   - Field `report` menentukan laporan keuangan mana yang menggunakan akun ini
   - `NERACA`: Akun digunakan di Laporan Posisi Keuangan (Neraca)
   - `LAPORAN_PENGHASILAN_KOMPREHENSIF`: Akun digunakan di Laporan Penghasilan Komprehensif
   - Field ini NULL untuk group account, wajib diisi untuk detail account

7. **Kategori Akun (category)**:
   - Field `category` menentukan kategori akun untuk grouping di laporan keuangan
   - Nilai: ASET_LANCAR, ASET_TIDAK_LANCAR, HUTANG_JANGKA_PENDEK, HUTANG_JANGKA_PANJANG, ASET_NETO, PENDAPATAN, BEBAN, PENGHASILAN_KOMPREHENSIF_LAIN
   - Field ini NULL untuk group account, wajib diisi untuk detail account
   - Digunakan untuk grouping akun di laporan keuangan

8. **Struktur COA FINAL**:
   - COA menggunakan struktur hierarkis dengan parent (group) dan leaf (detail)
   - Parent account menggunakan kode hierarkis (contoh: "1", "1.1", "1.1.1")
   - Leaf account menggunakan kode 6 digit dari FINALAKUN.md (contoh: "111101", "111102")
   - Setiap leaf account harus memiliki parent dan field lengkap (restriction, report, category)

---

### 2.2 Tabel Transaksi Jurnal (JurnalTransaction)

Tabel `JurnalTransaction` menyimpan header transaksi jurnal. Setiap transaksi dapat memiliki multiple entries (DEBIT dan KREDIT) yang harus balance.

#### 2.2.1 Schema Tabel

```sql
CREATE TABLE "JurnalTransaction" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "keterangan" TEXT NOT NULL,
    "referensi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "JurnalTransaction_pkey" PRIMARY KEY ("id")
);
```

#### 2.2.2 Deskripsi Field

| Field | Tipe Data | Keterangan |
|-------|-----------|------------|
| `id` | TEXT (CUID) | Primary Key, identifier unik untuk setiap transaksi jurnal |
| `masjidId` | TEXT | Foreign Key ke `Masjid.id`, wajib diisi |
| `tanggal` | TIMESTAMP | Tanggal transaksi jurnal |
| `keterangan` | TEXT | Deskripsi/keterangan transaksi |
| `referensi` | TEXT (Nullable) | Referensi opsional (contoh: link ke donasi/pengeluaran) |
| `createdAt` | TIMESTAMP | Waktu pembuatan record |
| `updatedAt` | TIMESTAMP | Waktu terakhir update record |

#### 2.2.3 Constraints dan Index

- **Primary Key**: `id`
- **Foreign Key**: 
  - `masjidId` → `Masjid.id` (ON DELETE RESTRICT)

---

### 2.3 Tabel Entri Jurnal (JurnalEntry)

Tabel `JurnalEntry` menyimpan detail entri jurnal. Setiap transaksi jurnal harus memiliki minimal 2 entries (satu DEBIT dan satu KREDIT) yang balance.

#### 2.3.1 Schema Tabel

```sql
CREATE TABLE "JurnalEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "akunId" TEXT NOT NULL,
    "tipe" "JurnalTipe" NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "JurnalEntry_pkey" PRIMARY KEY ("id")
);
```

#### 2.3.2 Deskripsi Field

| Field | Tipe Data | Keterangan |
|-------|-----------|------------|
| `id` | TEXT (CUID) | Primary Key, identifier unik untuk setiap entri jurnal |
| `transactionId` | TEXT | Foreign Key ke `JurnalTransaction.id`, wajib diisi |
| `akunId` | TEXT | Foreign Key ke `Account.id`, akun yang digunakan |
| `tipe` | JurnalTipe (Enum) | Tipe entri: DEBIT atau KREDIT |
| `jumlah` | DECIMAL(15,2) | Jumlah transaksi (maksimal 15 digit, 2 desimal) |
| `createdAt` | TIMESTAMP | Waktu pembuatan record |

#### 2.3.3 Constraints dan Index

- **Primary Key**: `id`
- **Foreign Key**: 
  - `transactionId` → `JurnalTransaction.id` (ON DELETE CASCADE)
  - `akunId` → `Account.id` (ON DELETE RESTRICT)

#### 2.3.4 Business Rules

1. **Double-Entry Accounting**:
   - Setiap transaksi jurnal harus memiliki minimal 2 entries
   - Total DEBIT harus sama dengan total KREDIT dalam satu transaksi (balance)
   - Setidaknya harus ada 1 entry DEBIT dan 1 entry KREDIT

2. **Validasi Akun**:
   - Hanya akun detail (`isGroup = false`) yang dapat digunakan untuk jurnal
   - Akun harus aktif (`isActive = true`)

3. **Perhitungan Saldo**:
   - Saldo akun dihitung dari selisih total DEBIT dan total KREDIT
   - Untuk akun ASSET dan EXPENSE: Saldo = DEBIT - KREDIT
   - Untuk akun LIABILITY, EQUITY, dan REVENUE: Saldo = KREDIT - DEBIT

4. **Contoh Transaksi**:
   - **Bayar Listrik Rp 300.000 dari Kas Besar**:
     - Entry 1: `akunId = "Beban Listrik"`, `tipe = DEBIT`, `jumlah = 300000`
     - Entry 2: `akunId = "Kas Besar"`, `tipe = KREDIT`, `jumlah = 300000`
   - **Pendapatan Jasa Rp 2.000.000 ke Kas Besar**:
     - Entry 1: `akunId = "Kas Besar"`, `tipe = DEBIT`, `jumlah = 2000000`
     - Entry 2: `akunId = "Pendapatan Jasa"`, `tipe = KREDIT`, `jumlah = 2000000`

---

## 3. Enum Types

### 3.1 AccountType

Enum untuk tipe akun dalam Daftar Akun.

```sql
CREATE TYPE "AccountType" AS ENUM (
    'ASSET',      -- Aset
    'LIABILITY',  -- Kewajiban
    'EQUITY',     -- Ekuitas
    'REVENUE',    -- Pendapatan
    'EXPENSE'     -- Beban
);
```

**Penjelasan**:
- **ASSET**: Aset/harta (contoh: Kas, Piutang, Peralatan)
- **LIABILITY**: Kewajiban/utang (contoh: Utang Usaha)
- **EQUITY**: Ekuitas/modal (contoh: Modal Pemilik)
- **REVENUE**: Pendapatan (contoh: Pendapatan Jasa, Pendapatan Donasi)
- **EXPENSE**: Beban/biaya (contoh: Beban Gaji, Beban Listrik)

### 3.2 JurnalTipe

Enum untuk tipe entri jurnal (debit atau kredit).

```sql
CREATE TYPE "JurnalTipe" AS ENUM (
    'DEBIT',   -- Debit
    'KREDIT'   -- Kredit
);
```

**Penjelasan**:
- **DEBIT**: Pencatatan debit untuk transaksi
- **KREDIT**: Pencatatan kredit untuk transaksi

---

## 4. Relasi Antar Tabel

### 4.1 Diagram Relasi

```
Masjid (1) ────────< (N) Account
  │                    │
  │                    │ (self-reference)
  │                    │
  │                    └───< Account (parent-child)
  │
  └───────< (N) JurnalTransaction
              │
              └───< (N) JurnalEntry ────> (1) Account
```

### 4.2 Detail Relasi

#### 4.2.1 Account ↔ Account (Self-Referencing)
- **Tipe**: One-to-Many (Parent-Child)
- **Field**: `Account.parentId` → `Account.id`
- **Keterangan**: Struktur hierarkis untuk Daftar Akun
- **Cascade**: ON DELETE SET NULL (jika parent dihapus, child menjadi root)

#### 4.2.2 Masjid ↔ Account
- **Tipe**: One-to-Many
- **Field**: `Account.masjidId` → `Masjid.id`
- **Keterangan**: Satu masjid dapat memiliki banyak akun
- **Cascade**: ON DELETE SET NULL (jika masjid dihapus, akun menjadi global)

#### 4.2.3 Masjid ↔ JurnalTransaction
- **Tipe**: One-to-Many
- **Field**: `JurnalTransaction.masjidId` → `Masjid.id`
- **Keterangan**: Satu masjid dapat memiliki banyak transaksi jurnal
- **Cascade**: ON DELETE RESTRICT (masjid tidak dapat dihapus jika ada transaksi jurnal)

#### 4.2.4 JurnalTransaction ↔ JurnalEntry
- **Tipe**: One-to-Many
- **Field**: `JurnalEntry.transactionId` → `JurnalTransaction.id`
- **Keterangan**: Satu transaksi jurnal dapat memiliki banyak entri
- **Cascade**: ON DELETE CASCADE (jika transaksi dihapus, semua entri ikut terhapus)

#### 4.2.5 Account ↔ JurnalEntry
- **Tipe**: One-to-Many
- **Field**: `JurnalEntry.akunId` → `Account.id`
- **Keterangan**: Satu akun dapat memiliki banyak entri jurnal
- **Cascade**: ON DELETE RESTRICT (akun tidak dapat dihapus jika ada entri jurnal)

---

## 5. Contoh Data

### 5.1 Contoh Data Akun (Chart of Accounts)

#### Struktur Hierarkis

```
1. Aset (ASSET, isGroup=true)
   └── 1.1. Aset Lancar (ASSET, isGroup=true)
       ├── 1.1.1. Kas dan Setara Kas (ASSET, isGroup=true)
       │   ├── 1.1.1.01. Kas Besar (ASSET, isGroup=false, hasRestriction=false)
       │   ├── 1.1.1.02. Kas Kecil (ASSET, isGroup=false, hasRestriction=false)
       │   └── 1.1.1.03. Kas Kecil Terbatas (ASSET, isGroup=false, hasRestriction=true)
       └── 1.1.2. Piutang Usaha (ASSET, isGroup=false)
   └── 1.2. Aset Tetap (ASSET, isGroup=true)
       └── 1.2.1. Peralatan Kantor (ASSET, isGroup=false)

2. Kewajiban (LIABILITY, isGroup=true)
   └── 2.1. Kewajiban Lancar (LIABILITY, isGroup=true)
       └── 2.1.1. Utang Usaha (LIABILITY, isGroup=false)

3. Ekuitas (EQUITY, isGroup=true)
   └── 3.1. Modal Pemilik (EQUITY, isGroup=false)

4. Pendapatan (REVENUE, isGroup=true)
   └── 4.1. Pendapatan Jasa (REVENUE, isGroup=false)

5. Beban (EXPENSE, isGroup=true)
   └── 5.1. Beban Operasional (EXPENSE, isGroup=true)
       ├── 5.1.1. Beban Gaji (EXPENSE, isGroup=false)
       └── 5.1.2. Beban Listrik & Air (EXPENSE, isGroup=false)
```

#### Contoh Record Akun

| id | code | name | parentId | type | isGroup | pathCode | masjidId | hasRestriction | isActive |
|----|------|------|----------|------|---------|----------|----------|----------------|----------|
| acc_001 | 1 | Aset | NULL | ASSET | TRUE | 1 | NULL | FALSE | TRUE |
| acc_002 | 1.1 | Aset Lancar | acc_001 | ASSET | TRUE | 1.1 | NULL | FALSE | TRUE |
| acc_003 | 1.1.1 | Kas dan Setara Kas | acc_002 | ASSET | TRUE | 1.1.1 | NULL | FALSE | TRUE |
| acc_004 | 1.1.1.01 | Kas Besar | acc_003 | ASSET | FALSE | 1.1.1.01 | NULL | FALSE | TRUE |
| acc_005 | 1.1.1.02 | Kas Kecil | acc_003 | ASSET | FALSE | 1.1.1.02 | NULL | FALSE | TRUE |
| acc_006 | 1.1.1.03 | Kas Kecil Terbatas | acc_003 | ASSET | FALSE | 1.1.1.03 | NULL | TRUE | TRUE |
| acc_007 | 1.1.2 | Piutang Usaha | acc_002 | ASSET | FALSE | 1.1.2 | NULL | FALSE | TRUE |
| acc_008 | 1.2 | Aset Tetap | acc_001 | ASSET | TRUE | 1.2 | NULL | FALSE | TRUE |
| acc_009 | 1.2.1 | Peralatan Kantor | acc_008 | ASSET | FALSE | 1.2.1 | NULL | FALSE | TRUE |
| acc_010 | 2 | Kewajiban | NULL | LIABILITY | TRUE | 2 | NULL | FALSE | TRUE |
| acc_011 | 2.1 | Kewajiban Lancar | acc_010 | LIABILITY | TRUE | 2.1 | NULL | FALSE | TRUE |
| acc_012 | 2.1.1 | Utang Usaha | acc_011 | LIABILITY | FALSE | 2.1.1 | NULL | FALSE | TRUE |
| acc_013 | 3 | Ekuitas | NULL | EQUITY | TRUE | 3 | NULL | FALSE | TRUE |
| acc_014 | 3.1 | Modal Pemilik | acc_013 | EQUITY | FALSE | 3.1 | NULL | FALSE | TRUE |
| acc_015 | 4 | Pendapatan | NULL | REVENUE | TRUE | 4 | NULL | FALSE | TRUE |
| acc_016 | 4.1 | Pendapatan Jasa | acc_015 | REVENUE | FALSE | 4.1 | NULL | FALSE | TRUE |
| acc_017 | 5 | Beban | NULL | EXPENSE | TRUE | 5 | NULL | FALSE | TRUE |
| acc_018 | 5.1 | Beban Operasional | acc_017 | EXPENSE | TRUE | 5.1 | NULL | FALSE | TRUE |
| acc_019 | 5.1.1 | Beban Gaji | acc_018 | EXPENSE | FALSE | 5.1.1 | NULL | FALSE | TRUE |
| acc_020 | 5.1.2 | Beban Listrik & Air | acc_018 | EXPENSE | FALSE | 5.1.2 | NULL | FALSE | TRUE |

**Keterangan**:
- `masjidId = NULL` berarti akun default/global
- `isGroup = TRUE` untuk akun header, `FALSE` untuk akun detail
- `hasRestriction = TRUE` untuk akun dengan pembatasan, `FALSE` untuk akun tanpa pembatasan
- `pathCode` mengikuti struktur hierarkis
- Contoh: "Kas Kecil" (acc_005) dan "Kas Kecil Terbatas" (acc_006) adalah dua akun berbeda dengan `hasRestriction` berbeda

### 5.2 Contoh Data Transaksi Jurnal

#### Transaksi 1: Bayar Listrik dari Kas Besar

**Header Transaksi (JurnalTransaction)**:

| id | masjidId | tanggal | keterangan | referensi |
|----|----------|---------|------------|-----------|
| txn_001 | masjid_001 | 2025-01-19 | Pembayaran listrik dan air | NULL |

**Detail Entri (JurnalEntry)**:

| id | transactionId | akunId | tipe | jumlah |
|----|---------------|--------|------|--------|
| entry_001 | txn_001 | acc_020 | DEBIT | 300000.00 |
| entry_002 | txn_001 | acc_004 | KREDIT | 300000.00 |

**Penjelasan**: 
- Entry 1: Beban Listrik & Air bertambah (DEBIT) Rp 300.000
- Entry 2: Kas Besar berkurang (KREDIT) Rp 300.000
- Total DEBIT = Total KREDIT = Rp 300.000 (balance)

#### Transaksi 2: Pendapatan Jasa ke Kas Besar

**Header Transaksi (JurnalTransaction)**:

| id | masjidId | tanggal | keterangan | referensi |
|----|----------|---------|------------|-----------|
| txn_002 | masjid_001 | 2025-01-16 | Pendapatan jasa pengelolaan | NULL |

**Detail Entri (JurnalEntry)**:

| id | transactionId | akunId | tipe | jumlah |
|----|---------------|--------|------|--------|
| entry_003 | txn_002 | acc_004 | DEBIT | 2000000.00 |
| entry_004 | txn_002 | acc_016 | KREDIT | 2000000.00 |

**Penjelasan**: 
- Entry 1: Kas Besar bertambah (DEBIT) Rp 2.000.000
- Entry 2: Pendapatan Jasa bertambah (KREDIT) Rp 2.000.000
- Total DEBIT = Total KREDIT = Rp 2.000.000 (balance)

#### Transaksi 3: Setoran Awal Kas

**Header Transaksi (JurnalTransaction)**:

| id | masjidId | tanggal | keterangan | referensi |
|----|----------|---------|------------|-----------|
| txn_003 | masjid_001 | 2025-01-15 | Setoran awal kas | NULL |

**Detail Entri (JurnalEntry)**:

| id | transactionId | akunId | tipe | jumlah |
|----|---------------|--------|------|--------|
| entry_005 | txn_003 | acc_004 | DEBIT | 5000000.00 |
| entry_006 | txn_003 | acc_014 | KREDIT | 5000000.00 |

**Penjelasan**: 
- Entry 1: Kas Besar bertambah (DEBIT) Rp 5.000.000
- Entry 2: Modal Pemilik bertambah (KREDIT) Rp 5.000.000
- Total DEBIT = Total KREDIT = Rp 5.000.000 (balance)

---

## 6. Perhitungan Saldo dan Laporan Keuangan

### 6.1 Perhitungan Saldo Akun

Saldo akun dihitung dari total entri jurnal DEBIT dan KREDIT:

```sql
-- Untuk akun ASSET dan EXPENSE:
Saldo = SUM(CASE WHEN tipe = 'DEBIT' THEN jumlah ELSE 0 END) 
      - SUM(CASE WHEN tipe = 'KREDIT' THEN jumlah ELSE 0 END)

-- Untuk akun LIABILITY, EQUITY, dan REVENUE:
Saldo = SUM(CASE WHEN tipe = 'KREDIT' THEN jumlah ELSE 0 END) 
      - SUM(CASE WHEN tipe = 'DEBIT' THEN jumlah ELSE 0 END)
```

### 6.2 Laporan Keuangan yang Dihasilkan

Dari data jurnal, sistem dapat menghasilkan 4 jenis laporan keuangan:

1. **Neraca (Balance Sheet / Posisi Keuangan)**
   - Menampilkan Aset, Kewajiban, dan Ekuitas pada tanggal tertentu
   - Formula: Aset = Kewajiban + Ekuitas

2. **Laba Rugi (Income Statement / Penghasilan Komprehensif)**
   - Menampilkan Pendapatan dan Beban dalam periode tertentu
   - Formula: Laba/Rugi = Total Pendapatan - Total Beban

3. **Arus Kas (Cash Flow Statement)**
   - Menampilkan arus kas dari aktivitas operasional, investasi, dan pendanaan
   - Dihitung berdasarkan akun kas (ASSET dengan code seperti "1.1.1.*")

4. **Perubahan Ekuitas (Statement of Changes in Net Assets)**
   - Menampilkan perubahan ekuitas dalam periode tertentu
   - Formula: Saldo Akhir Ekuitas = Saldo Awal Ekuitas + Laba/Rugi + Perubahan Modal

---

## 7. Validasi dan Constraints

### 7.1 Validasi Level Database

1. **Account**:
   - `code` dan `masjidId` harus unique bersama-sama
   - `parentId` harus valid (jika tidak NULL, harus reference ke Account yang ada)
   - `type` harus salah satu dari enum AccountType
   - `pathCode` harus sesuai dengan struktur hierarkis

2. **JurnalTransaction**:
   - `masjidId` wajib diisi (NOT NULL)
   - `tanggal` wajib diisi
   - `keterangan` wajib diisi

3. **JurnalEntry**:
   - `transactionId` wajib diisi dan harus reference ke JurnalTransaction yang ada
   - `akunId` wajib diisi dan harus reference ke Account yang ada
   - `tipe` harus salah satu dari enum JurnalTipe
   - `jumlah` harus > 0

### 7.2 Validasi Level Aplikasi

1. **Saat Create/Update Account**:
   - Kode akun harus mengikuti format hierarkis (contoh: "1.1.1.01")
   - Jika `parentId` diisi, parent harus ada dan `isGroup = true`
   - Akun dengan `isGroup = true` tidak dapat digunakan untuk jurnal
   - `pathCode` harus di-generate otomatis berdasarkan parent

2. **Saat Create/Update JurnalTransaction**:
   - Tanggal tidak boleh lebih dari tanggal sekarang
   - Setiap transaksi harus memiliki minimal 2 entri (JurnalEntry)
   - Total DEBIT harus sama dengan total KREDIT (balance)
   - Setidaknya harus ada 1 entri DEBIT dan 1 entri KREDIT

3. **Saat Create/Update JurnalEntry**:
   - Akun yang digunakan harus `isGroup = false` (detail account)
   - Akun yang digunakan harus `isActive = true`
   - Jumlah harus > 0

4. **Saat Delete Account**:
   - Tidak dapat menghapus akun yang memiliki child
   - Tidak dapat menghapus akun yang sudah digunakan dalam entri jurnal
   - Soft delete disarankan (set `isActive = false`)

---

## 8. Index dan Optimasi

### 8.1 Index yang Ada

1. **Account**:
   - Primary Key: `id`
   - Unique Index: `(code, masjidId)`
   - Foreign Key Index: `parentId`, `masjidId`

2. **JurnalTransaction**:
   - Primary Key: `id`
   - Foreign Key Index: `masjidId`
   - Disarankan: Index pada `tanggal` untuk query berdasarkan periode

3. **JurnalEntry**:
   - Primary Key: `id`
   - Foreign Key Index: `transactionId`, `akunId`

### 8.2 Query Optimization

Untuk performa yang lebih baik, disarankan menambahkan index tambahan:

```sql
-- Index untuk query transaksi jurnal berdasarkan tanggal
CREATE INDEX "JurnalTransaction_tanggal_idx" ON "JurnalTransaction"("tanggal");

-- Index untuk query transaksi jurnal berdasarkan masjid dan tanggal
CREATE INDEX "JurnalTransaction_masjidId_tanggal_idx" ON "JurnalTransaction"("masjidId", "tanggal");

-- Index untuk query entri jurnal berdasarkan akun
CREATE INDEX "JurnalEntry_akunId_idx" ON "JurnalEntry"("akunId");

-- Index untuk query account berdasarkan masjid dan type
CREATE INDEX "Account_masjidId_type_idx" ON "Account"("masjidId", "type");
```

---

## 9. Keamanan dan Integritas Data

### 9.1 Foreign Key Constraints

- **Account.parentId**: ON DELETE SET NULL - Jika parent dihapus, child menjadi root
- **Account.masjidId**: ON DELETE SET NULL - Jika masjid dihapus, akun menjadi global
- **JurnalTransaction.masjidId**: ON DELETE RESTRICT - Mencegah penghapusan masjid yang memiliki transaksi jurnal
- **JurnalEntry.transactionId**: ON DELETE CASCADE - Jika transaksi dihapus, semua entri ikut terhapus
- **JurnalEntry.akunId**: ON DELETE RESTRICT - Mencegah penghapusan akun yang digunakan dalam entri jurnal

### 9.2 Data Integrity

1. **Consistency**: 
   - `pathCode` harus konsisten dengan struktur hierarkis
   - Saldo akun selalu dihitung dari entri jurnal (tidak disimpan, selalu calculated)
   - Setiap transaksi jurnal harus balance (total DEBIT = total KREDIT)

2. **Referential Integrity**:
   - Semua foreign key harus valid
   - Tidak dapat menghapus record yang masih direferensi

---

## 10. Kesimpulan

Sistem database Daftar Akun dan Jurnal dirancang dengan prinsip:

1. **Hierarkis**: Struktur Daftar Akun yang fleksibel dengan self-referencing
2. **Multi-tenancy**: Support untuk akun global dan custom per masjid
3. **Pembatasan Penggunaan**: Flag `hasRestriction` untuk membedakan akun dengan/tanpa pembatasan
4. **Double-Entry Accounting**: Setiap transaksi memiliki minimal 2 entri yang balance (DEBIT = KREDIT)
5. **Integritas**: Foreign key constraints untuk menjaga konsistensi data
6. **Scalability**: Index dan optimasi untuk performa query yang baik

Sistem ini memungkinkan masjid untuk:
- Mengelola Daftar Akun secara hierarkis
- Mencatat transaksi keuangan dalam jurnal dengan metode double-entry
- Menghasilkan laporan keuangan otomatis dari data jurnal
- Menggunakan akun default atau membuat akun custom sesuai kebutuhan
- Membedakan akun dengan pembatasan penggunaan dan tanpa pembatasan

---

**Dokumen ini dibuat untuk keperluan presentasi akademik**
**Tanggal**: 2025
**Versi**: 2.0
