// Documentation copy of the colour tokens in globals.css, used by /styleguide.
// globals.css is the source of truth; keep this list in sync with it.

export type ColorToken = {
  name: string;
  light: string;
  dark: string;
  use: string;
};

export const SURFACE_TOKENS: ColorToken[] = [
  { name: "bg", light: "#F7F4EE", dark: "#12110F", use: "Page background" },
  { name: "surface", light: "#FFFFFF", dark: "#1B1A17", use: "Cards" },
  {
    name: "surface-2",
    light: "#EFEBE3",
    dark: "#24221E",
    use: "Inputs, nested panels",
  },
  { name: "ink", light: "#1A1814", dark: "#F2EEE6", use: "Primary text" },
  {
    name: "ink-muted",
    light: "#6B655B",
    dark: "#A39C90",
    use: "Secondary text",
  },
  { name: "border", light: "#E2DCD0", dark: "#2E2B26", use: "Hairlines" },
  {
    name: "accent",
    light: "#E4572E",
    dark: "#FF6B3D",
    use: "Paprika: primary actions, focus ring",
  },
];

export const FOOD_TOKENS: ColorToken[] = [
  { name: "protein", light: "#B5446E", dark: "#D9628E", use: "Beet" },
  { name: "carbs", light: "#D89B1D", dark: "#F0B43A", use: "Saffron" },
  { name: "fat", light: "#6E8B3D", dark: "#93B058", use: "Olive" },
  { name: "fiber", light: "#3E8E7E", dark: "#5DB3A1", use: "Sage" },
];

export const STATUS_TOKENS: ColorToken[] = [
  { name: "good", light: "#3E8E5A", dark: "#5DB57A", use: "On target" },
  { name: "warn", light: "#C98500", dark: "#E8A21E", use: "Close to a limit" },
  { name: "over", light: "#C2412D", dark: "#E4614B", use: "Over target" },
];

export const TYPE_SCALE = [
  { className: "text-3xl", px: 64, use: "Calories remaining, cook-mode steps" },
  { className: "text-2xl", px: 40, use: "Page titles" },
  { className: "text-xl", px: 28, use: "Section titles, recipe titles" },
  { className: "text-lg", px: 20, use: "Card titles" },
  { className: "text-base", px: 16, use: "Body" },
  { className: "text-sm", px: 14, use: "Labels, controls" },
  { className: "text-xs", px: 12, use: "Captions, units" },
] as const;
