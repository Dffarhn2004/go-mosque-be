// test-latency.js
// Script untuk test latency COA dan Laporan Keuangan

require('dotenv').config();
const axios = require('axios');
const { performance } = require('perf_hooks');


// Konfigurasi
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || ''; // Set JWT token di .env (optional, akan auto-login jika ada email/password)
const EMAIL = process.env.EMAIL || 'Hikmah@gmail.com'; // Email untuk auto-login@
const PASSWORD = process.env.PASSWORD || 'Hikmah123'; // Password untuk auto-login
const MASJID_ID = process.env.MASJID_ID || ''; // Set masjidId untuk testing
const ITERATIONS = parseInt(process.env.ITERATIONS || '10'); // Jumlah test per endpoint

// Global token (akan diisi setelah login)
let authToken = JWT_TOKEN;

// Helper untuk format waktu
function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Function untuk login dan mendapatkan token
async function login() {
  if (authToken) {
    console.log('✅ Using existing JWT_TOKEN from environment');
    return authToken;
  }

  if (!EMAIL || !PASSWORD) {
    console.log('⚠️  No JWT_TOKEN, EMAIL, or PASSWORD provided. Some tests may fail.');
    return null;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Logging in...');
  console.log(`${'='.repeat(60)}`);
  console.log(`Email: ${EMAIL}`);
  console.log(`URL: POST ${BASE_URL}/auth/login`);

  try {
    const start = performance.now();
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      timeout: 10000, // 10 seconds timeout for login
    });
    const end = performance.now();
    const duration = end - start;

    if (response.data?.data?.token) {
      authToken = response.data.data.token;
      const user = response.data.data.user;
      console.log(`✅ Login successful! (${formatTime(duration)})`);
      console.log(`   User: ${user.NamaLengkap || user.Email}`);
      console.log(`   Masjid ID: ${user.masjidId || 'N/A'}`);
      if (user.masjidId && !MASJID_ID) {
        console.log(`   💡 Tip: Set MASJID_ID=${user.masjidId} in .env for better testing`);
      }
      return authToken;
    } else {
      console.log(`❌ Login failed: No token in response`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Login failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Helper untuk test endpoint
async function testEndpoint(name, method, url, config = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`URL: ${method.toUpperCase()} ${url}`);
  
  const times = [];
  const errors = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    try {
      const response = await axios({
        method,
        url,
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: 30000, // 30 seconds timeout
      });
      const end = performance.now();
      const duration = end - start;
      times.push(duration);
      
      // Log response size
      const responseSize = JSON.stringify(response.data).length;
      console.log(`  Run ${i + 1}: ${formatTime(duration)} (Status: ${response.status}, Size: ${(responseSize / 1024).toFixed(2)} KB)`);
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      errors.push({ duration, error: error.message, status: error.response?.status });
      const status = error.response?.status || 'N/A';
      console.log(`  Run ${i + 1}: ${formatTime(duration)} ❌ ERROR: ${error.message} (Status: ${status})`);
    }
  }
  
  // Calculate statistics
  if (times.length > 0) {
    const sorted = [...times].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
    
    console.log(`\n📊 Statistics:`);
    console.log(`  Success: ${times.length}/${ITERATIONS}`);
    console.log(`  Min:     ${formatTime(min)}`);
    console.log(`  Max:     ${formatTime(max)}`);
    console.log(`  Average: ${formatTime(avg)}`);
    console.log(`  Median:  ${formatTime(median)}`);
    console.log(`  P95:     ${formatTime(p95)}`);
    console.log(`  P99:     ${formatTime(p99)}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors: ${errors.length}`);
      errors.forEach((err, idx) => {
        console.log(`  Error ${idx + 1}: ${formatTime(err.duration)} - ${err.error} (Status: ${err.status || 'N/A'})`);
      });
    }
    
    return {
      name,
      url,
      success: times.length,
      total: ITERATIONS,
      min,
      max,
      avg,
      median,
      p95,
      p99,
      errors: errors.length,
    };
  } else {
    console.log(`\n❌ All requests failed!`);
    return {
      name,
      url,
      success: 0,
      total: ITERATIONS,
      errors: errors.length,
    };
  }
}

