"""
HyperDrive Demo Model Generator
Generates a real MobileNetV2 .pt file you can upload to HyperDrive.
Run: python generate_demo_model.py
"""
import torch
import torchvision.models as models
import os

print("Downloading MobileNetV2 (lightweight, ~14MB)...")
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
model.eval()

# Save as TorchScript (fully self-contained .pt)
dummy_input = torch.randn(1, 3, 224, 224)
scripted = torch.jit.trace(model, dummy_input)

output_path = "mobilenet_v2_demo.pt"
torch.jit.save(scripted, output_path)

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"\n✅ Saved: {output_path}")
print(f"   Size : {size_mb:.1f} MB")
print(f"   Input: [1, 3, 224, 224] (batch x channels x height x width)")
print(f"\nUpload this file to HyperDrive → select INT8 Dynamic quantization → Optimize!")
