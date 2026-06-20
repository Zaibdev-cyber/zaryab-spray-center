import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, mp } from './sb';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  if (req.method === 'GET') {
    const data = await sb('GET', 'products?select=*');
    return res.json((data || []).map(mp));
  }
  if (req.method === 'POST') {
    const { barcodeId, name, category, brand, description, batchNumber, purchasePrice, salePrice, quantity, unit, manufacturingDate, expiryDate, supplierId, imageUrl } = req.body;
    const newId = (barcodeId || '').trim() || `691${Math.floor(10000 + Math.random() * 90000)}`;
    const exists = await sb('GET', `products?id=eq.${newId}&select=id`);
    if (exists?.length > 0) return res.status(400).json({ error: `Product ID '${newId}' already exists.` });
    const data = await sb('POST', 'products', { id: newId, name, category, brand: brand || 'Generic', description: description || '', batch_number: batchNumber || '', purchase_price: Number(purchasePrice), sale_price: Number(salePrice), quantity: Number(quantity) || 0, unit, manufacturing_date: manufacturingDate || '', expiry_date: expiryDate || '', supplier_id: supplierId, image_url: imageUrl || '' });
    if (Number(quantity) > 0) {
      await sb('POST', 'stock_transactions', { id: `TXN-${Date.now()}`, product_id: newId, product_name: name, type: 'IN', sub_type: 'PURCHASE', quantity: Number(quantity), date: new Date().toISOString(), supplier_id: supplierId, notes: 'Initial stock', user_id: 'SYSTEM', user_name: 'System' }).catch(() => {});
    }
    return res.status(201).json(mp(data?.[0]));
  }
  if (req.method === 'PUT' && id) {
    const { name, category, brand, description, batchNumber, purchasePrice, salePrice, quantity, unit, manufacturingDate, expiryDate, supplierId, imageUrl } = req.body;
    const data = await sb('PATCH', `products?id=eq.${id}`, { name, category, brand: brand || 'Generic', description: description || '', batch_number: batchNumber || '', purchase_price: Number(purchasePrice), sale_price: Number(salePrice), quantity: Number(quantity) || 0, unit, manufacturing_date: manufacturingDate || '', expiry_date: expiryDate || '', supplier_id: supplierId, image_url: imageUrl || '' });
    return res.json(mp(data?.[0]));
  }
  if (req.method === 'DELETE' && id) {
    await sb('DELETE', `products?id=eq.${id}`);
    return res.json({ success: true });
  }
  res.status(405).end();
}
