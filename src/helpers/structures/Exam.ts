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

    public async getQuestions() {
        let examQuestions = this.details.questions;
        let questions: QuestionType[] = [];
        let images: ImageType[] = [];

        for (let examQuestion of examQuestions) {
            const { question, images: questionImages } = await this.getQuestion(examQuestion.row);
            questions.push(question);
            images = images.concat(questionImages);
        }

        return { questions, images };
    }

    public async getQuestion(row: number, getAnswer?: boolean) {
        let { questions: QuestionModel, images: ImageModel } = getModelById(this.details.examId);

        let images: ImageType[] = [];
        let question = (await QuestionModel.findOne({ row })).toJSON();
        let showAnswer = this.details.settings.showAnswer;

        if (question.question.isImage) {
            let image = await ImageModel.findOne({ id: question.question.value });
            images.push(image.toJSON());
        }

        if (!showAnswer && !getAnswer) delete question.answer;
        for (let option of question.options) {
            if (!showAnswer && !getAnswer) delete option.isCorrect;
            if (option.isImage) {
                let image = await ImageModel.findOne({ id: option.value });
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

        for (let answer of answers) {
            let { question, index } = answer;
            let { options } = (await this.getQuestion(question, true)).question;

            if (options[index].isCorrect) {
                correctCount++;
            } else {
                wrongCount++;
            }
        }

        emptyCount = this.details.questions.filter((q) => answers.every((a) => a.question !== q.row)).length;
        score = correctCount * pointPerCorrect;
        scorePercent = Math.round((correctCount / this.details.settings.questionCount) * 100);

        return {
            correctCount,
            wrongCount,
            emptyCount,
            score,
            scorePercent,
            answers: answers.map((a) => ({ question: { row: a.question }, index: a.index })),
        };
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
            const { correctCount, wrongCount, emptyCount, score, scorePercent, answers } =
                await this.calculateResults();

            await this.setResults({ correctCount, wrongCount, emptyCount, score, scorePercent, answers });
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
            _cache: cache ? this._cache : undefined,
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
        let examQuestions = this.details.questions;
        let questions: QuestionType[] = [];
        let images: ImageType[] = [];

        for (let examQuestion of examQuestions) {
            const { question, images: questionImages } = await this.getQuestion(examQuestion.row);
            questions.push(question);
            images = images.concat(questionImages);
        }

        return { questions, images };
    }

    public async getQuestion(row: number, getAnswer?: boolean) {
        let { questions: QuestionModel, images: ImageModel } = getModelById(this.details.examId);

        let images: ImageType[] = [];
        let question = (await QuestionModel.findOne({ row })).toJSON();
        let showAnswer = this.details.settings.showAnswer;

        if (question.question.isImage) {
            let image = await ImageModel.findOne({ id: question.question.value });
            images.push(image.toJSON());
        }

        if (this.isActive && !showAnswer && !getAnswer) delete question.answer;
        for (let option of question.options) {
            if (this.isActive && !showAnswer && !getAnswer) delete option.isCorrect;
            if (option.isImage) {
                let image = await ImageModel.findOne({ id: option.value });
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
            results: this.results,
        };
    }
}
