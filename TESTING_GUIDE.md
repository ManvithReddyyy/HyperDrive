# HyperDrive Complete Testing Guide
# End-to-End Workflow: File Upload → Job Creation → Performance Analysis

## 📋 Complete Testing Workflow

### Step 1: Generate Test Files
```powershell
cd m:\coding_environment\HyperDrive
python generate_test_files.py
```

**Expected Output:**
```
🔧 Generating test files for HyperDrive...
1️⃣  Creating sample PyTorch model...
   ✓ Model saved: test_files\model.pt
   ✓ File size: 45.23 KB

2️⃣  Creating calibration dataset...
   ✓ Calibration data saved: test_files\calibration_data.jsonl
   ✓ File size: 12.45 KB
   ✓ Samples: 100

3️⃣  Creating test metadata...
   ✓ Metadata saved: test_files\metadata.json

✅ All test files generated successfully!
```

This creates:
- `test_files/model.pt` — PyTorch model file (~45KB)
- `test_files/calibration_data.jsonl` — 100 calibration samples
- `test_files/metadata.json` — Test metadata and job definitions

---

### Step 2: Start the Development Server
```powershell
npm run dev
```

**Expected Output:**
```
11:01:32 AM [express] serving on port 5000
```

Wait 3-5 seconds for the server to fully initialize.

---

### Step 3: Test via Browser (Manual Testing)

#### A. Upload Page
1. Navigate to: `http://localhost:5000/upload`
2. Click "Model File" and select `test_files/model.pt`
3. Click "Calibration Dataset" and select `test_files/calibration_data.jsonl`
4. Click "Upload"
5. **Expected:** ✓ Upload successful message

#### B. Model Registry
1. Navigate to: `http://localhost:5000/registry`
2. **Expected:** Table with 3 model families (Llama-2, ResNet, VGG)
3. Verify grouped rows and color-coded tags

#### C. Job Detail Page with Tabs
1. Navigate to: `http://localhost:5000/jobs/test-1`
2. **Tab 1 - Console:** Shows terminal output
3. **Tab 2 - X-Ray:** Shows architecture graph with 7 layers
4. **Tab 3 - Analysis:** Shows bar chart with layer error rates

---

### Step 4: Run Performance Tests

#### A. Basic Performance Testing (100 requests per endpoint)
```powershell
.\test_performance.ps1 -Requests 100
```

**Expected Output:**
```
📊 Test 1: GET /api/jobs/{id}/sensitivity
Running 100 requests...
  ✓ Request 20 completed in 15ms
  ✓ Request 40 completed in 12ms
  ...
✅ Sensitivity Test Complete
   Average: 14.35ms | Min: 8ms | Max: 45ms

📈 Test 2: GET /api/jobs/{id}/graph
Running 100 requests...
✅ Graph Test Complete
   Average: 16.89ms | Min: 10ms | Max: 52ms

🖥️  Test 3: GET /api/hardware-matrix
Running 100 requests...
✅ Hardware Matrix Test Complete
   Average: 12.45ms | Min: 7ms | Max: 38ms

📤 Test 4: POST /api/upload
Running 10 upload requests...
✅ Upload Test Complete
   Average: 22.50ms | Min: 18ms | Max: 35ms

╔════════════════════════════════════════════════════════╗
║         PERFORMANCE TEST SUMMARY REPORT                ║
╚════════════════════════════════════════════════════════╝

Endpoint Performance (Response Times)
────────────────────────────────────────────────────────
Sensitivity  14.35  8    45   100
Graph        16.89  10   52   100
Hardware     12.45  7    38   100
Upload       22.50  18   35   10

Overall Statistics
────────────────────────────────────────────────────────
Total Requests: 310
Average Response Time: 15.45ms
Min Response Time: 7ms
Max Response Time: 52ms

🚀 Rating: EXCELLENT (< 50ms)

✅ Test suite completed!
```

#### B. Stress/Load Testing (10 concurrent requests × 5 iterations)
```powershell
.\test_stress.ps1 -ConcurrentRequests 10 -Iterations 5
```

**Expected Output:**
```
⚡ HyperDrive Stress & Load Testing
====================================

🔥 Stress Test 1: Concurrent Sensitivity Requests
Concurrent: 10 | Iterations: 5

Iteration 1: Waiting for 10 concurrent requests...
Iteration 2: Waiting for 10 concurrent requests...
...
✅ Stress Test 1 Complete
   Total Time: 234ms
   Successful: 50 | Failed: 0
   Average Response Time: 18.45ms

✅ All stress tests completed!
💡 If all tests passed without errors, your API is stable under load.
```

---

### Step 5: API Endpoint Testing (via PowerShell)

