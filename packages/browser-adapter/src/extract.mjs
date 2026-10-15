import { canonicalizeUrl, createEntityId } from "../../core/src/entity.mjs";

const GTIN_PROPERTIES = ["gtin14", "gtin13", "gtin12", "gtin8", "gtin"];
const PLACE_TYPES = new Set([
  "Place",
  "LocalBusiness",
  "Store",
  "LodgingBusiness",
  "Hotel",
  "Hostel",
  "Motel",
  "Resort",
  "BedAndBreakfast",
  "Campground",
  "FoodEstablishment",
  "Restaurant",
  "Bakery",
  "BarOrPub",
  "Brewery",
  "CafeOrCoffeeShop",
  "Distillery",
  "FastFoodRestaurant",
  "IceCreamShop",
  "Winery",
  "ProfessionalService",
  "MedicalBusiness",
  "Dentist",
  "Hospital",
  "Pharmacy",
  "Physician",
  "VeterinaryCare",
  "AutomotiveBusiness",
  "HomeAndConstructionBusiness",
  "EntertainmentBusiness",
  "SportsActivityLocation",
  "ExerciseGym",
  "HealthClub",
  "GolfCourse",
  "StadiumOrArena",
  "MovieTheater",
  "PerformingArtsTheater",
  "Museum",
  "Library",
  "Park",
  "Zoo",
  "Aquarium",
  "TouristAttraction",
  "CivicStructure",
  "GovernmentBuilding",
  "PlaceOfWorship",
  "Church",
  "Airport",
  "TrainStation",
  "SubwayStation",
  "BusStation",
  "GasStation",
  "School",
  "CollegeOrUniversity"
]);

