const jwt = require("jsonwebtoken");

const validateRegisterUser = (req, res, next) => {
    try {
        const { fullName, email, password, age, gender, weight } = req.body;

        if (!fullName || !email || !password || !age || !gender || !weight) {
            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        next();

    } catch (error) {
            return res.status(500).json({
            success: false,
            message: "Validation Error"
        });
    }
};



const validateLoginUser = (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format."
            });
        }

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Validation Error"
        });
    }
};

const protectRoute = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = {
    validateRegisterUser,
    validateLoginUser,
    protectRoute
};