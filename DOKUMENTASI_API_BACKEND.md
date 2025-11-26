# Dokumentasi API Backend - Sistem Jurnal Akuntansi

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
Semua endpoint (kecuali auth) memerlukan JWT token di header:
```
Authorization: Bearer <token>
```

Token diambil dari localStorage dengan key `accessToken` (sudah di-handle oleh axios interceptor di frontend).

---

## Response Format

### Success Response
```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": { ... }
}
```

---

## 1. Chart of Accounts (COA) API

### GET `/coa`
Mendapatkan semua COA untuk masjid yang login.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `masjidId` (optional): Filter by masjid ID. Jika tidak diisi, akan menggunakan masjidId dari user yang login.
- `includeInactive` (optional): `true` atau `false`. Default: `false`.

**Response:**
```json
{
  "statusCode": 200,
  "message": "Accounts fetched successfully",
  "data": [
    {
      "id": "coa_1234567890_abc123",
      "code": "1.1.1.01",
      "name": "Kas Besar",
      "parentId": "coa_parent_id",
      "parent": {
        "id": "coa_parent_id",
        "code": "1.1.1",
        "name": "Kas dan Setara Kas",
        "pathCode": "1.1.1"
      },
      "children": [],
      "type": "ASSET",
      "isGroup": false,
      "pathCode": "1.1.1.01",
      "masjidId": "masjid_001",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/coa', {
  params: {
    includeInactive: false
  }
});
```

---

### GET `/coa/tree`
Mendapatkan COA dalam bentuk hierarchical tree structure.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `masjidId` (optional): Filter by masjid ID.

**Response:**
```json
{
  "statusCode": 200,
  "message": "Account tree fetched successfully",
  "data": [
    {
      "id": "coa_1",
      "code": "1",
      "name": "Aset",
      "type": "ASSET",
      "isGroup": true,
      "pathCode": "1",
      "children": [
        {
          "id": "coa_1_1",
          "code": "1.1",
          "name": "Aset Lancar",
          "type": "ASSET",
          "isGroup": true,
          "pathCode": "1.1",
          "children": [
            {
              "id": "coa_1_1_1",
              "code": "1.1.1",
              "name": "Kas dan Setara Kas",
              "type": "ASSET",
              "isGroup": true,
              "pathCode": "1.1.1",
              "children": [
                {
                  "id": "coa_1_1_1_01",
                  "code": "1.1.1.01",
                  "name": "Kas Besar",
                  "type": "ASSET",
                  "isGroup": false,
                  "pathCode": "1.1.1.01",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/coa/tree');
```

---

