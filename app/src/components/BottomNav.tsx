import { Link } from "react-router-dom";
import Icon from "./Icon";
import { lei } from "../lib/format";

/** Phone-only app bar: menu, Lyra Club, orders, and the cart button that carries the running total. */
export default function BottomNav({ active, count = 0, total = 0, onCart }: { active: "menu" | "club" | "orders"; count?: number; total?: number; onCart?: () => void }) {
  return (
    <nav className="bnav" aria-label="Navigare">
      <Link to="/" aria-current={active === "menu"}><Icon name="dish" size={22} /><span>Meniu</span></Link>
      <Link to="/cont" aria-current={active === "club"}><Icon name="star" size={22} /><span>Lyra Club</span></Link>
      <Link to="/cont#comenzi" aria-current={active === "orders"}><Icon name="orders" size={22} /><span>Comenzi</span></Link>
      {onCart
        ? <button className={`bnav-cart ${count ? "has" : ""}`} onClick={onCart} data-cart-target aria-label="Coșul tău">
            <span className="bnav-ic"><Icon name="bag" size={20} />{count > 0 && <b className="num">{count}</b>}</span>
            <span className="num">{count ? lei(total) : "Coș"}</span>
          </button>
        : <Link to="/?cart=1" className="bnav-cart"><span className="bnav-ic"><Icon name="bag" size={20} /></span><span>Coș</span></Link>}
    </nav>
  );
}
