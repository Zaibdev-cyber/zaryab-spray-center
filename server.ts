import express from "express";
import path from "path";
import fs from "fs";

import { DatabaseSchema, UserRole, User, Product, Supplier, Category, StockTransaction, Sale, ShopSettings, ActivityLog } from "./src/types";

const app = express();
const PORT = 3000;

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || "https://aunordasimvnqpmupocb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_5lHH9pnQx9Mdf3ssvdRNsg_-jfd3UDq";

// Local DB path — uses AppData in production so data persists across updates
const DB_FILE_PATH = (() => {
  if (process.env.NODE_ENV === "production" && process.env.APPDATA_PATH) {
    const dir = path.join(process.env.APPDATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, "database.json");
  }
  return path.join(process.cwd(), "database.json");
})();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Supabase HTTP helper ──────────────────────────────────────────
async function sbFetch(method: string, endpoint: string, body?: any): Promise<any> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Local JSON DB ─────────────────────────────────────────────────
function createDefaultDatabase(): DatabaseSchema {
  return {
    users: [
      { id: "USR-001", username: "admin", name: "Zaryab Khan (Admin)", role: UserRole.Admin, password: "admin", active: true },
      { id: "USR-002", username: "staff", name: "Kaswar Saleem (Staff)", role: UserRole.Staff, password: "staff", active: true },
    ],
    categories: [
      { id: "CAT-001", name: "Insecticides", description: "Chemicals used to kill specific agricultural insects & pests" },
      { id: "CAT-002", name: "Herbicides", description: "Weedicides for controlling undesirable plants and wild grasses" },
      { id: "CAT-003", name: "Fungicides", description: "Fungal disease control sprays for leaves, roots and seeds" },
      { id: "CAT-004", name: "Fertilizers", description: "Soil nutrients, premium urea, DAP, SOP, water-soluble macronutrients" },
      { id: "CAT-005", name: "Seeds", description: "High-yield hybrid seeds for cotton, wheat, maize, rice" },
      { id: "CAT-006", name: "Growth Promoters", description: "Gibberellic acids, humic acid blends, hormone enhancers" },
      { id: "CAT-007", name: "Agricultural Chemicals", description: "Adjuvants, spray stickers, soil conditioners, pH levelers" },
    ],
    suppliers: [
      { id: "SUP-101", name: "Agro-Pharm Pakistan Ltd", companyName: "Agro-Pharm Corp", contactNumber: "+92 300 1234567", email: "sales@agropharm.com.pk", address: "Saddar Chowk, Multan, Pakistan", notes: "Regular supplier of pre-packaged insecticides and fungicides." },
      { id: "SUP-102", name: "Engro Fertilizers Group", companyName: "Engro Corp", contactNumber: "+92 321 7654321", email: "supply@engrofert.com", address: "Industrial Zone, Port Qasim, Karachi", notes: "Premium Nitrogen/Potassium fertilizers supplier." },
      { id: "SUP-103", name: "Pioneer Seeds Ltd Sahiwal", companyName: "Corteva Agriscience Pioneer", contactNumber: "+92 345 9876543", email: "support@pioneerseeds.com.pk", address: "Main G.T. Road, Sahiwal, Punjab", notes: "Supplier for high-yield Pioneer Maize 30T60 and Cotton hybrids." },
    ],
    products: [],
    stockTransactions: [],
    sales: [],
    settings: {
      shopName: "Zaryab Spray Center",
      shopAddress: "Main Bypass Chowk, Opposite New Grain Market, Sahiwal, Punjab, Pakistan",
      contactNumber: "+92 300 7601234",
      emailAddress: "info@zaryabspraycenter.com",
      receiptFooterMessage: "Thank You For Your Valued Purchase. Expired or Broke Chemical Bottles Are Not Returnable.",
      currencySymbol: "Rs.",
      themeMode: "light",
    },
    activityLogs: [],
  };
}

function readLocalDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const d = createDefaultDatabase();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(d, null, 2), "utf-8");
      return d;
    }
    return JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf-8")) as DatabaseSchema;
  } catch {
    return createDefaultDatabase();
  }
}

