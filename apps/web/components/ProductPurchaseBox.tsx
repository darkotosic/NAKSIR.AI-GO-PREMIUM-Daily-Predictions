"use client";

import { useMemo, useState } from "react";
import { addToCart } from "../lib/cart";
import { formatRsd, productStartingPrice, type Product, type ProductVariant } from "../lib/products";

export function ProductPurchaseBox({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const selectedVariant = useMemo<ProductVariant | undefined>(() => product.variants.find((variant) => variant.id === selectedVariantId), [product.variants, selectedVariantId]);
  const hasVariants = product.variants.length > 0;
  const price = selectedVariant?.priceRsd ?? (hasVariants ? productStartingPrice(product) : product.priceRsd);
  const compareAt = selectedVariant?.compareAtPriceRsd ?? product.compareAtPriceRsd;
  const stock = selectedVariant?.stockQuantity ?? (hasVariants ? undefined : product.stockQuantity);
  const sku = selectedVariant?.sku ?? (!hasVariants ? product.sku : undefined);
  const canAdd = hasVariants ? Boolean(selectedVariant && selectedVariant.stockQuantity > 0) : product.stockQuantity > 0;

  function handleAdd() {
    if (hasVariants && !selectedVariant) { setMessage("Izaberi varijantu pre dodavanja u korpu."); return; }
    if (!canAdd) { setMessage("Izabrana varijanta nema zalihe i ne može u korpu."); return; }
    addToCart(product, selectedVariant);
    setMessage("Proizvod je dodat u korpu.");
  }

  return (
    <aside className="panel purchase">
      <p className="eyebrow">Detalji kupovine</p>
      <h1>{product.name}</h1>
      <div className="price"><span>{hasVariants && !selectedVariant ? "Od " : ""}{formatRsd(price)}</span>{compareAt && compareAt > price ? <span className="compare">{formatRsd(compareAt)}</span> : null}</div>
      {product.description ? <p className="lead">{product.description}</p> : null}
      {hasVariants ? <div className="options" role="radiogroup" aria-label="Izbor varijante">{product.variants.map((variant) => <button key={variant.id} className={`option ${selectedVariantId === variant.id ? "active" : ""}`} type="button" role="radio" aria-checked={selectedVariantId === variant.id} disabled={variant.stockQuantity <= 0} onClick={() => setSelectedVariantId(variant.id)}><strong>{variant.label}</strong><br /><span>{formatRsd(variant.priceRsd)} · SKU: {variant.sku ?? "—"} · {variant.stockQuantity > 0 ? `Na stanju: ${variant.stockQuantity}` : "Nema na stanju"}</span></button>)}</div> : null}
      <p className="muted">SKU: {sku ?? (hasVariants ? "Izaberi varijantu" : "—")}</p>
      <p className={stock === 0 ? "error" : "notice"}>{stock === undefined ? "Zaliha se prikazuje nakon izbora varijante." : stock > 0 ? `Na stanju: ${stock}` : "Nema na stanju"}</p>
      {message ? <p className={message.includes("dodat") ? "notice" : "error"}>{message}</p> : null}
      <button className="btn" type="button" disabled={!canAdd} onClick={handleAdd}>{canAdd ? "Dodaj u korpu" : "Nema na stanju"}</button>
    </aside>
  );
}
