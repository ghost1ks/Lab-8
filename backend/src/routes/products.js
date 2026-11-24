// CRUD для товарів. Читати можна всім, змінювати - тільки авторизованим.
const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');

// GET /api/products?search=ноут&page=1&limit=5
router.get('/', async (req, res) => {
  const search = req.query.search || '';
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const items = await db.query(
    'SELECT * FROM products WHERE name ILIKE $1 ORDER BY id LIMIT $2 OFFSET $3',
    ['%' + search + '%', limit, (page - 1) * limit]
  );
  const count = await db.query('SELECT COUNT(*) FROM products WHERE name ILIKE $1', ['%' + search + '%']);
  res.json({ items: items.rows, total: Number(count.rows[0].count), page, limit });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не знайдено' });
  res.json(result.rows[0]);
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  const { name, description, price, stock } = req.body;
  if (!name || price === undefined || price < 0) {
    return res.status(400).json({ error: 'Потрібні name і price (>= 0)' });
  }
  const result = await db.query(
    'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, description || '', price, stock || 0]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  const { name, description, price, stock } = req.body;
  if (!name || price === undefined || price < 0) {
    return res.status(400).json({ error: 'Потрібні name і price (>= 0)' });
  }
  const result = await db.query(
    'UPDATE products SET name=$1, description=$2, price=$3, stock=$4 WHERE id=$5 RETURNING *',
    [name, description || '', price, stock || 0, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не знайдено' });
  res.json(result.rows[0]);
});

// DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Товар не знайдено' });
    res.status(204).end();
  } catch (e) {
    // 23503 - на товар є замовлення
    if (e.code === '23503') return res.status(400).json({ error: 'Товар є в замовленнях, видалити не можна' });
    throw e;
  }
});

module.exports = router;
