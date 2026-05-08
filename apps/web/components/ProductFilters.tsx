import Link from "next/link";

type Props = { searchParams: { q?: string; category?: string; minPrice?: string; maxPrice?: string; sort?: string } };

export function ProductFilters({ searchParams }: Props) {
  return (
    <form className="filters" action="/products">
      <label className="field">Pretraga<input name="q" defaultValue={searchParams.q ?? ""} placeholder="Majica, duks..." /></label>
      <label className="field">Kategorija<input name="category" defaultValue={searchParams.category ?? ""} placeholder="Sve kategorije" /></label>
      <label className="field">Cena od (RSD)<input name="minPrice" type="number" min="0" step="100" defaultValue={searchParams.minPrice ?? ""} placeholder="0" /></label>
      <label className="field">Cena do (RSD)<input name="maxPrice" type="number" min="0" step="100" defaultValue={searchParams.maxPrice ?? ""} placeholder="10000" /></label>
      <label className="field">Sortiranje<select name="sort" defaultValue={searchParams.sort ?? "newest"}><option value="newest">Najnovije</option><option value="price_asc">Cena rastuće</option><option value="price_desc">Cena opadajuće</option></select></label>
      <button className="btn" type="submit">Primeni filtere</button>
      <Link className="btn secondary" href="/products">Reset filtera</Link>
    </form>
  );
}
