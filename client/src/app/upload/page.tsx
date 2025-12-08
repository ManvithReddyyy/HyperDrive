"use client";

import React, { useState, useRef } from "react";

export default function UploadPage() {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [calibrationFile, setCalibrationFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const mainFileRef = useRef<HTMLInputElement>(null);
  const calibFileRef = useRef<HTMLInputElement>(null);

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMainFile(e.target.files[0]);
    }
  };

  const handleCalibrationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCalibrationFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainFile) {
      setMessage("Please select a main file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", mainFile);
    if (calibrationFile) {
      formData.append("calibration_file", calibrationFile);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setMessage(
          `✓ Upload successful! ${
            result.calibration_file
              ? "Calibration file included."
              : "No calibration data."
          }`
        );
        setMainFile(null);
        setCalibrationFile(null);
        if (mainFileRef.current) mainFileRef.current.value = "";
        if (calibFileRef.current) calibFileRef.current.value = "";
      } else {
        setMessage("Upload failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold text-zinc-900 mb-2">
          Upload Model
        </h1>
        <p className="text-zinc-600 mb-8">
          Upload your model file and optionally include a calibration dataset for improved accuracy.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main File Upload */}
          <div className="bg-white rounded border border-zinc-200 p-6">
            <label className="block text-sm font-semibold text-zinc-900 mb-3">
              Model File
            </label>
            <div className="border-2 border-dashed border-zinc-300 rounded p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors">
              <input
                ref={mainFileRef}
                type="file"
                onChange={handleMainFileChange}
                className="hidden"
                accept=".pt,.pth,.onnx,.pb"
              />
              <button
                type="button"
                onClick={() => mainFileRef.current?.click()}
                className="text-zinc-600 hover:text-zinc-900 font-medium"
              >
                {mainFile ? mainFile.name : "Click to select or drag & drop"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Supported: .pt, .pth, .onnx, .pb
            </p>
          </div>

          {/* Calibration File Upload */}
          <div className="bg-white rounded border border-zinc-200 p-6">
            <div className="flex items-start gap-3 mb-3">
              <label className="block text-sm font-semibold text-zinc-900">
                Calibration Dataset
              </label>
              <div className="group relative">
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 text-xs font-bold cursor-help"
                >
                  ?
                </button>
                <div className="absolute left-0 top-7 hidden group-hover:block bg-zinc-900 text-white text-xs rounded p-2 w-48 z-10 shadow-lg">
                  Calibration data helps improve INT8 quantization accuracy by better understanding weight distributions.
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-600 mb-3">
              (Optional) Upload a .jsonl file with representative samples
            </p>
            <div className="border-2 border-dashed border-zinc-300 rounded p-6 text-center cursor-pointer hover:border-zinc-400 transition-colors">
              <input
                ref={calibFileRef}
                type="file"
                onChange={handleCalibrationFileChange}
                className="hidden"
                accept=".jsonl"
              />
              <button
                type="button"
                onClick={() => calibFileRef.current?.click()}
                className="text-zinc-600 hover:text-zinc-900 font-medium"
              >
                {calibrationFile
                  ? calibrationFile.name
                  : "Click to select or drag & drop"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Format: .jsonl (JSON Lines)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!mainFile || uploading}
              className="flex-1 px-6 py-3 bg-zinc-900 text-white font-medium rounded border border-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 disabled:border-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className={`rounded border p-4 text-sm ${
                message.startsWith("✓")
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
