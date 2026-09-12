"use client";
import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Skeleton from "@/components/Skeleton";

const ROXO = "#8b47ff";
const ROXO_ATIVO = "#7a38e6";
const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function toDateKey(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

function hoje() {
  return toDateKey(new Date());
}

function formatHora(dateStr) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPeriodoLabel(modo, dataInicio, dataFim) {
  if (modo === "dia") {
    return new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  const ini = new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
  const fim = new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
  return `${ini} – ${fim}`;
}

function BarTooltip({ active, payload, sufixo }) {
  if (!active || !payload?.length) return null;
  const { label, valor } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800">
        {valor} {sufixo}
      </p>
    </div>
  );
}

const ALTURAS_BARRAS_SKELETON = [40, 70, 55, 90, 60, 35, 80];

function SkeletonBarChart() {
  return (
    <div className="h-[260px] flex items-end gap-3 px-2 pb-6">
      {ALTURAS_BARRAS_SKELETON.map((h, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t-md"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonTableRows({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-gray-100">
          <td className="px-6 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-6 py-3">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="px-6 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-6 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-6 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-6 py-3">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function DashboardClient() {
  const [modo, setModo] = useState("dia");
  const [dataRef, setDataRef] = useState(() => new Date());

  const dataInicio = modo === "dia" ? toDateKey(dataRef) : getMondayOf(dataRef);
  const dataFim =
    modo === "dia" ? dataInicio : addDays(getMondayOf(dataRef), 6);

  const [agendamentosPeriodo, setAgendamentosPeriodo] = useState([]);
  const [agendamentosMes, setAgendamentosMes] = useState([]);
  const [loadingPeriodo, setLoadingPeriodo] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);

  useEffect(() => {
    const inicio = new Date(dataInicio + "T00:00:00").toISOString();
    const fim = new Date(dataFim + "T23:59:59").toISOString();
    const params = new URLSearchParams({ inicio, fim, pageSize: "500" });
    fetch(`/api/agendamentos?${params}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setAgendamentosPeriodo(data);
        setLoadingPeriodo(false);
      });
  }, [dataInicio, dataFim]);

  useEffect(() => {
    const agora = new Date();
    const primeiroDia = toDateKey(
      new Date(agora.getFullYear(), agora.getMonth(), 1),
    );
    const ultimoDia = toDateKey(
      new Date(agora.getFullYear(), agora.getMonth() + 1, 0),
    );
    const inicio = new Date(primeiroDia + "T00:00:00").toISOString();
    const fim = new Date(ultimoDia + "T23:59:59").toISOString();
    const params = new URLSearchParams({ inicio, fim, pageSize: "2000" });
    fetch(`/api/agendamentos?${params}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setAgendamentosMes(data);
        setLoadingMes(false);
      });
  }, []);

  const porProfissional = useMemo(() => {
    const contagem = new Map();
    for (const ag of agendamentosPeriodo || []) {
      const nome = ag.atendente?.nome ?? "—";
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    return [...contagem.entries()]
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [agendamentosPeriodo]);

  const diasMovimentados = useMemo(() => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

    const ocorrencias = new Array(7).fill(0);
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      ocorrencias[new Date(ano, mes, dia).getDay()]++;
    }

    const contagem = new Array(7).fill(0);
    for (const ag of agendamentosMes || []) {
      contagem[new Date(ag.dataHoraInicio).getDay()]++;
    }

    return ORDEM_SEMANA.map((diaSemana) => ({
      label: DIAS_SEMANA_CURTO[diaSemana],
      valor:
        ocorrencias[diaSemana] > 0
          ? Math.round((contagem[diaSemana] / ocorrencias[diaSemana]) * 10) / 10
          : 0,
    }));
  }, [agendamentosMes]);

  const agendamentosOrdenados = useMemo(
    () =>
      [...(agendamentosPeriodo || [])].sort(
        (a, b) => new Date(a.dataHoraInicio) - new Date(b.dataHoraInicio),
      ),
    [agendamentosPeriodo],
  );

  function navegar(direcao) {
    const step = modo === "dia" ? 1 : 7;
    setDataRef(
      new Date(addDays(toDateKey(dataRef), direcao * step) + "T12:00:00"),
    );
  }

  const modoAtivo = "bg-purple-600 text-white font-medium shadow-sm";
  const modoInativo = "bg-gray-100 text-gray-500 hover:bg-gray-200";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Painel de controle do AgendaMeets
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModo("dia")}
            className={`px-4 py-1.5 text-xs rounded-full transition ${modo === "dia" ? modoAtivo : modoInativo}`}
          >
            Dia
          </button>
          <button
            onClick={() => setModo("semana")}
            className={`px-4 py-1.5 text-xs rounded-full transition ${modo === "semana" ? modoAtivo : modoInativo}`}
          >
            Semana
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navegar(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => navegar(1)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ChevronRight size={15} />
          </button>
          <span className="text-sm text-gray-700 font-medium capitalize ml-1">
            {formatPeriodoLabel(modo, dataInicio, dataFim)}
          </span>
        </div>
        {dataInicio !== hoje() && (
          <button
            onClick={() => setDataRef(new Date())}
            className="ml-auto px-4 py-1.5 text-xs rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
          >
            Hoje
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            Agendamentos por atendente
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {modo === "dia" ? "No dia selecionado" : "Na semana selecionada"}
          </p>
          {loadingPeriodo ? (
            <SkeletonBarChart />
          ) : porProfissional.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              Sem agendamentos no período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={porProfissional}
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              >
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  content={<BarTooltip sufixo="agendamentos" />}
                />
                <Bar
                  dataKey="valor"
                  fill={ROXO}
                  activeBar={{ fill: ROXO_ATIVO }}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            Dias mais movimentados
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Média de agendamentos por dia da semana no mês
          </p>
          {loadingMes ? (
            <SkeletonBarChart />
          ) : (agendamentosMes || []).length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              Sem agendamentos no mês.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={diasMovimentados}
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              >
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  content={<BarTooltip sufixo="em média" />}
                />
                <Bar
                  dataKey="valor"
                  fill={ROXO}
                  activeBar={{ fill: ROXO_ATIVO }}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            Agendamentos
          </h3>
          <p className="text-sm text-gray-400">
            {loadingPeriodo ? (
              <Skeleton
                as="span"
                className="h-4 w-40 inline-block align-middle"
              />
            ) : (
              <>
                {agendamentosOrdenados.length} registro
                {agendamentosOrdenados.length !== 1 ? "s" : ""} ·{" "}
                {formatPeriodoLabel(modo, dataInicio, dataFim)}
              </>
            )}
          </p>
        </div>
        {!loadingPeriodo && agendamentosOrdenados.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Nenhum agendamento nesse período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left font-semibold px-6 py-3">
                    Atendente
                  </th>
                  <th className="text-left font-semibold px-6 py-3">Cliente</th>
                  <th className="text-left font-semibold px-6 py-3">Data</th>
                  <th className="text-left font-semibold px-6 py-3">
                    Dia da semana
                  </th>
                  <th className="text-left font-semibold px-6 py-3">Horário</th>
                  <th className="text-left font-semibold px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingPeriodo && <SkeletonTableRows />}
                {!loadingPeriodo &&
                  agendamentosOrdenados.map((ag) => (
                    <tr
                      key={ag.id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3 text-gray-700">
                        {ag.atendente?.nome}
                      </td>
                      <td className="px-6 py-3 text-gray-800 font-medium">
                        {ag.cliente}
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono">
                        {new Date(ag.dataHoraInicio).toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500 capitalize">
                        {new Date(ag.dataHoraInicio).toLocaleDateString(
                          "pt-BR",
                          {
                            weekday: "long",
                          },
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono">
                        {formatHora(ag.dataHoraInicio)} –{" "}
                        {formatHora(ag.dataHoraFim)}
                      </td>
                      <td className="px-6 py-3">
                        {ag.status && (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: ag.status.corHex + "22",
                              color: ag.status.corHex,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: ag.status.corHex }}
                            />
                            {ag.status.descricao}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
