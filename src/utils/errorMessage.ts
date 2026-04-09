import axios from "axios";
import type { ApiErrorResponse } from "../types/auth";

export function getErrorMessage(error: unknown, fallback = "Unexpected error occurred"): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as Partial<ApiErrorResponse> | undefined;
    if (responseData?.message) {
      return responseData.message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