### GET `/coa/:id`
Mendapatkan detail COA berdasarkan ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Account fetched successfully",
  "data": {
    "id": "coa_123",
    "code": "1.1.1.01",
    "name": "Kas Besar",
    "parentId": "coa_parent_id",
    "parent": { ... },
    "children": [ ... ],
    "type": "ASSET",
    "isGroup": false,
    "pathCode": "1.1.1.01",
    "masjidId": "masjid_001",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "masjid": {
      "id": "masjid_001",
      "Nama": "Masjid Al-Ikhlas"
    }
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get(`/coa/${accountId}`);
```

---

### POST `/coa`
Membuat COA baru.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "1.1.1.03",
  "name": "Kas di Bank",
  "parentId": "coa_parent_id",  // Optional: null untuk root account
  "type": "ASSET",              // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  "isGroup": false,             // true untuk header/group, false untuk detail account
  "masjidId": "masjid_001"      // Optional: null untuk default/global account
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Account created successfully",
  "data": {
    "id": "coa_new_id",
    "code": "1.1.1.03",
    "name": "Kas di Bank",
    "parentId": "coa_parent_id",
    "type": "ASSET",
    "isGroup": false,
    "pathCode": "1.1.1.03",
    "masjidId": "masjid_001",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.post('/coa', {
  code: "1.1.1.03",
  name: "Kas di Bank",
  parentId: "coa_parent_id",
  type: "ASSET",
  isGroup: false
});
```

**Validasi:**
- `code`, `name`, dan `type` wajib diisi
- `code` harus unique per masjid
- Jika ada `parentId`, parent harus `isGroup = true`
- `pathCode` akan di-generate otomatis

---

### PUT `/coa/:id`
Update COA.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "1.1.1.03",
  "name": "Kas di Bank (Updated)",
  "type": "ASSET",
  "isGroup": false,
  "isActive": true
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Account updated successfully",
  "data": { ... }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.put(`/coa/${accountId}`, {
  name: "Kas di Bank (Updated)",
  isActive: true
});
```

**Catatan:**
- Tidak bisa mengubah `type` jika account sudah memiliki jurnal entries
- Tidak bisa set `parentId` ke self atau descendant

---

### DELETE `/coa/:id`
Soft delete COA (set `isActive = false`).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Account deleted successfully",
  "data": { ... }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.delete(`/coa/${accountId}`);
```

**Error:**
- 400: Account tidak bisa dihapus jika sudah ada jurnal entries
- 400: Account tidak bisa dihapus jika memiliki child accounts

---

### POST `/coa/seed`
Seed default COA untuk masjid.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `masjidId` (optional): Masjid ID. Jika tidak diisi, akan menggunakan masjidId dari user yang login.

**Response:**
```json
{
  "statusCode": 201,
  "message": "Default COA seeded successfully. 19 accounts created.",
  "data": {
    "success": true,
    "count": 19,
    "accounts": [ ... ]
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.post('/coa/seed');
```

**Error:**
- 400: Default COA sudah ada untuk masjid ini

---

## 2. Jurnal API

### GET `/jurnal`
Mendapatkan semua jurnal dengan filter opsional.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `tanggalAwal` (optional): ISO date string (contoh: "2024-01-01")
- `tanggalAkhir` (optional): ISO date string (contoh: "2024-12-31")
- `akunId` (optional): Filter by account ID
- `tipe` (optional): `DEBIT` atau `KREDIT`

**Response:**
```json
{
  "statusCode": 200,
  "message": "Jurnals fetched successfully",
  "data": [
    {
      "id": "jurnal_1234567890_xyz789",
      "masjidId": "masjid_001",
      "tanggal": "2024-01-15T10:30:00.000Z",
      "akunId": "coa_123",
      "akun": {
        "id": "coa_123",
        "code": "1.1.1.01",
        "name": "Kas Besar",
        "type": "ASSET",
        "pathCode": "1.1.1.01"
      },
      "tipe": "DEBIT",
      "jumlah": "5000000.00",
      "keterangan": "Donasi dari jamaah untuk renovasi",
      "referensi": "donasi_001",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "masjid": {
        "id": "masjid_001",
        "Nama": "Masjid Al-Ikhlas"
      }
    }
  ]
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/jurnal', {
  params: {
    tanggalAwal: '2024-01-01',
    tanggalAkhir: '2024-12-31',
    akunId: 'coa_123',
    tipe: 'DEBIT'
  }
});
```

---

### GET `/jurnal/:id`
Mendapatkan detail jurnal berdasarkan ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Jurnal fetched successfully",
  "data": {
    "id": "jurnal_123",
    "masjidId": "masjid_001",
    "tanggal": "2024-01-15T10:30:00.000Z",
    "akunId": "coa_123",
    "akun": { ... },
    "tipe": "DEBIT",
    "jumlah": "5000000.00",
    "keterangan": "Donasi dari jamaah",
    "referensi": "donasi_001",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get(`/jurnal/${jurnalId}`);
```

---

### POST `/jurnal`
Membuat jurnal baru.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tanggal": "2024-01-15T10:30:00.000Z",  // ISO date string
  "akunId": "coa_123",                    // Account ID (harus detail account, bukan group)
  "tipe": "DEBIT",                        // DEBIT atau KREDIT
  "jumlah": 5000000,                      // Number (decimal)
  "keterangan": "Donasi dari jamaah untuk renovasi",
  "referensi": "donasi_001"               // Optional
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Jurnal created successfully",
  "data": {
    "id": "jurnal_new_id",
    "masjidId": "masjid_001",
    "tanggal": "2024-01-15T10:30:00.000Z",
    "akunId": "coa_123",
    "akun": { ... },
    "tipe": "DEBIT",
    "jumlah": "5000000.00",
    "keterangan": "Donasi dari jamaah untuk renovasi",
    "referensi": "donasi_001",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.post('/jurnal', {
  tanggal: '2024-01-15',
  akunId: 'coa_123',
  tipe: 'DEBIT',
  jumlah: 5000000,
  keterangan: 'Donasi dari jamaah untuk renovasi',
  referensi: 'donasi_001'
});
```

**Validasi:**
- `tanggal`, `akunId`, `tipe`, `jumlah`, dan `keterangan` wajib diisi
- `jumlah` harus > 0
- `tipe` harus `DEBIT` atau `KREDIT`
- Account harus aktif dan bukan group account (`isGroup = false`)

---

### PUT `/jurnal/:id`
Update jurnal.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tanggal": "2024-01-15T10:30:00.000Z",
  "akunId": "coa_123",
  "tipe": "DEBIT",
  "jumlah": 6000000,
  "keterangan": "Donasi dari jamaah (updated)",
  "referensi": "donasi_001"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Jurnal updated successfully",
  "data": { ... }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.put(`/jurnal/${jurnalId}`, {
  jumlah: 6000000,
  keterangan: 'Donasi dari jamaah (updated)'
});
```

---

### DELETE `/jurnal/:id`
Hapus jurnal.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Jurnal deleted successfully",
  "data": { ... }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.delete(`/jurnal/${jurnalId}`);
```

---

### GET `/jurnal/balances`
Mendapatkan saldo semua akun.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `endDate` (optional): ISO date string. Default: sekarang.

**Response:**
```json
{
  "statusCode": 200,
  "message": "Account balances calculated successfully",
  "data": {
    "coa_123": {
      "account": {
        "id": "coa_123",
        "code": "1.1.1.01",
        "name": "Kas Besar",
        "type": "ASSET",
        "pathCode": "1.1.1.01"
      },
      "saldo": 15000000
    },
    "coa_456": {
      "account": {
        "id": "coa_456",
        "code": "4.1",
        "name": "Pendapatan Donasi",
        "type": "REVENUE",
        "pathCode": "4.1"
      },
      "saldo": 10000000
    }
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/jurnal/balances', {
  params: {
    endDate: '2024-12-31'
  }
});
```

---

## 3. Laporan Keuangan dari Jurnal API

### GET `/laporan-keuangan/jurnal/posisi-keuangan`
Generate Laporan Posisi Keuangan (Neraca) dari jurnal sesuai template masjid.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `tanggal` (required): ISO date string atau date string (YYYY-MM-DD) - Tanggal laporan

**Response:**
```json
{
  "statusCode": 200,
  "message": "Neraca generated successfully",
  "data": {
    "aset": {
      "Aset Lancar": [
        {
          "id": "coa_123",
          "kodeAkun": "1.1.1.001",
          "namaAkun": "Kas Tunai",
          "tanpaPembatasan": 10000000,
          "denganPembatasan": 5000000,
          "saldo": 15000000
        },
        {
          "id": "coa_124",
          "kodeAkun": "1.1.1.002",
          "namaAkun": "Kas Bank BSI",
          "tanpaPembatasan": 8000000,
          "denganPembatasan": 0,
          "saldo": 8000000
        }
      ],
      "Aset Tidak Lancar": [
        {
          "id": "coa_456",
          "kodeAkun": "1.2.1.001",
          "namaAkun": "Tanah Masjid",
          "tanpaPembatasan": 500000000,
          "denganPembatasan": 0,
          "saldo": 500000000
        }
      ]
    },
    "kewajiban": {
      "Liabilitas Jangka Pendek": [
        {
          "id": "coa_789",
          "kodeAkun": "2.1.1.001",
          "namaAkun": "Utang Pusat",
          "tanpaPembatasan": 5000000,
          "denganPembatasan": 0,
          "saldo": 5000000
        }
      ],
      "Liabilitas Jangka Panjang": []
    },
    "ekuitas": {
      "Tanpa Pembatasan dari Pemberi Sumber Daya": [
        {
          "id": "coa_890",
          "kodeAkun": "3.1.1",
          "namaAkun": "Aset Neto Tanpa Pembatasan Tahun Lalu",
          "tanpaPembatasan": 100000000,
          "denganPembatasan": 0,
          "saldo": 100000000
        }
      ],
      "Dengan Pembatasan dari Pemberi Sumber Daya": [
        {
          "id": "coa_891",
          "kodeAkun": "3.2.1",
          "namaAkun": "Aset Neto Dengan Pembatasan Tahun Lalu",
          "tanpaPembatasan": 0,
          "denganPembatasan": 50000000,
          "saldo": 50000000
        }
      ]
    },
    "subtotalAset": {
      "Aset Lancar": {
        "tanpaPembatasan": 18000000,
        "denganPembatasan": 5000000,
        "saldo": 23000000
      },
      "Aset Tidak Lancar": {
        "tanpaPembatasan": 500000000,
        "denganPembatasan": 0,
        "saldo": 500000000
      }
    },
    "subtotalKewajiban": {
      "Liabilitas Jangka Pendek": {
        "tanpaPembatasan": 5000000,
        "denganPembatasan": 0,
        "saldo": 5000000
      }
    },
    "subtotalEkuitas": {
      "Tanpa Pembatasan dari Pemberi Sumber Daya": {
        "tanpaPembatasan": 100000000,
        "denganPembatasan": 0,
        "saldo": 100000000
      },
      "Dengan Pembatasan dari Pemberi Sumber Daya": {
        "tanpaPembatasan": 0,
        "denganPembatasan": 50000000,
        "saldo": 50000000
      }
    },
    "totalAsetTanpa": 518000000,
    "totalAsetDengan": 5000000,
    "totalAset": 523000000,
    "totalKewajibanTanpa": 5000000,
    "totalKewajibanDengan": 0,
    "totalKewajiban": 5000000,
    "totalEkuitasTanpa": 100000000,
    "totalEkuitasDengan": 50000000,
    "totalEkuitas": 150000000,
    "totalKewajibanDanEkuitas": 155000000,
    "selisih": 0,
    "isBalance": true
  }
}
```

**Struktur Response:**
- `aset`, `kewajiban`, `ekuitas`: Object dengan key = nama kategori (parent name dari COA), value = array of accounts
- `subtotalAset`, `subtotalKewajiban`, `subtotalEkuitas`: Object dengan key = nama kategori, value = object dengan `tanpaPembatasan`, `denganPembatasan`, `saldo`
- Setiap akun memiliki:
  - `id`: Account ID
  - `kodeAkun`: Kode akun (format: `1.1.1.001`)
  - `namaAkun`: Nama akun
  - `tanpaPembatasan`: Nilai tanpa pembatasan (number)
  - `denganPembatasan`: Nilai dengan pembatasan (number)
  - `saldo`: Total saldo (tanpaPembatasan + denganPembatasan)
- Total terpisah untuk tanpa/dengan pembatasan
- `isBalance`: Boolean, true jika Aset = Kewajiban + Ekuitas

**Catatan:**
- Kategori name sesuai template masjid (mis. "Aset Lancar", "Aset Tidak Lancar", "Liabilitas Jangka Pendek", dll)
- Pembatasan berdasarkan flag `hasRestriction` di entry jurnal
- Subtotal per kategori dapat digunakan untuk menampilkan total per kategori di template

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/laporan-keuangan/jurnal/posisi-keuangan', {
  params: {
    tanggal: '2024-12-31'
  }
});
```

---

### GET `/laporan-keuangan/jurnal/penghasilan-komprehensif`
Generate Laporan Penghasilan Komprehensif dari jurnal sesuai template masjid.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `tanggalAwal` (required): ISO date string atau date string (YYYY-MM-DD) - Tanggal awal periode
- `tanggalAkhir` (required): ISO date string atau date string (YYYY-MM-DD) - Tanggal akhir periode

**Response:**
```json
{
  "statusCode": 200,
  "message": "Laporan Penghasilan Komprehensif generated successfully",
  "data": {
    "pendapatan": {
      "Penerimaan ZISWAF": [
        {
          "id": "coa_123",
          "kodeAkun": "4.1.1",
          "namaAkun": "Penerimaan Zakat",
          "tanpaPembatasan": 50000000,
          "denganPembatasan": 10000000,
          "saldo": 60000000
        },
        {
          "id": "coa_124",
          "kodeAkun": "4.1.2",
          "namaAkun": "Penerimaan Infaq/Maal",
          "tanpaPembatasan": 30000000,
          "denganPembatasan": 5000000,
          "saldo": 35000000
        },
        {
          "id": "coa_125",
          "kodeAkun": "4.1.3",
          "namaAkun": "Penerimaan Shodaqoh",
          "tanpaPembatasan": 20000000,
          "denganPembatasan": 0,
          "saldo": 20000000
        }
      ],
      "Penerimaan Qurban": [
        {
          "id": "coa_126",
          "kodeAkun": "4.2.1",
          "namaAkun": "Penerimaan Mustahiq",
          "tanpaPembatasan": 15000000,
          "denganPembatasan": 0,
          "saldo": 15000000
        }
      ],
      "Penerimaan Pendidikan": [
        {
          "id": "coa_127",
          "kodeAkun": "4.3.1",
          "namaAkun": "Uang Pangkal",
          "tanpaPembatasan": 10000000,
          "denganPembatasan": 0,
          "saldo": 10000000
        }
      ],
      "Penerimaan Lainnya": [
        {
          "id": "coa_128",
          "kodeAkun": "4.4.1",
          "namaAkun": "Bagi Hasil Bank",
          "tanpaPembatasan": 5000000,
          "denganPembatasan": 0,
          "saldo": 5000000
        }
      ],
      "Aset Neto Yang Berakhir Pembatasannya": [
        {
          "id": "coa_129",
          "kodeAkun": "4.9.1",
          "namaAkun": "Pemenuhan Program Pembatasan",
          "tanpaPembatasan": 0,
          "denganPembatasan": 20000000,
          "saldo": 20000000
        }
      ]
    },
    "beban": {
      "Penyaluran ZISWAF": [
        {
          "id": "coa_456",
          "kodeAkun": "5.1.1.001",
          "namaAkun": "Fakir",
          "tanpaPembatasan": 10000000,
          "denganPembatasan": 5000000,
          "saldo": 15000000
        },
        {
          "id": "coa_457",
          "kodeAkun": "5.1.1.002",
          "namaAkun": "Miskin",
          "tanpaPembatasan": 8000000,
          "denganPembatasan": 0,
          "saldo": 8000000
        }
      ],
      "Penyaluran Qurban": [
        {
          "id": "coa_458",
          "kodeAkun": "5.2.1",
          "namaAkun": "Penyaluran Qurban",
          "tanpaPembatasan": 12000000,
          "denganPembatasan": 0,
          "saldo": 12000000
        }
      ],
      "Infaq": [
        {
          "id": "coa_459",
          "kodeAkun": "5.3.1",
          "namaAkun": "Infaq Khotib/Imam/Penceramah",
          "tanpaPembatasan": 5000000,
          "denganPembatasan": 0,
          "saldo": 5000000
        }
      ],
      "Beban Umum dan Administrasi": [
        {
          "id": "coa_460",
          "kodeAkun": "5.4.1.001",
          "namaAkun": "Beban ATK",
          "tanpaPembatasan": 2000000,
          "denganPembatasan": 0,
          "saldo": 2000000
        },
        {
          "id": "coa_461",
          "kodeAkun": "5.4.1.006",
          "namaAkun": "Listrik",
          "tanpaPembatasan": 3000000,
          "denganPembatasan": 0,
          "saldo": 3000000
        }
      ],
      "Beban Pemeliharaan": [
        {
          "id": "coa_462",
          "kodeAkun": "5.4.3.001",
          "namaAkun": "Beban Pemeliharaan Bangunan",
          "tanpaPembatasan": 5000000,
          "denganPembatasan": 0,
          "saldo": 5000000
        }
      ],
      "Beban Penyusutan": [
        {
          "id": "coa_463",
          "kodeAkun": "5.4.4.001",
          "namaAkun": "Beban Penyusutan Bangunan",
          "tanpaPembatasan": 10000000,
          "denganPembatasan": 0,
          "saldo": 10000000
        }
      ],
      "Beban Lain-Lain": [
        {
          "id": "coa_464",
          "kodeAkun": "5.4.9.001",
          "namaAkun": "Beban Lain-lain",
          "tanpaPembatasan": 1000000,
          "denganPembatasan": 0,
          "saldo": 1000000
        }
      ],
      "Kerugian Akibat Kebakaran": [
        {
          "id": "coa_465",
          "kodeAkun": "5.5.1.001",
          "namaAkun": "Kerugian akibat kebakaran",
          "tanpaPembatasan": 0,
          "denganPembatasan": 0,
          "saldo": 0
        }
      ],
      "Kerugian Aktuarial Dan Kewajiban Tahunan": [
        {
          "id": "coa_466",
          "kodeAkun": "5.6.1.001",
          "namaAkun": "Kerugian aktuarial dan kewajiban lainnya",
          "tanpaPembatasan": 0,
          "denganPembatasan": 0,
          "saldo": 0
        }
      ]
    },
    "subtotalPendapatan": {
      "Penerimaan ZISWAF": {
        "tanpaPembatasan": 100000000,
        "denganPembatasan": 15000000,
        "saldo": 115000000
      },
      "Penerimaan Qurban": {
        "tanpaPembatasan": 15000000,
        "denganPembatasan": 0,
        "saldo": 15000000
      },
      "Penerimaan Pendidikan": {
        "tanpaPembatasan": 10000000,
        "denganPembatasan": 0,
        "saldo": 10000000
      },
      "Penerimaan Lainnya": {
        "tanpaPembatasan": 5000000,
        "denganPembatasan": 0,
        "saldo": 5000000
      },
      "Aset Neto Yang Berakhir Pembatasannya": {
        "tanpaPembatasan": 0,
        "denganPembatasan": 20000000,
        "saldo": 20000000
      }
    },
    "subtotalBeban": {
      "Penyaluran ZISWAF": {
        "tanpaPembatasan": 18000000,
        "denganPembatasan": 5000000,
        "saldo": 23000000
      },
      "Penyaluran Qurban": {
        "tanpaPembatasan": 12000000,
        "denganPembatasan": 0,
        "saldo": 12000000
      },
      "Infaq": {
        "tanpaPembatasan": 5000000,
        "denganPembatasan": 0,
        "saldo": 5000000
      },
      "Beban Umum dan Administrasi": {
        "tanpaPembatasan": 5000000,
        "denganPembatasan": 0,
        "saldo": 5000000
      },
      "Beban Pemeliharaan": {
        "tanpaPembatasan": 5000000,
        "denganPembatasan": 0,
        "saldo": 5000000
      },
      "Beban Penyusutan": {
        "tanpaPembatasan": 10000000,
        "denganPembatasan": 0,
        "saldo": 10000000
      },
      "Beban Lain-Lain": {
        "tanpaPembatasan": 1000000,
        "denganPembatasan": 0,
        "saldo": 1000000
      },
      "Kerugian Akibat Kebakaran": {
        "tanpaPembatasan": 0,
        "denganPembatasan": 0,
        "saldo": 0
      },
      "Kerugian Aktuarial Dan Kewajiban Tahunan": {
        "tanpaPembatasan": 0,
        "denganPembatasan": 0,
        "saldo": 0
      }
    },
    "totalPendapatanTanpa": 130000000,
    "totalPendapatanDengan": 35000000,
    "totalPendapatan": 165000000,
    "totalBebanTanpa": 55000000,
    "totalBebanDengan": 5000000,
    "totalBeban": 60000000,
    "labaRugiTanpa": 75000000,
    "labaRugiDengan": 30000000,
    "labaRugi": 105000000
  }
}
```

**Struktur Response:**
- `pendapatan`: Object dengan key = nama kategori sesuai template (mis. "Penerimaan ZISWAF", "Penerimaan Qurban", "Penerimaan Pendidikan", "Penerimaan Lainnya", "Aset Neto Yang Berakhir Pembatasannya"), value = array of accounts
- `beban`: Object dengan key = nama kategori sesuai template (mis. "Penyaluran ZISWAF", "Penyaluran Qurban", "Infaq", "Beban Umum dan Administrasi", "Beban Pemeliharaan", "Beban Penyusutan", "Beban Lain-Lain", "Kerugian Akibat Kebakaran", "Kerugian Aktuarial Dan Kewajiban Tahunan"), value = array of accounts
- `subtotalPendapatan`, `subtotalBeban`: Object dengan key = nama kategori, value = object dengan `tanpaPembatasan`, `denganPembatasan`, `saldo`
- Setiap akun memiliki:
  - `id`: Account ID
  - `kodeAkun`: Kode akun (format: `4.1.1`, `5.1.1.001`, dll)
  - `namaAkun`: Nama akun
  - `tanpaPembatasan`: Nilai tanpa pembatasan (number)
  - `denganPembatasan`: Nilai dengan pembatasan (number)
  - `saldo`: Total saldo (tanpaPembatasan + denganPembatasan)
- `labaRugiTanpa`, `labaRugiDengan`, `labaRugi`: SURPLUS (DEFISIT) = Total Pendapatan - Total Beban

**Catatan:**
- Kategori name sesuai template masjid (mis. "Penerimaan ZISWAF" bukan "Pendapatan Donasi")
- Pembatasan berdasarkan flag `hasRestriction` di entry jurnal
- Subtotal per kategori dapat digunakan untuk menampilkan total per kategori di template (mis. "Total penerimaan ZISWAF")
- Nilai `labaRugi` negatif berarti DEFISIT, positif berarti SURPLUS

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/laporan-keuangan/jurnal/penghasilan-komprehensif', {
  params: {
    tanggalAwal: '2024-01-01',
    tanggalAkhir: '2024-12-31'
  }
});
```

