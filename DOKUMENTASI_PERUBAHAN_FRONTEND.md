# Dokumentasi Perubahan Backend untuk Frontend

## Ringkasan Perubahan

Backend telah diupdate untuk mengimplementasikan **COA FINAL** dengan struktur hierarkis yang lengkap. Perubahan utama meliputi:

1. **Field baru di Account**: `normalBalance`, `restriction`, `report`, `category`
2. **Struktur COA**: Hierarkis dengan parent accounts dan detail accounts (leaf) dari FINALAKUN.md
3. **Jurnal Entry**: Integrasi dengan `Account.restriction`
4. **Laporan Keuangan**: Menggunakan field baru untuk grouping dan filtering

---

## 1. Perubahan Schema Account (COA)

### Field Baru yang Ditambahkan

Semua endpoint COA sekarang mengembalikan field tambahan berikut:

| Field | Type | Nullable | Deskripsi |
|-------|------|----------|-----------|
| `normalBalance` | `"DEBIT" \| "KREDIT"` | ❌ Required | Posisi normal akun (Debit atau Kredit) |
| `restriction` | `"TANPA_PEMBATASAN" \| "DENGAN_PEMBATASAN"` | ✅ Nullable | Pembatasan sumber daya (hanya untuk detail accounts) |
| `report` | `"NERACA" \| "LAPORAN_PENGHASILAN_KOMPREHENSIF"` | ✅ Nullable | Jenis laporan keuangan (hanya untuk detail accounts) |
| `category` | Enum (lihat di bawah) | ✅ Nullable | Kategori akun untuk grouping di laporan (hanya untuk detail accounts) |

### Enum Values

#### `AccountRestriction`
- `TANPA_PEMBATASAN` - Sumber daya tanpa pembatasan
- `DENGAN_PEMBATASAN` - Sumber daya dengan pembatasan

#### `AccountReport`
- `NERACA` - Akun muncul di Neraca (Balance Sheet)
- `LAPORAN_PENGHASILAN_KOMPREHENSIF` - Akun muncul di Laporan Penghasilan Komprehensif

#### `AccountCategory`
- `ASET_LANCAR` - Aset Lancar
- `ASET_TIDAK_LANCAR` - Aset Tidak Lancar
- `HUTANG_JANGKA_PENDEK` - Hutang Jangka Pendek
- `HUTANG_JANGKA_PANJANG` - Hutang Jangka Panjang
- `ASET_NETO` - Aset Neto
- `PENDAPATAN` - Pendapatan
- `BEBAN` - Beban
- `PENGHASILAN_KOMPREHENSIF_LAIN` - Penghasilan Komprehensif Lain

### Catatan Penting

- **Group Accounts** (`isGroup: true`): Field `restriction`, `report`, dan `category` akan bernilai `null`
- **Detail Accounts** (`isGroup: false`): Field `restriction`, `report`, dan `category` akan terisi sesuai FINALAKUN.md
- **Normal Balance**: Selalu ada untuk semua accounts (group maupun detail)

---

## 2. Response API yang Diupdate

### GET `/coa` - Response Example

