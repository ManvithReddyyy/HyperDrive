"use client";

import React, { useState } from "react";

interface Model {
  id: string;
  name: string;
  version: string;
  tags: string[];
  size: string;
  date: string;
  family: string;
}

const mockModels: Model[] = [
  {
    id: "1",
    name: "Llama-2-7B",
    version: "1.0",
    tags: ["Prod"],
    size: "7B",
    date: "2024-12-01",
    family: "Llama-2",
  },
  {
    id: "2",
    name: "Llama-2-13B",
    version: "1.0",
    tags: ["Staging"],
    size: "13B",
    date: "2024-12-02",
    family: "Llama-2",
  },
  {
    id: "3",
    name: "Llama-2-70B",
    version: "1.1",
    tags: ["Prod", "Experimental"],
    size: "70B",
    date: "2024-12-03",
    family: "Llama-2",
  },
  {
    id: "4",
    name: "ResNet-50",
    version: "2.0",
    tags: ["Prod"],
    size: "98M",
    date: "2024-11-28",
    family: "ResNet",
  },
  {
    id: "5",
    name: "ResNet-101",
    version: "1.5",
    tags: ["Staging"],
    size: "170M",
    date: "2024-11-29",
    family: "ResNet",
  },
  {
    id: "6",
    name: "VGG-19",
    version: "1.0",
    tags: ["Legacy"],
    size: "144M",
    date: "2024-10-15",
    family: "VGG",
  },
];

const TagBadge = ({ tag }: { tag: string }) => {
  const colorClass = {
    Prod: "bg-green-100 text-green-800",
    Staging: "bg-yellow-100 text-yellow-800",
    Experimental: "bg-blue-100 text-blue-800",
    Legacy: "bg-zinc-200 text-zinc-800",
  }[tag] || "bg-zinc-100 text-zinc-800";

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${colorClass}`}>
      {tag}
    </span>
  );
};

export default function RegistryPage() {
  // Group by family
  const grouped = mockModels.reduce(
    (acc, model) => {
      if (!acc[model.family]) acc[model.family] = [];
      acc[model.family].push(model);
      return acc;
    },
    {} as Record<string, Model[]>
  );

  const families = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold text-zinc-900 mb-6">
          Model Registry
        </h1>

        {families.map((family) => (
          <div key={family} className="mb-8">
            {/* Family Header */}
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">
              {family}
            </h2>

            {/* Table */}
            <div className="rounded border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[family].map((model, idx) => (
                    <tr
                      key={model.id}
                      className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${
                        idx === grouped[family].length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-zinc-900 font-medium">
                        {model.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-700">
                        {model.version}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {model.tags.map((tag) => (
                            <TagBadge key={tag} tag={tag} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-700">
                        {model.size}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-700">
                        {new Date(model.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
