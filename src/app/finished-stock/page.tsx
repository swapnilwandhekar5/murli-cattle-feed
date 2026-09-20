"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FinishedStock = {
  id: string;
  batch_number: string | null;
  quantity_bags: number;
  quantity_kg: number;
  bag_size_kg: number;
  manufacturing_date: string | null;
  expiry_date: string | null;
  products: { name: string; code: string }[] | null;
};

export default function FinishedStockPage() {
  const [stock, setStock] = useState<FinishedStock[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStock() {
    setLoading(true);

    const { data, error } = await supabase
      .from("finished_goods_stock")
      .select(`
        id,
        batch_number,
        quantity_bags,
        quantity_kg,
        bag_size_kg,
        manufacturing_date,
        expiry_date,
        products (
          name,
          code
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Finished stock load error: " + error.message);
    } else {
      setStock((data || []) as FinishedStock[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStock();
  }, []);

  const totalBags = stock.reduce(
    (sum, item) => sum + Number(item.quantity_bags || 0),
    0
  );

  const totalKg = stock.reduce(
    (sum, item) => sum + Number(item.quantity_kg || 0),
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Finished Goods Stock
            </h1>
            <p className="mt-1 text-gray-600">
              Produced cattle feed stock and batch-wise inventory
            </p>
          </div>

          <button
            onClick={loadStock}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Total Stock Entries</p>
            <p className="mt-2 text-3xl font-bold">{stock.length}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Total Bags</p>
            <p className="mt-2 text-3xl font-bold">{totalBags}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Total Quantity</p>
            <p className="mt-2 text-3xl font-bold">{totalKg} KG</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading stock...
            </div>
          ) : stock.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No finished goods stock available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Batch No.</th>
                    <th className="px-4 py-3">Bags</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Bag Size</th>
                    <th className="px-4 py-3">Manufacturing Date</th>
                    <th className="px-4 py-3">Expiry Date</th>
                  </tr>
                </thead>

                <tbody>
                  {stock.map((item) => {
                    const product = item.products?.[0];

                    return (
                      <tr
                        key={item.id}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-medium">
                          {product?.name || "-"}
                          <div className="text-xs text-gray-500">
                            {product?.code || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {item.batch_number || "-"}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {Number(item.quantity_bags || 0)}
                        </td>

                        <td className="px-4 py-3">
                          {Number(item.quantity_kg || 0)} KG
                        </td>

                        <td className="px-4 py-3">
                          {Number(item.bag_size_kg || 0)} KG
                        </td>

                        <td className="px-4 py-3">
                          {item.manufacturing_date || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {item.expiry_date || "-"}
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
    </main>
  );
}
