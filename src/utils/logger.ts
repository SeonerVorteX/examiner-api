import { APILogger } from "types/types";
import { createLogger, addColors, format, transports } from "winston";
import { config } from "dotenv";
const { combine, timestamp, printf, colorize, padLevels, prettyPrint, errors } = format;
config();

const options = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        database: 3,
        console: 4,
    },
    colors: {
        error: "red",
        warn: "yellow",
        info: "blue",
        database: "green",
        console: "blue",
    },
};

addColors(options.colors);

const path = process.env.NODE_ENV === "production" ? "./logs" : "./src/helpers/logs";

const logger: APILogger = createLogger({
    levels: options.levels,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: "DD-MM-YYYY (HH:mm)" }),
        prettyPrint(),
        colorize(),
        padLevels({ levels: options.levels }),
        printf((msg) => `[${msg.timestamp}] ${msg.level}: ${msg.message.trim()}`)
    ),
    transports: [
        new transports.Console({ level: "console" }),
        new transports.File({
            filename: `${path}/info/${new Date(Date.now()).toLocaleDateString().replaceAll("/", "-")}-info.log`,
            level: "info",
        }),
        new transports.File({
            filename: `${path}/warn/${new Date(Date.now()).toLocaleDateString().replaceAll("/", "-")}-warn.log`,
            level: "warn",
        }),
        new transports.File({
            filename: `${path}/error/${new Date(Date.now()).toLocaleDateString().replaceAll("/", "-")}-error.log`,
            level: "error",
        }),
        new transports.File({
            filename: `${path}/database/${new Date(Date.now()).toLocaleDateString().replaceAll("/", "-")}-database.log`,
            level: "database",
        }),
        new transports.File({
            filename: `${path}/console/${new Date(Date.now()).toLocaleDateString().replaceAll("/", "-")}-console.log`,
            level: "console",
        }),
    ],
    exitOnError: false,
});

export default logger;
