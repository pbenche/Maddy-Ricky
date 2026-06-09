"use client";
import { useState, useEffect, useRef } from "react";
import { X, Edit2, Plus, Settings, Camera } from "lucide-react";

interface Adventure { name: string; date: string; }
interface AdventuresData { main: Adventure; upcoming: Adventure[]; }
interface CalEvent { id: string; title: string; date: string; time: string; description: string; }

function daysUntil(d: string) {
  const t = new Date(d); t.setHours(0,0,0,0);
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t.getTime() - n.getTime()) / 86400000);
}
function daysSince(d: string) {
  const s = new Date(d); s.setHours(0,0,0,0);
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.floor((n.getTime() - s.getTime()) / 86400000);
}
function fmt(d: string) {
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
}
function defaultDate(monthsOut: number) {
  const d = new Date(); d.setMonth(d.getMonth() + monthsOut);
  return d.toISOString().split("T")[0];
}

const PHOTO_SLOTS = [
  { x: 80,   y: 60,   w: 340, h: 440 },
  { x: 3120, y: 40,   w: 400, h: 300 },
  { x: 160,  y: 1820, w: 440, h: 580 },
  { x: 3180, y: 580,  w: 520, h: 400 },
  { x: 2980, y: 1780, w: 340, h: 440 },
  { x: 580,  y: 2520, w: 300, h: 380 },
  { x: 3380, y: 2380, w: 380, h: 300 },
  { x: 60,   y: 1180, w: 220, h: 300 },
  { x: 2780, y: 180,  w: 260, h: 340 },
  { x: 680,  y: 380,  w: 200, h: 260 },
  { x: 1380, y: 180,  w: 300, h: 220 },
  { x: 1480, y: 2580, w: 320, h: 240 },
];

