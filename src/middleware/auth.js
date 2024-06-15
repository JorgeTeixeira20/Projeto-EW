const jwt = require('jsonwebtoken');
const User = require('../models/user');
const jwtSecret = 'projeto-ew-2024';

const verifyJWT = (req, res, next) => {
    const token = req.cookies.token;  
    if (!token) {
        return res.redirect('/auth');
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
    } catch (err) {
        console.log("Invalid Token");
        return res.redirect('/auth');
    }
    next();
};

const setUser = async (req, res, next) => {
    const email = req.user.email;

    try {
        const user = await User.findOne({ email }).exec();
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.locals.user = user;
        next();
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).send('Internal Server Error');
    }
};
module.exports = {
    verifyJWT,
    setUser
};
