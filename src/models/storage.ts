import { ObjectId, Schema, model } from "mongoose";
import { exams } from "../../configs.json";

export interface QuestionType {
    row: number;
    question: {
        isImage: boolean;
        isBoth: boolean;
        imgValue: number;
        value: string | number | ObjectId;
    };
    answer: Option;
    options: Option[];
}

interface Option {
    isCorrect: boolean;
    isImage: boolean;
    value: string | number | ObjectId;
}

export interface ImageType {
    id: number;
    type: number;
    bothId?: number;
    data: Buffer;
}

export interface ExamType {
    title: string;
    shortName: string;
    questions: QuestionType[];
    images: ImageType[];
}

export const QuestionSchema = new Schema<QuestionType>({
    row: { type: Number, required: true },
    question: {
        isImage: { type: Boolean, required: true },
        isBoth: { type: Boolean, default: false },
        imgValue: {
            type: Number,
            required: function () {
                return this.question.isBoth;
            },
        },
        value: { type: Schema.Types.Mixed, required: true },
    },
    answer: {
        isCorrect: { type: Boolean, required: true },
        isImage: { type: Boolean, required: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    options: [
        {
            isCorrect: { type: Boolean, required: true },
            isImage: { type: Boolean, required: true },
            value: { type: Schema.Types.Mixed, required: true },
        },
    ],
});

export const ImageSchema = new Schema<ImageType>({
    id: Number,
    type: { type: Number, default: 1 },
    bothId: { type: Number },
    data: Buffer,
});

export const getModelById = (id: number) => {
    const exam = exams.find((exam) => exam.id == id);
    const questions = model(`${exam.id}_questions`, QuestionSchema);
    const images = model(`${exam.id}_images`, ImageSchema);
    return { questions, images };
};
