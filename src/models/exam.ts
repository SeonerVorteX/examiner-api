import _ from "lodash";
import { Types } from "mongoose";
import { Document, model } from "mongoose";
import { Schema } from "mongoose";
import { ExamDetails, ExamResults } from "types/types";

export interface ExamInterface extends Document {
    id: number;
    startDate: number;
    finishDate: number;
    finishedAt?: number;
    isActive: boolean;
    user: Types.ObjectId;
    details: ExamDetails;
    results?: ExamResults;
    _cache: {
        _answers: { question: number; index: number }[];
    };
}

const ExamSchema = new Schema<ExamInterface>({
    id: { type: Number, required: true, unique: true, increment: true },
    startDate: { type: Number, default: Date.now(), required: true },
    finishDate: { type: Number, required: true },
    finishedAt: { type: Number },
    isActive: { type: Boolean, default: true, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    details: {
        examId: { type: Number, required: true },
        title: { type: String, required: true },
        settings: {
            questionCount: { type: Number, required: true },
            showAnswer: { type: Boolean, default: false },
            startPoint: {
                type: Number,
                required: function () {
                    return !this.details.settings.selectQuestionsYourself;
                },
            },
            endPoint: {
                type: Number,
                required: function () {
                    return !this.details.settings.selectQuestionsYourself;
                },
            },
            selectQuestionsYourself: { type: Boolean, default: false },
        },
        questions: [
            {
                row: { type: Number, required: true },
            },
        ],
    },
    results: {
        type: {
            correctCount: { type: Number, required: true },
            wrongCount: { type: Number, required: true },
            emptyCount: { type: Number, required: true },
            score: { type: Number, required: true },
            scorePercent: { type: Number, required: true },
            answers: {
                type: [
                    {
                        index: { type: Number, required: true },
                        question: {
                            row: { type: Number, required: true },
                        },
                    },
                ],
                required: true,
            },
        },
        required: false,
    },
    _cache: {
        _answers: {
            type: [
                {
                    index: { type: Number, required: true },
                    question: { type: Number, required: true },
                },
            ],
            default: [],
        },
    },
});

export const ExamModel = model<ExamInterface>("Exam", ExamSchema);