function writeLocalDB(db: DatabaseSchema) {
  try { fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), "utf-8"); } catch {}
}

let database = readLocalDB();

// ── Supabase sync helpers ─────────────────────────────────────────
async function syncFromCloud() {
  if (!(await isOnline())) return;
  try {
    const [users, cats, sups, prods, txns, sales, settArr, logs] = await Promise.all([
      sbFetch("GET", "users?select=*"),
      sbFetch("GET", "categories?select=*"),
      sbFetch("GET", "suppliers?select=*"),
      sbFetch("GET", "products?select=*"),
      sbFetch("GET", "stock_transactions?select=*&order=date.desc"),
      sbFetch("GET", "sales?select=*&order=date.desc"),
      sbFetch("GET", "settings?id=eq.1"),
      sbFetch("GET", "activity_logs?select=*&order=date.desc&limit=500"),
    ]);
    if (users?.length) database.users = users.map((u: any) => ({ id: u.id, username: u.username, name: u.name, role: u.role, password: u.password, active: u.active }));
    if (cats?.length) database.categories = cats.map((c: any) => ({ id: c.id, name: c.name, description: c.description }));
    if (sups?.length) database.suppliers = sups.map((s: any) => ({ id: s.id, name: s.name, companyName: s.company_name, contactNumber: s.contact_number, email: s.email, address: s.address, notes: s.notes }));
    if (prods?.length) database.products = prods.map((p: any) => ({ id: p.id, name: p.name, category: p.category, brand: p.brand, description: p.description, batchNumber: p.batch_number, purchasePrice: p.purchase_price, salePrice: p.sale_price, quantity: p.quantity, unit: p.unit, manufacturingDate: p.manufacturing_date, expiryDate: p.expiry_date, supplierId: p.supplier_id, imageUrl: p.image_url }));
    if (txns?.length) database.stockTransactions = txns.map((t: any) => ({ id: t.id, productId: t.product_id, productName: t.product_name, type: t.type, subType: t.sub_type, quantity: t.quantity, date: t.date, supplierId: t.supplier_id, supplierName: t.supplier_name, notes: t.notes, userId: t.user_id, userName: t.user_name }));
    if (sales?.length) database.sales = sales.map((s: any) => ({ id: s.id, invoiceNumber: s.invoice_number, date: s.date, cashierId: s.cashier_id, cashierName: s.cashier_name, customerName: s.customer_name, subtotal: s.subtotal, discount: s.discount, grandTotal: s.grand_total, cashReceived: s.cash_received, balanceReturn: s.balance_return, items: s.items }));
    if (settArr?.[0]) { const s = settArr[0]; database.settings = { shopName: s.shop_name, shopAddress: s.shop_address, contactNumber: s.contact_number, emailAddress: s.email_address, receiptFooterMessage: s.receipt_footer_message, currencySymbol: s.currency_symbol, themeMode: s.theme_mode }; }
    if (logs?.length) database.activityLogs = logs.map((l: any) => ({ id: l.id, date: l.date, userId: l.user_id, userName: l.user_name, action: l.action, details: l.details }));
    writeLocalDB(database);
  } catch {}
}

async function pushToCloud(table: string, data: any) {
  if (!(await isOnline())) return;
  await sbFetch("POST", table, data).catch(() => {});
}

async function updateCloud(table: string, filter: string, data: any) {
  if (!(await isOnline())) return;
  await sbFetch("PATCH", `${table}?${filter}`, data).catch(() => {});
}

async function deleteCloud(table: string, filter: string) {
  if (!(await isOnline())) return;
  await sbFetch("DELETE", `${table}?${filter}`).catch(() => {});
}

