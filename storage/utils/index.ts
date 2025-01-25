import { existsSync, readFileSync, readdirSync } from "fs";
import { getModelById, QuestionType } from "../../src/models/storage";

export const storeExam = async (path: string) => {
    const configs = readFileSync(`./storage/source/${path}/configs.json`, { encoding: "utf-8" });

    const { id, shortName } = JSON.parse(configs) as { id: number; title: string; shortName: string };

    const { questions: QuestionModel, images: ImageModel } = getModelById(id);

    // Images
    if (existsSync(`./storage/source/${path}/images`)) {
        readdirSync(`./storage/source/${path}/images`).forEach(async (file) => {
            const index = parseInt(file.split(".")[0]);
            const data = readFileSync(`./storage/source/${path}/images/${file}`);
            await new ImageModel({ id: index, data }).save();
            await wait(200);
        });
    }

    // Questions
    const data = readFileSync(`./storage/source/${path}/data.json`, { encoding: "utf-8" });
    const questions = JSON.parse(data).questions as QuestionType[];

    questions.forEach(async (question) => {
        await new QuestionModel(question).save();
        await wait(200);
    });

    console.log(`Stored exam ${shortName} with ${questions.length}`);
};

function wait(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
