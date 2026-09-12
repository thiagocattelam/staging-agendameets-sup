"use client";
import { useState, useEffect, useRef, forwardRef } from "react";
import {
  ExternalLink,
  X,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  NotebookPen,
} from "lucide-react";
import AgendamentoModal from "../../../components/AgendamentoModal";
import Skeleton from "../../../components/Skeleton";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";

registerLocale("pt-BR", ptBR);

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

const DateRangeInput = forwardRef(
  ({ dataInicio, dataFim, onToggle, externalRef, isOpen }, ref) => {
    const mergedRef = (el) => {
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
      if (externalRef) externalRef.current = el;
    };
    return (
      <button
        type="button"
        onClick={onToggle}
        ref={mergedRef}
        className={`flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border rounded-full px-4 py-1.5 focus:outline-none cursor-pointer whitespace-nowrap min-w-[190px] transition-colors ${isOpen ? "border-purple-400 ring-2 ring-purple-200" : "border-gray-200"}`}
      >
        <span>{formatDateDisplay(dataInicio)}</span>
        <span className="text-gray-300">–</span>
        <span>{formatDateDisplay(dataFim)}</span>
        <CalendarDays size={14} className="text-gray-400 ml-1" />
      </button>
    );
  },
);

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

function toLocalDateKey(dateStr) {
  const d = new Date(dateStr);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatHora(dateStr) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPageNumbers(current, total) {
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

function formatDataCabecalho(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function SkeletonAgendamentoCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col gap-2.5 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
  );
}

function SkeletonAgendamentosList() {
  return (
    <div className="flex flex-col gap-8">
      {[3, 2].map((qtd, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-36 mb-3" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: qtd }).map((_, j) => (
              <SkeletonAgendamentoCard key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AgendamentosClient() {
  const [dateRange, setDateRange] = useState([
    new Date(getMondayOf(new Date()) + "T12:00:00"),
    new Date(addDays(getMondayOf(new Date()), 6) + "T12:00:00"),
  ]);
  const dataInicio = dateRange[0] ? toDateKey(dateRange[0]) : null;
  const dataFim = dateRange[1] ? toDateKey(dateRange[1]) : null;
  const [atendenteId, setAtendenteId] = useState("");
  const [filtroCarregado, setFiltroCarregado] = useState(false);

  function handleSetAtendenteId(id) {
    setAtendenteId(id);
    localStorage.setItem("filtro_atendenteId", id);
  }

  useEffect(() => {
    const saved = localStorage.getItem("filtro_atendenteId") ?? "";
    setAtendenteId(saved);
    setFiltroCarregado(true);
  }, []);

  const [agendamentos, setAgendamentos] = useState([]);
  const [totalAgendamentos, setTotalAgendamentos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [atendentes, setAtendentes] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [assuntosList, setAssuntosList] = useState([]);
  const [pagina, setPagina] = useState(1);

  const PAGE_SIZE = 15;

  const [calendarAberto, setCalendarAberto] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [modalDeleteAberto, setModalDeleteAberto] = useState(false);
  const [agendamentoDeletar, setAgendamentoDeletar] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);
  const menuRef = useRef(null);
  const dateButtonRef = useRef(null);
  const atendenteDropdownRef = useRef(null);
  const [atendenteDropdownAberto, setAtendenteDropdownAberto] = useState(false);

  useEffect(() => {
    async function fetchLista(url) {
      const r = await fetch(url);
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    }
    Promise.all([
      fetchLista("/api/atendentes"),
      fetchLista("/api/status"),
      fetchLista("/api/assuntos"),
    ]).then(([at, st, as]) => {
      setAtendentes(at);
      setStatusList(st);
      setAssuntosList(as);
    });
  }, []);

  useEffect(() => {
    if (!filtroCarregado) return;
    setPagina(1);
    carregarAgendamentos(1);
  }, [dataInicio, dataFim, atendenteId, filtroCarregado]);

  useEffect(() => {
    function handleClickFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(null);
      }
      if (
        atendenteDropdownRef.current &&
        !atendenteDropdownRef.current.contains(e.target)
      ) {
        setAtendenteDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  function mudarPagina(novaPagina) {
    if (novaPagina > pagina) window.scrollTo(0, 0);
    setPagina(novaPagina);
    carregarAgendamentos(novaPagina);
  }

  const LOADING_DELAY_MS = 200;

  function carregarAgendamentos(page = pagina) {
    if (!dataInicio || !dataFim) return;
    const loadingTimer = setTimeout(() => setLoading(true), LOADING_DELAY_MS);
    const inicio = new Date(dataInicio + "T00:00:00").toISOString();
    const fim = new Date(dataFim + "T23:59:59").toISOString();
    const params = new URLSearchParams({
      inicio,
      fim,
      page,
      pageSize: PAGE_SIZE,
    });
    if (atendenteId) params.set("atendenteId", atendenteId);
    fetch(`/api/agendamentos?${params}`)
      .then((r) => r.json())
      .then(({ data, total }) => {
        clearTimeout(loadingTimer);
        setAgendamentos(data);
        setTotalAgendamentos(total);
        setLoading(false);
      });
  }

  function handleAdicionar() {
    setAgendamentoSelecionado(null);
    setModalAberto(true);
  }

  function handleEditar(ag) {
    setAgendamentoSelecionado(ag);
    setModalAberto(true);
    setMenuAberto(null);
  }

  function handleConfirmarExcluir(ag) {
    setAgendamentoDeletar(ag);
    setModalDeleteAberto(true);
    setMenuAberto(null);
  }

  async function handleExcluir() {
    await fetch(`/api/agendamentos/${agendamentoDeletar.id}`, {
      method: "DELETE",
    });
    setModalDeleteAberto(false);
    setAgendamentoDeletar(null);
    carregarAgendamentos();
  }

  const totalPaginas = Math.ceil(totalAgendamentos / PAGE_SIZE);

  const agrupados = {};
  for (const ag of agendamentos || []) {
    const key = toLocalDateKey(ag.dataHoraInicio);
    if (!agrupados[key])
      agrupados[key] = { label: formatDataCabecalho(key), items: [] };
    agrupados[key].items.push(ag);
  }
  const dias = Object.keys(agrupados).sort();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Agendamentos</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? (
              <Skeleton
                as="span"
                className="h-4 w-24 inline-block align-middle"
              />
            ) : (
              <>
                {totalAgendamentos} registro{totalAgendamentos !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={atendenteDropdownRef}>
            <button
              type="button"
              onClick={() => setAtendenteDropdownAberto((v) => !v)}
              className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none transition-colors whitespace-nowrap w-48 ${atendenteDropdownAberto ? "border-purple-400 ring-2 ring-purple-200" : "border-gray-200 hover:border-gray-300"}`}
            >
              <span className="truncate">
                {atendentes.find((a) => String(a.id) === String(atendenteId))
                  ?.nome ?? "Todos os atendentes"}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${atendenteDropdownAberto ? "rotate-180" : ""}`}
              />
            </button>
            {atendenteDropdownAberto && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-full overflow-hidden">
                {[
                  { id: "", nome: "Todos os atendentes" },
                  ...atendentes.filter((a) => a.ativo),
                ].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      handleSetAtendenteId(a.id);
                      setAtendenteDropdownAberto(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${String(atendenteId) === String(a.id) ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleAdicionar}
            className="text-white px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: "#8b47ff" }}
          >
            + Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <DatePicker
          selectsRange
          startDate={dateRange[0]}
          endDate={dateRange[1] ?? undefined}
          onChange={(range) => {
            setDateRange(range);
            if (range[0] && range[1]) setCalendarAberto(false);
          }}
          open={calendarAberto}
          onClickOutside={(e) => {
            if (dateButtonRef.current?.contains(e.target)) return;
            setCalendarAberto(false);
          }}
          portalId="datepicker-portal"
          dateFormat="dd/MM/yyyy"
          locale="pt-BR"
          renderCustomHeader={({
            date,
            decreaseMonth,
            increaseMonth,
            decreaseYear,
            increaseYear,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex items-center justify-between px-2 gap-1">
              <button
                onClick={decreaseYear}
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                <ChevronsLeft size={12} />
              </button>
              <button
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition disabled:opacity-30"
              >
                <ChevronLeft size={12} />
              </button>
              <span className="flex-1 text-center text-sm font-bold text-gray-700">
                {date.toLocaleDateString("pt-BR", { month: "long" })}{" "}
                {date.getFullYear()}
              </span>
              <button
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition disabled:opacity-30"
              >
                <ChevronRight size={12} />
              </button>
              <button
                onClick={increaseYear}
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                <ChevronsRight size={12} />
              </button>
            </div>
          )}
          customInput={
            <DateRangeInput
              dataInicio={dataInicio}
              dataFim={dataFim}
              onToggle={() => setCalendarAberto((v) => !v)}
              externalRef={dateButtonRef}
              isOpen={calendarAberto}
            />
          }
        />
        <div className="flex items-center gap-2">
          {(() => {
            const hojeAtivo = dataInicio === dataFim && dataInicio === hoje();
            const semanaAtivo =
              dataInicio === getMondayOf(new Date()) &&
              dataFim === addDays(getMondayOf(new Date()), 6);
            const ativo = "bg-purple-600 text-white font-medium shadow-sm";
            const inativo = "bg-gray-100 text-gray-500 hover:bg-gray-200";
            return (
              <>
                <button
                  onClick={() => {
                    const d = new Date(hoje() + "T12:00:00");
                    setDateRange([d, d]);
                  }}
                  className={`px-4 py-1.5 text-xs rounded-full transition ${hojeAtivo ? ativo : inativo}`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const seg = getMondayOf(new Date());
                    setDateRange([
                      new Date(seg + "T12:00:00"),
                      new Date(addDays(seg, 6) + "T12:00:00"),
                    ]);
                  }}
                  className={`px-4 py-1.5 text-xs rounded-full transition ${semanaAtivo ? ativo : inativo}`}
                >
                  Esta semana
                </button>
              </>
            );
          })()}
          <button
            onClick={() => {
              const step = dataInicio === dataFim ? 1 : 7;
              setDateRange(([s, e]) => [
                new Date(addDays(toDateKey(s), -step) + "T12:00:00"),
                new Date(addDays(toDateKey(e ?? s), -step) + "T12:00:00"),
              ]);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => {
              const step = dataInicio === dataFim ? 1 : 7;
              setDateRange(([s, e]) => [
                new Date(addDays(toDateKey(s), step) + "T12:00:00"),
                new Date(addDays(toDateKey(e ?? s), step) + "T12:00:00"),
              ]);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <SkeletonAgendamentosList />
        ) : dias.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Nenhum agendamento nesse período.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {dias.map((key) => {
              const { label, items } = agrupados[key];
              return (
                <div key={key}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 capitalize">
                    {label}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {items.map((ag) => (
                      <div
                        key={ag.id}
                        onClick={() => handleEditar(ag)}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col gap-1.5 px-5 py-4 relative cursor-pointer hover:shadow-md transition-shadow"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: ag.status?.corHex ?? "#e5e7eb",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-mono text-gray-400">
                            {formatHora(ag.dataHoraInicio)} –{" "}
                            {formatHora(ag.dataHoraFim)}
                          </span>
                          <div className="flex items-center gap-2">
                            {ag.status && (
                              <span
                                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuAberto(
                                  menuAberto === ag.id ? null : ag.id,
                                );
                              }}
                              className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors font-bold text-lg leading-none"
                            >
                              ⋮
                            </button>
                          </div>
                        </div>

                        <p className="text-base font-semibold text-gray-800">
                          {ag.cliente}
                        </p>

                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          <span>{ag.atendente.nome}</span>
                          {ag.assuntos.length > 0 && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span>
                                {ag.assuntos.map((a) => a.descricao).join(", ")}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-0.5">
                          {ag.linkUmbler && (
                            <a
                              href={ag.linkUmbler}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 hover:underline w-fit"
                            >
                              <ExternalLink size={11} />
                              Abrir no Umbler
                            </a>
                          )}
                          {ag.observacoes && (
                            <div className="relative group w-fit">
                              <NotebookPen
                                size={13}
                                className="text-gray-400 hover:text-gray-600 cursor-default transition-colors"
                              />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-64 bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2.5 shadow-lg pointer-events-none whitespace-pre-wrap break-words">
                                {ag.observacoes}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-200" />
                              </div>
                            </div>
                          )}
                        </div>

                        {menuAberto === ag.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-36 overflow-hidden"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditar(ag);
                              }}
                              className="w-full text-left px-5 py-4 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmarExcluir(ag);
                              }}
                              className="w-full text-left px-5 py-4 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-1 mt-8">
          <button
            onClick={() => mudarPagina(1)}
            disabled={pagina === 1}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronsLeft size={15} />
          </button>
          <button
            onClick={() => mudarPagina(pagina - 1)}
            disabled={pagina === 1}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} />
          </button>
          {getPageNumbers(pagina, totalPaginas).map((n) => (
            <button
              key={n}
              onClick={() => mudarPagina(n)}
              className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition ${
                n === pagina
                  ? "bg-purple-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => mudarPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => mudarPagina(totalPaginas)}
            disabled={pagina === totalPaginas}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      )}

      <AgendamentoModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        agendamento={agendamentoSelecionado}
        onSalvar={carregarAgendamentos}
        atendentes={atendentes}
        statusList={statusList}
        assuntosList={assuntosList}
      />

      {modalDeleteAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 relative">
              <button
                onClick={() => setModalDeleteAberto(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <span className="text-red-500 text-xl font-bold">!</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Deseja excluir o Agendamento?
              </h2>
              <p className="text-sm text-gray-500">
                Você deseja mesmo excluir o agendamento de{" "}
                <strong className="text-gray-700">
                  {agendamentoDeletar?.cliente}
                </strong>
                ?
              </p>
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
              <button
                onClick={handleExcluir}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
