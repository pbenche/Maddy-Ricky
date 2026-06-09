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
    <nav
      style={{ borderBottom: "1px solid var(--border)", zIndex: 50 }}
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-8 py-5 bg-[rgba(10,10,10,0.88)] backdrop-blur-md"
    >
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.25rem", letterSpacing: "0.12em", color: "var(--accent)" }}>
        M &amp; R
      </div>
      <div className="flex gap-8">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-link ${pathname === l.href ? "active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
