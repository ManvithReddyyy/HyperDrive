from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random
import uvicorn

app = FastAPI(title="HyperDrive Mock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/jobs/{job_id}/sensitivity")
def get_sensitivity(job_id: str):
    """Return a list of layers and error rates. High errors are rare."""
    # deterministic-ish pseudo-random based on job_id
    seed = sum(ord(c) for c in job_id)
    rnd = random.Random(seed)
    layers = []
    num_layers = rnd.randint(6, 12)
    for i in range(1, num_layers + 1):
        layer_type = rnd.choice(["Conv", "Attn", "Dense", "LayerNorm"])
        name = f"{layer_type}_{i}"
        # base error small
        base = rnd.random() * 0.08
        # occasionally inject a higher error (rare)
        if rnd.random() < 0.08:
            err = round(base + rnd.random() * 0.4, 3)
        else:
            err = round(base, 3)
        layers.append({"layer": name, "error": err})
    return layers


@app.get("/api/jobs/{job_id}/graph")
def get_graph(job_id: str):
    """Return nodes and edges formatted for React Flow representing a simple NN graph.
    Some nodes flagged as 'fused'.
    """
    seed = sum(ord(c) for c in job_id) * 7
    rnd = random.Random(seed)

    # create a simple layered network horizontally
    nodes = []
    edges = []
    layer_names = ["Input", "Conv_1", "Conv_2", "Pool", "Attn_1", "Dense", "Output"]
    x_start = 50
    y_start = 100
    x_gap = 220

    for idx, lname in enumerate(layer_names):
        node_id = f"n{idx}"
        x = x_start + idx * x_gap
        # stagger Y a little to show clean horizontal flow
        y = y_start + (idx % 2) * 30
        fused = False
        if "Conv" in lname and rnd.random() < 0.25:
            fused = True
        nodes.append({
            "id": node_id,
            "data": {"label": lname, "fused": fused},
            "position": {"x": x, "y": y},
            "style": {},
        })
        if idx > 0:
            edges.append({
                "id": f"e{idx-1}",
                "source": f"n{idx-1}",
                "target": node_id,
                "animated": False,
            })

    return {"nodes": nodes, "edges": edges}


class HardwareOption(BaseModel):
    name: str
    cost_per_hour: float
    throughput_tokens_s: float


@app.get("/api/hardware-matrix")
def get_hardware_matrix():
    """Return hardware options with cost and throughput for plotting."""
    # static-ish list with variety
    options = [
        {"name": "cpu-small", "cost_per_hour": 0.10, "throughput_tokens_s": 20},
        {"name": "cpu-large", "cost_per_hour": 0.50, "throughput_tokens_s": 60},
        {"name": "gpu-v100", "cost_per_hour": 2.40, "throughput_tokens_s": 400},
        {"name": "gpu-a10", "cost_per_hour": 1.80, "throughput_tokens_s": 320},
        {"name": "tpu-small", "cost_per_hour": 3.20, "throughput_tokens_s": 600},
        {"name": "edge-rt", "cost_per_hour": 0.75, "throughput_tokens_s": 150},
    ]
    return options


@app.post("/api/upload")
async def upload(file: UploadFile = File(...), calibration_file: Optional[UploadFile] = File(None), metadata: Optional[str] = Form(None)):
    """Accept a main uploaded file and an optional calibration_file (e.g., .jsonl).
    Returns a small summary for frontend visualization.
    """
    file_info = {"filename": file.filename, "content_type": file.content_type}
    calib_info = None
    if calibration_file is not None:
        calib_info = {"filename": calibration_file.filename, "content_type": calibration_file.content_type}

    return {"status": "ok", "file": file_info, "calibration_file": calib_info, "metadata": metadata}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
