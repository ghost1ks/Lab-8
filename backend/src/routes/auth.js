// Реєстрація і логін
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { makeToken } = require('../auth');

// POST /api/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 4) {
    return res.status(400).json({ error: 'Потрібні name, email, password (мін. 4 символи)' });
  }
  try {
    const hash = await bcrypt.hash(password, 8);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    const user = result.rows[0];
    res.status(201).json({ user, token: makeToken(user) });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такий email вже існує' });
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Невірний email або пароль' });
  }
  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token: makeToken(user),
  });
});

module.exports = router;
