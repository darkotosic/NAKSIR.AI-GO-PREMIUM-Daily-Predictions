"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product, ProductImage } from "../lib/products";
import { primaryImage } from "../lib/products";

function imageAlt(product: Product, image?: ProductImage, index = 0): string {
  return image?.alt || `${product.name} - slika proizvoda ${index + 1}`;
}

export function ProductGallery({ product }: { product: Product }) {
  const initial = primaryImage(product) ?? product.images[0];
  const [selected, setSelected] = useState(initial);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const hasFailed = selected ? failedUrls.includes(selected.url) : false;

  return (
    <section aria-label={`Galerija proizvoda ${product.name}`}>
      <div className="gallery-main image-wrap">
        {selected && !hasFailed ? <Image src={selected.url} alt={imageAlt(product, selected, product.images.indexOf(selected))} width={900} height={1100} style={{ width: "100%", height: "auto" }} priority onError={() => setFailedUrls((urls) => [...urls, selected.url])} /> : <div className="placeholder">Slika proizvoda nije dostupna</div>}
      </div>
      {product.images.length > 1 ? <div className="thumbs">{product.images.map((image, index) => <button key={image.url} className={`thumb ${selected?.url === image.url ? "active" : ""}`} type="button" aria-label={`Prikaži sliku ${index + 1} za ${product.name}`} onClick={() => setSelected(image)}>{failedUrls.includes(image.url) ? <span className="placeholder">N/A</span> : <Image src={image.url} alt={imageAlt(product, image, index)} width={82} height={82} style={{ width: 82, height: 82, objectFit: "cover" }} onError={() => setFailedUrls((urls) => [...urls, image.url])} />}</button>)}</div> : null}
    </section>
  );
}
