import { ExamModel } from "../models";
import ExamManager from "../helpers/managers/ExamManager";
import { ActiveExam } from "../helpers/structures/Exam";
import logger from "./logger";

export const loadCache = async (manager: ExamManager): Promise<void> => {
    const exams = await ExamModel.find({ isActive: true });
    manager.cache.clear();
    for (const exam of exams) {
        new ActiveExam(exam.toJSON(), manager);
    }

    logger.info(`Loaded ${manager.cache.size} exams.`);
};

const manager = new ExamManager([], false);

export default manager;