---

### GET `/laporan-keuangan/jurnal/perubahan-aset-neto`
Generate Laporan Perubahan Aset Neto dari jurnal sesuai template masjid.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `tanggalAwal` (required): ISO date string atau date string (YYYY-MM-DD) - Tanggal awal periode
- `tanggalAkhir` (required): ISO date string atau date string (YYYY-MM-DD) - Tanggal akhir periode

**Response:**
```json
{
  "statusCode": 200,
  "message": "Laporan Perubahan Aset Neto generated successfully",
  "data": {
    "ekuitas": {
      "Tanpa Pembatasan dari Pemberi Sumber Daya": {
        "3.1.1": {
          "id": "coa_123",
          "kodeAkun": "3.1.1",
          "namaAkun": "Aset Neto Tahun Lalu",
          "saldoAwal": {
            "tanpaPembatasan": 50000000,
            "denganPembatasan": 0,
            "saldo": 50000000
          },
          "perubahanModal": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 0,
            "saldo": 0
          },
          "saldoAkhir": {
            "tanpaPembatasan": 50000000,
            "denganPembatasan": 0,
            "saldo": 50000000
          }
        },
        "3.1.2": {
          "id": "coa_124",
          "kodeAkun": "3.1.2",
          "namaAkun": "Aset Neto Tahun Berjalan",
          "saldoAwal": {
            "tanpaPembatasan": 50000000,
            "denganPembatasan": 0,
            "saldo": 50000000
          },
          "perubahanModal": {
            "tanpaPembatasan": 25000000,
            "denganPembatasan": 0,
            "saldo": 25000000
          },
          "saldoAkhir": {
            "tanpaPembatasan": 75000000,
            "denganPembatasan": 0,
            "saldo": 75000000
          }
        }
      },
      "Dengan Pembatasan dari Pemberi Sumber Daya": {
        "3.2.1": {
          "id": "coa_125",
          "kodeAkun": "3.2.1",
          "namaAkun": "Aset Neto Tahun Lalu",
          "saldoAwal": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 30000000,
            "saldo": 30000000
          },
          "perubahanModal": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 0,
            "saldo": 0
          },
          "saldoAkhir": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 30000000,
            "saldo": 30000000
          }
        },
        "3.2.2": {
          "id": "coa_126",
          "kodeAkun": "3.2.2",
          "namaAkun": "Aset Neto Tahun Berjalan",
          "saldoAwal": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 20000000,
            "saldo": 20000000
          },
          "perubahanModal": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 30000000,
            "saldo": 30000000
          },
          "saldoAkhir": {
            "tanpaPembatasan": 0,
            "denganPembatasan": 50000000,
            "saldo": 50000000
          }
        }
      }
    },
    "saldoAwalEkuitasTanpa": 100000000,
    "saldoAwalEkuitasDengan": 50000000,
    "saldoAwalEkuitas": 150000000,
    "labaRugiTanpa": 75000000,
    "labaRugiDengan": 30000000,
    "labaRugi": 105000000,
    "perubahanModalTanpa": 25000000,
    "perubahanModalDengan": 30000000,
    "perubahanModal": 55000000,
    "saldoAkhirEkuitasTanpa": 125000000,
    "saldoAkhirEkuitasDengan": 80000000,
    "saldoAkhirEkuitas": 205000000
  }
}
```

