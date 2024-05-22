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
import { isAuthenticated, isEligible } from "../../middlewares";

const router = Router();

export default (): Router => {
    router.get("/all", isAuthenticated, getAllExams);
    router.get("/:examId", isAuthenticated, getExam);
    router.post("/:examId/start", isAuthenticated, isEligible, startExam);
    router.get("/active/:id", isAuthenticated, isEligible, getActiveExam);
    router.get("/active/:id/questions", isAuthenticated, isEligible, getAllQuestionsForActiveExam);
    router.get("/active/:id/questions/:row", isAuthenticated, isEligible, getQuestionForActiveExam);
    router.post("/active/:id/answers", isAuthenticated, isEligible, setAnswersForActiveExam);
    router.get("/active/:id/finish", isAuthenticated, isEligible, finishActiveExam);
    router.get("/finished/:id", isAuthenticated, isEligible, getFinishedExam);
    router.get("/finished/:id/questions", isAuthenticated, isEligible, getAllQuestionsForFinishedExam);
    router.get("/finished/:id/questions/:row", isAuthenticated, isEligible, getQuestionForFinishedExam);
    return router;
};
