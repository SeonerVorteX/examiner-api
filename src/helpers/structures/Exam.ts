import ExamManager from "helpers/managers/ExamManager";
import { UserModel, ExamModel, ExamInterface, ImageType, QuestionType, getModelById } from "../../models";
import { UserType } from "models/user";
import { ObjectId } from "mongoose";
import { ExamDetails, ExamResults } from "types/types";
import logger from "../../utils/logger";

export class ActiveExam {
    public id: number;
    public startDate: number;
    public finishDate: number;
    public isActive: boolean;
    public userId: ObjectId;
    public details: ExamDetails;
    public results?: ExamResults;
    public user?: UserType | null;
    private manager: ExamManager;
    private _cache: { _answers: { question: number; index: number }[] };
    private _timeout: NodeJS.Timeout;

    constructor(data: ExamInterface, manager: ExamManager) {
        if (!data || !data.id || !data.startDate || !data.finishDate || !data.isActive || !data.user || !data.details)
            throw new Error("Invalid data for ActiveExam");

        this.id = data.id;
        this.startDate = data.startDate;
        this.finishDate = data.finishDate;
        this.isActive = data.isActive;
        this.userId = data.user;
        this.details = data.details;
        this._cache = data._cache;
        if (data.results) this.results = data.results;
        this.manager = manager;
        this._timeout = this.setExamTimeout();

        this.manager.add(this);

        (async () => {
            this.user = (await UserModel.findById(this.userId)) as UserType;
        })();
    }

    public async getQuestions(shorted?: boolean) {
        let { questions: QuestionModel, images: ImageModel } = getModelById(this.details.examId);
        let examQuestions = this.details.questions;

        if (shorted) {
            let questions = await QuestionModel.aggregate([
                {
                    $match: {
                        row: { $in: examQuestions.map((q) => q.row) }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        row: 1,
                        options: {
                            $map: {
                                input: "$options",
                                as: "option",
                                in: {
                                    isCorrect: "$$option.isCorrect"
                                }
                            }
                        }
                    }
                }
            ]);

            return { questions };
        } else {
            let imgValues: number[] = [];
            let questions = await QuestionModel.find({ row: { $in: examQuestions.map((q) => q.row) } });
            let showAnswer = this.details.settings.showAnswer;
            let questionMap: typeof questions = [];

            questions.forEach((question) => {
                questionMap[question.row] = question;
            });

            let sortedQuestions = examQuestions.map((q) => questionMap[q.row]);

            for (let question of questions) {
                if (!showAnswer)
                    question.options = question.options.map((option) => {
                        delete option.isCorrect;
                        return option;
                    });

                if (question.question.imageId) imgValues.push(question.question.imageId);
                for (let option of question.options) {
                    if (option.imageId) imgValues.push(option.imageId);
                }
            }

            let images = await ImageModel.find({ id: { $in: imgValues } });

            return { questions: sortedQuestions.map((q) => q.toJSON()), images: images.map((i) => i.toJSON()) };
        }
    }

    public async getQuestion(row: number, getAnswer?: boolean) {
        let { questions: QuestionModel, images: ImageModel } = getModelById(this.details.examId);

        let images: ImageType[] = [];
        let question = (await QuestionModel.findOne({ row })).toJSON();
        let showAnswer = this.details.settings.showAnswer;

        if (question.question.imageId) {
            let image = await ImageModel.findOne({ id: question.question.imageId });
            images.push(image.toJSON());
        }

        if (!showAnswer && !getAnswer)
            question.options = question.options.map((option) => {
                delete option.isCorrect;
                return option;
            });
        for (let option of question.options) {
            if (option.imageId) {
                let image = await ImageModel.findOne({ id: option.imageId });
                images.push(image.toJSON());
            }
        }

        return { question, images };
    }

