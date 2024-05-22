import { Router } from "express";
import { getUserInformation, verifyToken } from "../../controllers/me";
import { isAuthenticated } from "../../middlewares";

const router = Router();

export default (): Router => {
    router.get("/", isAuthenticated, getUserInformation);
    router.get("/verifyToken", isAuthenticated, verifyToken);
    return router;
};
