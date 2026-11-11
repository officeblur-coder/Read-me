// Prima fereastră la intrare: livrare sau ridicare. Prețurile din meniu se schimbă după alegere
// (reducerile „la tot meniul” pe livrare / ridicare din admin → Reduceri %).
import Icon from "./Icon";

type Mode = "livrare" | "ridicare";

export default function ModePick({ current, livPct, ridPct, onPick, onClose }: {
  current: Mode | null; livPct: number; ridPct: number; onPick: (m: Mode) => void; onClose?: () => void;
}) {
  return (
    <div className="mp-wrap" role="dialog" aria-modal="true" aria-label="Livrare sau ridicare">
      <div className="mp-veil" onClick={onClose} />
      <div className="mp-sheet">
        {onClose && <button className="x-btn mp-x" onClick={onClose} aria-label="Închide">×</button>}
        <h2>Cum vrei să comanzi?</h2>
        <p className="mp-sub">Alege acum. Prețurile din meniu se calculează după alegerea ta.</p>
        <div className="mp-opts">
          <button className={`mp-opt pick ${current === "ridicare" ? "on" : ""}`} onClick={() => onPick("ridicare")}>
            {ridPct > 0 && <span className="mp-badge num">−{ridPct}%</span>}
            <Icon name="bag" size={30} />
            <b>Ridicare din restaurant</b>
            <span>{ridPct > 0 ? <><em>−{ridPct}% la tot meniul</em> · vii tu după comandă</> : "Vii tu după comandă"}</span>
          </button>
          <button className={`mp-opt ${current === "livrare" ? "on" : ""}`} onClick={() => onPick("livrare")}>
            {livPct > 0 && <span className="mp-badge soft num">−{livPct}%</span>}
            <Icon name="bike" size={30} />
            <b>Livrare la domiciliu</b>
            <span>{livPct > 0 ? <><em>−{livPct}% la tot meniul</em> · îți aducem noi comanda</> : "Îți aducem noi comanda"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