    public save(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { results } = this.toJSON();
            const finishedAt = Date.now();
            const isActive = false;
            ExamModel.findOneAndUpdate(
                { id: this.id },
                { $set: { results, finishedAt, isActive }, $unset: { _cache: "" } },
                { upsert: true }
            )
                .then(() => resolve())
                .catch((err) => reject(err));
        });
    }

    public async setResults(results: ExamResults): Promise<void> {
        if (!this.isActive && this.results) logger.error("Results already set for this exam.");
        else {
            this.results = results;
            this.isActive = false;
            this._cache = undefined;
            await this.save();
            this.clearExamTimeout();
            this.manager.remove(this.id);
        }
    }

    public async calculateResults() {
        let answers = this._cache._answers;
        let correctCount = 0;
        let wrongCount = 0;
        let emptyCount = 0;
        let score = 0;
        let scorePercent = 0;
        let pointPerCorrect = 2;

        let { questions } = await this.getQuestions(true);

        for (let answer of answers) {
            let { question, index } = answer;
            let { options } = questions.find((q) => q.row === question);

            if (options[index].isCorrect) {
                correctCount++;
            } else {
                wrongCount++;
            }
        }

        emptyCount = this.details.questions.filter((q) => answers.every((a) => a.question !== q.row)).length;
        score = correctCount * pointPerCorrect;
        scorePercent = Math.round((correctCount / this.details.settings.questionCount) * 100);

        await this.setResults({
            correctCount,
            wrongCount,
            emptyCount,
            score,
            scorePercent,
            answers: answers.map((a) => ({ question: { row: a.question }, index: a.index }))
        });
    }

    public async setCachedAnswers(answers: { question: number; index: number }[]) {
        this._cache._answers = answers;
        await this._saveCache();
    }

    public getCachedAnswers() {
        return this._cache._answers;
    }

    private async _save<T extends keyof ActiveExam, U extends ActiveExam[T]>(key?: T, value?: U) {
        if (key) {
            if (value) {
                let data = {} as Record<T, U>;
                data[key] = value;
                await ExamModel.findOneAndUpdate({ id: this.id }, { $set: data });
            }
        } else {
            let data = this.toJSON();
            await ExamModel.findOneAndUpdate({ id: this.id }, { $set: data });
        }
    }

    private async _saveCache() {
        await ExamModel.findOneAndUpdate({ id: this.id }, { $set: { _cache: this._cache } });
    }

    private setExamTimeout(): NodeJS.Timeout {
        return setTimeout(async () => {
            await this.calculateResults();
            logger.info(`Exam #${this.id} finished automatically.`);
        }, this.finishDate + 10000 - Date.now()); // Extra 10 seconds for the client to send the results
    }

    public clearExamTimeout() {
        clearTimeout(this._timeout);
    }

    public toJSON(cache: boolean = false) {
        return {
            id: this.id,
            startDate: this.startDate,
            finishDate: this.finishDate,
            isActive: this.isActive,
            user: this.userId,
            details: this.details,
            results: this.results,
            _cache: cache ? this._cache : undefined
        };
    }
}

export class FinishedExam {
    public id: number;
    public startDate: number;
    public finishDate: number;
    public isActive: boolean;
    public userId: ObjectId;
    public details: ExamDetails;
    public results: ExamResults;
    public user?: UserType | null;

    constructor(data: ExamInterface) {
        if (
            !data ||
            !data.id ||
            !data.startDate ||
            !data.finishDate ||
            data.isActive ||
            !data.user ||
            !data.details ||
            !data.results
        )
            throw new Error("Invalid data for FinishedExam");

        this.id = data.id;
        this.startDate = data.startDate;
        this.finishDate = data.finishDate;
        this.isActive = data.isActive;
        this.userId = data.user;
        this.details = data.details;

        if (data.results) this.results = data.results;

        (async () => {
            this.user = (await UserModel.findById(this.userId)) as UserType;
        })();
    }

    public async getQuestions() {
        let { questions: QuestionModel, images: ImageModel } = getModelById(this.details.examId);
        let examQuestions = this.details.questions;
        let imgValues: number[] = [];
        let questions = await QuestionModel.find({ row: { $in: examQuestions.map((q) => q.row) } });

        for (let question of questions) {
            if (question.question.imageId) imgValues.push(question.question.imageId);
            for (let option of question.options) {
                if (option.imageId) imgValues.push(option.imageId);
            }
        }

        let images = await ImageModel.find({ id: { $in: imgValues } });

        return { questions: questions.map((q) => q.toJSON()), images: images.map((i) => i.toJSON()) };
    }

    public async getQuestion(row: number) {
        let { questions: QuestionModel, images: ImageModel } = getModelById(this.details.examId);

        let images: ImageType[] = [];
        let question = (await QuestionModel.findOne({ row })).toJSON();

        if (question.question.imageId) {
            let image = await ImageModel.findOne({ id: question.question.imageId });
            images.push(image.toJSON());
        }

        for (let option of question.options) {
            if (option.imageId) {
                let image = await ImageModel.findOne({ id: option.imageId });
                images.push(image.toJSON());
            }
        }

        return { question, images };
    }

    public toJSON() {
        return {
            id: this.id,
            startDate: this.startDate,
            finishDate: this.finishDate,
            isActive: this.isActive,
            user: this.userId,
            details: this.details,
            results: this.results
        };
    }
}
