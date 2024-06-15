const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const router = express.Router();

// Passport configuration
passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

router.get('/', (req, res) => {
    res.render('index');
});

// Registration route
router.post('/register', (req, res) => {
  const { firstName, lastName, email, role, course, department, password } = req.body;

  if (!firstName || !lastName || !email || !role || !course || !department || !password) {
      console.log("Validation Error: Missing fields");
      req.session.error_msg = 'All fields are required';
      return res.redirect('/auth/register');
  }

  const newUserId = new ObjectId().toString();
  const level = 'User'; // Definido automaticamente o level como "User" ao registar depois retirar

  const newUser = new User({
      _id: newUserId, 
      firstName,
      lastName,
      email,
      username: email,
      role,
      course,
      department,
      level, // Adicionado aqui depois possivelmente retirar
      admin: false, 
      registrationDate: new Date(),
      lastAccessDate: new Date()
  });

  User.register(newUser, password, (err) => {
      if (err) {
          console.error("Registration error:", err);
          if (err.name === 'UserExistsError') {
              req.session.error_msg = 'Email already registered';
              return res.redirect('/auth/register');
          }
          req.session.error_msg = err.message;
          return res.redirect('/auth/register');
      }
      req.session.success_msg = 'Sucesso no registo';
      res.redirect('/auth/login');
  });
});

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error("Login error:", err);
            req.session.error_msg = 'An error occurred during login';
            return next(err);
        }
        if (!user) {
          console.log("Login failed:", info);
          if (info && info.name === 'IncorrectUsernameError') {
              req.session.error_msg = 'Email not found';
          } else if (info && info.name === 'IncorrectPasswordError') {
              req.session.error_msg = 'Incorrect password';
          } else {
              req.session.error_msg = 'Invalid email or password';
          }
          return res.redirect('/auth/login');
      }
        const token = jwt.sign({ id: user._id, email: user.email }, 'projeto-ew-2024', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });  
        req.session.success_msg = 'You are logged in successfully';
        return res.redirect('/'); 
    })(req, res, next);
});

// Login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Register page
router.get('/register', (req, res) => {
    res.render('register');
});

// Logout route
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/auth'); 
});

module.exports = router;
