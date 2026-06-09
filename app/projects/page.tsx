"use client";
import { useState, useEffect } from "react";
import { X, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface CompletedProject {
  id: string;
  title: string;
  completedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [completed, setCompleted] = useState<CompletedProject[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  // New project form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Completing animation
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    try { const p = localStorage.getItem("projects"); if (p) setProjects(JSON.parse(p)); } catch {}
    try { const c = localStorage.getItem("completedProjects"); if (c) setCompleted(JSON.parse(c)); } catch {}
  }, []);

  function saveProjects(arr: Project[]) {
    setProjects(arr);
    localStorage.setItem("projects", JSON.stringify(arr));
  }

  function saveCompleted(arr: CompletedProject[]) {
    setCompleted(arr);
    localStorage.setItem("completedProjects", JSON.stringify(arr));
  }

  function addProject() {
    if (!newTitle.trim()) return;
    const maxOrder = projects.length > 0 ? Math.max(...projects.map((p) => p.order)) : -1;
    const proj: Project = { id: uid(), title: newTitle.trim(), description: newDesc.trim(), order: maxOrder + 1 };
    saveProjects([...projects, proj]);
    setNewTitle("");
    setNewDesc("");
  }

  function deleteProject(id: string) {
    saveProjects(projects.filter((p) => p.id !== id));
  }

  function completeProject(id: string) {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    setCompleting(id);
    setTimeout(() => {
      saveCompleted([...completed, { id: uid(), title: proj.title, completedAt: new Date().toISOString().split("T")[0] }]);
      saveProjects(projects.filter((p) => p.id !== id));
      setCompleting(null);
    }, 400);
  }

  function moveUp(id: string) {
    const idx = sorted.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const arr = [...projects];
    const a = arr.findIndex((p) => p.id === sorted[idx].id);
    const b = arr.findIndex((p) => p.id === sorted[idx - 1].id);
    const tmpOrder = arr[a].order;
    arr[a] = { ...arr[a], order: arr[b].order };
    arr[b] = { ...arr[b], order: tmpOrder };
    saveProjects(arr);
  }

  function moveDown(id: string) {
    const idx = sorted.findIndex((p) => p.id === id);
    if (idx >= sorted.length - 1) return;
    const arr = [...projects];
    const a = arr.findIndex((p) => p.id === sorted[idx].id);
    const b = arr.findIndex((p) => p.id === sorted[idx + 1].id);
    const tmpOrder = arr[a].order;
    arr[a] = { ...arr[a], order: arr[b].order };
    arr[b] = { ...arr[b], order: tmpOrder };
    saveProjects(arr);
  }

  function uncomplete(id: string) {
    const cp = completed.find((c) => c.id === id);
    if (!cp) return;
    const maxOrder = projects.length > 0 ? Math.max(...projects.map((p) => p.order)) : -1;
    saveProjects([...projects, { id: uid(), title: cp.title, description: "", order: maxOrder + 1 }]);
    saveCompleted(completed.filter((c) => c.id !== id));
  }

  function deleteCompleted(id: string) {
    saveCompleted(completed.filter((c) => c.id !== id));
  }

  const sorted = [...projects].sort((a, b) => a.order - b.order);

  return (
    <div className="grid-bg">
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Active Projects */}
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--accent)" }}>Our Projects</h1>
          <button
            className={editMode ? "btn-primary" : "btn-ghost"}
            onClick={() => setEditMode(!editMode)}
            style={{ fontSize: "0.68rem" }}
          >
            {editMode ? "Done" : "Edit"}
          </button>
        </div>

        {sorted.length === 0 && (
          <p style={{ color: "#5a5248", fontSize: "0.85rem", textAlign: "center", padding: "16px 0" }}>
            No projects yet. Add one below.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((proj, idx) => (
            <div
              key={proj.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                border: "1px solid var(--border)",
                borderRadius: 3,
                opacity: completing === proj.id ? 0 : 1,
                transition: "opacity 0.4s ease",
                background: "transparent",
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => !editMode && completeProject(proj.id)}
                style={{
                  width: 18,
                  height: 18,
                  border: "1px solid var(--border)",
                  borderRadius: 2,
                  background: "transparent",
                  flexShrink: 0,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: editMode ? "default" : "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => { if (!editMode) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
              />

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", color: "#1a1a18" }}>{proj.title}</div>
                {proj.description && (
                  <div style={{ fontSize: "0.78rem", color: "#9a8f82", marginTop: 2 }}>{proj.description}</div>
                )}
              </div>

              {/* Edit controls */}
              {editMode && (
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                  <button
                    onClick={() => moveUp(proj.id)}
                    disabled={idx === 0}
                    style={{ background: "none", border: "none", color: idx === 0 ? "#c8c0b8" : "#9a8f82", padding: 3 }}
                  ><ChevronUp size={14} /></button>
                  <button
                    onClick={() => moveDown(proj.id)}
                    disabled={idx === sorted.length - 1}
                    style={{ background: "none", border: "none", color: idx === sorted.length - 1 ? "#c8c0b8" : "#9a8f82", padding: 3 }}
                  ><ChevronDown size={14} /></button>
                  <button onClick={() => deleteProject(proj.id)} style={{ background: "none", border: "none", color: "#9a8f82", padding: 3 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add project form */}
        {editMode && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: "0.66rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a8f82", marginBottom: 10 }}>Add Project</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Project title" onKeyDown={(e) => e.key === "Enter" && addProject()} />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" onKeyDown={(e) => e.key === "Enter" && addProject()} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" onClick={addProject} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={13} /> Add Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completed Projects */}
      <div className="card" style={{ padding: 32 }}>
        <button
          onClick={() => setCompletedOpen(!completedOpen)}
          style={{
            background: "none",
            border: "none",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "#9a8f82" }}>
            Completed ({completed.length})
          </h2>
          <span style={{ color: "#9a8f82" }}>
            {completedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {completedOpen && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {completed.length === 0 && (
              <p style={{ color: "#5a5248", fontSize: "0.85rem", textAlign: "center", padding: "8px 0" }}>Nothing completed yet.</p>
            )}
            {completed.map((cp) => (
              <div key={cp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 3, opacity: 0.7 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "#1a1a18", textDecoration: "line-through", textDecorationColor: "var(--border)" }}>{cp.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "#5a5248", marginTop: 2 }}>{formatDate(cp.completedAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => uncomplete(cp.id)}
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: 2, color: "#9a8f82", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px", cursor: "pointer" }}
                  >
                    Restore
                  </button>
                  <button onClick={() => deleteCompleted(cp.id)} style={{ background: "none", border: "none", color: "#9a8f82" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
