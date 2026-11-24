// Middleware: перевірка JWT-токена з заголовка Authorization: Bearer <token>
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'secret-for-lab';

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Потрібна авторизація' });
  }
}

module.exports = { makeToken, auth };
