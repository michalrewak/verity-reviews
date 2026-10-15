import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const EMPTY_STATE = Object.freeze({
  products: {},
  places: {},
  reviews: {},
  aliases: {}
});

export class JsonStore {
  #filePath;
  #state;
  #writeQueue = Promise.resolve();

  constructor(filePath) {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new TypeError("store file path is required");
    }
    this.#filePath = filePath;
  }

  async listEntities(type) {
    const state = await this.#load();
    return Object.values(collection(state, type));
  }

  async getEntity(type, id) {
    const state = await this.#load();
    return collection(state, type)[id] ?? null;
  }

  async putEntity(type, record) {
    return this.#mutate((state) => {
      const entities = collection(state, type);
      const existing = entities[record.id];
      entities[record.id] = {
        ...existing,
        ...record,
        references: [...new Set([...(existing?.references ?? []), ...(record.references ?? [])])]
      };
      for (const reference of entities[record.id].references) {
        state.aliases[reference] = record.id;
      }
      return entities[record.id];
    });
  }

  async resolve(reference) {
    const state = await this.#load();
    const id = state.aliases[reference];
    if (!id) {
      return null;
    }
    return state.products[id] ?? state.places[id] ?? null;
  }

  async listReviews(entityId) {
    const state = await this.#load();
    return Object.values(state.reviews).filter(
      (event) => !entityId || event.review.entityId === entityId
    );
  }

  async putReview(event) {
    return this.#mutate((state) => {
      const key = `${event.review.id}:${event.review.revision}`;
      const existing = state.reviews[key];
      if (existing && existing.contentId !== event.contentId) {
        const error = new Error("a conflicting review revision already exists");
        error.code = "REVIEW_CONFLICT";
        throw error;
      }
      state.reviews[key] = event;
      return event;
    });
  }

  async #load() {
    if (this.#state) {
      return this.#state;
    }
    try {
      const parsed = JSON.parse(await readFile(this.#filePath, "utf8"));
      this.#state = normalizeState(parsed);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      this.#state = structuredClone(EMPTY_STATE);
    }
    return this.#state;
  }

  async #mutate(operation) {
    const run = this.#writeQueue.then(async () => {
      const state = structuredClone(await this.#load());
      const result = operation(state);
      await mkdir(dirname(this.#filePath), { recursive: true });
      const temporaryPath = `${this.#filePath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
      await rename(temporaryPath, this.#filePath);
      this.#state = state;
      return result;
    });
    this.#writeQueue = run.catch(() => {});
    return run;
  }
}

function collection(state, type) {
  if (type === "product") {
    return state.products;
  }
  if (type === "place") {
    return state.places;
  }
  throw new TypeError("entity type must be product or place");
}

function normalizeState(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("stored API state must be an object");
  }
  return {
    products: objectOrEmpty(value.products),
    places: objectOrEmpty(value.places),
    reviews: objectOrEmpty(value.reviews),
    aliases: objectOrEmpty(value.aliases)
  };
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
