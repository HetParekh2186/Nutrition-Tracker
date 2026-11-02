// Motion settings from SPEC.md: springs for rings, bars and layout,
// nothing longer than 400 ms, fades under prefers-reduced-motion.

export const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export const FADE = { duration: 0.2, ease: "easeOut" } as const;
