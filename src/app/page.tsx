"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [status, setStatus] = useState("Checking Supabase...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from("companies")
        .select("id, name")
        .limit(1);

      if (error) {
        setStatus("Supabase connection error: " + error.message);
      } else {
        setStatus("Supabase Connected Successfully ✅");
      }
    }

    testConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-5xl">🐄</div>

        <h1 className="text-4xl font-bold text-green-700">
          MURLI
        </h1>

        <p className="mt-2 text-slate-500">
          Cattle Feed Management System
        </p>

        <div className="mt-8 rounded-2xl bg-green-50 p-5">
          <p className="font-semibold text-green-700">
            {status}
          </p>
        </div>
      </div>
    </main>
  );
}