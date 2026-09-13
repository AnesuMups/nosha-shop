import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initialData, SAMPLE_PRODUCTS } from "./sample-data";
import type {
  DailyClosing,
  Expense,
  Product,
  Purchase,
  Sale,
  SaleItem,
  Settings,
  ShopData,
  StockAdjustment,
} from "./types";

const KEY = "nosha-shop-data-v1";
const DB_NAME = "nosha-shop-local";
const DB_STORE = "shop-data";
const DB_KEY = "current";
const CATALOG_VERSION_KEY = "nosha-shop-catalog-version";
const CATALOG_VERSION = "2026-09-13-user-catalog-with-quantities";

const hasCurrentCatalog = (products: Product[]) =>
  products.length === SAMPLE_PRODUCTS.length &&
  SAMPLE_PRODUCTS.every((expected, index) => {
    const actual = products[index];
    return (
      actual?.id === expected.id &&
      actual.name === expected.name &&
      actual.buyPrice === expected.buyPrice &&
      actual.sellPrice === expected.sellPrice
    );
  });

function migrateCatalog(stored: ShopData): ShopData {
  if (
    window.localStorage.getItem(CATALOG_VERSION_KEY) !== CATALOG_VERSION ||
    !hasCurrentCatalog(stored.products ?? [])
  ) {
    return { ...initialData(), ...stored, products: SAMPLE_PRODUCTS };
  }
  return { ...initialData(), ...stored };
}

