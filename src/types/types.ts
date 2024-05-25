import { ObjectId } from "mongoose";
import { Logger } from "winston";

export interface RequestIdentity {
    user: UserType;
}

export interface UserType {
    _id: ObjectId;
    email: string;
    group: string;
    groupName: string;
    fullname: string;
    authentication?: AuthenticationType;
    createdDate?: number;
    updatedDate?: number;
}

export interface ExamType {
    id: string;
    title: string;
    description: string;
}

export interface AuthenticationType {
    accessToken: string;
}

export interface APILogger extends Logger {
    database?: (message: string) => void;
    request?: (message: string) => void;
}

// Exams
export interface StartExamPayload {
    questionCount: number;
    showAnswer?: boolean;
    startPoint?: number;
    endPoint?: number;
    selectQuestionsYourself?: boolean;
    selectedQuestions?: number[];
}
export interface ExamDetails {
    examId: number;
    title: string;
    settings: ExamSettings;
    questions: ExamQuestion[];
}

export interface ExamSettings {
    questionCount: number;
    showAnswer?: boolean;
    selectQuestionsYourself?: boolean;
    startPoint?: number;
    endPoint?: number;
}

export interface ExamResults {
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    score: number;
    scorePercent: number;
    answers: { question: ExamQuestion; index: number }[];
}

export interface ExamQuestion {
    row: number;
}
