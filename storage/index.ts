import mongoose from "mongoose";
import { storeExam } from "./utils";
import { config } from "dotenv";
import { readdirSync } from "fs";
config();

mongoose.connect(process.env.MONGO_URI!);
mongoose.connection.once("connected", () => {
    console.log("Connected to MongoDB");
    storeExam("10");
    storeExam("11");
    // readdirSync("./storage/source").forEach((path) => {
    //     storeExam(path);
    // });
});
