"use client";

import { useEffect, useState } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

const STORAGE_KEY = "company_invoice_settings";

type Settings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  invoicePrefix: string;
  defaultBagSize: string;
  currency: string;
};

const defaultSettings: Settings = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  gstNumber: "",
  invoicePrefix: "INV",
  defaultBagSize: "50",
  currency: "INR",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    try {
      const companyId = await getCurrentCompanyId();

      if (!companyId) {
        alert("Company not found.");
        return;
      }

      const { data: company, error } = await supabase
        .from("companies")
        .select("name,address,phone,email,gst_number")
        .eq("id", companyId)
        .maybeSingle();

      if (error) {
        alert("Company settings load error: " + error.message);
        return;
      }

      let localSettings: Partial<Settings> = {};

      try {
        const savedSettings = localStorage.getItem(STORAGE_KEY);

        if (savedSettings) {
          localSettings = JSON.parse(savedSettings);
        }
      } catch (error) {
        console.error("Local settings load error:", error);
      }

      setSettings({
        ...defaultSettings,
        ...localSettings,
        companyName: company?.name || "",
        address: company?.address || "",
        phone: company?.phone || "",
        email: company?.email || "",
        gstNumber: company?.gst_number || "",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof Settings, value: string) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setSaved(false);

    try {
      const companyId = await getCurrentCompanyId();

      if (!companyId) {
        alert("Company not found.");
        return;
      }

      const { error } = await supabase
        .from("companies")
        .update({
          name: settings.companyName.trim(),
          address: settings.address.trim() || null,
          phone: settings.phone.trim() || null,
          email: settings.email.trim() || null,
          gst_number: settings.gstNumber.trim() || null,
        })
        .eq("id", companyId);

      if (error) {
        alert("Company settings save error: " + error.message);
        return;
      }

      const localSettings = {
        invoicePrefix: settings.invoicePrefix,
        defaultBagSize: settings.defaultBagSize,
        currency: settings.currency,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(localSettings));

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading company settings...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <SettingsIcon size={17} />
            System
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your company and invoice settings.
          </p>
        </div>

        <form onSubmit={saveSettings} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-slate-900">
                Company Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                These details belong to the currently logged-in business.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Company Name"
                value={settings.companyName}
                onChange={(value) => updateField("companyName", value)}
                placeholder="Enter company name"
              />

              <Field
                label="Phone Number"
                value={settings.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="9876543210"
              />

              <Field
                label="Email"
                type="email"
                value={settings.email}
                onChange={(value) => updateField("email", value)}
                placeholder="info@example.com"
              />

              <Field
                label="GST Number"
                value={settings.gstNumber}
                onChange={(value) =>
                  updateField("gstNumber", value.toUpperCase())
                }
                placeholder="GSTIN"
              />

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Company Address
                </label>

                <textarea
                  value={settings.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  rows={3}
                  placeholder="Enter complete company address"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-slate-900">
                Invoice & Product Defaults
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Default values used by this business.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Invoice Prefix"
                value={settings.invoicePrefix}
                onChange={(value) =>
                  updateField("invoicePrefix", value.toUpperCase())
                }
                placeholder="INV"
              />

              <Field
                label="Default Bag Size (KG)"
                type="number"
                value={settings.defaultBagSize}
                onChange={(value) =>
                  updateField("defaultBagSize", value)
                }
                placeholder="50"
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Currency
                </label>

                <select
                  value={settings.currency}
                  onChange={(e) =>
                    updateField("currency", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {saved && (
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                Settings saved successfully
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
      />
    </div>
  );
}
