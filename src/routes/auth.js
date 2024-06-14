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
        return res.status(400).send("All fields are required");
    }

    const newUserId = new ObjectId().toString();

    const newUser = new User({
        _id: newUserId, 
        firstName,
        lastName,
        email,
        username: email,
        role,
        course,
        department,
        admin: false, 
        registrationDate: new Date(),
        lastAccessDate: new Date()
    });

    User.register(newUser, password, (err) => {
        if (err) {
            console.error("Registration error:", err);
            if (err.name === 'UserExistsError') {
                return res.status(400).send('A user with the given email is already registered');
            }
            return res.status(500).send(err.message);
        }
        res.redirect('/auth/login');
    });
});

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error("Login error:", err);
            return next(err);
        }
        if (!user) {
            console.log("Login failed:", info);
            return res.redirect('/auth/login');
        }
        const token = jwt.sign({ id: user._id, email: user.email }, 'projeto-ew-2024', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });  
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

module.exports = router;
