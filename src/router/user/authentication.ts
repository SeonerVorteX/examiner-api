import { Router } from "express";
import { login, logout } from "../../controllers/user/authentication";

export const authentication = (router: Router) => {
    router.post("/login", login);
    router.get("/logout", logout);
};
