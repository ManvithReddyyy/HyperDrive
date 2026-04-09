import json

d = json.load(open("data/storage.json"))
tests = [
    ("d4500c33-4dcf-4dd9-b83d-7e308fd29c9c", "INT8 Dynamic"),
    ("eb1fbfc0-55b3-4007-bf94-c1c9b5349998", "FP16"),
    ("cfe9dd22-9e9e-46b4-a3a4-dd0dab7663d1", "FP32"),
]

print(f"{'Mode':15s} | {'Orig Latency':>12s} | {'Opt Latency':>12s} | {'Speedup':>8s} | {'Accuracy Drop':>14s}")
print("-" * 75)
for jid, label in tests:
    j = d["jobs"][jid]
    orig = j["originalLatency"]
    opt = j["optimizedLatency"]
    speedup = ((orig - opt) / orig) * 100 if orig else 0
    # Find accuracy drop from logs
    acc = "N/A"
    for log in j.get("logs", []):
        if "Accuracy drop" in log:
            acc = log.split(": ")[-1]
    print(f"{label:15s} | {orig:>10.2f}ms | {opt:>10.2f}ms | {speedup:>6.1f}% | {acc:>14s}")
