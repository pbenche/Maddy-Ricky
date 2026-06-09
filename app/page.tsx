"use client";
import { useState, useEffect, useRef } from "react";
import { X, Edit2, Plus, Settings } from "lucide-react";
import { Camera } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Adventure {
  name: string;
  date: string;
}
interface AdventuresData {
  main: Adventure;
  upcoming: Adventure[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function defaultMainAdventure(): Adventure {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return { name: "Festival Season", date: d.toISOString().split("T")[0] };
}

// ─── Placeholder positions for the world canvas ───────────────────────────────
const PLACEHOLDER_RECTS = [
  { x: 120,  y: 80,   w: 320, h: 420 },
  { x: 3100, y: 60,   w: 380, h: 280 },
  { x: 200,  y: 1800, w: 420, h: 560 },
  { x: 3200, y: 600,  w: 500, h: 380 },
  { x: 3000, y: 1800, w: 320, h: 420 },
  { x: 600,  y: 2500, w: 280, h: 360 },
  { x: 3400, y: 2400, w: 360, h: 280 },
  { x: 100,  y: 1200, w: 200, h: 280 },
  { x: 2800, y: 200,  w: 240, h: 320 },
  { x: 700,  y: 400,  w: 180, h: 240 },
];

// Seeded positions for real photos spread around canvas (avoiding center ~1930-2870 x, ~1350-1650 y)
const PHOTO_POSITIONS = [
  { x: 120,  y: 80   },
  { x: 3100, y: 60   },
  { x: 200,  y: 1800 },
  { x: 3200, y: 600  },
  { x: 3000, y: 1800 },
  { x: 600,  y: 2500 },
  { x: 3400, y: 2400 },
  { x: 100,  y: 1200 },
  { x: 2800, y: 200  },
  { x: 700,  y: 400  },
  { x: 1400, y: 200  },
  { x: 1500, y: 2600 },
];

// ─── Photo Modal ──────────────────────────────────────────────────────────────
function PhotoModal({ photos, onClose, onUpdate }: { photos: string[]; onClose: () => void; onUpdate: (p: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const results: string[] = [];
    for (const file of files) {
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
      results.push(b64);
    }
    onUpdate([...photos, ...results]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "var(--accent)" }}>Collage Photos</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 3, display: "block" }} />
              <button
                onClick={() => onUpdate(photos.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 0 }}
              ><X size={12} /></button>
            </div>
          ))}
          {photos.length === 0 && <p style={{ color: "#5a5248", fontSize: "0.85rem", gridColumn: "1/-1" }}>No photos yet. Upload some to populate the canvas.</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.heic" multiple style={{ display: "none" }} onChange={handleFiles} />
        <button className="btn-primary" onClick={() => fileRef.current?.click()}>Upload Photos</button>
      </div>
    </div>
  );
}

