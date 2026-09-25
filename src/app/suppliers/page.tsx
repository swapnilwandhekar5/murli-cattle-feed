"use client";

const purchasePrintStyles = `
@media print {
  body * {
    visibility: hidden !important;
  }

  #purchase-bill-print,
  #purchase-bill-print * {
    visibility: visible !important;
  }

  #purchase-bill-print {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    background: white !important;
    padding: 20px !important;
  }

  .purchase-bill-actions {
    display: none !important;
  }

  @page {
    size: A4;
    margin: 12mm;
  }
};
`;

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Truck,
  X,
  IndianRupee,
  FileText,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompanyId } from "@/lib/company";

type Vendor = {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  gst_number: string | null;
  opening_balance: number | null;
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  purchase_rate: number | null;
};

type PurchaseItem = {
  raw_material_id: string;
  quantity: string;
  rate: string;
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  const [vendorId, setVendorId] = useState("");

  const [vendorName, setVendorName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<PurchaseItem[]>([
    {
      raw_material_id: "",
      quantity: "",
      rate: "",
    },
  ]);

  const [saving, setSaving] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorPurchases, setVendorPurchases] = useState<any[]>([]);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);
  const [vendorLedger, setVendorLedger] = useState<any[]>([]);
  const [vendorAlerts, setVendorAlerts] = useState<any[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [purchaseBillItems, setPurchaseBillItems] = useState<any[]>([]);
  const [showPurchaseBill, setShowPurchaseBill] = useState(false);
  const [purchaseBillLoading, setPurchaseBillLoading] = useState(false);
  const [vendorDetailsLoading, setVendorDetailsLoading] = useState(false);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [activeMaterialRow, setActiveMaterialRow] = useState<number | null>(null);
const [newMaterialName, setNewMaterialName] = useState("");
const [newMaterialCode, setNewMaterialCode] = useState("");
const [newMaterialUnit, setNewMaterialUnit] = useState("KG");
const [newMaterialRate, setNewMaterialRate] = useState("");
const [newMaterialSaving, setNewMaterialSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      setLoading(false);
      return;
    }

    const [{ data: vendorData, error: vendorError }, { data: materialData }] =
      await Promise.all([
        supabase
          .from("suppliers")
          .select(
            "id,name,mobile,address,gst_number,opening_balance"
          )
          .eq("company_id", companyId)
          .order("name"),

        supabase
          .from("raw_materials")
          .select("id,name,unit,purchase_rate")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("name"),
      ]);

    if (vendorError) {
      console.error(vendorError);
      alert("Vendor load error: " + vendorError.message);
    }

    setVendors(vendorData || []);
    setMaterials(materialData || []);

    setLoading(false);
  }

  function sharePurchaseBillWhatsApp() {
  if (!selectedPurchase) return;

  const vendor = selectedVendor?.name || "Vendor";
  const purchaseNo = selectedPurchase.purchase_number || "-";
  const date = selectedPurchase.purchase_date || "-";
  const total = Number(selectedPurchase.total_amount || 0).toLocaleString("en-IN");
  const paid = Number(selectedPurchase.paid_amount || 0).toLocaleString("en-IN");
  const due = Number(selectedPurchase.due_amount || 0).toLocaleString("en-IN");
  const dueDate = selectedPurchase.due_date || "-";

  const lines = purchaseBillItems.map((item, index) => {
    const material = materials.find(
      (m) => m.id === item.raw_material_id
    );

    const quantity = Number(
      item.quantity_kg ?? item.quantity ?? 0
    );

    const rate = Number(
      item.rate_per_kg ?? item.rate ?? 0
    );

    const amount = Number(
      item.total_amount || quantity * rate
    );

    return `${index + 1}. ${material?.name || "Raw Material"} - ${quantity} ${item.unit || material?.unit || "KG"} x Rs. ${rate.toLocaleString("en-IN")} = Rs. ${amount.toLocaleString("en-IN")}`;
  });

  const message = [
    "PURCHASE BILL",
    "",
    `Vendor: ${vendor}`,
    `Purchase No: ${purchaseNo}`,
    `Date: ${date}`,
    "",
    ...lines,
    "",
    `Total: Rs. ${total}`,
    `Paid: Rs. ${paid}`,
    `Remaining: Rs. ${due}`,
    `Due Date: ${dueDate}`,
    "",
    "Thank you."
  ].join("\n");

  const whatsappUrl =
    "https://wa.me/?text=" + encodeURIComponent(message);

  window.open(whatsappUrl, "_blank");
}

  async function saveNewMaterial() {
    if (!newMaterialName.trim()) {
      alert("Please enter material name.");
      return;
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company not found.");
      return;
    }

    setNewMaterialSaving(true);

    const { data, error } = await supabase
      .from("raw_materials")
      .insert({
        company_id: companyId,
        name: newMaterialName.trim(),
        code: newMaterialCode.trim() || null,
        unit: newMaterialUnit || "KG",
        current_stock: 0,
        minimum_stock: 0,
        purchase_rate: Number(newMaterialRate || 0),
        active: true
      })
      .select("id,name,code,unit,current_stock,minimum_stock,purchase_rate,supplier_name,active,created_at")
      .single();

    setNewMaterialSaving(false);

    if (error) {
      console.error("New material error:", error);
      alert("Material save error: " + error.message);
      return;
    }

    setMaterials((prev) => [...prev, data]);

    if (activeMaterialRow !== null) {
      updateItem(activeMaterialRow, "raw_material_id", data.id);
      updateItem(activeMaterialRow, "rate", String(data.purchase_rate ?? 0));
      setActiveMaterialRow(null);
    }

    setShowMaterialModal(false);
    setNewMaterialName("");
    setNewMaterialCode("");
    setNewMaterialUnit("KG");
    setNewMaterialRate("");

    alert("New material added successfully.");
  }
