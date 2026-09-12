import { createFileRoute } from "@tanstack/react-router";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { useShop } from "@/lib/shop/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Nosha Shop Manager" },
      {
        name: "description",
        content: "Change the shop name, low stock level and reset the sample data.",
      },
      { property: "og:title", content: "Settings | Nosha Shop Manager" },
      { property: "og:description", content: "Simple shop settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, updateSettings, resetData, exportData, restoreData } = useShop();
  const [name, setName] = useState(data.settings.shopName);
  const [low, setLow] = useState(String(data.settings.lowStockDefault));
  const [confirm, setConfirm] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restorePayload, setRestorePayload] = useState<unknown>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const backup = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nosha-shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const chooseBackup = async (file: File) => {
    try {
      setRestorePayload(JSON.parse(await file.text()));
      setRestoreConfirm(true);
    } catch {
      toast.error("That backup file is not valid.");
    }
  };

  return (
    <div>
      <PageTitle title="Settings" subtitle="Everything is saved on this device." />

      <Card className="max-w-lg p-5">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Shop Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
          </div>
          <div className="grid gap-1.5">
            <Label>Default Low Stock Level</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={low}
              onChange={(e) => setLow(e.target.value)}
              className="h-12"
            />
          </div>
          <Button
            className="h-12 font-bold"
            onClick={() => {
              updateSettings({
                shopName: name.trim() || "Nosha Shop",
                lowStockDefault: Number(low) || 5,
              });
              toast.success("Settings saved");
            }}
          >
            SAVE SETTINGS
          </Button>
        </div>
      </Card>

      <Card className="mt-4 max-w-lg p-5">
        <h2 className="text-lg font-bold">Backup and Restore</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep a copy of your shop records or restore them on this device.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="h-12" onClick={backup}>
            <Download className="size-5" /> Backup Data
          </Button>
          <Button variant="outline" className="h-12" onClick={() => fileInput.current?.click()}>
            <Upload className="size-5" /> Restore Data
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void chooseBackup(file);
            event.target.value = "";
          }}
        />
      </Card>

      <Card className="mt-4 max-w-lg p-5">
        <h2 className="text-lg font-bold">Start Fresh</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clears all sales, expenses and products, and puts back the sample products.
        </p>
        <Button variant="destructive" className="mt-3 h-12" onClick={() => setConfirm(true)}>
          Reset all data
        </Button>
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything?</AlertDialogTitle>
            <AlertDialogDescription>
              All your records on this device will be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetData();
                setConfirm(false);
                toast.success("Data reset");
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreConfirm} onOpenChange={setRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current shop records on this device will be replaced by the backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRestorePayload(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const restored = await restoreData(restorePayload);
                setRestorePayload(null);
                setRestoreConfirm(false);
                if (restored) toast.success("Backup restored");
                else toast.error("This backup is missing required shop data.");
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
