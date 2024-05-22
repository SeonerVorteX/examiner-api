import { APIErrors, ErrorPayload, MultipleErrorPayload } from "../../types/errorTypes";
import { APIError } from "../../errors/APIError";
import { Response } from "express";

export class ErrorManager {
    private errors: APIError<any, any, any>[] = [];
    private res: Response;

    constructor(res: Response) {
        this.res = res;
    }

    public addError<T extends keyof APIErrors, U extends keyof APIErrors[T], V extends keyof APIErrors[T][U]>(err: APIError<T, U, V>, options?: { [key: string]: string }) {
        if (options) {
            Object.keys(options).forEach(key => {
                err.message = err.message.replaceAll(`%${key}%`, options[key]);
            });
        }
        
        this.errors.push(err);
        return this;
    }

    public getErrors(): APIError<any, any, any>[] {
        return this.errors;
    }

    public hasErrors(): boolean {
        return this.errors.length > 0;
    }

    public clearErrors(): this {
        this.errors = [];
        return this;
    }

    public handleError<T extends keyof APIErrors, U extends keyof APIErrors[T], V extends keyof APIErrors[T][U]>(err: APIError<T, U, V>, options?: { [key: string]: string }) {
        let { code, status, message, field } = err;

        if(options) {
            Object.keys(options).forEach(key => {
                message = message.replaceAll(`%${key}%`, options[key])
            });
        }
        
        let payload: ErrorPayload = { code, message };
        return this.res.status(status).json({ errors: { [field]: payload } });
    }

    public handleErrors() {
        const errors = this.getErrors();
        if (errors.length > 0) {
            let payload: MultipleErrorPayload = { errors: {} };


            errors.forEach(err => {
                const { code, field, message } = err;
                let length = errors.filter(error => error.field === field).length;

                if (length > 1) {
                    if (!payload.errors[field]) {
                        payload.errors[field] = [];
                    }

                    (payload.errors[field] as ErrorPayload[]).push({ code, message });
                } else {
                    payload.errors[field] = { code, message };
                }

            });

            return this.res.status(400).json(payload), this.clearErrors();
        }
    }
}