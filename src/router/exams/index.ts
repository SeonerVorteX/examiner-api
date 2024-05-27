import { Router } from "express";
import {
    getActiveExam,
    getAllExams,
    getAllQuestionsForActiveExam,
    getExam,
    getQuestionForActiveExam,
    setAnswersForActiveExam,
    finishActiveExam,
    getFinishedExam,
    getAllQuestionsForFinishedExam,
    getQuestionForFinishedExam,
    startExam,
} from "../../controllers/exams";
import { isAuthenticated } from "../../middlewares";

const router = Router();

export default (): Router => {
    router.get("/all", isAuthenticated, getAllExams);
    router.get("/:examId", isAuthenticated, getExam);
    router.post("/:examId/start", isAuthenticated, startExam);
    router.get("/active/:id", isAuthenticated, getActiveExam);
    router.get("/active/:id/questions", isAuthenticated, getAllQuestionsForActiveExam);
    router.get("/active/:id/questions/:row", isAuthenticated, getQuestionForActiveExam);
    router.post("/active/:id/answers", isAuthenticated, setAnswersForActiveExam);
    router.get("/active/:id/finish", isAuthenticated, finishActiveExam);
    router.get("/finished/:id", isAuthenticated, getFinishedExam);
    router.get("/finished/:id/questions", isAuthenticated, getAllQuestionsForFinishedExam);
    router.get("/finished/:id/questions/:row", isAuthenticated, getQuestionForFinishedExam);
    return router;
};
