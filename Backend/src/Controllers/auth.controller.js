const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../data/db");





const registerUser = async (req, res) => {

    try {

        const {
            fullName,
            email,
            password,
            age,
            gender,
            weight
        } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "User already exists.",
            });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({

            data: {

                fullName,
                email,
                password: hashedPassword,
                age: Number(age),
                gender,
                weight: Number(weight),

            },

        });

        return res.status(201).json({

            success: true,
            message: "User Registered Successfully",

            user: {

                id: user.id,
                fullName: user.fullName,
                email: user.email,
                age: user.age,
                gender: user.gender,
                weight: user.weight,

            },

        });

    }

    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,
            message: "Internal Server Error",

        });

    }

};




const loginUser = async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({

            where: {

                email,

            },

        });

        if (!user) {

            return res.status(400).json({

                success: false,
                message: "Invalid Credentials",

            });

        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.status(400).json({

                success: false,
                message: "Invalid Credentials",

            });

        }

        const token = jwt.sign(

            {

                id: user.id,
                email: user.email,

            },

            process.env.JWT_SECRET,

            {

                expiresIn: "7d",

            }

        );

    

        const { password: _, ...userData } = user;

        res.cookie("token", token, {

            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,

        });

        return res.status(200).json({

            success: true,
            message: "Login Successful",

            token,

            user: userData,

        });

    }

    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,
            message: "Internal Server Error",

        });

    }

};





const logoutUser = async (req, res) => {

    try {

        res.clearCookie("token", {

            httpOnly: true,
            secure: false,
            sameSite: "lax",

        });

        return res.status(200).json({

            success: true,
            message: "Logout Successful",

        });

    }

    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,
            message: "Internal Server Error",

        });

    }

};




const getCurrentUser = async (req, res) => {

    try {

        const user = await prisma.user.findUnique({

            where: {

                id: req.user.id,

            },

        });

        if (!user) {

            return res.status(404).json({

                success: false,
                message: "User not found",

            });

        }

        const { password, ...userData } = user;

        return res.status(200).json({

            success: true,
            user: userData,

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,
            message: "Internal Server Error",

        });

    }

};




module.exports = {

    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,

};