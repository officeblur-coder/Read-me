/** "LYRA'S / DELIVERY" text logo with the orange swoosh, used in every header. */
export default function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`wordmark${small ? " sm" : ""}`} aria-label="Lyra's Delivery">
      <b>LYRA’S</b><span>DELIVERY</span>
      <svg viewBox="0 0 120 10" aria-hidden="true"><path d="M4 6c30-5 80-5 112 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
    </span>
  );
}