function writeLog(userId: string, userName: string, action: string, details: string) {
  const log: ActivityLog = { id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`, date: new Date().toISOString(), userId, userName, action, details };
  database.activityLogs.unshift(log);
  if (database.activityLogs.length > 500) database.activityLogs = database.activityLogs.slice(0, 500);
  writeLocalDB(database);
  pushToCloud("activity_logs", { id: log.id, date: log.date, user_id: log.userId, user_name: log.userName, action: log.action, details: log.details });
}

// ── AUTH ──────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  await syncFromCloud();
  const { username, password } = req.body;
  const user = database.users.find(u => u.username.toLowerCase() === (username || "").trim().toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid username. User not found." });
  if (!user.active) return res.status(403).json({ error: "Your account is deactivated. Please contact admin." });
  if (user.password !== password) return res.status(412).json({ error: "Incorrect password. Please try again." });
  writeLog(user.id, user.name, "User Logged In", `User ${user.name} logged in`);
  res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role, active: user.active } });
});

// ── USERS ─────────────────────────────────────────────────────────
app.get("/api/users", (req, res) => res.json(database.users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: u.active }))));

app.post("/api/users", async (req, res) => {
  const { currentUserId, username, name, role, password } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied. Admins only." });
  if (!username || !name || !role || !password) return res.status(400).json({ error: "Missing required fields." });
  if (database.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase())) return res.status(400).json({ error: "Username already exists." });
  const newUser: User = { id: `USR-${Date.now()}`, username: username.trim().toLowerCase(), name: name.trim(), role: role as UserRole, password, active: true };
  database.users.push(newUser);
  writeLocalDB(database);
  pushToCloud("users", { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role, password: newUser.password, active: newUser.active });
  writeLog(runner.id, runner.name, "User Created", `Created user ${newUser.name}`);
  res.status(201).json(newUser);
});

app.put("/api/users/:id/toggle", async (req, res) => {
  const { currentUserId } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  const user = database.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.id === runner.id) return res.status(400).json({ error: "Cannot disable your own account." });
  user.active = !user.active;
  writeLocalDB(database);
  updateCloud("users", `id=eq.${user.id}`, { active: user.active });
  writeLog(runner.id, runner.name, "User Status Changed", `Toggled ${user.name} to ${user.active ? "ACTIVE" : "INACTIVE"}`);
  res.json(user);
});

app.put("/api/users/:id", async (req, res) => {
  const { currentUserId, username, name, role, password } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  const user = database.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (username) user.username = username.trim().toLowerCase();
  if (name) user.name = name.trim();
  if (role) user.role = role as UserRole;
  if (password?.trim()) user.password = password;
  writeLocalDB(database);
  updateCloud("users", `id=eq.${user.id}`, { username: user.username, name: user.name, role: user.role, password: user.password });
  writeLog(runner.id, runner.name, "User Updated", `Updated ${user.name}`);
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role, active: user.active });
});

app.delete("/api/users/:id", async (req, res) => {
  const { currentUserId } = req.query;
  const runner = database.users.find(u => u.id === (currentUserId as string));
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  if (req.params.id === runner.id) return res.status(400).json({ error: "Cannot delete your own account." });
  const user = database.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  database.users = database.users.filter(u => u.id !== req.params.id);
  writeLocalDB(database);
  deleteCloud("users", `id=eq.${req.params.id}`);
  writeLog(runner.id, runner.name, "User Deleted", `Deleted ${user.name}`);
  res.json({ success: true });
});

// ── SETTINGS ─────────────────────────────────────────────────────
app.get("/api/settings", (req, res) => res.json(database.settings));

app.post("/api/settings", async (req, res) => {
  const { currentUserId, ...newSettings } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  database.settings = { ...database.settings, ...newSettings };
  writeLocalDB(database);
  const s = database.settings;
  updateCloud("settings", "id=eq.1", { shop_name: s.shopName, shop_address: s.shopAddress, contact_number: s.contactNumber, email_address: s.emailAddress, receipt_footer_message: s.receiptFooterMessage, currency_symbol: s.currencySymbol, theme_mode: s.themeMode });
  writeLog(runner.id, runner.name, "Settings Updated", "Shop settings updated");
  res.json(database.settings);
});

// ── CATEGORIES ───────────────────────────────────────────────────
app.get("/api/categories", (req, res) => res.json(database.categories));

app.post("/api/categories", async (req, res) => {
  const { currentUserId, name, description } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  if (!name) return res.status(400).json({ error: "Category name is required" });
  if (database.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase())) return res.status(400).json({ error: "Category name already exists" });
  const cat = { id: `CAT-${Date.now()}`, name: name.trim(), description: description || "" };
  database.categories.push(cat);
  writeLocalDB(database);
  pushToCloud("categories", cat);
  writeLog(runner.id, runner.name, "Category Added", `Added ${cat.name}`);
  res.status(201).json(cat);
});

app.delete("/api/categories/:id", async (req, res) => {
  const { currentUserId } = req.query;
  const runner = database.users.find(u => u.id === (currentUserId as string));
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  const cat = database.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: "Category not found" });
  if (database.products.filter(p => p.category.toLowerCase() === cat.name.toLowerCase()).length > 0) return res.status(400).json({ error: `Cannot delete. Category contains active products.` });
  database.categories = database.categories.filter(c => c.id !== req.params.id);
  writeLocalDB(database);
  deleteCloud("categories", `id=eq.${req.params.id}`);
  writeLog(runner.id, runner.name, "Category Deleted", `Deleted ${cat.name}`);
  res.json({ success: true });
});

// ── SUPPLIERS ────────────────────────────────────────────────────
app.get("/api/suppliers", (req, res) => res.json(database.suppliers));

app.post("/api/suppliers", async (req, res) => {
  const { currentUserId, name, companyName, contactNumber, email, address, notes } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  if (!name || !companyName || !contactNumber) return res.status(400).json({ error: "Name, Company and Contact are required" });
  const sup: Supplier = { id: `SUP-${Date.now()}`, name: name.trim(), companyName: companyName.trim(), contactNumber: contactNumber.trim(), email: email || "", address: address || "", notes: notes || "" };
  database.suppliers.push(sup);
  writeLocalDB(database);
  pushToCloud("suppliers", { id: sup.id, name: sup.name, company_name: sup.companyName, contact_number: sup.contactNumber, email: sup.email, address: sup.address, notes: sup.notes });
  writeLog(runner.id, runner.name, "Supplier Added", `Added ${sup.name}`);
  res.status(201).json(sup);
});

app.put("/api/suppliers/:id", async (req, res) => {
  const { currentUserId, name, companyName, contactNumber, email, address, notes } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  const idx = database.suppliers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Supplier not found" });
  database.suppliers[idx] = { ...database.suppliers[idx], name: name.trim(), companyName: companyName.trim(), contactNumber: contactNumber.trim(), email: email || "", address: address || "", notes: notes || "" };
  writeLocalDB(database);
  updateCloud("suppliers", `id=eq.${req.params.id}`, { name, company_name: companyName, contact_number: contactNumber, email, address, notes });
  writeLog(runner.id, runner.name, "Supplier Updated", `Updated ${name}`);
  res.json(database.suppliers[idx]);
});

app.delete("/api/suppliers/:id", async (req, res) => {
  const { currentUserId } = req.query;
  const runner = database.users.find(u => u.id === (currentUserId as string));
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  const sup = database.suppliers.find(s => s.id === req.params.id);
  if (!sup) return res.status(404).json({ error: "Supplier not found" });
  if (database.products.filter(p => p.supplierId === req.params.id).length > 0) return res.status(400).json({ error: "Cannot delete. Supplier has products." });
  database.suppliers = database.suppliers.filter(s => s.id !== req.params.id);
  writeLocalDB(database);
  deleteCloud("suppliers", `id=eq.${req.params.id}`);
  writeLog(runner.id, runner.name, "Supplier Deleted", `Deleted ${sup.name}`);
  res.json({ success: true });
});

// ── PRODUCTS ─────────────────────────────────────────────────────
app.get("/api/products", (req, res) => res.json(database.products));

app.post("/api/products", async (req, res) => {
  const { currentUserId, barcodeId, name, category, brand, description, batchNumber, purchasePrice, salePrice, quantity, unit, manufacturingDate, expiryDate, supplierId, imageUrl } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  if (!name || !category || !purchasePrice || !salePrice || !unit || !supplierId) return res.status(400).json({ error: "Missing required product details." });
  const targetId = (barcodeId || "").trim() || `691${Math.floor(10000 + Math.random() * 90000)}`;
  if (database.products.find(p => p.id === targetId)) return res.status(400).json({ error: `Product ID '${targetId}' already exists.` });
  const prod: Product = { id: targetId, name: name.trim(), category, brand: brand || "Generic", description: description || "", batchNumber: batchNumber || "", purchasePrice: Number(purchasePrice), salePrice: Number(salePrice), quantity: Number(quantity) || 0, unit, manufacturingDate: manufacturingDate || "", expiryDate: expiryDate || "", supplierId, imageUrl: imageUrl || "" };
  database.products.push(prod);
  if (prod.quantity > 0) {
    const txn: StockTransaction = { id: `TXN-${Date.now()}`, productId: prod.id, productName: prod.name, type: "IN", subType: "PURCHASE", quantity: prod.quantity, date: new Date().toISOString(), supplierId: prod.supplierId, supplierName: database.suppliers.find(s => s.id === prod.supplierId)?.name, notes: "Initial stock", userId: runner.id, userName: runner.name };
    database.stockTransactions.unshift(txn);
    pushToCloud("stock_transactions", { id: txn.id, product_id: txn.productId, product_name: txn.productName, type: txn.type, sub_type: txn.subType, quantity: txn.quantity, date: txn.date, supplier_id: txn.supplierId, supplier_name: txn.supplierName, notes: txn.notes, user_id: txn.userId, user_name: txn.userName });
  }
  writeLocalDB(database);
  pushToCloud("products", { id: prod.id, name: prod.name, category: prod.category, brand: prod.brand, description: prod.description, batch_number: prod.batchNumber, purchase_price: prod.purchasePrice, sale_price: prod.salePrice, quantity: prod.quantity, unit: prod.unit, manufacturing_date: prod.manufacturingDate, expiry_date: prod.expiryDate, supplier_id: prod.supplierId, image_url: prod.imageUrl });
  writeLog(runner.id, runner.name, "Product Added", `Added ${prod.name}`);
  res.status(201).json(prod);
});

app.put("/api/products/:id", async (req, res) => {
  const { currentUserId, name, category, brand, description, batchNumber, purchasePrice, salePrice, quantity, unit, manufacturingDate, expiryDate, supplierId, imageUrl } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  const idx = database.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const oldQty = database.products[idx].quantity;
  const newQty = Number(quantity) || 0;
  database.products[idx] = { ...database.products[idx], name: name.trim(), category, brand: brand || "Generic", description: description || "", batchNumber: batchNumber || "", purchasePrice: Number(purchasePrice), salePrice: Number(salePrice), quantity: newQty, unit, manufacturingDate: manufacturingDate || "", expiryDate: expiryDate || "", supplierId, imageUrl: imageUrl !== undefined ? imageUrl : database.products[idx].imageUrl };
  if (oldQty !== newQty) {
    const diff = newQty - oldQty;
    const txn: StockTransaction = { id: `TXN-${Date.now()}`, productId: req.params.id, productName: name.trim(), type: diff > 0 ? "IN" : "OUT", subType: "MANUAL", quantity: Math.abs(diff), date: new Date().toISOString(), notes: "Manual adjustment", userId: runner.id, userName: runner.name };
    database.stockTransactions.unshift(txn);
    pushToCloud("stock_transactions", { id: txn.id, product_id: txn.productId, product_name: txn.productName, type: txn.type, sub_type: txn.subType, quantity: txn.quantity, date: txn.date, notes: txn.notes, user_id: txn.userId, user_name: txn.userName });
  }
  writeLocalDB(database);
  updateCloud("products", `id=eq.${req.params.id}`, { name: name.trim(), category, brand, description, batch_number: batchNumber, purchase_price: Number(purchasePrice), sale_price: Number(salePrice), quantity: newQty, unit, manufacturing_date: manufacturingDate, expiry_date: expiryDate, supplier_id: supplierId, image_url: imageUrl });
  writeLog(runner.id, runner.name, "Product Updated", `Updated ${name}`);
  res.json(database.products[idx]);
});

app.delete("/api/products/:id", async (req, res) => {
  const { currentUserId } = req.query;
  const runner = database.users.find(u => u.id === (currentUserId as string));
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  const prod = database.products.find(p => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: "Product not found" });
  database.products = database.products.filter(p => p.id !== req.params.id);
  writeLocalDB(database);
  deleteCloud("products", `id=eq.${req.params.id}`);
  writeLog(runner.id, runner.name, "Product Deleted", `Deleted ${prod.name}`);
  res.json({ success: true });
});

// ── STOCK ─────────────────────────────────────────────────────────
app.get("/api/stock/history", (req, res) => res.json(database.stockTransactions));

app.post("/api/stock/transaction", async (req, res) => {
  const { currentUserId, productId, type, subType, quantity, supplierId, notes } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  if (!productId || !type || !subType || !quantity) return res.status(400).json({ error: "Missing required fields." });
  const prod = database.products.find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: "Product not found." });
  const qty = Number(quantity);
  if (qty <= 0) return res.status(400).json({ error: "Quantity must be greater than zero." });
  if (type === "IN") prod.quantity += qty;
  else if (type === "OUT") {
    if (prod.quantity < qty) return res.status(400).json({ error: `Insufficient stock. Only ${prod.quantity} available.` });
    prod.quantity -= qty;
  }
  const sup = database.suppliers.find(s => s.id === supplierId);
  const txn: StockTransaction = { id: `TXN-${Date.now()}`, productId, productName: prod.name, type: type as any, subType: subType as any, quantity: qty, date: new Date().toISOString(), supplierId: supplierId || undefined, supplierName: sup?.name, notes: notes || "", userId: runner.id, userName: runner.name };
  database.stockTransactions.unshift(txn);
  writeLocalDB(database);
  updateCloud("products", `id=eq.${productId}`, { quantity: prod.quantity });
  pushToCloud("stock_transactions", { id: txn.id, product_id: txn.productId, product_name: txn.productName, type: txn.type, sub_type: txn.subType, quantity: txn.quantity, date: txn.date, supplier_id: txn.supplierId, supplier_name: txn.supplierName, notes: txn.notes, user_id: txn.userId, user_name: txn.userName });
  writeLog(runner.id, runner.name, "Stock Transaction", `${type} ${qty} of ${prod.name}`);
  res.status(201).json(txn);
});

// ── SALES ─────────────────────────────────────────────────────────
app.get("/api/sales", (req, res) => res.json(database.sales));

app.post("/api/sales/checkout", async (req, res) => {
  const { currentUserId, customerName, discount, cashReceived, items } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner) return res.status(401).json({ error: "Authentication needed" });
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "No products in cart." });
  let subtotal = 0;
  const processedItems = [];
  for (const item of items) {
    const prod = database.products.find(p => p.id === item.productId);
    if (!prod) return res.status(404).json({ error: `Product not found: ${item.productId}` });
    const qty = Number(item.quantity);
    if (prod.quantity < qty) return res.status(400).json({ error: `Insufficient stock for ${prod.name}. Available: ${prod.quantity}` });
    const lineTotal = prod.salePrice * qty;
    subtotal += lineTotal;
    processedItems.push({ id: `SITEM-${processedItems.length + 1}-${Date.now()}`, productId: prod.id, name: prod.name, quantity: qty, unit: prod.unit, unitPrice: prod.salePrice, total: lineTotal });
  }
  const discountAmt = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmt);
  const paid = Number(cashReceived) || 0;
  if (paid < grandTotal) return res.status(400).json({ error: `Insufficient cash. Bill: ${grandTotal}, Paid: ${paid}` });
  for (const item of processedItems) {
    const prod = database.products.find(p => p.id === item.productId)!;
    prod.quantity -= item.quantity;
    const txn: StockTransaction = { id: `TXN-SALE-${Date.now()}-${item.productId}`, productId: item.productId, productName: prod.name, type: "OUT", subType: "MANUAL", quantity: item.quantity, date: new Date().toISOString(), notes: "Sale", userId: runner.id, userName: runner.name };
    database.stockTransactions.unshift(txn);
    updateCloud("products", `id=eq.${item.productId}`, { quantity: prod.quantity });
    pushToCloud("stock_transactions", { id: txn.id, product_id: txn.productId, product_name: txn.productName, type: txn.type, sub_type: txn.subType, quantity: txn.quantity, date: txn.date, notes: txn.notes, user_id: txn.userId, user_name: txn.userName });
  }
  const yyyymmdd = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const invNumber = `INV-${yyyymmdd}-${(database.sales.length + 1).toString().padStart(3, "0")}`;
  const sale: Sale = { id: `SAL-${Date.now()}`, invoiceNumber: invNumber, date: new Date().toISOString(), cashierId: runner.id, cashierName: runner.name, customerName: (customerName || "").trim() || "Walk-in Customer", subtotal, discount: discountAmt, grandTotal, cashReceived: paid, balanceReturn: Math.max(0, paid - grandTotal), items: processedItems };
  database.sales.unshift(sale);
  writeLocalDB(database);
  pushToCloud("sales", { id: sale.id, invoice_number: sale.invoiceNumber, date: sale.date, cashier_id: sale.cashierId, cashier_name: sale.cashierName, customer_name: sale.customerName, subtotal: sale.subtotal, discount: sale.discount, grand_total: sale.grandTotal, cash_received: sale.cashReceived, balance_return: sale.balanceReturn, items: sale.items });
  writeLog(runner.id, runner.name, "Invoice Issued", `Invoice ${invNumber} - Total: ${grandTotal}`);
  res.status(201).json(sale);
});

// ── DASHBOARD ────────────────────────────────────────────────────
app.get("/api/dashboard/summary", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);
  const sixMonths = new Date(); sixMonths.setMonth(sixMonths.getMonth() + 6);
  const sixMonthsStr = sixMonths.toISOString().split("T")[0];
  res.json({
    totalProducts: database.products.length,
    totalCategories: database.categories.length,
    totalStockQuantity: database.products.reduce((a, p) => a + p.quantity, 0),
    lowStockCount: database.products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
    outOfStockCount: database.products.filter(p => p.quantity === 0).length,
    totalInventoryValue: database.products.reduce((a, p) => a + (p.purchasePrice * p.quantity), 0),
    todaySales: database.sales.filter(s => s.date.startsWith(today)).reduce((a, s) => a + s.grandTotal, 0),
    monthlySales: database.sales.filter(s => s.date.startsWith(thisMonth)).reduce((a, s) => a + s.grandTotal, 0),
    recentSales: database.sales.slice(0, 5),
    lowStockItems: database.products.filter(p => p.quantity > 0 && p.quantity <= 10).slice(0, 8),
    outOfStockItems: database.products.filter(p => p.quantity === 0).slice(0, 8),
    expiringSoonItems: database.products.filter(p => p.expiryDate && p.expiryDate <= sixMonthsStr && p.expiryDate >= today),
    expiredItems: database.products.filter(p => p.expiryDate && p.expiryDate < today),
  });
});

app.get("/api/logs", (req, res) => res.json(database.activityLogs));

// ── BACKUP / RESTORE ──────────────────────────────────────────────
app.get("/api/database/backup", (req, res) => {
  res.setHeader("Content-Disposition", `attachment; filename=spraycenter_backup_${new Date().toISOString().split("T")[0]}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(database, null, 2));
});

app.post("/api/database/restore", (req, res) => {
  const { currentUserId, backupData } = req.body;
  const runner = database.users.find(u => u.id === currentUserId);
  if (!runner || runner.role !== UserRole.Admin) return res.status(403).json({ error: "Access denied." });
  if (!backupData || typeof backupData !== "object") return res.status(400).json({ error: "Invalid backup format." });
  const required = ["users", "categories", "suppliers", "products", "sales", "settings", "stockTransactions"];
  if (!required.every(f => Object.keys(backupData).includes(f))) return res.status(400).json({ error: "Invalid backup schema." });
  database = backupData as DatabaseSchema;
  writeLocalDB(database);
  writeLog(runner.id, runner.name, "Database Restored", "Database restored from backup file.");
  res.json({ success: true, message: "Database restored", settings: database.settings });
});

// ── SERVE FRONTEND ────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.DIST_PATH || path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server starting on port ${PORT}`));
}

startServer();
