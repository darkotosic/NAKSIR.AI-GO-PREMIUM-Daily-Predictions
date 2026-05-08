import Link from "next/link";
import type { Product } from "../lib/products";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="empty">
        <p className="eyebrow">Nema rezultata</p>
        <h2>Nismo pronašli proizvode za izabrane filtere.</h2>
        <p className="muted">Resetuj filtere ili pogledaj celu kolekciju.</p>
        <Link className="btn" href="/products">Prikaži sve proizvode</Link>
      </div>
    );
  }
  return <div className="grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
