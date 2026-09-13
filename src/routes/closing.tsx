import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
import { DEFAULT_DIFFERENCE_REASON, DIFFERENCE_REASONS } from "@/lib/shop/sample-data";
import { money, searchProducts, useDayTotals, useShop } from "@/lib/shop/store";
import type { DailyClosing, PaymentMethod } from "@/lib/shop/types";

export const Route = createFileRoute("/closing")({
  head: () => ({
    meta: [
      { title: "Daily Closing | Nosha Shop Manager" },
      {
        name: "description",
        content: "Count the cash, compare it with expected cash and close the day in minutes.",
      },
      { property: "og:title", content: "Daily Closing | Nosha Shop Manager" },
      { property: "og:description", content: "End-of-day cash check for the shop." },
    ],
  }),
  component: ClosingPage,
});

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "flex justify-between border-t border-border pt-2 text-lg font-bold"
          : "flex justify-between text-sm"
      }
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "" : "font-medium"}>{value}</span>
    </div>
  );
}

function ClosingPage() {
  const { data, recordSale, saveClosing } = useShop();
  const today = useDayTotals();
  const [actual, setActual] = useState("");
  const [reason, setReason] = useState<string>(DEFAULT_DIFFERENCE_REASON);
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState<DailyClosing | null>(null);

  // missed sale dialog
  const [missedOpen, setMissedOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [pickId, setPickId] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [payment, setPayment] = useState<PaymentMethod>("Cash");

  const results = useMemo(
    () => (term.trim() ? searchProducts(data.products, term).slice(0, 6) : []),
    [data.products, term],
  );
  const picked = data.products.find((p) => p.id === pickId) ?? null;

  const actualNum = actual.trim() === "" ? null : Number(actual) || 0;
  const difference = actualNum === null ? null : actualNum - today.expectedCash;

  const statusText =
    difference === null
      ? ""
      : difference === 0
        ? "BALANCED"
        : difference > 0
          ? `OVER BY ${money(difference)}`
          : `SHORT BY ${money(Math.abs(difference))}`;

  const addMissedSale = () => {
    if (!picked) return;
    const n = Number(qty) || 0;
    if (n <= 0) {
      toast.error("Enter a quantity.");
      return;
    }
    if (n > picked.stock) {
      toast.error("NOT ENOUGH STOCK", {
        description: `Available: ${picked.stock} · Requested: ${n}`,
      });
      return;
    }
    recordSale(
      [
        {
          productId: picked.id,
          name: picked.name,
          qty: n,
          sellPrice: picked.sellPrice,
          buyPrice: picked.buyPrice,
        },
      ],
      payment,
      "Missed sale added at closing",
    );
    setMissedOpen(false);
    setPickId(null);
    setTerm("");
    setQty("1");
    toast.success("Missed sale added");
  };

  const closeDay = () => {
    const closing = saveClosing({
      date: new Date().toISOString(),
      totalSales: today.totalSales,
      cashSales: today.cashSales,
      creditSales: today.creditSales,
      digitalSales: today.digitalSales,
      totalExpenses: today.totalExpenses,
      cashExpenses: today.cashExpenses,
      expectedCash: today.expectedCash,
      actualCash: actualNum ?? 0,
      difference: difference ?? 0,
      grossProfit: today.grossProfit,
      netResult: today.netResult,
      reason: difference ? reason : undefined,
      notes: notes.trim() || undefined,
    });
    setConfirm(false);
    setReport(closing);
    toast.success("Day closed");
  };

  if (report) {
    const status =
      report.difference === 0
        ? "BALANCED"
        : report.difference > 0
          ? `OVER BY ${money(report.difference)}`
          : `SHORT BY ${money(Math.abs(report.difference))}`;
    return (
      <div>
        <PageTitle title="Daily Closing Report" />
        <Card className="p-6 print:shadow-none">
          <div className="text-center">
            <p className="text-xl font-bold text-primary">
              {data.settings.shopName.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">DAILY CLOSING</p>
            <p className="text-sm">{new Date(report.date).toLocaleDateString()}</p>
          </div>
          <div className="mt-5 space-y-2">
            <Row label="Total Sales" value={money(report.totalSales)} />
            <Row label="Cash Sales" value={money(report.cashSales)} />
            <Row label="Credit Sales" value={money(report.creditSales)} />
            <Row label="EcoCash/Bank" value={money(report.digitalSales)} />
            <Row label="Total Expenses" value={money(report.totalExpenses)} />
            <Row label="Expected Cash" value={money(report.expectedCash)} />
            <Row label="Actual Cash" value={money(report.actualCash)} />
            <Row label="Difference" value={money(report.difference)} />
            <Row label="Gross Profit" value={money(report.grossProfit)} />
            <Row label="Net Result" value={money(report.netResult)} strong />
            {report.reason ? <Row label="Reason" value={report.reason} /> : null}
            {report.notes ? <Row label="Notes" value={report.notes} /> : null}
          </div>
          <p
            className={
              report.difference === 0
                ? "mt-5 rounded-xl bg-success/12 p-4 text-center text-lg font-bold text-success"
                : "mt-5 rounded-xl bg-destructive/12 p-4 text-center text-lg font-bold text-destructive"
            }
          >
            STATUS: {status}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
            <Button onClick={() => window.print()} variant="outline" className="h-12">
              Print
            </Button>
            <Button asChild className="h-12">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Daily Closing" subtitle="Check the money at the end of the day." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Today's Money</h2>
          <div className="mt-3 space-y-2">
            <Row label="Today's Sales" value={money(today.totalSales)} />
            <Row label="Cash Sales" value={money(today.cashSales)} />
            <Row label="Credit Sales" value={money(today.creditSales)} />
            <Row label="EcoCash/Bank Sales" value={money(today.digitalSales)} />
            <Row label="Cash Expenses" value={money(today.cashExpenses)} />
            <Row label="Expected Cash" value={money(today.expectedCash)} strong />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Count Cash In Hand</h2>
          <div className="mt-3 grid gap-1.5">
            <Label>Actual Cash</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="0.00"
              className="h-16 text-2xl font-bold"
            />
          </div>

          {difference !== null ? (
            <div
              className={
                difference === 0
                  ? "mt-4 rounded-xl bg-success/12 p-4 text-center text-xl font-bold text-success"
                  : "mt-4 rounded-xl bg-destructive/12 p-4 text-center text-xl font-bold text-destructive"
              }
            >
              {statusText}
            </div>
          ) : null}

          {difference !== null && difference !== 0 ? (
            <div className="mt-4 space-y-3">
              <Button variant="outline" className="h-12 w-full" onClick={() => setMissedOpen(true)}>
                <Plus className="size-5" /> ADD MISSED SALE
              </Button>
              <div className="grid gap-1.5">
                <Label>Reason for difference</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFERENCE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          ) : null}

          <Button
            size="lg"
            className="mt-4 h-14 w-full text-base font-bold"
            disabled={actualNum === null}
            onClick={() => setConfirm(true)}
          >
            COMPLETE CLOSING
          </Button>
        </Card>
      </div>

      <Dialog open={missedOpen} onOpenChange={setMissedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Missed Sale</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search product..."
              className="h-12"
            />
            {results.length > 0 ? (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-3">
                    <span>
                      {p.name} · {money(p.sellPrice)} · stock {p.stock}
                    </span>
                    <Button
                      size="sm"
                      variant={pickId === p.id ? "default" : "outline"}
                      onClick={() => setPickId(p.id)}
                    >
                      Select
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {picked ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Payment</Label>
                  <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={addMissedSale}
              disabled={!picked}
              size="lg"
              className="h-12 w-full font-bold"
            >
              ADD SALE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close the day?</AlertDialogTitle>
            <AlertDialogDescription>
              {statusText || "Your daily report will be saved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={closeDay}>Close day</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
