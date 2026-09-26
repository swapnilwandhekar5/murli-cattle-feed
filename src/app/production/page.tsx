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
  current_stock: number;
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
  product_id: string;
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
  const [capacityKg, setCapacityKg] = useState("");
  const [bagWeightKg, setBagWeightKg] = useState("");
  const [bagsProduced, setBagsProduced] = useState("");

  const [labourCost, setLabourCost] = useState("");
  const [electricityCost, setElectricityCost] = useState("");
  const [emptyBagCost, setEmptyBagCost] = useState("");
  const [threadCost, setThreadCost] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);

  const [newProductName, setNewProductName] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductBagSize, setNewProductBagSize] = useState("");
  const [newProductSellingPrice, setNewProductSellingPrice] = useState("");

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialCode, setNewMaterialCode] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("KG");
  const [newMaterialRate, setNewMaterialRate] = useState("");
  const [newMaterialStock, setNewMaterialStock] = useState("");
  const [newMaterialMinimumStock, setNewMaterialMinimumStock] = useState("");
  const [newMaterialVendor, setNewMaterialVendor] = useState("");

  const [recipeName, setRecipeName] = useState("");
  const [recipeBatchKg, setRecipeBatchKg] = useState("");
  const [recipeRows, setRecipeRows] = useState<
    { raw_material_id: string; quantity_kg: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    loadData();
  }, []);

  async function saveNewProduct() {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company nahi mili");
      return;
    }

    if (!newProductName.trim()) {
      alert("Product name enter karo");
      return;
    }

    const bagSize = Number(newProductBagSize || 0);
    const sellingPrice = Number(newProductSellingPrice || 0);

    if (bagSize <= 0) {
      alert("Bag size 0 se greater hona chahiye");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        company_id: companyId,
        name: newProductName.trim(),
        code: newProductCode.trim() || null,
        bag_size_kg: bagSize,
        selling_price: sellingPrice,
        current_stock_bags: 0,
        active: true,
      })
      .select("id, name, code, bag_size_kg")
      .single();

    if (error) {
      alert("Product save error: " + error.message);
      return;
    }

    setProducts((current) =>
      [...current, data as Product].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );

    setProductId(data.id);
    setNewProductName("");
    setNewProductCode("");
    setNewProductBagSize("");
    setNewProductSellingPrice("");
    setShowNewProduct(false);

    alert("Product successfully create ho gaya.");
    await loadRecipe(data.id);
  }

  async function saveNewMaterial() {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company nahi mili");
      return;
    }

    if (!newMaterialName.trim()) {
      alert("Raw material name enter karo");
      return;
    }

    const purchaseRate = Number(newMaterialRate || 0);
    const openingStock = Number(newMaterialStock || 0);
    const minimumStock = Number(newMaterialMinimumStock || 0);

    if (purchaseRate < 0 || openingStock < 0 || minimumStock < 0) {
      alert("Stock/rate negative nahi ho sakta");
      return;
    }

    const { data, error } = await supabase
      .from("raw_materials")
      .insert({
        company_id: companyId,
        name: newMaterialName.trim(),
        code: newMaterialCode.trim() || null,
        unit: newMaterialUnit || "KG",
        current_stock: openingStock,
        minimum_stock: minimumStock,
        purchase_rate: purchaseRate,
        supplier_name: newMaterialVendor.trim() || null,
        active: true,
      })
      .select("id, name, unit, purchase_rate, current_stock")
      .single();

    if (error) {
      alert("Raw material save error: " + error.message);
      return;
    }

    setMaterials((current) =>
      [...current, data as Material].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );

    setNewMaterialName("");
    setNewMaterialCode("");
    setNewMaterialUnit("KG");
    setNewMaterialRate("");
    setNewMaterialStock("");
    setNewMaterialMinimumStock("");
    setNewMaterialVendor("");
    setShowNewMaterial(false);

    alert("Raw material successfully create ho gaya.");
  }

  function addRecipeRow() {
    setRecipeRows((current) => [
      ...current,
      {
        raw_material_id: "",
        quantity_kg: "",
      },
    ]);
  }

  function updateRecipeRow(
    index: number,
    field: "raw_material_id" | "quantity_kg",
    value: string
  ) {
    setRecipeRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function removeRecipeRow(index: number) {
    setRecipeRows((current) =>
      current.filter((_, rowIndex) => rowIndex !== index)
    );
  }

  async function openRecipeEditor() {
    if (!productId) {
      alert("Pehle Product select karo");
      return;
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company nahi mili");
      return;
    }

    const { data: recipeData, error: recipeError } = await supabase
      .from("recipes")
      .select("id, product_id, name, quantity_kg")
      .eq("product_id", productId)
      .eq("company_id", companyId)
      .eq("active", true)
      .maybeSingle();

    if (recipeError) {
      alert("Recipe load error: " + recipeError.message);
      return;
    }

    if (!recipeData) {
      setRecipe(null);
      setRecipeName(`${selectedProduct?.name || "Product"} Recipe`);
      setRecipeBatchKg(String(selectedProduct?.bag_size_kg || ""));
      setRecipeRows([]);
      setShowRecipeEditor(true);
      return;
    }

    const { data: itemData, error: itemError } = await supabase
      .from("recipe_items")
      .select("id, raw_material_id, quantity_kg")
      .eq("recipe_id", recipeData.id)
      .eq("company_id", companyId)
      .order("created_at");

    if (itemError) {
      alert("Recipe materials load error: " + itemError.message);
      return;
    }

    setRecipe(recipeData);
    setRecipeName(recipeData.name || "");
    setRecipeBatchKg(String(recipeData.quantity_kg || ""));
    setRecipeRows(
      (itemData || []).map((item) => ({
        raw_material_id: item.raw_material_id,
        quantity_kg: String(item.quantity_kg || ""),
      }))
    );
    setShowRecipeEditor(true);
  }
  async function saveRecipe() {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company nahi mili");
      return;
    }

    if (!productId) {
      alert("Pehle Product select karo");
      return;
    }

    if (!recipeName.trim()) {
      alert("Recipe name enter karo");
      return;
    }

    const batchKg = Number(recipeBatchKg || 0);

    if (batchKg <= 0) {
      alert("Recipe batch KG enter karo");
      return;
    }

    const validRows = recipeRows.filter(
      (row) =>
        row.raw_material_id &&
        Number(row.quantity_kg || 0) > 0
    );

    if (validRows.length === 0) {
      alert("Recipe me kam se kam ek raw material add karo");
      return;
    }

    const totalRecipeKg = validRows.reduce(
      (sum, row) => sum + Number(row.quantity_kg || 0),
      0
    );

    if (Math.abs(totalRecipeKg - batchKg) > 0.001) {
      alert(
        `Recipe quantity ${totalRecipeKg.toFixed(
          2
        )} KG hai, lekin batch ${batchKg.toFixed(
          2
        )} KG hai. Dono same hone chahiye.`
      );
      return;
    }

    let recipeId = recipe?.id || "";

    if (recipeId) {
      const { data: updatedRecipe, error: recipeUpdateError } =
        await supabase
          .from("recipes")
          .update({
            product_id: productId,
            name: recipeName.trim(),
            batch_size_kg: batchKg,
            quantity_kg: batchKg,
            active: true,
          })
          .eq("id", recipeId)
          .eq("company_id", companyId)
          .select("id, product_id, quantity_kg")
          .single();

      if (recipeUpdateError) {
        alert("Recipe update error: " + recipeUpdateError.message);
        return;
      }

      recipeId = updatedRecipe.id;

      const { error: deleteItemsError } = await supabase
        .from("recipe_items")
        .delete()
        .eq("recipe_id", recipeId)
        .eq("company_id", companyId);

      if (deleteItemsError) {
        alert(
          "Old recipe items delete error: " +
            deleteItemsError.message
        );
        return;
      }
    } else {
      const { data: newRecipe, error: recipeError } =
        await supabase
          .from("recipes")
          .insert({
            company_id: companyId,
            product_id: productId,
            name: recipeName.trim(),
            batch_size_kg: batchKg,
            quantity_kg: batchKg,
            active: true,
          })
          .select("id, product_id, quantity_kg")
          .single();

      if (recipeError) {
        alert("Recipe save error: " + recipeError.message);
        return;
      }

      recipeId = newRecipe.id;
    }

    const recipeItemsPayload = validRows.map((row) => ({
      company_id: companyId,
      recipe_id: recipeId,
      raw_material_id: row.raw_material_id,
      quantity_kg: Number(row.quantity_kg),
    }));

    const { error: itemsError } = await supabase
      .from("recipe_items")
      .insert(recipeItemsPayload);

    if (itemsError) {
      alert("Recipe items save error: " + itemsError.message);
      return;
    }

    setShowRecipeEditor(false);
    setRecipeRows([]);
    setRecipeName("");
    setRecipeBatchKg("");

    await loadRecipe(productId);

    alert(
      recipe?.id
        ? "Recipe successfully update ho gayi."
        : "Recipe successfully create ho gayi."
    );
  }
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
          .select("id, name, unit, purchase_rate, current_stock")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("name"),

        supabase
          .from("production_batches")
          .select(
            `
            id,
            product_id,
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
            cost_per_bag
          `
          )
          .eq("company_id", companyId)
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
      const productList = productsResult.data || [];
      const normalizedProductions = ((productionResult.data as Production[]) || []).map(
        (production) => ({
          ...production,
          products: production.product_id
            ? [
                {
                  name:
                    productList.find(
                      (product) => product.id === production.product_id
                    )?.name || "",
                },
              ]
            : [],
        })
      );
      setProductions(normalizedProductions);
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

  const capacity = Number(capacityKg || 0);
  const bags = Number(bagsProduced || 0);
  const bagSize = Number(bagWeightKg || 0);
  const totalQuantity = bags * bagSize;
  const maxBags = bagSize > 0 && capacity > 0 ? Math.floor(capacity / bagSize) : 0;
  const remainingCapacity = Math.max(capacity - totalQuantity, 0);

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
  const emptyBag = Number(emptyBagCost || 0);
  const thread = Number(threadCost || 0);
  const packaging = Number(packagingCost || 0);
  const other = Number(otherCost || 0);

  const totalProductionCost =
    rawMaterialCost + labour + electricity + emptyBag + thread + packaging + other;

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

    if (capacity <= 0) {
      alert("Production capacity enter karo");
      return;
    }

    if (bagSize <= 0) {
      alert("Bag weight enter karo");
      return;
    }

    if (capacity <= 0) {
      alert("Production capacity enter karo");
      return;
    }

    if (bagSize <= 0) {
      alert("Bag weight enter karo");
      return;
    }

    if (bags <= 0) {
      alert("Bags produced 0 se greater hona chahiye");
      return;
    }

    if (bags > maxBags || totalQuantity > capacity) {
      alert(`Production capacity ${capacity} KG hai. ${bags} bags x ${bagSize} KG = ${totalQuantity} KG, jo capacity se zyada hai.`);
      return;
    }

    if (bags > maxBags || totalQuantity > capacity) {
      alert(`Production capacity ${capacity} KG hai. ${bags} bags x ${bagSize} KG = ${totalQuantity} KG, jo capacity se zyada hai.`);
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
        capacity_kg: capacity,
        bag_weight_kg: bagSize,
        raw_material_cost: rawMaterialCost,
        labour_cost: labour,
        electricity_cost: electricity,
        empty_bag_cost: emptyBag,
        thread_cost: thread,
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

    alert("Production saved successfully Rs.  Raw material stock deducted + Finished stock added.");

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

  if (showNewProduct) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Create New Product
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Production module se product create karein
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewProduct(false)}
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product Name *
                </label>
                <input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Example: MURLI Dairy Feed"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product Code
                </label>
                <input
                  value={newProductCode}
                  onChange={(e) => setNewProductCode(e.target.value)}
                  placeholder="Example: MDF-001"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Default Bag Size (KG) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProductBagSize}
                    onChange={(e) => setNewProductBagSize(e.target.value)}
                    placeholder="50"
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Selling Price / Bag
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProductSellingPrice}
                    onChange={(e) =>
                      setNewProductSellingPrice(e.target.value)
                    }
                    placeholder="1200"
                    className="w-full rounded-lg border p-3"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewProduct(false)}
                className="rounded-lg border px-5 py-2 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveNewProduct}
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Save Product
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (showNewMaterial) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Create New Raw Material
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Production module se raw material create karein
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewMaterial(false)}
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Raw Material Name *
                </label>
                <input
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="Example: Maize"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Material Code
                </label>
                <input
                  value={newMaterialCode}
                  onChange={(e) => setNewMaterialCode(e.target.value)}
                  placeholder="Example: RM-001"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit
                </label>
                <select
                  value={newMaterialUnit}
                  onChange={(e) => setNewMaterialUnit(e.target.value)}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="KG">KG</option>
                  <option value="TON">TON</option>
                  <option value="LITRE">LITRE</option>
                  <option value="PCS">PCS</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Purchase Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMaterialRate}
                  onChange={(e) => setNewMaterialRate(e.target.value)}
                  placeholder="25"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Opening Stock
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMaterialStock}
                  onChange={(e) => setNewMaterialStock(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Minimum Stock Alert
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMaterialMinimumStock}
                  onChange={(e) =>
                    setNewMaterialMinimumStock(e.target.value)
                  }
                  placeholder="100"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Vendor
                </label>
                <input
                  value={newMaterialVendor}
                  onChange={(e) => setNewMaterialVendor(e.target.value)}
                  placeholder="Example: ABC Vendor"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewMaterial(false)}
                className="rounded-lg border px-5 py-2 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveNewMaterial}
                className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700"
              >
                Save Material
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (showRecipeEditor) {
    const recipeTotalKg = recipeRows.reduce(
      (sum, row) => sum + Number(row.quantity_kg || 0),
      0
    );

    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Recipe Editor
              </h1>
              <p className="text-sm text-slate-500">
                Product ke raw materials aur quantity yahin se manage karein.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRecipeEditor(false)}
              className="rounded-lg border bg-white px-4 py-2 font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-6 rounded-2xl bg-white p-6 shadow">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product
                </label>
                <div className="rounded-lg border bg-slate-50 p-3 font-semibold">
                  {selectedProduct?.name || "No Product Selected"}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Recipe Name
                </label>
                <input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="Example: Dairy Feed 47 KG"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Recipe Batch KG
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recipeBatchKg}
                  onChange={(e) => setRecipeBatchKg(e.target.value)}
                  placeholder="47"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold">Raw Materials</h2>
                <p className="text-sm text-slate-500">
                  Har material ki quantity enter karein.
                </p>
              </div>

              <button
                type="button"
                onClick={addRecipeRow}
                className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
              >
                + Add Raw Material
              </button>
            </div>

            {recipeRows.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-slate-500">
                  Abhi koi raw material add nahi hai.
                </p>

                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={addRecipeRow}
                    className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
                  >
                    + Add Raw Material
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recipeRows.map((row, index) => {
                  const material = materials.find(
                    (item) => item.id === row.raw_material_id
                  );
                  const quantity = Number(row.quantity_kg || 0);
                  const rate = Number(material?.purchase_rate || 0);
                  const cost = quantity * rate;

                  return (
                    <div
                      key={`${index}-${row.raw_material_id}`}
                      className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Raw Material
                        </label>
                        <select
                          value={row.raw_material_id}
                          onChange={(e) =>
                            updateRecipeRow(
                              index,
                              "raw_material_id",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border bg-white p-3"
                        >
                          <option value="">Select Material</option>
                          {materials.map((materialItem) => (
                            <option
                              key={materialItem.id}
                              value={materialItem.id}
                            >
                              {materialItem.name} - Stock: {Number(materialItem.current_stock || 0).toFixed(2)} {materialItem.unit} - {String.fromCharCode(8377)}{Number(materialItem.purchase_rate || 0).toFixed(2)}/KG
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Quantity KG
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.quantity_kg}
                          onChange={(e) =>
                            updateRecipeRow(
                              index,
                              "quantity_kg",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border bg-white p-3"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Rate / KG
                        </label>
                        <div className="rounded-lg border bg-white p-3">
                          ₹{rate.toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Cost
                        </label>
                        <div className="rounded-lg border bg-white p-3 font-semibold">
                          ₹{cost.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeRecipeRow(index)}
                          className="w-full rounded-lg bg-red-100 px-3 py-3 font-semibold text-red-700 hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid gap-4 rounded-xl bg-slate-900 p-5 text-white md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-300">Recipe Total KG</p>
                <p className="text-2xl font-bold">
                  {recipeTotalKg.toFixed(2)} KG
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-300">Target Batch</p>
                <p className="text-2xl font-bold">
                  {Number(recipeBatchKg || 0).toFixed(2)} KG
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-300">Difference</p>
                <p className="text-2xl font-bold">
                  {(recipeTotalKg - Number(recipeBatchKg || 0)).toFixed(2)} KG
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">

              <button
                type="button"
                onClick={() => setShowRecipeEditor(false)}
                className="rounded-lg border px-5 py-3 font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRecipe}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Save Recipe
              </button>
            </div>
          </div>
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

                <div className="flex gap-2">
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

                  <button
                    type="button"
                    onClick={() => setShowNewProduct(true)}
                    className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                  >
                    + New Product
                  </button>
                </div>

                {productId && (
                  <button
                    type="button"
                    onClick={openRecipeEditor}
                    className="mt-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    + Create / Edit Recipe
                  </button>
                )}
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

              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="mb-3 font-bold text-blue-900">Production Quantity</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Production Capacity (KG)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={capacityKg}
                      onChange={(e) => setCapacityKg(e.target.value)}
                      placeholder="e.g. 600"
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Bag Weight (KG)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={bagWeightKg}
                      onChange={(e) => setBagWeightKg(e.target.value)}
                      placeholder="e.g. 47"
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
                      placeholder="e.g. 12"
                      className="w-full rounded-lg border p-3"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-sm text-gray-500">Production Quantity</div>
                    <div className="text-xl font-bold">
                      {totalQuantity.toFixed(2)} KG
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-sm text-gray-500">Maximum Bags</div>
                    <div className="text-xl font-bold">
                      {maxBags}
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-sm text-gray-500">Remaining Capacity</div>
                    <div className="text-xl font-bold">
                      {remainingCapacity.toFixed(2)} KG
                    </div>
                  </div>
                </div>
              </div>
<div className="mt-6 rounded-xl bg-slate-50 p-4">

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
                            Rs. {item.rate.toFixed(2)}
                          </td>
                          <td className="p-2">
                            Rs. {item.totalCost.toFixed(2)}
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
                  placeholder="Rs. "
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
                  placeholder="Rs. "
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
                  placeholder="Rs. "
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Empty Bag Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={emptyBagCost}
                  onChange={(e) => setEmptyBagCost(e.target.value)}
                  placeholder="Rs. 0"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Thread Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={threadCost}
                  onChange={(e) => setThreadCost(e.target.value)}
                  placeholder="Rs. 0"
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
                  placeholder="Rs. "
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
          </div>
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
                  Rs. {rawMaterialCost.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-sm text-slate-500">
                  Other Production Costs
                </div>
                <div className="text-2xl font-bold">
                  Rs. 
                  {(labour + electricity + packaging + other).toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <div className="text-sm text-green-700">
                  Total Production Cost
                </div>
                <div className="text-3xl font-bold text-green-800">
                  Rs. {totalProductionCost.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Cost Per Bag</div>
                <div className="text-3xl font-bold text-blue-800">
                  Rs. {costPerBag.toFixed(2)}
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
                        Rs. {Number(production.total_production_cost).toFixed(2)}
                      </td>
                      <td className="p-3 font-semibold">
                        Rs. {Number(production.cost_per_bag).toFixed(2)}
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
















