"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { readCart, type CartItem } from "../lib/cart";
import { formatRsd } from "../lib/products";

export function CheckoutForm() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { queueMicrotask(() => setItems(readCart())); }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.priceRsd, 0), [items]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (items.length === 0) { setError("Korpa je prazna. Dodaj proizvod pre slanja porudžbine."); return; }
    if (!accepted) { setError("Potvrdi da prihvataš uslove kupovine i politiku privatnosti."); return; }
    setSubmitting(true);
    try { await new Promise((resolve) => setTimeout(resolve, 500)); alert("Porudžbina je primljena. Kontaktiraćemo te za potvrdu."); }
    catch { setError("Porudžbina nije poslata. Proveri podatke i pokušaj ponovo."); }
    finally { setSubmitting(false); }
  }
  return (
    <main className="container section"><div className="checkout-layout"><form className="panel" onSubmit={submit}><p className="eyebrow">Checkout</p><h1>Podaci za isporuku</h1>{error ? <p className="error">{error}</p> : null}<label className="field">Ime i prezime<input name="name" required placeholder="Petar Petrović" /></label><label className="field">Telefon<input name="phone" required placeholder="06x xxx xxxx" /></label><label className="field">Adresa<textarea name="address" required placeholder="Ulica, broj, grad" rows={4} /></label><label className="field">Napomena<textarea name="note" placeholder="Vreme poziva, dodatna napomena..." rows={3} /></label><label className="field" style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> <span>Prihvatam <Link href="/terms">uslove kupovine</Link> i <Link href="/privacy">politiku privatnosti</Link>.</span></label><button className="btn" type="submit" disabled={submitting}>{submitting ? "Slanje porudžbine..." : "Pošalji porudžbinu"}</button></form><aside className="panel"><p className="eyebrow">Order summary</p><h2>Šta kupuješ</h2>{items.length === 0 ? <p className="muted">Korpa je prazna.</p> : items.map((item) => <div className="summary-row" key={item.id}>{item.imageUrl ? <Image src={item.imageUrl} alt={`${item.name} za checkout`} width={72} height={72} style={{ objectFit: "cover", borderRadius: 12 }} /> : <div className="placeholder">Slika</div>}<div><strong>{item.name}</strong>{item.variantLabel ? <p className="muted">{item.variantLabel}</p> : null}<p className="muted">Količina: {item.quantity}</p></div><strong>{formatRsd(item.priceRsd * item.quantity)}</strong></div>)}<div className="section-head"><strong>Ukupno</strong><strong>{formatRsd(total)}</strong></div><p className="notice">Plaćanje pouzećem. Potvrda porudžbine stiže brzo preko telefona ili poruke.</p></aside></div></main>
  );
}
