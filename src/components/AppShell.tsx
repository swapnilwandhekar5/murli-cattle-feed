"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
  LayoutDashboard,
  Package,
  FlaskConical,
  Factory,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  BookOpen,
  Landmark,
  Truck,
  WalletCards,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const menuSections = [
  {
    title: "MAIN",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "INVENTORY & PRODUCTION",
    items: [
      { name: "Raw Materials", href: "/raw-materials", icon: Package },
      { name: "Products & Recipes", href: "/recipes", icon: FlaskConical },
      { name: "Production", href: "/production", icon: Factory },
      { name: "Finished Stock", href: "/finished-stock", icon: Boxes },
    ],
  },
  {
    title: "SALES & CUSTOMERS",
    items: [
      { name: "Sales", href: "/sales", icon: ShoppingCart },
      { name: "Customers", href: "/customer-ledger", icon: Users },
      { name: "Customer Payments", href: "/customer-payments", icon: CreditCard },
      { name: "Customer Ledger", href: "/customer-ledger", icon: BookOpen },
    ],
  },
  {
    title: "ACCOUNTS",
    items: [
      { name: "Bank & Cash", href: "/bank-cash", icon: Landmark },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Supplier Payments", href: "/supplier-payments", icon: WalletCards },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[270px] flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-white shadow-lg">
              M
            </div>

            <div>
              <div className="text-lg font-extrabold tracking-tight">
                MURLI
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Cattle Feed
              </div>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-6">
              <div className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                {section.title}
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-slate-900 text-white shadow-md"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={18} strokeWidth={2} />

                      <span className="flex-1">{item.name}</span>

                      {active && <ChevronRight size={15} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-400">
              BUSINESS MANAGEMENT
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">
              MURLI Cattle Feed
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Manufacturing ERP
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="text-sm font-bold text-slate-800">
                MURLI Cattle Feed
              </div>
              <div className="text-[11px] text-slate-400">
                Manufacturing Management System
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-center text-sm font-bold leading-9 text-white">
              M
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}
