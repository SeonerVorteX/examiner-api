import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { get, merge } from "lodash";
import { getUserByAccessToken } from "../models/user";
import { ErrorManager } from "../helpers/managers/ErrorManager";
import { APIError } from "../errors/APIError";
import { verifyAccessToken } from "../helpers/security/jwt";
import { RequestIdentity } from "types/types";

export const checkUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authorization = req.headers["authorization"];
        const accessToken = authorization?.split(" ")[1];

        if (!accessToken) {
            return next();
        }

        const verification = await verifyAccessToken(accessToken);

        if (verification) {
            const user = await getUserByAccessToken(accessToken);
            if (user) {
                merge(req, { identity: { user } });
            }
        }

        return next();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while checking user");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers["authorization"];
    const accessToken = authorization?.split(" ")[1];
    const errorHandler = new ErrorManager(res);

    if (!accessToken) {
        return errorHandler.handleError(new APIError("system", "authorization", "MISSING_AUTHORIZATION"));
    }
    const verification = await verifyAccessToken(accessToken);

    if (verification) {
        return next();
    } else {
        return errorHandler.handleError(new APIError("system", "authorization", "AUTHORIZATION_FAILED"));
    }
};

// export const isEligible = async (req: Request, res: Response, next: NextFunction) => {
//     const identity: RequestIdentity = get(req, "identity");
//     const errorHandler = new ErrorManager(res);

//     if (!identity.user) {
//         return errorHandler.handleError(new APIError("system", "authorization", "AUTHORIZATION_FAILED"));
//     }

//     const userGroup = identity.user.group;

//     if (!eligibleGroups.includes(userGroup)) {
//         return errorHandler.handleError(new APIError("system", "authorization", "ELIGIBILITY_FAILED"));
//     } else {
//         return next();
//     }
// };
