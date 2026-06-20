import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb } from './sb';
const mapT = (t: any) => ({ id: t.id, productId: t.product_id, productName: t.product_name, type: t.type, subType: t.sub_type, quantity: t.quantity, date: t.date, supplierId: t.supplier_id, supplierName: t.supplier_name, notes: t.notes, userId: t.user_id, userName: t.user_name });
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const data = await sb('GET', 'stock_transactions?select=*&order=date.desc');
    return res.json((data || []).map(mapT));
  }
  if (req.method === 'POST') {
    const { currentUserId, productId, type, subType, quantity, supplierId, notes } = req.body;
    if (!productId || !type || !subType || !quantity) return res.status(400).json({ error: 'Missing required fields.' });
    const prods = await sb('GET', `products?id=eq.${productId}&select=*`);
    const p = prods?.[0];
    if (!p) return res.status(404).json({ error: 'Product not found.' });
    const qty = Number(quantity);
    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero.' });
    const newQty = type === 'IN' ? p.quantity + qty : p.quantity - qty;
    if (newQty < 0) return res.status(400).json({ error: `Insufficient stock. Only ${p.quantity} available.` });
    await sb('PATCH', `products?id=eq.${productId}`, { quantity: newQty });
    const users = await sb('GET', `users?id=eq.${currentUserId}&select=*`);
    const user = users?.[0];
    let supName = null;
    if (supplierId) { const sups = await sb('GET', `suppliers?id=eq.${supplierId}&select=*`); supName = sups?.[0]?.name || null; }
    const txn = { id: `TXN-${Date.now()}`, product_id: productId, product_name: p.name, type, sub_type: subType, quantity: qty, date: new Date().toISOString(), supplier_id: supplierId || null, supplier_name: supName, notes: notes || '', user_id: currentUserId, user_name: user?.name || 'Admin' };
    const data = await sb('POST', 'stock_transactions', txn);
    return res.status(201).json(mapT(data?.[0]));
  }
  res.status(405).end();
}
