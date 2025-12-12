# Panduan Penambahan COA Kustom Masjid

## Endpoint (assumsi sudah ada create account)
- `POST /accounts` (atau endpoint create account yang sudah tersedia)
- Body minimum:
  - `name` (string)
  - `parentId` (harus akun grup)
  - `type` (opsional bila ingin auto dari UI; backend tetap butuh)
  - `restriction` (`TANPA_PEMBATASAN` / `DENGAN_PEMBATASAN`) — wajib untuk detail
  - `report` (`NERACA` / `LAPORAN_PENGHASILAN_KOMPREHENSIF`) — wajib untuk detail
  - `category` (lihat enum BEBAN/PENDAPATAN/ASET_NETO/ASET_LANCAR/... ) — wajib untuk detail
  - `code` (opsional; jika kosong akan di-auto)

## Auto Code di Backend
- Jika `code` tidak dikirim/ kosong, backend memanggil `getNextAccountCode(parentId, masjidId)`:
  - Prefix = `parent.code` tanpa titik.
  - Cari sibling detail di parent yang sama (default + kustom masjid), ambil kode numeric tanpa titik.
  - Jika ada sibling: ambil max, +1, zero-pad panjang sibling terpanjang (min 6 digit).
  - Jika tidak ada sibling: start dari `prefix + "01"`, lalu zero-pad minimal 6 digit.
  - Contoh:
    - parent `3.1.1`, siblings `311101`, `311102` → next `311103`
    - parent `4.4` tanpa sibling → prefix `44` → start `440101` (6 digit)

## Aturan Validasi
- `parentId` wajib dan harus `isGroup = true`.
- `code` unik per masjid (`code_masjidId`).
- `normalBalance` otomatis mengikuti `type` (ASSET/EXPENSE → DEBIT; lainnya → KREDIT).
- `isGroup` dipaksa `false` untuk akun baru via endpoint ini (hanya detail yang bisa ditambahkan).
- `restriction`, `report`, `category` wajib untuk detail (bukan group).
- `type` harus konsisten dengan category/report; gunakan mapping di backend bila mau auto di UI.

## Rekomendasi UX Frontend
1) User pilih parent — batasi daftar parent agar tidak terlalu lebar:
   - Hanya akun grup yang aktif.
   - Prioritaskan level grup bawah (mis. level 3 seperti `1.1.1`, `3.1.1`, `4.1.1`, dst) supaya penambahan detail tepat sasaran, bukan ke level paling atas seperti `1` (Aset) atau `3` (Aset Neto).
   - Filter parent berdasarkan tipe yang relevan dengan kategori yang akan dipilih (contoh: jika category = BEBAN, tampilkan parent di klaster 5.x.x).
2) UI panggil endpoint “get next code” (opsional) atau biarkan kosong → backend auto.
3) Isi nama + restriction + report + category. Tipe dapat dipilih otomatis berdasar category.
4) Submit; tampilkan error bila kode duplikat/parent bukan grup.

## Catatan Struktur Kode
- Template default memakai campuran kode bertitik untuk grup dan 6 digit untuk detail.
- Auto-code mengikuti gaya numeric tanpa titik untuk detail baru, dengan prefix parent tanpa titik.