async function loadPurchaseBill(purchase: any) {
    setSelectedPurchase(purchase);
    setShowPurchaseBill(true);
    setPurchaseBillLoading(true);

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      setPurchaseBillLoading(false);
      return;
    }

    const { data: items, error } = await supabase
      .from("purchase_items")
      .select(
        "id,raw_material_id,quantity,quantity_kg,unit,rate,rate_per_kg,total_amount"
      )
      .eq("company_id", companyId)
      .eq("purchase_id", purchase.id);

    if (error) {
      console.error("Purchase bill items error:", error);
      alert("Purchase bill load error: " + error.message);
      setPurchaseBillItems([]);
    } else {
      setPurchaseBillItems(items || []);
    }

    setPurchaseBillLoading(false);
  }
  async function loadVendorDetails(vendor: Vendor) {
    setSelectedVendor(vendor);
    setShowVendorDetails(true);
    setVendorDetailsLoading(true);

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      setVendorDetailsLoading(false);
      return;
    }

    const [
      { data: purchases, error: purchasesError },
      { data: payments, error: paymentsError },
      { data: ledger, error: ledgerError },
      { data: alerts, error: alertsError },
    ] = await Promise.all([
      supabase
        .from("purchases")
        .select(
          "id,purchase_number,invoice_number,purchase_date,total_amount,paid_amount,due_amount,due_date,notes"
        )
        .eq("company_id", companyId)
        .eq("supplier_id", vendor.id)
        .order("purchase_date", { ascending: false }),

      supabase
        .from("payments")
        .select(
          "id,payment_date,amount,payment_mode,reference_number,notes"
        )
        .eq("company_id", companyId)
        .eq("supplier_id", vendor.id)
        .order("payment_date", { ascending: false }),

      supabase
        .from("party_ledger")
        .select(
          "id,transaction_date,transaction_type,description,debit,credit,reference_id"
        )
        .eq("company_id", companyId)
        .eq("supplier_id", vendor.id)
        .order("transaction_date", { ascending: false }),

      supabase
        .from("payment_alerts")
        .select(
          "id,reference_id,due_date,amount,status,alert_sent"
        )
        .eq("company_id", companyId)
        .eq("supplier_id", vendor.id)
        .order("due_date", { ascending: true }),
    ]);

    if (purchasesError) {
      console.error("Vendor purchases error:", purchasesError);
    }

    if (paymentsError) {
      console.error("Vendor payments error:", paymentsError);
    }

    if (ledgerError) {
      console.error("Vendor ledger error:", ledgerError);
    }

    if (alertsError) {
      console.error("Vendor alerts error:", alertsError);
    }

    setVendorPurchases(purchases || []);
    setVendorPayments(payments || []);
    setVendorLedger(ledger || []);
    setVendorAlerts(alerts || []);

    setVendorDetailsLoading(false);
  }
  useEffect(() => {
    loadData();
  }, []);

  async function saveVendor(e: React.FormEvent) {
    e.preventDefault();

    if (!vendorName.trim()) {
      alert("Vendor name required");
      return;
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company not found. Please login again.");
      return;
    }

    const { error } = await supabase.from("suppliers").insert({
      company_id: companyId,
      name: vendorName.trim(),
      mobile: mobile.trim() || null,
      address: address.trim() || null,
      gst_number: gstNumber.trim() || null,
      opening_balance: 0,
      active: true,
    });

    if (error) {
      alert("Vendor save error: " + error.message);
      return;
    }

    setVendorName("");
    setMobile("");
    setAddress("");
    setGstNumber("");
    setShowVendorForm(false);

    await loadData();

    alert("Vendor added successfully.");
  }

  function addItem() {
    setItems([
      ...items,
      {
        raw_material_id: "",
        quantity: "",
        rate: "",
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;

    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: keyof PurchaseItem,
    value: string
  ) {
    const updated = [...items];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "raw_material_id") {
      const material = materials.find((m) => m.id === value);

      if (material?.purchase_rate != null) {
        updated[index].rate = String(material.purchase_rate);
      }
    }

    setItems(updated);
  }

  const purchaseTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return (
        sum +
        (Number(item.quantity) || 0) * (Number(item.rate) || 0)
      );
    }, 0);
  }, [items]);

  const remainingAmount = Math.max(
    purchaseTotal - (Number(paidAmount) || 0),
    0
  );

  async function savePurchase(e: React.FormEvent) {
    e.preventDefault();

    if (!vendorId) {
      alert("Please select Vendor");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.raw_material_id &&
        Number(item.quantity) > 0 &&
        Number(item.rate) >= 0
    );

    if (validItems.length === 0) {
      alert("Please add at least one raw material.");
      return;
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      alert("Company not found. Please login again.");
      return;
    }

    const paid = Number(paidAmount) || 0;

    if (paid > purchaseTotal) {
      alert("Paid amount cannot be greater than purchase total.");
      return;
    }

    setSaving(true);

    const purchaseNumber = `PUR-${Date.now()}`;

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        company_id: companyId,
        supplier_id: vendorId,
        purchase_number: purchaseNumber,
        purchase_date: purchaseDate,
        subtotal: purchaseTotal,
        gst_amount: 0,
        discount: 0,
        total_amount: purchaseTotal,
        paid_amount: paid,
        due_amount: remainingAmount,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      alert(
        "Purchase save error: " +
          (purchaseError?.message || "Unknown error")
      );
      setSaving(false);
      return;
    }

    const purchaseItems = validItems.map((item) => ({
      purchase_id: purchase.id,
      company_id: companyId,
      raw_material_id: item.raw_material_id,
      quantity: Number(item.quantity),
      quantity_kg: Number(item.quantity),
      unit:
        materials.find((m) => m.id === item.raw_material_id)?.unit ||
        "KG",
      rate: Number(item.rate),
      rate_per_kg: Number(item.rate),
      total_amount:
        Number(item.quantity) * Number(item.rate),
    }));

    const { error: itemError } = await supabase
      .from("purchase_items")
      .insert(purchaseItems);

    if (itemError) {
      await supabase.from("purchases").delete().eq("id", purchase.id);

      alert("Purchase items error: " + itemError.message);
      setSaving(false);
      return;
    }

    for (const item of validItems) {
      const material = materials.find(
        (m) => m.id === item.raw_material_id
      );

      if (!material) continue;

      const { data: currentMaterial } = await supabase
        .from("raw_materials")
        .select("current_stock")
        .eq("id", material.id)
        .eq("company_id", companyId)
        .single();

      const newStock =
        Number(currentMaterial?.current_stock || 0) +
        Number(item.quantity);

      await supabase
        .from("raw_materials")
        .update({
          current_stock: newStock,
          purchase_rate: Number(item.rate),
        })
        .eq("id", material.id)
        .eq("company_id", companyId);
    }

    const { error: ledgerError } = await supabase
      .from("party_ledger")
      .insert({
        company_id: companyId,
        supplier_id: vendorId,
        transaction_date: purchaseDate,
        transaction_type: "PURCHASE",
        reference_id: purchase.id,
        description: `Purchase ${purchaseNumber}`,
        debit: purchaseTotal,
        credit: 0,
      });

    if (ledgerError) {
      console.error("Vendor ledger error:", ledgerError);
    }

    if (paid > 0) {
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          company_id: companyId,
          supplier_id: vendorId,
          payment_date: purchaseDate,
          amount: paid,
          payment_mode: "Cash",
          reference_number: purchaseNumber,
          notes: "Purchase payment",
        })
        .select()
        .single();

      if (!paymentError && payment) {
        await supabase.from("party_ledger").insert({
          company_id: companyId,
          supplier_id: vendorId,
          transaction_date: purchaseDate,
          transaction_type: "PAYMENT",
          reference_id: payment.id,
          description: `Payment for ${purchaseNumber}`,
          debit: 0,
          credit: paid,
        });
      }
    }

    if (remainingAmount > 0 && dueDate) {
      await supabase.from("payment_alerts").insert({
        company_id: companyId,
        supplier_id: vendorId,
        reference_id: purchase.id,
        due_date: dueDate,
        amount: remainingAmount,
        status: "pending",
        alert_sent: false,
      });
    }

    setItems([
      {
        raw_material_id: "",
        quantity: "",
        rate: "",
      },
    ]);

    setVendorId("");
    setPaidAmount("");
    setDueDate("");
    setNotes("");
    setShowPurchaseForm(false);

    await loadData();

    alert(
      `Purchase saved successfully.\n\nPurchase: ${purchaseNumber}\nTotal: ?${purchaseTotal.toLocaleString(
        "en-IN"
      )}\nRemaining: ?${remainingAmount.toLocaleString("en-IN")}`
    );

    setSaving(false);
  }

  const filteredVendors = vendors.filter((vendor) =>
    `${vendor.name} ${vendor.mobile || ""} ${
      vendor.gst_number || ""
    }`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Truck size={17} />
              Accounts
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Vendors
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage vendors, purchases and outstanding payments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowVendorForm(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Plus size={18} />
              Add Vendor
            </button>

            <button
              onClick={() => setShowPurchaseForm(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
            >
              <FileText size={18} />
              New Purchase
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm text-slate-500">
              Total Vendors
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {vendors.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm text-slate-500">
              Raw Materials
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {materials.length}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm text-slate-500">
              Purchase System
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
              <CreditCard size={17} />
              Ready
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Vendor
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Mobile
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    GST
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Opening Balance
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Loading vendors...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {vendor.name}
                        </div>

                        {vendor.address && (
                          <div className="mt-1 text-xs text-slate-500">
                            {vendor.address}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {vendor.mobile || "Rs. "}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {vendor.gst_number || "Rs. "}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        Rs. {Number(
                          vendor.opening_balance || 0
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => loadVendorDetails(vendor)}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showVendorDetails && selectedVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-6 w-full max-w-6xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-5">
              <div>
                <div className="text-sm font-semibold text-slate-400">
                  Vendor Ledger
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {selectedVendor.name}
                </h2>

                <div className="mt-1 text-sm text-slate-500">
                  {selectedVendor.mobile || "No mobile"}{" "}
                  {selectedVendor.gst_number
                    ? `Rs.  GST: ${selectedVendor.gst_number}`
                    : ""}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowVendorDetails(false);
                  setSelectedVendor(null);
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {vendorDetailsLoading ? (
              <div className="p-10 text-center text-slate-500">
                Loading vendor details...
              </div>
            ) : (
              <div className="space-y-6 p-5">

                <div className="grid gap-4 md:grid-cols-3">

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm text-slate-500">
                      Total Purchase
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      Rs. 
                      {vendorPurchases
                        .reduce(
                          (sum, p) =>
                            sum + Number(p.total_amount || 0),
                          0
                        )
                        .toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm text-slate-500">
                      Total Paid
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-emerald-600">
                      Rs. 
                      {vendorPayments
                        .reduce(
                          (sum, p) =>
                            sum + Number(p.amount || 0),
                          0
                        )
                        .toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="text-sm text-amber-700">
                      Outstanding Payable
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-amber-800">
                      Rs. 
                      {Math.max(
                        vendorPurchases.reduce(
                          (sum, p) =>
                            sum + Number(p.due_amount || 0),
                          0
                        ),
                        0
                      ).toLocaleString("en-IN")}
                    </div>
                  </div>

                </div>

                <div className="rounded-2xl border border-slate-200">
                  <div className="border-b bg-slate-50 p-4">
                    <h3 className="font-extrabold text-slate-900">
                      Purchase History
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left">
                      <thead>
                        <tr className="border-b bg-white">
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Date
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Purchase No.
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Total
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Paid
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Balance
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Due Date
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {vendorPurchases.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-sm text-slate-500"
                            >
                              No purchases found.
                            </td>
                          </tr>
                        ) : (
                          vendorPurchases.map((purchase) => (
                            <tr
                              key={purchase.id}
                              className="border-b last:border-0"
                            >
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {purchase.purchase_date}
                              </td>

                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {purchase.purchase_number ||
                                  purchase.invoice_number ||
                                  "-"}
                              </td>

                              <td className="px-4 py-3 font-semibold">
                                Rs. 
                                {Number(
                                  purchase.total_amount || 0
                                ).toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 text-emerald-600">
                                Rs. 
                                {Number(
                                  purchase.paid_amount || 0
                                ).toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 font-bold text-amber-700">
                                Rs. 
                                {Number(
                                  purchase.due_amount || 0
                                ).toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-600">
                                {purchase.due_date || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => loadPurchaseBill(purchase)}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  View Bill
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <div className="border-b bg-slate-50 p-4">
                    <h3 className="font-extrabold text-slate-900">
                      Payment History
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Date
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Mode
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Reference
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {vendorPayments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-sm text-slate-500"
                            >
                              No payments found.
                            </td>
                          </tr>
                        ) : (
                          vendorPayments.map((payment) => (
                            <tr
                              key={payment.id}
                              className="border-b last:border-0"
                            >
                              <td className="px-4 py-3 text-sm">
                                {payment.payment_date}
                              </td>

                              <td className="px-4 py-3 font-bold text-emerald-600">
                                Rs. 
                                {Number(
                                  payment.amount || 0
                                ).toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 text-sm">
                                {payment.payment_mode}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-500">
                                {payment.reference_number || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <div className="border-b bg-slate-50 p-4">
                    <h3 className="font-extrabold text-slate-900">
                      Party Ledger
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Date
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Transaction
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                            Debit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                            Credit
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {vendorLedger.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-sm text-slate-500"
                            >
                              No ledger entries found.
                            </td>
                          </tr>
                        ) : (
                          vendorLedger.map((entry) => (
                            <tr
                              key={entry.id}
                              className="border-b last:border-0"
                            >
                              <td className="px-4 py-3 text-sm">
                                {entry.transaction_date}
                              </td>

                              <td className="px-4 py-3 font-bold text-slate-900">
                                {entry.transaction_type}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-500">
                                {entry.description || "-"}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-red-600">
                                Rs. 
                                {Number(
                                  entry.debit || 0
                                ).toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                Rs. 
                                {Number(
                                  entry.credit || 0
                                ).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50">
                  <div className="border-b border-amber-200 p-4">
                    <h3 className="font-extrabold text-amber-900">
                      Due Payment Alerts
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left">
                      <thead>
                        <tr className="border-b border-amber-200">
                          <th className="px-4 py-3 text-xs font-bold uppercase text-amber-700">
                            Due Date
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-amber-700">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase text-amber-700">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {vendorAlerts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-8 text-center text-sm text-amber-700"
                            >
                              No pending payment alerts.
                            </td>
                          </tr>
                        ) : (
                          vendorAlerts.map((alertItem) => (
                            <tr
                              key={alertItem.id}
                              className="border-b border-amber-100 last:border-0"
                            >
                              <td className="px-4 py-3 text-sm font-semibold">
                                {alertItem.due_date}
                              </td>

                              <td className="px-4 py-3 font-bold">
                                Rs. 
                                {Number(
                                  alertItem.amount || 0
                                ).toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 text-sm font-bold">
                                {alertItem.status || "pending"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
      {showVendorForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Add Vendor
                </h2>
                <p className="text-sm text-slate-500">
                  Vendor basic details
                </p>
              </div>

              <button
                onClick={() => setShowVendorForm(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveVendor} className="space-y-4 p-5">
              <input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor Name *"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
              />

              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile Number"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
              />

              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="GST Number"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
              />

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"
              >
                Save Vendor
              </button>
            </form>
          </div>
        </div>
      )}

      {showPurchaseForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-6 w-full max-w-5xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  New Vendor Purchase
                </h2>

                <p className="text-sm text-slate-500">
                  Purchase raw materials from vendor
                </p>
              </div>

              <button
                onClick={() => setShowPurchaseForm(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={savePurchase} className="space-y-5 p-5">

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Vendor *
                  </label>

                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select Vendor</option>

                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Purchase Date
                  </label>

                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[750px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                        Raw Material
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                        Quantity
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                        Rate / KG
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                        Amount
                      </th>

                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const amount =
                        (Number(item.quantity) || 0) *
                        (Number(item.rate) || 0);

                      return (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-3">
                            <select
                              value={item.raw_material_id}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "raw_material_id",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              <option value="">
                                Select Raw Material
                              </option>

{materials.map((material) => (
                                <option
                                  key={material.id}
                                  value={material.id}
                                >
                                  {material.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMaterialRow(index);
                                setShowMaterialModal(true);
                              }}
                              className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                            >
                              + New Material
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              placeholder="500"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "rate",
                                  e.target.value
                                )
                              }
                              placeholder="25"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            ?{amount.toLocaleString("en-IN")}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            >
                              <X size={17} />
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
                onClick={addItem}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={17} />
                Add Raw Material
              </button>

              <div className="grid gap-4 md:grid-cols-3">

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">
                    Purchase Total
                  </div>

                  <div className="mt-1 text-2xl font-extrabold text-slate-900">
                    ?{purchaseTotal.toLocaleString("en-IN")}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Paid Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <div className="text-sm text-amber-700">
                    Remaining Payable
                  </div>

                  <div className="mt-1 text-2xl font-extrabold text-amber-800">
                    ?{remainingAmount.toLocaleString("en-IN")}
                  </div>
                </div>

              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purchase notes"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <IndianRupee size={18} />

                {saving ? "Saving Purchase..." : "Save Purchase"}
              </button>

            </form>
          </div>
        </div>
      )}      
      {showPurchaseBill && selectedPurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Purchase Bill
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedPurchase.purchase_number || "Purchase Bill"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPurchaseBill(false)}
                className="rounded-lg px-3 py-2 text-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                Rs. 
              </button>
            </div>

            <div id="purchase-bill-print" className="p-6">

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    VENDOR
                  </h3>

                  <div className="mt-2 text-sm text-slate-600">
                    <div className="font-bold text-slate-900">
                      {selectedVendor?.name || "Vendor"}
                    </div>

                    {selectedVendor?.mobile && (
                      <div>Mobile: {selectedVendor.mobile}</div>
                    )}

                    {selectedVendor?.gst_number && (
                      <div>GST: {selectedVendor.gst_number}</div>
                    )}

                    {selectedVendor?.address && (
                      <div>{selectedVendor.address}</div>
                    )}
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    PURCHASE DETAILS
                  </h3>

                  <div className="mt-2 text-sm text-slate-600">
                    <div>
                      Purchase No:{" "}
                      <span className="font-bold text-slate-900">
                        {selectedPurchase.purchase_number || "-"}
                      </span>
                    </div>

                    {selectedPurchase.invoice_number && (
                      <div>
                        Invoice No:{" "}
                        <span className="font-bold text-slate-900">
                          {selectedPurchase.invoice_number}
                        </span>
                      </div>
                    )}

                    <div>
                      Date:{" "}
                      <span className="font-bold text-slate-900">
                        {selectedPurchase.purchase_date || "-"}
                      </span>
                    </div>

                    <div>
                      Due Date:{" "}
                      <span className="font-bold text-amber-700">
                        {selectedPurchase.due_date || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {purchaseBillLoading ? (
                <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Loading purchase items...
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Raw Material</th>
                          <th className="px-4 py-3 text-right">Quantity</th>
                          <th className="px-4 py-3 text-right">Rate</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {purchaseBillItems.map((item, index) => {
                          const material = materials.find(
                            (m) => m.id === item.raw_material_id
                          );

                          const quantity = Number(
                            item.quantity_kg ?? item.quantity ?? 0
                          );

                          const rate = Number(
                            item.rate_per_kg ?? item.rate ?? 0
                          );

                          return (
                            <tr
                              key={item.id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-3">
                                {index + 1}
                              </td>

                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {material?.name || "Raw Material"}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {quantity.toLocaleString("en-IN")}{" "}
                                {item.unit || material?.unit || "KG"}
                              </td>

                              <td className="px-4 py-3 text-right">
                                Rs. {rate.toLocaleString("en-IN")}
                              </td>

                              <td className="px-4 py-3 text-right font-bold">
                                Rs. {Number(
                                  item.total_amount || quantity * rate
                                ).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}

                        {purchaseBillItems.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              No purchase items found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 ml-auto max-w-sm space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total</span>
                      <span className="font-bold">
                        Rs. {Number(
                          selectedPurchase.total_amount || 0
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Paid</span>
                      <span className="font-bold text-green-700">
                        Rs. {Number(
                          selectedPurchase.paid_amount || 0
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-3 text-lg">
                      <span className="font-extrabold">Remaining</span>
                      <span className="font-extrabold text-amber-700">
                        Rs. {Number(
                          selectedPurchase.due_amount || 0
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {selectedPurchase.notes && (
                    <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm">
                      <div className="font-bold text-slate-700">Notes</div>
                      <div className="mt-1 text-slate-600">
                        {selectedPurchase.notes}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowPurchaseBill(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>

              <button
  type="button"
  onClick={() => window.print()}
  className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
>
  Print / Save PDF
</button>

<button
  type="button"
  onClick={sharePurchaseBillWhatsApp}
  className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
>
  Share on WhatsApp
</button>
            </div>

          </div>
        </div>
      )}
{showMaterialModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Add New Material</h2>
        <button
          type="button"
          onClick={() => setShowMaterialModal(false)}
          className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
        >
          X
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Material Name *
          </label>
          <input
            value={newMaterialName}
            onChange={(e) => setNewMaterialName(e.target.value)}
            placeholder="Example: Maize"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Material Code
          </label>
          <input
            value={newMaterialCode}
            onChange={(e) => setNewMaterialCode(e.target.value)}
            placeholder="Example: MAIZE-001"
            className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Unit
            </label>
            <select
              value={newMaterialUnit}
              onChange={(e) => setNewMaterialUnit(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="KG">KG</option>
              <option value="TON">TON</option>
              <option value="BAG">BAG</option>
              <option value="LITRE">LITRE</option>
              <option value="PCS">PCS</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Purchase Rate
            </label>
            <input
              type="number"
              min="0"
              value={newMaterialRate}
              onChange={(e) => setNewMaterialRate(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => setShowMaterialModal(false)}
            className="rounded-xl border px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveNewMaterial}
            disabled={newMaterialSaving}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {newMaterialSaving ? "Saving..." : "Save Material"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}