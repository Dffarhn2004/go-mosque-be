# Dokumentasi Perubahan Aset Neto Tahunan

## Ringkas
- Penghasilan komprehensif (laba/rugi) yang diakui sampai 31/12 tahun N membentuk saldo akhir ekuitas tahun N.
- Saldo akhir ekuitas tahun N otomatis menjadi saldo awal ekuitas per 01/01 tahun N+1.
- Endpoint perubahan aset neto kini cukup memakai parameter `tahun` (YYYY); backend menetapkan tanggal awal/akhir otomatis untuk satu tahun kalender.

## Endpoint
- `GET /laporan-keuangan/jurnal/perubahan-aset-neto`
- `GET /laporan-keuangan/public/jurnal/perubahan-aset-neto`
- Query: `tahun` (required, 4 digit, mis. 2024).
- Backend mapping:
  - `tanggalAwal = {tahun}-01-01T00:00:00.000Z`
  - `tanggalAkhir = {tahun}-12-31T23:59:59.999Z`

## Alur Perhitungan (service `generatePerubahanEkuitasFromJurnal`)
1) **Saldo awal ekuitas**: hitung saldo semua akun EQUITY sampai akhir hari sebelum `tanggalAwal` (31/12 tahun N-1). Ini sudah termasuk akumulasi penghasilan komprehensif/OCI tahun sebelumnya.
2) **Laba rugi periode**: hitung laba rugi (termasuk OCI) untuk rentang `tanggalAwal`–`tanggalAkhir`.
3) **Saldo akhir ekuitas**: hitung saldo semua akun EQUITY sampai `tanggalAkhir` (31/12 tahun N).
4) **Perubahan modal**: `saldo akhir - saldo awal - laba rugi`.

## Contoh Request
```bash
curl -H "Authorization: Bearer <token>" \
  "https://<base-url>/laporan-keuangan/jurnal/perubahan-aset-neto?tahun=2024"
```

## Dampak ke Frontend
- Kirim hanya `tahun` di query params; tidak perlu `tanggalAwal`/`tanggalAkhir`.
- Saldo awal laporan tahun N+1 otomatis memakai saldo akhir tahun N (sudah termasuk penghasilan komprehensif tahun N).

