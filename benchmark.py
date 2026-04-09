"""
HyperDrive Real Benchmark — Pure PyTorch
=========================================
Uses PyTorch Dynamic Quantization (no ONNX export needed).
Produces REAL speed + size numbers you can show in the presentation.

Run:  python benchmark.py
"""

import time, torch, copy, os, tempfile
import numpy as np
import torchvision.models as models

RUNS = 100

print("\n" + "═" * 52)
print("  HyperDrive — Live Model Benchmark")
print("═" * 52)

# ── Load model ───────────────────────────────────────────────
print("\n[1/4] Loading MobileNetV2 (FP32) ...")
fp32_model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
fp32_model.eval()

# Measure FP32 size by saving to disk
with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
    torch.save(fp32_model.state_dict(), f.name)
    fp32_path = f.name
fp32_mb = os.path.getsize(fp32_path) / (1024 * 1024)
print(f"   ✅ FP32 model size: {fp32_mb:.1f} MB")

# ── Apply Dynamic INT8 Quantization ────────────────────────
print("\n[2/4] Applying INT8 Dynamic Quantization ...")
int8_model = copy.deepcopy(fp32_model)
int8_model = torch.quantization.quantize_dynamic(
    int8_model,
    {torch.nn.Linear},   # Quantize all Linear layers
    dtype=torch.qint8
)
with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
    torch.save(int8_model.state_dict(), f.name)
    int8_path = f.name
int8_mb = os.path.getsize(int8_path) / (1024 * 1024)
print(f"   ✅ INT8 model size: {int8_mb:.1f} MB")

# ── Benchmark Function ───────────────────────────────────────
def benchmark(model, label):
    dummy = torch.randn(1, 3, 224, 224)
    # Warmup
    with torch.no_grad():
        for _ in range(10):
            model(dummy)
    # Timed runs
    times = []
    with torch.no_grad():
        for _ in range(RUNS):
            t0 = time.perf_counter()
            model(dummy)
            times.append((time.perf_counter() - t0) * 1000)
    mean = float(np.mean(times))
    p95  = float(np.percentile(times, 95))
    thrp = round(1000 / mean, 1)
    print(f"   [{label}]  mean={mean:.1f}ms  p95={p95:.1f}ms  throughput={thrp} req/s")
    return mean

# ── Run benchmarks ───────────────────────────────────────────
print(f"\n[3/4] Benchmarking ({RUNS} inference runs each) ...")
fp32_ms = benchmark(fp32_model, "FP32 Original ")
int8_ms = benchmark(int8_model, "INT8 Optimized")

# ── Print comparison table ───────────────────────────────────
speedup  = round(fp32_ms / int8_ms, 2)
size_red = round((1 - int8_mb / fp32_mb) * 100, 1)
lat_red  = round((1 - int8_ms / fp32_ms) * 100, 1)

print(f"\n[4/4] Results:")
print("\n" + "═" * 52)
print(f"  {'Metric':<22} {'Original':>10} {'Optimized':>12}")
print("─" * 52)
print(f"  {'Model Size':<22} {fp32_mb:>8.1f}MB {int8_mb:>10.1f}MB")
print(f"  {'Avg Latency':<22} {fp32_ms:>8.1f}ms {int8_ms:>10.1f}ms")
print(f"  {'Throughput (req/s)':<22} {round(1000/fp32_ms,1):>10} {round(1000/int8_ms,1):>12}")
print("─" * 52)
print(f"  🚀  {speedup}x faster  |  {size_red}% smaller  |  {lat_red}% latency reduction")
print("═" * 52)
print("\n✅ 100% REAL numbers — measured live on your CPU right now!\n")

# Cleanup
os.unlink(fp32_path)
os.unlink(int8_path)
