const router = require('express').Router();
const { isAvailable, getPool, FALLBACK } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const multer = require('multer');
const { parse } = require('csv-parse');
const { createObjectCsvStringifier } = require('csv-writer');

const upload = multer({ dest: 'uploads/' });

// ─── GET /api/inventory ───────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    if (isAvailable()) {
      const [rows] = await getPool().execute(
        `SELECT id, sku, product, category, stock, reorder_threshold, turnover, price, status, location
         FROM inventory
         ORDER BY FIELD(status,'critical','low','healthy'), stock ASC`
      );
      return res.json(rows);
    }
    res.json(FALLBACK.inventory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// ─── POST /api/inventory/sku/:sku/stock ─────────────────────────────────────
// Real-time stock update by SKU (for barcode scanner)
router.post('/sku/:sku/stock', requireAuth, async (req, res) => {
  const { sku } = req.params;
  const { adjustment } = req.body; // e.g. +1 or -1
  
  if (isNaN(adjustment)) return res.status(400).json({ error: 'Adjustment must be a number' });

  try {
    if (isAvailable()) {
      const [result] = await getPool().execute(
        'UPDATE inventory SET stock = stock + ? WHERE sku = ?',
        [adjustment, sku]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'SKU not found' });
      
      const [updated] = await getPool().execute('SELECT * FROM inventory WHERE sku = ?', [sku]);
      res.json({ message: 'Stock updated', item: updated[0] });
    } else {
      const item = FALLBACK.inventory.find(i => i.sku === sku);
      if (!item) return res.status(404).json({ error: 'SKU not found' });
      item.stock += adjustment;
      res.json({ message: 'Stock updated (fallback)', item });
    }
  } catch (err) {
    res.status(500).json({ error: 'Stock update failed' });
  }
});

// ─── POST /api/inventory/import ─────────────────────────────────────────────
router.post('/import', requireAuth, requireOwner, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fs = require('fs');
  const records = [];
  const parser = fs.createReadStream(req.file.path).pipe(parse({ columns: true, skip_empty_lines: true }));

  for await (const record of parser) {
    records.push(record);
  }

  if (isAvailable()) {
    try {
      for (const r of records) {
        await getPool().execute(
          `INSERT INTO inventory (sku, product, category, stock, price, location) 
           VALUES (?, ?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE stock = VALUES(stock), price = VALUES(price), location = VALUES(location)`,
          [r.sku, r.product, r.category, r.stock, r.price, r.location || 'Warehouse A']
        );
      }
      fs.unlinkSync(req.file.path);
      res.json({ message: `Successfully imported ${records.length} items` });
    } catch (err) {
      res.status(500).json({ error: 'Import failed', detail: err.message });
    }
  } else {
    res.status(503).json({ error: 'Database unavailable for bulk import' });
  }
});

// ─── GET /api/inventory/export ──────────────────────────────────────────────
router.get('/export', requireAuth, async (req, res) => {
  try {
    let data = [];
    if (isAvailable()) {
      const [rows] = await getPool().execute('SELECT * FROM inventory');
      data = rows;
    } else {
      data = FALLBACK.inventory;
    }

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'sku', title: 'SKU' },
        { id: 'product', title: 'PRODUCT' },
        { id: 'category', title: 'CATEGORY' },
        { id: 'stock', title: 'STOCK' },
        { id: 'price', title: 'PRICE' },
        { id: 'location', title: 'LOCATION' },
      ]
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
    res.send(csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── PUT /api/inventory/:id/reorder ──────────────────────────────────────────
router.put('/:id/reorder', requireAuth, requireOwner, async (req, res) => {
  const { id }       = req.params;
  const { quantity = 100, note = '' } = req.body;

  try {
    if (isAvailable()) {
      const [item] = await getPool().execute('SELECT id, product FROM inventory WHERE id = ?', [id]);
      if (!item[0]) return res.status(404).json({ error: 'SKU not found' });

      await getPool().execute('UPDATE inventory SET stock = stock + ? WHERE id = ?', [quantity, id]);
      await getPool().execute(
        'INSERT INTO reorder_log (inventory_id, triggered_by, quantity, note) VALUES (?,?,?,?)',
        [id, req.user.id, quantity, note]
      );
      const [updated] = await getPool().execute('SELECT * FROM inventory WHERE id = ?', [id]);
      return res.json({ message: `Reorder triggered for ${item[0].product}`, sku: updated[0] });
    }
    res.status(503).json({ error: 'Database unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Reorder failed' });
  }
});

module.exports = router;