**Struktur Response:**
- `ekuitas`: Object dengan key = nama kategori pembatasan (parent name dari COA), value = object dengan key = kode akun, value = detail akun
  - Setiap akun memiliki:
    - `id`: Account ID
    - `kodeAkun`: Kode akun (format: `3.1.1`, `3.1.2`, dll)
    - `namaAkun`: Nama akun (tanpa redundansi "Tanpa/Dengan Pembatasan")
    - `saldoAwal`: Object dengan `tanpaPembatasan`, `denganPembatasan`, `saldo` (saldo sampai sebelum tanggalAwal)
    - `perubahanModal`: Object dengan `tanpaPembatasan`, `denganPembatasan`, `saldo` (perubahan modal per akun, selisih perubahan saldo akun)
    - `saldoAkhir`: Object dengan `tanpaPembatasan`, `denganPembatasan`, `saldo` (saldo sampai tanggalAkhir)
- `saldoAwalEkuitasTanpa`, `saldoAwalEkuitasDengan`, `saldoAwalEkuitas`: Total saldo awal ekuitas (sampai sebelum tanggalAwal)
- `labaRugiTanpa`, `labaRugiDengan`, `labaRugi`: Penghasilan Komprehensif dalam periode (dari Laporan Penghasilan Komprehensif) - Total untuk semua akun
- `perubahanModalTanpa`, `perubahanModalDengan`, `perubahanModal`: Total perubahan modal selain laba rugi (selisih antara perubahan total ekuitas dengan laba rugi)
- `saldoAkhirEkuitasTanpa`, `saldoAkhirEkuitasDengan`, `saldoAkhirEkuitas`: Total saldo akhir ekuitas (sampai tanggalAkhir)

