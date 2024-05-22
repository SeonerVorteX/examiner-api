import { config } from "dotenv";
import { ErrorManager } from "../helpers/managers/ErrorManager";
import { APIError } from "../errors/APIError";
import { Request, Response, NextFunction } from "express";
import puppeteer from "puppeteer";
import logger from "./logger";

config();

export const base = (path?: string): string => {
    return path ? process.env.BASE_URL + path : process.env.BASE_URL;
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
): Promise<{ fullname: string; group: string; email: string } | null> {
    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        args: [
            "--proxy-server='direct://'",
            "--proxy-bypass-list=*",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-first-run",
            "--no-sandbox",
            "--no-zygote",
            "--single-process",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--enable-features=NetworkService",
            "--disable-features=site_per_process",
        ],
        executablePath:
            process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.goto("http://kabinet.unec.edu.az");
    await page.waitForSelector("#LoginForm_username");
    await page.type("#LoginForm_username", username);
    await page.type("#LoginForm_password", password);
    await page.keyboard.press("Enter");
    await page.waitForNavigation();

    if (page.url() !== "http://kabinet.unec.edu.az/az/noteandannounce") {
        await browser.close();
        return null;
    }
    const pathToInformation = ".main-container > .page-container > .page-content > .right-panel > div";
    const pathToFullname =
        ".main-container > .page-container > .page-content > .right-panel > div > .right-text:nth-child(2) > .right-text-2";
    const pathToGroup =
        ".main-container > .page-container > .page-content > .right-panel > div > .right-text:nth-child(4) > .right-text-2";

    await page.waitForSelector(pathToInformation);
    const fullnameText = await page.evaluate((pathToFullname) => {
        return document.querySelector(pathToFullname)?.textContent;
    }, pathToFullname);

    const groupText = await page.evaluate((pathToGroup) => {
        return document.querySelector(pathToGroup)?.textContent;
    }, pathToGroup);
    const pathToFormInformation = ".main-container > .page-container > .page-content > .page-body > div";
    const pathToFormInput =
        ".main-container > .page-container > .page-content > .page-body > div > .loginbox > form > .loginbox-textbox:nth-child(9) > .form-control";

    await page.goto("http://kabinet.unec.edu.az/az/cabinet");
    await page.waitForSelector(pathToFormInformation);

    const email = await page.evaluate((pathToFormInput) => {
        let input = document.querySelector(pathToFormInput) as HTMLInputElement;
        return input.value;
    }, pathToFormInput);

    await browser.close();

    return { fullname: fullnameText, group: groupText?.split("_")[3], email };
}

export function generateRandomQuestionRows(questionCount: number, startPoint: number, endPoint: number): number[] {
    let rows: number[] = [];
    if (questionCount > endPoint - startPoint + 1) {
        questionCount = endPoint - startPoint + 1;
    }
    for (let i = 0; i < questionCount; i++) {
        console.log(i);
        let row = Math.floor(Math.random() * (endPoint - startPoint + 1) + startPoint);
        if (rows.includes(row)) {
            i--;
            continue;
        }
        rows.push(row);
    }
    return rows;
}
