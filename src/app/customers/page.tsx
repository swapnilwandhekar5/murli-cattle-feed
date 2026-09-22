"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";
import {
  Plus,
  Search,
  Users,
  X,
  Pencil,
  Phone,
  MapPin,
  ReceiptText,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  opening_balance?: number | null;
  created_at?: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  async function loadCustomers() {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Customer load error:", error);
      setCustomers([]);
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstNumber("");
    setOpeningBalance("0");
    setEditingId(null);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(customer: Customer) {
    setEditingId(customer.id);
    setName(customer.name || "");
    setPhone(customer.phone || "");
    setEmail(customer.email || "");
    setAddress(customer.address || "");
    setGstNumber(customer.gst_number || "");
    setOpeningBalance(String(customer.opening_balance || 0));
    setShowForm(true);
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();

    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      alert("Company information nahi mili. Please login again.");
      return;
    }

    if (!name.trim()) {
      alert("Customer name required");
      return;
    }

    const customerData = {
      company_id: companyId,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      gst_number: gstNumber.trim() || null,
      opening_balance: Number(openingBalance) || 0,
    };

    if (editingId) {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editingId)
        .eq("company_id", companyId);

      if (error) {
        alert("Customer update error: " + error.message);
        return;
      }

      alert("Customer updated successfully.");
    } else {
      const { error } = await supabase
        .from("customers")
        .insert(customerData);

      if (error) {
        alert("Customer save error: " + error.message);
        return;
      }

      alert("Customer added successfully.");
    }

    resetForm();
    setShowForm(false);
    await loadCustomers();
  }

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.phone || ""} ${
      customer.gst_number || ""
    } ${customer.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Users size={17} />
              Sales & Customers
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Customers
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage customer master data and account details.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Customer
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
              placeholder="Search customer by name, phone or GST..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Customers"
            value={customers.length.toLocaleString("en-IN")}
          />

          <SummaryCard
            title="With GST"
            value={customers
              .filter((customer) => customer.gst_number)
              .length.toLocaleString("en-IN")}
          />

          <SummaryCard
            title="Total Opening Balance"
            value={`₹${customers
              .reduce(
                (sum, customer) =>
                  sum + Number(customer.opening_balance || 0),
                0
              )
              .toLocaleString("en-IN")}`}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Address
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    GST Number
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Opening Balance
                  </th>

                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">
                          {customer.name}
                        </div>

                        {customer.email && (
                          <div className="text-xs text-slate-400">
                            {customer.email}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone size={14} />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      <td className="max-w-[220px] px-5 py-4">
                        {customer.address ? (
                          <div className="flex gap-1.5 text-sm text-slate-600">
                            <MapPin
                              size={14}
                              className="mt-0.5 shrink-0"
                            />
                            <span className="truncate">
                              {customer.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {customer.gst_number || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        ₹
                        {Number(
                          customer.opening_balance || 0
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEditForm(customer)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
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
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <ReceiptText size={15} />
                  Customer Master
                </div>

                <h2 className="text-xl font-extrabold text-slate-900">
                  {editingId ? "Edit Customer" : "Add Customer"}
                </h2>

                <p className="text-sm text-slate-500">
                  Enter customer account details.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveCustomer} className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Name *"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

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
                {editingId ? "Update Customer" : "Save Customer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </div>

      <div className="mt-1 text-2xl font-extrabold text-slate-900">
        {value}
      </div>
    </div>
  );
}
