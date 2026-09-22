"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

type Product = {
  id: string;
  name: string;
  code: string;
  bag_size_kg: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
};

type FinishedStock = {
  id: string;
  product_id: string;
  batch_number: string | null;
  quantity_bags: number;
  quantity_kg: number;
  bag_size_kg: number;
  manufacturing_date: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  customer_id: string | null;
};

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [finishedStock, setFinishedStock] = useState<FinishedStock[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [productId, setProductId] = useState("");
  const [bags, setBags] = useState("");
  const [ratePerBag, setRatePerBag] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [gstAmount, setGstAmount] = useState("0");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  const availableBags = finishedStock
    .filter((s) => s.product_id === productId)
    .reduce((sum, s) => sum + Number(s.quantity_bags || 0), 0);

  const subtotal =
    Number(bags || 0) * Number(ratePerBag || 0);

  const totalAmount =
    subtotal + Number(gstAmount || 0) - Number(discount || 0);

  const dueAmount =
    totalAmount - Number(paidAmount || 0);

  async function loadData() {
    setLoading(true);

    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      setLoading(false);
      return;
    }

    const [
      productsResult,
      customersResult,
      stockResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,code,bag_size_kg")
        .eq("company_id", companyId)
        .order("name"),

      supabase
        .from("customers")
        .select("id,name,phone")
        .eq("company_id", companyId)
        .order("name"),

      supabase
        .from("finished_goods_stock")
        .select(
          "id,product_id,batch_number,quantity_bags,quantity_kg,bag_size_kg,manufacturing_date"
        )
        .eq("company_id", companyId)
        .gt("quantity_bags", 0)
        .order("manufacturing_date", { ascending: true }),

      supabase
        .from("sales")
        .select(
          "id,invoice_number,sale_date,total_amount,paid_amount,due_amount,customer_id"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
    ]);

    if (productsResult.error) {
      alert("Products load error: " + productsResult.error.message);
    }

    if (customersResult.error) {
      alert("Customers load error: " + customersResult.error.message);
    }

    if (stockResult.error) {
      alert("Finished stock load error: " + stockResult.error.message);
    }

    if (salesResult.error) {
      alert("Sales load error: " + salesResult.error.message);
    }

    setProducts(productsResult.data || []);
    setCustomers(customersResult.data || []);
    setFinishedStock(stockResult.data || []);
    setSales(salesResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createCustomerIfNeeded(): Promise<string | null> {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return null;

    if (customerId) {
      return customerId;
    }

    if (!customerName.trim()) {
      return null;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      alert("Customer create error: " + error.message);
      return null;
    }

    return data.id;
  }

  async function saveSale() {
    if (!productId) {
      alert("Product select karein.");
      return;
    }

    const bagQty = Number(bags);
    const rate = Number(ratePerBag);
    const paid = Number(paidAmount || 0);
    const discountValue = Number(discount || 0);
    const gstValue = Number(gstAmount || 0);

    if (bagQty <= 0) {
      alert("Bags quantity 0 se greater honi chahiye.");
      return;
    }

    if (rate <= 0) {
      alert("Rate per bag enter karein.");
      return;
    }

    if (bagQty > availableBags) {
      alert(
        `Finished stock insufficient hai.\nAvailable: ${availableBags} bags\nRequired: ${bagQty} bags`
      );
      return;
    }

    const finalTotal =
      bagQty * rate + gstValue - discountValue;

    if (finalTotal < 0) {
      alert("Total amount invalid hai.");
      return;
    }

    if (paid < 0 || paid > finalTotal) {
      alert("Paid amount total amount se zyada nahi ho sakta.");
      return;
    }

    if (!invoiceNumber.trim()) {
      alert("Invoice number enter karein.");
      return;
    }

    setSaving(true);

    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      alert("Company not found. Please login again.");
      setSaving(false);
      return;
    }

    try {
      const newCustomerId = await createCustomerIfNeeded();

      if (customerName.trim() && !newCustomerId) {
        setSaving(false);
        return;
      }

      /*
       * First check current finished stock again.
       * Stock is consumed FIFO batch-wise.
       */
      const { data: currentStockRows, error: stockLoadError } =
        await supabase
          .from("finished_goods_stock")
          .select(
            "id,product_id,batch_number,quantity_bags,quantity_kg,bag_size_kg,manufacturing_date"
          )
          .eq("company_id", companyId)
          .eq("product_id", productId)
          .gt("quantity_bags", 0)
          .order("manufacturing_date", { ascending: true });

      if (stockLoadError) {
        throw new Error(stockLoadError.message);
      }

      const totalAvailable = (currentStockRows || []).reduce(
        (sum, row) => sum + Number(row.quantity_bags || 0),
        0
      );

      if (totalAvailable < bagQty) {
        throw new Error(
          `Finished stock insufficient hai. Available ${totalAvailable} bags hai.`
        );
      }

      // Create invoice in sales table
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          company_id: companyId,
          customer_id: newCustomerId,
          invoice_number: invoiceNumber.trim(),
          sale_date: saleDate,
          subtotal: bagQty * rate,
          gst_amount: gstValue,
          discount: discountValue,
          total_amount: finalTotal,
          paid_amount: paid,
          due_amount: finalTotal - paid,
        })
        .select("id")
        .single();

      if (saleError) {
        throw new Error("Sale save error: " + saleError.message);
      }

      // Save product details in sale_items
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          product_id: productId,
          quantity_bags: bagQty,
          rate_per_bag: rate,
          total_amount: bagQty * rate,
        });

      if (itemError) {
        await supabase.from("sales").delete().eq("id", sale.id).eq("company_id", companyId);
        throw new Error("Sale item save error: " + itemError.message);
      }

      // Deduct finished goods stock FIFO
      let remainingBags = bagQty;

      for (const stock of currentStockRows || []) {
        if (remainingBags <= 0) break;

        const stockBags = Number(stock.quantity_bags || 0);
        const stockKg = Number(stock.quantity_kg || 0);
        const bagSize = Number(
          stock.bag_size_kg || selectedProduct?.bag_size_kg || 0
        );

        const bagsToDeduct = Math.min(remainingBags, stockBags);
        const kgToDeduct = bagsToDeduct * bagSize;

        const newBags = stockBags - bagsToDeduct;
        const newKg = Math.max(0, stockKg - kgToDeduct);

        const { error: updateStockError } = await supabase
          .from("finished_goods_stock")
          .update({
            quantity_bags: newBags,
            quantity_kg: newKg,
          })
          .eq("id", stock.id);

        if (updateStockError) {
          throw new Error(
            "Finished stock update error: " +
              updateStockError.message
          );
        }

        remainingBags -= bagsToDeduct;
      }

      // Add every sale to customer ledger
      if (newCustomerId) {
        const { error: ledgerError } = await supabase
          .from("party_ledger")
          .insert({
            company_id: companyId,
            customer_id: newCustomerId,
            transaction_date: saleDate,
            transaction_type: "SALE",
            reference_id: sale.id,
            description: `Sale Invoice ${invoiceNumber.trim()}`,
            debit: finalTotal,
            credit: paid,
          });

        if (ledgerError) {
          console.warn(
            "Party ledger entry error:",
            ledgerError.message
          );
        }
      }

      alert(
        `Sale saved successfully ✅\n\nInvoice: ${invoiceNumber}\nProduct: ${selectedProduct?.name}\nBags: ${bagQty}\nTotal: ₹${finalTotal.toFixed(2)}\nPaid: ₹${paid.toFixed(2)}\nDue: ₹${(finalTotal - paid).toFixed(2)}`
      );

      setCustomerName("");
      setCustomerPhone("");
      setCustomerId("");
      setProductId("");
      setBags("");
      setRatePerBag("");
      setPaidAmount("");
      setDiscount("0");
      setGstAmount("");
      setInvoiceNumber("");

      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Sale save karte waqt error aaya."
      );
    } finally {
      setSaving(false);
    }
  }

  function getCustomerName(id: string | null) {
    if (!id) return "Walk-in Customer";
    return customers.find((c) => c.id === id)?.name || "-";
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Sales
        </h1>

        <p className="mb-6 text-gray-600">
          Finished goods sell karein aur stock automatically deduct hoga.
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl bg-white p-5 shadow lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">
              New Sale
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Invoice Number
                </label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-001"
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Sale Date
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Existing Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border p-2"
                >
                  <option value="">Walk-in / New Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone
                        ? ` - ${customer.phone}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {!customerId && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      New Customer Name
                    </label>
                    <input
                      value={customerName}
                      onChange={(e) =>
                        setCustomerName(e.target.value)
                      }
                      placeholder="Customer name"
                      className="w-full rounded-lg border p-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Customer Phone
                    </label>
                    <input
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomerPhone(e.target.value)
                      }
                      placeholder="Phone number"
                      className="w-full rounded-lg border p-2"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border p-2"
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
                  Available Finished Stock
                </label>
                <div className="rounded-lg bg-green-50 p-2 font-semibold text-green-700">
                  {productId ? `${availableBags} Bags` : "-"}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Quantity (Bags)
                </label>
                <input
                  type="number"
                  min="1"
                  value={bags}
                  onChange={(e) => setBags(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Rate Per Bag (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={ratePerBag}
                  onChange={(e) =>
                    setRatePerBag(e.target.value)
                  }
                  placeholder="1500"
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  GST Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={gstAmount}
                  onChange={(e) =>
                    setGstAmount(e.target.value)
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(e.target.value)
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Paid Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(e.target.value)
                  }
                  placeholder="0"
                  className="w-full rounded-lg border p-2"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-lg bg-gray-100 p-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-gray-600">
                  Subtotal
                </div>
                <div className="text-xl font-bold">
                  ₹{subtotal.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">
                  Total
                </div>
                <div className="text-xl font-bold">
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600">
                  Due
                </div>
                <div className="text-xl font-bold text-red-600">
                  ₹{dueAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <button
              onClick={saveSale}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving Sale..." : "Save Sale"}
            </button>
          </section>

          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Current Stock
            </h2>

            {loading ? (
              <p>Loading...</p>
            ) : finishedStock.length === 0 ? (
              <p className="text-gray-500">
                Finished stock available nahi hai.
              </p>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const stock = finishedStock
                    .filter(
                      (s) => s.product_id === product.id
                    )
                    .reduce(
                      (sum, s) =>
                        sum + Number(s.quantity_bags || 0),
                      0
                    );

                  if (stock <= 0) return null;

                  return (
                    <div
                      key={product.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="font-semibold">
                        {product.name}
                      </div>
                      <div className="text-green-600">
                        {stock} Bags
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Sales History
          </h2>

          {sales.length === 0 ? (
            <p className="text-gray-500">
              Abhi koi sale nahi hai.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-100 text-left">
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Paid</th>
                    <th className="p-3">Due</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="p-3 font-medium">
                        {sale.invoice_number}
                      </td>
                      <td className="p-3">
                        {sale.sale_date}
                      </td>
                      <td className="p-3">
                        {getCustomerName(sale.customer_id)}
                      </td>
                      <td className="p-3">
                        ₹{Number(sale.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        ₹{Number(sale.paid_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-3 font-semibold text-red-600">
                        ₹{Number(sale.due_amount || 0).toFixed(2)}
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
