const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configuração do Body-Parser
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração do Pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Servir arquivos estáticos (para CSS e outros recursos)
app.use(express.static(path.join(__dirname, 'public')));

// Servir arquivos estáticos da pasta Recursos
app.use('/static', express.static(path.join(__dirname, '../Recursos')));

// Importar rotas
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');

// Usar rotas
app.use('/', indexRouter);
app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

module.exports = app;
