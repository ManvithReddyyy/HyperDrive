"""
Generate sample test files for HyperDrive application testing.
Creates:
1. A small PyTorch model file (model.pt)
2. A calibration dataset (calibration_data.jsonl)
"""

import json
import torch
import torch.nn as nn
from pathlib import Path

# Create test directory
test_dir = Path("test_files")
test_dir.mkdir(exist_ok=True)

print("🔧 Generating test files for HyperDrive...\n")

# 1. Create a small PyTorch model
print("1️⃣  Creating sample PyTorch model...")
class SimpleNet(nn.Module):
    def __init__(self):
        super(SimpleNet, self).__init__()
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.fc1 = nn.Linear(64 * 8 * 8, 128)
        self.fc2 = nn.Linear(128, 10)
    
    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

model = SimpleNet()
model_path = test_dir / "model.pt"
torch.save(model.state_dict(), model_path)
file_size = model_path.stat().st_size
print(f"   ✓ Model saved: {model_path}")
print(f"   ✓ File size: {file_size / 1024:.2f} KB\n")

# 2. Create calibration dataset (JSONL format)
print("2️⃣  Creating calibration dataset...")
calibration_path = test_dir / "calibration_data.jsonl"
with open(calibration_path, 'w') as f:
    for i in range(100):
        # Simulate image data samples
        sample = {
            "id": f"sample_{i:04d}",
            "input": {
                "shape": [1, 3, 32, 32],
                "dtype": "float32",
                "min": float(-1.0 + (i % 5) * 0.1),
                "max": float(1.0 - (i % 5) * 0.1),
            },
            "output": {
                "shape": [1, 10],
                "dtype": "float32",
                "class": i % 10,
            },
            "metadata": {
                "dataset": "ImageNet",
                "augmentation": i % 2 == 0,
                "timestamp": f"2024-12-05T10:{i:02d}:00Z"
            }
        }
        f.write(json.dumps(sample) + '\n')

file_size = calibration_path.stat().st_size
print(f"   ✓ Calibration data saved: {calibration_path}")
print(f"   ✓ File size: {file_size / 1024:.2f} KB")
print(f"   ✓ Samples: 100\n")

# 3. Generate test metadata
print("3️⃣  Creating test metadata...")
metadata = {
    "model": {
        "name": "SimpleNet",
        "framework": "PyTorch",
        "version": "1.0",
        "parameters": 1_234_567,
        "path": str(model_path)
    },
    "calibration": {
        "dataset": "CIFAR-10",
        "samples": 100,
        "size_kb": file_size / 1024,
        "path": str(calibration_path)
    },
    "test_jobs": [
        {"job_id": "test-1", "name": "Quantization INT8"},
        {"job_id": "test-2", "name": "Pruning 50%"},
        {"job_id": "test-3", "name": "Distillation"},
    ]
}

metadata_path = test_dir / "metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"   ✓ Metadata saved: {metadata_path}\n")

print("✅ All test files generated successfully!")
print(f"📁 Location: {test_dir.absolute()}\n")

print("📋 Next steps:")
print("   1. Run the app: npm run dev")
print("   2. Upload model: http://localhost:5000/upload")
print("   3. Test jobs: http://localhost:5000/jobs/test-1")
print("   4. Run performance tests: python test_performance.py")
