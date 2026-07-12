"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Edit2, Plus, Camera, LogIn, LogOut, RefreshCw } from "lucide-react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const SCOPES = "https://www.googleapis.com/auth/calendar";

interface Adventure { name: string; date: string; }
interface AdventuresData { main: Adventure; upcoming: Adventure[]; }
interface GCalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

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
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return d; }
}
function fmtFull(d: string) {
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
}
function defaultDate(monthsOut: number) {
  const d = new Date(); d.setMonth(d.getMonth() + monthsOut);
  return d.toISOString().split("T")[0];
}
function eventDate(ev: GCalEvent): string {
  const raw = ev.start.dateTime || ev.start.date || "";
  return raw.split("T")[0];
}
function eventTime(ev: GCalEvent): string {
  if (!ev.start.dateTime) return "All day";
  const d = new Date(ev.start.dateTime);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
        } catch {}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1rem", fontFamily: "var(--font-heading)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Background Photos</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#9a8f82", marginBottom: 16 }}>Photos appear scattered across the canvas. Supports JPG, PNG, HEIC.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 4, overflow: "hidden" }}>
              <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
              <button onClick={() => onUpdate(photos.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 0 }}>
                <X size={11} />
              </button>
            </div>
          ))}
          {photos.length === 0 && <p style={{ color: "#9a8f82", fontSize: "0.82rem", gridColumn: "1/-1" }}>No photos yet.</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.heic,image/heic" multiple style={{ display: "none" }} onChange={handleFiles} />
        <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={loading}>
          {loading ? "Uploading…" : "Add Photos"}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1rem", fontFamily: "var(--font-heading)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Adventures</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 8 }}>Main Countdown</p>
        <input value={main.name} onChange={e => setMain({ ...main, name: e.target.value })} placeholder="Adventure name" style={{ marginBottom: 8 }} />
        <input type="date" value={main.date} onChange={e => setMain({ ...main, date: e.target.value })} style={{ marginBottom: 20 }} />
        <div className="divider" />
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 10 }}>Upcoming</p>
        {upcoming.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={a.name} onChange={e => { const u = [...upcoming]; u[i] = { ...u[i], name: e.target.value }; setUpcoming(u); }} placeholder="Name" style={{ flex: 2 }} />
            <input type="date" value={a.date} onChange={e => { const u = [...upcoming]; u[i] = { ...u[i], date: e.target.value }; setUpcoming(u); }} style={{ flex: 1 }} />
            <button onClick={() => setUpcoming(upcoming.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={14} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add adventure" style={{ flex: 2 }} />
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1 }} />
          <button onClick={add} style={{ background: "none", border: "none", color: "var(--accent)" }}><Plus size={16} /></button>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={() => { onSave({ main, upcoming }); onClose(); }}>Save</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, date: string, time: string, desc: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [allDay, setAllDay] = useState(false);

  async function submit() {
    if (!title || !date) return;
    setSaving(true);
    try { await onAdd(title, date, allDay ? "" : time, desc); onClose(); }
    catch { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1rem", fontFamily: "var(--font-heading)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Add to Calendar</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82", padding: 4 }}><X size={18} /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" style={{ marginBottom: 10 }} autoFocus />
        <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
          {!allDay && <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ flex: 1 }} />}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: "0.8rem", color: "#7a7268", cursor: "pointer" }}>
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} style={{ width: "auto" }} />
          All day
        </label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" style={{ marginBottom: 20, height: 72, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" onClick={submit} disabled={saving || !title}>
            {saving ? "Adding…" : "Add Event"}
          </button>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1rem", fontFamily: "var(--font-heading)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Start Date</h2>
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
  const tokenRef = useRef<string | null>(null);
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [adventures, setAdventures] = useState<AdventuresData>({
    main: { name: "Festival Season", date: defaultDate(6) },
    upcoming: [],
  });
  const [togetherDate, setTogetherDate] = useState("2022-01-01");
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [photoModal, setPhotoModal] = useState(false);
  const [adventureModal, setAdventureModal] = useState(false);
  const [addEventModal, setAddEventModal] = useState(false);
  const [togetherModal, setTogetherModal] = useState(false);

  // Load localStorage data
  useEffect(() => {
    try {
      const p = localStorage.getItem("collagePhotos"); if (p) setPhotos(JSON.parse(p));
      const a = localStorage.getItem("adventures"); if (a) setAdventures(JSON.parse(a));
      const t = localStorage.getItem("togetherDate"); if (t) setTogetherDate(t);
    } catch {}
  }, []);

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !CLIENT_ID) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: { access_token?: string; error?: string }) => {
          if (resp.error || !resp.access_token) { setCalError("Sign-in failed"); return; }
          tokenRef.current = resp.access_token;
          setIsSignedIn(true);
          fetchEvents(resp.access_token);
        },
      });
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
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

  const fetchEvents = useCallback(async (token: string) => {
    setCalLoading(true);
    setCalError("");
    try {
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 14 * 86400000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setCalError("Failed to load events"); setCalLoading(false); return; }
      const data = await res.json();
      setGcalEvents(data.items || []);
    } catch { setCalError("Network error"); }
    setCalLoading(false);
  }, []);

  async function addEventToCalendar(title: string, date: string, time: string, desc: string) {
    if (!tokenRef.current) throw new Error("Not signed in");
    const start = time
      ? { dateTime: `${date}T${time}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      : { date };
    const end = time
      ? { dateTime: `${date}T${String(parseInt(time) + 1).padStart(2,"0")}:${time.split(":")[1]}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      : { date };
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}`, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: title, description: desc, start, end }),
      }
    );
    if (!res.ok) throw new Error("Failed to create event");
    await fetchEvents(tokenRef.current);
  }

  function signIn() { tokenClientRef.current?.requestAccessToken(); }
  function signOut() {
    if (tokenRef.current && window.google) {
      window.google.accounts.oauth2.revoke(tokenRef.current, () => {});
    }
    tokenRef.current = null;
    setIsSignedIn(false);
    setGcalEvents([]);
  }

  function savePhotos(p: string[]) { setPhotos(p); localStorage.setItem("collagePhotos", JSON.stringify(p)); }
  function saveAdventures(d: AdventuresData) { setAdventures(d); localStorage.setItem("adventures", JSON.stringify(d)); }
  function saveTogetherDate(d: string) { setTogetherDate(d); localStorage.setItem("togetherDate", d); }

  const mainDays = daysUntil(adventures.main.date);

  const [portfolioVal, setPortfolioVal] = useState("—");
  const [savingsVal, setSavingsVal] = useState("—");
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("stockHoldings") || "[]");
      if (h.length) setPortfolioVal(`${h.length} stock${h.length > 1 ? "s" : ""}`);
      const s = JSON.parse(localStorage.getItem("savings") || "[]");
      const total = s.reduce((sum: number, a: { amount: number }) => sum + Number(a.amount), 0);
      if (s.length) setSavingsVal(`$${total.toLocaleString()}`);
    } catch {}
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "rgba(250,247,242,0.96)",
    border: "3px solid #1a1a18",
    borderRadius: 18,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    padding: "20px 22px",
    boxShadow: "6px 6px 0 #1a1a18",
    overflow: "hidden",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.58rem", letterSpacing: "0.22em", textTransform: "uppercase",
    color: "#b0a898", fontFamily: "var(--font-body)",
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* ── Canvas ── */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <div ref={worldRef} style={{
          position: "absolute", width: 4000, height: 3000, willChange: "transform",
          backgroundImage: "linear-gradient(rgba(168,197,216,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(168,197,216,0.45) 1px, transparent 1px)",
          backgroundSize: "50px 50px", backgroundColor: "#edeae4",
        }}>
          {photos.length === 0
            ? PHOTO_SLOTS.map((r, i) => (
                <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
                  background: "rgba(0,0,0,0.05)", border: "3px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.07)", borderRadius: 4 }} />
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
        position: "fixed", top: 84, right: 24, zIndex: 20,
        background: "rgba(250,247,242,0.95)", border: "2px solid #1a1a18",
        borderRadius: 999, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6,
        fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase",
        fontFamily: "var(--font-body)", color: "#5a5550",
        backdropFilter: "blur(8px)", boxShadow: "3px 3px 0 #1a1a18",
      }}>
        <Camera size={12} /> Photos
      </button>

      {/* ── 2×2 Dashboard Grid ── */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        width: "min(960px, calc(100vw - 40px))",
        height: "min(600px, calc(100vh - 120px))",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 14,
      }}>

        {/* TOP LEFT — Google Calendar */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={labelStyle}>This Week</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isSignedIn && (
                <>
                  <button onClick={() => tokenRef.current && fetchEvents(tokenRef.current)}
                    style={{ background: "none", border: "none", color: "#b0a898", padding: 2, display: "flex" }} title="Refresh">
                    <RefreshCw size={11} />
                  </button>
                  <button onClick={() => setAddEventModal(true)}
                    style={{ background: "none", border: "none", color: "var(--accent)", padding: 2, display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                    <Plus size={12} /> Add
                  </button>
                  <button onClick={signOut}
                    style={{ background: "none", border: "none", color: "#c0b8b0", padding: 2, display: "flex" }} title="Sign out">
                    <LogOut size={11} />
                  </button>
                </>
              )}
            </div>
          </div>

          {!isSignedIn ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <p style={{ color: "#9a8f82", fontSize: "0.8rem", textAlign: "center" }}>Connect your Google Calendar</p>
              <button onClick={signIn} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <LogIn size={13} /> Sign in with Google
              </button>
            </div>
          ) : calLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#b0a898", fontSize: "0.8rem" }}>Loading…</p>
            </div>
          ) : calError ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <p style={{ color: "#c0a090", fontSize: "0.8rem" }}>{calError}</p>
              <button onClick={() => tokenRef.current && fetchEvents(tokenRef.current)} className="btn-ghost" style={{ fontSize: "0.65rem" }}>Retry</button>
            </div>
          ) : gcalEvents.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <p style={{ color: "#b0a898", fontSize: "0.8rem" }}>Nothing in the next 2 weeks</p>
              <button onClick={() => setAddEventModal(true)} className="btn-ghost" style={{ fontSize: "0.65rem" }}>Add an event</button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {gcalEvents.map(ev => (
                <div key={ev.id} className="row-box" style={{ padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", color: "#1a1a18", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.summary}</div>
                    {ev.description && <div style={{ fontSize: "0.72rem", color: "#9a8f82", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.description}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--accent)" }}>{fmt(eventDate(ev))}</div>
                    <div style={{ fontSize: "0.65rem", color: "#b0a898" }}>{eventTime(ev)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOP RIGHT — Adventure Countdown */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
          <button onClick={() => setAdventureModal(true)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "#c0b8b0" }}>
            <Edit2 size={13} />
          </button>
          <div style={{
            width: 116, height: 116, borderRadius: "50%",
            background: "var(--accent)", border: "3px solid #1a1a18", boxShadow: "4px 4px 0 #1a1a18",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <span style={{ fontSize: "2.6rem", fontFamily: "var(--font-display)", color: "#fff", lineHeight: 1 }}>
              {mainDays}
            </span>
          </div>
          <div style={{ ...labelStyle, marginBottom: 10 }}>days until</div>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.4rem", color: "#1a1a18", marginBottom: 3 }}>
            {adventures.main.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9a8f82" }}>{fmtFull(adventures.main.date)}</div>
          {adventures.upcoming.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {adventures.upcoming.map((a, i) => (
                <div key={i} style={{ padding: "4px 10px", border: "2px solid #1a1a18", borderRadius: 999, fontSize: "0.68rem", color: "#3a3630", fontWeight: 500 }}>
                  {a.name} · {fmt(a.date)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM LEFT — Quick Stats */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span style={labelStyle}>At a Glance</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, justifyContent: "center" }}>
            {[
              { label: "Portfolio", value: portfolioVal },
              { label: "Savings", value: savingsVal },
              { label: "Together", value: `${daysSince(togetherDate)} days`, onClick: () => setTogetherModal(true) },
            ].map(stat => (
              <div key={stat.label} onClick={stat.onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: stat.onClick ? "pointer" : "default" }}>
                <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a8f82" }}>{stat.label}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", color: "#1a1a18" }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM RIGHT — Adventures list */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={labelStyle}>Adventures</span>
            <button onClick={() => setAdventureModal(true)} style={{ background: "none", border: "none", color: "#c0b8b0" }}><Edit2 size={13} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="row-box" style={{ padding: "9px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1rem" }}>{adventures.main.name}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 500 }}>{mainDays}d</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "#9a8f82", marginTop: 2 }}>{fmtFull(adventures.main.date)}</div>
            </div>
            {adventures.upcoming.map((a, i) => (
              <div key={i} className="row-box" style={{ padding: "9px 12px" }}>
                <div style={{ fontSize: "0.88rem", color: "#1a1a18" }}>{a.name}</div>
                <div style={{ fontSize: "0.7rem", color: "#9a8f82", marginTop: 2 }}>{fmtFull(a.date)}</div>
              </div>
            ))}
            {adventures.upcoming.length === 0 && (
              <p style={{ color: "#b0a898", fontSize: "0.78rem", padding: "14px 0" }}>No upcoming adventures yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {photoModal && <PhotoModal photos={photos} onClose={() => setPhotoModal(false)} onUpdate={savePhotos} />}
      {adventureModal && <AdventureModal data={adventures} onClose={() => setAdventureModal(false)} onSave={saveAdventures} />}
      {addEventModal && <AddEventModal onClose={() => setAddEventModal(false)} onAdd={addEventToCalendar} />}
      {togetherModal && <TogetherModal date={togetherDate} onClose={() => setTogetherModal(false)} onSave={saveTogetherDate} />}
    </div>
  );
}

// Extend window for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}
