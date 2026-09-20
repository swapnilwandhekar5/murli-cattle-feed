"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  code: string | null;
  bag_size_kg: number;
  active: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [bagSize, setBagSize] = useState("50");

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, code, bag_size_kg, active")
      .eq("active", true)
      .order("name");

    if (error) {
      alert("Error loading products: " + error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Product name is required");
      return;
    }

    if (!Number(bagSize) || Number(bagSize) <= 0) {
      alert("Enter a valid bag size");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      code: code.trim() || null,
      bag_size_kg: Number(bagSize),
      active: true,
    });

    if (error) {
      alert("Error saving product: " + error.message);
    } else {
      alert("Product added successfully");

      setName("");
      setCode("");
      setBagSize("50");

      await loadProducts();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-700">
            MURLI
          </h1>
          <p className="text-slate-500">
            Product & Bag Management
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">
              Add Product
            </h2>

            <form onSubmit={addProduct} className="space-y-4">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MURLI Dairy Feed"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product Code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. PF001"
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Bag Size (KG) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bagSize}
                  onChange={(e) => setBagSize(e.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-green-600 p-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Product"}
              </button>

            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow md:col-span-2">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Products
              </h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                {products.length} Products
              </span>
            </div>

            {loading ? (
              <p className="py-10 text-center text-slate-500">
                Loading products...
              </p>
            ) : products.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-10 text-center">
                <div className="mb-2 text-4xl">🏭</div>
                <p className="text-slate-600">
                  No products added yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-sm text-slate-500">
                      <th className="p-3">Product</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Bag Size</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b last:border-0"
                      >
                        <td className="p-3 font-semibold">
                          {product.name}
                        </td>

                        <td className="p-3 text-slate-500">
                          {product.code || "-"}
                        </td>

                        <td className="p-3">
                          {Number(product.bag_size_kg).toFixed(2)} KG
                        </td>

                        <td className="p-3">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
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