export function extractEntityCandidates(document, pageUrl) {
  if (!document?.querySelectorAll) {
    throw new TypeError("a DOM Document is required");
  }

  const resolvedPageUrl = canonicalizeUrl(new URL(pageUrl).toString());
  const canonicalUrl = extractCanonicalUrl(document, resolvedPageUrl);
  const diagnostics = [];
  const nodes = [
    ...extractJsonLdNodes(document, diagnostics),
    ...extractMicrodataNodes(document),
    ...extractRdfaNodes(document)
  ];
  const nodesById = new Map(
    nodes
      .filter((node) => typeof node["@id"] === "string")
      .map((node) => [node["@id"], node])
  );
  const candidates = [];

  for (const node of nodes) {
    const source = node.__veritySource ?? "json-ld";
    if (hasSchemaType(node, "Product") || hasSchemaType(node, "ProductGroup")) {
      candidates.push(...extractProductCandidates(node, canonicalUrl, diagnostics, nodesById, source));
    }
    if (hasPlaceType(node)) {
      const candidate = extractPlaceCandidate(node, canonicalUrl, diagnostics, source);
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  const isCollectionPage = nodes.some((node) =>
    schemaTypes(node).some((type) => ["CollectionPage", "ItemList", "SearchResultsPage"].includes(type))
  );
  if (isCollectionPage) {
    candidates.length = 0;
    diagnostics.push({
      code: "NON_ENTITY_PAGE",
      source: "json-ld",
      message: "structured metadata describes a collection page, not one reviewable entity"
    });
  } else if (candidates.length === 0) {
    const fallback = extractOpenGraphOffer(document, canonicalUrl, diagnostics);
    if (fallback) {
      candidates.push(fallback);
    }
  }

  return {
    pageUrl: resolvedPageUrl,
    canonicalUrl,
    candidates: deduplicateCandidates(candidates),
    diagnostics
  };
}

function extractCanonicalUrl(document, pageUrl) {
  const canonical = document.querySelector('link[rel~="canonical" i]')?.getAttribute("href");
  return canonical ? canonicalizeUrl(new URL(canonical, pageUrl).toString()) : pageUrl;
}

function extractJsonLdNodes(document, diagnostics) {
  const nodes = [];
  const scripts = document.querySelectorAll('script[type="application/ld+json" i]');

  for (const [index, script] of [...scripts].entries()) {
    const content = script.textContent?.trim();
    if (!content) {
      continue;
    }

    try {
      collectNodes(JSON.parse(content), nodes);
    } catch (error) {
      diagnostics.push({
        code: "INVALID_JSON_LD",
        source: `json-ld[${index}]`,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return nodes;
}

function extractMicrodataNodes(document) {
  return [...document.querySelectorAll("[itemscope][itemtype]")]
    .map((element) => {
      const types = schemaTypesFromUrls(element.getAttribute("itemtype"));
      return types.length > 0 ? extractDomNode(element, "microdata", types) : undefined;
    })
    .filter(Boolean);
}

function extractRdfaNodes(document) {
  return [...document.querySelectorAll("[typeof]")]
    .map((element) => {
      const types = schemaTypesFromRdfa(element.getAttribute("typeof"), element.getAttribute("vocab"));
      return types.length > 0 ? extractDomNode(element, "rdfa", types) : undefined;
    })
    .filter(Boolean);
}

function extractDomNode(root, format, types) {
  const scopeSelector = format === "microdata" ? "[itemscope]" : "[typeof]";
  const propertySelector = format === "microdata" ? "[itemprop]" : "[property]";
  const propertyAttribute = format === "microdata" ? "itemprop" : "property";
  const node = { "@type": types, __veritySource: format };

  for (const element of root.querySelectorAll(propertySelector)) {
    if (element.parentElement?.closest(scopeSelector) !== root) {
      continue;
    }

    const names = normalizePropertyNames(element.getAttribute(propertyAttribute));
    if (names.length === 0) {
      continue;
    }

    let value;
    if (format === "microdata" && element.hasAttribute("itemscope")) {
      const childTypes = schemaTypesFromUrls(element.getAttribute("itemtype"));
      value = childTypes.length > 0 ? extractDomNode(element, format, childTypes) : undefined;
    } else if (format === "rdfa" && element.hasAttribute("typeof")) {
      const childTypes = schemaTypesFromRdfa(
        element.getAttribute("typeof"),
        element.getAttribute("vocab") || root.getAttribute("vocab")
      );
      value = childTypes.length > 0 ? extractDomNode(element, format, childTypes) : undefined;
    } else {
      value = propertyValue(element, format);
    }

    if (value === undefined || value === "") {
      continue;
    }
    for (const name of names) {
      node[name] = appendValue(node[name], value);
    }
  }

  return node;
}

function schemaTypesFromUrls(value) {
  return String(value ?? "")
    .split(/\s+/)
    .map((type) => type.trim())
    .filter((type) => /(?:^|\/)schema\.org\/[^/]+\/?$/i.test(type))
    .map((type) => type.split("/").filter(Boolean).at(-1));
}

function schemaTypesFromRdfa(value, vocab) {
  const usesSchemaVocab = /(?:^|\/)schema\.org\/?$/i.test(String(vocab ?? ""));
  return String(value ?? "")
    .split(/\s+/)
    .map((type) => {
      if (/(?:^|\/)schema\.org\/[^/]+\/?$/i.test(type)) {
        return type.split("/").filter(Boolean).at(-1);
      }
      if (usesSchemaVocab && /^(?:schema:)?[A-Z][A-Za-z]+$/.test(type)) {
        return type.replace(/^schema:/i, "");
      }
      return undefined;
    })
    .filter(Boolean);
}

function normalizePropertyNames(value) {
  return String(value ?? "")
    .split(/\s+/)
    .map((name) => name.split(":").at(-1))
    .filter((name) => /^[A-Za-z][A-Za-z0-9]*$/.test(name));
}

function propertyValue(element, format) {
  const attributes = format === "microdata"
    ? ["content", "datetime", "href", "src", "data", "value"]
    : ["content", "datetime", "resource", "href", "src", "about"];
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute);
    if (value !== null) {
      return value.trim();
    }
  }
  return element.textContent?.trim();
}

function appendValue(current, value) {
  if (current === undefined) {
    return value;
  }
  return Array.isArray(current) ? [...current, value] : [current, value];
}

function collectNodes(value, nodes) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNodes(item, nodes);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value["@graph"])) {
    collectNodes(value["@graph"], nodes);
  }
  if (value["@type"]) {
    nodes.push(value);
  }
}

function extractProductCandidates(product, canonicalUrl, diagnostics, nodesById, source) {
  const candidates = [];
  const gtin = GTIN_PROPERTIES.map((property) => scalar(product[property])).find(Boolean);
  const brand = namedBrand(product.brand, nodesById);
  const variantModels = asArray(product.hasVariant)
    .map((variant) => scalar(variant?.mpn) || scalar(variant?.model))
    .filter(Boolean);
  const sharedVariantModel =
    variantModels.length > 0 && variantModels.every((model) => model === variantModels[0])
      ? variantModels[0]
      : undefined;
  const model =
    namedValue(product.model) ||
    scalar(product.mpn) ||
    sharedVariantModel ||
    scalar(product.productGroupID) ||
    scalar(product.name);
  const variant = [scalar(product.color), scalar(product.size)].filter(Boolean).join(" / ") || undefined;

  const productEntity = compactObject({
    type: "product",
    gtin,
    brand,
    model,
    variant,
    name: scalar(product.name)
  });
  let productCandidate = createCandidate(productEntity, `${source}:Product`, canonicalUrl, diagnostics);
  if (!productCandidate && gtin !== undefined) {
    // A malformed GTIN must not erase a product that brand and model already identify,
    // otherwise the page degrades to a seller-specific offer.
    productCandidate = createCandidate(
      compactObject({ type: "product", brand, model, variant, name: scalar(product.name) }),
      `${source}:Product`,
      canonicalUrl,
      diagnostics
    );
  }
  if (productCandidate) {
    candidates.push(productCandidate);
  }

  for (const offer of asArray(product.offers)) {
    if (!offer || typeof offer !== "object") {
      continue;
    }

    const seller = namedValue(offer.seller);
    const sellerUrl = objectValue(offer.seller)?.url;
    const sellerId = sellerUrl ? hostnameFromUrl(sellerUrl, canonicalUrl) : seller;
    const sku = scalar(offer.sku) || scalar(product.sku);
    const rawOfferUrl = scalar(offer.url);
    const offerUrl = rawOfferUrl
      ? canonicalizeUrl(new URL(rawOfferUrl, canonicalUrl).toString())
      : canonicalUrl;
    const offerEntity = compactObject({
      type: "offer",
      sellerId,
      sku,
      url: offerUrl,
      productId: productCandidate?.id,
      price: scalar(offer.price),
      priceCurrency: scalar(offer.priceCurrency)
    });
    const offerCandidate = createCandidate(
      offerEntity,
      `${source}:Product.offers`,
      canonicalUrl,
      diagnostics
    );
    if (offerCandidate) {
      candidates.push(offerCandidate);
    }
  }

  return candidates;
}

function extractPlaceCandidate(place, canonicalUrl, diagnostics, source) {
  const address = objectValue(place.address);
  const geo = objectValue(place.geo);
  const entity = compactObject({
    type: "place",
    name: scalar(place.name),
    address: address
      ? compactObject({
          countryCode: namedValue(address.addressCountry),
          locality: scalar(address.addressLocality),
          street: scalar(address.streetAddress),
          postalCode: scalar(address.postalCode)
        })
      : undefined,
    latitude: numberValue(geo?.latitude),
    longitude: numberValue(geo?.longitude),
    category: schemaTypes(place).find((type) => type !== "LocalBusiness" && type !== "Place")
  });

  return createCandidate(entity, `${source}:LocalBusiness`, canonicalUrl, diagnostics);
}

function extractOpenGraphOffer(document, canonicalUrl, diagnostics) {
  const type = metaContent(document, "og:type")?.toLowerCase();
  if (!type?.startsWith("product")) {
    return undefined;
  }

  const title = metaContent(document, "og:title");
  const siteName = metaContent(document, "og:site_name");
  if (!title || !siteName) {
    return undefined;
  }

  return createCandidate(
    { type: "offer", sellerId: siteName, url: canonicalUrl, name: title },
    "open-graph",
    canonicalUrl,
    diagnostics
  );
}

function createCandidate(entity, source, canonicalUrl, diagnostics) {
  try {
    return {
      id: createEntityId(entity),
      entity,
      source,
      references: [canonicalUrl]
    };
  } catch (error) {
    diagnostics.push({
      code: "INCOMPLETE_ENTITY",
      source,
      message: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

function deduplicateCandidates(candidates) {
  const byId = new Map();
  for (const candidate of candidates) {
    const current = byId.get(candidate.id);
    if (!current) {
      byId.set(candidate.id, candidate);
      continue;
    }
    current.references = [...new Set([...current.references, ...candidate.references])];
  }
  return [...byId.values()];
}

function schemaTypes(node) {
  return asArray(node?.["@type"])
    .filter((value) => typeof value === "string")
    .map((value) => value.split(/[\/#]/).at(-1));
}

function hasSchemaType(node, type) {
  return schemaTypes(node).includes(type);
}

function hasPlaceType(node) {
  return schemaTypes(node).some(
    (type) => PLACE_TYPES.has(type) || type.endsWith("Business") || type.endsWith("Store")
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function scalar(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || undefined;
  }
  return undefined;
}

function namedValue(value) {
  return scalar(value) || scalar(objectValue(value)?.name) || scalar(objectValue(value)?.["@id"]);
}

function namedBrand(value, nodesById) {
  const object = objectValue(value);
  const directName = scalar(object?.name);
  if (directName) {
    return directName;
  }

  const identifier = scalar(object?.["@id"]) || scalar(value);
  if (!identifier) {
    return undefined;
  }

  const referencedName = scalar(nodesById.get(identifier)?.name);
  if (referencedName) {
    return referencedName;
  }

  try {
    const hostname = new URL(identifier).hostname.replace(/^www\./i, "");
    const label = hostname.split(".")[0];
    return label
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
  } catch (error) {
    if (error instanceof TypeError) {
      return identifier;
    }
    throw error;
  }
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function numberValue(value) {
  const number = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : undefined;
}

function hostnameFromUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).hostname;
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
}

function metaContent(document, property) {
  return document
    .querySelector(`meta[property="${property}" i]`)
    ?.getAttribute("content")
    ?.trim();
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null || item === "") {
        return false;
      }
      return typeof item !== "object" || Object.keys(item).length > 0;
    })
  );
}
