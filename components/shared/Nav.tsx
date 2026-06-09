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
    <nav style={{
      position: "fixed",
      top: 32,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        display: "flex",
        gap: 52,
        alignItems: "center",
        pointerEvents: "all",
      }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.05rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            color: pathname === l.href ? "#1a1a18" : "#9a8f82",
            textDecoration: "none",
            transition: "color 0.2s",
            fontWeight: 400,
          }}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
