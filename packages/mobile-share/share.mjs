export function parseShareTarget(input) {
  const url = input instanceof URL ? input : new URL(input, "https://verity.invalid");
  const sharedUrl = firstHttpUrl([
    url.searchParams.get("url"),
    url.searchParams.get("text")
  ]);
  return {
    title: clean(url.searchParams.get("title")),
    text: clean(url.searchParams.get("text")),
    url: sharedUrl
  };
}

function firstHttpUrl(values) {
  for (const value of values) {
    if (!value) {
      continue;
    }
    const direct = validHttpUrl(value);
    if (direct) {
      return direct;
    }
    for (const match of value.match(/https?:\/\/[^\s]+/g) ?? []) {
      const embedded = validHttpUrl(match);
      if (embedded) {
        return embedded;
      }
    }
  }
  return null;
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function clean(value) {
  const normalized = value?.trim();
  return normalized || null;
}
