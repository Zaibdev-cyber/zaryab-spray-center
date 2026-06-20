import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, mp, ms, msa, mset } from './_sb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const type = req.query.type as string;

  // SETTINGS
  if (type === 'settings') {
    if (req.method === 'GET') {
      const d = await sb('GET', 'settings?id=eq.1');
      return res.json(d?.[0] ? mset(d[0]) : { shopName: 'Zaryab Spray Center', currencySymbol: 'Rs.', themeMode: 'light' });
    }
    if (req.method === 'POST') {
      const { shopName, shopAddress, contactNumber, emailAddress, receiptFooterMessage, currencySymbol, themeMode } = req.body;
      const d = await sb('PATCH', 'settings?id=eq.1', { shop_name: shopName, shop_address: shopAddress, contact_number: contactNumber, email_address: emailAddress, receipt_footer_message: receiptFooterMessage, currency_symbol: currencySymbol, theme_mode: themeMode });
      return res.json(d?.[0] ? mset(d[0]) : req.body);
    }
  }

  // DASHBOARD
  if (type === 'dashboard' && req.method === 'GET') {
    const [rawP, rawS] = await Promise.all([sb('GET', 'products?select=*'), sb('GET', 'sales?select=*&order=date.desc')]);
    const products = (rawP || []).map(mp);
    const sales = (rawS || []).map(msa);
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);
    const sixM = new Date(); sixM.setMonth(sixM.getMonth() + 6);
    const sixMStr = sixM.toISOString().split('T')[0];
    return res.json({
      totalProducts: products.length,
      totalCategories: [...new Set(products.map((p: any) => p.category))].length,
      totalStockQuantity: products.reduce((a: number, p: any) => a + p.quantity, 0),
      lowStockCount: products.filter((p: any) => p.quantity > 0 && p.quantity <= 10).length,
      outOfStockCount: products.filter((p: any) => p.quantity === 0).length,
      totalInventoryValue: products.reduce((a: number, p: any) => a + (p.purchasePrice * p.quantity), 0),
      todaySales: sales.filter((s: any) => s.date?.startsWith(today)).reduce((a: number, s: any) => a + s.grandTotal, 0),
      monthlySales: sales.filter((s: any) => s.date?.startsWith(month)).reduce((a: number, s: any) => a + s.grandTotal, 0),
      recentSales: sales.slice(0, 5),
      lowStockItems: products.filter((p: any) => p.quantity > 0 && p.quantity <= 10).slice(0, 8),
      outOfStockItems: products.filter((p: any) => p.quantity === 0).slice(0, 8),
      expiringSoonItems: products.filter((p: any) => p.expiryDate && p.expiryDate <= sixMStr && p.expiryDate >= today),
      expiredItems: products.filter((p: any) => p.expiryDate && p.expiryDate < today),
    });
  }

  // LOGS
  if (type === 'logs' && req.method === 'GET') {
    const d = await sb('GET', 'activity_logs?select=*&order=date.desc&limit=500');
    return res.json((d || []).map((l: any) => ({ id: l.id, date: l.date, userId: l.user_id, userName: l.user_name, action: l.action, details: l.details })));
  }

  // BACKUP
  if (type === 'backup' && req.method === 'GET') {
    const [users, cats, sups, prods, txns, sales, settArr, logs] = await Promise.all([
      sb('GET', 'users?select=*'), sb('GET', 'categories?select=*'), sb('GET', 'suppliers?select=*'),
      sb('GET', 'products?select=*'), sb('GET', 'stock_transactions?select=*&order=date.desc'),
      sb('GET', 'sales?select=*&order=date.desc'), sb('GET', 'settings?id=eq.1'),
      sb('GET', 'activity_logs?select=*&order=date.desc&limit=500'),
    ]);
    const backup = {
      users: (users || []).map((u: any) => ({ id: u.id, username: u.username, name: u.name, role: u.role, password: u.password, active: u.active })),
      categories: cats || [],
      suppliers: (sups || []).map(ms),
      products: (prods || []).map(mp),
      stockTransactions: (txns || []).map((t: any) => ({ id: t.id, productId: t.product_id, productName: t.product_name, type: t.type, subType: t.sub_type, quantity: t.quantity, date: t.date, supplierId: t.supplier_id, supplierName: t.supplier_name, notes: t.notes, userId: t.user_id, userName: t.user_name })),
      sales: (sales || []).map(msa),
      settings: settArr?.[0] ? mset(settArr[0]) : {},
      activityLogs: (logs || []).map((l: any) => ({ id: l.id, date: l.date, userId: l.user_id, userName: l.user_name, action: l.action, details: l.details }))
    };
    res.setHeader('Content-Disposition', `attachment; filename=spraycenter_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(backup, null, 2));
  }

  // RESTORE
  if (type === 'restore' && req.method === 'POST') {
    const { backupData } = req.body;
    if (!backupData) return res.status(400).json({ error: 'Invalid backup data.' });
    for (const u of (backupData.users || [])) await sb('POST', 'users', { id: u.id, username: u.username, name: u.name, role: u.role, password: u.password, active: u.active }).catch(() => {});
    for (const c of (backupData.categories || [])) await sb('POST', 'categories', c).catch(() => {});
    for (const s of (backupData.suppliers || [])) await sb('POST', 'suppliers', { id: s.id, name: s.name, company_name: s.companyName, contact_number: s.contactNumber, email: s.email, address: s.address, notes: s.notes }).catch(() => {});
    for (const p of (backupData.products || [])) await sb('POST', 'products', { id: p.id, name: p.name, category: p.category, brand: p.brand, description: p.description, batch_number: p.batchNumber, purchase_price: p.purchasePrice, sale_price: p.salePrice, quantity: p.quantity, unit: p.unit, manufacturing_date: p.manufacturingDate, expiry_date: p.expiryDate, supplier_id: p.supplierId, image_url: p.imageUrl }).catch(() => {});
    const s = backupData.settings;
    if (s) await sb('PATCH', 'settings?id=eq.1', { shop_name: s.shopName, shop_address: s.shopAddress, contact_number: s.contactNumber, email_address: s.emailAddress, receipt_footer_message: s.receiptFooterMessage, currency_symbol: s.currencySymbol, theme_mode: s.themeMode }).catch(() => {});
    return res.json({ success: true, message: 'Database restored', settings: backupData.settings });
  }

  res.status(400).json({ error: 'Invalid request' });
}
