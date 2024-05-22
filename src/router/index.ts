import { Router } from "express";
import exams from "./exams";
import user from "./user";
import me from "./me";
const router = Router();

export default (): Router => {
    router.use("/exams", exams());
    router.use("/auth", user());
    router.use("/@me", me());
    return router;
};
