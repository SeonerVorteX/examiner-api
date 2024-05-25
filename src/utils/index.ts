import { config } from "dotenv";
import { Request, Response, NextFunction } from "express";
import logger from "./logger";
import Axios from "axios";
import FormData from "form-data";
import cheerio from "cheerio";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
config();

export const base = (path?: string): string => {
    return path ? process.env.UNEC_BASE_URL + path : process.env.UNEC_BASE_URL;
};

export const host = (path?: string): string => {
    return path ? process.env.HOST_URL + path : process.env.HOST_URL;
};

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
    logger.info(`Request (${req.method}) => "${req.path}"`);
    next();
};

export async function scrapeUserInformation(
    username: string,
    password: string
): Promise<{ fullname: string; email: string; group: string; groupName: string } | null> {
    const jar = new CookieJar();
    const axios = wrapper(Axios.create({ jar, baseURL: base() }));

    let formData = new FormData();
    formData.append("LoginForm[username]", username, { contentType: "text/plain" });
    formData.append("LoginForm[password]", password, { contentType: "text/plain" });

    const response = await axios.post("/", formData, {
        headers: {
            ...formData.getHeaders(),
        },
        withCredentials: true,
    });

    const $ = cheerio.load(response.data);

    const fullname = $(".right-text-2").eq(0).text() || null;
    const group = $(".right-text-2").eq(2).text() || null;

    const formResponse = await axios.get(`/az/cabinet`);

    const $$ = cheerio.load(formResponse.data);

    const email = ($$(".form-control").eq(8).val() as string) || null;

    if (!fullname || !group || !email) {
        return null;
    } else {
        return { fullname, email, group: group.split("_")[3], groupName: capitalize(group.split("_")[4]) };
    }
}

export function generateRandomQuestionRows(questionCount: number, startPoint: number, endPoint: number): number[] {
    let rows: number[] = [];
    if (questionCount > endPoint - startPoint + 1) {
        questionCount = endPoint - startPoint + 1;
    }
    for (let i = 0; i < questionCount; i++) {
        let row = Math.floor(Math.random() * (endPoint - startPoint + 1) + startPoint);
        if (rows.includes(row)) {
            i--;
            continue;
        }
        rows.push(row);
    }
    return rows;
}

export function capitalize(text: string): string {
    let str: string[] = text.split(" ");
    let result: string[] = [];

    for (let i = 0; i < str.length; i++) {
        result.push(str[i].charAt(0).toUpperCase() + str[i].slice(1));
    }

    return result.join(" ");
}

export function getEpochTime(time: number, { type } = { type: 1 }) {
    if (typeof time !== "number" && isNaN(time)) throw new TypeError("Invalid Argumanet: Time");

    if (type == 2) return `<t:${time.toString().slice(0, -3)}:R>`;
    else return `<t:${time.toString().slice(0, -3)}>`;
}
