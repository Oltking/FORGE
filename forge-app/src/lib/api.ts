/** Small helpers for Route Handlers: consistent JSON + error handling. */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail(err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
  }
  if (err instanceof AuthError) {
    return fail(err.message, err.status);
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return fail(message, 400);
}
