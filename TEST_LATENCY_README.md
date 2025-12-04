# Test Latency - COA & Laporan Keuangan

Script untuk mengukur latency/response time dari endpoint COA dan Laporan Keuangan.

## Setup

1. Install dependencies (jika belum):
```bash
npm install
```

2. Setup environment variables di `.env`:
```env
# Base URL API (default: http://localhost:3001/api/v1)
BASE_URL=http://localhost:3001/api/v1

# Authentication - Pilih salah satu:
# Option 1: Login otomatis dengan email & password (RECOMMENDED)
EMAIL=your_email@example.com
PASSWORD=your_password

# Option 2: Atau langsung set JWT token (jika sudah punya)
# JWT_TOKEN=your_jwt_token_here

# Masjid ID untuk testing (optional, akan auto-detect dari user jika tidak di-set)
MASJID_ID=your_masjid_id_here

# Jumlah iterasi per test (default: 10)
ITERATIONS=10
```

## Cara Authentication

### Method 1: Auto-Login dengan Email & Password (RECOMMENDED) ✅

Script akan otomatis login menggunakan email dan password yang di-set di `.env`:

```env
EMAIL=your_email@example.com
PASSWORD=your_password
```

**Keuntungan:**
- Tidak perlu manual copy token
- Token selalu fresh (auto-login setiap kali test)
- Lebih mudah untuk automation

### Method 2: Manual JWT Token

Jika sudah punya JWT token, bisa langsung set:

```env
JWT_TOKEN=your_jwt_token_here
```

**Cara mendapatkan JWT Token:**

1. **Via API Login:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your_email@example.com","password":"your_password"}'
   ```
   Copy `token` dari response.data.token.

2. **Via Frontend:**
   - Login di aplikasi frontend
   - Buka browser DevTools > Application > Local Storage
   - Copy value dari key `accessToken`

3. **Via Database (untuk testing):**
   - Query langsung dari database untuk mendapatkan token yang valid

## Cara Menjalankan

### Test Local/Development

#### Method 1: Menggunakan npm script
```bash
npm run test:latency
```

#### Method 2: Langsung dengan node
```bash
node test-latency.js
```

#### Method 3: Dengan environment variables inline
```bash
# Windows (PowerShell)
$env:JWT_TOKEN="your_token"; $env:MASJID_ID="your_masjid_id"; npm run test:latency

# Windows (CMD)
set JWT_TOKEN=your_token && set MASJID_ID=your_masjid_id && npm run test:latency

# Linux/Mac
JWT_TOKEN=your_token MASJID_ID=your_masjid_id npm run test:latency
```

### Test Production

Untuk test di production, gunakan script terpisah:

#### Setup `.env` untuk Production:
```env
# Production Base URL
PROD_BASE_URL=https://goqu-be.vercel.app/api/v1

# Production Authentication (pilih salah satu)
PROD_EMAIL=your_email@example.com
PROD_PASSWORD=your_password

# Atau langsung set token
# PROD_JWT_TOKEN=your_jwt_token_here

