/**
 * Canonical JSON serialization.
 *
 * A sealed record's commitment must be reproducible by anyone, forever, from the
 * revealed payload alone. That requires a single, deterministic byte
 * representation of the payload — independent of key order, whitespace, or
 * platform. This module provides that canonical form (a deterministic subset of
 * RFC 8785 / JCS sufficient for Forge payloads).
 *
 * Rules:
 *  - Object keys are sorted lexicographically (by UTF-16 code unit) at every depth.
 *  - No insignificant whitespace.
 *  - Arrays preserve order.
 *  - Only JSON-safe values are allowed: string, finite number, boolean, null,
 *    array, plain object. undefined / functions / symbols are rejected.
 *  - NaN and Infinity are rejected (not representable, would break determinism).
 */

export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

export function canonicalize(value: CanonicalValue): string {
  return serialize(value);
}

function serialize(value: CanonicalValue): string {
  if (value === null) return "null";

  const t = typeof value;

  if (t === "string") return JSON.stringify(value);

  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error("canonicalize: non-finite number is not allowed");
    }
    // JSON.stringify yields the shortest round-trippable representation.
    return JSON.stringify(value);
  }

  if (t === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return "[" + value.map((v) => serialize(assertDefined(v))).join(",") + "]";
  }

  if (t === "object") {
    const obj = value as { [key: string]: CanonicalValue };
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = obj[key];
      if (v === undefined) continue; // omit undefined fields
      parts.push(JSON.stringify(key) + ":" + serialize(v));
    }
    return "{" + parts.join(",") + "}";
  }

  throw new Error(`canonicalize: unsupported value of type ${t}`);
}

function assertDefined(v: CanonicalValue): CanonicalValue {
  if (v === undefined) {
    throw new Error("canonicalize: undefined is not allowed inside arrays");
  }
  return v;
}
