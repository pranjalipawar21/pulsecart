/**
 * PulseCart Orders Routes
 *
 * GET  /api/orders             — Paginated order feed (MySQL or in-memory fallback)
 * POST /api/orders             — Create new order
 * GET  /api/orders/:id/invoice — Return invoice data as JSON (rendered in frontend modal)
 */
const router = require('express').Router();
const { isAvailable, getPool } = require('../db');
const { requireAuth }          = require('../middleware/auth');

// ─── In-memory fallback data ──────────────────────────────────────────────────
// Used only when MySQL is unavailable (e.g., GitHub Pages demo without backend)
const NAMES    = ['Aarav Shah','Priya Rai','Rohit Kumar','Ananya Iyer','Vikram Singh',
                  'Sneha Patel','Arjun Verma','Meera Nair','Karan Joshi','Divya Reddy'];
const CHANNELS = ['Organic','Paid Search','Social','Email','App','Direct','Affiliate'];
const REGIONS  = ['Mumbai','Delhi NCR','Bangalore','Hyderabad','Chennai','Pune','Ahmedabad'];
const CATS     = ['Electronics','Fashion','Health & Beauty','Home & Kitchen','Sports','Books'];
const STATUSES = ['processing','processing','shipped','shipped','delivered','delivered','returned'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr)       { return arr[rand(0, arr.length - 1)]; }

let orderCounter = 10000;
function mockOrder() {
  const cat    = pick(CATS);
  const aovMap = { Electronics: 8400, Fashion: 1200, 'Health & Beauty': 480,
                   'Home & Kitchen': 2100, Sports: 1900, Books: 390 };
  const base   = aovMap[cat] || 1500;
  const amount = rand(Math.round(base * 0.6), Math.round(base * 1.6));
  return {
    id:         ++orderCounter,
    order_id:   `PC-2024-${orderCounter}`,
    customer:   pick(NAMES),
    category:   cat,
    channel:    pick(CHANNELS),
    region:     pick(REGIONS),
    amount,
    tax_amount: Math.round(amount * 0.18),
    status:     pick(STATUSES),
    created_at: new Date().toISOString(),
  };
}

const memOrders = Array.from({ length: 20 }, mockOrder).reverse();

// ─── GET /api/orders ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const limit  = parseInt(req.query.limit  || '20');
  const offset = parseInt(req.query.offset || '0');
  try {
    if (isAvailable()) {
      const [rows]      = await getPool().execute(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      const [[{ total }]] = await getPool().execute('SELECT COUNT(*) AS total FROM orders');
      return res.json({ success: true, orders: rows, total });
    }
    const slice = memOrders.slice(offset, offset + limit);
    res.json({ success: true, orders: slice, total: memOrders.length, source: 'memory' });
  } catch (err) {
    console.error('GET /orders error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch orders', orders: [], total: 0 });
  }
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const order = { ...mockOrder(), ...req.body };
  try {
    if (isAvailable()) {
      await getPool().execute(
        `INSERT INTO orders (order_id, customer, category, channel, region, amount, tax_amount, status)
         VALUES (?,?,?,?,?,?,?,?)`,
        [order.order_id, order.customer, order.category, order.channel,
         order.region, order.amount, order.tax_amount || 0, order.status]
      );
      return res.status(201).json({ success: true, order });
    }
    memOrders.unshift(order);
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('POST /orders error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// ─── GET /api/orders/:id/invoice — Returns JSON (not PDF) ────────────────────
// Frontend renders this as a modal — no pdfkit dependency needed.
// The Inv button in the order feed calls this and opens an invoice modal.
router.get('/:id/invoice', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    let order = null;

    if (isAvailable()) {
      // Try matching by numeric id first, then by order_id string
      const [rowsById] = await getPool().execute(
        'SELECT * FROM orders WHERE id = ? OR order_id = ?', [id, id]
      );
      order = rowsById[0] || null;
    } else {
      order = memOrders.find(o => String(o.id) === String(id) || o.order_id === id);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order #${id} not found`,
      });
    }

    const amount    = Number(order.amount    || 0);
    const taxAmount = Number(order.tax_amount || amount * 0.18);
    const cgst      = taxAmount / 2;
    const sgst      = taxAmount / 2;
    const grandTotal = amount + taxAmount;

    // Build structured invoice JSON for frontend modal rendering
    const invoice = {
      invoiceNumber:  `INV-${order.order_id || order.id}`,
      orderId:        order.order_id || order.id,
      date:           order.created_at
                        ? new Date(order.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                        : new Date().toLocaleDateString('en-IN'),
      customer:       order.customer || 'Walk-in Customer',
      category:       order.category || 'General',
      channel:        order.channel  || 'Direct',
      region:         order.region   || 'India',
      status:         order.status   || 'processing',
      lineItems: [
        {
          description: `${order.category || 'Product'} — Order ${order.order_id || order.id}`,
          qty:         1,
          unitPrice:   amount,
          total:       amount,
        },
      ],
      subtotal:     amount,
      cgst:         Number(cgst.toFixed(2)),
      sgst:         Number(sgst.toFixed(2)),
      totalTax:     Number(taxAmount.toFixed(2)),
      grandTotal:   Number(grandTotal.toFixed(2)),
      gstin:        '27PULSECART001Z5',
      companyName:  'PulseCart Retail Intelligence',
      companyAddr:  'Mumbai, Maharashtra — 400001',
      paymentStatus: order.status === 'returned' ? 'Refunded'
                    : order.status === 'processing' ? 'Pending'
                    : 'Paid',
    };

    res.json({ success: true, invoice });

  } catch (err) {
    console.error('Invoice Error:', err.message);
    res.status(500).json({ success: false, error: `Invoice generation failed: ${err.message}` });
  }
});

module.exports = router;
