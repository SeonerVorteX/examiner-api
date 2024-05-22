export interface APIError {
    code?: number;
    status: number;
    message: string;
}

export interface ErrorPayload {
    code: number;
    message: string;
}

export type ErrorFields<T extends keyof APIErrors, U extends keyof APIErrors[T]> = {
    [key in U]: ErrorPayload | ErrorPayload[];
};

export interface MultipleErrorPayload {
    errors: ErrorFields<any, any>;
}

// System
export type ServerErrors = {
    INTERNAL_SERVER_ERROR: APIError;
};

export type SystemAuthenticationErrors = {
    NOT_AUTHENTICATED: APIError;
    AUTHENTICATION_FAILED: APIError;
    ALREADY_AUTHENTICATED: APIError;
    MISSING_USERNAME: APIError;
    MISSING_PASSWORD: APIError;
};

export type SystemAuthorizationErrors = {
    MISSING_AUTHORIZATION: APIError;
    NOT_AUTHORIZED: APIError;
    AUTHORIZATION_FAILED: APIError;
    ELIGIBILITY_FAILED: APIError;
};

export type SystemPayloadErrors = {
    INVALID_PAYLOAD: APIError;
    MISSING_PROPERTY: APIError;
    INVALID_PROPERTY: APIError;
    INCORRECT_PROPERTY: APIError;
};

export type SystemErrors = {
    server: ServerErrors;
    authentication: SystemAuthenticationErrors;
    authorization: SystemAuthorizationErrors;
    payload: SystemPayloadErrors;
};

// Exam Errors
export type ExamPayloadErrors = {
    MISSING_EXAM_ID: APIError;
    INVALID_EXAM_ID: APIError;
    INVALID_EXAM: APIError;
    INVALID_EXAM_DETAILS: APIError;
    MISSING_EXAM_DETAILS: APIError;
    EXAM_NOT_FOUND: APIError;
};

export type ExamErrors = {
    payload: ExamPayloadErrors;
};

export type APIErrors = {
    system: SystemErrors;
    exam: ExamErrors;
};
