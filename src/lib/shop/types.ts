export type PaymentMethod = "Cash";
export type ExpensePaymentMethod = "Cash" | "EcoCash" | "Bank/Transfer";

export interface Product {
  id: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  sellPrice: number;
  buyPrice: number;
}

export interface Sale {
  id: string;
  date: string; // ISO
  items: SaleItem[];
  total: number;
  cost: number;
  profit: number;
  payment: PaymentMethod;
  note?: string | undefined;
}

export interface Expense {
  id: string;
  date: string; // ISO
  description: string;
  category: string;
  amount: number;
  payment: ExpensePaymentMethod;
  productId?: string | undefined;
  itemName?: string | undefined;
  qty?: number | undefined;
  unitPrice?: number | undefined;
  notes?: string | undefined;
}

export interface Purchase {
  id: string;
  date: string;
  productId: string;
  name: string;
  qty: number;
  buyPrice: number;
  sellPrice: number;
}

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  name: string;
  expected: number;
  counted: number;
  difference: number;
  reason: string;
}

export interface DailyClosing {
  id: string;
  date: string;
  totalSales: number;
  cashSales: number;
  creditSales: number;
  digitalSales: number;
  totalExpenses: number;
  cashExpenses: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  grossProfit: number;
  netResult: number;
  reason?: string | undefined;
  notes?: string | undefined;
}

export interface Settings {
  shopName: string;
  currency: string;
  lowStockDefault: number;
}

export interface ShopData {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  adjustments: StockAdjustment[];
  closings: DailyClosing[];
  settings: Settings;
}
