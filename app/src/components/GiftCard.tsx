// Cardul cadou Lyra (card fizic): un card mare, separat de restul meniului. Se livrează sau se ridică odată cu comanda.
import { useState } from "react";
import type { Item } from "../lib/types";
import { imgUrl } from "../lib/format";
import Icon from "./Icon";

export default function GiftCard({ item, onAdd }: { item: Item; onAdd: (vi: number, el: Element | null) => void }) {
  const opts = item.variants?.length ? item.variants : [{ l: `${item.price} lei`, p: item.price, g: "" }];
  const [vi, setVi] = useState(Math.min(2, opts.length - 1));   // 200 lei pre-selectat
  const [added, setAdded] = useState(false);
  const img = imgUrl(item.image);
  const v = opts[vi];
  return (
    <article className="gift" data-card>
      <div className="gift-art">
        {img && <img src={img} alt="Card cadou Restaurant Lyra" loading="lazy" />}
        <span className="gift-ribbon"><Icon name="star" size={14} fill /> Cadoul perfect</span>
        <div className="gift-amount num" aria-live="polite"><small>Card cadou</small>{v.p}<span> lei</span></div>
      </div>
      <div className="gift-body">
        <p className="gift-kicker">Special pentru cei dragi</p>
        <h2>{item.name_ro}</h2>
        {item.desc_ro && <p className="gift-desc">{item.desc_ro}</p>}
        <div className="gift-opts" role="radiogroup" aria-label="Valoarea cardului cadou">
          {opts.map((o, i) => <button key={i} role="radio" aria-checked={vi === i} className="num" onClick={() => { setVi(i); setAdded(false); }}>{o.p}<small> lei</small></button>)}
        </div>
        <button className="cta gift-add" disabled={!item.available} onClick={e => { onAdd(vi, (e.currentTarget.closest("[data-card]") as Element)?.querySelector("img")); setAdded(true); }}>
          <Icon name={added ? "check" : "bag"} size={18} />{added ? `Adăugat · mai adaugă unul` : `Adaugă cardul de ${v.p} lei`}
        </button>
        <ul className="gift-facts">
          <li><Icon name="bike" size={15} />Card fizic: ți-l aducem odată cu comanda sau îl ridici din restaurant</li>
          <li><Icon name="cutlery" size={15} />Se folosește la Restaurant Lyra</li>
          <li><Icon name="tag" size={15} />Valoare întreagă, fără reduceri aplicate</li>
        </ul>
      </div>
    </article>
  );
}