#### Test Sensitivity Endpoint
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/jobs/test-1/sensitivity" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
$data | Format-Table -AutoSize
```

**Expected Output:**
```
layer      error
------     -----
Conv_1     0.023
Attn_2     0.156
Dense_1    0.045
LayerNorm  0.012
```

#### Test Graph Endpoint
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/jobs/test-1/graph" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
Write-Host "Nodes: $($data.nodes.Count)"
Write-Host "Edges: $($data.edges.Count)"
$data.nodes | Format-Table -Property @{Name="Node"; Expression={$_.id}}, @{Name="Label"; Expression={$_.data.label}}, @{Name="Fused"; Expression={$_.data.fused}}
```

**Expected Output:**
```
Nodes: 7
Edges: 6

Node Label      Fused
---- -----      -----
n0   Input      False
n1   Conv_1     True
n2   Conv_2     False
...
```

#### Test Hardware Matrix Endpoint
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/hardware-matrix" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
$data | Format-Table -AutoSize -Property name, cost_per_hour, throughput_tokens_s
```

**Expected Output:**
```
name      cost_per_hour throughput_tokens_s
----      ------------- ------------------
cpu-small        0.1                     20
gpu-v100         2.4                    400
tpu-small        3.2                    600
```

---

### Step 6: Performance Analysis & Metrics

#### Key Performance Indicators (KPIs)

| Metric | Target | Excellent | Good | Acceptable |
|--------|--------|-----------|------|-----------|
| Sensitivity Avg | < 20ms | < 15ms | 15-20ms | 20-30ms |
| Graph Avg | < 25ms | < 20ms | 20-25ms | 25-35ms |
| Hardware Avg | < 20ms | < 15ms | 15-20ms | 20-30ms |
| Upload Avg | < 50ms | < 40ms | 40-50ms | 50-100ms |
| P95 Latency | < 50ms | < 40ms | 40-50ms | 50-100ms |
| Error Rate | < 1% | 0% | < 0.5% | < 1% |

#### Interpreting Results

**🚀 EXCELLENT (< 50ms average):**
- API responses are fast and consistent
- Can handle 100+ concurrent users
- Suitable for production deployment

**✅ GOOD (50-100ms average):**
- Acceptable performance for most use cases
- Can handle 50+ concurrent users
- Monitor for optimization opportunities

**⚠️ ACCEPTABLE (100-200ms average):**
- Performance is adequate but slow
- Maximum ~20 concurrent users
- Requires optimization (caching, indexing, etc.)

**❌ NEEDS OPTIMIZATION (> 200ms average):**
- Performance is poor
- Can only handle 5-10 concurrent users
- Requires immediate optimization

---

### Step 7: Memory & Resource Usage (Optional)

Monitor system resources while running tests:

```powershell
# Open Task Manager or run:
Get-Process | Where-Object {$_.ProcessName -match "node"} | Select-Object ProcessName, Id, WorkingSet, @{Name="CPU%"; Expression={$_.CPU}} | Format-Table -AutoSize
```

**Look for:**
- Node process memory usage (should be < 200MB)
- CPU usage (should be < 50% during tests)
- No memory leaks (memory should stabilize after tests)

---

### Step 8: Browser DevTools Testing

1. Open `http://localhost:5000/jobs/test-1` in Chrome/Edge
2. Press `F12` to open DevTools
3. Go to **Network** tab
4. Click each tab (Console, X-Ray, Analysis)
5. **Check:**
   - Network request times (should be < 100ms)
   - Bundle sizes (analyze in Coverage tab)
   - No console errors or warnings
   - Smooth animations (60 FPS if applicable)

---

## 📊 Full Test Checklist

- [ ] Test files generated successfully
- [ ] Dev server starts without errors
- [ ] Upload page works with both files
- [ ] Registry page displays grouped data
- [ ] Job detail page tabs load correctly
- [ ] Sensitivity chart renders with data
- [ ] Architecture graph displays nodes/edges
- [ ] Hardware matrix shows scatter plot
- [ ] All API endpoints return 200 status
- [ ] Performance test average < 50ms
- [ ] Stress test with 0 failures
- [ ] No console errors in DevTools
- [ ] Memory usage stable (< 200MB)

---

## 🐛 Troubleshooting

**Issue: "Port 5000 already in use"**
```powershell
Get-Process | Where-Object {$_.ProcessName -match "node"} | Stop-Process -Force
npm run dev
```

**Issue: "Cannot find module 'reactflow'"**
```powershell
npm install reactflow recharts lucide-react
npm run dev
```

**Issue: "API returns 404"**
- Verify dev server is running
- Check job ID format (should be `test-1`, `test-2`, etc.)
- Check API endpoints in `server/routes.ts`

**Issue: "Performance is slow"**
- Clear browser cache (Ctrl+Shift+Delete)
- Disable browser extensions
- Close other applications
- Run stress test with fewer concurrent requests

---

## 📈 Next Steps

1. ✅ Run basic performance tests
2. ✅ Run stress tests for stability
3. ✅ Monitor memory/CPU usage
4. ✅ Check DevTools Network/Console tabs
5. ✅ Document baseline metrics
6. ✅ Identify optimization opportunities
7. ✅ Deploy to production when ready

**Good luck! 🚀**
