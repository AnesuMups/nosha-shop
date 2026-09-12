import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shop/AppLayout";
import { StockBadge } from "@/components/shop/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QUICK_SALE_NAMES } from "@/lib/shop/sample-data";
import { money, searchProducts, stockStatus, useShop } from "@/lib/shop/store";
import type { SaleItem } from "@/lib/shop/types";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales | Nosha Shop Manager" },
      {
        name: "description",
        content: "Search products, build a sale and take payment by cash, EcoCash, bank or credit.",
      },
      { property: "og:title", content: "Sales | Nosha Shop Manager" },
      { property: "og:description", content: "Fast till screen for everyday shop sales." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { data, recordSale } = useShop();
  const [term, setTerm] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);

  const results = useMemo(
    () => (term.trim() ? searchProducts(data.products, term).slice(0, 8) : []),
    [data.products, term],
  );
  const quick = QUICK_SALE_NAMES.map((n) => data.products.find((p) => p.name === n)).filter(
    Boolean,
  ) as typeof data.products;

  const total = cart.reduce((s, i) => s + i.sellPrice * i.qty, 0);

  const addToCart = (productId: string) => {
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) {
      toast.error("OUT OF STOCK", { description: `${product.name} has no stock left.` });
      return;
    }
    const existing = cart.find((i) => i.productId === productId);
    const requested = (existing?.qty ?? 0) + 1;
    if (requested > product.stock) {
      toast.error("NOT ENOUGH STOCK", {
        description: `Available: ${product.stock} · Requested: ${requested}`,
      });
      return;
    }
    setCart((c) =>
      existing
        ? c.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i))
        : [
            ...c,
            {
              productId,
              name: product.name,
              qty: 1,
              sellPrice: product.sellPrice,
              buyPrice: product.buyPrice,
            },
          ],
    );
  };

  const changeQty = (productId: string, delta: number) => {
    const product = data.products.find((p) => p.id === productId);
    setCart((c) =>
      c
        .map((i) => {
          if (i.productId !== productId) return i;
          const next = i.qty + delta;
          if (product && next > product.stock) {
            toast.error("NOT ENOUGH STOCK", {
              description: `Available: ${product.stock} · Requested: ${next}`,
            });
            return i;
          }
          return { ...i, qty: next };
        })
        .filter((i) => i.qty > 0),
    );
  };

  const updateItem = (
    productId: string,
    patch: Partial<Pick<SaleItem, "qty" | "sellPrice">>,
  ) => {
    setCart((items) =>
      items.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    );
  };

  const complete = () => {
    if (cart.length === 0) {
      toast.error("Add at least one product first.");
      return;
    }
    for (const item of cart) {
      const product = data.products.find((p) => p.id === item.productId);
      if (!product || item.qty > product.stock) {
        toast.error("NOT ENOUGH STOCK", {
          description: `${item.name} — Available: ${product?.stock ?? 0} · Requested: ${item.qty}`,
        });
        return;
      }
    }
    const sale = recordSale(cart, "Cash");
    setCart([]);
    setTerm("");
    toast.success("Sale completed successfully", {
      description: `${money(sale.total)} · ${sale.payment}`,
    });
  };

  return (
    <div>
      <PageTitle title="Sales" subtitle="Search a product, add it, then complete the sale." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
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
                <p className="font-semibold">PRODUCT NOT FOUND</p>
                <Button asChild className="mt-3" variant="outline">
                  <Link to="/products">+ Add New Product</Link>
                </Button>
              </div>
            ) : null}

            {results.length > 0 ? (
              <ul className="mt-3 divide-y divide-border">
                {results.map((p) => {
                  const status = stockStatus(p);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {p.stock} · {money(p.sellPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StockBadge status={status} />
                        <Button
                          size="sm"
                          disabled={p.stock <= 0}
                          onClick={() => addToCart(p.id)}
                        >
                          Add
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-bold">Quick Sale</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quick.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p.id)}
                  className="h-20 flex-col gap-1 rounded-2xl"
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.stock <= 0 ? "OUT OF STOCK" : money(p.sellPrice)}
                  </span>
                </Button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="h-fit p-4 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold">Current Sale</h2>
          {cart.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {cart.map((i) => (
                <li key={i.productId} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{i.name}</p>
                    <p className="font-semibold">{money(i.sellPrice * i.qty)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => changeQty(i.productId, -1)}
                      aria-label="Less"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={i.qty}
                      onChange={(e) =>
                        updateItem(i.productId, {
                          qty: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-10 w-16 text-center"
                      aria-label={`${i.name} quantity`}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => changeQty(i.productId, 1)}
                      aria-label="More"
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={i.sellPrice}
                      onChange={(e) =>
                        updateItem(i.productId, { sellPrice: Number(e.target.value) || 0 })
                      }
                      className="ml-auto h-10 w-28"
                      aria-label={`${i.name} selling price`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCart((c) => c.filter((x) => x.productId !== i.productId))}
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{money(total)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-secondary p-3 text-sm font-medium">
            Payment method: Cash
          </p>

          <Button onClick={complete} size="lg" className="mt-4 h-14 w-full text-base font-bold">
            COMPLETE SALE
          </Button>
        </Card>
      </div>
    </div>
  );
}
