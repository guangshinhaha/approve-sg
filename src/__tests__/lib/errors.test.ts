import { AppError, NotFoundError, handleApiError } from "@/lib/errors";
import { AuthError } from "@/lib/auth";
import { ZodError } from "zod";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("handleApiError", () => {
  it("should return 401 for AuthError", () => {
    const response = handleApiError(new AuthError("Unauthorized"));
    expect(response.status).toBe(401);
  });

  it("should return 404 for NotFoundError", () => {
    const response = handleApiError(new NotFoundError("Workflow"));
    expect(response.status).toBe(404);
  });

  it("should return custom status for AppError", () => {
    const response = handleApiError(new AppError("Forbidden", 403));
    expect(response.status).toBe(403);
  });

  it("should return 400 for ZodError", () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["name"],
        message: "Expected string",
      },
    ]);
    const response = handleApiError(zodError);
    expect(response.status).toBe(400);
  });

  it("should return 500 for unknown errors", () => {
    const response = handleApiError(new Error("Something broke"));
    expect(response.status).toBe(500);
  });
});
