export interface ActionResponse<T = unknown> {
  data?: T;
  error?: string;
}

export function getActionResponse<T = unknown>({
  data,
  error,
}: {
  data?: T;
  error?: unknown;
} = {}): ActionResponse<T> {
  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "An unknown error occurred";
    return { error: errorMessage };
  }

  return { data };
}
