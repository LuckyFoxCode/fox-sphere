function extractCauseChain(error: unknown): string[] {
  const chain: string[] = [];
  let current: unknown = error;

  for (
    let depth = 0;
    depth < 5 && current instanceof Error && current.cause !== undefined;
    depth++
  ) {
    current = current.cause;
    chain.push(current instanceof Error ? current.message : String(current));
  }

  return chain;
}

export class Logger {
  public static error(context: string, message: string, error?: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";

    const payload: Record<string, string | string[]> = {
      message: errorMessage,
      stack: stack ?? "",
    };

    const causeChain = extractCauseChain(error);
    if (causeChain.length > 0) {
      payload.cause = causeChain;
    }

    console.error(
      `[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`,
      payload,
    );
  }

  public static info(context: string, message: string): void {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[${new Date().toISOString()}] [INFO] [${context}]: ${message}`,
      );
    }
  }

  // Unlike info(), warn() is NOT silenced in production - a handled 4xx still has
  // to leave a trace, or a client failing every request is invisible on the server.
  public static warn(context: string, message: string): void {
    console.warn(`[${new Date().toISOString()}] [WARN] [${context}]: ${message}`);
  }

  public static debug(context: string, message: string): void {
    if (process.env.DEBUG === "true") {
      console.log(`[DEBUG] [${context}]: ${message}`);
    }
  }
}
