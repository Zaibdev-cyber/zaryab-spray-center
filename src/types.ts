/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  Admin = "Admin",
  Staff = "Staff"
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string; // only handled securely
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  contactNumber: string;
  email: string;
  address: string;
  notes?: string;
}

export interface Product {
  id: string; // barcode / item code
  name: string;
  category: string;
  brand: string;
  description: string;
  batchNumber: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  unit: string; // Bottle, Liter, Kg, Pack, etc.
  manufacturingDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  supplierId: string;
  imageUrl?: string;
}

export type StockTransactionType = "IN" | "OUT";
export type StockTransactionSubType = "PURCHASE" | "DAMAGE" | "RETURN" | "MANUAL";

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string; // Cached for quick view
  type: StockTransactionType;
  subType: StockTransactionSubType;
  quantity: number;
  date: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  userId: string;
  userName: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  cashierId: string;
  cashierName: string;
  customerName: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  cashReceived: number;
  balanceReturn: number;
  items: SaleItem[];
}

export interface ShopSettings {
  shopName: string;
  shopAddress: string;
  contactNumber: string;
  emailAddress: string;
  receiptFooterMessage: string;
  logoUrl?: string;
  currencySymbol: string;
  themeMode: "light" | "dark";
}

export interface ActivityLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  stockTransactions: StockTransaction[];
  sales: Sale[];
  settings: ShopSettings;
  activityLogs: ActivityLog[];
}
