import { WebhookClient } from "discord.js";
import { config } from "dotenv";
config();

const authLog = new WebhookClient({ url: process.env.AUTH_WEBHOOK_URL! });
const examLog = new WebhookClient({ url: process.env.EXAM_WEBHOOK_URL! });

export { authLog, examLog };