// ─── Adventure Modal ──────────────────────────────────────────────────────────
function AdventureModal({ data, onClose, onSave }: { data: AdventuresData; onClose: () => void; onSave: (d: AdventuresData) => void }) {
  const [main, setMain] = useState<Adventure>({ ...data.main });
  const [upcoming, setUpcoming] = useState<Adventure[]>(data.upcoming.map((a) => ({ ...a })));
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  function addUpcoming() {
    if (!newName || !newDate) return;
    setUpcoming([...upcoming, { name: newName, date: newDate }]);
    setNewName(""); setNewDate("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "var(--accent)" }}>Adventures</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 10 }}>Main Adventure</p>
          <input value={main.name} onChange={(e) => setMain({ ...main, name: e.target.value })} placeholder="Adventure name" style={{ marginBottom: 8 }} />
          <input type="date" value={main.date} onChange={(e) => setMain({ ...main, date: e.target.value })} />
        </div>
        <div className="divider" />
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 10 }}>Upcoming</p>
          {upcoming.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input value={a.name} onChange={(e) => { const u = [...upcoming]; u[i] = { ...u[i], name: e.target.value }; setUpcoming(u); }} placeholder="Name" style={{ flex: 2 }} />
              <input type="date" value={a.date} onChange={(e) => { const u = [...upcoming]; u[i] = { ...u[i], date: e.target.value }; setUpcoming(u); }} style={{ flex: 1 }} />
              <button onClick={() => setUpcoming(upcoming.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={14} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Adventure name" style={{ flex: 2 }} />
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ flex: 1 }} />
            <button onClick={addUpcoming} style={{ background: "none", border: "none", color: "var(--accent)" }}><Plus size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave({ main, upcoming }); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Modal ───────────────────────────────────────────────────────────
function CalendarModal({ url, onClose, onSave }: { url: string; onClose: () => void; onSave: (u: string) => void }) {
  const [val, setVal] = useState(url);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "var(--accent)" }}>Calendar Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: "0.82rem", color: "#9a8f82", marginBottom: 14, lineHeight: 1.7 }}>
          Paste your Google Calendar embed URL from Calendar Settings → Integrate calendar → Embed code.
        </p>
        <textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder="https://calendar.google.com/calendar/embed?src=..." style={{ height: 80, resize: "vertical", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(val.trim()); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Together Modal ───────────────────────────────────────────────────────────
function TogetherModal({ date, onClose, onSave }: { date: string; onClose: () => void; onSave: (d: string) => void }) {
  const [val, setVal] = useState(date);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "var(--accent)" }}>Together Since</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>
        <input type="date" value={val} onChange={(e) => setVal(e.target.value)} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(val); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [adventures, setAdventures] = useState<AdventuresData>({ main: defaultMainAdventure(), upcoming: [] });
  const [adventureModalOpen, setAdventureModalOpen] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState("");
  const [calModalOpen, setCalModalOpen] = useState(false);
  const [portfolioTotal, setPortfolioTotal] = useState(0);
  const [savingsTotal, setSavingsTotal] = useState(0);
  const [togetherDate, setTogetherDate] = useState("2022-01-01");
  const [togetherModalOpen, setTogetherModalOpen] = useState(false);

  // Panning canvas refs
  const worldRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try { const p = localStorage.getItem("collagePhotos"); if (p) setPhotos(JSON.parse(p)); } catch {}
    try { const a = localStorage.getItem("adventures"); if (a) setAdventures(JSON.parse(a)); } catch {}
    try { const c = localStorage.getItem("calendarUrl"); if (c) setCalendarUrl(c); } catch {}
    try {
      const h = localStorage.getItem("stockHoldings");
      if (h) { const arr = JSON.parse(h); setPortfolioTotal(arr.reduce((s: number, x: { shares: number; buyPrice: number }) => s + x.shares * x.buyPrice, 0)); }
    } catch {}
    try {
      const sv = localStorage.getItem("savings");
      if (sv) { const arr = JSON.parse(sv); setSavingsTotal(arr.reduce((s: number, x: { amount: number }) => s + Number(x.amount), 0)); }
    } catch {}
    try { const td = localStorage.getItem("togetherDate"); if (td) setTogetherDate(td); } catch {}
  }, []);

  // Panning animation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      target.current.x = (e.clientX - centerX) * -0.12;
      target.current.y = (e.clientY - centerY) * -0.12;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let raf: number;
    const animate = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.05;
      pos.current.y += (target.current.y - pos.current.y) * 0.05;
      const baseX = -2000 + window.innerWidth / 2;
      const baseY = -1500 + window.innerHeight / 2;
      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${baseX + pos.current.x}px, ${baseY + pos.current.y}px)`;
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  function savePhotos(p: string[]) { setPhotos(p); localStorage.setItem("collagePhotos", JSON.stringify(p)); }
  function saveAdventures(d: AdventuresData) { setAdventures(d); localStorage.setItem("adventures", JSON.stringify(d)); }
  function saveCalendar(u: string) { setCalendarUrl(u); localStorage.setItem("calendarUrl", u); }
  function saveTogetherDate(d: string) { setTogetherDate(d); localStorage.setItem("togetherDate", d); }

  const mainDays = daysUntil(adventures.main.date);

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>

      {/* Layer 1: Panning world canvas */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <div
          ref={worldRef}
          style={{
            position: "absolute",
            width: "4000px",
            height: "3000px",
            willChange: "transform",
            backgroundImage: "linear-gradient(rgba(168,197,216,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(168,197,216,0.4) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            backgroundColor: "#edeae4",
          }}
        >
          {/* Photos or placeholder rects */}
          {photos.length === 0
            ? PLACEHOLDER_RECTS.map((r, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: r.x,
                    top: r.y,
                    width: r.w,
                    height: r.h,
                    background: "rgba(0,0,0,0.08)",
                    border: "3px solid white",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  }}
                />
              ))
            : photos.map((src, i) => {
                const pos = PHOTO_POSITIONS[i % PHOTO_POSITIONS.length];
                const size = 280 + (i % 3) * 80;
                return (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    style={{
                      position: "absolute",
                      left: pos.x,
                      top: pos.y,
                      width: size,
                      height: size * 0.75,
                      objectFit: "cover",
                      border: "3px solid white",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    }}
                  />
                );
              })
          }
        </div>
      </div>

      {/* Layer 2: Fixed dashboard content */}
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        width: "860px",
        maxWidth: "calc(100vw - 40px)",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>

        {/* Card 1: Countdown */}
        <div className="card" style={{ textAlign: "center", position: "relative" }}>
          <button
            onClick={() => setAdventureModalOpen(true)}
            style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#9a8f82" }}
            title="Edit adventures"
          ><Edit2 size={14} /></button>

          <div style={{ fontSize: "5rem", fontFamily: "var(--font-heading)", color: "var(--accent)", lineHeight: 1, marginBottom: 4 }}>
            {mainDays}
          </div>
          <div style={{ fontSize: "0.66rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 12 }}>days</div>
          <div style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "1.7rem", color: "#1a1a18", marginBottom: 4 }}>
            {adventures.main.name}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9a8f82" }}>{formatDate(adventures.main.date)}</div>

          {adventures.upcoming.length > 0 && (
            <>
              <div className="divider" style={{ margin: "20px 0" }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                {adventures.upcoming.map((a, i) => (
                  <div key={i} style={{ textAlign: "center", padding: "8px 16px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 3 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "#1a1a18" }}>{a.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#9a8f82" }}>{formatDate(a.date)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Card 2: This Week */}
        <div className="card" style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--accent)" }}>This Week</h2>
            <button onClick={() => setCalModalOpen(true)} style={{ background: "none", border: "none", color: "#9a8f82" }} title="Calendar settings"><Settings size={14} /></button>
          </div>
          {calendarUrl ? (
            <iframe src={calendarUrl} style={{ width: "100%", height: 300, border: 0, borderRadius: 3 }} title="Google Calendar" />
          ) : (
            <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 3, gap: 10 }}>
              <p style={{ color: "#5a5248", fontSize: "0.85rem" }}>No calendar connected</p>
              <button className="btn-ghost" onClick={() => setCalModalOpen(true)}>Connect Google Calendar</button>
            </div>
          )}
        </div>

        {/* Card 3: Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.63rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 8 }}>Portfolio</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--accent)" }}>
              ${portfolioTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.63rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 8 }}>Savings</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--accent)" }}>
              ${savingsTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setTogetherModalOpen(true)} title="Click to edit start date">
            <div style={{ fontSize: "0.63rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 8 }}>Together</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", color: "var(--accent)" }}>
              {daysSince(togetherDate).toLocaleString()}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#5a5248", marginTop: 4 }}>days</div>
          </div>
        </div>
      </div>

      {/* Layer 3: Photo manager button */}
      <button
        onClick={() => setPhotoModalOpen(true)}
        style={{
          position: "fixed", top: 82, right: 24, zIndex: 20,
          background: "#2a2826", border: "none", borderRadius: 3,
          color: "#b0a898", display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", fontSize: "0.7rem", letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <Camera size={13} /> Photos
      </button>

      {photoModalOpen && <PhotoModal photos={photos} onClose={() => setPhotoModalOpen(false)} onUpdate={savePhotos} />}
      {adventureModalOpen && <AdventureModal data={adventures} onClose={() => setAdventureModalOpen(false)} onSave={saveAdventures} />}
      {calModalOpen && <CalendarModal url={calendarUrl} onClose={() => setCalModalOpen(false)} onSave={saveCalendar} />}
      {togetherModalOpen && <TogetherModal date={togetherDate} onClose={() => setTogetherModalOpen(false)} onSave={saveTogetherDate} />}
    </div>
  );
}
