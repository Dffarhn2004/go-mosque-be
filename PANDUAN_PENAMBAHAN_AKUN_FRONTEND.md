# 📋 Panduan Penambahan Akun untuk Frontend

Dokumen ini menjelaskan cara menambahkan akun baru di sistem Goqu, termasuk rules, validasi, dan contoh implementasi.

---

## 🎯 Konsep Penting

### ✅ Yang Bisa Dibuat User
- **Detail Account** (anak paling bawah) - `isGroup = false`
- User **HANYA** bisa menambahkan detail account, **TIDAK BISA** menambahkan parent/group account

### ❌ Yang Tidak Bisa Dibuat User
- **Group Account** (parent) - `isGroup = true`
- Semua group account sudah ada di sistem dan tidak bisa dibuat manual

---

## 🏗️ Struktur Hirarki Akun

```
Level 1: Root Group (❌ Tidak bisa dipilih sebagai parent)
├─ "1" (Aset)
├─ "2" (Hutang)
├─ "3" (Aset Neto)
├─ "4" (Pendapatan)
├─ "5" (Beban)
└─ "6" (Penghasilan Komprehensif Lain)
    │
    ▼
Level 2: Sub Group (❌ Tidak bisa dipilih sebagai parent)
├─ "1.1" (Aset Lancar)
├─ "1.2" (Aset Tidak Lancar)
├─ "4.1" (Penerimaan ZISWAF)
└─ "5.4" (Beban Operasional)
    │
    ▼
Level 3: Sub Sub Group (✅ BISA DIPILIH SEBAGAI PARENT)
├─ "1.1.1" (Kas dan Setara Kas) ← ✅ VALID PARENT
├─ "1.1.3" (Piutang) ← ✅ VALID PARENT
├─ "4.1.1" (Penerimaan Zakat) ← ✅ VALID PARENT
├─ "5.4.1" (Beban Umum) ← ✅ VALID PARENT
└─ "5.4.3" (Beban Pemeliharaan) ← ✅ VALID PARENT
    │
    ▼
Level 4: Detail Account (✅ INI YANG BISA DIBUAT USER)
├─ "111101" (Kas Tunai) ← ✅ BISA DIBUAT
├─ "111102" (Kas Tunai Dengan Pembatasan) ← ✅ BISA DIBUAT
├─ "411101" (Penerimaan Zakat Fitrah) ← ✅ BISA DIBUAT
└─ "541101" (Beban Listrik) ← ✅ BISA DIBUAT
```

---

## ✅ Rules Parent Account yang Valid

Parent account yang **BISA dipilih** harus memenuhi **SEMUA** syarat berikut:

1. ✅ `isGroup = true` (harus group account)
2. ✅ **TIDAK punya children yang `isGroup = true`**
   - Artinya: parent ini adalah group level terakhir
   - Parent ini hanya bisa punya detail account (isGroup = false)

### Contoh Parent yang Valid ✅

- `"1.1.1"` (Kas dan Setara Kas) → bisa punya detail: `"111101"`, `"111102"`, dll
- `"1.1.3"` (Piutang) → bisa punya detail: `"113101"`, `"113102"`, dll
- `"4.1.1"` (Penerimaan Zakat) → bisa punya detail: `"411101"`, `"411102"`, dll
- `"5.4.1"` (Beban Umum) → bisa punya detail: `"541101"`, `"541102"`, dll
- `"3.1.2"` (Aset Neto Tahun Berjalan) → bisa punya detail: `"312101"`, `"312102"`, dll

### Contoh Parent yang Tidak Valid ❌

- `"1"` (Aset) → punya group children: `"1.1"`, `"1.2"`
- `"1.1"` (Aset Lancar) → punya group children: `"1.1.1"`, `"1.1.3"`, dll
- `"4.1"` (Penerimaan ZISWAF) → punya group children: `"4.1.1"`, `"4.1.2"`, dll
- `"111101"` (Kas Tunai) → bukan group account (`isGroup = false`)

---

## 🔧 Endpoint yang Tersedia

### 1. GET `/coa/valid-parents` ⭐ **RECOMMENDED**

Mendapatkan daftar parent account yang valid (bisa dipilih sebagai parent).

