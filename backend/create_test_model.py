"""Generate a test model saved as state_dict + architecture for reliable loading."""
import torch
import torch.nn as nn
import os
import sys

# Add parent dir so we can import from backend
sys.path.insert(0, os.path.dirname(__file__))

from model_zoo import HyperDriveTestNet

if __name__ == "__main__":
    model = HyperDriveTestNet(num_classes=10)
    model.eval()
    
    # Verify forward pass
    dummy = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        out = model(dummy)
    
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Model: HyperDriveTestNet | Params: {total_params:,} | Output: {out.shape}")
    
    # Save the FULL model (class + weights) from this context
    save_path = os.path.join(os.path.dirname(__file__), "..", "hyperdrive_test_model.pt")
    torch.save(model, save_path)
    print(f"Saved to {os.path.abspath(save_path)}")
    
    # Verify load works
    loaded = torch.load(save_path, weights_only=False)
    loaded.eval()
    with torch.no_grad():
        assert loaded(dummy).shape == out.shape
    
    # Verify INT8 Dynamic
    q = torch.quantization.quantize_dynamic(loaded, {nn.Linear, nn.Conv2d}, dtype=torch.qint8)
    with torch.no_grad():
        q(dummy)
    print("INT8 Dynamic: OK")
    
    # Verify FP16  
    fp16 = loaded.half()
    with torch.no_grad():
        fp16(dummy.half())
    print("FP16: OK")
    
    print("All quantization modes verified!")
