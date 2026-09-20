"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CreditCard, IndianRupee, Save } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
};

type LedgerEntry = {
  id: string;
  supplier_id: string;
  transaction_date: string;
  transaction_type: string;
  description: string | null;
  debit: number | null;
  credit: number | null;
};

type Payment = {
  id: string;
  supplier_id: string;
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  reference_number: string | null;
  notes: string | null;
};

export default function SupplierPaymentsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [{ data: supplierData }, { data: ledgerData }, { data: paymentData }] =
      await Promise.all([
        supabase
          .from("suppliers")
          .select("id,name")
          .order("name"),
        supabase
          .from("party_ledger")
          .select("*")
          .not("supplier_id", "is", null)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .not("supplier_id", "is", null)
          .order("payment_date", { ascending: false }),
      ]);

    setSuppliers(supplierData || []);
    setLedger(ledgerData || []);
    setPayments(paymentData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const supplierLedger = ledger.filter(
    (entry) => entry.supplier_id === supplierId
  );

  const outstanding = supplierLedger.reduce(
    (total, entry) =>
      total +
      Number(entry.debit || 0) -
      Number(entry.credit || 0),
    0
  );

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      alert("Please select supplier");
      return;
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      alert("Please enter valid payment amount");
      return;
    }

    if (paymentAmount > outstanding) {
      alert("Payment cannot be greater than supplier outstanding.");
      return;
    }

    setLoading(true);

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        supplier_id: supplierId,
        payment_date: paymentDate,
        amount: paymentAmount,
        payment_mode: paymentMode,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (paymentError) {
      alert("Payment save error: " + paymentError.message);
      setLoading(false);
      return;
    }

    const { error: ledgerError } = await supabase
      .from("party_ledger")
      .insert({
        supplier_id: supplierId,
        transaction_date: paymentDate,
        transaction_type: "PAYMENT",
        reference_id: payment.id,
        description: `Supplier Payment - ${paymentMode}`,
        debit: 0,
        credit: paymentAmount,
      });

    if (ledgerError) {
      await supabase.from("payments").delete().eq("id", payment.id);

      alert("Supplier ledger error: " + ledgerError.message);
      setLoading(false);
      return;
    }

    setAmount("");
    setReferenceNumber("");
    setNotes("");

    await loadData();

    alert("Supplier payment saved successfully.");
    setLoading(false);
  }

  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === supplierId
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <CreditCard size={17} />
            Accounts
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Supplier Payments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Record supplier payments and automatically update supplier ledger.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <IndianRupee size={20} />
              </div>

              <div>
                <h2 className="font-extrabold text-slate-900">
                  Make Payment
                </h2>
                <p className="text-xs text-slate-400">
                  Supplier payment entry
                </p>
              </div>
            </div>

            <form onSubmit={savePayment} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">
                  Supplier
                </label>

                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Select Supplier</option>

                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-400">
                  CURRENT OUTSTANDING
                </div>

                <div className="mt-1 text-2xl font-extrabold text-slate-900">
                  ₹{outstanding.toLocaleString("en-IN")}
                </div>

                {selectedSupplier && (
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedSupplier.name}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">
                  Payment Date
                </label>

                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">
                  Payment Mode
                </label>

                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Other</option>
                </select>
              </div>

              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Reference / Cheque No. (optional)"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Payment"}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-extrabold text-slate-900">
                Supplier Payment History
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500">
                        Mode
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-slate-400"
                        >
                          No supplier payments yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => {
                        const supplier = suppliers.find(
                          (item) => item.id === payment.supplier_id
                        );

                        return (
                          <tr
                            key={payment.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {payment.payment_date}
                            </td>

                            <td className="px-4 py-4 text-sm font-bold text-slate-800">
                              {supplier?.name || "—"}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {payment.payment_mode || "—"}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-500">
                              {payment.reference_number || "—"}
                            </td>

                            <td className="px-4 py-4 text-right text-sm font-extrabold text-slate-900">
                              ₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
