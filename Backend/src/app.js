const express = require("express");
const authRoutes = require("./Routes/auth.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cookieParser());


app.use(

    cors({

        origin: "http://localhost:5173",

        credentials: true,

    })

);



app.use("/api/auth", authRoutes);


module.exports = app;