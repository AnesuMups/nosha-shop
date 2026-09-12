import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageTitle } from "@/components/shop/AppLayout";
import { StatCard, StockBadge } from "@/components/shop/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, startOfMonth, startOfWeek, stockStatus, useShop } from "@/lib/shop/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Nosha Shop Manager" },
      {
        name: "description",
        content: "See sales, profit, expenses and best sellers for today, the week or any dates.",
      },
      { property: "og:title", content: "Reports | Nosha Shop Manager" },
      { property: "og:description", content: "Sales and profit summaries for your shop." },
    ],
  }),
  component: ReportsPage,
});

type RangeKey = "today" | "week" | "month" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function ReportsPage() {
  const { data } = useShop();
  const [range, setRange] = useState<RangeKey>("today");
  const [from, setFrom] = useState(iso(startOfMonth()));
  const [to, setTo] = useState(iso(new Date()));

  const [start, end] = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      return [s, now];
    }
    if (range === "week") return [startOfWeek(), now];
    if (range === "month") return [startOfMonth(), now];
    return [new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59`)];
  }, [range, from, to]);

  const stats = useMemo(() => {
    const sales = data.sales.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
    const expenses = data.expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
    const totalSales = sales.reduce((s, x) => s + x.total, 0);
    const cogs = sales.reduce((s, x) => s + x.cost, 0);
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
    const itemsSold = sales.reduce(
      (s, x) => s + x.items.reduce((n, i) => n + i.qty, 0),
      0,
    );

    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const sale of sales) {
      for (const i of sale.items) {
        const cur = byProduct.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 };
        cur.qty += i.qty;
        cur.revenue += i.qty * i.sellPrice;
        byProduct.set(i.productId, cur);
      }
    }
    const top = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

    return {
      count: sales.length,
      totalSales,
      cogs,
      grossProfit: totalSales - cogs,
      totalExpenses,
      netResult: totalSales - cogs - totalExpenses,
      itemsSold,
      top,
    };
  }, [data.sales, data.expenses, start, end]);

  const lowStock = data.products.filter((p) => p.stock <= p.minStock);

  return (
    <div>
      <PageTitle title="Reports" subtitle="How the shop is doing." />

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["custom", "Custom Date"],
            ] as [RangeKey, string][]
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={range === key ? "default" : "outline"}
              className="h-12"
              onClick={() => setRange(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        {range === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-12"
              />
            </div>
          </div>
        ) : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Sales" value={money(stats.totalSales)} tone="accent" />
        <StatCard label="Cost of Goods Sold" value={money(stats.cogs)} />
        <StatCard label="Gross Profit" value={money(stats.grossProfit)} tone="positive" />
        <StatCard label="Total Expenses" value={money(stats.totalExpenses)} />
        <StatCard
          label="Net Result"
          value={money(stats.netResult)}
          tone={stats.netResult >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Sales / Items" value={`${stats.count} / ${stats.itemsSold}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Top Selling Products</h2>
          {stats.top.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sales in this period.</p>
          ) : (
            <>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.top}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis width={30} />
                    <Tooltip formatter={(v: number) => `${v}`} />
                    <Bar dataKey="qty" fill="var(--color-chart-1)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {stats.top.map((t) => (
                  <li key={t.name} className="flex justify-between py-2 text-sm">
                    <span>{t.name}</span>
                    <span className="font-medium">
                      {t.qty} sold · {money(t.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Low Stock Products</h2>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Everything is well stocked.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.stock} remaining</p>
                  </div>
                  <StockBadge status={stockStatus(p)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.closings.length > 0 ? (
        <Card className="mt-4 p-5">
          <h2 className="text-lg font-bold">Past Day Closings</h2>
          <ul className="mt-3 divide-y divide-border">
            {data.closings.slice(0, 10).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{new Date(c.date).toLocaleDateString()}</span>
                <span>Sales {money(c.totalSales)}</span>
                <span
                  className={
                    c.difference === 0
                      ? "font-semibold text-success"
                      : "font-semibold text-destructive"
                  }
                >
                  {c.difference === 0
                    ? "BALANCED"
                    : c.difference > 0
                      ? `OVER ${money(c.difference)}`
                      : `SHORT ${money(Math.abs(c.difference))}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