function readLocalData(): ShopData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? migrateCatalog(JSON.parse(raw) as ShopData) : null;
  } catch {
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readIndexedData(): Promise<ShopData | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve((request.result as ShopData | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

function save(data: ShopData) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    window.localStorage.setItem(CATALOG_VERSION_KEY, CATALOG_VERSION);
  } catch {
    /* ignore */
  }
  void openDatabase().then((db) => {
    if (!db) return;
    const request = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(data, DB_KEY);
    request.onerror = () => undefined;
  });
}

async function load(): Promise<ShopData> {
  if (typeof window === "undefined") return initialData();
  const indexed = await readIndexedData();
  const stored = indexed ? migrateCatalog(indexed) : (readLocalData() ?? initialData());
  save(stored);
  return stored;
}

function isShopData(value: unknown): value is ShopData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ShopData>;
  return (
    Array.isArray(data.products) &&
    Array.isArray(data.sales) &&
    Array.isArray(data.expenses) &&
    Array.isArray(data.purchases) &&
    Array.isArray(data.adjustments) &&
    Array.isArray(data.closings) &&
    !!data.settings &&
    typeof data.settings === "object"
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const money = (n: number) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

export const isSameDay = (iso: string, d = new Date()) => {
  const x = new Date(iso);
  return (
    x.getFullYear() === d.getFullYear() &&
    x.getMonth() === d.getMonth() &&
    x.getDate() === d.getDate()
  );
};

export const isOpenDayRecord = (iso: string, lastClosingAt?: string, date = new Date()) =>
  !lastClosingAt || !isSameDay(lastClosingAt, date) || new Date(iso) > new Date(lastClosingAt);

export const startOfWeek = (d = new Date()) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

export type StockStatus = "IN STOCK" | "LOW STOCK" | "OUT OF STOCK";

export const stockStatus = (p: Product): StockStatus =>
  p.stock <= 0 ? "OUT OF STOCK" : p.stock <= p.minStock ? "LOW STOCK" : "IN STOCK";

interface ShopContextValue {
  data: ShopData;
  ready: boolean;
  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addStock: (
    productId: string,
    qty: number,
    buyPrice: number,
    sellPrice: number,
    date?: string,
  ) => void;
  recordSale: (items: SaleItem[], payment: Sale["payment"], note?: string, date?: string) => Sale;
  deleteSale: (id: string) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;
  applyStockTake: (entries: { productId: string; counted: number; reason: string }[]) => void;
  saveClosing: (c: Omit<DailyClosing, "id">) => DailyClosing;
  updateSettings: (s: Partial<Settings>) => void;
  resetData: () => void;
  exportData: () => ShopData;
  restoreData: (value: unknown) => Promise<boolean>;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ShopData>(() => initialData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void load().then((stored) => {
      setData(stored);
      setReady(true);
    });
  }, []);

  const mutate = useCallback((fn: (d: ShopData) => ShopData) => {
    setData((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const value = useMemo<ShopContextValue>(() => {
    return {
      data,
      ready,
      addProduct: (p) => {
        const product: Product = { ...p, id: uid() };
        mutate((d) => ({ ...d, products: [...d.products, product] }));
        return product;
      },
      updateProduct: (id, patch) =>
        mutate((d) => ({
          ...d,
          products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProduct: (id) =>
        mutate((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) })),
      addStock: (productId, qty, buyPrice, sellPrice, date) =>
        mutate((d) => {
          const product = d.products.find((p) => p.id === productId);
          if (!product) return d;
          const purchase: Purchase = {
            id: uid(),
            date: date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString(),
            productId,
            name: product.name,
            qty,
            buyPrice,
            sellPrice,
          };
          return {
            ...d,
            purchases: [purchase, ...d.purchases],
            products: d.products.map((p) =>
              p.id === productId ? { ...p, stock: p.stock + qty, buyPrice, sellPrice } : p,
            ),
          };
        }),
      recordSale: (items, payment, note, date) => {
        const total = items.reduce((s, i) => s + i.sellPrice * i.qty, 0);
        const cost = items.reduce((s, i) => s + i.buyPrice * i.qty, 0);
        const sale: Sale = {
          id: uid(),
          date: date ?? new Date().toISOString(),
          items,
          total,
          cost,
          profit: total - cost,
          payment,
          note,
        };
        mutate((d) => ({
          ...d,
          sales: [sale, ...d.sales],
          products: d.products.map((p) => {
            const item = items.find((i) => i.productId === p.id);
            return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
          }),
        }));
        return sale;
      },
      deleteSale: (id) =>
        mutate((d) => {
          const sale = d.sales.find((s) => s.id === id);
          if (!sale) return d;
          return {
            ...d,
            sales: d.sales.filter((s) => s.id !== id),
            products: d.products.map((p) => {
              const item = sale.items.find((i) => i.productId === p.id);
              return item ? { ...p, stock: p.stock + item.qty } : p;
            }),
          };
        }),
      addExpense: (e) =>
        mutate((d) => ({
          ...d,
          expenses: [{ ...e, id: uid() }, ...d.expenses],
          products:
            e.productId && e.qty
              ? d.products.map((p) =>
                  p.id === e.productId ? { ...p, stock: Math.max(0, p.stock - e.qty!) } : p,
                )
              : d.products,
        })),
      deleteExpense: (id) =>
        mutate((d) => {
          const expense = d.expenses.find((e) => e.id === id);
          return {
            ...d,
            expenses: d.expenses.filter((e) => e.id !== id),
            products:
              expense?.productId && expense.qty
                ? d.products.map((p) =>
                    p.id === expense.productId ? { ...p, stock: p.stock + expense.qty! } : p,
                  )
                : d.products,
          };
        }),
      applyStockTake: (entries) =>
        mutate((d) => {
          const adjustments: StockAdjustment[] = [];
          const products = d.products.map((p) => {
            const entry = entries.find((e) => e.productId === p.id);
            if (!entry) return p;
            const difference = entry.counted - p.stock;
            if (difference === 0) return p;
            adjustments.push({
              id: uid(),
              date: new Date().toISOString(),
              productId: p.id,
              name: p.name,
              expected: p.stock,
              counted: entry.counted,
              difference,
              reason: entry.reason || "Counting error",
            });
            return { ...p, stock: entry.counted };
          });
          return { ...d, products, adjustments: [...adjustments, ...d.adjustments] };
        }),
      saveClosing: (c) => {
        const closing: DailyClosing = { ...c, id: uid() };
        mutate((d) => ({
          ...d,
          closings: [closing, ...d.closings],
          lastClosingAt: closing.date,
        }));
        return closing;
      },
      updateSettings: (s) => mutate((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      resetData: () => mutate(() => initialData()),
      exportData: () => data,
      restoreData: async (value) => {
        if (!isShopData(value)) return false;
        const restored = { ...initialData(), ...value };
        setData(restored);
        save(restored);
        return true;
      },
    };
  }, [data, ready, mutate]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}

/** Totals for a given day (defaults to today). */
export function useDayTotals(date = new Date()) {
  const { data } = useShop();
  return useMemo(() => {
    const sales = data.sales.filter(
      (s) => isSameDay(s.date, date) && isOpenDayRecord(s.date, data.lastClosingAt, date),
    );
    const expenses = data.expenses.filter(
      (e) => isSameDay(e.date, date) && isOpenDayRecord(e.date, data.lastClosingAt, date),
    );
    const totalSales = sales.reduce((s, x) => s + x.total, 0);
    const cashSales = sales.filter((s) => s.payment === "Cash").reduce((s, x) => s + x.total, 0);
    const creditSales = 0;
    const digitalSales = 0;
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
    const cashExpenses = expenses
      .filter((e) => e.payment === "Cash")
      .reduce((s, x) => s + x.amount, 0);
    const grossProfit = sales.reduce((s, x) => s + x.profit, 0);
    return {
      sales,
      expenses,
      totalSales,
      cashSales,
      creditSales,
      digitalSales,
      totalExpenses,
      cashExpenses,
      expectedCash: cashSales - cashExpenses,
      grossProfit,
      netResult: grossProfit - totalExpenses,
    };
  }, [data.sales, data.expenses, data.lastClosingAt, date.toDateString()]);
}

export function useLowStock() {
  const { data } = useShop();
  return useMemo(
    () => data.products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock),
    [data.products],
  );
}

export function searchProducts(products: Product[], term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return products;
  return products.filter(
    (p) => p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t),
  );
}
