import CacheManager from "./CacheManager";
import { ActiveExam } from "../structures/Exam";
import { ExamInterface } from "../../models/exam";

class ExamManager extends CacheManager<ActiveExam> {
    constructor(values: ExamInterface[] | ActiveExam[], ready: boolean) {
        super(ActiveExam);

        for (const value of values) {
            if (ready && value instanceof ActiveExam) {
                this._add(value, value.id.toString());
            } else if (!ready && !(value instanceof ActiveExam)) {
                const data = new ActiveExam(value, this);
                this._add(data, data.id.toString());
            }
        }
    }

    add(exam: ActiveExam): void {
        const id: string = exam.id.toString();
        const already = this.cache.get(id);
        if (already) return;
        this._add(exam, id);
    }

    update(id: number, exam: ActiveExam, set: boolean): void {
        const cached = this.cache.get(id.toString());
        if (!cached) {
            if (set) this.add(exam);
        } else {
            this.cache.set(id.toString(), exam);
        }
    }

    remove(id: number): void {
        this._remove(id.toString());
    }

    get(id: number): ActiveExam {
        return this.cache.get(id.toString());
    }
}

export default ExamManager;
