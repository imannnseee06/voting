// JWT middleware for authentication
const jwt = require("jsonwebtoken");

const generateToken = (user) => {

    return jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );
};

const jwtAuthenticate = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

// Authorization middleware: Admin only
const adminOnly = (req, res, next) => {

    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Admin only."
        });
    }

};

// Authorization middleware: Voter only
const voterOnly = (req, res, next) => {

    if (req.user && req.user.role === "voter") {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Voters only."
        });
    }

};

module.exports = {
    generateToken,
    jwtAuthenticate,
    adminOnly,
    voterOnly
};