import { Router } from "express";
import { getUserInformation, verifyToken, getUserExams } from "../../controllers/me";
import { isAuthenticated } from "../../middlewares";

const router = Router();

export default (): Router => {
    router.get("/", isAuthenticated, getUserInformation);
    router.get("/verifyToken", isAuthenticated, verifyToken);
    router.get("/exams", isAuthenticated, getUserExams);
    return router;
};
