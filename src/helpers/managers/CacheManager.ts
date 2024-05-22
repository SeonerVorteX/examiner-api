import { Collection } from "@discordjs/collection";
import logger from "../../utils/logger";

class CacheManager<T> {
    private readonly type: new (...args: any[]) => T;
    private _cache: Collection<string, T>;

    constructor(type: new (...args: any[]) => T) {
        this.type = type;
        this._cache = new Collection<string, T>();
    }

    get cache(): Collection<string, T> {
        return this._cache;
    }

    _add(data: T & { id?: string | number }, id?: string | number): void {
        if (!data.id && !id) {
            logger.error("[CACHE-MANAGER] Invalid value provided");
            return;
        }
        this.cache.set(String(id ? id : data.id), data);
    }

    _remove(id: string): void {
        this.cache.delete(id);
    }

    _reset(collection: Collection<string, T> = new Collection()): void {
        this._cache = collection;
    }
}

export default CacheManager;
