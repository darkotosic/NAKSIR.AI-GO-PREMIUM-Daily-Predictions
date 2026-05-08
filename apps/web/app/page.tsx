import Link from "next/link";
import { fetchProducts, type Product } from "../lib/products";
import { ProductGrid } from "../components/ProductGrid";

const trustBadges = ["Plaćanje pouzećem", "Zamena veličine", "Brza potvrda porudžbine", "Podrška preko Instagrama/Facebooka"];

export default async function HomePage() {
  let featured: Product[] = [];
  try {
    featured = (await fetchProducts({ featured: "true", limit: 6 })).products;
  } catch {
    featured = [];
  }
  return (
    <main>
      <section className="hero"><div className="container hero-grid"><div><p className="eyebrow">Online prodavnica</p><h1>Stvari koje lako biraš, jasno plaćaš i brzo potvrđuješ.</h1><p className="lead">Kupovina bez tehničkog kataloga: realne fotografije, zalihe, varijante i jednostavan checkout.</p><Link className="btn" href="/products">Pogledaj kolekciju</Link></div><div className="panel"><h2>Sigurna kupovina</h2><p className="muted">Svaka porudžbina se potvrđuje pre slanja, a podrška je dostupna preko društvenih mreža.</p></div></div></section>
      <section className="container"><div className="trust">{trustBadges.map((badge) => <div className="trust-badge" key={badge}>{badge}</div>)}</div></section>
      <section className="container section"><div className="section-head"><div><p className="eyebrow">Featured</p><h2>Izdvojeni proizvodi</h2></div><Link className="btn secondary" href="/products">Svi proizvodi</Link></div>{featured.length > 0 ? <ProductGrid products={featured} /> : <div className="empty"><h2>Izdvojeni proizvodi trenutno nisu dostupni.</h2><p className="muted">Ne prikazujemo lažne proizvode kada API nije dostupan. Pokušaj ponovo uskoro ili pogledaj celu kolekciju.</p><Link className="btn" href="/products">Otvori proizvode</Link></div>}</section>
    </main>
  );
}
