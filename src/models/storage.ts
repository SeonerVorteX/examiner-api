import { ObjectId, Schema, model } from "mongoose";
import { exams } from "../configurations/configs.json";

export interface QuestionType {
    row: number;
    question: {
        isImage: boolean;
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
    data: Buffer,
    // question: Schema.Types.ObjectId,
});

// const ExamSchema = new Schema<ExamType>({
//     title: String,
//     shortName: String,
//     questions: [QuestionSchema],
//     images: [ImageSchema],
// });

export const getModel = (name: string) => {
    const questions = model(`${name}_questions`, QuestionSchema);
    const images = model(`${name}_images`, ImageSchema);
    return { questions, images };
};

export const getModelById = (id: number) => {
    const name = exams.find((exam) => exam.id == id)?.shortName;
    if (!name) return null;
    return getModel(name);
};

// export const ExamModel = model("exams", ExamSchema);
