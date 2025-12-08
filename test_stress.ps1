# HyperDrive Stress & Load Testing Script
# Simulates concurrent requests to test API stability under load

param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$ConcurrentRequests = 10,
    [int]$Iterations = 5
)

Write-Host "⚡ HyperDrive Stress & Load Testing" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error2 { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Yellow }

# Test concurrent sensitivity requests
Write-Info "🔥 Stress Test 1: Concurrent Sensitivity Requests"
Write-Info "Concurrent: $ConcurrentRequests | Iterations: $Iterations`n"

$jobs = @()
$successCount = 0
$failCount = 0
$timings = @()

$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($iter = 1; $iter -le $Iterations; $iter++) {
    $batchJobs = @()
    
    for ($i = 1; $i -le $ConcurrentRequests; $i++) {
        $jobId = "test-{0}" -f ($i % 5 + 1)
        $uri = "$BaseUrl/api/jobs/$jobId/sensitivity"
        
        $scriptBlock = {
            param($uri)
            $iterSw = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
                $iterSw.Stop()
                @{ success = $true; time = $iterSw.ElapsedMilliseconds }
            } catch {
                $iterSw.Stop()
                @{ success = $false; time = $iterSw.ElapsedMilliseconds; error = $_.Exception.Message }
            }
        }
        
        $batchJobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $uri
    }
    
    Write-Host "Iteration $iter: Waiting for $($batchJobs.Count) concurrent requests..."
    
    foreach ($job in $batchJobs) {
        $result = Receive-Job -Job $job -Wait
        if ($result.success) {
            $successCount++
            $timings += $result.time
        } else {
            $failCount++
        }
        Remove-Job -Job $job
    }
}

$sw.Stop()
$avgTime = if ($timings.Count -gt 0) { ($timings | Measure-Object -Average).Average } else { 0 }

Write-Success "`n✅ Stress Test 1 Complete"
Write-Host "   Total Time: $($sw.ElapsedMilliseconds)ms"
Write-Host "   Successful: $successCount | Failed: $failCount"
Write-Host "   Average Response Time: $([math]::Round($avgTime, 2))ms`n"

# Test concurrent graph requests
Write-Info "🔥 Stress Test 2: Concurrent Graph Requests"
Write-Info "Concurrent: $ConcurrentRequests | Iterations: $Iterations`n"

$successCount = 0
$failCount = 0
$timings = @()

$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($iter = 1; $iter -le $Iterations; $iter++) {
    $batchJobs = @()
    
    for ($i = 1; $i -le $ConcurrentRequests; $i++) {
        $jobId = "test-{0}" -f ($i % 5 + 1)
        $uri = "$BaseUrl/api/jobs/$jobId/graph"
        
        $scriptBlock = {
            param($uri)
            $iterSw = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
                $iterSw.Stop()
                @{ success = $true; time = $iterSw.ElapsedMilliseconds }
            } catch {
                $iterSw.Stop()
                @{ success = $false; time = $iterSw.ElapsedMilliseconds }
            }
        }
        
        $batchJobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $uri
    }
    
    Write-Host "Iteration $iter: Waiting for $($batchJobs.Count) concurrent requests..."
    
    foreach ($job in $batchJobs) {
        $result = Receive-Job -Job $job -Wait
        if ($result.success) {
            $successCount++
            $timings += $result.time
        } else {
            $failCount++
        }
        Remove-Job -Job $job
    }
}

$sw.Stop()
$avgTime = if ($timings.Count -gt 0) { ($timings | Measure-Object -Average).Average } else { 0 }

Write-Success "`n✅ Stress Test 2 Complete"
Write-Host "   Total Time: $($sw.ElapsedMilliseconds)ms"
Write-Host "   Successful: $successCount | Failed: $failCount"
Write-Host "   Average Response Time: $([math]::Round($avgTime, 2))ms`n"

# Test concurrent hardware-matrix requests
Write-Info "🔥 Stress Test 3: Concurrent Hardware Matrix Requests"
Write-Info "Concurrent: $ConcurrentRequests | Iterations: $Iterations`n"

$successCount = 0
$failCount = 0
$timings = @()

$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($iter = 1; $iter -le $Iterations; $iter++) {
    $batchJobs = @()
    
    for ($i = 1; $i -le $ConcurrentRequests; $i++) {
        $uri = "$BaseUrl/api/hardware-matrix"
        
        $scriptBlock = {
            param($uri)
            $iterSw = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
                $iterSw.Stop()
                @{ success = $true; time = $iterSw.ElapsedMilliseconds }
            } catch {
                $iterSw.Stop()
                @{ success = $false; time = $iterSw.ElapsedMilliseconds }
            }
        }
        
        $batchJobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $uri
    }
    
    Write-Host "Iteration $iter: Waiting for $($batchJobs.Count) concurrent requests..."
    
    foreach ($job in $batchJobs) {
        $result = Receive-Job -Job $job -Wait
        if ($result.success) {
            $successCount++
            $timings += $result.time
        } else {
            $failCount++
        }
        Remove-Job -Job $job
    }
}

$sw.Stop()
$avgTime = if ($timings.Count -gt 0) { ($timings | Measure-Object -Average).Average } else { 0 }

Write-Success "`n✅ Stress Test 3 Complete"
Write-Host "   Total Time: $($sw.ElapsedMilliseconds)ms"
Write-Host "   Successful: $successCount | Failed: $failCount"
Write-Host "   Average Response Time: $([math]::Round($avgTime, 2))ms`n"

Write-Success "`n✅ All stress tests completed!"
Write-Host "💡 If all tests passed without errors, your API is stable under load.`n"
