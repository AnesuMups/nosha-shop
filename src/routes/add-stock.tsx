import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shop/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, searchProducts, useShop } from "@/lib/shop/store";

export const Route = createFileRoute("/add-stock")({
  validateSearch: (search: Record<string, unknown>) => ({
    product: typeof search["product"] === "string" ? (search["product"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Add Stock | Nosha Shop Manager" },
      {
        name: "description",
        content: "Record new stock bought for the shop and update prices in seconds.",
      },
      { property: "og:title", content: "Add Stock | Nosha Shop Manager" },
      { property: "og:description", content: "Top up product stock quickly." },
    ],
  }),
  component: AddStockPage,
});

function AddStockPage() {
  const search = Route.useSearch();
  const preselect = search.product;
  const { data, addStock } = useShop();
  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(preselect ?? null);
  const [qty, setQty] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  const selected = data.products.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setBuyPrice(String(selected.buyPrice));
      setSellPrice(String(selected.sellPrice));
    }
  }, [selectedId]);

  const results = useMemo(
    () => (term.trim() ? searchProducts(data.products, term).slice(0, 8) : []),
    [data.products, term],
  );

  const adding = Number(qty) || 0;

  const purchaseRows = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === "day") start.setHours(0, 0, 0, 0);
    if (period === "week") {
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
    }
    if (period === "month") start.setDate(1);
    return data.purchases.filter((purchase) => new Date(purchase.date) >= start);
  }, [data.purchases, period]);

  const purchaseTotals = purchaseRows.reduce(
    (totals, purchase) => {
      totals.buy += purchase.qty * purchase.buyPrice;
      totals.sell += purchase.qty * purchase.sellPrice;
      totals.profit += purchase.qty * (purchase.sellPrice - purchase.buyPrice);
      return totals;
    },
    { buy: 0, sell: 0, profit: 0 },
  );

  const submit = () => {
    if (!selected) return;
    if (adding <= 0) {
      toast.error("Enter how many you bought.");
      return;
    }
    addStock(selected.id, adding, Number(buyPrice) || 0, Number(sellPrice) || 0, purchaseDate);
    toast.success("Stock added", {
      description: `${selected.name} is now ${selected.stock + adding}`,
    });
    setQty("");
    setSelectedId(null);
    setTerm("");
  };

  return (
    <div>
      <PageTitle title="Add Stock" subtitle="Find the product, type how many you bought, save." />

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search product..."
            className="h-14 pl-11 text-base"
          />
        </div>

        {term.trim() && results.length === 0 ? (
          <div className="mt-4 rounded-xl bg-muted p-4 text-center">
            <p className="font-semibold">Product not found</p>
            <Button asChild className="mt-3" variant="outline">
              <Link to="/products">+ Add New Product</Link>
            </Button>
          </div>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {results.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">Current stock: {p.stock}</p>
                </div>
                <Button
                  variant={selectedId === p.id ? "default" : "outline"}
                  onClick={() => {
                    setSelectedId(p.id);
                    setTerm("");
                  }}
                >
                  Select
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {selected ? (
        <Card className="mt-4 p-5">
          <h2 className="text-lg font-bold">{selected.name}</h2>
          <p className="text-sm text-muted-foreground">Current stock: {selected.stock}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Quantity Bought</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Buying Price</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Selling Price</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Date Bought</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-secondary p-4 text-sm">
            <div className="flex justify-between">
              <span>Current Stock</span>
              <span className="font-semibold">{selected.stock}</span>
            </div>
            <div className="flex justify-between">
              <span>Adding</span>
              <span className="font-semibold">{adding}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 text-base font-bold">
              <span>New Stock</span>
              <span>{selected.stock + adding}</span>
            </div>
            <p className="mt-2 text-muted-foreground">
              Cost of this purchase: {money(adding * (Number(buyPrice) || 0))}
            </p>
            <p className="flex justify-between font-semibold text-success">
              <span>Projected profit</span>
              <span>{money(adding * ((Number(sellPrice) || 0) - (Number(buyPrice) || 0)))}</span>
            </p>
          </div>

          <Button onClick={submit} size="lg" className="mt-4 h-14 w-full text-base font-bold">
            ADD STOCK
          </Button>
        </Card>
      ) : null}

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Stock Purchase Summary</h2>
            <p className="text-sm text-muted-foreground">
              Buying cost, selling value, and projected profit.
            </p>
          </div>
          <div className="flex gap-2">
            {(["day", "week", "month"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={period === key ? "default" : "outline"}
                onClick={() => setPeriod(key)}
              >
                {key === "day" ? "Daily" : key === "week" ? "Weekly" : "Monthly"}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Item</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Buying Price</th>
                <th className="p-2">Selling Price</th>
                <th className="p-2">Profit</th>
              </tr>
            </thead>
            <tbody>
              {purchaseRows.map((purchase) => (
                <tr key={purchase.id} className="border-b border-border/60">
                  <td className="p-2 font-medium">
                    {purchase.name}
                    <span className="block text-xs text-muted-foreground">
                      {new Date(purchase.date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-2">{purchase.qty}</td>
                  <td className="p-2">{money(purchase.qty * purchase.buyPrice)}</td>
                  <td className="p-2">{money(purchase.qty * purchase.sellPrice)}</td>
                  <td className="p-2 font-semibold text-success">
                    {money(purchase.qty * (purchase.sellPrice - purchase.buyPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2">Total</td>
                <td className="p-2">{purchaseRows.reduce((sum, p) => sum + p.qty, 0)}</td>
                <td className="p-2">{money(purchaseTotals.buy)}</td>
                <td className="p-2">{money(purchaseTotals.sell)}</td>
                <td className="p-2 text-success">{money(purchaseTotals.profit)}</td>
              </tr>
            </tfoot>
          </table>
          {purchaseRows.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No purchases in this period.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
