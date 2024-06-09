const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const router = express.Router();

// Passport configuration
passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    User.authenticate()
));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

router.get('/', (req, res) => {
    res.render('index');
});

// Registration route
router.post('/register', (req, res) => {

    const { firstName, lastName, email, role, course, department, level, password } = req.body;

    if (!firstName || !lastName || !email || !role || !course || !department || !level || !password) {
        console.log("Validation Error: Missing fields");
        return res.status(400).send("All fields are required");
    }

    const newUser = new User({
        email,
        username: email,
        firstName,
        lastName,
        role,
        course,
        department,
        level,
        registrationDate: new Date(),
        lastAccessDate: new Date()
    });

    User.register(newUser, password, (err, user) => {
        if (err) {
            console.error("Registration error:", err);
            if (err.name === 'UserExistsError') {
                return res.status(400).send('A user with the given email is already registered');
            }
            return res.status(500).send(err.message);
        }
        res.redirect('/auth');
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
        req.logIn(user, (err) => {
            if (err) {
                console.error("Login error after authentication:", err); 
                return next(err);
            }
            return res.redirect('/main');
        });
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
