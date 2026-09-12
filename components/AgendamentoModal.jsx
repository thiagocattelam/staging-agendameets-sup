"use client";
import { useState, useEffect, useRef, forwardRef } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  ChevronDown,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";

registerLocale("pt-BR", ptBR);

function toLocalDate(isoString) {
  const d = new Date(isoString);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function toLocalTime(isoString) {
  const d = new Date(isoString);
  return [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function timeStringToDate(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

const emptyForm = {
  data: "",
  horaInicio: "",
  horaFim: "",
  cliente: "",
  linkUmbler: "",
  observacoes: "",
  alertaMinutos: "",
  atendenteId: "",
  statusId: "",
  assuntoIds: [],
};

const TimeInput = forwardRef(
  ({ isOpen, hasError, displayValue, onTimeChange, onToggle }, ref) => {
    const [inputVal, setInputVal] = useState(displayValue || "");

    useEffect(() => {
      setInputVal(displayValue || "");
    }, [displayValue]);

    function handleChange(e) {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
      if (digits.length >= 2 && Number(digits.slice(0, 2)) > 23) return;
      if (digits.length === 4 && Number(digits.slice(2, 4)) > 59) return;
      const formatted =
        digits.length >= 3
          ? digits.slice(0, 2) + ":" + digits.slice(2)
          : digits;
      setInputVal(formatted);
      if (digits.length === 4) onTimeChange(formatted);
    }

    function handleKeyDown(e) {
      if (
        e.key === "Backspace" &&
        inputVal.length === 3 &&
        inputVal[2] === ":"
      ) {
        e.preventDefault();
        setInputVal(inputVal.slice(0, 1));
      }
    }

    return (
      <div
        className={`inline-flex items-center gap-1.5 border rounded-lg px-3 py-2 transition-colors ${
          isOpen
            ? "border-purple-400 ring-2 ring-purple-200"
            : hasError
              ? "border-red-400 ring-2 ring-red-100"
              : "border-gray-200"
        }`}
      >
        <input
          ref={ref}
          value={inputVal}
          onChange={handleChange}
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          placeholder="--:--"
          maxLength={5}
          className="text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent w-10"
        />
        <Clock
          size={14}
          className="text-gray-400 flex-shrink-0 cursor-pointer select-none"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
        />
      </div>
    );
  },
);

const DateInput = forwardRef(
  ({ isOpen, hasError, displayValue, onDateChange, onToggle }, ref) => {
    const [inputVal, setInputVal] = useState(displayValue || "");

    useEffect(() => {
      setInputVal(displayValue || "");
    }, [displayValue]);

    function handleChange(e) {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
      let formatted = digits;
      if (digits.length >= 5) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      } else if (digits.length >= 3) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      }
      setInputVal(formatted);
      if (digits.length === 8) {
        const d = new Date(
          `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}T12:00:00`,
        );
        if (!isNaN(d.getTime()))
          onDateChange(
            `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`,
          );
      } else if (digits.length === 0) {
        onDateChange("");
      }
    }

    return (
      <div
        className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors ${
          isOpen
            ? "border-purple-400 ring-2 ring-purple-200"
            : hasError
              ? "border-red-400 ring-2 ring-red-100"
              : "border-gray-200"
        }`}
      >
        <input
          ref={ref}
          value={inputVal}
          onChange={handleChange}
          onClick={onToggle}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent min-w-0"
        />
        <CalendarDays
          size={14}
          className="text-gray-400 flex-shrink-0 cursor-pointer select-none"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
        />
      </div>
    );
  },
);

export default function AgendamentoModal({
  aberto,
  onFechar,
  agendamento,
  onSalvar,
  atendentes,
  statusList,
  assuntosList,
}) {
  const { data: session } = useSession();
  const [form, setForm] = useState(emptyForm);
  const formInicialRef = useRef(emptyForm);

  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dataPickerAberto, setDataPickerAberto] = useState(false);
  const [horaInicioAberto, setHoraInicioAberto] = useState(false);
  const [horaFimAberto, setHoraFimAberto] = useState(false);
  const [atendenteDropdownAberto, setAtendenteDropdownAberto] = useState(false);
  const [statusDropdownAberto, setStatusDropdownAberto] = useState(false);
  const [confirmarFechamento, setConfirmarFechamento] = useState(false);

  const atendenteDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    if (!atendenteDropdownAberto && !statusDropdownAberto) return;
    function handleClickFora(e) {
      if (
        atendenteDropdownRef.current &&
        !atendenteDropdownRef.current.contains(e.target)
      ) {
        setAtendenteDropdownAberto(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target)
      ) {
        setStatusDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [atendenteDropdownAberto, statusDropdownAberto]);

  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  useEffect(() => {
    let initialForm;
    if (agendamento) {
      initialForm = {
        data: toLocalDate(agendamento.dataHoraInicio),
        horaInicio: toLocalTime(agendamento.dataHoraInicio),
        horaFim: toLocalTime(agendamento.dataHoraFim),
        cliente: agendamento.cliente,
        linkUmbler: agendamento.linkUmbler ?? "",
        observacoes: agendamento.observacoes ?? "",
        alertaMinutos:
          agendamento.alertaMinutos != null
            ? String(agendamento.alertaMinutos)
            : "",
        atendenteId: agendamento.atendenteId,
        statusId: agendamento.statusId,
        assuntoIds: agendamento.assuntos.map((a) => a.id),
      };
    } else {
      initialForm = {
        ...emptyForm,
        atendenteId: session?.atendenteId ?? "",
        statusId:
          statusList?.find((s) => s.descricao.toLowerCase() === "confirmado")
            ?.id ?? "",
      };
    }
    setForm(initialForm);
    formInicialRef.current = initialForm;
  }, [agendamento, aberto, session?.atendenteId, statusList]);

  function pedirFechamento() {
    const isDirty = JSON.stringify(form) !== JSON.stringify(formInicialRef.current);
    if (isDirty) {
      setConfirmarFechamento(true);
    } else {
      fechar();
    }
  }

  function fechar() {
    setForm(emptyForm);
    setTentouSalvar(false);
    setDataPickerAberto(false);
    setHoraInicioAberto(false);
    setHoraFimAberto(false);
    setAtendenteDropdownAberto(false);
    setStatusDropdownAberto(false);
    setConfirmarFechamento(false);
    onFechar();
  }

  function toggleAssunto(id) {
    setForm((f) => ({
      ...f,
      assuntoIds: f.assuntoIds.includes(id)
        ? f.assuntoIds.filter((x) => x !== id)
        : [...f.assuntoIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTentouSalvar(true);
    if (
      !form.data ||
      !form.horaInicio ||
      !form.horaFim ||
      !form.cliente ||
      !form.linkUmbler ||
      !form.atendenteId ||
      !form.statusId
    )
      return;
    if (salvando) return;
    setSalvando(true);
    try {
      const body = {
        dataHoraInicio: new Date(
          `${form.data}T${form.horaInicio}:00`,
        ).toISOString(),
        dataHoraFim: new Date(`${form.data}T${form.horaFim}:00`).toISOString(),
        cliente: form.cliente,
        linkUmbler: form.linkUmbler || null,
        observacoes: form.observacoes || null,
        alertaMinutos:
          form.alertaMinutos !== "" ? Number(form.alertaMinutos) : null,
        atendenteId: form.atendenteId,
        statusId: form.statusId,
        assuntoIds: form.assuntoIds,
      };

      const url = agendamento
        ? `/api/agendamentos/${agendamento.id}`
        : "/api/agendamentos";
      const method = agendamento ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      onSalvar();
      fechar();
    } finally {
      setSalvando(false);
    }
  }

  const dataDate = form.data ? new Date(form.data + "T12:00:00") : null;
  const atendenteSelecionado = atendentes?.find(
    (a) => String(a.id) === String(form.atendenteId),
  );
  const statusSelecionado = statusList?.find(
    (s) => String(s.id) === String(form.statusId),
  );

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={pedirFechamento}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmarFechamento && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-30 p-8">
            <p className="text-gray-900 font-semibold text-base text-center mb-1">
              Descartar alterações?
            </p>
            <p className="text-gray-400 text-sm text-center mb-6">
              As alterações feitas não serão salvas.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmarFechamento(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={fechar}
                className="px-4 py-2 rounded-xl text-sm text-white font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#8b47ff" }}
              >
                Descartar
              </button>
            </div>
          </div>
        )}
        <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {agendamento ? "Editar Agendamento" : "Novo Agendamento"}
          </h2>
          <button
            type="button"
            onClick={pedirFechamento}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col overflow-y-auto flex-1 scrollbar-hide"
        >
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Data
                </label>
                <DatePicker
                  selected={dataDate}
                  onChange={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setForm((f) => ({ ...f, data: `${yyyy}-${mm}-${dd}` }));
                    }
                    setDataPickerAberto(false);
                  }}
                  open={dataPickerAberto}
                  onClickOutside={() => setDataPickerAberto(false)}
                  popperProps={{ strategy: "fixed" }}
                  popperPlacement="bottom-start"
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
                    <DateInput
                      isOpen={dataPickerAberto}
                      hasError={tentouSalvar && !form.data}
                      displayValue={
                        form.data
                          ? new Date(
                              form.data + "T12:00:00",
                            ).toLocaleDateString("pt-BR")
                          : ""
                      }
                      onDateChange={(dateStr) =>
                        setForm((f) => ({ ...f, data: dateStr }))
                      }
                      onToggle={() => setDataPickerAberto((v) => !v)}
                    />
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Início
                </label>
                <DatePicker
                  selected={timeStringToDate(form.horaInicio)}
                  onChange={(date) => {
                    if (date) {
                      const h = String(date.getHours()).padStart(2, "0");
                      const m = String(date.getMinutes()).padStart(2, "0");
                      setForm((f) => ({ ...f, horaInicio: `${h}:${m}` }));
                    }
                    setHoraInicioAberto(false);
                  }}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Horário"
                  timeFormat="HH:mm"
                  dateFormat="HH:mm"
                  locale="pt-BR"
                  open={horaInicioAberto}
                  onClickOutside={() => setHoraInicioAberto(false)}
                  popperProps={{ strategy: "fixed" }}
                  popperPlacement="bottom-start"
                  customInput={
                    <TimeInput
                      isOpen={horaInicioAberto}
                      hasError={tentouSalvar && !form.horaInicio}
                      displayValue={form.horaInicio}
                      onTimeChange={(val) =>
                        setForm((f) => ({ ...f, horaInicio: val }))
                      }
                      onToggle={() => setHoraInicioAberto((v) => !v)}
                    />
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Fim
                </label>
                <DatePicker
                  selected={timeStringToDate(form.horaFim)}
                  onChange={(date) => {
                    if (date) {
                      const h = String(date.getHours()).padStart(2, "0");
                      const m = String(date.getMinutes()).padStart(2, "0");
                      setForm((f) => ({ ...f, horaFim: `${h}:${m}` }));
                    }
                    setHoraFimAberto(false);
                  }}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Horário"
                  timeFormat="HH:mm"
                  dateFormat="HH:mm"
                  locale="pt-BR"
                  open={horaFimAberto}
                  onClickOutside={() => setHoraFimAberto(false)}
                  popperProps={{ strategy: "fixed" }}
                  popperPlacement="bottom-start"
                  customInput={
                    <TimeInput
                      isOpen={horaFimAberto}
                      hasError={tentouSalvar && !form.horaFim}
                      displayValue={form.horaFim}
                      onTimeChange={(val) =>
                        setForm((f) => ({ ...f, horaFim: val }))
                      }
                      onToggle={() => setHoraFimAberto((v) => !v)}
                    />
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Cliente
              </label>
              <input
                type="text"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className={`border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                  tentouSalvar && !form.cliente
                    ? "border-red-400 ring-2 ring-red-100"
                    : "border-gray-200"
                }`}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Atendente
                </label>
                <div className="relative" ref={atendenteDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setAtendenteDropdownAberto((v) => !v)}
                    className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none transition-colors ${
                      atendenteDropdownAberto
                        ? "border-purple-400 ring-2 ring-purple-200"
                        : tentouSalvar && !form.atendenteId
                          ? "border-red-400 ring-2 ring-red-100"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className={`truncate ${atendenteSelecionado ? "text-gray-700" : "text-gray-400"}`}
                    >
                      {atendenteSelecionado?.nome ?? "Selecione..."}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 flex-shrink-0 transition-transform ${atendenteDropdownAberto ? "rotate-180" : ""}`}
                    />
                  </button>
                  {atendenteDropdownAberto && (
                    <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-full max-h-48 overflow-y-auto">
                      {atendentes
                        ?.filter((a) => a.ativo)
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, atendenteId: a.id });
                              setAtendenteDropdownAberto(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${String(form.atendenteId) === String(a.id) ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                          >
                            {a.nome}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Status
                </label>
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setStatusDropdownAberto((v) => !v)}
                    className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none transition-colors ${
                      statusDropdownAberto
                        ? "border-purple-400 ring-2 ring-purple-200"
                        : tentouSalvar && !form.statusId
                          ? "border-red-400 ring-2 ring-red-100"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className={`truncate ${statusSelecionado ? "text-gray-700" : "text-gray-400"}`}
                    >
                      {statusSelecionado?.descricao ?? "Selecione..."}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 flex-shrink-0 transition-transform ${statusDropdownAberto ? "rotate-180" : ""}`}
                    />
                  </button>
                  {statusDropdownAberto && (
                    <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-full overflow-hidden">
                      {statusList?.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, statusId: s.id });
                            setStatusDropdownAberto(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${String(form.statusId) === String(s.id) ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.corHex }}
                          />
                          {s.descricao}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                Assuntos
              </label>
              <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2.5 max-h-36 overflow-y-auto">
                {assuntosList?.map((a) => {
                  const checked = form.assuntoIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssunto(a.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                          checked
                            ? "bg-purple-600 border-purple-600"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {checked && (
                          <svg
                            width="8"
                            height="6"
                            viewBox="0 0 8 6"
                            fill="none"
                          >
                            <path
                              d="M1 3L3 5L7 1"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">
                        {a.descricao}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Alerta (min antes){" "}
                <span className="font-normal text-gray-400">
                  (padrão do atendente se vazio)
                </span>
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-300 focus-within:border-purple-400">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, alertaMinutos: String(Math.max(1, (Number(form.alertaMinutos) || 1) - 1)) })}
                  className="px-3 py-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors text-sm font-medium select-none"
                >
                  −
                </button>
                <input
                  type="number"
                  placeholder="ex: 30"
                  value={form.alertaMinutos}
                  onChange={(e) => setForm({ ...form, alertaMinutos: e.target.value })}
                  className="flex-1 text-sm text-center text-gray-700 focus:outline-none bg-transparent py-2 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, alertaMinutos: String((Number(form.alertaMinutos) || 0) + 1) })}
                  className="px-3 py-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors text-sm font-medium select-none"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Link Umbler
              </label>
              <input
                type="url"
                value={form.linkUmbler}
                onChange={(e) =>
                  setForm({ ...form, linkUmbler: e.target.value })
                }
                placeholder="https://..."
                className={`border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                  tentouSalvar && !form.linkUmbler
                    ? "border-red-400 ring-2 ring-red-100"
                    : "border-gray-200"
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Observações{" "}
                <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
                placeholder="Anotações sobre o agendamento..."
                rows={3}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 flex justify-end items-center flex-shrink-0">
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: "#8b47ff" }}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
