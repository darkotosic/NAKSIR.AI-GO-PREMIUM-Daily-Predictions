export type ProductImage = { url: string; alt?: string | null; isPrimary?: boolean | null };
export type ProductVariant = { id: string; label: string; sku?: string | null; priceRsd: number; compareAtPriceRsd?: number | null; stockQuantity: number };
export type Product = { id: string; slug: string; name: string; description?: string | null; priceRsd: number; compareAtPriceRsd?: number | null; stockQuantity: number; sku?: string | null; images: ProductImage[]; variants: ProductVariant[]; category?: string | null };
export type ProductListResponse = { products: Product[]; page: number; totalPages: number; total: number };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

function headers(): HeadersInit {
  return API_KEY ? { "X-API-Key": API_KEY } : {};
}

export function formatRsd(value: number): string {
  return new Intl.NumberFormat("sr-RS", { style: "currency", currency: "RSD", maximumFractionDigits: 0 }).format(value);
}

export function primaryImage(product: Product): ProductImage | undefined {
  return product.images.find((image) => image.isPrimary) ?? product.images[0];
}

export function productStock(product: Product): number {
  return product.variants.length > 0 ? product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0) : product.stockQuantity;
}

export function productStartingPrice(product: Product): number {
  if (product.variants.length === 0) return product.priceRsd;
  return Math.min(...product.variants.map((variant) => variant.priceRsd));
}

export function productCompareAt(product: Product): number | null {
  if (product.variants.length === 0) return product.compareAtPriceRsd ?? null;
  const values = product.variants.map((variant) => variant.compareAtPriceRsd).filter((value): value is number => typeof value === "number" && value > 0);
  return values.length > 0 ? Math.min(...values) : null;
}

function normalizeProduct(raw: unknown): Product {
  const item = raw as Record<string, unknown>;
  const variants = Array.isArray(item.variants) ? item.variants.map((variant): ProductVariant => {
    const v = variant as Record<string, unknown>;
    return {
      id: String(v.id ?? v.sku ?? crypto.randomUUID()),
      label: String(v.label ?? v.name ?? "Varijanta"),
      sku: typeof v.sku === "string" ? v.sku : null,
      priceRsd: Number(v.priceRsd ?? v.price_rsd ?? v.price ?? 0),
      compareAtPriceRsd: typeof (v.compareAtPriceRsd ?? v.compare_at_price_rsd) === "number" ? Number(v.compareAtPriceRsd ?? v.compare_at_price_rsd) : null,
      stockQuantity: Number(v.stockQuantity ?? v.stock_quantity ?? v.stock ?? 0),
    };
  }) : [];
  const images = Array.isArray(item.images) ? item.images.map((image): ProductImage => {
    if (typeof image === "string") return { url: image, alt: String(item.name ?? "Proizvod") };
    const img = image as Record<string, unknown>;
    return { url: String(img.url ?? img.src ?? ""), alt: typeof img.alt === "string" ? img.alt : null, isPrimary: Boolean(img.isPrimary ?? img.is_primary) };
  }).filter((image) => image.url) : [];
  return {
    id: String(item.id ?? item.slug ?? crypto.randomUUID()),
    slug: String(item.slug ?? item.id ?? "proizvod"),
    name: String(item.name ?? item.title ?? "Proizvod"),
    description: typeof item.description === "string" ? item.description : null,
    priceRsd: Number(item.priceRsd ?? item.price_rsd ?? item.price ?? 0),
    compareAtPriceRsd: typeof (item.compareAtPriceRsd ?? item.compare_at_price_rsd) === "number" ? Number(item.compareAtPriceRsd ?? item.compare_at_price_rsd) : null,
    stockQuantity: Number(item.stockQuantity ?? item.stock_quantity ?? item.stock ?? 0),
    sku: typeof item.sku === "string" ? item.sku : null,
    images,
    variants,
    category: typeof item.category === "string" ? item.category : null,
  };
}

export async function fetchProducts(params: Record<string, string | number | undefined> = {}): Promise<ProductListResponse> {
  const url = new URL("/products", API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: headers(), next: { revalidate: 120 } });
  if (!response.ok) throw new Error("Products API nije trenutno dostupan.");
  const data = await response.json() as Record<string, unknown>;
  const rawProducts = Array.isArray(data.products) ? data.products : Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  return {
    products: rawProducts.map(normalizeProduct),
    page: Number(data.page ?? params.page ?? 1),
    totalPages: Math.max(1, Number(data.totalPages ?? data.total_pages ?? 1)),
    total: Number(data.total ?? rawProducts.length),
  };
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const response = await fetch(new URL(`/products/${slug}`, API_BASE_URL), { headers: headers(), next: { revalidate: 120 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Product API nije trenutno dostupan.");
  return normalizeProduct(await response.json());
}
