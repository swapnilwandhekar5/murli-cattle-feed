"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart3,
  CalendarDays,
  IndianRupee,
  Package,
  Factory,
  ShoppingCart,
  Users,
  Truck,
  Landmark,
  RefreshCw,
} from "lucide-react";

type Sale = {
  id: string;
  sale_date: string;
  total_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
};

type Production = {
  id: string;
  production_date: string;
  bags_produced: number | null;
  total_quantity_kg: number | null;
  total_production_cost: number | null;
};

type RawMaterial = {
  id: string;
  name: string;
  current_stock: number | null;
  minimum_stock: number | null;
  purchase_rate: number | null;
};

type FinishedStock = {
  id: string;
  product_id: string;
  quantity_bags: number | null;
  quantity_kg: number | null;
  batch_number: string | null;
};

type Product = {
  id: string;
  name: string;
};

type LedgerEntry = {
  id: string;
  customer_id: string | null;
  supplier_id: string | null;
  debit: number | null;
  credit: number | null;
};

type BankAccount = {
  id: string;
  account_name: string;
  bank_name: string | null;
  current_balance: number | null;
  account_type: string | null;
};

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [finishedStock, setFinishedStock] = useState<FinishedStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);

    const [
      salesResult,
      productionResult,
      rawResult,
      finishedResult,
      productsResult,
      ledgerResult,
      accountsResult,
    ] = await Promise.all([
      supabase
        .from("sales")
        .select("id,sale_date,total_amount,paid_amount,due_amount")
        .order("sale_date", { ascending: false }),

      supabase
        .from("production_batches")
        .select(
          "id,production_date,bags_produced,total_quantity_kg,total_production_cost"
        )
        .order("production_date", { ascending: false }),

      supabase
        .from("raw_materials")
        .select("id,name,current_stock,minimum_stock,purchase_rate")
        .order("name"),

      supabase
        .from("finished_goods_stock")
        .select("id,product_id,quantity_bags,quantity_kg,batch_number"),

      supabase
        .from("products")
        .select("id,name")
        .order("name"),

      supabase
        .from("party_ledger")
        .select("id,customer_id,supplier_id,debit,credit"),

      supabase
        .from("bank_accounts")
        .select("id,account_name,bank_name,current_balance,account_type")
        .order("account_name"),
    ]);

    setSales(salesResult.data || []);
    setProduction(productionResult.data || []);
    setRawMaterials(rawResult.data || []);
    setFinishedStock(finishedResult.data || []);
    setProducts(productsResult.data || []);
    setLedger(ledgerResult.data || []);
    setAccounts(accountsResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filteredSales = sales.filter((item) => {
    if (fromDate && item.sale_date < fromDate) return false;
    if (toDate && item.sale_date > toDate) return false;
    return true;
  });

  const filteredProduction = production.filter((item) => {
    if (fromDate && item.production_date < fromDate) return false;
    if (toDate && item.production_date > toDate) return false;
    return true;
  });

  const totalSales = filteredSales.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const totalPaid = filteredSales.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0
  );

  const totalSalesDue = filteredSales.reduce(
    (sum, item) => sum + Number(item.due_amount || 0),
    0
  );

  const totalProduction = filteredProduction.reduce(
    (sum, item) => sum + Number(item.total_production_cost || 0),
    0
  );

  const totalBagsProduced = filteredProduction.reduce(
    (sum, item) => sum + Number(item.bags_produced || 0),
    0
  );

  const totalProductionKg = filteredProduction.reduce(
    (sum, item) => sum + Number(item.total_quantity_kg || 0),
    0
  );

  const customerOutstanding = ledger
    .filter((entry) => entry.customer_id)
    .reduce(
      (sum, entry) =>
        sum + Number(entry.debit || 0) - Number(entry.credit || 0),
      0
    );

  const supplierOutstanding = ledger
    .filter((entry) => entry.supplier_id)
    .reduce(
      (sum, entry) =>
        sum + Number(entry.debit || 0) - Number(entry.credit || 0),
      0
    );

  const rawStockValue = rawMaterials.reduce(
    (sum, item) =>
      sum +
      Number(item.current_stock || 0) *
        Number(item.purchase_rate || 0),
    0
  );

  const finishedBags = finishedStock.reduce(
    (sum, item) => sum + Number(item.quantity_bags || 0),
    0
  );

  const finishedKg = finishedStock.reduce(
    (sum, item) => sum + Number(item.quantity_kg || 0),
    0
  );

  const cashBalance = accounts
    .filter((account) => account.account_type === "CASH")
    .reduce((sum, account) => sum + Number(account.current_balance || 0), 0);

  const bankBalance = accounts
    .filter((account) => account.account_type !== "CASH")
    .reduce((sum, account) => sum + Number(account.current_balance || 0), 0);

  function productName(productId: string) {
    return products.find((product) => product.id === productId)?.name || "Unknown Product";
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <BarChart3 size={17} />
              Accounts & Analytics
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Business Reports
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Sales, production, stock and financial overview.
            </p>
          </div>

          <button
            onClick={loadReports}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-extrabold text-slate-900">
            <CalendarDays size={18} />
            Report Period
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="self-end rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Clear Dates
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
            Loading reports...
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Sales"
                value={`₹${totalSales.toLocaleString("en-IN")}`}
                icon={<ShoppingCart size={20} />}
              />

              <StatCard
                title="Production Cost"
                value={`₹${totalProduction.toLocaleString("en-IN")}`}
                icon={<Factory size={20} />}
              />

              <StatCard
                title="Customer Outstanding"
                value={`₹${customerOutstanding.toLocaleString("en-IN")}`}
                icon={<Users size={20} />}
              />

              <StatCard
                title="Supplier Outstanding"
                value={`₹${supplierOutstanding.toLocaleString("en-IN")}`}
                icon={<Truck size={20} />}
              />
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SmallCard
                title="Sales Received"
                value={`₹${totalPaid.toLocaleString("en-IN")}`}
              />

              <SmallCard
                title="Sales Due"
                value={`₹${totalSalesDue.toLocaleString("en-IN")}`}
              />

              <SmallCard
                title="Bags Produced"
                value={totalBagsProduced.toLocaleString("en-IN")}
              />

              <SmallCard
                title="Production KG"
                value={`${totalProductionKg.toLocaleString("en-IN")} KG`}
              />
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Package size={20} />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-slate-900">
                      Raw Material Stock
                    </h2>
                    <p className="text-xs text-slate-400">
                      Current inventory value
                    </p>
                  </div>
                </div>

                <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-400">
                    STOCK VALUE
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">
                    ₹{rawStockValue.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="space-y-3">
                  {rawMaterials.slice(0, 8).map((item) => {
                    const low =
                      Number(item.current_stock || 0) <=
                      Number(item.minimum_stock || 0);

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            Rate ₹{Number(item.purchase_rate || 0).toLocaleString("en-IN")}/KG
                          </div>
                        </div>

                        <div
                          className={`text-right text-sm font-extrabold ${
                            low ? "text-red-600" : "text-slate-800"
                          }`}
                        >
                          {Number(item.current_stock || 0).toLocaleString("en-IN")} KG
                          {low && (
                            <div className="text-[10px] uppercase">
                              Low Stock
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Package size={20} />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-slate-900">
                      Finished Goods
                    </h2>
                    <p className="text-xs text-slate-400">
                      Current finished stock
                    </p>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      TOTAL BAGS
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {finishedBags.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      TOTAL KG
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {finishedKg.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {finishedStock.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {productName(item.product_id)}
                        </div>
                        <div className="text-xs text-slate-400">
                          Batch {item.batch_number || "—"}
                        </div>
                      </div>

                      <div className="text-right text-sm font-extrabold text-slate-800">
                        {Number(item.quantity_bags || 0).toLocaleString("en-IN")} Bags
                        <div className="text-xs font-medium text-slate-400">
                          {Number(item.quantity_kg || 0).toLocaleString("en-IN")} KG
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Landmark size={20} />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-slate-900">
                      Bank & Cash
                    </h2>
                    <p className="text-xs text-slate-400">
                      Current account balances
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      CASH
                    </div>
                    <div className="mt-1 text-xl font-extrabold text-slate-900">
                      ₹{cashBalance.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      BANK
                    </div>
                    <div className="mt-1 text-xl font-extrabold text-slate-900">
                      ₹{bankBalance.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                    >
                      <div className="text-sm font-bold text-slate-800">
                        {account.account_name}
                        <div className="text-xs font-normal text-slate-400">
                          {account.bank_name || account.account_type || "Account"}
                        </div>
                      </div>

                      <div className="text-sm font-extrabold text-slate-900">
                        ₹{Number(account.current_balance || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <ShoppingCart size={20} />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-slate-900">
                      Sales Report
                    </h2>
                    <p className="text-xs text-slate-400">
                      Sales for selected period
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-xs font-bold text-slate-500">
                          Date
                        </th>
                        <th className="px-3 py-3 text-xs font-bold text-slate-500">
                          Total
                        </th>
                        <th className="px-3 py-3 text-xs font-bold text-slate-500">
                          Paid
                        </th>
                        <th className="px-3 py-3 text-xs font-bold text-slate-500">
                          Due
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.slice(0, 10).map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-3 py-3 text-sm text-slate-600">
                            {sale.sale_date}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-slate-800">
                            ₹{Number(sale.total_amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-green-600">
                            ₹{Number(sale.paid_amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-red-600">
                            ₹{Number(sale.due_amount || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}

                      {filteredSales.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-8 text-center text-sm text-slate-400"
                          >
                            No sales for selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
        {icon}
      </div>

      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </div>

      <div className="mt-1 text-2xl font-extrabold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function SmallCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-extrabold text-slate-800">
        {value}
      </div>
    </div>
  );
}
