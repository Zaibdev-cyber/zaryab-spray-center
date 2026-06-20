import type { VercelRequest, VercelResponse } from '@vercel/node';
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_KEY!;
async function sb(method: string, endpoint: string, body?: any) {
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, { method, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); return text ? JSON.parse(text) : null;
}
const mp = (p: any) => ({ id: p.id, name: p.name, category: p.category, brand: p.brand, description: p.description, batchNumber: p.batch_number, purchasePrice: p.purchase_price, salePrice: p.sale_price, quantity: p.quantity, unit: p.unit, manufacturingDate: p.manufacturing_date, expiryDate: p.expiry_date, supplierId: p.supplier_id, imageUrl: p.image_url });
const ms = (s: any) => ({ id: s.id, name: s.name, companyName: s.company_name, contactNumber: s.contact_number, email: s.email, address: s.address, notes: s.notes });
const msa = (s: any) => ({ id: s.id, invoiceNumber: s.invoice_number, date: s.date, cashierId: s.cashier_id, cashierName: s.cashier_name, customerName: s.customer_name, subtotal: s.subtotal, discount: s.discount, grandTotal: s.grand_total, cashReceived: s.cash_received, balanceReturn: s.balance_return, items: s.items });
const mset = (s: any) => ({ shopName: s.shop_name, shopAddress: s.shop_address, contactNumber: s.contact_number, emailAddress: s.email_address, receiptFooterMessage: s.receipt_footer_message, currencySymbol: s.currency_symbol, themeMode: s.theme_mode });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const type = req.query.type as string;

  if (type === 'settings') {
    if (req.method === 'GET') { const d = await sb('GET', 'settings?id=eq.1'); return res.json(d?.[0] ? mset(d[0]) : { shopName: 'Zaryab Spray Center', currencySymbol: 'Rs.', themeMode: 'light' }); }
    if (req.method === 'POST') {
      const { shopName, shopAddress, contactNumber, emailAddress, receiptFooterMessage, currencySymbol, themeMode } = req.body;
      const d = await sb('PATCH', 'settings?id=eq.1', { shop_name: shopName, shop_address: shopAddress, contact_number: contactNumber, email_address: emailAddress, receipt_footer_message: receiptFooterMessage, currency_symbol: currencySymbol, theme_mode: themeMode });
      return res.json(d?.[0] ? mset(d[0]) : req.body);
    }
  }

  if (type === 'dashboard' && req.method === 'GET') {
    const [rawP, rawS] = await Promise.all([sb('GET','products?select=*'), sb('GET','sales?select=*&order=date.desc')]);
    const products = (rawP||[]).map(mp); const sales = (rawS||[]).map(msa);
    const today = new Date().toISOString().split('T')[0]; const month = today.substring(0,7);
    const sixM = new Date(); sixM.setMonth(sixM.getMonth()+6); const sixMStr = sixM.toISOString().split('T')[0];
    return res.json({
      totalProducts: products.length,
      totalCategories: [...new Set(products.map((p:any)=>p.category))].length,
      totalStockQuantity: products.reduce((a:number,p:any)=>a+p.quantity,0),
      lowStockCount: products.filter((p:any)=>p.quantity>0&&p.quantity<=10).length,
      outOfStockCount: products.filter((p:any)=>p.quantity===0).length,
      totalInventoryValue: products.reduce((a:number,p:any)=>a+(p.purchasePrice*p.quantity),0),
      todaySales: sales.filter((s:any)=>s.date?.startsWith(today)).reduce((a:number,s:any)=>a+s.grandTotal,0),
      monthlySales: sales.filter((s:any)=>s.date?.startsWith(month)).reduce((a:number,s:any)=>a+s.grandTotal,0),
      recentSales: sales.slice(0,5),
      lowStockItems: products.filter((p:any)=>p.quantity>0&&p.quantity<=10).slice(0,8),
      outOfStockItems: products.filter((p:any)=>p.quantity===0).slice(0,8),
      expiringSoonItems: products.filter((p:any)=>p.expiryDate&&p.expiryDate<=sixMStr&&p.expiryDate>=today),
      expiredItems: products.filter((p:any)=>p.expiryDate&&p.expiryDate<today),
    });
  }

  if (type === 'logs' && req.method === 'GET') {
    const d = await sb('GET','activity_logs?select=*&order=date.desc&limit=500');
    return res.json((d||[]).map((l:any)=>({ id:l.id, date:l.date, userId:l.user_id, userName:l.user_name, action:l.action, details:l.details })));
  }

  if (type === 'backup' && req.method === 'GET') {
    const [users,cats,sups,prods,txns,sales,settArr,logs] = await Promise.all([
      sb('GET','users?select=*'), sb('GET','categories?select=*'), sb('GET','suppliers?select=*'),
      sb('GET','products?select=*'), sb('GET','stock_transactions?select=*&order=date.desc'),
      sb('GET','sales?select=*&order=date.desc'), sb('GET','settings?id=eq.1'),
      sb('GET','activity_logs?select=*&order=date.desc&limit=500'),
    ]);
    const backup = {
      users: (users||[]).map((u:any)=>({ id:u.id, username:u.username, name:u.name, role:u.role, password:u.password, active:u.active })),
      categories: cats||[], suppliers: (sups||[]).map(ms), products: (prods||[]).map(mp),
      stockTransactions: (txns||[]).map((t:any)=>({ id:t.id, productId:t.product_id, productName:t.product_name, type:t.type, subType:t.sub_type, quantity:t.quantity, date:t.date, supplierId:t.supplier_id, supplierName:t.supplier_name, notes:t.notes, userId:t.user_id, userName:t.user_name })),
      sales: (sales||[]).map(msa), settings: settArr?.[0] ? mset(settArr[0]) : {},
      activityLogs: (logs||[]).map((l:any)=>({ id:l.id, date:l.date, userId:l.user_id, userName:l.user_name, action:l.action, details:l.details }))
    };
    res.setHeader('Content-Disposition',`attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-Type','application/json');
    return res.send(JSON.stringify(backup,null,2));
  }

  if (type === 'restore' && req.method === 'POST') {
    const { backupData } = req.body; if (!backupData) return res.status(400).json({ error: 'Invalid backup.' });
    for (const u of (backupData.users||[])) await sb('POST','users',{ id:u.id, username:u.username, name:u.name, role:u.role, password:u.password, active:u.active }).catch(()=>{});
    for (const c of (backupData.categories||[])) await sb('POST','categories',c).catch(()=>{});
    for (const s of (backupData.suppliers||[])) await sb('POST','suppliers',{ id:s.id, name:s.name, company_name:s.companyName, contact_number:s.contactNumber, email:s.email, address:s.address, notes:s.notes }).catch(()=>{});
    for (const p of (backupData.products||[])) await sb('POST','products',{ id:p.id, name:p.name, category:p.category, brand:p.brand, description:p.description, batch_number:p.batchNumber, purchase_price:p.purchasePrice, sale_price:p.salePrice, quantity:p.quantity, unit:p.unit, manufacturing_date:p.manufacturingDate, expiry_date:p.expiryDate, supplier_id:p.supplierId, image_url:p.imageUrl }).catch(()=>{});
    const s = backupData.settings;
    if (s) await sb('PATCH','settings?id=eq.1',{ shop_name:s.shopName, shop_address:s.shopAddress, contact_number:s.contactNumber, email_address:s.emailAddress, receipt_footer_message:s.receiptFooterMessage, currency_symbol:s.currencySymbol, theme_mode:s.themeMode }).catch(()=>{});
    return res.json({ success:true, message:'Database restored', settings:backupData.settings });
  }

  res.status(400).json({ error: 'Invalid request' });
}
