export const WIDGET_VARIANTS = [
  "amber",
  "blue",
  "cyan",
  "purple",
  "red",
  "rose",
] as const;

export type WidgetVariant = (typeof WIDGET_VARIANTS)[number];
