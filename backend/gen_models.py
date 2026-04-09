import torch
import torch.nn as nn

# Use pure nn.Sequential - no custom class needed for torch.load
features = nn.Sequential(
    nn.Conv2d(3, 64, 3, padding=1),
    nn.BatchNorm2d(64),
    nn.ReLU(),
    nn.Conv2d(64, 64, 3, padding=1),
    nn.BatchNorm2d(64),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(64, 128, 3, padding=1),
    nn.BatchNorm2d(128),
    nn.ReLU(),
    nn.Conv2d(128, 128, 3, padding=1),
    nn.BatchNorm2d(128),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(128, 256, 3, padding=1),
    nn.BatchNorm2d(256),
    nn.ReLU(),
    nn.Conv2d(256, 256, 3, padding=1),
    nn.BatchNorm2d(256),
    nn.ReLU(),
    nn.AdaptiveAvgPool2d(1),
    nn.Flatten(),
    nn.Linear(256, 512),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Linear(256, 10),
)

ids = [
    "d151115a-a9a5-409a-bf66-a6e766991308",
    "973112cc-1b30-4df8-b078-96c4901cd1c2",
    "a47afa54-c473-4c45-9172-a2180a5f2767",
    "b04c7f49-9617-4dcb-a4f8-d7ce05a76d7c",
]
for i in ids:
    torch.save(features, f"backend/models/{i}_original")

total = sum(p.numel() for p in features.parameters())
layers = sum(1 for n, mod in features.named_modules() if isinstance(mod, (nn.Conv2d, nn.Linear, nn.BatchNorm2d)))
print(f"Done. Total params: {total:,} | Analyzable layers: {layers}")

# Verify it loads correctly
loaded = torch.load(f"backend/models/{ids[0]}_original", weights_only=False)
print(f"Load test OK: {type(loaded)}")
for name, mod in loaded.named_modules():
    if isinstance(mod, (nn.Conv2d, nn.Linear, nn.BatchNorm2d)):
        print(f"  {name}: {mod.__class__.__name__} ({sum(p.numel() for p in mod.parameters())} params)")
