import type { Product, ProductVariant } from "./products";
import { primaryImage } from "./products";

export type CartItem = { id: string; productId: string; slug: string; name: string; imageUrl?: string; variantId?: string; variantLabel?: string; sku?: string | null; priceRsd: number; quantity: number; stockQuantity: number };
const CART_KEY = "naksir_cart";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as CartItem[]; } catch { return []; }
}
export function writeCart(items: CartItem[]): void { window.localStorage.setItem(CART_KEY, JSON.stringify(items)); window.dispatchEvent(new Event("cart:updated")); }
export function addToCart(product: Product, variant?: ProductVariant, quantity = 1): void {
  const image = primaryImage(product);
  const id = `${product.id}:${variant?.id ?? "default"}`;
  const stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
  const next: CartItem = { id, productId: product.id, slug: product.slug, name: product.name, imageUrl: image?.url, variantId: variant?.id, variantLabel: variant?.label, sku: variant?.sku ?? product.sku, priceRsd: variant?.priceRsd ?? product.priceRsd, quantity, stockQuantity };
  const items = readCart();
  const existing = items.find((item) => item.id === id);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, stockQuantity); else items.push(next);
  writeCart(items);
}
