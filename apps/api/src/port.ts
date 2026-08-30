const rawPort = process.env.API_PORT;
const parsed = rawPort === undefined ? 3001 : Number(rawPort);

if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
  throw new Error(
    `API_PORT must be an integer between 1 and 65535, got "${rawPort}".`,
  );
}

const apiPort = parsed;

export { apiPort };
