"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

type Company = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
};

type Product = {
  id: string;
  name: string;
  code: string;
  bag_size_kg: number;
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

export default function BillingPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [finishedStock, setFinishedStock] = useState<FinishedStock[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [productId, setProductId] = useState("");
  const [bags, setBags] = useState("1");
  const [ratePerBag, setRatePerBag] = useState("");

  const [gstAmount, setGstAmount] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");

  const [invoiceNo, setInvoiceNo] = useState("INV-0001");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [paymentMode, setPaymentMode] = useState("Credit");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  const availableBags = finishedStock
    .filter((item) => item.product_id === productId)
    .reduce(
      (sum, item) => sum + Number(item.quantity_bags || 0),
      0
    );

  const quantity = Math.max(0, Number(bags || 0));
  const rate = Math.max(0, Number(ratePerBag || 0));
  const gst = Math.max(0, Number(gstAmount || 0));
  const discountValue = Math.max(0, Number(discount || 0));
  const paid = Math.max(0, Number(paidAmount || 0));

  const subtotal = quantity * rate;
  const taxableAmount = Math.max(0, subtotal - discountValue);
  const totalAmount = taxableAmount + gst;
  const dueAmount = Math.max(0, totalAmount - paid);

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const companyId = await getCurrentCompanyId();

      if (!companyId) {
        alert("Company not found.");
        return;
      }

      const [
        companyResult,
        customersResult,
        productsResult,
        stockResult,
      ] = await Promise.all([
        supabase
          .from("companies")
          .select("name,address,phone,email,gst_number")
          .eq("id", companyId)
          .maybeSingle(),

        supabase
          .from("customers")
          .select("id,name,phone")
          .eq("company_id", companyId)
          .order("name"),

        supabase
          .from("products")
          .select("id,name,code,bag_size_kg")
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
      ]);

      if (companyResult.error) {
        alert(
          "Company details load error: " +
            companyResult.error.message
        );
        return;
      }

      if (customersResult.error) {
        alert(
          "Customers load error: " +
            customersResult.error.message
        );
        return;
      }

      if (productsResult.error) {
        alert(
          "Products load error: " +
            productsResult.error.message
        );
        return;
      }

      if (stockResult.error) {
        alert(
          "Finished stock load error: " +
            stockResult.error.message
        );
        return;
      }

      setCompany(companyResult.data);
      setCustomers(customersResult.data || []);
      setProducts(productsResult.data || []);
      setFinishedStock(stockResult.data || []);

      await generateNextInvoiceNumber(companyId);
    } finally {
      setLoading(false);
    }
  }

  async function generateNextInvoiceNumber(companyId: string) {
    const { data, error } = await supabase
      .from("sales")
      .select("invoice_number")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Invoice number load error:", error.message);
      return;
    }

    let highestNumber = 0;

    for (const row of data || []) {
      const match = String(row.invoice_number || "").match(
        /INV-(\d+)/i
      );

      if (match) {
        highestNumber = Math.max(
          highestNumber,
          Number(match[1])
        );
      }
    }

    setInvoiceNo(
      `INV-${String(highestNumber + 1).padStart(4, "0")}`
    );
  }

  async function createCustomerIfNeeded(
    companyId: string
  ): Promise<string | null> {
    if (customerId) {
      return customerId;
    }

    if (!newCustomerName.trim()) {
      return null;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
      })
      .select("id,name,phone")
      .single();

    if (error) {
      alert("Customer create error: " + error.message);
      return null;
    }

    setCustomers((previous) => [...previous, data]);
    return data.id;
  }

  async function saveInvoice() {
    if (!productId) {
      alert("Please select a product.");
      return;
    }

    if (quantity <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    if (rate <= 0) {
      alert("Please enter rate per bag.");
      return;
    }

    if (availableBags < quantity) {
      alert(
        `Insufficient finished stock.\nAvailable: ${availableBags} bags\nRequired: ${quantity} bags`
      );
      return;
    }

    if (!invoiceNo.trim()) {
      alert("Invoice number is required.");
      return;
    }

    if (discountValue > subtotal) {
      alert("Discount cannot be greater than subtotal.");
      return;
    }

    if (paid > totalAmount) {
      alert("Paid amount cannot be greater than invoice total.");
      return;
    }

    if (totalAmount <= 0) {
      alert("Invoice total must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const companyId = await getCurrentCompanyId();

      if (!companyId) {
        alert("Company not found.");
        return;
      }

      const finalCustomerId = await createCustomerIfNeeded(
        companyId
      );

      if (newCustomerName.trim() && !finalCustomerId) {
        return;
      }

      const { data: existingInvoice } = await supabase
        .from("sales")
        .select("id")
        .eq("company_id", companyId)
        .eq("invoice_number", invoiceNo.trim())
        .maybeSingle();

      if (existingInvoice) {
        alert(
          "This invoice number already exists. Please use another invoice number."
        );
        return;
      }

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          company_id: companyId,
          customer_id: finalCustomerId,
          invoice_number: invoiceNo.trim(),
          sale_date: date,
          subtotal,
          gst_amount: gst,
          discount: discountValue,
          total_amount: totalAmount,
          paid_amount: paid,
          due_amount: dueAmount,
          due_date: dueAmount > 0 ? date : null,
          notes:
            [
              paymentMode
                ? `Payment Mode: ${paymentMode}`
                : "",
              paymentReference.trim()
                ? `Payment Reference: ${paymentReference.trim()}`
                : "",
              notes.trim()
                ? `Notes: ${notes.trim()}`
                : "",
            ]
              .filter(Boolean)
              .join(" | ") || null,
        })
        .select("id")
        .single();

      if (saleError || !sale) {
        alert(
          "Invoice save error: " +
            (saleError?.message || "Sale was not created.")
        );
        return;
      }

      const { error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          company_id: companyId,
          product_id: productId,
          quantity_bags: quantity,
          rate_per_bag: rate,
          total_amount: subtotal,
        });

      if (itemError) {
        await supabase
          .from("sales")
          .delete()
          .eq("id", sale.id)
          .eq("company_id", companyId);

        alert(
          "Invoice item save error: " + itemError.message
        );
        return;
      }

      const stockRows = finishedStock
        .filter(
          (item) =>
            item.product_id === productId &&
            Number(item.quantity_bags || 0) > 0
        )
        .sort((a, b) => {
          const dateA = a.manufacturing_date || "";
          const dateB = b.manufacturing_date || "";
          return dateA.localeCompare(dateB);
        });

      let remainingBags = quantity;

      for (const stockRow of stockRows) {
        if (remainingBags <= 0) break;

        const currentBags = Number(
          stockRow.quantity_bags || 0
        );

        const deductBags = Math.min(
          currentBags,
          remainingBags
        );

        const bagSize = Number(
          stockRow.bag_size_kg ||
            selectedProduct?.bag_size_kg ||
            0
        );

        const currentKg = Number(
          stockRow.quantity_kg || 0
        );

        const deductKg = deductBags * bagSize;

        const newBags = Math.max(
          0,
          currentBags - deductBags
        );

        const newKg = Math.max(
          0,
          currentKg - deductKg
        );

        const { error: stockError } = await supabase
          .from("finished_goods_stock")
          .update({
            quantity_bags: newBags,
            quantity_kg: newKg,
          })
          .eq("id", stockRow.id)
          .eq("company_id", companyId);

        if (stockError) {
          alert(
            "Stock update error: " + stockError.message
          );
          return;
        }

        remainingBags -= deductBags;
      }

      if (remainingBags > 0) {
        alert(
          "Stock deduction incomplete. Please check finished stock."
        );
        return;
      }

      if (finalCustomerId) {
        const { error: ledgerError } = await supabase
          .from("party_ledger")
          .insert({
            company_id: companyId,
            customer_id: finalCustomerId,
            transaction_date: date,
            transaction_type: "SALE",
            reference_id: sale.id,
            description: `Sale Invoice ${invoiceNo.trim()}`,
            debit: totalAmount,
            credit: paid,
          });

        if (ledgerError) {
          console.warn(
            "Customer ledger entry error:",
            ledgerError.message
          );

          alert(
            `Invoice saved successfully, but customer ledger update failed.\n\n${ledgerError.message}`
          );
        } else {
          alert(
            `Invoice ${invoiceNo.trim()} saved successfully!`
          );
        }
      } else {
        alert(
          `Invoice ${invoiceNo.trim()} saved successfully!`
        );
      }

      setCustomerId("");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setProductId("");
      setBags("1");
      setRatePerBag("");
      setGstAmount("0");
      setDiscount("0");
      setPaidAmount("0");
      setPaymentMode("Credit");
      setPaymentReference("");
      setNotes("");

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Something went wrong while saving invoice.");
    } finally {
      setSaving(false);
    }
  }

  const companyName =
    company?.name?.trim() || "Company Name";

  const companyAddress =
    company?.address?.trim() || "Company Address";

  const companyPhone =
    company?.phone?.trim() || "Phone Number";

  const companyGst =
    company?.gst_number?.trim() || "GSTIN";

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <p className="text-sm font-bold text-green-600">
              FEEDORA
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              New Tax Invoice
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold"
            >
              Print Invoice
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Save PDF
            </button>

            <button
              type="button"
              onClick={saveInvoice}
              disabled={saving || loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">

          <div className="border-b-4 border-green-600 p-5">
            <div className="grid gap-5 md:grid-cols-3">

              <div className="md:col-span-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {loading ? "Loading company..." : companyName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {companyAddress}
                </p>

                <p className="text-sm text-slate-500">
                  Mobile: {companyPhone} | GSTIN: {companyGst}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-900">
                  TAX INVOICE
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <span className="text-slate-500">
                    Invoice No.
                  </span>

                  <input
                    value={invoiceNo}
                    onChange={(e) =>
                      setInvoiceNo(e.target.value)
                    }
                    className="rounded border px-2 py-1"
                  />

                  <span className="text-slate-500">
                    Invoice Date
                  </span>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    className="rounded border px-2 py-1"
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="grid gap-5 border-b p-5 md:grid-cols-2">

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Bill To
              </p>

              <select
                value={customerId}
                onChange={(e) =>
                  setCustomerId(e.target.value)
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">
                  Walk-in / New Customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                    {customer.phone
                      ? ` - ${customer.phone}`
                      : ""}
                  </option>
                ))}
              </select>

              {!customerId && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    value={newCustomerName}
                    onChange={(e) =>
                      setNewCustomerName(e.target.value)
                    }
                    placeholder="New Customer Name"
                    className="rounded-lg border px-3 py-2 text-sm"
                  />

                  <input
                    value={newCustomerPhone}
                    onChange={(e) =>
                      setNewCustomerPhone(e.target.value)
                    }
                    placeholder="Mobile Number"
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              )}

              {selectedCustomer && (
                <p className="mt-2 text-sm text-slate-500">
                  Customer: {selectedCustomer.name}
                  {selectedCustomer.phone
                    ? ` | ${selectedCustomer.phone}`
                    : ""}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Payment Details
              </p>

              <select
                value={paymentMode}
                onChange={(e) =>
                  setPaymentMode(e.target.value)
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option>Credit</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
              </select>

              <input
                value={paymentReference}
                onChange={(e) =>
                  setPaymentReference(e.target.value)
                }
                placeholder="Payment Reference"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-3 text-left">
                    Sr.
                  </th>

                  <th className="px-3 py-3 text-left">
                    Product / Description
                  </th>

                  <th className="px-3 py-3 text-left">
                    HSN
                  </th>

                  <th className="px-3 py-3 text-right">
                    Qty
                  </th>

                  <th className="px-3 py-3 text-right">
                    Rate
                  </th>

                  <th className="px-3 py-3 text-right">
                    Discount
                  </th>

                  <th className="px-3 py-3 text-right">
                    Taxable
                  </th>

                  <th className="px-3 py-3 text-right">
                    GST
                  </th>

                  <th className="px-3 py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b">

                  <td className="px-3 py-4">
                    1
                  </td>

                  <td className="px-3 py-4">
                    <select
                      value={productId}
                      onChange={(e) =>
                        setProductId(e.target.value)
                      }
                      className="w-full rounded border px-2 py-2"
                    >
                      <option value="">
                        Select Product
                      </option>

                      {products.map((product) => {
                        const stock = finishedStock
                          .filter(
                            (item) =>
                              item.product_id === product.id
                          )
                          .reduce(
                            (sum, item) =>
                              sum +
                              Number(
                                item.quantity_bags || 0
                              ),
                            0
                          );

                        return (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name}
                            {product.code
                              ? ` (${product.code})`
                              : ""}{" "}
                            - Stock: {stock} bags
                          </option>
                        );
                      })}
                    </select>

                    {selectedProduct && (
                      <p className="mt-1 text-xs text-slate-500">
                        Bag Size:{" "}
                        {selectedProduct.bag_size_kg} kg
                        {" | "}
                        Available: {availableBags} bags
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-4">
                    <input
                      placeholder="HSN"
                      className="w-20 rounded border px-2 py-2"
                    />
                  </td>

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      min="1"
                      value={bags}
                      onChange={(e) =>
                        setBags(e.target.value)
                      }
                      className="w-20 rounded border px-2 py-2 text-right"
                    />
                  </td>

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ratePerBag}
                      onChange={(e) =>
                        setRatePerBag(e.target.value)
                      }
                      placeholder="0.00"
                      className="w-24 rounded border px-2 py-2 text-right"
                    />
                  </td>

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) =>
                        setDiscount(e.target.value)
                      }
                      className="w-24 rounded border px-2 py-2 text-right"
                    />
                  </td>

                  <td className="px-3 py-4 text-right">
                    ₹{taxableAmount.toFixed(2)}
                  </td>

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={gstAmount}
                      onChange={(e) =>
                        setGstAmount(e.target.value)
                      }
                      className="w-24 rounded border px-2 py-2 text-right"
                    />
                  </td>

                  <td className="px-3 py-4 text-right font-bold">
                    ₹{totalAmount.toFixed(2)}
                  </td>

                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 border-t p-5 md:grid-cols-2">

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Notes / Terms & Conditions
              </p>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                rows={5}
                placeholder="Enter invoice notes or terms and conditions..."
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="ml-auto w-full max-w-md space-y-2 text-sm">

              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Discount</span>
                <span>
                  - ₹{discountValue.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>
                  ₹{taxableAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST</span>
                <span>
                  ₹{gst.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 flex justify-between border-t-2 border-slate-800 pt-3 text-lg font-bold">
                <span>Grand Total</span>

                <span>
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Paid Amount</span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(e.target.value)
                  }
                  className="w-32 rounded border px-2 py-2 text-right"
                />
              </div>

              <div className="mt-3 flex justify-between rounded-lg bg-green-50 p-3 font-bold text-green-800">
                <span>Balance Due</span>

                <span>
                  ₹{dueAmount.toFixed(2)}
                </span>
              </div>

            </div>
          </div>

          <div className="border-t bg-slate-50 p-5 text-right text-sm text-slate-500">
            For {companyName}

            <div className="mt-8 font-semibold text-slate-800">
              Authorized Signatory
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </main>
  );
}
