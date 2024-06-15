const jwt = require('jsonwebtoken');
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
        res.redirect('/auth');
    }
    next();
};

module.exports = verifyJWT;
