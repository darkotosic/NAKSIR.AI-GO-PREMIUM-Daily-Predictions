import { notFound } from "next/navigation";
import { ProductGallery } from "../../../components/ProductGallery";
import { ProductPurchaseBox } from "../../../components/ProductPurchaseBox";
import { fetchProduct } from "../../../lib/products";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ProductDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  let product = null;
  try { product = await fetchProduct(slug); } catch { product = null; }
  if (!product) notFound();
  return <main className="container section product-layout"><ProductGallery product={product} /><ProductPurchaseBox product={product} /></main>;
}
