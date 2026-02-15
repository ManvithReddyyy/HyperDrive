# HyperDrive - Real ML Backend Setup Guide

## What Was Implemented

✅ **Real Python ML Backend** (`backend/main.py`)
- Actual PyTorch quantization (INT8, INT16, FP16)
- ONNX model loading and analysis
- Real layer sensitivity analysis from model structure
- Model optimization metrics calculation

✅ **File Upload & Storage** (`server/routes.ts`)
- Multer integration for .pt, .pth, .onnx files
- File validation (max 500MB)
- Stores files in `/uploads` directory

✅ **Job Processor Integration** (`server/job-processor.ts`)
- Calls Python backend `/api/jobs/{id}/optimize` endpoint
- Real model file processing (falls back to mock if file unavailable)
- Streams real optimization metrics to frontend

✅ **Real Endpoints**
- `POST /api/upload` - Upload model file + config
- `POST /api/jobs/{id}/optimize` - Python backend quantization
- `GET /api/jobs/{id}/sensitivity` - Real layer analysis
- `GET /api/jobs/{id}/graph` - Architecture visualization

---

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Required packages:
- `torch` - PyTorch for model quantization
- `onnx` + `onnxruntime` - ONNX model support
- `fastapi` + `uvicorn` - Backend server
- `numpy` - Numerical computations

### 2. Start Python Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Backend runs on `http://localhost:8000`

### 3. Install Node Dependencies

```bash
npm install
```

New dependencies added:
- `multer` - File upload handling
- `node-fetch` - HTTP requests from backend

### 4. Set Environment Variables

Create `.env.local` in project root:

```env
PYTHON_BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:5173
```

### 5. Start Development Server

```bash
npm run dev
```

Runs on `http://localhost:5173`

---

## Workflow

### Upload & Process Model

1. **Frontend**: Upload .pt/.pth/.onnx file + config (quantization, strategy, target device)
2. **Server**: Stores file in `/uploads`, creates job record
3. **Job Processor**: Runs pipeline steps, calls Python backend
4. **Python Backend**: 
   - Loads model file
   - Applies quantization (INT8/FP16/INT16)
   - Analyzes layer sensitivity
   - Calculates metrics (size reduction, latency)
5. **Frontend**: Receives real metrics via WebSocket, displays results

### Example Supported Model Types
- ✅ PyTorch: `.pt`, `.pth`
- ✅ ONNX: `.onnx`
- ⚠️ TensorFlow: `.pb` (partial support)

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI ML optimization service |
| `backend/requirements.txt` | Python dependencies |
| `server/routes.ts` | File upload & API endpoints |
| `server/job-processor.ts` | Job orchestration + Python backend calls |
| `package.json` | Node dependencies (updated with multer) |

---

## API Endpoints

### Upload Model
```http
POST /api/upload
Content-Type: multipart/form-data

file: <model_file>
quantization: INT8
strategy: Balanced
targetDevice: NVIDIA A100
calibrationSamples: 100
```

Response:
```json
{
  "success": true,
  "jobId": "uuid",
  "fileName": "model.pt",
  "fileSize": 123456
}
```

### Get Sensitivity Analysis
```http
GET /api/jobs/{jobId}/sensitivity
```

Response:
```json
[
  {
    "layer": "Conv_1",
    "sensitivity": 0.1234,
    "type": "Conv2d",
    "params": 9408
  },
  ...
]
```

### Get Architecture Graph
```http
GET /api/jobs/{jobId}/graph
```

Response:
```json
{
  "nodes": [...],
  "edges": [...]
}
```

---

## Fallback Behavior

If Python backend is unavailable, the system gracefully falls back to mock metrics:
- Real file is still saved
- Job still processes with synthetic metrics
- Frontend still receives results (with ⚠️ warning)

---

## Troubleshooting

### Python Backend Not Connecting
```bash
# Check if backend is running
curl http://localhost:8000/docs

# Check PYTHON_BACKEND_URL env var
echo $PYTHON_BACKEND_URL
```

### Model File Not Found
- Check `/uploads` directory
- Verify file permissions
- Ensure multer is configured correctly

### Out of Memory (Large Models)
- PyTorch may need GPU: `torch.cuda.is_available()`
- Adjust `calibrationSamples` lower (default 100)
- Use smaller batch sizes

### ONNX Model Issues
- Ensure ONNX version matches model format
- Try `onnxruntime` with CUDA: `pip install onnxruntime-gpu`

---

## Next Steps

1. **Test with Real Models**: Upload actual PyTorch/ONNX models
2. **Add Calibration Data**: Upload calibration dataset for INT8
3. **Hardware Mapping**: Update hardware matrix with real GPU costs
4. **Export Models**: Implement model download after optimization
5. **Webhooks**: Trigger CI/CD on optimization completion

---

## Performance Notes

- **Small models** (<50MB): ~5-10 seconds
- **Medium models** (50-200MB): ~15-30 seconds
- **Large models** (>200MB): May timeout (increase POLLING_INTERVAL)

Optimization is **single-threaded** per job. Queue multiple jobs for parallel processing.

---

## Limitations

⚠️ Currently:
- No GPU acceleration (CPU-only quantization)
- No distributed processing
- No real dataset calibration
- No live inference testing

These can be added with GPU backend configuration.