// ─── Photo Modal ──────────────────────────────────────────────────────────────
function PhotoModal({ photos, onClose, onUpdate }: { photos: string[]; onClose: () => void; onUpdate: (p: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLoading(true);
    const results: string[] = [];
    for (const file of files) {
      let blob: Blob = file;
      if (/\.heic$/i.test(file.name) || file.type === "image/heic") {
        try {
          const heic2any = (await import("heic2any")).default;
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
          blob = Array.isArray(converted) ? converted[0] : converted;
        } catch { /* use original */ }
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
    setLoading(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.3rem", fontFamily: "var(--font-heading)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Background Photos</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#9a8f82", marginBottom: 16 }}>Photos appear scattered across the canvas behind your dashboard.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 4, overflow: "hidden" }}>
              <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
              <button onClick={() => onUpdate(photos.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 0 }}>
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length === 0 && <p style={{ color: "#9a8f82", fontSize: "0.82rem", gridColumn: "1/-1" }}>No photos yet.</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.heic,image/heic" multiple style={{ display: "none" }} onChange={handleFiles} />
        <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={loading}>
          {loading ? "Uploading..." : "Add Photos"}
        </button>
      </div>
    </div>
  );
}

// ─── Adventure Modal ──────────────────────────────────────────────────────────
function AdventureModal({ data, onClose, onSave }: { data: AdventuresData; onClose: () => void; onSave: (d: AdventuresData) => void }) {
  const [main, setMain] = useState({ ...data.main });
  const [upcoming, setUpcoming] = useState(data.upcoming.map(a => ({ ...a })));
  const [newName, setNewName] = useState(""); const [newDate, setNewDate] = useState("");
  function add() { if (!newName || !newDate) return; setUpcoming([...upcoming, { name: newName, date: newDate }]); setNewName(""); setNewDate(""); }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.3rem", fontFamily: "var(--font-heading)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Adventures</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 8 }}>Main Countdown</p>
        <input value={main.name} onChange={e => setMain({ ...main, name: e.target.value })} placeholder="Adventure name" style={{ marginBottom: 8 }} />
        <input type="date" value={main.date} onChange={e => setMain({ ...main, date: e.target.value })} style={{ marginBottom: 20 }} />
        <div className="divider" />
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 10 }}>Upcoming (no countdown)</p>
        {upcoming.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={a.name} onChange={e => { const u = [...upcoming]; u[i] = { ...u[i], name: e.target.value }; setUpcoming(u); }} placeholder="Name" style={{ flex: 2 }} />
            <input type="date" value={a.date} onChange={e => { const u = [...upcoming]; u[i] = { ...u[i], date: e.target.value }; setUpcoming(u); }} style={{ flex: 1 }} />
            <button onClick={() => setUpcoming(upcoming.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={14} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add adventure" style={{ flex: 2 }} />
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1 }} />
          <button onClick={add} style={{ background: "none", border: "none", color: "var(--accent)", padding: 4 }}><Plus size={16} /></button>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={() => { onSave({ main, upcoming }); onClose(); }}>Save</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Modal (Add Event) ───────────────────────────────────────────────
function AddEventModal({ events, onClose, onSave }: { events: CalEvent[]; onClose: () => void; onSave: (e: CalEvent[]) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  const [desc, setDesc] = useState("");
  function add() {
    if (!title || !date) return;
    const ev: CalEvent = { id: Date.now().toString(), title, date, time, description: desc };
    onSave([...events, ev]);
    onClose();
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.3rem", fontFamily: "var(--font-heading)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Add Event</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ flex: 1 }} />
        </div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" style={{ marginBottom: 20, height: 80, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={add}>Add Event</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.3rem", fontFamily: "var(--font-heading)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Start Date</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <input type="date" value={val} onChange={e => setVal(e.target.value)} style={{ marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={() => { onSave(val); onClose(); }}>Save</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const worldRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  const [photos, setPhotos] = useState<string[]>([]);
  const [adventures, setAdventures] = useState<AdventuresData>({
    main: { name: "Festival Season", date: defaultDate(6) },
    upcoming: [],
  });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [togetherDate, setTogetherDate] = useState("2022-01-01");
  const [photoModal, setPhotoModal] = useState(false);
  const [adventureModal, setAdventureModal] = useState(false);
  const [addEventModal, setAddEventModal] = useState(false);
  const [togetherModal, setTogetherModal] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem("collagePhotos"); if (p) setPhotos(JSON.parse(p));
      const a = localStorage.getItem("adventures"); if (a) setAdventures(JSON.parse(a));
      const e = localStorage.getItem("calEvents"); if (e) setEvents(JSON.parse(e));
      const t = localStorage.getItem("togetherDate"); if (t) setTogetherDate(t);
    } catch {}
  }, []);

  // Panning animation
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      target.current = { x: (e.clientX - cx) * -0.1, y: (e.clientY - cy) * -0.1 };
    };
    window.addEventListener("mousemove", onMove);
    let raf: number;
    const animate = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.05;
      pos.current.y += (target.current.y - pos.current.y) * 0.05;
      if (worldRef.current) {
        const bx = -2000 + window.innerWidth / 2;
        const by = -1500 + window.innerHeight / 2;
        worldRef.current.style.transform = `translate(${bx + pos.current.x}px, ${by + pos.current.y}px)`;
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  function savePhotos(p: string[]) { setPhotos(p); localStorage.setItem("collagePhotos", JSON.stringify(p)); }
  function saveAdventures(d: AdventuresData) { setAdventures(d); localStorage.setItem("adventures", JSON.stringify(d)); }
  function saveEvents(e: CalEvent[]) { setEvents(e); localStorage.setItem("calEvents", JSON.stringify(e)); }
  function saveTogetherDate(d: string) { setTogetherDate(d); localStorage.setItem("togetherDate", d); }

  const mainDays = daysUntil(adventures.main.date);

  // This week's events
  const today = new Date(); today.setHours(0,0,0,0);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = events
    .filter(e => { const d = new Date(e.date + "T12:00:00"); return d >= today && d <= weekEnd; })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Finance totals from localStorage
  const [portfolioVal, setPortfolioVal] = useState("—");
  const [savingsVal, setSavingsVal] = useState("—");
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("stockHoldings") || "[]");
      if (h.length) setPortfolioVal(`${h.length} holdings`);
      const s = JSON.parse(localStorage.getItem("savings") || "[]");
      const total = s.reduce((sum: number, a: { amount: number }) => sum + Number(a.amount), 0);
      if (s.length) setSavingsVal(`$${total.toLocaleString()}`);
    } catch {}
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "rgba(245,242,238,0.92)",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 14,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    padding: "22px 24px",
    boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
    overflow: "hidden",
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* ── Panning canvas ── */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <div ref={worldRef} style={{
          position: "absolute", width: 4000, height: 3000, willChange: "transform",
          backgroundImage: "linear-gradient(rgba(168,197,216,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(168,197,216,0.45) 1px, transparent 1px)",
          backgroundSize: "50px 50px", backgroundColor: "#edeae4",
        }}>
          {photos.length === 0
            ? PHOTO_SLOTS.map((r, i) => (
                <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
                  background: "rgba(0,0,0,0.06)", border: "3px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 4 }} />
              ))
            : photos.map((src, i) => {
                const s = PHOTO_SLOTS[i % PHOTO_SLOTS.length];
                return (
                  <img key={i} src={src} alt="" style={{
                    position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h,
                    objectFit: "cover", border: "3px solid white",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.14)", borderRadius: 4,
                  }} />
                );
              })
          }
        </div>
      </div>

      {/* ── Photos button ── */}
      <button onClick={() => setPhotoModal(true)} style={{
        position: "fixed", top: 88, right: 24, zIndex: 20,
        background: "rgba(245,242,238,0.9)", border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 999, padding: "7px 16px", display: "flex", alignItems: "center", gap: 6,
        fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase",
        fontFamily: "var(--font-body)", color: "#5a5550",
        backdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <Camera size={13} /> Photos
      </button>

      {/* ── Dashboard grid ── */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10, width: "min(940px, calc(100vw - 40px))",
        display: "grid",
        gridTemplateRows: "1fr 1fr",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        height: "min(600px, calc(100vh - 130px))",
      }}>

        {/* TOP LEFT — Calendar / Events */}
        <div style={{ ...cardStyle, gridRow: "1", gridColumn: "1", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9a8f82", fontFamily: "var(--font-body)" }}>This Week</span>
            <button onClick={() => setAddEventModal(true)} style={{ background: "none", border: "none", color: "var(--accent)", padding: 2, display: "flex", alignItems: "center", gap: 4, fontSize: "0.68rem", letterSpacing: "0.1em" }}>
              <Plus size={13} /> Add
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {thisWeek.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <p style={{ color: "#b0a898", fontSize: "0.82rem" }}>Nothing this week</p>
                <button onClick={() => setAddEventModal(true)} className="btn-ghost" style={{ fontSize: "0.65rem" }}>Add an event</button>
              </div>
            ) : (
              thisWeek.map(e => (
                <div key={e.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontFamily: "var(--font-body)", color: "#1a1a18", fontWeight: 500 }}>{e.title}</div>
                    {e.description && <div style={{ fontSize: "0.74rem", color: "#9a8f82", marginTop: 2 }}>{e.description}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--accent)" }}>{fmt(e.date)}</div>
                    {e.time && <div style={{ fontSize: "0.68rem", color: "#b0a898" }}>{e.time}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
          {events.length > 0 && (
            <div style={{ marginTop: 8, fontSize: "0.7rem", color: "#b0a898" }}>{events.length} total event{events.length !== 1 ? "s" : ""}</div>
          )}
        </div>

        {/* TOP RIGHT — Adventure Countdown */}
        <div style={{ ...cardStyle, gridRow: "1", gridColumn: "2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
          <button onClick={() => setAdventureModal(true)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "#c0b8b0", padding: 2 }}>
            <Edit2 size={13} />
          </button>
          <div style={{ fontSize: "4.5rem", fontFamily: "var(--font-display)", color: "var(--accent)", lineHeight: 1, marginBottom: 2 }}>
            {mainDays}
          </div>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "#b0a898", marginBottom: 10 }}>days</div>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.4rem", color: "#1a1a18", marginBottom: 3 }}>
            {adventures.main.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9a8f82" }}>{fmt(adventures.main.date)}</div>
          {adventures.upcoming.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {adventures.upcoming.map((a, i) => (
                <div key={i} style={{ padding: "5px 12px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 999, fontSize: "0.72rem", color: "#7a7268" }}>
                  {a.name} · {fmt(a.date)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM LEFT — Quick Stats */}
        <div style={{ ...cardStyle, gridRow: "2", gridColumn: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9a8f82", fontFamily: "var(--font-body)" }}>At a Glance</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
            {[
              { label: "Portfolio", value: portfolioVal },
              { label: "Savings", value: savingsVal },
              { label: "Together", value: `${daysSince(togetherDate)} days`, onClick: () => setTogetherModal(true) },
            ].map(stat => (
              <div key={stat.label} onClick={stat.onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: stat.onClick ? "pointer" : "default" }}>
                <span style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a8f82" }}>{stat.label}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "#1a1a18" }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM RIGHT — Upcoming Adventures list */}
        <div style={{ ...cardStyle, gridRow: "2", gridColumn: "2", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9a8f82", fontFamily: "var(--font-body)" }}>Adventures</span>
            <button onClick={() => setAdventureModal(true)} style={{ background: "none", border: "none", color: "#c0b8b0", padding: 2 }}><Edit2 size={13} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.05rem" }}>{adventures.main.name}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 500 }}>{mainDays}d</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#9a8f82", marginTop: 2 }}>{fmt(adventures.main.date)}</div>
            </div>
            {adventures.upcoming.map((a, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.88rem", color: "#1a1a18" }}>{a.name}</div>
                <div style={{ fontSize: "0.72rem", color: "#9a8f82", marginTop: 2 }}>{fmt(a.date)}</div>
              </div>
            ))}
            {adventures.upcoming.length === 0 && (
              <p style={{ color: "#b0a898", fontSize: "0.8rem", padding: "16px 0" }}>Add upcoming adventures via the edit button.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {photoModal && <PhotoModal photos={photos} onClose={() => setPhotoModal(false)} onUpdate={savePhotos} />}
      {adventureModal && <AdventureModal data={adventures} onClose={() => setAdventureModal(false)} onSave={saveAdventures} />}
      {addEventModal && <AddEventModal events={events} onClose={() => setAddEventModal(false)} onSave={saveEvents} />}
      {togetherModal && <TogetherModal date={togetherDate} onClose={() => setTogetherModal(false)} onSave={saveTogetherDate} />}
    </div>
  );
}
