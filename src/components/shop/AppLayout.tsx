import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  PackagePlus,
  Receipt,
  Settings as SettingsIcon,
  ShoppingCart,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useShop } from "@/lib/shop/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/add-stock", label: "Add Stock", icon: PackagePlus },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/stock-take", label: "Stock Take", icon: ClipboardList },
  { to: "/closing", label: "Daily Closing", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-secondary",
            )}
          >
            <Icon className="size-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const { data } = useShop();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const Status = online ? Wifi : WifiOff;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-5 py-6">
          <p className="text-lg font-bold text-primary">{data.settings.shopName}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Status className="size-3.5" />
            <span>{online ? "Online" : "Offline mode - saved on this device"}</span>
          </div>
        </div>
        <NavList />
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="px-5 py-6">
              <p className="text-lg font-bold text-primary">{data.settings.shopName}</p>
              <p className="text-xs text-muted-foreground">Shop Manager</p>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <p className="text-base font-bold text-primary">{data.settings.shopName}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Status className="size-3" /> {online ? "Online" : "Offline - saved here"}
          </p>
        </div>
      </header>

      <main className="px-4 py-6 md:ml-64 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