```json
{
  "statusCode": 200,
  "message": "Accounts fetched successfully",
  "data": [
    {
      "id": "coa_123",
      "code": "1",
      "name": "Aset",
      "type": "ASSET",
      "normalBalance": "DEBIT",
      "isGroup": true,
      "restriction": null,
      "report": null,
      "category": null,
      "pathCode": "1",
      "parentId": null,
      "masjidId": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "coa_124",
      "code": "111101",
      "name": "Kas Tunai",
      "type": "ASSET",
      "normalBalance": "DEBIT",
      "isGroup": false,
      "restriction": "TANPA_PEMBATASAN",
      "report": "NERACA",
      "category": "ASET_LANCAR",
      "pathCode": "1.1.1.111101",
      "parentId": "coa_parent_1_1_1",
      "masjidId": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "coa_125",
      "code": "111102",
      "name": "Kas Tunai Dengan Pembatasan",
      "type": "ASSET",
      "normalBalance": "DEBIT",
      "isGroup": false,
      "restriction": "DENGAN_PEMBATASAN",
      "report": "NERACA",
      "category": "ASET_LANCAR",
      "pathCode": "1.1.1.111102",
      "parentId": "coa_parent_1_1_1",
      "masjidId": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET `/coa/tree` - Response Example

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
      "normalBalance": "DEBIT",
      "isGroup": true,
      "restriction": null,
      "report": null,
      "category": null,
      "pathCode": "1",
      "children": [
        {
          "id": "coa_1_1",
          "code": "1.1",
          "name": "Aset Lancar",
          "type": "ASSET",
          "normalBalance": "DEBIT",
          "isGroup": true,
          "restriction": null,
          "report": null,
          "category": null,
          "pathCode": "1.1",
          "children": [
            {
              "id": "coa_1_1_1",
              "code": "1.1.1",
              "name": "Kas dan Setara Kas",
              "type": "ASSET",
              "normalBalance": "DEBIT",
              "isGroup": true,
              "restriction": null,
              "report": null,
              "category": null,
              "pathCode": "1.1.1",
              "children": [
                {
                  "id": "coa_111101",
                  "code": "111101",
                  "name": "Kas Tunai",
                  "type": "ASSET",
                  "normalBalance": "DEBIT",
                  "isGroup": false,
                  "restriction": "TANPA_PEMBATASAN",
                  "report": "NERACA",
                  "category": "ASET_LANCAR",
                  "pathCode": "1.1.1.111101",
                  "children": []
                },
                {
                  "id": "coa_111102",
                  "code": "111102",
                  "name": "Kas Tunai Dengan Pembatasan",
                  "type": "ASSET",
                  "normalBalance": "DEBIT",
                  "isGroup": false,
                  "restriction": "DENGAN_PEMBATASAN",
                  "report": "NERACA",
                  "category": "ASET_LANCAR",
                  "pathCode": "1.1.1.111102",
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

### GET `/coa/:id` - Response Example

```json
{
  "statusCode": 200,
  "message": "Account fetched successfully",
  "data": {
    "id": "coa_111101",
    "code": "111101",
    "name": "Kas Tunai",
    "type": "ASSET",
    "normalBalance": "DEBIT",
    "isGroup": false,
    "restriction": "TANPA_PEMBATASAN",
    "report": "NERACA",
    "category": "ASET_LANCAR",
    "pathCode": "1.1.1.111101",
    "parentId": "coa_parent_1_1_1",
    "parent": {
      "id": "coa_parent_1_1_1",
      "code": "1.1.1",
      "name": "Kas dan Setara Kas",
      "pathCode": "1.1.1"
    },
    "children": [],
    "masjidId": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 3. Perubahan Request Body untuk Create/Update Account

### POST `/coa` - Request Body (Updated)

Field baru yang **optional** untuk detail accounts:

```json
{
  "code": "111101",
  "name": "Kas Tunai",
  "parentId": "coa_parent_id",
  "type": "ASSET",
  "isGroup": false,
  "normalBalance": "DEBIT",  // Optional: akan auto-determined dari type jika tidak diisi
  "restriction": "TANPA_PEMBATASAN",  // Optional: hanya untuk detail accounts
  "report": "NERACA",  // Optional: hanya untuk detail accounts
  "category": "ASET_LANCAR"  // Optional: hanya untuk detail accounts
}
```

### PUT `/coa/:id` - Request Body (Updated)

Field yang bisa diupdate:

```json
{
  "name": "Kas Tunai (Updated)",
  "normalBalance": "DEBIT",
  "restriction": "TANPA_PEMBATASAN",
  "report": "NERACA",
  "category": "ASET_LANCAR",
  "isActive": true
}
```

**Catatan:**
- Untuk **group accounts** (`isGroup: true`): `restriction`, `report`, `category` harus `null` atau tidak diisi
- Untuk **detail accounts** (`isGroup: false`): `restriction`, `report`, `category` bisa diisi sesuai kebutuhan

---

## 4. Perubahan Struktur COA

### Hierarki COA

COA sekarang memiliki struktur hierarkis dengan:

1. **Parent Accounts (Group)**: 
   - Kode hierarkis: `"1"`, `"1.1"`, `"1.1.1"`, dll.
   - `isGroup: true`
   - `restriction`, `report`, `category`: `null`

2. **Detail Accounts (Leaf)**:
   - Kode 6 digit dari FINALAKUN.md: `"111101"`, `"111102"`, dll.
   - `isGroup: false`
   - `restriction`, `report`, `category`: Terisi sesuai FINALAKUN.md

### Contoh Struktur

```
1 - Aset (Group)
├── 1.1 - Aset Lancar (Group)
│   ├── 1.1.1 - Kas dan Setara Kas (Group)
│   │   ├── 111101 - Kas Tunai (Detail, TANPA_PEMBATASAN, NERACA, ASET_LANCAR)
│   │   └── 111102 - Kas Tunai Dengan Pembatasan (Detail, DENGAN_PEMBATASAN, NERACA, ASET_LANCAR)
│   └── 1.1.2 - Investasi Jangka Pendek (Group)
│       └── 112101 - Investasi Jangka Pendek (Detail, ...)
```

---

## 5. Perubahan Jurnal Entry

### JurnalEntry.hasRestriction

Field `hasRestriction` di `JurnalEntry` sekarang **default** mengikuti `Account.restriction`:

- Jika `Account.restriction === "DENGAN_PEMBATASAN"`, maka `JurnalEntry.hasRestriction` default `true`
- Jika `Account.restriction === "TANPA_PEMBATASAN"` atau `null`, maka `JurnalEntry.hasRestriction` default `false`

### GET `/jurnal` - Response Example (Updated)

Response sekarang include field baru dari Account:

```json
{
  "statusCode": 200,
  "message": "Jurnals fetched successfully",
  "data": [
    {
      "id": "jurnal_123",
      "tanggal": "2024-01-15T00:00:00.000Z",
      "keterangan": "Penerimaan Zakat",
      "entries": [
        {
          "id": "entry_1",
          "akunId": "coa_111101",
          "akun": {
            "id": "coa_111101",
            "code": "111101",
            "name": "Kas Tunai",
            "type": "ASSET",
            "normalBalance": "DEBIT",
            "restriction": "TANPA_PEMBATASAN",
            "report": "NERACA",
            "category": "ASET_LANCAR"
          },
          "tipe": "DEBIT",
          "jumlah": 1000000,
          "hasRestriction": false  // Default dari Account.restriction
        }
      ]
    }
  ]
}
```

---

## 6. Perubahan Laporan Keuangan

### GET `/laporan-keuangan/neraca`

Response sekarang menggunakan `Account.category` untuk grouping dan `Account.restriction` untuk memisahkan saldo:

```json
{
  "statusCode": 200,
  "message": "Neraca generated successfully",
  "data": {
    "asetLancar": [
      {
        "id": "coa_111101",
        "kodeAkun": "111101",
        "namaAkun": "Kas Tunai",
        "category": "ASET_LANCAR",  // NEW
        "restriction": "TANPA_PEMBATASAN",  // NEW
        "tanpaPembatasan": 50000000,
        "denganPembatasan": 0,
        "saldo": 50000000
      },
      {
        "id": "coa_111102",
        "kodeAkun": "111102",
        "namaAkun": "Kas Tunai Dengan Pembatasan",
        "category": "ASET_LANCAR",  // NEW
        "restriction": "DENGAN_PEMBATASAN",  // NEW
        "tanpaPembatasan": 0,
        "denganPembatasan": 30000000,
        "saldo": 30000000
      }
    ],
    "asetTidakLancar": [ ... ],
    "hutangJangkaPendek": [ ... ],
    "hutangJangkaPanjang": [ ... ],
    "asetNeto": [ ... ]
  }
}
```

### GET `/laporan-keuangan/laba-rugi`

Response sekarang menggunakan `Account.category` untuk grouping:

```json
{
  "statusCode": 200,
  "message": "Laporan Penghasilan Komprehensif generated successfully",
  "data": {
    "pendapatan": {
      "Penerimaan ZISWAF": [  // Grouped by category
        {
          "id": "coa_411101",
          "kodeAkun": "411101",
          "namaAkun": "Penerimaan Zakat",
          "category": "PENDAPATAN",  // NEW
          "restriction": "TANPA_PEMBATASAN",  // NEW
          "tanpaPembatasan": 50000000,
          "denganPembatasan": 10000000,
          "saldo": 60000000
        }
      ]
    },
    "beban": {
      "Penyaluran ZISWAF": [  // Grouped by category
        {
          "id": "coa_511101",
          "kodeAkun": "511101",
          "namaAkun": "Penyaluran Zakat - Fakir",
          "category": "BEBAN",  // NEW
          "restriction": "TANPA_PEMBATASAN",  // NEW
          "tanpaPembatasan": 20000000,
          "denganPembatasan": 0,
          "saldo": 20000000
        }
      ]
    }
  }
}
```

---

## 7. Action Items untuk Frontend

### ✅ 1. Update TypeScript/JavaScript Types/Interfaces

Tambahkan field baru ke interface/type Account:

```typescript
interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "KREDIT";  // NEW
  isGroup: boolean;
  restriction: "TANPA_PEMBATASAN" | "DENGAN_PEMBATASAN" | null;  // NEW
  report: "NERACA" | "LAPORAN_PENGHASILAN_KOMPREHENSIF" | null;  // NEW
  category: AccountCategory | null;  // NEW
  pathCode: string;
  parentId: string | null;
  masjidId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Account;
  children?: Account[];
}

type AccountCategory =
  | "ASET_LANCAR"
  | "ASET_TIDAK_LANCAR"
  | "HUTANG_JANGKA_PENDEK"
  | "HUTANG_JANGKA_PANJANG"
  | "ASET_NETO"
  | "PENDAPATAN"
  | "BEBAN"
  | "PENGHASILAN_KOMPREHENSIF_LAIN";
```

### ✅ 2. Update Form Create/Edit Account

**Form untuk Detail Account** (`isGroup: false`):

- Tambahkan field `normalBalance` (dropdown: DEBIT/KREDIT)
- Tambahkan field `restriction` (dropdown: TANPA_PEMBATASAN/DENGAN_PEMBATASAN/null)
- Tambahkan field `report` (dropdown: NERACA/LAPORAN_PENGHASILAN_KOMPREHENSIF/null)
- Tambahkan field `category` (dropdown dengan semua kategori)

**Form untuk Group Account** (`isGroup: true`):

- Field `restriction`, `report`, `category` harus disabled atau hidden (karena harus `null`)

### ✅ 3. Update Tampilan COA Tree

- Tampilkan kode 6 digit untuk detail accounts (misal: `111101 - Kas Tunai`)
- Tampilkan kode hierarkis untuk group accounts (misal: `1.1.1 - Kas dan Setara Kas`)
- Tampilkan badge/icon untuk `restriction` (jika ada)
- Tampilkan badge untuk `report` dan `category` (jika ada)

### ✅ 4. Update Filter/Search COA

Tambahkan filter berdasarkan:
- `restriction` (TANPA_PEMBATASAN / DENGAN_PEMBATASAN)
- `report` (NERACA / LAPORAN_PENGHASILAN_KOMPREHENSIF)
- `category` (semua kategori)
- `normalBalance` (DEBIT / KREDIT)

### ✅ 5. Update Form Jurnal Entry

- Saat memilih akun, **auto-fill** `hasRestriction` berdasarkan `Account.restriction`
- Tampilkan informasi `restriction` dari akun yang dipilih
- Validasi: Jika akun dengan `restriction: "DENGAN_PEMBATASAN"`, pastikan user aware

### ✅ 6. Update Tampilan Laporan Keuangan

**Neraca:**
- Grouping berdasarkan `category` (sudah ada di response)
- Tampilkan kolom "Tanpa Pembatasan" dan "Dengan Pembatasan" berdasarkan `restriction`
- Tampilkan total per kategori

**Laporan Penghasilan Komprehensif:**
- Grouping berdasarkan `category` (sudah ada di response)
- Tampilkan kolom "Tanpa Pembatasan" dan "Dengan Pembatasan"
- Tampilkan total per kategori

### ✅ 7. Update Helper Functions

Buat helper functions untuk:

```typescript
// Get display name untuk restriction
function getRestrictionLabel(restriction: string | null): string {
  switch (restriction) {
    case "TANPA_PEMBATASAN":
      return "Tanpa Pembatasan";
    case "DENGAN_PEMBATASAN":
      return "Dengan Pembatasan";
    default:
      return "-";
  }
}

// Get display name untuk report
function getReportLabel(report: string | null): string {
  switch (report) {
    case "NERACA":
      return "Neraca";
    case "LAPORAN_PENGHASILAN_KOMPREHENSIF":
      return "Laporan Penghasilan Komprehensif";
    default:
      return "-";
  }
}

// Get display name untuk category
function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    ASET_LANCAR: "Aset Lancar",
    ASET_TIDAK_LANCAR: "Aset Tidak Lancar",
    HUTANG_JANGKA_PENDEK: "Hutang Jangka Pendek",
    HUTANG_JANGKA_PANJANG: "Hutang Jangka Panjang",
    ASET_NETO: "Aset Neto",
    PENDAPATAN: "Pendapatan",
    BEBAN: "Beban",
    PENGHASILAN_KOMPREHENSIF_LAIN: "Penghasilan Komprehensif Lain",
  };
  return category ? labels[category] || category : "-";
}

// Get display name untuk normalBalance
function getNormalBalanceLabel(normalBalance: string): string {
  return normalBalance === "DEBIT" ? "Debit" : "Kredit";
}
```

### ✅ 8. Update Validation

- Validasi saat create/update account: Jika `isGroup: false`, pastikan `restriction`, `report`, `category` terisi
- Validasi saat create/update account: Jika `isGroup: true`, pastikan `restriction`, `report`, `category` adalah `null`

### ✅ 9. Update Seed/Initialization

- Pastikan saat seed COA, frontend tidak perlu melakukan seed manual (sudah di-handle backend)
- Jika ada custom COA yang dibuat user, pastikan field baru terisi dengan benar

### ✅ 10. Update Documentation/User Guide

- Update dokumentasi user tentang field baru di COA
- Jelaskan perbedaan antara group account dan detail account
- Jelaskan konsep pembatasan sumber daya

---

## 8. Breaking Changes

### ⚠️ Perhatian: Breaking Changes

1. **Response Account**: Semua response Account sekarang **selalu** include field `normalBalance`, `restriction`, `report`, `category` (bisa `null`)
2. **Jurnal Entry**: Field `hasRestriction` sekarang default mengikuti `Account.restriction`
3. **Laporan Keuangan**: Response sekarang include field `category` dan `restriction` di setiap item

**Migration Steps:**
1. Update semua interface/type Account di frontend
2. Update semua component yang menggunakan Account data
3. Update form create/edit account
4. Update tampilan laporan keuangan
5. Test semua fitur yang menggunakan COA

---

## 9. Testing Checklist

- [ ] GET `/coa` - Response include field baru
- [ ] GET `/coa/tree` - Tree structure dengan field baru
- [ ] GET `/coa/:id` - Detail account dengan field baru
- [ ] POST `/coa` - Create account dengan field baru
- [ ] PUT `/coa/:id` - Update account dengan field baru
- [ ] GET `/jurnal` - Response include field baru dari Account
- [ ] POST `/jurnal` - Create jurnal dengan auto-fill `hasRestriction`
- [ ] GET `/laporan-keuangan/neraca` - Response dengan grouping berdasarkan category
- [ ] GET `/laporan-keuangan/laba-rugi` - Response dengan grouping berdasarkan category
- [ ] Filter COA berdasarkan `restriction`, `report`, `category`
- [ ] Tampilan COA tree dengan kode 6 digit untuk detail accounts

---

## 10. Support & Questions

Jika ada pertanyaan atau issue terkait perubahan ini, silakan hubungi tim backend atau buat issue di repository.

**Last Updated**: 2024-01-15
**Version**: 2.0.0

