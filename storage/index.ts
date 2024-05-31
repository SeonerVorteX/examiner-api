import mongoose from "mongoose";
import { storeExam } from "./utils";
import { config } from "dotenv";
import { readdirSync } from "fs";
config();

mongoose.connect(process.env.MONGO_URL!);
mongoose.connection.once("connected", () => {
    console.log("Connected to MongoDB");
    readdirSync("./storage/source").forEach((path) => {
        storeExam(path);
    });
});
