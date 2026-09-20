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
  reference_id: string | null;
  description: string | null;
  debit: number;
  credit: number;
};

export default function CustomerLedgerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function loadLedger(customerId: string) {
    if (!customerId) {
      setEntries([]);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("party_ledger")
      .select(
        "id,customer_id,transaction_date,transaction_type,reference_id,description,debit,credit"
      )
      .eq("customer_id", customerId)
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
    loadLedger(selectedCustomer);
  }, [selectedCustomer]);

  const totalDebit = entries.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0
  );

  const totalCredit = entries.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );

  const outstanding = totalDebit - totalCredit;

  const selectedCustomerData = customers.find(
    (customer) => customer.id === selectedCustomer
  );

  let runningBalance = 0;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Customer Ledger
        </h1>

        <p className="mb-6 text-gray-600">
          Customer-wise sale, payment aur outstanding due track karein.
        </p>

        <section className="rounded-xl bg-white p-5 shadow">
          <label className="mb-2 block text-sm font-medium">
            Select Customer
          </label>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full max-w-xl rounded-lg border p-3"
          >
            <option value="">Select Customer</option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.phone ? ` - ${customer.phone}` : ""}
              </option>
            ))}
          </select>
        </section>

        {selectedCustomer && (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow">
                <div className="text-sm text-gray-500">
                  Customer
                </div>
                <div className="mt-1 text-lg font-bold">
                  {selectedCustomerData?.name || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <div className="text-sm text-gray-500">
                  Total Sale
                </div>
                <div className="mt-1 text-xl font-bold">
                  ₹{totalDebit.toFixed(2)}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <div className="text-sm text-gray-500">
                  Total Paid
                </div>
                <div className="mt-1 text-xl font-bold text-green-600">
                  ₹{totalCredit.toFixed(2)}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <div className="text-sm text-gray-500">
                  Outstanding Due
                </div>
                <div className="mt-1 text-xl font-bold text-red-600">
                  ₹{outstanding.toFixed(2)}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-semibold">
                Ledger Entries
              </h2>

              {loading ? (
                <p>Loading ledger...</p>
              ) : entries.length === 0 ? (
                <p className="text-gray-500">
                  Is customer ka ledger abhi empty hai.
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
                        <th className="p-3">Balance</th>
                      </tr>
                    </thead>

                    <tbody>
                      {entries.map((entry) => {
                        runningBalance +=
                          Number(entry.debit || 0) -
                          Number(entry.credit || 0);

                        return (
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

                            <td className="p-3 font-semibold text-red-600">
                              ₹{runningBalance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