**Rumus:**
- `saldoAkhirEkuitas = saldoAwalEkuitas + labaRugi + perubahanModal`
- `perubahanModal = saldoAkhirEkuitas - saldoAwalEkuitas - labaRugi`

**Catatan:**
- Saldo awal dihitung sampai akhir hari sebelum tanggalAwal (tidak termasuk transaksi pada tanggalAwal)
- Saldo akhir dihitung sampai akhir hari tanggalAkhir (termasuk semua transaksi pada tanggalAkhir)
- Penghasilan Komprehensif diambil dari Laporan Penghasilan Komprehensif untuk periode yang sama (total untuk semua akun)
- Pembatasan terpisah untuk tanpa/dengan pembatasan berdasarkan flag `hasRestriction` di entry jurnal, bukan dari nama akun COA
- Detail per akun ekuitas dikelompokkan berdasarkan parent name (kategori pembatasan) untuk memudahkan display di frontend
- Nama akun ekuitas sudah disederhanakan (tanpa redundansi "Tanpa/Dengan Pembatasan") karena pembatasan sudah di-handle di level entry jurnal
- Perubahan modal per akun = perubahan saldo akun (tidak termasuk laba rugi yang dialokasikan)
- Semua nilai dalam format number

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/laporan-keuangan/jurnal/perubahan-aset-neto', {
  params: {
    tanggalAwal: '2024-01-01',
    tanggalAkhir: '2024-12-31'
  }
});
```

---

### GET `/laporan-keuangan/jurnal/arus-kas`
Generate Laporan Arus Kas dari jurnal.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `tanggalAwal` (required): ISO date string
- `tanggalAkhir` (required): ISO date string

**Response:**
```json
{
  "statusCode": 200,
  "message": "Arus Kas generated successfully",
  "data": {
    "operasional": {
      "masuk": 10000000,
      "keluar": 2500000,
      "netto": 7500000
    },
    "investasi": {
      "masuk": 0,
      "keluar": 0,
      "netto": 0
    },
    "pendanaan": {
      "masuk": 0,
      "keluar": 0,
      "netto": 0
    },
    "saldoAwal": 10000000,
    "saldoAkhir": 17500000
  }
}
```

**Contoh Request (Frontend):**
```javascript
const response = await axiosInstance.get('/laporan-keuangan/jurnal/arus-kas', {
  params: {
    tanggalAwal: '2024-01-01',
    tanggalAkhir: '2024-12-31'
  }
});
```

**Catatan:**
Kategorisasi arus kas menggunakan keyword matching dari `keterangan` jurnal:
- **Operasional**: mengandung "donasi" atau "pendapatan"
- **Investasi**: mengandung "aset" atau "investasi"
- **Pendanaan**: mengandung "modal" atau "ekuitas"
- **Default**: operasional

---

## Error Handling

### Common Error Codes

**400 Bad Request:**
- Missing required fields
- Invalid data format
- Validation errors (e.g., account code already exists)

**401 Unauthorized:**
- Missing or invalid JWT token

**403 Forbidden:**
- User does not belong to any masjid

**404 Not Found:**
- Resource not found (account, jurnal, etc.)

**500 Internal Server Error:**
- Server errors

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Account code already exists for this masjid",
  "error": {
    "error": "Account code already exists for this masjid"
  }
}
```

