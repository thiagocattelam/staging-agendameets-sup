"use client";
import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

export function tocarAlarme() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sequencia = [
      { freq: 880, inicio: 0, dur: 0.15 },
      { freq: 880, inicio: 0.2, dur: 0.15 },
      { freq: 1100, inicio: 0.4, dur: 0.3 },
    ];
    sequencia.forEach(({ freq, inicio, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + inicio + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + inicio + dur);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + dur + 0.05);
    });
  } catch {}
}

export function useAlertaAgendamentos({ onAlertar }) {
  const { data: session } = useSession();
  const timersRef = useRef({});
  const disparadosRef = useRef(new Set());

  const agendarTimers = useCallback(
    (agendamentos) => {
      const agora = Date.now();

      agendamentos.forEach((ag) => {
        if (disparadosRef.current.has(ag.id)) return;

        const minutos = ag.alertaMinutos ?? ag.atendente?.alertaMinutos ?? 30;
        const dataInicio = new Date(ag.dataHoraInicio).getTime();
        const dispararEm = dataInicio - minutos * 60 * 1000;
        const delay = dispararEm - agora;

        if (delay < 0 || delay > 24 * 60 * 60 * 1000) return;

        if (timersRef.current[ag.id]) return;

        timersRef.current[ag.id] = setTimeout(() => {
          disparadosRef.current.add(ag.id);
          delete timersRef.current[ag.id];
          tocarAlarme();
          onAlertar(ag);
        }, delay);
      });
    },
    [onAlertar]
  );

  const buscarAgendamentos = useCallback(async () => {
    const atendenteId = session?.atendenteId;
    if (!atendenteId) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      inicio: hoje.toISOString(),
      fim: fimHoje.toISOString(),
      atendenteId,
      pageSize: "100",
    });

    try {
      const res = await fetch(`/api/agendamentos?${params}`);
      const json = await res.json();
      agendarTimers(json.data ?? []);
    } catch {}
  }, [session?.atendenteId, agendarTimers]);

  useEffect(() => {
    buscarAgendamentos();
    const intervalo = setInterval(buscarAgendamentos, 60 * 1000);
    return () => {
      clearInterval(intervalo);
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [buscarAgendamentos]);
}
