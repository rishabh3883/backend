const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
    return (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Authentication failed: No token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
            req.user = decoded;

            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Authentication failed: Invalid token' });
        }
    };
};

module.exports = authMiddleware;
