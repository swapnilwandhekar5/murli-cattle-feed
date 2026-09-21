"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

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

type CustomerRow = {
  name: string;
  mobile: string;
  phone: string;
  address: string;
  gst_number: string;
  credit_limit: number;
  opening_balance: number;
  notes: string;
};

export default function DataImportPage() {
  const [selected, setSelected] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewReady, setPreviewReady] = useState(false);

  function normalizeKey(value: string) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  }

  function readValue(row: Record<string, unknown>, keys: string[]) {
    const normalized: Record<string, unknown> = {};

    Object.keys(row).forEach((key) => {
      normalized[normalizeKey(key)] = row[key];
    });

    for (const key of keys) {
      const value = normalized[normalizeKey(key)];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return String(value).trim();
      }
    }

    return "";
  }

  function numberValue(value: string) {
    const cleaned = String(value || "").replace(/,/g, "").trim();
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  async function handleFile(file: File) {
    setFile(file);
    setRows([]);
    setMessage("");
    setPreviewReady(false);

    if (selected !== "Customers") {
      setMessage(
        `${selected} import UI ready hai. Customers import abhi implement kiya gaya hai.`
      );
      return;
    }

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        {
          defval: "",
        }
      );

      const customerRows: CustomerRow[] = data
        .map((row) => ({
          name: readValue(row, [
            "Customer Name",
            "Customer",
            "Name",
          ]),
          mobile: readValue(row, [
            "Mobile",
            "Mobile Number",
            "Mobile No",
          ]),
          phone: readValue(row, [
            "Phone",
            "Phone Number",
            "Phone No",
          ]),
          address: readValue(row, ["Address"]),
          gst_number: readValue(row, [
            "GSTIN",
            "GST Number",
            "GST No",
            "GST",
          ]),
          credit_limit: numberValue(
            readValue(row, [
              "Credit Limit",
              "CreditLimit",
            ])
          ),
          opening_balance: numberValue(
            readValue(row, [
              "Opening Balance",
              "OpeningBalance",
              "Opening",
              "Balance",
            ])
          ),
          notes: readValue(row, ["Notes", "Note"]),
        }))
        .filter((row) => row.name);

      setRows(customerRows);
      setPreviewReady(true);

      if (customerRows.length === 0) {
        setMessage(
          "Customer data nahi mila. Excel ki first row me column headings honi chahiye."
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Excel/CSV file read nahi ho paayi.");
    }
  }

  async function importCustomers() {
    if (!rows.length) {
      alert("Import karne ke liye customer data nahi hai.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Please login again.");
      }

      const userId = userData.user.id;

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.company_id) {
        throw new Error("Company account nahi mila.");
      }

      const companyId = membership.company_id;

      const { data: existingCustomers, error: existingError } =
        await supabase
          .from("customers")
          .select("id,name,mobile,phone")
          .eq("company_id", companyId);

      if (existingError) {
        throw existingError;
      }

      const existing = existingCustomers || [];

      let imported = 0;
      let skipped = 0;
      let ledgerEntries = 0;

      for (const row of rows) {
        const duplicate = existing.find((customer) => {
          const sameName =
            customer.name.trim().toLowerCase() ===
            row.name.trim().toLowerCase();

          const sameMobile =
            row.mobile &&
            customer.mobile &&
            customer.mobile.trim() === row.mobile.trim();

          const samePhone =
            row.phone &&
            customer.phone &&
            customer.phone.trim() === row.phone.trim();

          return sameName || sameMobile || samePhone;
        });

        if (duplicate) {
          skipped++;
          continue;
        }

        const { data: customer, error: customerError } =
          await supabase
            .from("customers")
            .insert({
              company_id: companyId,
              name: row.name,
              mobile: row.mobile || null,
              phone: row.phone || null,
              address: row.address || null,
              gst_number: row.gst_number || null,
              credit_limit: row.credit_limit,
              opening_balance: row.opening_balance,
              notes: row.notes || null,
              active: true,
            })
            .select("id")
            .single();

        if (customerError) {
          throw customerError;
        }

        imported++;

        if (row.opening_balance > 0) {
          const { error: ledgerError } = await supabase
            .from("party_ledger")
            .insert({
              company_id: companyId,
              customer_id: customer.id,
              supplier_id: null,
              transaction_date: new Date()
                .toISOString()
                .slice(0, 10),
              transaction_type: "OPENING_BALANCE",
              reference_id: null,
              description: "Opening balance imported from previous software",
              debit: row.opening_balance,
              credit: 0,
            });

          if (ledgerError) {
            throw ledgerError;
          }

          ledgerEntries++;
        }

        existing.push({
          id: customer.id,
          name: row.name,
          mobile: row.mobile || null,
          phone: row.phone || null,
        });
      }

      setMessage(
        `Import complete: ${imported} customers imported, ${skipped} duplicates skipped, ${ledgerEntries} opening balance entries created.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Customer import failed."
      );
    } finally {
      setLoading(false);
    }
  }

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
            Imported data sirf aapki company account ke andar rahega.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {importOptions.map((item) => (
            <button
              key={item.title}
              onClick={() => {
                setSelected(item.title);
                setFile(null);
                setRows([]);
                setMessage("");
              }}
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
              Excel ya CSV file select karein.
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
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];

                  if (selectedFile) {
                    setFile(selectedFile);
                    setRows([]);
                    setMessage("");
                    setPreviewReady(false);
                  }
                }}
              />
            </label>

            {file && !previewReady && (
              <button
                type="button"
                onClick={() => handleFile(file)}
                className="mt-4 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
              >
                Continue to Preview →
              </button>
            )}

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

            {message && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {message}
              </div>
            )}

            {rows.length > 0 && selected === "Customers" && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Import Preview
                    </h3>

                    <p className="text-sm text-slate-500">
                      {rows.length} customer records found
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={importCustomers}
                    disabled={loading}
                    className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Importing..."
                      : "Import Customers →"}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="p-3">Name</th>
                        <th className="p-3">Mobile</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">GSTIN</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Credit Limit</th>
                        <th className="p-3">Opening Balance</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3 font-medium">
                            {row.name}
                          </td>
                          <td className="p-3">{row.mobile || "-"}</td>
                          <td className="p-3">{row.phone || "-"}</td>
                          <td className="p-3">
                            {row.gst_number || "-"}
                          </td>
                          <td className="p-3">
                            {row.address || "-"}
                          </td>
                          <td className="p-3">
                            ₹{row.credit_limit.toFixed(2)}
                          </td>
                          <td className="p-3 font-semibold">
                            ₹{row.opening_balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
