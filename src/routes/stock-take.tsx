import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shop/AppLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADJUSTMENT_REASONS, DEFAULT_ADJUSTMENT_REASON } from "@/lib/shop/sample-data";
import { searchProducts, useShop } from "@/lib/shop/store";

export const Route = createFileRoute("/stock-take")({
  head: () => ({
    meta: [
      { title: "Stock Take | Nosha Shop Manager" },
      {
        name: "description",
        content: "Count what is on the shelf and fix stock differences with a simple reason.",
      },
      { property: "og:title", content: "Stock Take | Nosha Shop Manager" },
      { property: "og:description", content: "Count stock and record differences." },
    ],
  }),
  component: StockTakePage,
});

function StockTakePage() {
  const { data, applyStockTake } = useShop();
  const [term, setTerm] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);

  const list = useMemo(
    () => searchProducts(data.products, term).slice(0, 50),
    [data.products, term],
  );

  const entries = Object.entries(counts)
    .filter(([, v]) => v.trim() !== "")
    .map(([productId, v]) => ({
      productId,
      counted: Number(v) || 0,
      reason: reasons[productId] ?? DEFAULT_ADJUSTMENT_REASON,
    }));

  const changed = entries.filter((e) => {
    const p = data.products.find((x) => x.id === e.productId);
    return p && p.stock !== e.counted;
  });

  const complete = () => {
    applyStockTake(entries);
    setCounts({});
    setReasons({});
    setConfirm(false);
    toast.success("Stock take saved", {
      description: `${changed.length} product(s) adjusted`,
    });
  };

  return (
    <div>
      <PageTitle
        title="Stock Take"
        subtitle="Enter the remaining quantity. We compare it with shop stock."
      />

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products..."
            className="h-12 pl-11"
          />
        </div>

        <ul className="mt-4 divide-y divide-border">
          {list.map((p) => {
            const raw = counts[p.id] ?? "";
            const diff = raw.trim() === "" ? null : (Number(raw) || 0) - p.stock;
            const sold = diff === null ? null : Math.max(0, -diff);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    In shop: {p.stock} · Remaining count:
                  </p>
                </div>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={raw}
                  placeholder="Count"
                  onChange={(e) => setCounts({ ...counts, [p.id]: e.target.value })}
                  className="h-12 w-24"
                />
                <span className="w-24 text-sm text-muted-foreground">
                  {sold === null ? "Sold: —" : `Sold: ${sold}`}
                </span>
                <span
                  className={
                    diff === null
                      ? "w-20 text-sm text-muted-foreground"
                      : diff === 0
                        ? "w-20 font-semibold text-success"
                        : "w-20 font-semibold text-destructive"
                  }
                >
                  {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
                </span>
                {diff !== null && diff !== 0 ? (
                  <Select
                    value={reasons[p.id] ?? DEFAULT_ADJUSTMENT_REASON}
                    onValueChange={(v) => setReasons({ ...reasons, [p.id]: v })}
                  >
                    <SelectTrigger className="h-12 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADJUSTMENT_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </li>
            );
          })}
        </ul>

        <Button
          size="lg"
          className="mt-4 h-14 w-full text-base font-bold"
          disabled={entries.length === 0}
          onClick={() => setConfirm(true)}
        >
          COMPLETE STOCK TAKE
        </Button>
      </Card>

      {data.adjustments.length > 0 ? (
        <Card className="mt-4 p-4">
          <h2 className="text-lg font-bold">Recent Adjustments</h2>
          <ul className="mt-3 divide-y divide-border">
            {data.adjustments.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(a.date).toLocaleDateString()} · {a.reason}
                  </p>
                </div>
                <span className={a.difference < 0 ? "text-destructive" : "text-success"}>
                  {a.expected} → {a.counted} ({a.difference > 0 ? `+${a.difference}` : a.difference}
                  )
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this stock take?</AlertDialogTitle>
            <AlertDialogDescription>
              {changed.length} product(s) will be updated to the counted amount.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={complete}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
