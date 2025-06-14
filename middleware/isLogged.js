const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const isLogged = (req, res, next) => {
    const cookies = cookie.parse(req.headers.cookie || '');

    if (!cookies.userToken) {
        return res.status(401).json({ message: 'Unauthorized: No token found' });
    }

    try {
        const decodedUser = jwt.verify(cookies.userToken, process.env.SECRET_KEY);
        req.user = decodedUser;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};


module.exports = isLogged;
