import torch
import torch.nn as nn
import os

class LargeModel(nn.Module):
    def __init__(self):
        super().__init__()
        # 500MB = 500 * 1024 * 1024 bytes = 524,288,000 bytes
        # Each float32 is 4 bytes -> 131,072,000 parameters
        # Sqrt(131,072,000) ~= 11448
        # Using 11500x11500 linear layer
        self.large_layer = nn.Linear(11500, 11500)
        self.fc2 = nn.Linear(11500, 2)

    def forward(self, x):
        x = torch.relu(self.large_layer(x))
        return self.fc2(x)

if __name__ == "__main__":
    print("Generating ~500MB model... this may take a moment.")
    model = LargeModel()
    # Save as both script and full model for compatibility
    torch.save(model, "dummy.pt")
    
    size_mb = os.path.getsize("dummy.pt") / (1024 * 1024)
    print(f"Created dummy.pt successfully. Size: {size_mb:.2f} MB")
