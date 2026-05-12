const router = require('express').Router();
const { isAvailable, getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const FIRST_NAMES = ['Aarav','Priya','Rohit','Ananya','Vikram','Sneha','Arjun','Meera','Karan','Divya','Rajesh','Pooja','Amit','Neha','Siddharth'];
const LAST_NAMES  = ['Shah','Patel','Sharma','Iyer','Singh','Kulkarni','Nair','Joshi','Malhotra','Menon','Kumar','Gupta','Verma','Reddy'];
const CHANNELS    = ['Organic','Paid Search','Social','Email','App','Direct','Affiliate'];
const REGIONS     = ['Mumbai','Delhi NCR','Bangalore','Hyderabad','Chennai','Pune','Ahmedabad','Kolkata'];
const CATEGORIES  = ['Electronics','Fashion','Health/Beauty','Home/Kitchen','Sports','Books'];
const STATUSES    = ['processing','processing','shipped','shipped','delivered','delivered','returned'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr)       { return arr[rand(0, arr.length - 1)]; }

let orderCounter = 10000;
function mockOrder() {
  const cat = pick(CATEGORIES);
  const aovMap = { Electronics: 8400, Fashion: 1200, 'Health/Beauty': 480, 'Home/Kitchen': 2100, Sports: 1900, Books: 390 };
  return {
    order_id:  `PC-2024-${++orderCounter}`,
    customer:  `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    category:  cat,
    channel:   pick(CHANNELS),
    region:    pick(REGIONS),
    amount:    rand(Math.round((aovMap[cat] || 1500) * 0.6), Math.round((aovMap[cat] || 1500) * 1.6)),
    status:    pick(STATUSES),
    created_at: new Date().toISOString(),
  };
}

// In-memory order buffer (seed 20 orders on startup)
const memOrders = Array.from({ length: 20 }, mockOrder).reverse();

// ─── GET /api/orders ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const limit  = parseInt(req.query.limit  || '20');
  const offset = parseInt(req.query.offset || '0');
  try {
    if (isAvailable()) {
      const [rows]    = await getPool().execute(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      const [[{ total }]] = await getPool().execute('SELECT COUNT(*) AS total FROM orders');
      return res.json({ orders: rows, total });
    }
    const slice = memOrders.slice(offset, offset + limit);
    res.json({ orders: slice, total: memOrders.length });
  } catch (err) {
    console.error('GET /orders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const order = { ...mockOrder(), ...req.body };
  try {
    if (isAvailable()) {
      await getPool().execute(
        `INSERT INTO orders (order_id, customer, category, channel, region, amount, status)
         VALUES (?,?,?,?,?,?,?)`,
        [order.order_id, order.customer, order.category, order.channel, order.region, order.amount, order.status]
      );
      return res.status(201).json(order);
    }
    memOrders.unshift(order);
    res.status(201).json(order);
  } catch (err) {
    console.error('POST /orders error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ─── GET /api/orders/:id/invoice ──────────────────────────────────────────────
router.get('/:id/invoice', requireAuth, async (req, res) => {
  const { id } = req.params;
  const PDFDocument = require('pdfkit');

  try {
    let order = null;
    if (isAvailable()) {
      const [rows] = await getPool().execute('SELECT * FROM orders WHERE id = ?', [id]);
      order = rows[0];
    } else {
      order = memOrders.find(o => o.id == id || o.order_id == id);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.order_id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('PulseCart Retail Intelligence', { align: 'center' });
    doc.fontSize(10).text('GSTIN: 27AAAAA0000A1Z5', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('TAX INVOICE', { underline: true });
    doc.moveDown();

    // Details
    doc.fontSize(12).text(`Order ID: ${order.order_id}`);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.text(`Customer: ${order.customer}`);
    doc.moveDown();

    // Table Header
    const tableTop = 250;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Category', 250, tableTop);
    doc.text('Amount (INR)', 450, tableTop, { align: 'right' });
    doc.moveDown();
    doc.font('Helvetica');
    doc.lineJoin('round').rect(50, tableTop + 15, 500, 1).fill('#000');

    // Table Content
    const itemY = tableTop + 30;
    doc.text(`Order Item - ${order.category}`, 50, itemY);
    doc.text(order.category, 250, itemY);
    doc.text(`₹${Number(order.amount).toLocaleString('en-IN')}`, 450, itemY, { align: 'right' });

    // Totals
    const totalY = itemY + 50;
    const cgst = order.amount * 0.09;
    const sgst = order.amount * 0.09;
    doc.text(`CGST (9%): ₹${cgst.toFixed(2)}`, 450, totalY, { align: 'right' });
    doc.text(`SGST (9%): ₹${sgst.toFixed(2)}`, 450, totalY + 20, { align: 'right' });
    doc.fontSize(14).font('Helvetica-Bold').text(`Total: ₹${(Number(order.amount) + cgst + sgst).toLocaleString('en-IN')}`, 450, totalY + 50, { align: 'right' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Invoice generation failed' });
  }
});

module.exports = router;
