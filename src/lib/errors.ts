import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.errors },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: "Invalid data provided" },
      { status: 400 }
    );
  }

  logger.error({ err: error }, "Unhandled error");
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case "P2002": {
      const target = (error.meta?.target as string[])?.join(", ") || "field";
      return NextResponse.json(
        { error: `A record with this ${target} already exists` },
        { status: 409 }
      );
    }
    case "P2003":
      return NextResponse.json(
        { error: "Referenced record not found" },
        { status: 400 }
      );
    case "P2025":
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    default:
      logger.error({ code: error.code, meta: error.meta }, "Prisma error");
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
  }
}
