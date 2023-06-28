import express  from "express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import ErrorMiddelware from "./middelware/error.js";
import userRoute from "./routes/userRoute.js"
import bodyParser from "body-parser";
import postRoute from "./routes/postRoute.js"



const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json())

// Config
config({
    path:"./config/config.env"
})

app.get("/", (req, res)=>{
    res.send("Welcome")
})

// Using Route
app.use("/api/v1", userRoute)
app.use("/api/v1", postRoute)



export default app

// Using ErrorMiddelware
app.use(ErrorMiddelware);