# Production Masjid ID (optional)
PROD_MASJID_ID=your_masjid_id_here
```

#### Jalankan test production:
```bash
npm run test:latency:prod
```

Atau langsung:
```bash
node test-latency-prod.js
```

**Catatan:**
- Script production menggunakan timeout lebih lama (60s) untuk mengakomodasi network latency
- Pastikan credentials production valid dan aman
- Jangan commit credentials ke repository

## Endpoint yang Di-test

1. **Direct Database Connection** - Test koneksi langsung ke database
2. **COA - Get All Accounts** - GET `/coa`
3. **COA - Get Account Tree** - GET `/coa/tree`
4. **COA - Get Account by ID** - GET `/coa/:id`
5. **Laporan - Neraca (Posisi Keuangan)** - GET `/laporan-keuangan/jurnal/posisi-keuangan`
6. **Laporan - Penghasilan Komprehensif** - GET `/laporan-keuangan/jurnal/penghasilan-komprehensif`
7. **Laporan - Perubahan Aset Neto** - GET `/laporan-keuangan/jurnal/perubahan-aset-neto`

## Output

Script akan menampilkan:

1. **Per-request latency** - Waktu response setiap request
2. **Statistics** untuk setiap endpoint:
   - Min: Latency tercepat
   - Max: Latency terlambat
   - Average: Rata-rata latency
   - Median: Latency median
   - P95: 95th percentile
   - P99: 99th percentile
3. **Summary table** - Ringkasan semua endpoint
4. **Performance analysis** - Analisis performa (GOOD/MODERATE/SLOW)

## Benchmark Reference

### Database Connection
- ✅ **< 50ms** - Excellent
- ⚠️ **50-100ms** - Good
- ❌ **> 100ms** - Slow (consider connection pooling)

### COA Endpoints
- ✅ **< 200ms** - Excellent
- ⚠️ **200-500ms** - Good
- ❌ **> 500ms** - Slow (consider caching)

### Laporan Endpoints
- ✅ **< 500ms** - Excellent
- ⚠️ **500ms - 1s** - Good
- ❌ **> 1s** - Slow (consider query optimization)

## Troubleshooting

### Error: JWT_TOKEN not set / Login failed
- **Jika menggunakan EMAIL & PASSWORD:** Pastikan EMAIL dan PASSWORD sudah benar di `.env`
- **Jika menggunakan JWT_TOKEN:** Pastikan JWT_TOKEN sudah di-set dan masih valid (belum expired)
- Check apakah server backend sudah running
- Check BASE_URL sudah benar

### Error: 401 Unauthorized
- Token mungkin sudah expired, generate token baru
- Pastikan format token benar: `Bearer <token>`

### Error: Connection timeout
- Pastikan server backend sudah running
- Check BASE_URL di `.env` sudah benar
- Check firewall/network settings

### Error: Database connection failed
- Pastikan DATABASE_URL di `.env` sudah benar
- Check database server accessible
- Check Prisma client sudah di-generate: `npx prisma generate`

## Tips

1. **Test dengan data real** - Gunakan masjidId yang memiliki data jurnal untuk test yang lebih akurat
2. **Test multiple times** - Jalankan test beberapa kali untuk melihat konsistensi
3. **Compare environments** - Test di development vs production untuk comparison
4. **Monitor during peak hours** - Test saat traffic tinggi untuk melihat performa real-world

## Example Output

```
############################################################
# LATENCY TEST - COA & LAPORAN KEUANGAN
############################################################
Base URL: http://localhost:3001/api/v1
Iterations per test: 10
Timestamp: 2024-01-15T10:30:00.000Z

============================================================
Testing: COA - Get All Accounts
============================================================
URL: GET http://localhost:3001/api/v1/coa
  Run 1: 234.56ms (Status: 200, Size: 45.67 KB)
  Run 2: 198.23ms (Status: 200, Size: 45.67 KB)
  ...

📊 Statistics:
  Success: 10/10
  Min:     156.78ms
  Max:     345.12ms
  Average: 234.56ms
  Median:  221.34ms
  P95:     312.45ms
  P99:     345.12ms

# SUMMARY
############################################################
Endpoint                                          | Avg Latency | Status
--------------------------------------------------|-------------|-------
Direct Database Connection                        | 45.23ms     | ✅
COA - Get All Accounts                            | 234.56ms    | ✅
COA - Get Account Tree                            | 456.78ms    | ✅
Laporan - Neraca (Posisi Keuangan)                | 1234.56ms   | ✅
Laporan - Penghasilan Komprehensif                | 1567.89ms   | ✅

🐌 Slowest: Laporan - Penghasilan Komprehensif (1.57s)
🚀 Fastest: Direct Database Connection (45.23ms)

📈 Performance Analysis:
  ⚠️  Laporan - Penghasilan Komprehensif: 1.57s - SLOW (>1s)
  ⚠️  Laporan - Neraca (Posisi Keuangan): 1.23s - SLOW (>1s)
  ⚠️  COA - Get Account Tree: 456.78ms - MODERATE (>500ms)
  ✅ COA - Get All Accounts: 234.56ms - GOOD (<200ms)
  ✅ Direct Database Connection: 45.23ms - GOOD (<200ms)
```

## Next Steps

Setelah mendapatkan hasil test:

1. **Identifikasi bottleneck** - Endpoint mana yang paling lambat?
2. **Analyze query** - Check query di database, apakah ada yang bisa di-optimize?
3. **Consider caching** - Endpoint mana yang bisa di-cache?
4. **Consider indexing** - Apakah ada index yang missing?
5. **Consider connection pooling** - Apakah connection pooling sudah optimal?
6. **Compare with Supabase** - Test dengan Supabase untuk comparison

