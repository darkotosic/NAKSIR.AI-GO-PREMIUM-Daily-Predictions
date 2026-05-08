"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { addToCart } from "../lib/cart";
import { formatRsd, primaryImage, productCompareAt, productStartingPrice, productStock, type Product } from "../lib/products";

export function ProductCard({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = primaryImage(product);
  const hasVariants = product.variants.length > 0;
  const stock = productStock(product);
  const price = productStartingPrice(product);
  const compareAt = productCompareAt(product);
  const canDirectAdd = !hasVariants && stock > 0;

  return (
    <article className="card">
      <Link href={`/products/${product.slug}`} className="image-wrap" aria-label={`Pogledaj proizvod ${product.name}`}>
        {stock <= 0 ? <span className="badge danger">Nema na stanju</span> : null}
        {image && !imageFailed ? <Image src={image.url} alt={image.alt || `${product.name} - primarna slika`} fill sizes="(max-width: 860px) 100vw, 33vw" style={{ objectFit: "cover" }} onError={() => setImageFailed(true)} /> : <div className="placeholder">Slika proizvoda uskoro</div>}
      </Link>
      <div className="card-body">
        <p className="eyebrow">{product.category ?? "Novo"}</p>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <div className="price"><span>{hasVariants ? "Od " : ""}{formatRsd(price)}</span>{compareAt && compareAt > price ? <span className="compare">{formatRsd(compareAt)}</span> : null}</div>
        <p className="muted">{hasVariants ? "Izaberi veličinu/varijantu na detalju proizvoda." : stock > 0 ? `Na stanju: ${stock}` : "Trenutno nedostupno."}</p>
        {canDirectAdd ? <button className="btn" type="button" onClick={() => addToCart(product)}>Dodaj u korpu</button> : <Link className="btn secondary" href={`/products/${product.slug}`}>{hasVariants ? "Izaberi varijantu" : "Detalji"}</Link>}
      </div>
    </article>
  );
}
