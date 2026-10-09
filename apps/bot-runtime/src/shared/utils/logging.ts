import { Logger } from "@fox-sphere/backend-shared";

/**
 * Runs an event-bus listener body, logging and swallowing any rejection.
 *
 * `globalEventBus` is a bare `EventEmitter`: it hands listeners straight to
 * `EventEmitter.emit`, which calls them synchronously and drops whatever they
 * return. An `async` listener therefore rejects as an unhandled rejection rather
 * than reaching any error handler, and one failing alert listener takes down the
 * process instead of losing its own message.
 *
 * Nearly every listener is "do one thing, log if it fails", and repeating that
 * try/catch is what made the chat service's listener block several times longer
 * than the behaviour it held. `failureMessage` takes either a fixed string or a
 * function of the error, so a message that needs the failure detail still gets
 * it without the caller writing the catch itself.
 */
export const withLogging = async (
  context: string,
  failureMessage: string | ((error: unknown) => string),
  run: () => Promise<void>,
): Promise<void> => {
  try {
    await run();
  } catch (error) {
    Logger.error(
      context,
      typeof failureMessage === "function"
        ? failureMessage(error)
        : failureMessage,
      error,
    );
  }
};
