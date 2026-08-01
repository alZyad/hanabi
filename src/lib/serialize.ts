function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedDeep) as T;
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        output[key] = omitUndefinedDeep(entry);
      }
    }
    return output as T;
  }

  return value;
}

export function serializable<T>(props: T): T {
  return omitUndefinedDeep(props);
}
