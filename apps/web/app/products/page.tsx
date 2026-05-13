import Link from "next/link";
import { ProductFilters } from "../../components/ProductFilters";
import { ProductGrid } from "../../components/ProductGrid";
import { fetchProducts } from "../../lib/products";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function stringParam(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
function pageHref(searchParams: Record<string, string | undefined>, page: number): string { const params = new URLSearchParams(); Object.entries(searchParams).forEach(([key, value]) => { if (value && key !== "page") params.set(key, value); }); params.set("page", String(page)); return `/products?${params.toString()}`; }

export default async function ProductsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = { q: stringParam(raw.q), category: stringParam(raw.category), minPrice: stringParam(raw.minPrice), maxPrice: stringParam(raw.maxPrice), sort: stringParam(raw.sort), page: stringParam(raw.page) ?? "1" };
  let response;
  try { response = await fetchProducts(params); } catch { response = { products: [], page: Number(params.page), totalPages: 1, total: 0 }; }
  return (
    <main className="container section"><div className="section-head"><div><p className="eyebrow">Kolekcija</p><h1>Proizvodi</h1><p className="muted">Filter cena koristi realne RSD vrednosti koje se šalju API-ju.</p></div></div><ProductFilters searchParams={params} /><ProductGrid products={response.products} />{response.totalPages > 1 ? <nav className="pagination" aria-label="Paginacija proizvoda">{response.page > 1 ? <Link className="btn secondary" href={pageHref(params, response.page - 1)}>Prethodna</Link> : null}<span className="btn secondary" aria-current="page">{response.page} / {response.totalPages}</span>{response.page < response.totalPages ? <Link className="btn secondary" href={pageHref(params, response.page + 1)}>Sledeća</Link> : null}</nav> : null}</main>
  );
}
