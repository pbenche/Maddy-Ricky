"use client";
import { useState, useEffect, useRef } from "react";
import { X, Edit2, Trash2, Plus } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Holding {
  id: string;
  symbol: string;
  shares: number;
  buyPrice: number;
  buyDate: string;
}

interface SavingsAccount {
  id: string;
  name: string;
  amount: number;
  currency: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes) return null;
    const valid = closes.filter((v: number | null) => v != null);
    return valid.length > 0 ? valid[valid.length - 1] : null;
  } catch {
    return null;
  }
}

// ─── Holding Modal ─────────────────────────────────────────────────────────────
function HoldingModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Holding;
  onClose: () => void;
  onSave: (h: Holding) => void;
}) {
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [shares, setShares] = useState(initial?.shares?.toString() ?? "");
  const [buyPrice, setBuyPrice] = useState(initial?.buyPrice?.toString() ?? "");
  const [buyDate, setBuyDate] = useState(initial?.buyDate ?? new Date().toISOString().split("T")[0]);

  function handleSave() {
    if (!symbol || !shares || !buyPrice) return;
    onSave({
      id: initial?.id ?? uid(),
      symbol: symbol.toUpperCase().trim(),
      shares: parseFloat(shares),
      buyPrice: parseFloat(buyPrice),
      buyDate,
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", color: "var(--accent)" }}>
            {initial ? "Edit Holding" : "Add Holding"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL" />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Shares</label>
            <input type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="10" min="0" step="any" />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Buy Price (USD)</label>
            <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="150.00" min="0" step="any" />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Buy Date</label>
            <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Savings Modal ─────────────────────────────────────────────────────────────
function SavingsModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: SavingsAccount;
  onClose: () => void;
  onSave: (s: SavingsAccount) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");

  function handleSave() {
    if (!name || !amount) return;
    onSave({ id: initial?.id ?? uid(), name, amount: parseFloat(amount), currency });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", color: "var(--accent)" }}>
            {initial ? "Edit Account" : "Add Account"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8f82" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Account Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency Fund" />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" min="0" step="any" />
          </div>
          <div>
            <label style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", display: "block", marginBottom: 6 }}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Chart Section ─────────────────────────────────────────────────────────────
function PortfolioChart({ holdings, currentPrices }: { holdings: Holding[]; currentPrices: Record<string, number | null> }) {
  if (holdings.length === 0) return null;

  // Build date range from earliest buy date to today
  const today = new Date();
  const dates: string[] = [];
  let earliest = today;
  for (const h of holdings) {
    const d = new Date(h.buyDate + "T12:00:00");
    if (d < earliest) earliest = d;
  }

  const cur = new Date(earliest);
  while (cur <= today) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 7);
  }
  if (dates[dates.length - 1] !== today.toISOString().split("T")[0]) {
    dates.push(today.toISOString().split("T")[0]);
  }

  // For each holding, interpolate value over time (buy price → current price)
  const colors = ["#c9a96e", "#a0c4aa", "#8fadd4", "#c9a0a0", "#c9c3a0"];

  const datasets = holdings.map((h, i) => {
    const buyDate = new Date(h.buyDate + "T12:00:00");
    const currentPrice = currentPrices[h.symbol] ?? h.buyPrice;
    const data = dates.map((d) => {
      const dt = new Date(d + "T12:00:00");
      if (dt < buyDate) return null;
      const totalMs = today.getTime() - buyDate.getTime();
      const elapsedMs = dt.getTime() - buyDate.getTime();
      const progress = totalMs === 0 ? 1 : Math.min(elapsedMs / totalMs, 1);
      const price = h.buyPrice + (currentPrice - h.buyPrice) * progress;
      return h.shares * price;
    });
    return {
      label: h.symbol,
      data,
      borderColor: colors[i % colors.length],
      backgroundColor: "transparent",
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.3,
      spanGaps: false,
    };
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#9a8f82", font: { size: 11 }, boxWidth: 12 },
      },
      tooltip: {
        backgroundColor: "rgba(245,242,238,0.97)",
        borderColor: "rgba(201,169,110,0.3)",
        borderWidth: 1,
        titleColor: "#c9a96e",
        bodyColor: "#1a1a18",
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#5a5248", font: { size: 10 }, maxTicksLimit: 8 },
        grid: { color: "rgba(0,0,0,0.06)" },
        border: { color: "rgba(0,0,0,0.1)" },
      },
      y: {
        ticks: {
          color: "#5a5248",
          font: { size: 10 },
          callback: (v: string | number) => `$${Number(v).toLocaleString()}`,
        },
        grid: { color: "rgba(0,0,0,0.08)" },
        border: { color: "rgba(0,0,0,0.1)" },
      },
    },
  };

  return (
    <div style={{ height: 260, position: "relative" }}>
      <Line data={{ labels: dates, datasets }} options={options as Parameters<typeof Line>[0]["options"]} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number | null>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [holdingModal, setHoldingModal] = useState<{ open: boolean; editing?: Holding }>({ open: false });

  const [savings, setSavings] = useState<SavingsAccount[]>([]);
  const [savingsModal, setSavingsModal] = useState<{ open: boolean; editing?: SavingsAccount }>({ open: false });

  useEffect(() => {
    try { const h = localStorage.getItem("stockHoldings"); if (h) setHoldings(JSON.parse(h)); } catch {}
    try { const sv = localStorage.getItem("savings"); if (sv) setSavings(JSON.parse(sv)); } catch {}
  }, []);

  // Fetch prices whenever holdings change
  useEffect(() => {
    if (holdings.length === 0) return;
    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    setLoadingPrices(true);
    Promise.all(
      symbols.map(async (sym) => ({ sym, price: await fetchCurrentPrice(sym) }))
    ).then((results) => {
      const map: Record<string, number | null> = {};
      results.forEach(({ sym, price }) => { map[sym] = price; });
      setCurrentPrices(map);
      setLoadingPrices(false);
    });
  }, [holdings]);

  function saveHoldings(h: Holding[]) {
    setHoldings(h);
    localStorage.setItem("stockHoldings", JSON.stringify(h));
  }

  function addOrUpdateHolding(h: Holding) {
    const existing = holdings.findIndex((x) => x.id === h.id);
    if (existing >= 0) {
      const updated = [...holdings];
      updated[existing] = h;
      saveHoldings(updated);
    } else {
      saveHoldings([...holdings, h]);
    }
  }

  function deleteHolding(id: string) {
    saveHoldings(holdings.filter((h) => h.id !== id));
  }

  function saveSavings(arr: SavingsAccount[]) {
    setSavings(arr);
    localStorage.setItem("savings", JSON.stringify(arr));
  }

  function addOrUpdateSavings(s: SavingsAccount) {
    const existing = savings.findIndex((x) => x.id === s.id);
    if (existing >= 0) {
      const updated = [...savings];
      updated[existing] = s;
      saveSavings(updated);
    } else {
      saveSavings([...savings, s]);
    }
  }

  function deleteSavings(id: string) {
    saveSavings(savings.filter((s) => s.id !== id));
  }

  const portfolioTotal = holdings.reduce((sum, h) => {
    const cur = currentPrices[h.symbol];
    return sum + h.shares * (cur ?? h.buyPrice);
  }, 0);

  const savingsTotal = savings.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="grid-bg">
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Section 1: Holdings */}
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", color: "var(--accent)", marginBottom: 2 }}>Portfolio</h1>
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.4rem", color: "#1a1a18" }}>
              {formatCurrency(portfolioTotal)}
              {loadingPrices && <span style={{ fontSize: "0.7rem", color: "#5a5248", marginLeft: 10, fontFamily: "var(--font-inter)" }}>updating…</span>}
            </div>
          </div>
          <button className="btn-primary" onClick={() => setHoldingModal({ open: true })} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} /> Add
          </button>
        </div>

        {holdings.length === 0 ? (
          <p style={{ color: "#5a5248", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>No holdings yet. Add your first stock above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr>
                  {["Symbol", "Shares", "Buy Price", "Current", "P&L", "P&L %"].map((col) => (
                    <th key={col} style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.63rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f82", borderBottom: "1px solid var(--border)", fontWeight: 400 }}>
                      {col}
                    </th>
                  ))}
                  <th style={{ width: 70, borderBottom: "1px solid var(--border)" }} />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const cur = currentPrices[h.symbol];
                  const pnl = cur != null ? h.shares * (cur - h.buyPrice) : null;
                  const pnlPct = cur != null ? ((cur - h.buyPrice) / h.buyPrice) * 100 : null;
                  const pnlColor = pnl == null ? "#9a8f82" : pnl >= 0 ? "#7ec99a" : "#c97e7e";
                  return (
                    <tr key={h.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--accent)" }}>{h.symbol}</td>
                      <td style={{ padding: "10px 12px", color: "#1a1a18" }}>{h.shares}</td>
                      <td style={{ padding: "10px 12px", color: "#1a1a18" }}>{formatCurrency(h.buyPrice)}</td>
                      <td style={{ padding: "10px 12px", color: "#1a1a18" }}>{cur != null ? formatCurrency(cur) : <span style={{ color: "#5a5248" }}>--</span>}</td>
                      <td style={{ padding: "10px 12px", color: pnlColor }}>{pnl != null ? (pnl >= 0 ? "+" : "") + formatCurrency(pnl) : "--"}</td>
                      <td style={{ padding: "10px 12px", color: pnlColor }}>{pnlPct != null ? (pnlPct >= 0 ? "+" : "") + pnlPct.toFixed(2) + "%" : "--"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => setHoldingModal({ open: true, editing: h })} style={{ background: "none", border: "none", color: "#9a8f82", padding: 2 }}><Edit2 size={13} /></button>
                          <button onClick={() => deleteHolding(h.id)} style={{ background: "none", border: "none", color: "#9a8f82", padding: 2 }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Chart */}
      {holdings.length > 0 && (
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", color: "var(--accent)" }}>Holdings Over Time</h2>
            <span style={{ fontSize: "0.68rem", color: "#5a5248", letterSpacing: "0.1em" }}>Live prices when available</span>
          </div>
          <PortfolioChart holdings={holdings} currentPrices={currentPrices} />
        </div>
      )}

      {/* Section 3: Savings */}
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", color: "var(--accent)", marginBottom: 2 }}>Savings</h2>
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.4rem", color: "#1a1a18" }}>
              {formatCurrency(savingsTotal)} total
            </div>
          </div>
          <button className="btn-primary" onClick={() => setSavingsModal({ open: true })} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} /> Add
          </button>
        </div>

        {savings.length === 0 ? (
          <p style={{ color: "#5a5248", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>No savings accounts yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savings.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 3 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "#1a1a18" }}>{s.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9a8f82" }}>{s.currency}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.3rem", color: "var(--accent)" }}>
                    {formatCurrency(s.amount, s.currency)}
                  </div>
                  <button onClick={() => setSavingsModal({ open: true, editing: s })} style={{ background: "none", border: "none", color: "#9a8f82" }}><Edit2 size={13} /></button>
                  <button onClick={() => deleteSavings(s.id)} style={{ background: "none", border: "none", color: "#9a8f82" }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {holdingModal.open && (
        <HoldingModal
          initial={holdingModal.editing}
          onClose={() => setHoldingModal({ open: false })}
          onSave={addOrUpdateHolding}
        />
      )}
      {savingsModal.open && (
        <SavingsModal
          initial={savingsModal.editing}
          onClose={() => setSavingsModal({ open: false })}
          onSave={addOrUpdateSavings}
        />
      )}
    </div>
    </div>
  );
}
