import { get } from "lodash";
import { Request, Response } from "express";
import { findOrCreateUser, getUserById } from "../../models/user";
import { APIError } from "../../errors/APIError";
import { ErrorManager } from "../../helpers/managers/ErrorManager";
import { generateTokens } from "../../helpers/security/jwt";
import { RequestIdentity } from "../../types/types";
import { getEpochTime, scrapeUserInformation } from "../../utils";
import { authLog } from "../../utils/webhook";
import logger from "../../utils/logger";
import { MessageEmbed } from "discord.js";
import { Types } from "mongoose";

export const login = async (req: Request, res: Response) => {
    try {
        const errorHandler = new ErrorManager(res);
        if (get(req, "identity.user")) {
            return errorHandler.handleError(new APIError("system", "authentication", "ALREADY_AUTHENTICATED"));
        }

        const { username, password } = req.body as { username: string; password: string };

        if (!username) {
            errorHandler.addError(new APIError("system", "authentication", "MISSING_USERNAME"));
        }

        if (!password) {
            errorHandler.addError(new APIError("system", "authentication", "MISSING_PASSWORD"));
        }

        if (errorHandler.hasErrors()) return errorHandler.handleErrors();

        const unecData = await scrapeUserInformation(username.trim(), password);

        if (!unecData) {
            return errorHandler.handleError(new APIError("system", "authentication", "AUTHENTICATION_FAILED"));
        }

        const { email, fullname, group, groupName } = unecData;

        // Find or create user
        const user = await findOrCreateUser(email, { fullname, group, groupName });

        const { accessToken } = await generateTokens({
            ...user,
            _id: new Types.ObjectId(user._id.toString()),
        });
        user.authentication.accessToken = accessToken;

        res.status(200)
            .json({
                user: {
                    _id: user._id,
                    email: user.email,
                    fullname: user.fullname,
                    group: user.group,
                    groupName: user.groupName,
                    accessToken: user.authentication.accessToken
                }
            })
            .end();

        await user.save();

        const embed = new MessageEmbed().setColor("RANDOM").addFields([
            { name: "User", value: `*${user.fullname}*`, inline: true },
            { name: "Email", value: `*${user.email}*`, inline: true },
            { name: "Group", value: `*${user.groupName} (\`${user.group}\`)*`, inline: true },

            { name: "IP Address", value: `||**${req.ip}**||`, inline: true },
            { name: "User Agent", value: `*${req.headers["user-agent"]}*`, inline: true },
            { name: "Date", value: getEpochTime(Date.now()), inline: true }
        ]);

        authLog.send({
            username: "User Login",
            embeds: [embed]
        });
    } catch (error) {
        console.log(error);
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while logging user in");
        logger.error(`${error.name}: ${error.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const errorHandler = new ErrorManager(res);
        const identity = get(req, "identity") as RequestIdentity;

        if (!identity) {
            return errorHandler.handleError(new APIError("system", "authentication", "NOT_AUTHENTICATED"));
        }

        const user = await getUserById(identity.user._id.toString()).select("+authentication.password");
        user.authentication.accessToken = null;

        res.status(200).json({ status: 200, message: "Logged out successfully" }).end();

        await user.save();

        const embed = new MessageEmbed().setColor("RANDOM").addFields([
            { name: "User", value: `*${user.fullname}*`, inline: true },
            { name: "Email", value: `*${user.email}*`, inline: true },
            { name: "Group", value: `*${user.groupName} (\`${user.group}\`)*`, inline: true },

            { name: "IP Address", value: `||**${req.ip}**||`, inline: true },
            { name: "User Agent", value: `*${req.headers["user-agent"]}*`, inline: true },
            { name: "Date", value: getEpochTime(Date.now()), inline: true }
        ]);

        authLog.send({
            username: "User Logout",
            embeds: [embed]
        });
    } catch (error) {
        console.error(error);
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while logging user out");
        logger.error(`${error.name}: ${error.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};
