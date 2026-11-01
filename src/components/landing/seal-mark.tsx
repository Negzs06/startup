/** The ChargeGuard seal: concentric rings and a tick, echoing the 3D seal. */
export function SealMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeOpacity="0.45" />
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeOpacity="0.75" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" />
      <path d="M12.8 16.2l2.2 2.2 4.4-4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
