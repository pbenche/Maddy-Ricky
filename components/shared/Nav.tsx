"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/finance", label: "Finance" },
  { href: "/projects", label: "Projects" },
  { href: "/inspiration", label: "Inspiration" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
      <div style={{
        background: "#2a2826",
        borderRadius: "999px",
        padding: "10px 8px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)"
      }}>
        <div style={{
          width: 32, height: 32, background: "#8a6840", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: "white",
          marginRight: 8, marginLeft: 8, flexShrink: 0
        }}>M</div>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            padding: "6px 18px",
            borderRadius: "999px",
            fontSize: "0.68rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase" as const,
            fontFamily: "var(--font-body)",
            color: pathname === l.href ? "#f0ece6" : "#8a8278",
            background: pathname === l.href ? "rgba(255,255,255,0.1)" : "transparent",
            textDecoration: "none",
            transition: "all 0.2s",
            whiteSpace: "nowrap" as const,
          }}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
