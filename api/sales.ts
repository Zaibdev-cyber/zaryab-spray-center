import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, msa } from './_sb';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const data = await sb('GET', 'sales?select=*&order=date.desc');
    return res.json((data || []).map(msa));
  }
  if (req.method === 'POST') {
    const { currentUserId, customerName, discount, cashReceived, items } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No products in cart.' });
    const users = await sb('GET', `users?id=eq.${currentUserId}&select=*`);
    const cashier = users?.[0];
    const ids = items.map((i: any) => i.productId).join(',');
    const products = await sb('GET', `products?id=in.(${ids})&select=*`);
    let subtotal = 0;
    const processed = [];
    for (const item of items) {
      const p = products.find((x: any) => x.id === item.productId);
      if (!p) return res.status(404).json({ error: `Product not found: ${item.productId}` });
      const qty = Number(item.quantity);
      if (p.quantity < qty) return res.status(400).json({ error: `Insufficient stock for ${p.name}. Available: ${p.quantity}` });
      const total = p.sale_price * qty;
      subtotal += total;
      processed.push({ productId: p.id, name: p.name, quantity: qty, unit: p.unit, unitPrice: p.sale_price, total });
    }
    const disc = Number(discount) || 0;
    const grand = Math.max(0, subtotal - disc);
    const paid = Number(cashReceived) || 0;
    if (paid < grand) return res.status(400).json({ error: `Insufficient cash. Bill: ${grand}, Paid: ${paid}` });
    for (const item of processed) {
      const p = products.find((x: any) => x.id === item.productId);
      await sb('PATCH', `products?id=eq.${item.productId}`, { quantity: p.quantity - item.quantity });
      await sb('POST', 'stock_transactions', { id: `TXN-SALE-${Date.now()}-${item.productId}`, product_id: item.productId, product_name: item.name, type: 'OUT', sub_type: 'MANUAL', quantity: item.quantity, date: new Date().toISOString(), notes: 'Sale', user_id: currentUserId, user_name: cashier?.name || 'Cashier' }).catch(() => {});
    }
    const allSales = await sb('GET', 'sales?select=id');
    const date = new Date().toISOString();
    const inv = `INV-${date.split('T')[0].replace(/-/g, '')}-${((allSales?.length || 0) + 1).toString().padStart(3, '0')}`;
    const sale = { id: `SAL-${Date.now()}`, invoice_number: inv, date, cashier_id: currentUserId, cashier_name: cashier?.name || 'Admin', customer_name: (customerName || '').trim() || 'Walk-in Customer', subtotal, discount: disc, grand_total: grand, cash_received: paid, balance_return: Math.max(0, paid - grand), items: processed };
    const data = await sb('POST', 'sales', sale);
    await sb('POST', 'activity_logs', { id: `LOG-${Date.now()}`, date, user_id: currentUserId, user_name: cashier?.name || 'Admin', action: 'Invoice Issued', details: `Invoice ${inv} - Total: ${grand}` }).catch(() => {});
    return res.status(201).json(msa(data?.[0]));
  }
  res.status(405).end();
}
