// Body stat conversions for imperial display. Storage is always metric.

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_IN;
}

/** Whole feet and inches rounded to 0.5 in, carrying 12 in to a foot. */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round((cm / CM_PER_IN) * 2) / 2;
  let feet = Math.floor(totalInches / 12);
  let inches = totalInches - feet * 12;
  if (inches >= 12) {
    feet += 1;
    inches -= 12;
  }
  return { feet, inches };
}