**Query Parameters:**
- `masjidId` (optional) - Jika tidak diisi, akan menggunakan masjidId dari user yang login

**Response:**
```json
{
  "statusCode": 200,
  "message": "Valid parents fetched successfully",
  "data": [
    {
      "id": "cmb6vlo570001vgzgsq1p0c42",
      "code": "1.1.1",
      "name": "Kas dan Setara Kas",
      "type": "ASSET",
      "isGroup": true,
      "pathCode": "1.1.1",
      ...
    },
    {
      "id": "cmb6vlo570001vgzgsq1p0c43",
      "code": "4.1.1",
      "name": "Penerimaan Zakat",
      "type": "REVENUE",
      "isGroup": true,
      "pathCode": "4.1.1",
      ...
    }
  ]
}
```

**Contoh Penggunaan:**
```javascript
// Fetch valid parents untuk dropdown
const response = await axiosInstance.get('/coa/valid-parents');
const validParents = response.data.data;

// Tampilkan di dropdown
<Select>
  {validParents.map(parent => (
    <Option key={parent.id} value={parent.id}>
      {parent.code} - {parent.name}
    </Option>
  ))}
</Select>
```

---

### 2. GET `/coa/next-code?parentId=xxx`

Mendapatkan kode akun berikutnya untuk parent tertentu (preview sebelum create).

**Query Parameters:**
- `parentId` (required) - ID dari parent account

**Response:**
```json
{
  "statusCode": 200,
  "message": "Next code generated successfully",
  "data": {
    "code": "111103"
  }
}
```

**Contoh Penggunaan:**
```javascript
// Preview kode akun sebelum create
const response = await axiosInstance.get('/coa/next-code', {
  params: { parentId: selectedParentId }
});
const nextCode = response.data.data.code;
console.log(`Kode akun berikutnya: ${nextCode}`);
```

---

### 3. POST `/coa`

Membuat akun baru.

**Request Body:**
```json
{
  "parentId": "cmb6vlo570001vgzgsq1p0c42",  // REQUIRED - ID dari valid parent
  "name": "Kas Kecil",                      // REQUIRED
  "type": "ASSET",                          // REQUIRED - ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  "code": "",                               // OPTIONAL - kosong = auto-generate
  "restriction": "TANPA_PEMBATASAN",        // OPTIONAL - TANPA_PEMBATASAN | DENGAN_PEMBATASAN
  "report": "NERACA",                       // OPTIONAL - NERACA | LAPORAN_PENGHASILAN_KOMPREHENSIF
  "category": "ASET_LANCAR"                 // OPTIONAL - lihat enum di bawah
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Account created successfully",
  "data": {
    "id": "new-account-id",
    "code": "111103",
    "name": "Kas Kecil",
    "type": "ASSET",
    "isGroup": false,
    "parentId": "cmb6vlo570001vgzgsq1p0c42",
    ...
  }
}
```

---

## 📝 Field yang Diperlukan

### ✅ REQUIRED Fields

| Field | Type | Description | Contoh |
|-------|------|-------------|--------|
| `parentId` | string | ID dari valid parent account | `"cmb6vlo570001vgzgsq1p0c42"` |
| `name` | string | Nama akun | `"Kas Kecil"`, `"Beban Listrik"` |
| `type` | enum | Tipe akun | `"ASSET"`, `"REVENUE"`, `"EXPENSE"` |

### ⚙️ OPTIONAL Fields (tapi DISARANKAN)

| Field | Type | Description | Valid Values |
|-------|------|-------------|--------------|
| `code` | string | Kode akun | Kosong = auto-generate, atau kode manual (harus unik) |
| `restriction` | enum | Pembatasan sumber daya | `"TANPA_PEMBATASAN"`, `"DENGAN_PEMBATASAN"` |
| `report` | enum | Laporan keuangan | `"NERACA"`, `"LAPORAN_PENGHASILAN_KOMPREHENSIF"` |
| `category` | enum | Kategori akun | Lihat tabel di bawah |

### 🔄 AUTO-SET Fields (tidak perlu diisi)

