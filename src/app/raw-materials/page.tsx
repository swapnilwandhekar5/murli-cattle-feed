"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

type RawMaterial = {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  purchase_rate: number;
  supplier_name: string | null;
  active: boolean;
};

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("KG");
  const [stock, setStock] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [rate, setRate] = useState("");
  const [supplier, setSupplier] = useState("");

  async function loadMaterials() {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("raw_materials")
      .select(
        "id, name, code, unit, current_stock, minimum_stock, purchase_rate, supplier_name, active"
      )
      .eq("active", true)
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      alert("Error loading materials: " + error.message);
    } else {
      setMaterials(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();

    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      alert("Company information nahi mili. Please login again.");
      return;
    }

    if (!name.trim()) {
      alert("Material name is required");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("raw_materials").insert({
      company_id: companyId,
      name: name.trim(),
      code: code.trim() || null,
      unit,
      current_stock: Number(stock) || 0,
      minimum_stock: Number(minimumStock) || 0,
      purchase_rate: Number(rate) || 0,
      supplier_name: supplier.trim() || null,
      active: true,
    });

    if (error) {
      alert("Error saving material: " + error.message);
    } else {
      alert("Raw material added successfully");

      setName("");
      setCode("");
      setUnit("KG");
      setStock("");
      setMinimumStock("");
      setRate("");
      setSupplier("");

      await loadMaterials();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-700">
            MURLI
          </h1>
          <p className="text-slate-500">
            Raw Material Management
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold text-slate-800">
              Add Raw Material
            </h2>

            <form onSubmit={addMaterial} className="space-y-4">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Material Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maize"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Material Code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. RM001"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-xl border p-3"
                >
                  <option value="KG">KG</option>
                  <option value="LITRE">Litre</option>
                  <option value="PCS">PCS</option>
                  <option value="BAG">Bag</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Current Stock
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Minimum Stock Alert
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Purchase Rate / Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Supplier Name
                </label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-green-600 p-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Raw Material"}
              </button>

            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Raw Material Stock
              </h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                {materials.length} Materials
              </span>
            </div>

            {loading ? (
              <p className="py-10 text-center text-slate-500">
                Loading materials...
              </p>
            ) : materials.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-10 text-center">
                <div className="mb-2 text-4xl">📦</div>
                <p className="font-medium text-slate-600">
                  No raw materials added yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left">
                  <thead>
                    <tr className="border-b text-sm text-slate-500">
                      <th className="p-3">Material</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Min Stock</th>
                      <th className="p-3">Rate</th>
                      <th className="p-3">Supplier</th>
                    </tr>
                  </thead>

                  <tbody>
                    {materials.map((material) => {
                      const lowStock =
                        Number(material.current_stock) <=
                        Number(material.minimum_stock);

                      return (
                        <tr
                          key={material.id}
                          className="border-b last:border-0"
                        >
                          <td className="p-3 font-semibold">
                            {material.name}
                          </td>

                          <td className="p-3 text-slate-500">
                            {material.code || "-"}
                          </td>

                          <td
                            className={`p-3 font-semibold ${
                              lowStock
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {Number(material.current_stock).toFixed(3)}{" "}
                            {material.unit}
                          </td>

                          <td className="p-3">
                            {Number(material.minimum_stock).toFixed(3)}
                          </td>

                          <td className="p-3">
                            Rs. {Number(material.purchase_rate).toFixed(2)}
                          </td>

                          <td className="p-3 text-slate-600">
                            {material.supplier_name || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
