"use client";

import { useState } from "react";

const importOptions = [
  {
    title: "Customers",
    description: "Import customer names, mobile numbers and opening balances.",
  },
  {
    title: "Suppliers",
    description: "Import suppliers and their outstanding balances.",
  },
  {
    title: "Raw Materials",
    description: "Import raw materials, stock and purchase rates.",
  },
  {
    title: "Products & Recipes",
    description: "Import products and recipe information.",
  },
  {
    title: "Opening Stock",
    description: "Import existing raw-material and finished-goods stock.",
  },
  {
    title: "Sales",
    description: "Import previous sales and invoice records.",
  },
  {
    title: "Payments",
    description: "Import customer and supplier payment history.",
  },
];

export default function DataImportPage() {
  const [selected, setSelected] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-green-600">
            FEEDORA
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Import Existing Data
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Move your existing business data from your previous software
            into FEEDORA using Excel or CSV files.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="font-bold text-green-900">
            Data Migration
          </h2>

          <p className="mt-1 text-sm text-green-800">
            Your imported data will remain inside your company account.
            Other businesses will not be able to see it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {importOptions.map((item) => (
            <button
              key={item.title}
              onClick={() => setSelected(item.title)}
              className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                selected === item.title
                  ? "border-green-500 ring-2 ring-green-100"
                  : "border-slate-200"
              }`}
            >
              <h3 className="text-lg font-bold text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {item.description}
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-green-600">
                Select →
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Import {selected}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Select an Excel or CSV file from your previous software.
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-8 text-center transition hover:bg-green-100">
              <span className="text-sm font-bold text-green-700">
                📁 Choose Excel / CSV File
              </span>

              <span className="mt-2 text-xs text-slate-500">
                Supported: .xlsx, .xls, .csv
              </span>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            {file && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  Selected File
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            {file && (
              <button
                type="button"
                className="mt-4 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
              >
                Continue to Preview →
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
