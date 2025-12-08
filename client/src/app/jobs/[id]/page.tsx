"use client";

import React, { useState } from "react";
import { ArchitectureGraph } from "@/components/business/ArchitectureGraph";
import { SensitivityChart } from "@/components/business/SensitivityChart";

interface PageProps {
  params: {
    id: string;
  };
}

type TabType = "console" | "xray" | "analysis";

export default function JobDetailPage({ params }: PageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("console");
  const jobId = params.id;

  const tabClasses = (tab: TabType) =>
    `px-4 py-2 font-medium text-sm transition-colors ${
      activeTab === tab
        ? "text-zinc-900 border-b-2 border-zinc-900"
        : "text-zinc-600 border-b-2 border-transparent hover:text-zinc-900"
    }`;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-zinc-900 mb-6">
          Job {jobId}
        </h1>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-zinc-200 mb-6">
          <button
            onClick={() => setActiveTab("console")}
            className={tabClasses("console")}
          >
            Console
          </button>
          <button
            onClick={() => setActiveTab("xray")}
            className={tabClasses("xray")}
          >
            X-Ray
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={tabClasses("analysis")}
          >
            Analysis
          </button>
        </div>

        {/* Tab Content */}
        <div className="h-[600px]">
          {activeTab === "console" && (
            <div className="bg-white rounded border border-zinc-200 p-6 h-full">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                Console
              </h2>
              <div className="bg-zinc-900 text-zinc-100 font-mono text-sm rounded p-4 h-[90%] overflow-auto">
                <p>$ job {jobId} started</p>
                <p>$ [10:45:32] Loading model weights...</p>
                <p>$ [10:45:45] Quantization in progress...</p>
                <p>$ [10:46:12] Sensitivity analysis complete.</p>
                <p>$ [10:46:30] ✓ Job completed successfully</p>
              </div>
            </div>
          )}

          {activeTab === "xray" && (
            <div style={{ height: "100%" }}>
              <ArchitectureGraph jobId={jobId} />
            </div>
          )}

          {activeTab === "analysis" && (
            <div style={{ height: "100%" }}>
              <SensitivityChart jobId={jobId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
