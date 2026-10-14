import { createEntityId, validateEntityId } from "../../core/src/entity.mjs";
import {
  validateSignedReviewEvent,
  verifyReviewEventSignature
} from "../../core/src/signed-review.mjs";

const MAX_BODY_BYTES = 1_000_000;

export function createApiHandler(store, options = {}) {
  if (!store) {
    throw new TypeError("store is required");
  }
  const allowedOrigins = new Set(options.allowedOrigins ?? []);

  return async function handle(request, response) {
    try {
      const origin = request.headers.origin;
      if (origin && isAllowedOrigin(origin, allowedOrigins)) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
      }
      if (request.method === "OPTIONS") {
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.writeHead(origin && !isAllowedOrigin(origin, allowedOrigins) ? 403 : 204);
        response.end();
        return;
      }

      const url = new URL(request.url, "http://localhost");
      const segments = url.pathname.split("/").filter(Boolean);
      if (request.method === "GET" && url.pathname === "/health") {
        send(response, 200, { status: "ok" });
        return;
      }
      if (segments[0] !== "v1") {
        send(response, 404, { error: "NOT_FOUND", message: "route not found" });
        return;
      }

      if (segments[1] === "products" || segments[1] === "places") {
        await handleEntities(request, response, store, segments);
        return;
      }
      if (segments[1] === "resolve" && request.method === "POST" && segments.length === 2) {
        await handleResolve(request, response, store);
        return;
      }
      if (segments[1] === "reviews") {
        await handleReviews(request, response, store, url, segments);
        return;
      }
      send(response, 404, { error: "NOT_FOUND", message: "route not found" });
    } catch (error) {
      const status = error.statusCode ?? (error.code === "REVIEW_CONFLICT" ? 409 : 500);
      send(response, status, {
        error: error.code ?? (status === 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST"),
        message: status === 500 ? "request could not be completed" : error.message
      });
      if (status === 500) {
        console.error(error);
      }
    }
  };
}

function isAllowedOrigin(origin, allowedOrigins) {
  return allowedOrigins.has(origin);
}

async function handleEntities(request, response, store, segments) {
  const type = segments[1] === "products" ? "product" : "place";
  if (request.method === "GET" && segments.length === 2) {
    send(response, 200, { items: await store.listEntities(type) });
    return;
  }
  if (request.method === "GET" && segments.length === 3) {
    const record = await store.getEntity(type, decodeURIComponent(segments[2]));
    send(
      response,
      record ? 200 : 404,
      record ?? { error: "NOT_FOUND", message: `${type} not found` }
    );
    return;
  }
  if (request.method === "POST" && segments.length === 2) {
    const record = validateEntityRecord(await readJson(request), type);
    send(response, 201, await store.putEntity(type, record));
    return;
  }
  send(response, 405, { error: "METHOD_NOT_ALLOWED", message: "method not allowed" });
}

async function handleResolve(request, response, store) {
  const body = await readJson(request);
  if (typeof body.reference === "string" && !body.candidate) {
    const record = await store.resolve(body.reference);
    send(response, record ? 200 : 404, record ?? {
      error: "NOT_FOUND",
      message: "entity reference not found"
    });
    return;
  }

  const candidate = body.candidate;
  if (!candidate || !["product", "place"].includes(candidate.entity?.type)) {
    throw invalid("candidate must contain a product or place entity");
  }
  const record = validateEntityRecord(candidate, candidate.entity.type);
  const canonical = await store.putEntity(candidate.entity.type, record);
  send(response, 200, { entity: canonical, resolution: "canonical-id" });
}

async function handleReviews(request, response, store, url, segments) {
  if (request.method === "GET" && segments.length === 2) {
    send(response, 200, { items: await store.listReviews(url.searchParams.get("entityId")) });
    return;
  }
  if (request.method === "POST" && segments.length === 2) {
    const event = await readJson(request);
    const errors = validateSignedReviewEvent(event);
    if (errors.length > 0) {
      throw invalid(`signed review is invalid: ${errors.join("; ")}`);
    }
    const verification = await verifyReviewEventSignature(event);
    if (!verification.valid) {
      throw invalid(`signed review failed verification: ${verification.errors.join("; ")}`);
    }
    if (event.review.status !== "published") {
      throw invalid("only published reviews can be submitted");
    }
    send(response, 201, await store.putReview(event));
    return;
  }
  send(response, 405, { error: "METHOD_NOT_ALLOWED", message: "method not allowed" });
}

function validateEntityRecord(value, type) {
  if (!value || typeof value !== "object" || value.entity?.type !== type) {
    throw invalid(`record must contain a ${type} entity`);
  }
  let expectedId;
  try {
    expectedId = createEntityId(value.entity);
  } catch (error) {
    throw invalid(`entity metadata is invalid: ${error.message}`);
  }
  if (value.id !== expectedId || !validateEntityId(value.id, type)) {
    throw invalid("record id does not match its canonical entity");
  }
  const references = Array.isArray(value.references)
    ? value.references.filter((reference) => typeof reference === "string")
    : [];
  return { id: value.id, entity: value.entity, references };
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = invalid("request body exceeds 1 MB");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw invalid("request body must be valid JSON");
  }
}

function invalid(message) {
  const error = new TypeError(message);
  error.statusCode = 400;
  error.code = "INVALID_REQUEST";
  return error;
}

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
