"use client";

import { Home, Tag, Users, LogOut, CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

function UserAvatar({ user, size }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "md" ? "w-10 h-10 text-sm mb-2" : "w-8 h-8 text-xs";

  if (user.image && !imgError) {
    return (
      <img
        src={user.image}
        alt={user.name}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className={`${size === "md" ? "w-10 h-10 mb-2" : "w-8 h-8"} rounded-full`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-semibold shrink-0`}
      style={{ backgroundColor: "#ede9fe", color: "#6d28d9" }}
    >
      {user.name?.slice(0, 2).toUpperCase()}
    </div>
  );
}

const navLinks = [
  { href: "/", label: "Início", icon: Home },
  { href: "/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "/atendentes", label: "Atendentes", icon: Users },
  { href: "/assuntos", label: "Assuntos", icon: Tag },
];

export default function Header() {
  const currentPath = usePathname();

  const [isOpen, setIsOpen] = useState(false);

  const [popoverAberto, setPopoverAberto] = useState(false);

  const ref = useRef(null);

  const userButtonRef = useRef(null);

  const popoverRef = useRef(null);

  const { data: session } = useSession();

  const [googleConectado, setGoogleConectado] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!popoverAberto) return;
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverAberto]);

  useEffect(() => {
    if (!popoverAberto || !session?.atendenteId) return;
    fetch("/api/google-calendar/status")
      .then((res) => res.json())
      .then((data) => setGoogleConectado(data.conectado))
      .catch(() => {});
  }, [popoverAberto, session?.atendenteId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleCalendarErro") === "email_mismatch") {
      alert("Conecte com a mesma conta Google usada no login para poder sincronizar sua agenda.");
      params.delete("googleCalendarErro");
      const query = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
    }
  }, []);

  function conectarGoogleAgenda() {
    window.location.href = "/api/google-calendar/connect";
  }

  async function desconectarGoogleAgenda() {
    await fetch("/api/google-calendar/disconnect", { method: "POST" });
    setGoogleConectado(false);
  }

  return (
    <aside
      ref={ref}
      className={`${isOpen ? "w-[280px]" : "w-[60px]"} fixed top-0 left-0 z-40 h-screen overflow-y-auto bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
      style={{ fontFamily: "Barlow, sans-serif" }}
    >
      <div className="px-3 py-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center py-[10px] rounded-lg w-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-150"
        >
          <span className="w-9 flex items-center justify-center shrink-0">
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </span>
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-3 flex-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = currentPath === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center py-[10px] rounded-lg text-sm font-semibold no-underline transition-colors duration-150 ${
                active
                  ? "bg-[#8b47ff] text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              <span className="w-9 flex items-center justify-center shrink-0">
                <Icon size={20} />
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ${
                  isOpen ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="relative px-3 py-4 border-t border-gray-200">
          <button
            ref={userButtonRef}
            onClick={() => setPopoverAberto(!popoverAberto)}
            className="flex items-center w-full"
          >
            <span className="w-9 flex items-center justify-center shrink-0">
              <UserAvatar user={session.user} size="sm" />
            </span>
            <div
              className={`overflow-hidden text-left transition-[opacity,max-width] duration-200 ${
                isOpen ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              <p className="text-sm font-semibold text-gray-800 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.user.email}
              </p>
            </div>
          </button>

          {popoverAberto &&
            (() => {
              const rect = userButtonRef.current?.getBoundingClientRect();
              return (
                <div
                  style={{
                    position: "fixed",
                    bottom: rect ? window.innerHeight - rect.top + 8 : 80,
                    left: rect ? rect.left : 8,
                    width: 240,
                    zIndex: 50,
                  }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg p-3"
                  ref={popoverRef}
                >
                  <UserAvatar user={session.user} size="md" />
                  <p className="text-sm font-semibold text-gray-800">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {session.user.email}
                  </p>

                  {session.atendenteId && (
                    <>
                      <hr className="mb-2" />
                      <div className="mb-2">
                        {googleConectado && (
                          <span
                            className="flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full mb-1.5"
                            style={{ backgroundColor: "#22c55e22", color: "#16a34a" }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#16a34a" }} />
                            Google Agenda conectada
                          </span>
                        )}
                        <button
                          onClick={googleConectado ? desconectarGoogleAgenda : conectarGoogleAgenda}
                          className="flex items-center gap-3 px-3 py-[8px] rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-150 w-full"
                        >
                          <CalendarDays size={16} className="shrink-0" />
                          {googleConectado ? "Desconectar" : "Conectar Google Agenda"}
                        </button>
                      </div>
                    </>
                  )}

                  <hr className="mb-2" />
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 px-3 py-[8px] rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 w-full"
                  >
                    <LogOut size={16} className="shrink-0" />
                    Sair
                  </button>
                </div>
              );
            })()}
        </div>
      )}
    </aside>
  );
}
