# HyperDrive Performance Testing Script
# Tests all API endpoints and measures response times

param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$Requests = 100
)

Write-Host "🚀 HyperDrive Performance Test Suite" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Color helpers
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error2 { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Yellow }

# Test results storage
$results = @{
    sensitivity = @()
    graph = @()
    hardware = @()
    upload = @()
}

# Test 1: Sensitivity Endpoint
Write-Info "📊 Test 1: GET /api/jobs/{id}/sensitivity"
Write-Info "Running $Requests requests..."

for ($i = 1; $i -le $Requests; $i++) {
    $jobId = "test-{0}" -f ($i % 5 + 1)
    $uri = "$BaseUrl/api/jobs/$jobId/sensitivity"
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
        $sw.Stop()
        $results.sensitivity += $sw.ElapsedMilliseconds
        
        if ($i % 20 -eq 0) {
            Write-Host "  ✓ Request $i completed in $($sw.ElapsedMilliseconds)ms"
        }
    } catch {
        Write-Error2 "  ✗ Request $i failed: $_"
    }
}

$avgSensitivity = ($results.sensitivity | Measure-Object -Average).Average
$maxSensitivity = ($results.sensitivity | Measure-Object -Maximum).Maximum
$minSensitivity = ($results.sensitivity | Measure-Object -Minimum).Minimum

Write-Success "`n✅ Sensitivity Test Complete"
Write-Host "   Average: ${avgSensitivity}ms | Min: ${minSensitivity}ms | Max: ${maxSensitivity}ms`n"

# Test 2: Graph Endpoint
Write-Info "📈 Test 2: GET /api/jobs/{id}/graph"
Write-Info "Running $Requests requests..."

for ($i = 1; $i -le $Requests; $i++) {
    $jobId = "test-{0}" -f ($i % 5 + 1)
    $uri = "$BaseUrl/api/jobs/$jobId/graph"
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
        $sw.Stop()
        $results.graph += $sw.ElapsedMilliseconds
        
        if ($i % 20 -eq 0) {
            Write-Host "  ✓ Request $i completed in $($sw.ElapsedMilliseconds)ms"
        }
    } catch {
        Write-Error2 "  ✗ Request $i failed: $_"
    }
}

$avgGraph = ($results.graph | Measure-Object -Average).Average
$maxGraph = ($results.graph | Measure-Object -Maximum).Maximum
$minGraph = ($results.graph | Measure-Object -Minimum).Minimum

Write-Success "`n✅ Graph Test Complete"
Write-Host "   Average: ${avgGraph}ms | Min: ${minGraph}ms | Max: ${maxGraph}ms`n"

# Test 3: Hardware Matrix Endpoint
Write-Info "🖥️  Test 3: GET /api/hardware-matrix"
Write-Info "Running $Requests requests..."

for ($i = 1; $i -le $Requests; $i++) {
    $uri = "$BaseUrl/api/hardware-matrix"
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
        $sw.Stop()
        $results.hardware += $sw.ElapsedMilliseconds
        
        if ($i % 20 -eq 0) {
            Write-Host "  ✓ Request $i completed in $($sw.ElapsedMilliseconds)ms"
        }
    } catch {
        Write-Error2 "  ✗ Request $i failed: $_"
    }
}

$avgHardware = ($results.hardware | Measure-Object -Average).Average
$maxHardware = ($results.hardware | Measure-Object -Maximum).Maximum
$minHardware = ($results.hardware | Measure-Object -Minimum).Minimum

Write-Success "`n✅ Hardware Matrix Test Complete"
Write-Host "   Average: ${avgHardware}ms | Min: ${minHardware}ms | Max: ${maxHardware}ms`n"

# Test 4: Upload Endpoint
Write-Info "📤 Test 4: POST /api/upload"
Write-Info "Running 10 upload requests..."

for ($i = 1; $i -le 10; $i++) {
    $uri = "$BaseUrl/api/upload"
    $body = @{
        file = "model_$i.pt"
        calibration_file = if ($i % 2 -eq 0) { "calib_$i.jsonl" } else { $null }
        metadata = "Test upload $i"
    } | ConvertTo-Json
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $uri `
            -Method Post `
            -ContentType "application/json" `
            -Body $body `
            -UseBasicParsing `
            -ErrorAction Stop
        $sw.Stop()
        $results.upload += $sw.ElapsedMilliseconds
        Write-Host "  ✓ Upload $i completed in $($sw.ElapsedMilliseconds)ms"
    } catch {
        Write-Error2 "  ✗ Upload $i failed: $_"
    }
}

$avgUpload = ($results.upload | Measure-Object -Average).Average
$maxUpload = ($results.upload | Measure-Object -Maximum).Maximum
$minUpload = ($results.upload | Measure-Object -Minimum).Minimum

Write-Success "`n✅ Upload Test Complete"
Write-Host "   Average: ${avgUpload}ms | Min: ${minUpload}ms | Max: ${maxUpload}ms`n"

# Summary Report
Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         PERFORMANCE TEST SUMMARY REPORT                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Endpoint Performance (Response Times)" -ForegroundColor White
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor Gray

$testResults = @(
    [PSCustomObject]@{ Endpoint = "Sensitivity"; Avg = [math]::Round($avgSensitivity, 2); Min = $minSensitivity; Max = $maxSensitivity; Requests = $Requests },
    [PSCustomObject]@{ Endpoint = "Graph"; Avg = [math]::Round($avgGraph, 2); Min = $minGraph; Max = $maxGraph; Requests = $Requests },
    [PSCustomObject]@{ Endpoint = "Hardware"; Avg = [math]::Round($avgHardware, 2); Min = $minHardware; Max = $maxHardware; Requests = $Requests },
    [PSCustomObject]@{ Endpoint = "Upload"; Avg = [math]::Round($avgUpload, 2); Min = $minUpload; Max = $maxUpload; Requests = 10 }
)

$testResults | Format-Table -AutoSize -Property Endpoint, Avg, Min, Max, Requests -HideTableHeaders | ForEach-Object { Write-Host $_ }

# Calculate overall stats
$allTimes = $results.sensitivity + $results.graph + $results.hardware + $results.upload
$overallAvg = ($allTimes | Measure-Object -Average).Average
$overallMax = ($allTimes | Measure-Object -Maximum).Maximum
$overallMin = ($allTimes | Measure-Object -Minimum).Minimum

Write-Host ""
Write-Host "Overall Statistics" -ForegroundColor White
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Total Requests: $($allTimes.Count)"
Write-Host "Average Response Time: $([math]::Round($overallAvg, 2))ms"
Write-Host "Min Response Time: ${overallMin}ms"
Write-Host "Max Response Time: ${overallMax}ms"

# Performance rating
Write-Host ""
if ($overallAvg -lt 50) {
    Write-Host "🚀 Rating: EXCELLENT (< 50ms)" -ForegroundColor Green
} elseif ($overallAvg -lt 100) {
    Write-Host "✅ Rating: GOOD (50-100ms)" -ForegroundColor Green
} elseif ($overallAvg -lt 200) {
    Write-Host "⚠️  Rating: ACCEPTABLE (100-200ms)" -ForegroundColor Yellow
} else {
    Write-Host "❌ Rating: NEEDS OPTIMIZATION (> 200ms)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test suite completed!" -ForegroundColor Green
