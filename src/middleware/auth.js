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
        return res.status(401).send("Invalid Token");
    }
    next();
};

module.exports = verifyJWT;
