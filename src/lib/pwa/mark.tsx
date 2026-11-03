// The app mark, drawn for ImageResponse: the Today ring on ink, with a
// paprika arc. `inset` shrinks it into the maskable safe zone.

export function Mark({ size, inset = 0 }: { size: number; inset?: number }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1814",
      }}
    >
      <svg
        width={size * (1 - inset)}
        height={size * (1 - inset)}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#3a3530"
          strokeWidth="11"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#ff6b3d"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.68} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
        <circle cx="50" cy="50" r="7" fill="#f2eee6" />
      </svg>
    </div>
  );
}
