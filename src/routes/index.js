const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.get('/main', (req, res) => {
  res.render('main');
});

router.get('/listaRecursos', (req, res) => {
  res.render('listaRecursos');
});

router.get('/listaPosts', (req, res) => {
  res.render('listaPosts');
});

router.get('/rankings', (req, res) => {
  res.render('rankings');
});

router.get('/adicionarRecurso', (req, res) => {
  res.render('addRec');
});

router.get('/perfil', (req, res) => {
  res.render('perfil');
});

module.exports = router;