---

## Contoh Integrasi Frontend

### Setup Axios Instance
```javascript
// axiosInstance.js sudah ada dan sudah di-configure dengan:
// - baseURL: http://localhost:3001/api/v1
// - Authorization header dari localStorage
```

### Contoh: Get All Accounts
```javascript
import axiosInstance from '../api/axiosInstance';

const fetchAccounts = async () => {
  try {
    const response = await axiosInstance.get('/coa');
    return response.data.data; // Array of accounts
  } catch (error) {
    console.error('Error fetching accounts:', error.response?.data);
    throw error;
  }
};
```

### Contoh: Create Jurnal
```javascript
const createJurnal = async (jurnalData) => {
  try {
    const response = await axiosInstance.post('/jurnal', {
      tanggal: jurnalData.tanggal,
      akunId: jurnalData.akunId,
      tipe: jurnalData.tipe,
      jumlah: jurnalData.jumlah,
      keterangan: jurnalData.keterangan,
      referensi: jurnalData.referensi
    });
    return response.data.data;
  } catch (error) {
    console.error('Error creating jurnal:', error.response?.data);
    throw error;
  }
};
```

### Contoh: Generate Neraca
```javascript
const generateNeraca = async (tanggal) => {
  try {
    const response = await axiosInstance.get('/laporan-keuangan/jurnal/posisi-keuangan', {
      params: {
        tanggal: tanggal // Format: '2024-12-31'
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error generating neraca:', error.response?.data);
    throw error;
  }
};
```

