import { ObjectId, Schema, model } from "mongoose";
import { exams } from "../configurations/configs.json";

export interface QuestionType {
    row: number;
    question: {
        imageId: number;
        content: string;
    };
    options: Option[];
}

interface Option {
    isCorrect: boolean;
    imageId: number;
    content: string;
}

export interface ImageType {
    id: number;
    data: Buffer;
}

export interface ExamType {
    title: string;
    shortName: string;
    questions: QuestionType[];
    images: ImageType[];
}

export const QuestionSchema = new Schema<QuestionType>({
    row: { type: Number, required: true, unique: true },
    question: {
        imageId: { type: Number },
        content: { type: Schema.Types.Mixed, required: true }
    },
    options: [
        {
            isCorrect: { type: Boolean, required: true },
            imageId: { type: Number },
            content: { type: Schema.Types.Mixed, required: true }
        }
    ]
});

export const ImageSchema = new Schema<ImageType>({
    id: { type: Number, required: true, unique: true },
    data: Buffer
});

export const getModelById = (id: number) => {
    const exam = exams.find((exam) => exam.id == id);
    const questions = model(`${exam.id}_questions`, QuestionSchema);
    const images = model(`${exam.id}_images`, ImageSchema);
    return { questions, images };
};
