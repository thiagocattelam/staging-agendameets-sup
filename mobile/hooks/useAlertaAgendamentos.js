import { useEffect } from "react";
import {
  scheduleAgendamentoReminder,
  cancelAgendamentoReminder,
  getScheduledAgendamentoIds,
} from "../services/notifications";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export function useAlertaAgendamentos(agendamentos) {
  useEffect(() => {
    reconciliar(agendamentos ?? []);
  }, [agendamentos]);
}

async function reconciliar(agendamentos) {
  const agora = Date.now();
  const idsValidos = new Set();

  for (const ag of agendamentos) {
    const minutos = ag.alertaMinutos ?? ag.atendente?.alertaMinutos ?? 30;
    const dataInicio = new Date(ag.dataHoraInicio).getTime();
    const dispararEm = dataInicio - minutos * 60 * 1000;
    const delay = dispararEm - agora;

    if (delay < 0 || delay > UM_DIA_MS) continue;

    idsValidos.add(ag.id);
    await scheduleAgendamentoReminder(ag, new Date(dispararEm), minutos);
  }

  const agendados = await getScheduledAgendamentoIds();
  for (const id of agendados) {
    if (!idsValidos.has(id)) {
      await cancelAgendamentoReminder(id);
    }
  }
}
