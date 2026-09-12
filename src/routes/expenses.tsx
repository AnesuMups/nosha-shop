import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shop/AppLayout";
import { StatCard } from "@/components/shop/StatCard";
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
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_EXPENSE_CATEGORY, EXPENSE_CATEGORIES } from "@/lib/shop/sample-data";
import { isSameDay, money, startOfMonth, startOfWeek, useShop } from "@/lib/shop/store";
import type { ExpensePaymentMethod } from "@/lib/shop/types";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses | Nosha Shop Manager" },
      {
        name: "description",
        content: "Record every shop and household expense in one simple place.",
      },
      { property: "og:title", content: "Expenses | Nosha Shop Manager" },
      { property: "og:description", content: "Track today, this week and this month's spending." },
    ],
  }),
  component: ExpensesPage,
});

const METHODS: ExpensePaymentMethod[] = ["Cash", "EcoCash", "Bank/Transfer"];
const todayInput = () => new Date().toISOString().slice(0, 10);

function ExpensesPage() {
  const { data, addExpense, deleteExpense } = useShop();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "shop" as "shop" | "home",
    description: "",
    productId: "",
    qty: "",
    unitPrice: "",
    category: DEFAULT_EXPENSE_CATEGORY,
    amount: "",
    payment: "Cash" as ExpensePaymentMethod,
    date: todayInput(),
    notes: "",
  });

  const homeProduct = data.products.find((product) => product.id === form.productId);
  const calculatedAmount = homeProduct
    ? (Number(form.qty) || 0) * (Number(form.unitPrice) || homeProduct.buyPrice)
    : Number(form.amount) || 0;

  const totals = useMemo(() => {
    const week = startOfWeek();
    const month = startOfMonth();
    return {
      today: data.expenses.filter((e) => isSameDay(e.date)).reduce((s, e) => s + e.amount, 0),
      week: data.expenses.filter((e) => new Date(e.date) >= week).reduce((s, e) => s + e.amount, 0),
      month: data.expenses
        .filter((e) => new Date(e.date) >= month)
        .reduce((s, e) => s + e.amount, 0),
    };
  }, [data.expenses]);

  const submit = () => {
    if (form.type === "home" && (!homeProduct || !(Number(form.qty) > 0))) {
      toast.error("Choose the item and enter how many were taken.");
      return;
    }
    if (form.type === "shop" && (!form.description.trim() || !(Number(form.amount) > 0))) {
      toast.error("Please add a description and an amount.");
      return;
    }
    addExpense({
      description:
        form.type === "home" ? `Taken home: ${homeProduct!.name}` : form.description.trim(),
      category: form.type === "home" ? "Home use" : form.category,
      amount: calculatedAmount,
      payment: form.payment,
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      productId: form.type === "home" ? homeProduct!.id : undefined,
      itemName: form.type === "home" ? homeProduct!.name : undefined,
      qty: form.type === "home" ? Number(form.qty) : undefined,
      unitPrice: form.type === "home" ? Number(form.unitPrice) || homeProduct!.buyPrice : undefined,
      notes: form.notes.trim() || undefined,
    });
    setForm({
      ...form,
      description: "",
      productId: "",
      qty: "",
      unitPrice: "",
      amount: "",
      notes: "",
    });
    setOpen(false);
    toast.success("Expense saved");
  };

  return (
    <div>
      <PageTitle
        title="Expenses"
        subtitle="All shop and home spending in one list."
        action={
          <Button size="lg" className="h-12" onClick={() => setOpen(true)}>
            <Plus className="size-5" /> Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Today" value={money(totals.today)} />
        <StatCard label="This Week" value={money(totals.week)} />
        <StatCard label="This Month" value={money(totals.month)} />
      </div>

      <Card className="mt-4 p-4">
        <h2 className="text-lg font-bold">Expense History</h2>
        {data.expenses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No expenses recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {data.expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{e.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.category} · {e.payment} · {new Date(e.date).toLocaleDateString()}
                  </p>
                  {e.notes ? <p className="text-sm text-muted-foreground">{e.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-destructive">{money(e.amount)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete expense"
                    onClick={() => {
                      deleteExpense(e.id);
                      toast.success("Expense removed");
                    }}
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
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Expense Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as "shop" | "home" })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Shop expense</SelectItem>
                  <SelectItem value="home">Item taken home</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "home" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Item</Label>
                  <Select
                    value={form.productId}
                    onValueChange={(v) => {
                      const product = data.products.find((item) => item.id === v);
                      setForm({
                        ...form,
                        productId: v,
                        unitPrice: product ? String(product.buyPrice) : "",
                      });
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose item" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Unit buying price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="rounded-xl bg-secondary p-3 text-sm">
                  <span className="text-muted-foreground">Calculated amount</span>
                  <p className="text-lg font-bold">{money(calculatedAmount)}</p>
                </div>
              </div>
            ) : null}
            {form.type === "shop" ? (
              <div className="grid gap-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="h-12"
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
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
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.type === "shop" ? (
                <div className="grid gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="h-12"
                  />
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <Label>Payment Method</Label>
                <Select
                  value={form.payment}
                  onValueChange={(v) => setForm({ ...form, payment: v as ExpensePaymentMethod })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} size="lg" className="h-12 w-full text-base font-bold">
              SAVE EXPENSE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
