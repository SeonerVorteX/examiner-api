import { APIErrors, APIError as ErrorType} from "types/errorTypes";
import errorCodes from '../configurations/errorCodes.json'

export class APIError<T extends keyof APIErrors, U extends keyof APIErrors[T], V extends keyof APIErrors[T][U]> extends Error {
    public readonly code: number;
    public readonly status: number
    public readonly field: string;
    public readonly section: string;
    public readonly errorType: string;

    constructor(section: T, field: U, errorType: V) {
        const { code, status, message } = errorCodes[section][field][errorType] as ErrorType;

        super(message);
        this.name = "APIError";
        this.code = code;
        this.status = status;
        this.field = field.toString();
        this.section = section;
        this.errorType = errorType.toString();

    }
}