### Contoh: Seed Default COA
```javascript
const seedDefaultCOA = async () => {
  try {
    const response = await axiosInstance.post('/coa/seed');
    console.log(`Seeded ${response.data.data.count} accounts`);
    return response.data.data;
  } catch (error) {
    console.error('Error seeding COA:', error.response?.data);
    throw error;
  }
};
```

---

## Data Types

### AccountType Enum
```
ASSET       - Aset
LIABILITY   - Kewajiban
EQUITY      - Ekuitas
REVENUE     - Pendapatan
EXPENSE     - Beban
```

### JurnalTipe Enum
```
DEBIT   - Debit
KREDIT  - Kredit
```

---

## Business Rules

1. **COA Hierarchical Structure:**
   - Parent account harus `isGroup = true`
   - Child account bisa `isGroup = true` atau `false`
   - `pathCode` di-generate otomatis dari parent pathCode + code sendiri

2. **COA Validation:**
   - `code` harus unique per masjid (NULL dianggap sebagai satu group)
   - Tidak bisa delete account yang sudah ada jurnal entries
   - Tidak bisa delete account yang memiliki child accounts

3. **Jurnal Validation:**
   - Account harus aktif (`isActive = true`)
   - Account tidak boleh group account (`isGroup = false`)
   - `jumlah` harus > 0
   - `tipe` harus `DEBIT` atau `KREDIT`

