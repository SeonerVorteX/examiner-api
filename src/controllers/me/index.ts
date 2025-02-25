import { get } from "lodash";
import { Request, Response } from "express";
import { APIError } from "../../errors/APIError";
import { RequestIdentity } from "../../types/types";
import { UserModel } from "../../models/user";
import { ErrorManager } from "../../helpers/managers/ErrorManager";
import logger from "../../utils/logger";
import { ExamModel } from "../../models";

export const getUserInformation = async (req: Request, res: Response) => {
    try {
        const identity: RequestIdentity = get(req, "identity");
        const userData = await UserModel.findById(identity.user._id.toString()).select("-__v");

        return res
            .status(200)
            .json({
                user: userData
            })
            .end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting user information");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};

export const verifyToken = async (req: Request, res: Response) => {
    try {
        const authorization = req.headers["authorization"];
        const accessToken = authorization?.split(" ")[1];
        const identity: RequestIdentity = get(req, "identity");
        const user = await UserModel.findById(identity.user._id.toString()).select("+authentication.accessToken");
        if (accessToken === user.authentication.accessToken) {
            return res.status(200).end();
        } else {
            return res.status(401).end();
        }
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while verifying token");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};

export const getUserExams = async (req: Request, res: Response) => {
    try {
        const identity: RequestIdentity = get(req, "identity");
        const exams = await ExamModel.find({
            user: identity.user._id
        }).select("-_cache -__v -details.questions -results.answers");

        return res
            .status(200)
            .json({
                active: exams
                    .map((exam) => exam.toJSON())
                    .filter((exam) => exam.isActive)
                    .sort((a, b) => b.id - a.id),
                finished: exams
                    .map((exam) => exam.toJSON())
                    .filter((exam) => !exam.isActive)
                    .sort((a, b) => b.id - a.id)
            })
            .end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting user exams");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};