// Test database connection directly
async function testDatabaseConnection() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: Direct Database Connection`);
  console.log(`${'='.repeat(60)}`);
  
  const { PrismaClient } = require('./src/generated/prisma');
  const prisma = new PrismaClient();
  
  const times = [];
  
  try {
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const end = performance.now();
      const duration = end - start;
      times.push(duration);
      console.log(`  Run ${i + 1}: ${formatTime(duration)}`);
    }
    
    const sorted = [...times].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
    
    console.log(`\n📊 Database Connection Statistics:`);
    console.log(`  Min:     ${formatTime(min)}`);
    console.log(`  Max:     ${formatTime(max)}`);
    console.log(`  Average: ${formatTime(avg)}`);
    console.log(`  Median:  ${formatTime(median)}`);
    console.log(`  P95:     ${formatTime(p95)}`);
    console.log(`  P99:     ${formatTime(p99)}`);
    
    await prisma.$disconnect();
    
    return {
      name: 'Direct Database Connection',
      success: times.length,
      total: ITERATIONS,
      min,
      max,
      avg,
      median,
      p95,
      p99,
    };
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    await prisma.$disconnect();
    return {
      name: 'Direct Database Connection',
      success: 0,
      total: ITERATIONS,
      error: error.message,
    };
  }
}

// Main function
async function runTests() {
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`# LATENCY TEST - COA & LAPORAN KEUANGAN`);
  console.log(`#${'#'.repeat(59)}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Iterations per test: ${ITERATIONS}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Login first if needed
  const token = await login();
  if (!token) {
    console.log(`\n⚠️  WARNING: Could not obtain authentication token.`);
    console.log(`   Set JWT_TOKEN, or EMAIL and PASSWORD in .env file.`);
    console.log(`   Some tests may fail without authentication.\n`);
  } else {
    // Update MASJID_ID from user data if available
    if (!MASJID_ID && token) {
      try {
        const userResponse = await axios.get(`${BASE_URL}/coa`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { includeInactive: false },
        });
        // Try to get masjidId from first account if available
        if (userResponse.data?.data?.length > 0 && userResponse.data.data[0].masjidId) {
          console.log(`\n💡 Using masjidId from account data: ${userResponse.data.data[0].masjidId}`);
        }
      } catch (error) {
        // Ignore error, continue without masjidId
      }
    }
  }
  
  const results = [];
  
  // Test 1: Direct Database Connection
  const dbResult = await testDatabaseConnection();
  if (dbResult.avg) {
    results.push(dbResult);
  }
  
  // Test 2: COA - Get All Accounts
  results.push(await testEndpoint(
    'COA - Get All Accounts',
    'GET',
    `${BASE_URL}/coa`,
    {
      params: {
        includeInactive: false,
      },
    }
  ));
  
  // Test 3: COA - Get Account Tree
  results.push(await testEndpoint(
    'COA - Get Account Tree',
    'GET',
    `${BASE_URL}/coa/tree`,
    {
      params: {
        masjidId: MASJID_ID || undefined,
      },
    }
  ));
  
  // Test 4: COA - Get Account by ID (need to get an ID first)
  let accountId = null;
  try {
    const accountsResponse = await axios.get(`${BASE_URL}/coa`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      params: { includeInactive: false },
    });
    if (accountsResponse.data?.data?.length > 0) {
      accountId = accountsResponse.data.data[0].id;
    }
  } catch (error) {
    console.log(`\n⚠️  Could not fetch account ID for testing: ${error.message}`);
  }
  
  if (accountId) {
    results.push(await testEndpoint(
      'COA - Get Account by ID',
      'GET',
      `${BASE_URL}/coa/${accountId}`
    ));
  } else {
    console.log(`\n⚠️  Skipping COA - Get Account by ID (no account ID available)`);
  }
  
  // Test 5: Laporan - Neraca (Posisi Keuangan)
  const today = new Date().toISOString().split('T')[0];
  results.push(await testEndpoint(
    'Laporan - Neraca (Posisi Keuangan)',
    'GET',
    `${BASE_URL}/laporan-keuangan/jurnal/posisi-keuangan`,
    {
      params: {
        tanggal: today,
        masjidId: MASJID_ID || undefined,
      },
    }
  ));
  
  // Test 6: Laporan - Penghasilan Komprehensif
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];
  results.push(await testEndpoint(
    'Laporan - Penghasilan Komprehensif',
    'GET',
    `${BASE_URL}/laporan-keuangan/jurnal/penghasilan-komprehensif`,
    {
      params: {
        tanggalAwal: startOfYear,
        tanggalAkhir: endOfYear,
        masjidId: MASJID_ID || undefined,
      },
    }
  ));
  
  // Test 7: Laporan - Perubahan Aset Neto
  results.push(await testEndpoint(
    'Laporan - Perubahan Aset Neto',
    'GET',
    `${BASE_URL}/laporan-keuangan/jurnal/perubahan-aset-neto`,
    {
      params: {
        tanggalAwal: startOfYear,
        tanggalAkhir: endOfYear,
        masjidId: MASJID_ID || undefined,
      },
    }
  ));
  
  // Summary
  console.log(`\n\n${'#'.repeat(60)}`);
  console.log(`# SUMMARY`);
  console.log(`#${'#'.repeat(59)}`);
  console.log(`\n${'Endpoint'.padEnd(50)} | Avg Latency | Status`);
  console.log(`${'-'.repeat(50)}-|${'-'.repeat(13)}-|${'-'.repeat(7)}`);
  
  results.forEach(result => {
    const status = result.success === result.total ? '✅' : `⚠️ ${result.errors || 0} errors`;
    const avg = result.avg ? formatTime(result.avg) : 'N/A';
    console.log(`${result.name.padEnd(50)} | ${avg.padEnd(11)} | ${status}`);
  });
  
  // Find slowest endpoints
  const successfulResults = results.filter(r => r.avg);
  if (successfulResults.length > 0) {
    const slowest = successfulResults.reduce((a, b) => (a.avg > b.avg ? a : b));
    const fastest = successfulResults.reduce((a, b) => (a.avg < b.avg ? a : b));
    
    console.log(`\n🐌 Slowest: ${slowest.name} (${formatTime(slowest.avg)})`);
    console.log(`🚀 Fastest: ${fastest.name} (${formatTime(fastest.avg)})`);
    
    // Performance analysis
    console.log(`\n📈 Performance Analysis:`);
    successfulResults.forEach(result => {
      if (result.avg > 1000) {
        console.log(`  ⚠️  ${result.name}: ${formatTime(result.avg)} - SLOW (>1s)`);
      } else if (result.avg > 500) {
        console.log(`  ⚠️  ${result.name}: ${formatTime(result.avg)} - MODERATE (>500ms)`);
      } else if (result.avg < 200) {
        console.log(`  ✅ ${result.name}: ${formatTime(result.avg)} - GOOD (<200ms)`);
      }
    });
  }
  
  console.log(`\n✅ Test completed at ${new Date().toISOString()}\n`);
}

// Run tests
runTests().catch(error => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