| Field | Value | Description |
|-------|-------|-------------|
| `isGroup` | `false` | Selalu false untuk account baru |
| `normalBalance` | Auto dari `type` | DEBIT untuk ASSET/EXPENSE, KREDIT untuk lainnya |
| `isActive` | `true` | Selalu true saat create |

---

## 📊 Enum Values

### Account Type (`type`)

| Value | Normal Balance | Description |
|-------|----------------|-------------|
| `ASSET` | DEBIT | Aset |
| `LIABILITY` | KREDIT | Hutang/Kewajiban |
| `EQUITY` | KREDIT | Aset Neto/Ekuitas |
| `REVENUE` | KREDIT | Pendapatan |
| `EXPENSE` | DEBIT | Beban |

### Restriction (`restriction`)

| Value | Description |
|-------|-------------|
| `TANPA_PEMBATASAN` | Akun tanpa pembatasan dari pemberi sumber daya |
| `DENGAN_PEMBATASAN` | Akun dengan pembatasan dari pemberi sumber daya |

### Report (`report`)

| Value | Description |
|-------|-------------|
| `NERACA` | Akun muncul di Laporan Posisi Keuangan (Neraca) |
| `LAPORAN_PENGHASILAN_KOMPREHENSIF` | Akun muncul di Laporan Penghasilan Komprehensif (Laba Rugi) |

### Category (`category`)

| Value | Description |
|-------|-------------|
| `ASET_LANCAR` | Aset Lancar |
| `ASET_TIDAK_LANCAR` | Aset Tidak Lancar |
| `HUTANG_JANGKA_PENDEK` | Hutang Jangka Pendek |
| `HUTANG_JANGKA_PANJANG` | Hutang Jangka Panjang |
| `ASET_NETO` | Aset Neto/Ekuitas |
| `PENDAPATAN` | Pendapatan |
| `BEBAN` | Beban |
| `PENGHASILAN_KOMPREHENSIF_LAIN` | Penghasilan Komprehensif Lain (OCI) |

---

## 💡 Contoh Implementasi Frontend

### Contoh 1: Form Tambah Akun dengan Valid Parents

```javascript
import { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axios';

function TambahAkunForm() {
  const [validParents, setValidParents] = useState([]);
  const [formData, setFormData] = useState({
    parentId: '',
    name: '',
    type: 'ASSET',
    code: '',
    restriction: 'TANPA_PEMBATASAN',
    report: 'NERACA',
    category: 'ASET_LANCAR'
  });
  const [nextCode, setNextCode] = useState('');

  // Fetch valid parents saat component mount
  useEffect(() => {
    fetchValidParents();
  }, []);

  // Fetch next code saat parentId berubah
  useEffect(() => {
    if (formData.parentId) {
      fetchNextCode(formData.parentId);
    }
  }, [formData.parentId]);

  const fetchValidParents = async () => {
    try {
      const response = await axiosInstance.get('/coa/valid-parents');
      setValidParents(response.data.data);
    } catch (error) {
      console.error('Error fetching valid parents:', error);
    }
  };

  const fetchNextCode = async (parentId) => {
    try {
      const response = await axiosInstance.get('/coa/next-code', {
        params: { parentId }
      });
      setNextCode(response.data.data.code);
      // Auto-fill code jika kosong
      if (!formData.code) {
        setFormData(prev => ({ ...prev, code: response.data.data.code }));
      }
    } catch (error) {
      console.error('Error fetching next code:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/coa', formData);
      console.log('Account created:', response.data.data);
      // Reset form atau redirect
    } catch (error) {
      console.error('Error creating account:', error);
      alert(error.response?.data?.message || 'Gagal membuat akun');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Parent Account Dropdown */}
      <div>
        <label>Parent Account *</label>
        <select
          value={formData.parentId}
          onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
          required
        >
          <option value="">Pilih Parent Account</option>
          {validParents.map(parent => (
            <option key={parent.id} value={parent.id}>
              {parent.code} - {parent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kode Akun (Auto-generate) */}
      <div>
        <label>Kode Akun</label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
          placeholder={nextCode || "Akan di-generate otomatis"}
        />
        <small>Kode akun akan di-generate otomatis setelah memilih parent account</small>
      </div>

      {/* Nama Akun */}
      <div>
        <label>Nama Akun *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Contoh: Kas Kecil"
          required
        />
      </div>

      {/* Tipe Akun */}
      <div>
        <label>Tipe Akun *</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          required
        >
          <option value="ASSET">ASSET</option>
          <option value="LIABILITY">LIABILITY</option>
          <option value="EQUITY">EQUITY</option>
          <option value="REVENUE">REVENUE</option>
          <option value="EXPENSE">EXPENSE</option>
        </select>
      </div>

      {/* Restriction */}
      <div>
        <label>Restriction</label>
        <select
          value={formData.restriction}
          onChange={(e) => setFormData(prev => ({ ...prev, restriction: e.target.value }))}
        >
          <option value="TANPA_PEMBATASAN">Tanpa Pembatasan</option>
          <option value="DENGAN_PEMBATASAN">Dengan Pembatasan</option>
        </select>
      </div>

      {/* Report */}
      <div>
        <label>Report</label>
        <select
          value={formData.report}
          onChange={(e) => setFormData(prev => ({ ...prev, report: e.target.value }))}
        >
          <option value="NERACA">Neraca</option>
          <option value="LAPORAN_PENGHASILAN_KOMPREHENSIF">Laporan Penghasilan Komprehensif</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label>Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
        >
          <option value="ASET_LANCAR">Aset Lancar</option>
          <option value="ASET_TIDAK_LANCAR">Aset Tidak Lancar</option>
          <option value="HUTANG_JANGKA_PENDEK">Hutang Jangka Pendek</option>
          <option value="HUTANG_JANGKA_PANJANG">Hutang Jangka Panjang</option>
          <option value="ASET_NETO">Aset Neto</option>
          <option value="PENDAPATAN">Pendapatan</option>
          <option value="BEBAN">Beban</option>
          <option value="PENGHASILAN_KOMPREHENSIF_LAIN">Penghasilan Komprehensif Lain</option>
        </select>
      </div>

      <button type="submit">Simpan</button>
    </form>
  );
}
```

