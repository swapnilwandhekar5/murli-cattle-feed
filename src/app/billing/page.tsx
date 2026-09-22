"use client";

import { useState } from "react";

export default function BillingPage() {
  const [customer, setCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("INV-0001");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-green-600">FEEDORA</p>
            <h1 className="text-2xl font-bold text-slate-900">
              New Tax Invoice
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold"
              >
                🖨️ Print Invoice
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
              >
                📄 Save PDF
              </button>

              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Invoice
              </button>
            </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">

          <div className="border-b-4 border-green-600 p-5">
            <div className="grid gap-5 md:grid-cols-3">

              <div className="md:col-span-2">
                <h2 className="text-xl font-bold text-slate-900">
                  YOUR COMPANY NAME
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Address, City, Maharashtra
                </p>
                <p className="text-sm text-slate-500">
                  Mobile: +91 XXXXX XXXXX | GSTIN: XXXXXXXX
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-900">TAX INVOICE</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <span className="text-slate-500">Invoice No.</span>
                  <input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="rounded border px-2 py-1"
                  />

                  <span className="text-slate-500">Invoice Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded border px-2 py-1"
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="grid gap-5 border-b p-5 md:grid-cols-2">

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Bill To
              </p>

              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Search / Select Customer"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input
                  placeholder="Customer GSTIN"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  placeholder="Mobile Number"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <textarea
                placeholder="Customer Address"
                rows={2}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Payment Details
              </p>

              <select className="w-full rounded-lg border px-3 py-2 text-sm">
                <option>Credit</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
              </select>

              <input
                placeholder="Payment Reference"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-3 text-left">Sr.</th>
                  <th className="px-3 py-3 text-left">Product / Description</th>
                  <th className="px-3 py-3 text-left">HSN</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Rate</th>
                  <th className="px-3 py-3 text-right">Discount</th>
                  <th className="px-3 py-3 text-right">Taxable</th>
                  <th className="px-3 py-3 text-right">GST</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-4">1</td>
                  <td className="px-3 py-4">
                    <input
                      placeholder="Select Product"
                      className="w-full rounded border px-2 py-2"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <input
                      placeholder="HSN"
                      className="w-20 rounded border px-2 py-2"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <input
                      type="number"
                      defaultValue="1"
                      className="w-20 rounded border px-2 py-2 text-right"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-24 rounded border px-2 py-2 text-right"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <input
                      type="number"
                      defaultValue="0"
                      className="w-24 rounded border px-2 py-2 text-right"
                    />
                  </td>
                  <td className="px-3 py-4 text-right">₹0.00</td>
                  <td className="px-3 py-4 text-right">₹0.00</td>
                  <td className="px-3 py-4 text-right font-bold">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 border-t p-5 md:grid-cols-2">

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Amount in Words
              </p>

              <div className="mt-2 rounded-lg bg-slate-50 p-4 text-sm font-medium">
                Rupees Zero Only
              </div>

              <p className="mt-5 text-xs font-bold uppercase text-slate-500">
                Terms & Conditions
              </p>

              <textarea
                rows={4}
                placeholder="Enter invoice terms and conditions..."
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="ml-auto w-full max-w-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between">
                <span>CGST</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between">
                <span>SGST</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between">
                <span>IGST</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between">
                <span>Round Off</span>
                <span>₹0.00</span>
              </div>

              <div className="mt-3 flex justify-between border-t-2 border-slate-800 pt-3 text-lg font-bold">
                <span>Grand Total</span>
                <span>₹0.00</span>
              </div>

              <div className="mt-3 flex justify-between rounded-lg bg-green-50 p-3 font-bold text-green-800">
                <span>Balance Due</span>
                <span>₹0.00</span>
              </div>
            </div>

          </div>

          <div className="border-t bg-slate-50 p-5 text-right text-sm text-slate-500">
            For YOUR COMPANY NAME
            <div className="mt-8 font-semibold text-slate-800">
              Authorized Signatory
            </div>
          </div>

        </div>
      </div>
    
    <style jsx global>{`
      @media print {
        .no-print {
          display: none !important;
        }

        body {
          background: white !important;
        }

        @page {
          size: A4;
          margin: 10mm;
        }
      }
    `}</style>
    </main>
  );
}

