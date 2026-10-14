const ENTITY_TYPES = new Set(["product", "offer", "place", "service"]);
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_",
  "source"
]);

export function normalizeIdentityText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("und");
}

export function normalizeGtin(value) {
  const digits = String(value ?? "").replace(/[\s-]/g, "");
  if (!GTIN_LENGTHS.has(digits.length) || !/^\d+$/.test(digits)) {
    throw new TypeError("GTIN must contain 8, 12, 13, or 14 digits");
  }

  const payload = digits.slice(0, -1);
  const expectedCheckDigit = Number(digits.at(-1));
  let sum = 0;

  for (let index = payload.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += Number(payload[index]) * (position % 2 === 0 ? 3 : 1);
  }

  const actualCheckDigit = (10 - (sum % 10)) % 10;
  if (actualCheckDigit !== expectedCheckDigit) {
    throw new TypeError("GTIN check digit is invalid");
  }

  return digits.padStart(14, "0");
}

export function canonicalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.username = "";
  url.password = "";

  for (const name of [...url.searchParams.keys()]) {
    if (name.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(name.toLowerCase())) {
      url.searchParams.delete(name);
    }
  }

  url.searchParams.sort();
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function createEntityId(entity) {
  if (!entity || typeof entity !== "object" || !ENTITY_TYPES.has(entity.type)) {
    throw new TypeError("entity type must be product, offer, place, or service");
  }

  switch (entity.type) {
    case "product":
      return createProductId(entity);
    case "offer":
      return createOfferId(entity);
    case "place":
      return createPlaceId(entity);
    case "service":
      return createServiceId(entity);
  }
}

export function validateEntityId(value, expectedType) {
  if (typeof value !== "string") {
    return false;
  }

  const [namespace, type, strategy, ...parts] = value.split(":");
  if (namespace !== "verity" || !ENTITY_TYPES.has(type) || parts.length === 0) {
    return false;
  }
  if (expectedType !== undefined && type !== expectedType) {
    return false;
  }

  const expectedPartCounts = {
    product: { gtin: new Set([1]), model: new Set([2, 3]) },
    offer: { sku: new Set([2]), url: new Set([1]) },
    place: { address: new Set([4, 5]), geo: new Set([3]) },
    service: { provider: new Set([3]) }
  };

  const validCounts = expectedPartCounts[type][strategy];
  if (!validCounts?.has(parts.length) || parts.some((part) => part.length === 0)) {
    return false;
  }

  if (type === "product" && strategy === "gtin") {
    try {
      return normalizeGtin(parts[0]) === parts[0];
    } catch {
      return false;
    }
  }

  return true;
}

function createProductId(entity) {
  if (entity.gtin !== undefined) {
    return `verity:product:gtin:${normalizeGtin(entity.gtin)}`;
  }

  const brand = requiredComponent(entity.brand, "product brand");
  const model = requiredComponent(entity.model, "product model");
  const variant = optionalComponent(entity.variant);
  return joinId("verity", "product", "model", brand, model, variant);
}

function createOfferId(entity) {
  if (entity.sellerId !== undefined && entity.sku !== undefined) {
    return joinId(
      "verity",
      "offer",
      "sku",
      requiredComponent(entity.sellerId, "sellerId"),
      requiredComponent(entity.sku, "offer SKU")
    );
  }
  if (entity.url !== undefined) {
    return joinId("verity", "offer", "url", canonicalizeUrl(entity.url));
  }

  throw new TypeError("offer requires sellerId and sku, or a URL");
}

function createPlaceId(entity) {
  if (entity.address) {
    const address = entity.address;
    return joinId(
      "verity",
      "place",
      "address",
      requiredComponent(address.countryCode, "country code"),
      requiredComponent(address.locality, "locality"),
      requiredComponent(address.street, "street"),
      requiredComponent(entity.name, "place name"),
      optionalComponent(address.postalCode)
    );
  }
  if (Number.isFinite(entity.latitude) && Number.isFinite(entity.longitude)) {
    validateCoordinates(entity.latitude, entity.longitude);
    return joinId(
      "verity",
      "place",
      "geo",
      entity.latitude.toFixed(5),
      entity.longitude.toFixed(5),
      requiredComponent(entity.name, "place name")
    );
  }

  throw new TypeError("place requires an address or coordinates");
}

function createServiceId(entity) {
  return joinId(
    "verity",
    "service",
    "provider",
    requiredComponent(entity.provider, "service provider"),
    requiredComponent(entity.category, "service category"),
    requiredComponent(entity.region, "service region")
  );
}

function requiredComponent(value, label) {
  const normalized = normalizeIdentityText(value);
  if (!normalized) {
    throw new TypeError(`${label} is required`);
  }
  return normalized;
}

function optionalComponent(value) {
  return normalizeIdentityText(value) || undefined;
}

function joinId(...components) {
  return components
    .filter((component) => component !== undefined)
    .map((component) => encodeURIComponent(component))
    .join(":");
}

function validateCoordinates(latitude, longitude) {
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new RangeError("coordinates are outside the valid range");
  }
}
