"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

type Product = {
  id: string;
  name: string;
  code: string;
  bag_size_kg: number;
};

type Material = {
  id: string;
  name: string;
  unit: string;
  purchase_rate: number;
};

type RecipeItem = {
  id: string;
  raw_material_id: string;
  quantity_kg: number;
  raw_material: {
    name: string;
    purchase_rate: number;
  } | null;
};

type Recipe = {
  id: string;
  product_id: string;
  quantity_kg: number;
};

type Production = {
  id: string;
  batch_number: string;
  production_date: string;
  bags_produced: number;
  total_quantity_kg: number;
  raw_material_cost: number;
  labour_cost: number;
  electricity_cost: number;
  packaging_cost: number;
  other_cost: number;
  total_production_cost: number;
  cost_per_bag: number;
  products: {
    name: string;
  }[];
};

export default function ProductionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);

  const [productId, setProductId] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

  const [batchNumber, setBatchNumber] = useState("");
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bagsProduced, setBagsProduced] = useState("");

  const [labourCost, setLabourCost] = useState("");
  const [electricityCost, setElectricityCost] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      setLoading(false);
      return;
    }

    const [productsResult, materialsResult, productionResult] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, name, code, bag_size_kg")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("name"),

        supabase
          .from("raw_materials")
          .select("id, name, unit, purchase_rate")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("name"),

        supabase
          .from("production_batches")
          .select(
            `
            id,
            batch_number,
            production_date,
            bags_produced,
            total_quantity_kg,
            raw_material_cost,
            labour_cost,
            electricity_cost,
            packaging_cost,
            other_cost,
            total_production_cost,
            cost_per_bag,
            products(name)
          `
          )
          .order("production_date", { ascending: false })
          .limit(50),
      ]);

    if (productsResult.error) {
      alert("Products error: " + productsResult.error.message);
    } else {
      setProducts(productsResult.data || []);
    }

    if (materialsResult.error) {
      console.log("Materials:", materialsResult.error.message);
    } else {
      setMaterials(materialsResult.data || []);
    }

    if (productionResult.error) {
      console.log("Production:", productionResult.error.message);
    } else {
      setProductions((productionResult.data as Production[]) || []);
    }

    setLoading(false);
  }

  async function loadRecipe(selectedProductId: string) {
    setProductId(selectedProductId);
    setRecipe(null);
    setRecipeItems([]);

    if (!selectedProductId) return;

    const companyId = await getCurrentCompanyId();
    if (!companyId) return;

    const { data: recipeData, error: recipeError } = await supabase
      .from("recipes")
      .select("id, product_id, quantity_kg")
      .eq("product_id", selectedProductId)
      .eq("company_id", companyId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recipeError) {
      alert("Recipe error: " + recipeError.message);
      return;
    }

    if (!recipeData) {
      alert("Is product ki recipe nahi mili. Pehle Recipe module me recipe save karo.");
      return;
    }

    setRecipe(recipeData);

    const { data: itemsData, error: itemsError } = await supabase
      .from("recipe_items")
      .select(
        `
        id,
        raw_material_id,
        quantity_kg,
        raw_materials(name, purchase_rate)
        `
      )
      .eq("recipe_id", recipeData.id);

    if (itemsError) {
      alert("Recipe items error: " + itemsError.message);
      return;
    }

    const formatted = (itemsData || []).map((item: any) => ({
      id: item.id,
      raw_material_id: item.raw_material_id,
      quantity_kg: Number(item.quantity_kg),
      raw_material: item.raw_materials
        ? {
            name: item.raw_materials.name,
            purchase_rate: Number(item.raw_materials.purchase_rate || 0),
          }
        : null,
    }));

    setRecipeItems(formatted);
  }

  const bags = Number(bagsProduced || 0);
  const bagSize = Number(selectedProduct?.bag_size_kg || 0);
  const totalQuantity = bags * bagSize;

  const calculatedItems = useMemo(() => {
    return recipeItems.map((item) => {
      const recipeQty = Number(item.quantity_kg || 0);
      const recipeTotal = Number(recipe?.quantity_kg || bagSize || 0);
      const requiredQty =
        recipeTotal > 0 ? (recipeQty / recipeTotal) * totalQuantity : 0;

      const rate = Number(item.raw_material?.purchase_rate || 0);
      const totalCost = requiredQty * rate;

      return {
        ...item,
        requiredQty,
        rate,
        totalCost,
      };
    });
  }, [recipeItems, recipe, bagSize, totalQuantity]);

  const rawMaterialCost = calculatedItems.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );

  const labour = Number(labourCost || 0);
  const electricity = Number(electricityCost || 0);
  const packaging = Number(packagingCost || 0);
  const other = Number(otherCost || 0);

  const totalProductionCost =
    rawMaterialCost + labour + electricity + packaging + other;

  const costPerBag = bags > 0 ? totalProductionCost / bags : 0;

  async function saveProduction() {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company information nahi mili. Please login again.");
      return;
    }

    if (!productId) {
      alert("Product select karo");
      return;
    }

    if (!recipe) {
      alert("Recipe nahi mili");
      return;
    }

    if (bags <= 0) {
      alert("Bags produced 0 se greater hona chahiye");
      return;
    }

    if (!batchNumber.trim()) {
      alert("Batch number enter karo");
      return;
    }

    if (calculatedItems.length === 0) {
      alert("Recipe me ingredients nahi hain");
      return;
    }

    setSaving(true);

    const { data: production, error: productionError } = await supabase
      .from("production_batches")
      .insert({
        company_id: companyId,
        product_id: productId,
        recipe_id: recipe.id,
        batch_number: batchNumber.trim(),
        production_date: productionDate,
        bags_produced: bags,
        total_quantity_kg: totalQuantity,
        raw_material_cost: rawMaterialCost,
        labour_cost: labour,
        electricity_cost: electricity,
        packaging_cost: packaging,
        other_cost: other,
        total_production_cost: totalProductionCost,
        cost_per_bag: costPerBag,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (productionError) {
      alert("Production error: " + productionError.message);
      setSaving(false);
      return;
    }

    const productionItems = calculatedItems.map((item) => ({
      company_id: companyId,
      production_id: production.id,
      raw_material_id: item.raw_material_id,
      quantity_used_kg: item.requiredQty,
      rate_per_kg: item.rate,
      total_cost: item.totalCost,
    }));

    const { error: itemsError } = await supabase
      .from("production_items")
      .insert(productionItems);

    if (itemsError) {
      await supabase
        .from("production_batches")
        .delete()
        .eq("id", production.id)
        .eq("company_id", companyId);

      alert("Production items error: " + itemsError.message);
      setSaving(false);
      return;
    }

    // Deduct consumed raw materials from current stock
    for (const item of calculatedItems) {
      const material = materials.find(
        (m) => m.id === item.raw_material_id
      );

      if (!material) {
        await supabase
          .from("production_batches")
          .delete()
          .eq("id", production.id)
          .eq("company_id", companyId);

        await supabase
          .from("production_items")
          .delete()
          .eq("production_id", production.id)
          .eq("company_id", companyId);

        alert("Raw material not found.");
        setSaving(false);
        return;
      }

      const currentStock = Number(
        (await supabase
          .from("raw_materials")
          .select("current_stock")
          .eq("id", item.raw_material_id)
          .eq("company_id", companyId)
          .single()).data?.current_stock || 0
      );

      const newStock = currentStock - item.requiredQty;

      if (newStock < 0) {
        await supabase
          .from("production_batches")
          .delete()
          .eq("id", production.id)
          .eq("company_id", companyId);

        await supabase
          .from("production_items")
          .delete()
          .eq("production_id", production.id)
          .eq("company_id", companyId);

        alert(
          `${material.name} ka stock insufficient hai. Available: ${currentStock.toFixed(
            3
          )} KG, Required: ${item.requiredQty.toFixed(3)} KG`
        );
        setSaving(false);
        return;
      }

      const { error: stockError } = await supabase
        .from("raw_materials")
        .update({
          current_stock: newStock,
        })
        .eq("id", item.raw_material_id)
        .eq("company_id", companyId);

      if (stockError) {
        alert("Stock update error: " + stockError.message);
        setSaving(false);
        return;
      }
    }

    // Add produced quantity to Finished Goods Stock
    const { error: finishedStockError } = await supabase
      .from("finished_goods_stock")
      .insert({
        company_id: companyId,
        product_id: productId,
        batch_number: batchNumber,
        quantity_bags: Number(bagsProduced),
        quantity_kg: totalQuantity,
        bag_size_kg: selectedProduct?.bag_size_kg || 0,
        manufacturing_date: productionDate,
      });

    if (finishedStockError) {
      alert("Finished goods stock update error: " + finishedStockError.message);
      setSaving(false);
      return;
    }

    alert("Production saved successfully ✅ Raw material stock deducted + Finished stock added.");

    setProductId("");
    setRecipe(null);
    setRecipeItems([]);
    setBatchNumber("");
    setBagsProduced("");
    setLabourCost("");
    setElectricityCost("");
    setPackagingCost("");
    setOtherCost("");
    setNotes("");

    await loadData();

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="rounded-xl bg-white p-6 shadow">
          Loading Production...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Production Management
          </h1>
          <p className="mt-1 text-slate-600">
            Recipe ke basis par production cost aur raw-material consumption.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">Create Production Batch</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => loadRecipe(e.target.value)}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.bag_size_kg} KG
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Batch Number
                </label>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-001"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Production Date
                </label>
                <input
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Bags Produced
                </label>
                <input
                  type="number"
                  min="1"
                  value={bagsProduced}
                  onChange={(e) => setBagsProduced(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <h3 className="mb-3 font-bold">Raw Material Consumption</h3>

              {recipeItems.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Product select karne ke baad recipe ingredients yahan
                  dikhenge.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2">Material</th>
                        <th className="p-2">Recipe KG</th>
                        <th className="p-2">Required KG</th>
                        <th className="p-2">Rate/KG</th>
                        <th className="p-2">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculatedItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">
                            {item.raw_material?.name || "Unknown"}
                          </td>
                          <td className="p-2">
                            {item.quantity_kg.toFixed(3)}
                          </td>
                          <td className="p-2 font-semibold">
                            {item.requiredQty.toFixed(3)}
                          </td>
                          <td className="p-2">
                            ₹{item.rate.toFixed(2)}
                          </td>
                          <td className="p-2">
                            ₹{item.totalCost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Labour Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={labourCost}
                  onChange={(e) => setLabourCost(e.target.value)}
                  placeholder="₹"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Electricity Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={electricityCost}
                  onChange={(e) => setElectricityCost(e.target.value)}
                  placeholder="₹"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Packaging Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  placeholder="₹"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Other Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  placeholder="₹"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Production notes..."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <button
              onClick={saveProduction}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-green-600 p-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Production"}
            </button>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">Production Summary</h2>

            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Total Quantity</div>
                <div className="text-2xl font-bold">
                  {totalQuantity.toFixed(2)} KG
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-sm text-slate-500">
                  Raw Material Cost
                </div>
                <div className="text-2xl font-bold">
                  ₹{rawMaterialCost.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-sm text-slate-500">
                  Other Production Costs
                </div>
                <div className="text-2xl font-bold">
                  ₹
                  {(labour + electricity + packaging + other).toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <div className="text-sm text-green-700">
                  Total Production Cost
                </div>
                <div className="text-3xl font-bold text-green-800">
                  ₹{totalProductionCost.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Cost Per Bag</div>
                <div className="text-3xl font-bold text-blue-800">
                  ₹{costPerBag.toFixed(2)}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Production History</h2>

          {productions.length === 0 ? (
            <p className="text-slate-500">No production records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">Date</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Bags</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Total Cost</th>
                    <th className="p-3">Cost/Bag</th>
                  </tr>
                </thead>
                <tbody>
                  {productions.map((production) => (
                    <tr key={production.id} className="border-b">
                      <td className="p-3">{production.production_date}</td>
                      <td className="p-3 font-medium">
                        {production.batch_number}
                      </td>
                      <td className="p-3">
                        {production.products?.[0]?.name || "-"}
                      </td>
                      <td className="p-3">{production.bags_produced}</td>
                      <td className="p-3">
                        {Number(production.total_quantity_kg).toFixed(2)} KG
                      </td>
                      <td className="p-3">
                        ₹{Number(production.total_production_cost).toFixed(2)}
                      </td>
                      <td className="p-3 font-semibold">
                        ₹{Number(production.cost_per_bag).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
