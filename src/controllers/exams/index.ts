import { get } from "lodash";
import { MessageEmbed } from "discord.js";
import { Request, Response } from "express";
import { APIError } from "../../errors/APIError";
import { ErrorManager } from "../../helpers/managers/ErrorManager";
import { exams } from "../../configurations/configs.json";
import { ExamInterface, ExamModel, UserType, getModel, getModelById } from "../../models";
import { ExamDetails, StartExamPayload } from "types/types";
import { generateRandomQuestionRows, getEpochTime } from "../../utils";
import logger from "../../utils/logger";
import { ActiveExam, FinishedExam } from "../../helpers/structures/Exam";
import manager from "../../utils/manager";
import { examLog } from "../../utils/webhook";

export const getAllExams = async (req: Request, res: Response) => {
    try {
        const user = get(req, "identity.user") as UserType;
        const group = user.group;
        const data = exams.filter((exam) => exam.eligibleGroups.includes(group));

        return res.status(200).json(data).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting all exams");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(new APIError("system", "server", "INTERNAL_SERVER_ERROR"));
    }
};

export const getExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const examId = parseInt(get(req, "params.examId"));
        const user = get(req, "identity.user") as UserType;
        const group = user.group;
        const exam = exams.filter((exam) => exam.eligibleGroups.includes(group)).find((exam) => exam.id == examId) as {
            id: number;
            title: string;
            shortName: string;
        };

        if (!exam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        const { questions } = getModel(exam.shortName);
        const questionCount = await questions.countDocuments();

        return res
            .status(200)
            .json({ questionCount, ...exam })
            .end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting an exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const startExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const body = get(req, "body") as StartExamPayload;
        const user = get(req, "identity.user") as UserType;
        const group = user.group;
        const examId = parseInt(get(req, "params.examId"));

        if (!examId || isNaN(examId) || examId < 1) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM_ID"));
        }
        const exam = exams.filter((exam) => exam.eligibleGroups.includes(group)).find((exam) => exam.id == examId) as {
            id: number;
            title: string;
            shortName: string;
        };

        if (!exam) {
            errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        const { questions, images } = getModelById(exam.id);
        const examQuestionCount = await questions.countDocuments();

        const examData = {} as ExamInterface;
        const examDetails = {} as ExamDetails;

        if (!body) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM"));
        }

        const { questionCount, showAnswer, startPoint, endPoint, selectQuestionsYourself, selectedQuestions } = body;

        if (!questionCount) {
            errorManager.addError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), { p: "questionCount" });
        }

        if (selectQuestionsYourself) {
            if (!selectedQuestions) {
                errorManager.addError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), {
                    p: "selectedQuestions",
                });
            }

            if (selectedQuestions.length !== questionCount) {
                errorManager.addError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                    m: "question count does not match selected questions",
                });
            }

            if (selectedQuestions.some((q) => q < 1 || q > examQuestionCount)) {
                errorManager.addError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                    m: `selected questions must be between 1 and ${examQuestionCount}`,
                });
            }

            if (selectedQuestions.some((q) => typeof q !== "number")) {
                errorManager.addError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                    m: "selected questions must be numbers",
                });
            }
        } else {
            if (!startPoint) {
                errorManager.addError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), { p: "startPoint" });
            }

            if (!endPoint) {
                errorManager.addError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), { p: "endPoint" });
            }
        }

        if (errorManager.hasErrors()) {
            return errorManager.handleErrors();
        }

        examDetails.examId = exam.id;
        examDetails.title = exam.title;
        examDetails.settings = {
            questionCount,
            showAnswer,
            startPoint,
            endPoint,
            selectQuestionsYourself,
        };

        if (selectQuestionsYourself) {
            examDetails.settings.startPoint = null;
            examDetails.settings.endPoint = null;
            examDetails.questions = selectedQuestions.map((q) => ({ row: q }));
        } else {
            const randomQuestionRows = generateRandomQuestionRows(questionCount, startPoint, endPoint)
                .sort((a, b) => a - b)
                .map((q) => ({
                    row: q,
                }));

            examDetails.questions = randomQuestionRows;
        }

        const id = (await ExamModel.countDocuments()) + 1;

        examData.id = id;
        examData.user = user._id;
        examData.details = examDetails;
        examData.isActive = true;
        examData.startDate = Date.now();
        examData.finishDate = Date.now() + 4800000;

        const data = await new ExamModel(examData).save();
        manager.add(new ActiveExam(data, manager));

        let resData = data.toJSON();
        delete resData._cache;

        res.status(200).json(resData).end();

        const embed = new MessageEmbed().setColor("RANDOM").addFields([
            { name: "User", value: `*${user.fullname} (\`${user.group}\`)*`, inline: true },
            { name: "Exam", value: `*${resData.details.title} (#${examData.id})*`, inline: true },
            {
                name: "Question Count",
                value: `*${resData.details.settings.questionCount} (${resData.details.settings.startPoint}-${resData.details.settings.endPoint})*`,
                inline: true,
            },

            { name: "Start Date", value: getEpochTime(resData.startDate), inline: true },
            { name: "End Date", value: getEpochTime(resData.finishDate), inline: true },
            { name: "Show Answer", value: `*${resData.details.settings.showAnswer ? "Yes" : "No"}*`, inline: true },
        ]);

        examLog.send({
            username: "Exam Started",
            embeds: [embed],
        });
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while starting an exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const getActiveExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        const activeExam = manager.get(id);

        if (!activeExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        if (activeExam.userId.toString() !== user._id.toString()) {
            return errorManager.handleError(new APIError("system", "authorization", "NOT_AUTHORIZED"));
        }

        const userAnswers = activeExam.getCachedAnswers();
        activeExam.details.questions.sort((a, b) => a.row - b.row);
        userAnswers.sort((a, b) => a.question - b.question);

        return res
            .status(200)
            .json({ userAnswers, ...activeExam.toJSON() })
            .end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting active exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const getAllQuestionsForActiveExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        const activeExam = manager.get(id);

        if (!activeExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        if (activeExam.userId.toString() !== user._id.toString()) {
            return errorManager.handleError(new APIError("system", "authorization", "NOT_AUTHORIZED"));
        }

        const { questions, images } = await activeExam.getQuestions();

        questions.sort((a, b) => a.row - b.row);
        return res.status(200).json({ questions, images }).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting all questions for active exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const getQuestionForActiveExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));
        const row = parseInt(get(req, "params.row"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        if (!row) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), {
                p: "question row",
            });
        }

        const activeExam = manager.get(id);

        if (!activeExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        if (activeExam.userId.toString() !== user._id.toString()) {
            return errorManager.handleError(new APIError("system", "authorization", "NOT_AUTHORIZED"));
        }

        const rows = activeExam.details.questions.map((q) => q.row);

        if (!rows.includes(row)) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                m: `question ${row} not found in exam questions`,
            });
        }

        const { question, images } = await activeExam.getQuestion(row);

        return res.status(200).json({ question, images }).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting a question for active exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const setAnswersForActiveExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));
        const answers = get(req, "body.answers") as { question: number; index: number }[];

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        const activeExam = manager.get(id);

        if (!activeExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        if (activeExam.userId.toString() !== user._id.toString()) {
            return errorManager.handleError(new APIError("system", "authorization", "NOT_AUTHORIZED"));
        }

        if (!answers) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), { p: "answers" });
        }

        if (!Array.isArray(answers)) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                m: "answers must be an array",
            });
        }

        const rows = activeExam.details.questions.map((q) => q.row);

        if (answers.some((a) => !rows.includes(a.question))) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                m: "answers contain invalid question rows",
            });
        }

        if (answers.some((a) => a.index < 0 || a.index > 5)) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                m: "answers contain invalid indexes",
            });
        }

        await activeExam.setCachedAnswers(answers);

        return res.status(200).json(answers).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while setting answers for active exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const finishActiveExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        const activeExam = manager.get(id);

        if (!activeExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        if (activeExam.userId.toString() !== user._id.toString()) {
            return errorManager.handleError(new APIError("system", "authorization", "NOT_AUTHORIZED"));
        }

        const { correctCount, wrongCount, emptyCount, score, scorePercent, answers } =
            await activeExam.calculateResults();

        await activeExam.setResults({ correctCount, wrongCount, emptyCount, score, scorePercent, answers });

        res.status(200).json({ correctCount, wrongCount, emptyCount, score, scorePercent }).end();

        const embed = new MessageEmbed().setColor("RANDOM").addFields([
            { name: "User", value: `*${user.fullname} (\`${user.group}\`)*`, inline: true },
            { name: "Exam", value: `*${activeExam.details.title} (#${id})*`, inline: true },
            {
                name: "Score",
                value: `*${correctCount}/${activeExam.details.settings.questionCount} (${scorePercent}%)*`,
                inline: true,
            },
            { name: "Start Date", value: getEpochTime(activeExam.startDate), inline: true },
            { name: "End Date", value: getEpochTime(Date.now()), inline: true },
            { name: "Show Answer", value: `*${activeExam.details.settings.showAnswer ? "Yes" : "No"}*`, inline: true },
        ]);

        examLog.send({
            username: "Exam Finished",
            embeds: [embed],
        });
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while finishing active exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const getFinishedExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        const finishedExam = await ExamModel.findOne({ id, user: user._id, isActive: false });

        if (!finishedExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        finishedExam.details.questions.sort((a, b) => a.row - b.row);
        let resData = finishedExam.toJSON();
        delete resData._cache;

        return res.status(200).json(resData).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting a finished exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const getAllQuestionsForFinishedExam = async (req: Request, res: Response) => {
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        const finishedExam = await ExamModel.findOne({ id, user: user._id, isActive: false });

        if (!finishedExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        const exam = new FinishedExam(finishedExam);

        const { questions, images } = await exam.getQuestions();

        questions.sort((a, b) => a.row - b.row);
        return res.status(200).json({ questions, images, userAnswers: exam.results.answers }).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting questions for finished exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};

export const getQuestionForFinishedExam = async (req: Request, res: Response) => {
    // with user answer
    try {
        const errorManager = new ErrorManager(res);
        const identity = get(req, "identity") as { user: UserType };
        const user = identity.user;
        const id = parseInt(get(req, "params.id"));
        const row = parseInt(get(req, "params.row"));

        if (!id) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_ID"));
        }

        if (!row) {
            return errorManager.handleError(new APIError("exam", "payload", "MISSING_EXAM_DETAILS"), {
                p: "question row",
            });
        }

        const finishedExam = await ExamModel.findOne({ id, user: user._id, isActive: false });

        if (!finishedExam) {
            return errorManager.handleError(new APIError("exam", "payload", "EXAM_NOT_FOUND"));
        }

        const exam = new FinishedExam(finishedExam);
        const rows = exam.details.questions.map((q) => q.row);

        if (!rows.includes(row)) {
            return errorManager.handleError(new APIError("exam", "payload", "INVALID_EXAM_DETAILS"), {
                m: `question ${row} not found in exam questions`,
            });
        }

        const { question, images } = await exam.getQuestion(row);
        const userAnswer = exam.results.answers.find((a) => a.question.row == row);

        return res.status(200).json({ question, images, userAnswer }).end();
    } catch (err) {
        const errorHandler = new ErrorManager(res);
        logger.error("An error occured while getting a question for finished exam");
        logger.error(`${err.name}: ${err.message}`);
        errorHandler.handleError(err);
    }
};
