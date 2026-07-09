const express = require("express");
const authRoutes = require("./Routes/auth.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const workoutRoutes = require("./Routes/workout.routes");

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

app.use("/api/workouts", workoutRoutes);

module.exports = app;