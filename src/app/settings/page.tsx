"use client";

import { useEffect, useState } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";

const STORAGE_KEY = "murli_company_settings";

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
  companyName: "MURLI Cattle Feed",
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

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);

      if (savedSettings) {
        setSettings({
          ...defaultSettings,
          ...JSON.parse(savedSettings),
        });
      }
    } catch (error) {
      console.error("Settings load error:", error);
    }
  }, []);

  function updateField(field: keyof Settings, value: string) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  function saveSettings(e: React.FormEvent) {
    e.preventDefault();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
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
            Manage company and invoice settings for MURLI Cattle Feed.
          </p>
        </div>

        <form onSubmit={saveSettings} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-slate-900">
                Company Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                These details can be used later on invoices and reports.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Company Name"
                value={settings.companyName}
                onChange={(value) => updateField("companyName", value)}
                placeholder="MURLI Cattle Feed"
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
                Default values used by the software.
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
                  <option value="INR">INR - ₹ Indian Rupee</option>
                  <option value="USD">USD - $ US Dollar</option>
                  <option value="AED">AED - د.إ UAE Dirham</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {saved && (
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                ✓ Settings saved successfully
              </div>
            )}

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
            >
              <Save size={18} />
              Save Settings
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
