const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Resource = require('../models/resource');

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

router.get('/listaRecursos', async (req, res) => {
  try {
    const resources = await Resource.find({});
    res.render('listaRecursos', { userId: res.locals.userId, resources });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recursos.');
  }
});

router.get('/recurso/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).send('Recurso não encontrado');
    }
    res.render('recurso', { resource });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar recurso');
  }
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

router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('users', { title: 'Lista de Usuários', users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários');
  }
});


module.exports = router;
