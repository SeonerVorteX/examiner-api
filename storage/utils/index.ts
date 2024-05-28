import { existsSync, readFileSync, readdirSync } from "fs";
import { getModelById, QuestionType } from "../../src/models/storage";

export const storeExam = async (path: string) => {
    const configs = readFileSync(`./storage/source/${path}/configs.json`, { encoding: "utf-8" });

    const { id, shortName } = JSON.parse(configs) as { id: number; title: string; shortName: string };

    const { questions: QuestionModel, images: ImageModel } = getModelById(id);

    // Images
    if (existsSync(`./storage/source/${path}/images`)) {
        let files = readdirSync(`./storage/source/${path}/images`);
        let notBoth = files.filter((file) => !file.startsWith("both"));
        let count = notBoth.length;

        readdirSync(`./storage/source/${path}/images`).forEach(async (file) => {
            let index = file.split(".")[0];
            if (index.startsWith("both")) {
                count++;
                let _index = count;
                const data = readFileSync(`./storage/source/${path}/images/${file}`);
                await new ImageModel({ id: _index, type: 2, bothId: parseInt(index.split("_")[1]), data }).save();
                await wait(200);
            } else {
                let _index = parseInt(index);
                const data = readFileSync(`./storage/source/${path}/images/${file}`);
                await new ImageModel({ id: _index, data }).save();
                await wait(200);
            }
        });
    }

    // Questions
    const data = readFileSync(`./storage/source/${path}/data.json`, { encoding: "utf-8" });
    const questions = JSON.parse(data) as QuestionType[];

    questions.forEach(async (question) => {
        question.answer.isCorrect = true;
        question.options.forEach((option) => (option.isCorrect = false));
        question.options.find((option) => option.value == question.answer.value)!.isCorrect = true;
        await new QuestionModel(question).save();
        await wait(200);
    });

    console.log(`Stored exam ${shortName} with ${questions.length}`);
};

function wait(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