4. **Balance Calculation:**
   - **ASET & BEBAN**: DEBIT menambah saldo (+), KREDIT mengurangi saldo (-)
   - **KEWAJIBAN, EKUITAS, PENDAPATAN**: KREDIT menambah saldo (+), DEBIT mengurangi saldo (-)

5. **MasjidId Handling:**
   - Jika `masjidId` tidak diisi di request, akan menggunakan `masjidId` dari user yang login
   - `masjidId = null` berarti default/global accounts
   - `masjidId = "xxx"` berarti custom accounts untuk masjid tertentu

---

## Migration

Sebelum menggunakan API, jalankan migration untuk membuat tabel di database:

```bash
cd "Goqu BE"
npx prisma migrate dev --name add_account_jurnal
```

Atau jika sudah ada migration file:
```bash
npx prisma migrate deploy
```

Generate Prisma Client:
```bash
npx prisma generate
```

---

## Testing

### Test dengan Postman/Thunder Client

1. **Login dulu untuk mendapatkan token:**
   ```
   POST /api/v1/auth/login
   Body: { "email": "...", "password": "..." }
   ```

2. **Copy token dari response**

3. **Gunakan token di header:**
   ```
   Authorization: Bearer <token>
   ```

4. **Test endpoints sesuai dokumentasi di atas**

---

**Dibuat**: 2024
**Versi**: 1.0.0
**Base URL**: `http://localhost:3001/api/v1`

