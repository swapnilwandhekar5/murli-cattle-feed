"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Package,
  Factory,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  BookOpen,
  Landmark,
  Truck,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";

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
      { name: "Products & Recipes", href: "/recipes", icon: Boxes },
      { name: "Production", href: "/production", icon: Factory },
      { name: "Finished Stock", href: "/finished-stock", icon: Boxes },
    ],
  },
  {
    title: "SALES & CUSTOMERS",
    items: [
      { name: "Sales", href: "/sales", icon: ShoppingCart },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Customer Payments", href: "/customer-payments", icon: CreditCard },
      { name: "Customer Ledger", href: "/customer-ledger", icon: BookOpen },
    ],
  },
  {
    title: "ACCOUNTS",
    items: [
      { name: "Bank & Cash", href: "/bank-cash", icon: Landmark },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Supplier Payments", href: "/supplier-payments", icon: CreditCard },
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
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isSignupPage = pathname === "/signup" || pathname === "/signup/";

  useEffect(() => {
    if (isLoginPage || isSignupPage) {
      setCheckingAuth(false);
      return;
    }

    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setUserEmail(data.session.user.email ?? "");
      setCheckingAuth(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isLoginPage && !isSignupPage) {
        router.replace("/login");
        return;
      }

      if (session) {
        setUserEmail(session.user.email ?? "");
        setCheckingAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (isLoginPage || isSignupPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />
          <p className="text-sm text-slate-500">Loading MURLI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[270px] bg-slate-950 text-white transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-lg font-bold shadow-lg">
                M
              </div>

              <div>
                <div className="font-bold tracking-wide">MURLI</div>
                <div className="text-xs text-slate-400">Cattle Feed</div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-5">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6">
                <div className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-slate-500">
                  {section.title}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-green-600 text-white shadow-lg shadow-green-900/20"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="flex-1">{item.name}</span>
                        {active && <ChevronRight size={15} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 rounded-xl bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Logged in as
              </p>
              <p className="mt-1 truncate text-xs text-slate-300">
                {userEmail || "Admin"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div>
            <h1 className="text-sm font-bold text-slate-800">
              MURLI Cattle Feed
            </h1>
            <p className="text-xs text-slate-400">
              Manufacturing Management System
            </p>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
