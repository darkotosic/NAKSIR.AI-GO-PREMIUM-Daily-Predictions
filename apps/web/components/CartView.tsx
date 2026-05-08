"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readCart, writeCart, type CartItem } from "../lib/cart";
import { formatRsd } from "../lib/products";

export function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { queueMicrotask(() => setItems(readCart())); }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.priceRsd * item.quantity, 0), [items]);
  function update(next: CartItem[]) { setItems(next); writeCart(next); }
  function clearCart() { if (window.confirm("Da li sigurno želiš da isprazniš korpu?")) update([]); }
  if (items.length === 0) return <div className="container section"><div className="empty"><h1>Korpa je prazna</h1><p className="muted">Dodaj proizvode i vrati se na sigurnu kupovinu.</p><Link className="btn" href="/products">Pogledaj proizvode</Link></div></div>;
  return (
    <main className="container section">
      <div className="section-head"><div><p className="eyebrow">Korpa</p><h1>Tvoja porudžbina</h1></div><button className="btn secondary" type="button" onClick={clearCart}>Isprazni korpu</button></div>
      <div className="panel">{items.map((item) => <div className="cart-row" key={item.id}>{item.imageUrl ? <Image src={item.imageUrl} alt={`${item.name} u korpi`} width={80} height={80} style={{ objectFit: "cover", borderRadius: 14 }} /> : <div className="placeholder">Slika</div>}<div><strong>{item.name}</strong>{item.variantLabel ? <p className="muted">Varijanta: {item.variantLabel}</p> : null}<div className="qty"><button className="btn secondary" type="button" onClick={() => update(items.map((row) => row.id === item.id ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row))}>−</button><span>{item.quantity}</span><button className="btn secondary" type="button" disabled={item.quantity >= item.stockQuantity} onClick={() => update(items.map((row) => row.id === item.id ? { ...row, quantity: Math.min(row.stockQuantity, row.quantity + 1) } : row))}>+</button></div>{item.quantity === item.stockQuantity ? <p className="notice">Dostignut je maksimum dostupne količine.</p> : null}</div><strong>{formatRsd(item.priceRsd * item.quantity)}</strong></div>)}</div>
      <aside className="panel" style={{ marginTop: 20 }}><h2>Pregled porudžbine</h2><p className="muted">Ukupno artikala: {items.reduce((sum, item) => sum + item.quantity, 0)}</p><div className="section-head"><strong>Ukupno</strong><strong>{formatRsd(total)}</strong></div><Link className="btn" href="/checkout">Nastavi na checkout</Link></aside>
    </main>
  );
}
