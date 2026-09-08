import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { formatHoraSaoPaulo } from "../utils/date";

const CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannelAsync() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Lembretes de Agendamento",
    importance: Notifications.AndroidImportance.MAX,
  });
}

async function ensurePermissionsAsync() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return;
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
}

export async function ensureNotificationsReadyAsync() {
  await ensureAndroidChannelAsync();
  await ensurePermissionsAsync();
}

export async function scheduleAgendamentoReminder(agendamento, fireAtDate, minutos) {
  const identifier = agendamento.id;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "Lembrete de Agendamento",
      body: `${agendamento.cliente} · Início às ${formatHoraSaoPaulo(agendamento.dataHoraInicio)}\nAlerta configurado para ${minutos} min antes`,
      sound: true,
      data: { agendamentoId: agendamento.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAtDate,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelAgendamentoReminder(id) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function getScheduledAgendamentoIds() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(scheduled.map((n) => n.identifier));
}
