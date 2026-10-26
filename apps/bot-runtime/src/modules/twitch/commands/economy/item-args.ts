export interface ItemArgs {
  category: string;
  term: string;
}

/**
 * The categories that name a hero, in both languages the chat uses.
 *
 * It lives here rather than in `buy.command.ts` because `!use` parses its arguments with the
 * same function in Task 6, and a category list copied into both commands drifts the moment
 * one of them learns a synonym the other does not.
 */
export const HERO_CATEGORIES: ReadonlySet<string> = new Set(["hero", "герой"]);

/**
 * Splits `!buy hero big robber` into its category and its term.
 *
 * `null` means "not enough arguments" - the caller answers with a usage hint, and it is a
 * value rather than a throw because a missing argument is chat noise, not a failure. The term
 * keeps its spaces so a multi-word hero name stays one name, and both halves are lowercased
 * here because both `findHeroByTerm` and the category set compare case-insensitively.
 */
export const parseItemArgs = (args: readonly string[]): ItemArgs | null => {
  const parts = args
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0);

  const [category, ...rest] = parts;

  if (!category || rest.length === 0) {
    return null;
  }

  return {
    category: category.toLowerCase(),
    term: rest.join(" ").toLowerCase(),
  };
};
