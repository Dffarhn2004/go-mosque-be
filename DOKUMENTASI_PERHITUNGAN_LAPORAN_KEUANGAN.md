# Dokumentasi Perhitungan Laporan Keuangan

Dokumen ini menjelaskan bagaimana sistem menghitung tiga jenis laporan keuangan utama berdasarkan data jurnal (double-entry bookkeeping).

## Daftar Isi

1. [Konsep Dasar](#konsep-dasar)
2. [Laporan Penghasilan Komprehensif](#laporan-penghasilan-komprehensif)
3. [Laporan Posisi Keuangan](#laporan-posisi-keuangan)
4. [Laporan Perubahan Aset Neto](#laporan-perubahan-aset-neto)
5. [Pembatasan Sumber Daya](#pembatasan-sumber-daya)

---

## Konsep Dasar

### 1. Normal Balance

Setiap akun memiliki **normal balance** yang menentukan bagaimana DEBIT dan KREDIT mempengaruhi saldo:

- **Normal Balance DEBIT** (ASSET, EXPENSE):
  - DEBIT → menambah saldo
  - KREDIT → mengurangi saldo

- **Normal Balance KREDIT** (LIABILITY, EQUITY, REVENUE):
  - KREDIT → menambah saldo
  - DEBIT → mengurangi saldo

### 2. Perhitungan Saldo Akun

```javascript
// Untuk akun dengan normalBalance = DEBIT (ASSET, EXPENSE)
Saldo = Σ(DEBIT) - Σ(KREDIT)

// Untuk akun dengan normalBalance = KREDIT (LIABILITY, EQUITY, REVENUE)
Saldo = Σ(KREDIT) - Σ(DEBIT)
```

### 3. Pembatasan Sumber Daya (Restriction)

Setiap entry jurnal memiliki flag `hasRestriction`:
- `hasRestriction = false` → **Tanpa Pembatasan dari Pemberi Sumber Daya**
- `hasRestriction = true` → **Dengan Pembatasan dari Pemberi Sumber Daya**

Saldo akun dihitung terpisah untuk kedua kategori ini.

### 4. Tipe Akun

- **ASSET** (Aset): Normal Balance = DEBIT
- **LIABILITY** (Kewajiban): Normal Balance = KREDIT
- **EQUITY** (Aset Neto/Ekuitas): Normal Balance = KREDIT
- **REVENUE** (Pendapatan): Normal Balance = KREDIT
- **EXPENSE** (Beban): Normal Balance = DEBIT

---

## Laporan Penghasilan Komprehensif

**Nama Lain:** Laporan Laba Rugi, Income Statement, Statement of Comprehensive Income

### Tujuan

Menampilkan pendapatan dan beban dalam periode tertentu untuk menghitung surplus (laba) atau defisit (rugi).

### Parameter Input

- `masjidId`: ID masjid
- `tanggalAwal`: Tanggal awal periode (YYYY-MM-DD)
- `tanggalAkhir`: Tanggal akhir periode (YYYY-MM-DD)

### Langkah Perhitungan

#### 1. Ambil Akun Pendapatan dan Beban

```javascript
// Filter hanya akun detail (isGroup = false) dengan tipe REVENUE atau EXPENSE
accounts = allAccounts.filter(
  acc => !acc.isGroup && (acc.type === "REVENUE" || acc.type === "EXPENSE")
)
```

#### 2. Hitung Saldo Awal dan Akhir

```javascript
// Saldo awal = saldo sampai tanggalAwal (tidak termasuk transaksi pada tanggalAwal)
balancesAwal = calculateAccountBalancesByRestriction(masjidId, tanggalAwal)

// Saldo akhir = saldo sampai tanggalAkhir (termasuk transaksi pada tanggalAkhir)
balancesAkhir = calculateAccountBalancesByRestriction(masjidId, tanggalAkhir)
```

#### 3. Hitung Saldo Periode

```javascript
// Saldo periode = Saldo Akhir - Saldo Awal
untuk setiap akun:
  tanpaPembatasan = akhirTanpa - awalTanpa
  denganPembatasan = akhirDengan - awalDengan
  saldo = tanpaPembatasan + denganPembatasan
```

#### 4. Kelompokkan Berdasarkan Kategori

Akun dikelompokkan berdasarkan parent group account (kategori):
- **Pendapatan**: Penerimaan ZISWAF, Penerimaan Qurban, Penerimaan Pendidikan, Penerimaan Lainnya, Aset Neto Yang Berakhir Pembatasannya
- **Beban**: Penyaluran ZISWAF, Penyaluran Qurban, Infaq, Beban Umum dan Administrasi, Beban Pemeliharaan, Beban Penyusutan, Beban Lain-Lain, Kerugian

#### 5. Hitung Total dan Laba Rugi

```javascript
// Total Pendapatan
totalPendapatanTanpa = Σ(pendapatan.tanpaPembatasan)
totalPendapatanDengan = Σ(pendapatan.denganPembatasan)
totalPendapatan = totalPendapatanTanpa + totalPendapatanDengan

// Total Beban
totalBebanTanpa = Σ(beban.tanpaPembatasan)
totalBebanDengan = Σ(beban.denganPembatasan)
totalBeban = totalBebanTanpa + totalBebanDengan

// Laba Rugi (Surplus/Defisit)
labaRugiTanpa = totalPendapatanTanpa - totalBebanTanpa
labaRugiDengan = totalPendapatanDengan - totalBebanDengan
labaRugi = totalPendapatan - totalBeban
```

**Catatan:**
- Nilai positif = **SURPLUS** (laba)
- Nilai negatif = **DEFISIT** (rugi)

### Struktur Output

```json
{
  "pendapatan": {
    "Penerimaan ZISWAF": [
      {
        "id": "account_id",
        "kodeAkun": "4.1.1",
        "namaAkun": "Penerimaan Zakat",
        "tanpaPembatasan": 1000000,
        "denganPembatasan": 500000,
        "saldo": 1500000
      }
    ],
    // ... kategori lainnya
  },
  "beban": {
    "Penyaluran ZISWAF": [
      {
        "id": "account_id",
        "kodeAkun": "5.1.1.001",
        "namaAkun": "Fakir",
        "tanpaPembatasan": 500000,
        "denganPembatasan": 200000,
        "saldo": 700000
      }
    ],
    // ... kategori lainnya
  },
  "subtotalPendapatan": {
    "Penerimaan ZISWAF": {
      "tanpaPembatasan": 1000000,
      "denganPembatasan": 500000,
      "saldo": 1500000
    }
  },
  "subtotalBeban": {
    "Penyaluran ZISWAF": {
      "tanpaPembatasan": 500000,
      "denganPembatasan": 200000,
      "saldo": 700000
    }
  },
  "totalPendapatanTanpa": 5000000,
  "totalPendapatanDengan": 2000000,
  "totalPendapatan": 7000000,
  "totalBebanTanpa": 3000000,
  "totalBebanDengan": 1000000,
  "totalBeban": 4000000,
  "labaRugiTanpa": 2000000,
  "labaRugiDengan": 1000000,
  "labaRugi": 3000000
}
```

---

## Laporan Posisi Keuangan

**Nama Lain:** Neraca, Balance Sheet, Statement of Financial Position

### Tujuan

Menampilkan aset, kewajiban, dan ekuitas pada tanggal tertentu. Harus memenuhi persamaan akuntansi: **Aset = Kewajiban + Ekuitas**

### Parameter Input

- `masjidId`: ID masjid
- `tanggal`: Tanggal laporan (YYYY-MM-DD)

### Langkah Perhitungan

#### 1. Ambil Semua Akun Aktif

```javascript
// Ambil default accounts (masjidId = null) + custom accounts untuk masjid
accounts = allAccounts.filter(acc => !acc.isGroup && acc.isActive)
```

#### 2. Hitung Saldo Sampai Tanggal

```javascript
// Set tanggal ke akhir hari (23:59:59.999) untuk memastikan semua transaksi pada tanggal tersebut terhitung
tanggalDate.setUTCHours(23, 59, 59, 999)

// Hitung saldo terpisah berdasarkan pembatasan
balances = calculateAccountBalancesByRestriction(masjidId, tanggalDate)
```

#### 3. Kelompokkan Berdasarkan Tipe Akun

**Aset (ASSET):**
- Dikelompokkan berdasarkan kategori parent (mis. "Aset Lancar", "Aset Tidak Lancar")
- Setiap akun memiliki `tanpaPembatasan`, `denganPembatasan`, dan `saldo`

**Kewajiban (LIABILITY):**
- Dikelompokkan berdasarkan kategori parent (mis. "Liabilitas Jangka Pendek", "Liabilitas Jangka Panjang")
- Setiap akun memiliki `tanpaPembatasan`, `denganPembatasan`, dan `saldo`

**Ekuitas (EQUITY):**
- **Khusus:** Dikelompokkan berdasarkan flag `hasRestriction`, bukan parent name
- **Kategori 1:** "Tanpa Pembatasan dari Pemberi Sumber Daya" → hanya `tanpaPembatasan`
- **Kategori 2:** "Dengan Pembatasan dari Pemberi Sumber Daya" → hanya `denganPembatasan`
- Setiap akun ekuitas muncul di kedua kategori jika memiliki saldo di keduanya

#### 4. Hitung Total

```javascript
// Total Aset
totalAsetTanpa = Σ(aset.tanpaPembatasan)
totalAsetDengan = Σ(aset.denganPembatasan)
totalAset = totalAsetTanpa + totalAsetDengan

// Total Kewajiban
totalKewajibanTanpa = Σ(kewajiban.tanpaPembatasan)
totalKewajibanDengan = Σ(kewajiban.denganPembatasan)
totalKewajiban = totalKewajibanTanpa + totalKewajibanDengan

// Total Ekuitas
totalEkuitasTanpa = Σ(ekuitas.tanpaPembatasan)
totalEkuitasDengan = Σ(ekuitas.denganPembatasan)
totalEkuitas = totalEkuitasTanpa + totalEkuitasDengan

// Total Kewajiban + Ekuitas
totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas
```

#### 5. Validasi Balance

```javascript
// Persamaan akuntansi harus terpenuhi
selisih = totalAset - totalKewajibanDanEkuitas
isBalance = Math.abs(selisih) < 0.01  // Toleransi 0.01 untuk floating point

// Jika tidak balance, ada warning di log
if (!isBalance) {
  console.warn('⚠️ WARNING: Neraca tidak balance!')
  // Kemungkinan: Ada transaksi jurnal yang tidak balance (Total DEBIT ≠ Total KREDIT)
}
```

### Struktur Output

```json
{
  "aset": {
    "Aset Lancar": [
      {
        "id": "account_id",
        "kodeAkun": "1.1.1.001",
        "namaAkun": "Kas Tunai",
        "tanpaPembatasan": 5000000,
        "denganPembatasan": 2000000,
        "saldo": 7000000
      }
    ],
    // ... kategori lainnya
  },
  "kewajiban": {
    "Liabilitas Jangka Pendek": [
      {
        "id": "account_id",
        "kodeAkun": "2.1.1.001",
        "namaAkun": "Utang Pusat",
        "tanpaPembatasan": 1000000,
        "denganPembatasan": 0,
        "saldo": 1000000
      }
    ],
    // ... kategori lainnya
  },
  "ekuitas": {
    "Tanpa Pembatasan dari Pemberi Sumber Daya": [
      {
        "id": "account_id",
        "kodeAkun": "3.1",
        "namaAkun": "Aset Neto Tahun Lalu",
        "tanpaPembatasan": 10000000,
        "denganPembatasan": 0,
        "saldo": 10000000
      }
    ],
    "Dengan Pembatasan dari Pemberi Sumber Daya": [
      {
        "id": "account_id",
        "kodeAkun": "3.1",
        "namaAkun": "Aset Neto Tahun Lalu",
        "tanpaPembatasan": 0,
        "denganPembatasan": 5000000,
        "saldo": 5000000
      }
    ]
  },
  "subtotalAset": {
    "Aset Lancar": {
      "tanpaPembatasan": 5000000,
      "denganPembatasan": 2000000,
      "saldo": 7000000
    }
  },
  "subtotalKewajiban": { /* ... */ },
  "subtotalEkuitas": { /* ... */ },
  "totalAsetTanpa": 20000000,
  "totalAsetDengan": 8000000,
  "totalAset": 28000000,
  "totalKewajibanTanpa": 3000000,
  "totalKewajibanDengan": 1000000,
  "totalKewajiban": 4000000,
  "totalEkuitasTanpa": 15000000,
  "totalEkuitasDengan": 9000000,
  "totalEkuitas": 24000000,
  "totalKewajibanDanEkuitas": 28000000,
  "selisih": 0,
  "isBalance": true
}
```

---

## Laporan Perubahan Aset Neto

**Nama Lain:** Laporan Perubahan Ekuitas, Statement of Changes in Net Assets

### Tujuan

Menampilkan perubahan ekuitas dalam periode tertentu, termasuk saldo awal, laba rugi, perubahan modal, dan saldo akhir.

### Parameter Input

- `masjidId`: ID masjid
- `tanggalAwal`: Tanggal awal periode (YYYY-MM-DD)
- `tanggalAkhir`: Tanggal akhir periode (YYYY-MM-DD)

### Langkah Perhitungan

#### 1. Ambil Akun Ekuitas

```javascript
// Ambil hanya akun detail (isGroup = false) dengan tipe EQUITY
ekuitasAccounts = allAccounts.filter(
  acc => !acc.isGroup && acc.type === "EQUITY" && acc.isActive
)
```

#### 2. Hitung Saldo Awal Ekuitas

```javascript
// Saldo awal = saldo sampai SEBELUM tanggalAwal (tidak termasuk transaksi pada tanggalAwal)
tanggalAwalDate = new Date(tanggalAwal)
tanggalAwalDate.setUTCDate(tanggalAwalDate.getUTCDate() - 1)  // Hari sebelumnya
tanggalAwalDate.setUTCHours(23, 59, 59, 999)  // Akhir hari sebelumnya

balancesAwal = calculateAccountBalancesByRestriction(masjidId, tanggalAwalDate)

saldoAwalEkuitasTanpa = Σ(ekuitasAccounts.map(acc => balancesAwal[acc.id].tanpaPembatasan))
saldoAwalEkuitasDengan = Σ(ekuitasAccounts.map(acc => balancesAwal[acc.id].denganPembatasan))
saldoAwalEkuitas = saldoAwalEkuitasTanpa + saldoAwalEkuitasDengan
```

#### 3. Hitung Laba Rugi Periode

```javascript
// Gunakan fungsi generateLabaRugiFromJurnal
labaRugiData = generateLabaRugiFromJurnal(masjidId, tanggalAwal, tanggalAkhir)

labaRugiTanpa = labaRugiData.labaRugiTanpa
labaRugiDengan = labaRugiData.labaRugiDengan
labaRugi = labaRugiData.labaRugi
```

#### 4. Hitung Saldo Akhir Ekuitas

```javascript
// Saldo akhir = saldo sampai tanggalAkhir (termasuk transaksi pada tanggalAkhir)
tanggalAkhirDate = new Date(tanggalAkhir)
tanggalAkhirDate.setUTCHours(23, 59, 59, 999)  // Akhir hari tanggalAkhir

balancesAkhir = calculateAccountBalancesByRestriction(masjidId, tanggalAkhirDate)

saldoAkhirEkuitasTanpa = Σ(ekuitasAccounts.map(acc => balancesAkhir[acc.id].tanpaPembatasan))
saldoAkhirEkuitasDengan = Σ(ekuitasAccounts.map(acc => balancesAkhir[acc.id].denganPembatasan))
saldoAkhirEkuitas = saldoAkhirEkuitasTanpa + saldoAkhirEkuitasDengan
```

#### 5. Hitung Perubahan Modal

```javascript
// Perubahan Modal = Perubahan Total Ekuitas - Laba Rugi
// Atau: Perubahan Modal = Saldo Akhir - Saldo Awal - Laba Rugi

perubahanModalTanpa = saldoAkhirEkuitasTanpa - saldoAwalEkuitasTanpa - labaRugiTanpa
perubahanModalDengan = saldoAkhirEkuitasDengan - saldoAwalEkuitasDengan - labaRugiDengan
perubahanModal = perubahanModalTanpa + perubahanModalDengan
```

**Catatan:**
- Perubahan modal mencakup:
  - Setoran modal baru
  - Penarikan modal
  - Transfer antar akun ekuitas
  - Transaksi lain yang mempengaruhi ekuitas selain laba rugi

#### 6. Validasi

```javascript
// Validasi: Saldo Akhir = Saldo Awal + Laba Rugi + Perubahan Modal
saldoAkhirEkuitas = saldoAwalEkuitas + labaRugi + perubahanModal
```

### Struktur Output

```json
{
  "saldoAwalEkuitasTanpa": 10000000,
  "saldoAwalEkuitasDengan": 5000000,
  "saldoAwalEkuitas": 15000000,
  "labaRugiTanpa": 2000000,
  "labaRugiDengan": 1000000,
  "labaRugi": 3000000,
  "perubahanModalTanpa": 500000,
  "perubahanModalDengan": 200000,
  "perubahanModal": 700000,
  "saldoAkhirEkuitasTanpa": 12500000,
  "saldoAkhirEkuitasDengan": 6200000,
  "saldoAkhirEkuitas": 18700000
}
```

**Penjelasan:**
- `saldoAwalEkuitas`: Ekuitas pada awal periode
- `labaRugi`: Surplus/defisit dari laporan penghasilan komprehensif
- `perubahanModal`: Perubahan ekuitas selain laba rugi (setoran, penarikan, transfer)
- `saldoAkhirEkuitas`: Ekuitas pada akhir periode

---

## Pembatasan Sumber Daya

### Konsep

Pembatasan sumber daya (`hasRestriction`) digunakan untuk membedakan sumber dana yang:
- **Tanpa Pembatasan** (`hasRestriction = false`): Dapat digunakan untuk tujuan apa saja
- **Dengan Pembatasan** (`hasRestriction = true`): Hanya dapat digunakan untuk tujuan tertentu sesuai keinginan pemberi

### Perhitungan Saldo Terpisah

```javascript
// Untuk setiap entry jurnal
if (entry.hasRestriction === true) {
  denganPembatasan += adjustment  // adjustment berdasarkan normalBalance
} else {
  tanpaPembatasan += adjustment
}

// Total saldo
saldo = tanpaPembatasan + denganPembatasan
```

### Penggunaan di Laporan

1. **Laporan Penghasilan Komprehensif:**
   - Pendapatan dan beban ditampilkan terpisah untuk tanpa/dengan pembatasan
   - Laba rugi juga dihitung terpisah

2. **Laporan Posisi Keuangan:**
   - Aset dan kewajiban ditampilkan dengan breakdown tanpa/dengan pembatasan
   - Ekuitas dikelompokkan menjadi 2 kategori berdasarkan pembatasan

3. **Laporan Perubahan Aset Neto:**
   - Semua komponen (saldo awal, laba rugi, perubahan modal, saldo akhir) ditampilkan terpisah

---

## Catatan Penting

### 1. Timezone Handling

Semua perhitungan menggunakan UTC untuk menghindari masalah timezone:
```javascript
tanggalDate.setUTCHours(23, 59, 59, 999)  // Set ke akhir hari dalam UTC
```

### 2. Filter Tanggal

- **Saldo Awal:** Sampai akhir hari **sebelum** tanggalAwal (tidak termasuk tanggalAwal)
- **Saldo Akhir:** Sampai akhir hari tanggalAkhir (termasuk tanggalAkhir)
- **Saldo Periode:** Selisih antara saldo akhir dan saldo awal

### 3. Akun Group vs Detail

- Hanya akun detail (`isGroup = false`) yang digunakan untuk perhitungan saldo
- Akun group (`isGroup = true`) hanya digunakan untuk pengelompokan/kategori

### 4. Validasi Balance

- **Neraca:** Harus memenuhi `Aset = Kewajiban + Ekuitas`
- **Perubahan Ekuitas:** Harus memenuhi `Saldo Akhir = Saldo Awal + Laba Rugi + Perubahan Modal`

### 5. Toleransi Floating Point

Karena perhitungan menggunakan floating point, validasi balance menggunakan toleransi:
```javascript
isBalance = Math.abs(selisih) < 0.01  // Toleransi 0.01
```

---

## Referensi

- File implementasi: `src/services/laporan_keuangan_service.js`
- File controller: `src/controllers/laporan_keuangan_controllers.js`
- File utility: `src/utils/jurnal_utils.js`
- Schema database: `prisma/schema.prisma`

