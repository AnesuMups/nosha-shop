import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shop/AppLayout";
import { StockBadge } from "@/components/shop/StatCard";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/shop/sample-data";
import { money, searchProducts, stockStatus, useShop } from "@/lib/shop/store";
import type { Product } from "@/lib/shop/types";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products | Nosha Shop Manager" },
      {
        name: "description",
        content: "Add, edit and search shop products with buying price, selling price and stock.",
      },
      { property: "og:title", content: "Products | Nosha Shop Manager" },
      { property: "og:description", content: "Your full product and stock list." },
    ],
  }),
  component: ProductsPage,
});

const empty = {
  name: "",
  category: DEFAULT_CATEGORY,
  buyPrice: "",
  sellPrice: "",
  stock: "",
  minStock: "5",
};

function ProductsPage() {
  const { data, addProduct, updateProduct, deleteProduct } = useShop();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const list = useMemo(() => {
    let out = searchProducts(data.products, term);
    if (category !== "All") out = out.filter((p) => p.category === category);
    return [...out].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.products, term, category]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, minStock: String(data.settings.lowStockDefault) });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      buyPrice: String(p.buyPrice),
      sellPrice: String(p.sellPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Please type a product name.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      buyPrice: Number(form.buyPrice) || 0,
      sellPrice: Number(form.sellPrice) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
    };
    if (editing) {
      updateProduct(editing.id, payload);
      toast.success("Product updated");
    } else {
      addProduct(payload);
      toast.success("Product saved");
    }
    setOpen(false);
  };

  return (
    <div>
      <PageTitle
        title="Products"
        subtitle={`${data.products.length} products in your shop`}
        action={
          <Button size="lg" onClick={openNew} className="h-12">
            <Plus className="size-5" /> Add Product
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products..."
              className="h-12 pl-11"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {list.length === 0 ? (
          <div className="mt-6 rounded-xl bg-muted p-6 text-center">
            <p className="font-semibold">PRODUCT NOT FOUND</p>
            <Button className="mt-3" onClick={openNew}>
              + Add New Product
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {list.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.category} · Buy {money(p.buyPrice)} · Sell {money(p.sellPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Stock: {p.stock}</p>
                  <StockBadge status={stockStatus(p)} />
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmDelete(p)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Product Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Buying Price</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.buyPrice}
                  onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                  className="h-12"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.sellPrice}
                  onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                  className="h-12"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="h-12"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Minimum Stock Level</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} size="lg" className="h-12 w-full text-base font-bold">
              SAVE PRODUCT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This product will be removed from your shop list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteProduct(confirmDelete.id);
                setConfirmDelete(null);
                toast.success("Product deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
