export class Logger {
  public static error(context: string, message: string, error?: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";

    console.error(
      `[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`,
      {
        message: errorMessage,
        stack,
      },
    );
  }

  public static info(context: string, message: string): void {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[${new Date().toISOString()}] [INFO] [${context}]: ${message}`,
      );
    }
  }

  public static debug(context: string, message: string): void {
    if (process.env.DEBUG === "true") {
      console.log(`[DEBUG] [${context}]: ${message}`);
    }
  }
}
