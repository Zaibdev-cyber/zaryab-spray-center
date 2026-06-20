import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, ms } from './_sb';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const type = req.query.type as string;
  const id = req.query.id as string;

  if (type === 'categories') {
    if (req.method === 'GET') { const d = await sb('GET', 'categories?select=*'); return res.json(d || []); }
    if (req.method === 'POST') {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Category name is required' });
      const ex = await sb('GET', `categories?name=eq.${encodeURIComponent(name)}&select=id`);
      if (ex?.length > 0) return res.status(400).json({ error: 'Category already exists' });
      const d = await sb('POST', 'categories', { id: `CAT-${Date.now()}`, name: name.trim(), description: description || '' });
      return res.status(201).json(d?.[0]);
    }
    if (req.method === 'DELETE' && id) { await sb('DELETE', `categories?id=eq.${id}`); return res.json({ success: true }); }
  }

  if (type === 'suppliers') {
    if (req.method === 'GET') { const d = await sb('GET', 'suppliers?select=*'); return res.json((d || []).map(ms)); }
    if (req.method === 'POST') {
      const { name, companyName, contactNumber, email, address, notes } = req.body;
      if (!name || !companyName || !contactNumber) return res.status(400).json({ error: 'Name, Company and Contact required' });
      const d = await sb('POST', 'suppliers', { id: `SUP-${Date.now()}`, name, company_name: companyName, contact_number: contactNumber, email: email || '', address: address || '', notes: notes || '' });
      return res.status(201).json(ms(d?.[0]));
    }
    if (req.method === 'PUT' && id) {
      const { name, companyName, contactNumber, email, address, notes } = req.body;
      await sb('PATCH', `suppliers?id=eq.${id}`, { name, company_name: companyName, contact_number: contactNumber, email, address, notes });
      return res.json({ success: true });
    }
    if (req.method === 'DELETE' && id) { await sb('DELETE', `suppliers?id=eq.${id}`); return res.json({ success: true }); }
  }

  res.status(400).json({ error: 'Invalid type' });
}
