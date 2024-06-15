const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const bodyParser = require('body-parser');
const session = require('express-session'); // ainda não sei se é necessário

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const verifyJWT = require('./middleware/auth');

const app = express();

const mongoDB = "mongodb://mongodb/recursosEducativos";
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Erro de conexão ao MongoDB"));
db.once("open", () => {
    console.log("Conexão ao MongoDB realizada com sucesso");
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//ainda não sei se é necessário
// Configuração de sessão
app.use(session({
  secret: 'projeto-ew-2024',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
// Middleware para autenticação com sessão, se necessário
// app.use(passport.session()); // Descometar se for para usar autenticação com sessão

// Middleware para passar mensagens flash para as views
app.use((req, res, next) => {
  res.locals.success_msg = req.session.success_msg;
  res.locals.error_msg = req.session.error_msg;
  delete req.session.success_msg;
  delete req.session.error_msg;
  next();
});

// Routes
app.use('/auth', authRouter);
app.use(verifyJWT);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    if (err.status === 404) {
        res.status(404).send("Page not found");
    } else {
        res.status(err.status || 500).send("Internal server error");
    }
});

module.exports = app;
