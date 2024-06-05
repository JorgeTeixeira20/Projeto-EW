const express = require('express');
const router = express.Router();

// Rota de login (a lógica de autenticação será adicionada posteriormente)
router.post('/login', (req, res) => {
  // Placeholder para autenticação
  res.redirect('/main');
});

// Rota de registo (a lógica de registo será adicionada posteriormente)
router.post('/register', (req, res) => {
  // Placeholder para registo
  res.redirect('/main');
});

module.exports = router;
