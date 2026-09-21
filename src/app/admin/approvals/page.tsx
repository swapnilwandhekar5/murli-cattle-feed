"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  address: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminApprovalsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadCompanies() {
    setLoading(true);
    setError("");

    const { data: userData } = await supabase.auth.getUser();

    if (userData.user?.email !== "murlicowfeed@gmail.com") {
      setError("Access denied. Super Admin only.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, email, phone, gst_number, address, approval_status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setCompanies((data ?? []) as Company[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function updateApproval(
    companyId: string,
    status: "approved" | "rejected"
  ) {
    setUpdatingId(companyId);
    setMessage("");
    setError("");

    const { error } = await supabase
      .from("companies")
      .update({ approval_status: status })
      .eq("id", companyId);

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        status === "approved"
          ? "Business approved successfully."
          : "Business rejected successfully."
      );

      await loadCompanies();
    }

    setUpdatingId(null);
  }

  const pendingCompanies = companies.filter(
    (company) => company.approval_status === "pending"
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-green-600">
            FEEDORA ADMIN
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Business Approvals
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review new business registrations and approve or reject access.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">
              {pendingCompanies.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {companies.filter(
                (company) => company.approval_status === "approved"
              ).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="mt-1 text-3xl font-bold text-red-600">
              {companies.filter(
                (company) => company.approval_status === "rejected"
              ).length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Pending Business Accounts
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading businesses...
            </div>
          ) : pendingCompanies.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No pending business accounts.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {pendingCompanies.map((company) => (
                <div
                  key={company.id}
                  className="p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {company.name}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-slate-500">
                        <p>
                          <span className="font-semibold text-slate-700">
                            Email:
                          </span>{" "}
                          {company.email || "-"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-700">
                            Mobile:
                          </span>{" "}
                          {company.phone || "-"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-700">
                            GST:
                          </span>{" "}
                          {company.gst_number || "-"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-700">
                            Address:
                          </span>{" "}
                          {company.address || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          updateApproval(company.id, "approved")
                        }
                        disabled={updatingId === company.id}
                        className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
                      >
                        {updatingId === company.id
                          ? "Updating..."
                          : "Approve"}
                      </button>

                      <button
                        onClick={() =>
                          updateApproval(company.id, "rejected")
                        }
                        disabled={updatingId === company.id}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
