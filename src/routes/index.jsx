import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2, Plus, BookOpen, CalendarClock, Clock, Bell, X, Pencil } from "lucide-react";
import { enviarLembreteSms } from "@/lib/sms.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Organizador de Estudos" },
      { name: "description", content: "Organize suas tarefas acadêmicas de forma simples." },
      { property: "og:title", content: "Meu Organizador de Estudos" },
      { property: "og:description", content: "Organize suas tarefas acadêmicas de forma simples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const PRIORIDADES = {
  alta: { rotulo: "Alta", bolinha: "bg-prio-alta", borda: "border-l-prio-alta" },
  media: { rotulo: "Média", bolinha: "bg-prio-media", borda: "border-l-prio-media" },
  baixa: { rotulo: "Baixa", bolinha: "bg-prio-baixa", borda: "border-l-prio-baixa" },
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const fmt = (iso) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();

function usePersistido(chave, inicial) {
  const [v, setV] = useState(inicial);
  const carregado = useRef(false);
  useEffect(() => {
    const s = localStorage.getItem(chave);
    if (s) setV(JSON.parse(s));
    carregado.current = true;
  }, [chave]);
  useEffect(() => {
    if (carregado.current) localStorage.setItem(chave, JSON.stringify(v));
  }, [chave, v]);
  return [v, setV];
}

function Index() {
  const [tarefas, setTarefas] = usePersistido("tarefas", []);
  const [listas, setListas] = usePersistido("listas", ["Geral"]);
  const [telefone, setTelefone] = usePersistido("telefone", "");
  const [listaAtiva, setListaAtiva] = useState("Geral");
  const [diaFiltro, setDiaFiltro] = useState(null);
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [agenda, setAgenda] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [anuncio, setAnuncio] = useState("");

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Lembretes por SMS 30 minutos antes
  useEffect(() => {
    if (!agora || !/^\+\d{10,15}$/.test(telefone)) return;
    tarefas.forEach((t) => {
      if (!t.agendadaPara || t.concluida || t.lembreteEnviado) return;
      const diff = new Date(t.agendadaPara).getTime() - agora.getTime();
      if (diff > 0 && diff <= 30 * 60 * 1000) {
        setTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, lembreteEnviado: true } : x)));
        enviarLembreteSms({
          data: { telefone, mensagem: `Lembrete: "${t.texto}" começa às ${fmt(t.agendadaPara)}.` },
        })
          .then(() => setAviso(`SMS de lembrete enviado: ${t.texto}`))
          .catch(() => setAviso("Não foi possível enviar o SMS de lembrete."));
      }
    });
  }, [agora, tarefas, telefone, setTarefas]);

  const semana = useMemo(() => {
    const base = agora ?? new Date();
    const inicio = new Date(base);
    inicio.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [agora]);

  const adicionar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTarefas((l) => [
      ...l,
      {
        id: Date.now(),
        texto: t,
        concluida: false,
        criadaEm: new Date().toISOString(),
        prioridade,
        lista: listaAtiva,
        agendadaPara: agenda ? new Date(agenda).toISOString() : undefined,
      },
    ]);
    setAnuncio(`Tarefa adicionada: ${t}`);
    setTexto("");
    setAgenda("");
  };
  const alternar = (id) => {
    const tarefa = tarefas.find((t) => t.id === id);
    if (!tarefa) return;
    setTarefas((l) => l.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t)));
    setAnuncio(
      tarefa.concluida
        ? `Tarefa marcada como pendente: ${tarefa.texto}`
        : `Tarefa concluída: ${tarefa.texto}`,
    );
  };
  const excluir = (id) => {
    const tarefa = tarefas.find((t) => t.id === id);
    if (!tarefa) return;
    setTarefas((l) => l.filter((t) => t.id !== id));
    setAnuncio(`Tarefa excluída: ${tarefa.texto}`);
  };
  const iniciarEdicao = (t) => {
    setEditandoId(t.id);
    setTextoEdicao(t.texto);
  };
  const cancelarEdicao = () => {
    setEditandoId(null);
    setTextoEdicao("");
  };
  const salvarEdicao = (id) => {
    const t = textoEdicao.trim();
    if (!t) return;
    setTarefas((l) => l.map((x) => (x.id === id ? { ...x, texto: t } : x)));
    setAnuncio(`Tarefa atualizada: ${t}`);
    cancelarEdicao();
  };
  const criarLista = (e) => {
    e.preventDefault();
    const n = novaLista.trim();
    if (!n || listas.includes(n)) return;
    setListas([...listas, n]);
    setListaAtiva(n);
    setNovaLista("");
    setAnuncio(`Lista criada: ${n}`);
  };
  const excluirLista = (n) => {
    setListas(listas.filter((l) => l !== n));
    setTarefas((l) => l.filter((t) => t.lista !== n));
    setListaAtiva("Geral");
    setAnuncio(`Lista excluída: ${n}`);
  };

  const ordem = { alta: 0, media: 1, baixa: 2 };
  const visiveis = tarefas
    .filter((t) => t.lista === listaAtiva)
    .filter(
      (t) =>
        !diaFiltro || (t.agendadaPara && mesmoDia(new Date(t.agendadaPara), new Date(diaFiltro))),
    )
    .sort(
      (a, b) =>
        Number(a.concluida) - Number(b.concluida) || ordem[a.prioridade] - ordem[b.prioridade],
    );
  const concluidas = tarefas.filter((t) => t.concluida).length;

  return (
    <main className="min-h-screen bg-background px-4 py-8 font-sans sm:py-12">
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        <header className="pb-2 text-center">
          <div className="hero-mark mx-auto mb-4 flex h-16 w-16 items-center justify-center gap-1 rounded-2xl shadow-card">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
            <span className="text-2xl" aria-hidden="true">
              🎃
            </span>
          </div>
          <p className="mb-1 text-base font-bold uppercase tracking-[0.18em] text-prio-baixa">
            Caderno da noite
          </p>
          <h1 className="font-display text-4xl leading-tight text-foreground sm:text-6xl">
            Meu Organizador de Estudos
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Uma dose de magia para deixar suas tarefas em ordem.
          </p>
        </header>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {anuncio}
        </p>

        <form
          onSubmit={adicionar}
          className="surface-card task-composer space-y-4 border-2 p-5 sm:p-6"
        >
          <div>
            <p className="mb-1 text-base font-bold uppercase tracking-wide text-primary">
              Comece por aqui
            </p>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">
              Nova tarefa em “{listaAtiva}”
            </h2>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="nova-tarefa">
              Nova tarefa
            </label>
            <input
              id="nova-tarefa"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você precisa estudar?"
              required
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-3 font-bold text-primary-foreground transition hover:brightness-110 sm:px-5"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span>Adicionar</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">Prioridade</legend>
              <span aria-hidden="true" className="mr-1 text-base font-bold text-muted-foreground">
                Prioridade:
              </span>
              {Object.keys(PRIORIDADES).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPrioridade(p)}
                  aria-pressed={prioridade === p}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-base font-bold transition ${
                    prioridade === p
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${PRIORIDADES[p].bolinha}`}
                  />
                  {PRIORIDADES[p].rotulo}
                </button>
              ))}
            </fieldset>
            <label className="flex flex-wrap items-center gap-2 text-base font-bold text-muted-foreground">
              <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
              Agendar:
              <input
                type="datetime-local"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                aria-label="Data e hora da tarefa"
                className="min-h-11 max-w-full rounded-lg border border-input bg-background px-2 py-1.5 text-foreground"
              />
            </label>
          </div>
        </form>

        <section className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Resumo das tarefas">
          <div className="surface-card summary-card p-4 pl-5 text-center sm:p-5 sm:pl-6">
            <p className="text-3xl font-bold text-primary">{tarefas.length}</p>
            <p className="text-base text-muted-foreground sm:text-lg">Tarefas cadastradas</p>
          </div>
          <div className="surface-card summary-card summary-card-complete p-4 pl-5 text-center sm:p-5 sm:pl-6">
            <p className="text-3xl font-bold text-prio-baixa">{concluidas}</p>
            <p className="text-base text-muted-foreground sm:text-lg">Tarefas concluídas</p>
          </div>
        </section>

        {/* Semana */}
        <section className="surface-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">Esta semana</h2>
            {diaFiltro && (
              <button
                onClick={() => setDiaFiltro(null)}
                className="min-h-11 rounded-lg px-3 py-2 text-base font-bold text-primary hover:bg-muted"
              >
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {semana.map((d) => {
              const hoje = agora && mesmoDia(d, agora);
              const sel = diaFiltro && mesmoDia(d, new Date(diaFiltro));
              const qtd = tarefas.filter(
                (t) =>
                  t.lista === listaAtiva && t.agendadaPara && mesmoDia(new Date(t.agendadaPara), d),
              ).length;
              return (
                <button
                  key={d.toDateString()}
                  onClick={() => setDiaFiltro(sel ? null : d.toISOString())}
                  aria-label={`${d.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}, ${qtd ? `${qtd} tarefa${qtd > 1 ? "s" : ""} agendada${qtd > 1 ? "s" : ""}` : "nenhuma tarefa agendada"}`}
                  aria-pressed={Boolean(sel)}
                  className={`rounded-xl px-1 py-2 text-center transition ${
                    sel ? "day-selected" : hoje ? "day-today" : "day-default"
                  }`}
                >
                  <p className="text-base font-bold">{DIAS[d.getDay()]}</p>
                  <p className="text-2xl font-bold">{d.getDate()}</p>
                  <p aria-hidden="true" className="text-sm leading-none opacity-90">
                    {qtd > 0 ? qtd : "\u00a0"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Listas */}
        <section className="surface-card p-4 sm:p-5">
          <h2 className="mb-3 font-display text-3xl text-foreground sm:text-4xl">Minhas listas</h2>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Selecionar lista de tarefas"
          >
            {listas.map((n) => (
              <span
                key={n}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-base font-bold ${
                  n === listaAtiva
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setListaAtiva(n)}
                  aria-pressed={n === listaAtiva}
                  className="min-h-11"
                >
                  {n}
                </button>
                {n !== "Geral" && (
                  <button
                    type="button"
                    onClick={() => excluirLista(n)}
                    aria-label={`Excluir lista ${n}`}
                    className="flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
          </div>
          <form onSubmit={criarLista} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="nova-lista">
              Nome da nova lista
            </label>
            <input
              id="nova-lista"
              value={novaLista}
              onChange={(e) => setNovaLista(e.target.value)}
              placeholder="Nova lista (ex.: Matemática)"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="min-h-11 rounded-xl bg-secondary px-4 py-2 font-bold text-secondary-foreground transition hover:brightness-110">
              Criar lista
            </button>
          </form>
        </section>

        {/* Lista */}
        <section className="space-y-3" aria-labelledby="task-list-heading">
          <h2 id="task-list-heading" className="sr-only">
            Tarefas em “{listaAtiva}”
          </h2>
          {visiveis.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-lg text-muted-foreground">
              Nenhuma tarefa aqui ainda. Adicione a primeira acima!
            </p>
          ) : (
            visiveis.map((t) => (
              <div
                key={t.id}
                className={`surface-card flex items-center gap-3 border-l-4 p-4 ${PRIORIDADES[t.prioridade].borda}`}
              >
                <button
                  onClick={() => alternar(t.id)}
                  aria-label={t.concluida ? "Marcar como pendente" : "Marcar como concluída"}
                  aria-pressed={t.concluida}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary transition ${t.concluida ? "bg-primary text-primary-foreground" : "text-transparent hover:bg-secondary"}`}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </button>
                {editandoId === t.id ? (
                  <form
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      salvarEdicao(t.id);
                    }}
                  >
                    <input
                      value={textoEdicao}
                      onChange={(e) => setTextoEdicao(e.target.value)}
                      aria-label="Editar título da tarefa"
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={!textoEdicao.trim()}
                      className="min-h-11 rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicao}
                      className="min-h-11 rounded-lg bg-secondary px-3 py-1.5 font-bold text-secondary-foreground hover:brightness-110"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`break-words font-semibold ${t.concluida ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {t.texto}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-base text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${PRIORIDADES[t.prioridade].bolinha}`}
                        />
                        {PRIORIDADES[t.prioridade].rotulo}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" aria-hidden="true" /> Criada em {fmt(t.criadaEm)}
                      </span>
                      {t.concluida && <span className="font-bold text-prio-baixa">Concluída</span>}
                      {t.agendadaPara && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />{" "}
                          {DIAS[new Date(t.agendadaPara).getDay()]}, {fmt(t.agendadaPara)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {editandoId !== t.id && (
                  <button
                    onClick={() => iniciarEdicao(t)}
                    aria-label="Editar tarefa"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary"
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={() => excluir(t.id)}
                  aria-label="Excluir tarefa"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </section>

        {/* SMS */}
        <section className="surface-card p-4 sm:p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-3xl text-foreground sm:text-4xl">
            <Bell className="h-5 w-5 text-primary" aria-hidden="true" /> Lembretes por SMS
          </h2>
          <p className="mb-3 text-lg text-muted-foreground">
            Receba um SMS 30 minutos antes de cada tarefa agendada (com esta página aberta).
          </p>
          <label className="mb-2 block font-bold text-muted-foreground" htmlFor="sms-phone">
            Número do celular para lembretes
          </label>
          <input
            id="sms-phone"
            type="tel"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value.replace(/[^\d+]/g, ""))}
            placeholder="+5511999999999"
            className="min-h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          {aviso && (
            <p
              className="mt-2 font-semibold text-primary"
              role={aviso.startsWith("Não foi") ? "alert" : "status"}
              aria-live={aviso.startsWith("Não foi") ? "assertive" : "polite"}
            >
              {aviso}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
