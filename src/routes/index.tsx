import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardList,
  PackagePlus,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { PageTitle } from "@/components/shop/AppLayout";
import { StatCard } from "@/components/shop/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { money, useDayTotals, useLowStock, useShop } from "@/lib/shop/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Nosha Shop Manager" },
      {
        name: "description",
        content:
          "See today's sales, profit, expenses, expected cash and low stock at a glance.",
      },
      { property: "og:title", content: "Dashboard | Nosha Shop Manager" },
      {
        property: "og:description",
        content: "Today's sales, profit, expenses, expected cash and low stock.",
      },
    ],
  }),
  component: Dashboard,
});

const ACTIONS = [
  { to: "/sales", label: "New Sale", icon: ShoppingCart },
  { to: "/add-stock", label: "Add Stock", icon: PackagePlus },
  { to: "/expenses", label: "Add Expense", icon: Receipt },
  { to: "/stock-take", label: "Stock Take", icon: ClipboardList },
  { to: "/closing", label: "Close Day", icon: Wallet },
] as const;

function Dashboard() {
  const { data } = useShop();
  const today = useDayTotals();
  const lowStock = useLowStock();
  const navigate = useNavigate();

  const recent = [
    ...today.sales.slice(0, 5).map((s) => ({
      id: s.id,
      when: s.date,
      text: `Sale — ${s.items.length} item(s) · ${s.payment}`,
      amount: s.total,
    })),
    ...today.expenses.slice(0, 5).map((e) => ({
      id: e.id,
      when: e.date,
      text: `Expense — ${e.description}`,
      amount: -e.amount,
    })),
  ]
    .sort((a, b) => +new Date(b.when) - +new Date(a.when))
    .slice(0, 6);

  return (
    <div>
      <PageTitle
        title={`Good day, ${data.settings.shopName}`}
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Today's Sales" value={money(today.totalSales)} tone="accent" />
        <StatCard
          label="Gross Profit"
          value={money(today.grossProfit)}
          tone="positive"
        />
        <StatCard label="Expenses" value={money(today.totalExpenses)} />
        <StatCard label="Expected Cash" value={money(today.expectedCash)} />
        <StatCard
          label="Low Stock"
          value={`${lowStock.length} items`}
          tone={lowStock.length ? "negative" : "default"}
        />
        <StatCard
          label="Net Result"
          value={money(today.netResult)}
          tone={today.netResult >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Button
            key={to}
            asChild
            size="lg"
            variant={to === "/sales" ? "default" : "secondary"}
            className="h-24 flex-col gap-2 rounded-2xl text-base font-semibold"
          >
            <Link to={to}>
              <Icon className="size-6" />
              {label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            <h2 className="text-lg font-bold">Low Stock</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Everything is well stocked.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.stock === 0 ? "Out of stock" : `${p.stock} remaining`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({ to: "/add-stock", search: { product: p.id } })
                    }
                  >
                    Add Stock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing recorded yet today.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{r.text}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.when).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p
                    className={
                      r.amount >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"
                    }
                  >
                    {r.amount >= 0 ? "+" : "-"}
                    {money(Math.abs(r.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
