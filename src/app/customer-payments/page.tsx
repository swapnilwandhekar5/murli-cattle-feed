"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
};

type LedgerEntry = {
  id: string;
  customer_id: string | null;
  transaction_date: string;
  transaction_type: string;
  description: string | null;
  debit: number;
  credit: number;
};

export default function CustomerPaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,phone")
      .order("name");

    if (error) {
      alert("Customers load error: " + error.message);
      return;
    }

    setCustomers(data || []);
  }

  async function loadCustomerLedger(id: string) {
    if (!id) {
      setEntries([]);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("party_ledger")
      .select(
        "id,customer_id,transaction_date,transaction_type,description,debit,credit"
      )
      .eq("customer_id", id)
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      alert("Ledger load error: " + error.message);
      setEntries([]);
    } else {
      setEntries(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadCustomerLedger(customerId);
  }, [customerId]);

  const totalDebit = entries.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0
  );

  const totalCredit = entries.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );

  const outstanding = Math.max(0, totalDebit - totalCredit);

  async function savePayment() {
    if (!customerId) {
      alert("Customer select karein.");
      return;
    }

    const paymentAmount = Number(amount);

    if (paymentAmount <= 0) {
      alert("Payment amount enter karein.");
      return;
    }

    if (paymentAmount > outstanding) {
      alert(
        `Payment outstanding due se zyada nahi ho sakta.\nOutstanding: ₹${outstanding.toFixed(
          2
        )}`
      );
      return;
    }

    if (!paymentMode) {
      alert("Payment mode select karein.");
      return;
    }

    setSaving(true);

    try {
      // Save payment record
      const { data: payment, error: paymentError } =
        await supabase
          .from("payments")
          .insert({
            customer_id: customerId,
            payment_date: paymentDate,
            amount: paymentAmount,
            payment_mode: paymentMode,
            reference_number:
              referenceNumber.trim() || null,
            notes: notes.trim() || null,
          })
          .select("id")
          .single();

      if (paymentError) {
        throw new Error(
          "Payment save error: " + paymentError.message
        );
      }

      // Add payment to customer ledger as credit
      const { error: ledgerError } = await supabase
        .from("party_ledger")
        .insert({
          customer_id: customerId,
          transaction_date: paymentDate,
          transaction_type: "PAYMENT",
          reference_id: payment.id,
          description:
            notes.trim() ||
            `Customer Payment - ${paymentMode}`,
          debit: 0,
          credit: paymentAmount,
        });

      if (ledgerError) {
        // Remove payment record if ledger insert fails
        await supabase
          .from("payments")
          .delete()
          .eq("id", payment.id);

        throw new Error(
          "Payment ledger error: " + ledgerError.message
        );
      }

      alert(
        `Payment saved successfully ✅\n\nAmount: ₹${paymentAmount.toFixed(
          2
        )}\nMode: ${paymentMode}\nRemaining Due: ₹${(
          outstanding - paymentAmount
        ).toFixed(2)}`
      );

      setAmount("");
      setReferenceNumber("");
      setNotes("");

      await loadCustomerLedger(customerId);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Payment save karte waqt error aaya."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Customer Payment
        </h1>

        <p className="mb-6 text-gray-600">
          Customer se received payment record karein.
        </p>

        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Receive Payment
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Customer
              </label>

              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border p-3"
              >
                <option value="">Select Customer</option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.phone
                      ? ` - ${customer.phone}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Payment Date
              </label>

              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Payment Amount (₹)
              </label>

              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Payment Mode
              </label>

              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-lg border p-3"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">
                  Bank Transfer
                </option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Reference Number
              </label>

              <input
                value={referenceNumber}
                onChange={(e) =>
                  setReferenceNumber(e.target.value)
                }
                placeholder="UTR / Cheque No."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Notes
              </label>

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment notes"
                className="w-full rounded-lg border p-3"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-gray-100 p-4">
              <div className="text-sm text-gray-500">
                Total Sale
              </div>

              <div className="text-xl font-bold">
                ₹{totalDebit.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-sm text-gray-500">
                Total Paid
              </div>

              <div className="text-xl font-bold text-green-600">
                ₹{totalCredit.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg bg-red-50 p-4">
              <div className="text-sm text-gray-500">
                Outstanding Due
              </div>

              <div className="text-xl font-bold text-red-600">
                ₹{outstanding.toFixed(2)}
              </div>
            </div>
          </div>

          <button
            onClick={savePayment}
            disabled={saving || loading}
            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving Payment..." : "Receive Payment"}
          </button>
        </section>

        {customerId && (
          <section className="mt-6 rounded-xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Payment / Ledger History
            </h2>

            {loading ? (
              <p>Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-gray-500">
                Ledger empty hai.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-100 text-left">
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Debit</th>
                      <th className="p-3">Credit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b"
                      >
                        <td className="p-3">
                          {entry.transaction_date}
                        </td>

                        <td className="p-3 font-medium">
                          {entry.transaction_type}
                        </td>

                        <td className="p-3">
                          {entry.description || "-"}
                        </td>

                        <td className="p-3">
                          ₹
                          {Number(entry.debit || 0).toFixed(
                            2
                          )}
                        </td>

                        <td className="p-3 text-green-600">
                          ₹
                          {Number(entry.credit || 0).toFixed(
                            2
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
