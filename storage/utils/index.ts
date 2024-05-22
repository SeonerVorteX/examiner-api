import { existsSync, readFileSync, readdirSync } from "fs";
import { getModel, QuestionType } from "../../src/models/storage";

export const storeExam = async (path: string) => {
    const configs = readFileSync(`./storage/source/${path}/configs.json`, { encoding: "utf-8" });

    const { shortName } = JSON.parse(configs) as { title: string; shortName: string };

    const { questions: QuestionModel, images: ImageModel } = getModel(shortName);

    // Images
    if (existsSync(`./storage/source/${path}/images`))
        readdirSync(`./storage/source/${path}/images`).forEach((file) => {
            const index = parseInt(file.split(".")[0]);
            const data = readFileSync(`./storage/source/${path}/images/${file}`);
            new ImageModel({ id: index, data }).save();
        });

    // Questions
    const data = readFileSync(`./storage/source/${path}/data.json`, { encoding: "utf-8" });
    const questions = JSON.parse(data) as QuestionType[];

    questions.forEach((question) => {
        question.answer.isCorrect = true;
        question.options.forEach((option) => (option.isCorrect = false));
        question.options.find((option) => option.value == question.answer.value)!.isCorrect = true;
        new QuestionModel(question).save();
    });

    console.log(`Stored exam ${shortName}`);
};
