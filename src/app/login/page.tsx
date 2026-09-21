"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const user = authData.user;

    if (!user) {
      setLoading(false);
      setError("Login failed. Please try again.");
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("company_id, companies(name, approval_status)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Unable to check business approval status.");
      return;
    }

    if (!membership) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("No business account is linked to this login.");
      return;
    }

    const company = Array.isArray(membership.companies)
      ? membership.companies[0]
      : membership.companies;

    if (company?.approval_status === "pending") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Your business account is pending admin approval.");
      return;
    }

    if (company?.approval_status === "rejected") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Your business account has been rejected by admin.");
      return;
    }

    if (company?.approval_status !== "approved") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Your business account is not approved.");
      return;
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-white text-2xl font-bold shadow-lg">
              M
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              MURLI
            </h1>

            <p className="mt-1 text-slate-500">
              Cattle Feed Management System
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white shadow-md hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login"}
            </button>

          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => window.location.href = "/signup/"}
              className="text-sm font-semibold text-green-600 hover:text-green-700"
            >
              Create Business Account
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            FEEDORA • Smart Feed Business Management
          </p>

        </div>
      </div>
    </main>
  );
}
