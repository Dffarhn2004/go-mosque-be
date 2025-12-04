# Vercel Optimization Guide - Mengurangi Cold Start

## 🔍 Masalah yang Ditemukan

Berdasarkan test latency, production mengalami cold start yang signifikan:
- **Login**: 3.19s (vs local 449ms) - **7x lebih lambat**
- **COA endpoints**: 1.36-1.55s (vs local 67-142ms) - **10x lebih lambat**
- **Laporan endpoints**: 1.46-3.94s (vs local 145-552ms) - **7-10x lebih lambat**

## ✅ Perubahan di vercel.json

### 1. Function Configuration
```json
{
  "functions": {
    "index.js": {
      "maxDuration": 30,
      "memory": 1024,
      "regions": ["sin1"]
    }
  }
}
```

**Penjelasan:**
- `maxDuration: 30` - Timeout 30 detik (default 10s, perlu untuk query kompleks)
- `memory: 1024` - Memory 1GB (default 1024MB, cukup untuk Node.js + Prisma)
- `regions: ["sin1"]` - **SINGAPORE** (ap-southeast-1) - dekat dengan Neon database dan user Asia

### 2. Build Configuration
```json
{
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 30,
        "memory": 1024
      }
    }
  ]
}
```

## 🌍 Region Selection

**Pilihan Region Vercel:**
- `sin1` - Singapore (ap-southeast-1) ✅ **RECOMMENDED untuk Asia**
- `hkg1` - Hong Kong (ap-east-1)
- `syd1` - Sydney (ap-southeast-2)
- `iad1` - Washington DC (us-east-1) - default
- `sfo1` - San Francisco (us-west-1)

**Kenapa Singapore (`sin1`)?**
- Neon database Anda di `ap-southeast-1` (Singapore)
- User kemungkinan besar di Indonesia/Asia
- Network latency terendah antara Vercel ↔ Neon ↔ User

## 📊 Expected Improvement

Setelah optimasi ini:

| Metric | Before | After (Expected) | Improvement |
|--------|--------|------------------|-------------|
| **Cold Start** | 1-3s | 500ms-1.5s | **50-70%** |
| **Warm Request** | 1.5-4s | 300-800ms | **60-80%** |
| **Login** | 3.19s | 800ms-1.2s | **60-75%** |
| **COA Endpoints** | 1.36-1.55s | 300-500ms | **70-80%** |
| **Laporan** | 1.46-3.94s | 500-1000ms | **65-75%** |

## 🚀 Additional Optimizations

### 1. Upgrade ke Vercel Pro (Jika Budget Memungkinkan)

**Vercel Pro ($20/month) memberikan:**
- ✅ **Fluid Compute** - Mengurangi cold start secara signifikan
- ✅ **Better performance** - Functions tetap warm lebih lama
- ✅ **More regions** - Pilihan region lebih banyak
- ✅ **Better observability** - Monitoring yang lebih detail

**ROI:**
- Jika cold start berkurang 70-80%, user experience akan jauh lebih baik
- Worth it jika aplikasi production dengan traffic signifikan

### 2. Implement Keep-Alive (Cron Job)

Buat endpoint health check dan ping secara berkala:

```javascript
// api/health.js atau tambahkan di index.js
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

**Setup Vercel Cron:**
```json
{
  "crons": [
    {
      "path": "/api/health",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Ini akan ping endpoint setiap 5 menit untuk keep function warm.

### 3. Optimize Dependencies

**Review package.json:**
- Hapus dependencies yang tidak digunakan
- Gunakan `npm prune` untuk cleanup
- Consider tree-shaking untuk mengurangi bundle size

**Impact:**
- Smaller bundle = faster cold start
- Expected improvement: 10-20%

### 4. Database Connection Optimization

**Pastikan menggunakan Neon Connection Pooler:**

```env
# Gunakan pooler URL, bukan direct connection
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require&pgbouncer=true
```

**Check di Vercel Dashboard:**
- Environment Variables → DATABASE_URL
- Pastikan menggunakan URL dengan `-pooler` dan `pgbouncer=true`

## 🔧 Troubleshooting

### Check Current Region

1. Go to Vercel Dashboard
2. Project Settings → General
3. Check "Region" setting
4. Jika bukan `sin1`, update ke Singapore

### Verify Function Settings

1. Go to Vercel Dashboard
2. Project Settings → Functions
3. Check:
   - Max Duration: 30s
   - Memory: 1024MB
   - Region: sin1 (Singapore)

### Monitor Cold Start

1. Go to Vercel Dashboard
2. Analytics → Functions
3. Check "Cold Start" metrics
4. Monitor setelah deploy perubahan

## 📝 Deployment Checklist

Setelah update `vercel.json`:

- [ ] Commit dan push perubahan
- [ ] Deploy ke Vercel
- [ ] Verify region di Vercel Dashboard (should be `sin1`)
- [ ] Verify function settings (maxDuration: 30s, memory: 1024MB)
- [ ] Test latency lagi dengan `npm run test:latency:prod`
- [ ] Compare hasil sebelum dan sesudah
- [ ] Monitor cold start frequency di Vercel Analytics

## 🎯 Next Steps

1. **Deploy perubahan vercel.json** - Test improvement
2. **Monitor hasil** - Bandingkan dengan test sebelumnya
3. **Jika masih lambat** - Consider Vercel Pro untuk Fluid Compute
4. **Jika budget terbatas** - Consider Supabase atau dedicated server

## ⚠️ Important Notes

1. **Cold Start tidak bisa dihilangkan 100%** di Vercel Free/Hobby plan
2. **Vercel Pro dengan Fluid Compute** bisa mengurangi cold start secara signifikan
3. **Region selection sangat penting** - Pastikan sama dengan database region
4. **Keep-alive cron** bisa membantu, tapi tidak guarantee (Vercel bisa still cold start)

## 💡 Alternative Solutions

Jika optimasi Vercel tidak cukup:

1. **Supabase** - Better connection pooling, persistent connections
2. **Railway/Render** - Dedicated server (no cold start)
3. **AWS/GCP** - Container-based deployment (more control)
4. **Vercel Pro** - Fluid Compute untuk better cold start handling

---

**Last Updated**: 2025-12-04
**Test Results**: Production latency 7-10x lebih lambat dari local

