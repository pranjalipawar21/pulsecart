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

module.exports = router;