---

## ⚠️ Error yang Sering Terjadi

### 1. ❌ "Parent must be a group account"

**Penyebab:** Parent yang dipilih bukan group account (`isGroup = false`)

**Solusi:** 
- Gunakan endpoint `/coa/valid-parents` untuk mendapatkan daftar parent yang valid
- Atau filter manual: hanya tampilkan account dengan `isGroup = true` yang tidak punya group children

---

### 2. ❌ "Parent account not found"

**Penyebab:** `parentId` tidak valid atau tidak ada di database

**Solusi:** 
- Pastikan `parentId` dari daftar valid parents
- Refresh daftar valid parents sebelum submit

---

### 3. ❌ "Account with code XXX already exists"

**Penyebab:** Kode akun sudah digunakan untuk masjidId ini

**Solusi:** 
- Gunakan auto-generate (kosongkan field `code`)
- Atau pilih kode lain yang belum digunakan

---

### 4. ❌ "Invalid restriction/report/category value"

**Penyebab:** Nilai enum tidak sesuai dengan yang diizinkan

**Solusi:** 
- Gunakan dropdown dengan nilai enum yang valid (lihat tabel enum di atas)
- Jangan biarkan user input manual untuk field enum

---

## 📋 Checklist Implementasi

- [ ] Fetch valid parents menggunakan `/coa/valid-parents`
- [ ] Tampilkan valid parents di dropdown (hanya group account level terakhir)
- [ ] Fetch next code saat parent dipilih (optional, untuk preview)
- [ ] Validasi form: parentId, name, type wajib diisi
- [ ] Auto-generate code jika kosong
- [ ] Handle error dengan pesan yang jelas
- [ ] Tampilkan loading state saat fetch data
- [ ] Reset form setelah create berhasil

---

## 🔗 Referensi

- **Endpoint Base URL:** `/coa`
- **Authentication:** Required (kecuali `/coa/public`)
- **Response Format:** Semua endpoint mengembalikan format standar:
  ```json
  {
    "statusCode": 200,
    "message": "Success message",
    "data": { ... }
  }
  ```

---

## 📞 Support

Jika ada pertanyaan atau masalah, silakan hubungi tim backend atau buat issue di repository.

---

**Last Updated:** 2024
**Version:** 1.0

