"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Factory,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
};

type Production = {
  id: string;
  batch_number: string;
  production_date: string;
  bags_produced: number | null;
  total_production_cost: number | null;
  cost_per_bag: number | null;
};

type RawMaterial = {
  id: string;
  name: string;
  current_stock: number | null;
  minimum_stock: number | null;
};

type FinishedStock = {
  id: string;
  quantity_bags: number | null;
  quantity_kg: number | null;
  products?: { name: string } | { name: string }[] | null;
};

type BankAccount = {
  id: string;
  account_name: string;
  account_type: string | null;
  current_balance: number | null;
};

type Payment = {
  id: string;
  payment_date: string;
  amount: number | null;
  payment_mode: string | null;
};

type SalesChartRow = {
  date: string;
  sales: number;
};

type ProductionChartRow = {
  date: string;
  bags: number;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function shortDate(value: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function productName(
  products: { name: string } | { name: string }[] | null | undefined
) {
  if (!products) return "-";
  if (Array.isArray(products)) return products[0]?.name ?? "-";
  return products.name;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sales, setSales] = useState<Sale[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [finishedStock, setFinishedStock] = useState<FinishedStock[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  async function loadDashboard() {
    try {
      setRefreshing(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User login session not found.");
      }

      const { data: member, error: memberError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (memberError || !member?.company_id) {
        throw new Error("Company information not found.");
      }

      const companyId = member.company_id;

      const [
        salesResult,
        productionResult,
        rawResult,
        finishedResult,
        accountsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select(
            "id, invoice_number, sale_date, total_amount, paid_amount, due_amount"
          )
          .eq("company_id", companyId)
          .order("sale_date", { ascending: false })
          .limit(100),

        supabase
          .from("production_batches")
          .select(
            "id, batch_number, production_date, bags_produced, total_production_cost, cost_per_bag"
          )
          .eq("company_id", companyId)
          .order("production_date", { ascending: false })
          .limit(100),

        supabase
          .from("raw_materials")
          .select("id, name, current_stock, minimum_stock")
          .eq("company_id", companyId)
          .order("name"),

        supabase
          .from("finished_goods_stock")
          .select("id, quantity_bags, quantity_kg, products(name)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),

        supabase
          .from("bank_accounts")
          .select("id, account_name, account_type, current_balance")
          .eq("company_id", companyId)
          .order("account_name"),

        supabase
          .from("payments")
          .select("id, payment_date, amount, payment_mode")
          .eq("company_id", companyId)
          .order("payment_date", { ascending: false })
          .limit(10),
      ]);

      if (!salesResult.error) setSales(salesResult.data ?? []);
      if (!productionResult.error) setProduction(productionResult.data ?? []);
      if (!rawResult.error) setRawMaterials(rawResult.data ?? []);
      if (!finishedResult.error) setFinishedStock(finishedResult.data ?? []);
      if (!accountsResult.error) setAccounts(accountsResult.data ?? []);
      if (!paymentsResult.error) setPayments(paymentsResult.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalSales = sales.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const totalPaid = sales.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0
  );

  const totalDue = sales.reduce(
    (sum, item) => sum + Number(item.due_amount || 0),
    0
  );

  const productionCost = production.reduce(
    (sum, item) => sum + Number(item.total_production_cost || 0),
    0
  );

  const productionBags = production.reduce(
    (sum, item) => sum + Number(item.bags_produced || 0),
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
    .filter((item) => item.account_type === "CASH")
    .reduce((sum, item) => sum + Number(item.current_balance || 0), 0);

  const bankBalance = accounts
    .filter((item) => item.account_type !== "CASH")
    .reduce((sum, item) => sum + Number(item.current_balance || 0), 0);

  const lowStock = rawMaterials.filter(
    (item) =>
      Number(item.minimum_stock || 0) > 0 &&
      Number(item.current_stock || 0) <= Number(item.minimum_stock || 0)
  );

  const today = new Date().toISOString().slice(0, 10);

  const todaySales = sales
    .filter((item) => item.sale_date === today)
    .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  const todayProduction = production
    .filter((item) => item.production_date === today)
    .reduce((sum, item) => sum + Number(item.bags_produced || 0), 0);

  const salesChart: SalesChartRow[] = [...sales]
    .slice(0, 7)
    .reverse()
    .map((item) => ({
      date: shortDate(item.sale_date),
      sales: Number(item.total_amount || 0),
    }));

  const productionChart: ProductionChartRow[] = [...production]
    .slice(0, 7)
    .reverse()
    .map((item) => ({
      date: shortDate(item.production_date),
      bags: Number(item.bags_produced || 0),
    }));

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-72 rounded-xl bg-slate-800" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-32 rounded-2xl bg-slate-800" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1500px] p-4 md:p-6 lg:p-8">
        {/* HEADER */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg">
                <Factory size={21} />
              </div>
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                MURLI
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Business Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Cattle Feed Manufacturing & Management
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* KPI CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Sales"
            value={money(totalSales)}
            subtitle={`${sales.length} invoices`}
            icon={<TrendingUp size={21} />}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <KpiCard
            title="Customer Outstanding"
            value={money(totalDue)}
            subtitle="Receivable amount"
            icon={<CreditCard size={21} />}
            iconClass="bg-amber-50 text-amber-600"
          />

          <KpiCard
            title="Cash Balance"
            value={money(cashBalance)}
            subtitle="Available cash"
            icon={<Wallet size={21} />}
            iconClass="bg-blue-50 text-blue-600"
          />

          <KpiCard
            title="Bank Balance"
            value={money(bankBalance)}
            subtitle="All bank accounts"
            icon={<Banknote size={21} />}
            iconClass="bg-violet-50 text-violet-600"
          />
        </section>

        {/* SECOND KPI ROW */}
        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            title="Today's Sales"
            value={money(todaySales)}
            icon={<ShoppingCart size={18} />}
            positive
          />

          <MiniStat
            title="Today's Production"
            value={`${todayProduction} Bags`}
            icon={<Factory size={18} />}
          />

          <MiniStat
            title="Finished Stock"
            value={`${finishedBags} Bags`}
            icon={<Package size={18} />}
          />

          <MiniStat
            title="Production Cost"
            value={money(productionCost)}
            icon={<CircleDollarSign size={18} />}
          />
        </section>

        {/* CHARTS */}
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="Sales Overview"
            subtitle="Recent invoice sales"
            icon={<TrendingUp size={19} />}
          >
            {salesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesChart}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopOpacity={0.28} />
                      <stop offset="100%" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(value) => `₹${value / 1000}k`}
                  />

                  <Tooltip
                    formatter={(value) => [money(Number(value)), "Sales"]}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(15,23,42,.10)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="sales"
                    strokeWidth={3}
                    fill="url(#salesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Sales data will appear here" />
            )}
          </ChartCard>

          <ChartCard
            title="Production Overview"
            subtitle="Recent production batches"
            icon={<Factory size={19} />}
          >
            {productionChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={productionChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />

                  <Tooltip
                    formatter={(value) => [`${value} Bags`, "Production"]}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(15,23,42,.10)",
                    }}
                  />

                  <Bar
                    dataKey="bags"
                    radius={[7, 7, 0, 0]}
                    barSize={35}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Production data will appear here" />
            )}
          </ChartCard>
        </section>

        {/* STOCK + ALERTS */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold">Finished Goods Stock</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Current ready stock
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                {finishedKg.toLocaleString("en-IN")} KG
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {finishedStock.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No finished stock available.
                </div>
              ) : (
                finishedStock.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                        <Boxes size={19} className="text-slate-600" />
                      </div>

                      <div>
                        <p className="text-sm font-bold">
                          {productName(item.products)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {Number(item.quantity_kg || 0).toLocaleString(
                            "en-IN"
                          )}{" "}
                          KG
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      {Number(item.quantity_bags || 0)} Bags
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold">Raw Material Alerts</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Materials at minimum stock level
                </p>
              </div>

              <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-red-50 px-2 text-sm font-bold text-red-600">
                {lowStock.length}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <Activity className="text-emerald-600" size={22} />
                  </div>
                  <p className="font-semibold">Stock looks healthy</p>
                  <p className="mt-1 text-xs text-slate-500">
                    No low-stock materials detected.
                  </p>
                </div>
              ) : (
                lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                        <AlertTriangle size={18} className="text-red-600" />
                      </div>

                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          Minimum: {Number(item.minimum_stock || 0)} KG
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                      {Number(item.current_stock || 0)} KG
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* RECENT SALES + PRODUCTION */}
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <DataTable
            title="Recent Sales"
            subtitle="Latest customer invoices"
            icon={<ShoppingCart size={19} />}
          >
            {sales.slice(0, 6).map((sale) => (
              <div
                key={sale.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold">{sale.invoice_number}</p>
                  <p className="text-xs text-slate-500">
                    {shortDate(sale.sale_date)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold">
                    {money(Number(sale.total_amount || 0))}
                  </p>
                  <p className="text-xs text-emerald-600">
                    Paid {money(Number(sale.paid_amount || 0))}
                  </p>
                </div>

                <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))}

            {sales.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No sales yet.
              </div>
            )}
          </DataTable>

          <DataTable
            title="Recent Production"
            subtitle="Latest manufacturing batches"
            icon={<Factory size={19} />}
          >
            {production.slice(0, 6).map((batch) => (
              <div
                key={batch.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold">{batch.batch_number}</p>
                  <p className="text-xs text-slate-500">
                    {shortDate(batch.production_date)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold">
                    {Number(batch.bags_produced || 0)} Bags
                  </p>
                  <p className="text-xs text-slate-500">
                    {money(Number(batch.cost_per_bag || 0))}/bag
                  </p>
                </div>

                <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))}

            {production.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No production yet.
              </div>
            )}
          </DataTable>
        </section>

        {/* ACCOUNTS + PAYMENTS */}
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <DataTable
            title="Bank & Cash Accounts"
            subtitle="Current account balances"
            icon={<Wallet size={19} />}
          >
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    {account.account_type === "CASH" ? (
                      <Wallet size={18} className="text-slate-600" />
                    ) : (
                      <Banknote size={18} className="text-slate-600" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold">{account.account_name}</p>
                    <p className="text-xs uppercase text-slate-400">
                      {account.account_type || "BANK"}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-black">
                  {money(Number(account.current_balance || 0))}
                </p>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No accounts added yet.
              </div>
            )}
          </DataTable>

          <DataTable
            title="Recent Payments"
            subtitle="Latest customer payments"
            icon={<CreditCard size={19} />}
          >
            {payments.slice(0, 6).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <ArrowDownRight
                      size={18}
                      className="text-emerald-600"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      {payment.payment_mode || "Payment"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {shortDate(payment.payment_date)}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-black text-emerald-600">
                  +{money(Number(payment.amount || 0))}
                </p>
              </div>
            ))}

            {payments.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No payments yet.
              </div>
            )}
          </DataTable>
        </section>

        {/* FOOTER SUMMARY */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryBox
            icon={<ArrowUpRight size={18} />}
            title="Collected"
            value={money(totalPaid)}
            text="Total amount received from sales"
          />

          <SummaryBox
            icon={<CircleDollarSign size={18} />}
            title="Receivable"
            value={money(totalDue)}
            text="Outstanding customer amount"
          />

          <SummaryBox
            icon={<Package size={18} />}
            title="Production"
            value={`${productionBags.toLocaleString("en-IN")} Bags`}
            text={`Production cost ${money(productionCost)}`}
          />
        </div>
      </div>
    </main>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  icon,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          positive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
        }`}
      >
        {icon}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <p className="mt-0.5 text-lg font-black">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          {icon}
        </div>

        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function DataTable({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          {icon}
        </div>

        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function SummaryBox({
  icon,
  title,
  value,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        {icon}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-black">{value}</p>

      <p className="mt-1 text-xs text-slate-400">{text}</p>
    </div>
  );
}
