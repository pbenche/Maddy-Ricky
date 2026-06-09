"use client";
import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface InspirationItem {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: InspirationItem) => void }) {
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [uploadPreview, setUploadPreview] = useState("");
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let blob: Blob = file;
    if (/\.heic$/i.test(file.name)) {
      try {
        const heic2any = (await import("heic2any")).default;
        blob = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
      } catch { /* fallback */ }
    }
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
    setImageUrl(b64);
    setUploadPreview(b64);
  }

  function handleAdd() {
    const finalUrl = tab === "upload" ? uploadPreview : imageUrl.trim();
    if (!finalUrl) return;
    onAdd({ id: uid(), imageUrl: finalUrl, title: title.trim(), link: link.trim() });
    onClose();
  }

  const tabStyle = (t: "upload" | "url") => ({
    background: "none",
    border: "none",
    padding: "6px 0",
    fontSize: "0.7rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: tab === t ? "var(--accent)" : "#9a8f82",
    borderBottom: `1px solid ${tab === t ? "var(--accent)" : "transparent"}`,
    cursor: "pointer",
    marginRight: 20,
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", color: "var(--accent)" }}>Add Inspiration</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 20 }}>
          <button style={tabStyle("upload")} onClick={() => setTab("upload")}>Upload</button>
          <button style={tabStyle("url")} onClick={() => setTab("url")}>URL</button>
        </div>

        {tab === "upload" ? (
          <div>
            <input ref={fileRef} type="file" accept="image/*,.heic" style={{ display: "none" }} onChange={handleFile} />
            {uploadPreview ? (
              <div style={{ position: "relative", marginBottom: 16 }}>
                <img src={uploadPreview} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 3 }} />
                <button
                  onClick={() => { setUploadPreview(""); setImageUrl(""); }}
                  style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 0 }}
                ><X size={12} /></button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "1px dashed var(--border)", borderRadius: 3, padding: 32, textAlign: "center", cursor: "pointer", marginBottom: 16 }}
              >
                <p style={{ color: "#5a5248", fontSize: "0.85rem", marginBottom: 6 }}>Click to upload an image</p>
                <p style={{ color: "#3a3530", fontSize: "0.75rem" }}>Supports JPG, PNG, HEIC</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Image URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Caption or title" />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ item, onClose }: { item: InspirationItem; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "center" }}>
      <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 3, display: "block" }}
        />
        {item.title && (
          <div style={{ marginTop: 12, textAlign: "center", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "#e8e0d4" }}>
            {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>{item.title}</a> : item.title}
          </div>
        )}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: -12, right: -12, background: "rgba(12,12,12,0.9)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#9a8f82", padding: 0 }}
        ><X size={14} /></button>
      </div>
    </div>
  );
}

// ─── Masonry Grid ──────────────────────────────────────────────────────────────
function MasonryGrid({ items, onDelete, onOpen }: { items: InspirationItem[]; onDelete: (id: string) => void; onOpen: (item: InspirationItem) => void }) {
  return (
    <div
      style={{
        columnCount: 3,
        columnGap: 14,
      }}
      className="masonry-grid"
    >
      <style>{`
        @media (max-width: 768px) { .masonry-grid { column-count: 2 !important; } }
        @media (max-width: 480px) { .masonry-grid { column-count: 1 !important; } }
      `}</style>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            breakInside: "avoid",
            marginBottom: 14,
            position: "relative",
            cursor: "pointer",
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
          className="inspiration-card"
          onClick={() => onOpen(item)}
        >
          <style>{`
            .inspiration-card .inspiration-overlay { opacity: 0; transition: opacity 0.2s; }
            .inspiration-card:hover .inspiration-overlay { opacity: 1; }
          `}</style>
          <img
            src={item.imageUrl}
            alt={item.title}
            style={{ width: "100%", display: "block", objectFit: "cover" }}
            loading="lazy"
          />
          {item.title && (
            <div style={{ padding: "8px 10px", background: "rgba(12,12,12,0.82)", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.78rem", color: "#e8e0d4", fontFamily: "var(--font-cormorant)", margin: 0 }}>{item.title}</p>
            </div>
          )}
          {/* Overlay with delete button */}
          <div
            className="inspiration-overlay"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 8 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              style={{ background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 0 }}
            ><X size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InspirationPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<InspirationItem | null>(null);

  useEffect(() => {
    try { const d = localStorage.getItem("inspirations"); if (d) setItems(JSON.parse(d)); } catch {}
  }, []);

  function saveItems(arr: InspirationItem[]) {
    setItems(arr);
    localStorage.setItem("inspirations", JSON.stringify(arr));
  }

  function addItem(item: InspirationItem) {
    saveItems([item, ...items]);
  }

  function deleteItem(id: string) {
    saveItems(items.filter((i) => i.id !== id));
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2.2rem", color: "var(--accent)", marginBottom: 4 }}>
            Inspiration
          </h1>
          <p style={{ fontSize: "0.78rem", color: "#9a8f82" }}>{items.length} {items.length === 1 ? "item" : "items"}</p>
        </div>
        <button className="btn-primary" onClick={() => setAddModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", border: "1px dashed var(--border)", borderRadius: 4 }}>
          <p style={{ color: "#5a5248", fontSize: "0.9rem", marginBottom: 16 }}>Your inspiration board is empty</p>
          <button className="btn-ghost" onClick={() => setAddModalOpen(true)}>Add your first image</button>
        </div>
      ) : (
        <MasonryGrid items={items} onDelete={deleteItem} onOpen={setLightboxItem} />
      )}

      {addModalOpen && <AddModal onClose={() => setAddModalOpen(false)} onAdd={addItem} />}
      {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    </div>
  );
}
