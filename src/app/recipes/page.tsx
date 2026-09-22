"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

type Product = {
  id: string;
  name: string;
  code: string | null;
  bag_size_kg: number;
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  purchase_rate: number;
};

type RecipeItem = {
  raw_material_id: string;
  quantity: string;
};

type SavedRecipe = {
  id: string;
  product_id: string;
  quantity_kg: number;
  products: {
    name: string;
    bag_size_kg: number;
  }[];
};

export default function RecipesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  const [productId, setProductId] = useState("");
  const [items, setItems] = useState<RecipeItem[]>([
    { raw_material_id: "", quantity: "" },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return;
    setLoading(true);

    const [productsResult, materialsResult, recipesResult] =
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
          .from("recipes")
          .select(
            "id, product_id, quantity_kg, products(name, bag_size_kg)"
          )
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
      ]);

    if (productsResult.error) {
      alert("Products error: " + productsResult.error.message);
    } else {
      setProducts(productsResult.data || []);
    }

    if (materialsResult.error) {
      alert("Raw materials error: " + materialsResult.error.message);
    } else {
      setMaterials(materialsResult.data || []);
    }

    if (recipesResult.error) {
      console.log("Recipes loading:", recipesResult.error.message);
    } else {
      setRecipes((recipesResult.data as SavedRecipe[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function addIngredient() {
    setItems([
      ...items,
      {
        raw_material_id: "",
        quantity: "",
      },
    ]);
  }

  function removeIngredient(index: number) {
    if (items.length === 1) return;

    setItems(items.filter((_, i) => i !== index));
  }

  function updateIngredient(
    index: number,
    field: keyof RecipeItem,
    value: string
  ) {
    const updated = [...items];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setItems(updated);
  }

  function getTotalQuantity() {
    return items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0
    );
  }

  function getTotalCost() {
    return items.reduce((total, item) => {
      const material = materials.find(
        (m) => m.id === item.raw_material_id
      );

      if (!material) return total;

      return (
        total +
        (Number(item.quantity) || 0) *
          Number(material.purchase_rate || 0)
      );
    }, 0);
  }

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();

    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      alert("Company information nahi mili. Please login again.");
      return;
    }

    if (!productId) {
      alert("Please select a product");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.raw_material_id &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      alert("Please add at least one ingredient");
      return;
    }

    setSaving(true);

    const product = products.find((p) => p.id === productId);

    if (!product) {
      alert("Product not found");
      setSaving(false);
      return;
    }

    const totalQuantity = validItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    if (Math.abs(totalQuantity - Number(product.bag_size_kg)) > 0.001) {
      alert(
        `Recipe quantity must equal bag size: ${product.bag_size_kg} KG. Current total: ${totalQuantity.toFixed(
          3
        )} KG`
      );
      setSaving(false);
      return;
    }

    const selectedProduct = products.find((p) => p.id === productId);

    const { data: recipe, error: recipeError } =
      await supabase
        .from("recipes")
        .insert({
          company_id: companyId,
          name: selectedProduct?.name ?? "Recipe",
          product_id: productId,
          quantity_kg: totalQuantity,
          active: true,
        })
        .select("id")
        .single();

    if (recipeError) {
      alert("Recipe error: " + recipeError.message);
      setSaving(false);
      return;
    }

    const recipeItems = validItems.map((item) => ({
      recipe_id: recipe.id,
      raw_material_id: item.raw_material_id,
      quantity_kg: Number(item.quantity),
    }));

    const { error: itemsError } = await supabase
      .from("recipe_items")
      .insert(recipeItems);

    if (itemsError) {
      await supabase
        .from("recipes")
        .delete()
        .eq("id", recipe.id);

      alert("Recipe ingredients error: " + itemsError.message);
      setSaving(false);
      return;
    }

    alert("Recipe saved successfully");

    setProductId("");
    setItems([
      {
        raw_material_id: "",
        quantity: "",
      },
    ]);

    await loadData();

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
            Recipe & Formula Management
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">

            <h2 className="mb-5 text-xl font-bold">
              Create Product Recipe
            </h2>

            {loading ? (
              <p>Loading...</p>
            ) : (
              <form
                onSubmit={saveRecipe}
                className="space-y-5"
              >

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Select Product
                  </label>

                  <select
                    value={productId}
                    onChange={(e) =>
                      setProductId(e.target.value)
                    }
                    className="w-full rounded-xl border p-3"
                  >
                    <option value="">
                      Select product
                    </option>

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} -{" "}
                        {product.bag_size_kg} KG
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[650px]">

                    <thead>
                      <tr className="border-b text-left text-sm text-slate-500">
                        <th className="p-3">
                          Raw Material
                        </th>

                        <th className="p-3">
                          Rate
                        </th>

                        <th className="p-3">
                          Quantity KG
                        </th>

                        <th className="p-3">
                          Cost
                        </th>

                        <th className="p-3">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {items.map((item, index) => {

                        const material =
                          materials.find(
                            (m) =>
                              m.id ===
                              item.raw_material_id
                          );

                        const cost =
                          (Number(item.quantity) || 0) *
                          Number(
                            material?.purchase_rate || 0
                          );

                        return (
                          <tr
                            key={index}
                            className="border-b"
                          >

                            <td className="p-3">

                              <select
                                value={
                                  item.raw_material_id
                                }
                                onChange={(e) =>
                                  updateIngredient(
                                    index,
                                    "raw_material_id",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border p-2"
                              >

                                <option value="">
                                  Select material
                                </option>

                                {materials.map(
                                  (material) => (
                                    <option
                                      key={
                                        material.id
                                      }
                                      value={
                                        material.id
                                      }
                                    >
                                      {material.name}
                                    </option>
                                  )
                                )}

                              </select>

                            </td>

                            <td className="p-3">
                              ₹
                              {Number(
                                material?.purchase_rate ||
                                  0
                              ).toFixed(2)}
                            </td>

                            <td className="p-3">

                              <input
                                type="number"
                                step="0.001"
                                value={
                                  item.quantity
                                }
                                onChange={(e) =>
                                  updateIngredient(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                className="w-32 rounded-lg border p-2"
                                placeholder="0"
                              />

                            </td>

                            <td className="p-3 font-semibold">
                              ₹{cost.toFixed(2)}
                            </td>

                            <td className="p-3">

                              <button
                                type="button"
                                onClick={() =>
                                  removeIngredient(
                                    index
                                  )
                                }
                                className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-600"
                              >
                                Remove
                              </button>

                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>

                <button
                  type="button"
                  onClick={addIngredient}
                  className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-700"
                >
                  + Add Ingredient
                </button>

                <div className="grid gap-4 md:grid-cols-3">

                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-sm text-slate-500">
                      Total Quantity
                    </p>

                    <p className="text-2xl font-bold text-blue-700">
                      {getTotalQuantity().toFixed(3)} KG
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-sm text-slate-500">
                      Raw Material Cost
                    </p>

                    <p className="text-2xl font-bold text-green-700">
                      ₹{getTotalCost().toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-sm text-slate-500">
                      Cost Per KG
                    </p>

                    <p className="text-2xl font-bold text-orange-700">
                      ₹
                      {getTotalQuantity() > 0
                        ? (
                            getTotalCost() /
                            getTotalQuantity()
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>

                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-green-600 p-4 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving Recipe..."
                    : "Save Recipe"}
                </button>

              </form>
            )}

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">

            <h2 className="mb-5 text-xl font-bold">
              Recipe Summary
            </h2>

            {productId ? (
              (() => {
                const product = products.find(
                  (p) => p.id === productId
                );

                return product ? (
                  <div className="space-y-4">

                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-sm text-slate-500">
                        Product
                      </p>

                      <p className="font-bold text-green-700">
                        {product.name}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Bag Size
                      </p>

                      <p className="text-xl font-bold">
                        {product.bag_size_kg} KG
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-sm text-slate-500">
                        Recipe Quantity
                      </p>

                      <p className="text-xl font-bold text-blue-700">
                        {getTotalQuantity().toFixed(3)} KG
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-50 p-4">
                      <p className="text-sm text-slate-500">
                        Raw Material Cost / Bag
                      </p>

                      <p className="text-2xl font-bold text-orange-700">
                        ₹{getTotalCost().toFixed(2)}
                      </p>
                    </div>

                  </div>
                ) : null;
              })()
            ) : (
              <div className="rounded-xl bg-slate-50 p-8 text-center">
                <div className="mb-3 text-4xl">
                  🧾
                </div>

                <p className="text-slate-500">
                  Select a product to create its recipe.
                </p>
              </div>
            )}

          </div>

        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <h2 className="mb-5 text-xl font-bold">
            Saved Recipes
          </h2>

          {recipes.length === 0 ? (
            <p className="text-slate-500">
              No recipes saved yet.
            </p>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="p-3">
                      Product
                    </th>

                    <th className="p-3">
                      Bag Size
                    </th>

                    <th className="p-3">
                      Recipe Quantity
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {recipes.map((recipe) => (
                    <tr
                      key={recipe.id}
                      className="border-b last:border-0"
                    >

                      <td className="p-3 font-semibold">
                        {recipe.products?.[0]?.name || "-"}
                      </td>

                      <td className="p-3">
                        {recipe.products?.[0]?.bag_size_kg || 0} KG
                      </td>

                      <td className="p-3">
                        {Number(
                          recipe.quantity_kg
                        ).toFixed(3)} KG
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}
