const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const adminModel = require("../models/admin");

const isAdmin = (req, res, next) => {
    try {
        // Parse cookies
        const cookies = cookie.parse(req.headers.cookie || "");
        const token = cookies.adminToken;

        // Check if token exists
        if (!token) {
            return res.status(401).json({ message: "Access Denied: No Token Provided" });
        }

        // Verify the token
        const decodedAdmin = jwt.verify(token, process.env.SECRET_KEY);
        if (!decodedAdmin || !decodedAdmin.userId) {
            return res.status(401).json({ message: "Invalid Token" });
        }

        req.admin = decodedAdmin;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or Expired Token" });
    }
};

const authorizeRoles = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.admin || !req.admin.userId) {
                return res.status(401).json({ message: "Unauthorized: No Admin Found" });
            }

            const admin = await adminModel.findById(req.admin.userId);
            if (!admin) {
                return res.status(404).json({ message: "Admin Not Found" });
            }

            if (!roles.includes(admin.role)) {
                return res.status(403).json({ message: "Forbidden: Access Denied" });
            }

            next();
        } catch (err) {
            console.error("Authorization Error:", err);
            res.status(500).json({ message: "Server Error" });
        }
    };
};

module.exports = { isAdmin, authorizeRoles };
