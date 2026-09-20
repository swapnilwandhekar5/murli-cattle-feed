"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Truck, X } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  opening_balance?: number | null;
  created_at?: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  async function loadSuppliers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setSuppliers([]);
    } else {
      setSuppliers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Supplier name required");
      return;
    }

    const { error } = await supabase.from("suppliers").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      gst_number: gstNumber.trim() || null,
      opening_balance: Number(openingBalance) || 0,
    });

    if (error) {
      alert("Supplier save error: " + error.message);
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstNumber("");
    setOpeningBalance("0");
    setShowForm(false);

    await loadSuppliers();
  }

  const filtered = suppliers.filter((supplier) =>
    `${supplier.name} ${supplier.phone || ""} ${supplier.gst_number || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Truck size={17} />
              Accounts
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Suppliers
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage suppliers and supplier account details.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Supplier
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    GST Number
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Opening Balance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                      Loading suppliers...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">
                          {supplier.name}
                        </div>
                        {supplier.email && (
                          <div className="text-xs text-slate-400">
                            {supplier.email}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.gst_number || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        ₹{Number(supplier.opening_balance || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Add Supplier
                </h2>
                <p className="text-sm text-slate-500">
                  Enter supplier account details.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveSupplier} className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Supplier Name *"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="GST Number"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-slate-400"
              />

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <input
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                type="number"
                min="0"
                placeholder="Opening Balance"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                Save Supplier
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
