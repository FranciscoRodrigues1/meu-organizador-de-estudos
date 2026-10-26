import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Trash2, Plus, BookOpen, CalendarClock, Clock, Bell, X } from "lucide-react";
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

type Prioridade = "alta" | "media" | "baixa";
type Tarefa = {
  id: number;
  texto: string;
  concluida: boolean;
  criadaEm: string;
  prioridade: Prioridade;
  lista: string;
  agendadaPara?: string;
  lembreteEnviado?: boolean;
};

const PRIORIDADES: Record<Prioridade, { rotulo: string; bolinha: string; borda: string }> = {
  alta: { rotulo: "Alta", bolinha: "bg-prio-alta", borda: "border-l-prio-alta" },
  media: { rotulo: "Média", bolinha: "bg-prio-media", borda: "border-l-prio-media" },
  baixa: { rotulo: "Baixa", bolinha: "bg-prio-baixa", borda: "border-l-prio-baixa" },
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function usePersistido<T>(chave: string, inicial: T) {
  const [v, setV] = useState<T>(inicial);
  const carregado = useRef(false);
  useEffect(() => {
    const s = localStorage.getItem(chave);
    if (s) setV(JSON.parse(s));
    carregado.current = true;
  }, [chave]);
  useEffect(() => {
    if (carregado.current) localStorage.setItem(chave, JSON.stringify(v));
  }, [chave, v]);
  return [v, setV] as const;
}

function Index() {
  const [tarefas, setTarefas] = usePersistido<Tarefa[]>("tarefas", []);
  const [listas, setListas] = usePersistido<string[]>("listas", ["Geral"]);
  const [telefone, setTelefone] = usePersistido<string>("telefone", "");
  const [listaAtiva, setListaAtiva] = useState("Geral");
  const [diaFiltro, setDiaFiltro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [agenda, setAgenda] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState<Date | null>(null);

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

  const adicionar = (e: FormEvent) => {
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
    setTexto("");
    setAgenda("");
  };
  const alternar = (id: number) =>
    setTarefas((l) => l.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t)));
  const excluir = (id: number) => setTarefas((l) => l.filter((t) => t.id !== id));
  const criarLista = (e: FormEvent) => {
    e.preventDefault();
    const n = novaLista.trim();
    if (!n || listas.includes(n)) return;
    setListas([...listas, n]);
    setListaAtiva(n);
    setNovaLista("");
  };
  const excluirLista = (n: string) => {
    setListas(listas.filter((l) => l !== n));
    setTarefas((l) => l.filter((t) => t.lista !== n));
    setListaAtiva("Geral");
  };

  const ordem = { alta: 0, media: 1, baixa: 2 };
  const visiveis = tarefas
    .filter((t) => t.lista === listaAtiva)
    .filter((t) => !diaFiltro || (t.agendadaPara && mesmoDia(new Date(t.agendadaPara), new Date(diaFiltro))))
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || ordem[a.prioridade] - ordem[b.prioridade]);
  const concluidas = tarefas.filter((t) => t.concluida).length;

  return (
    <main className="min-h-screen bg-background px-4 py-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Meu Organizador de Estudos</h1>
          <p className="mt-2 text-muted-foreground">
            Olá, estudante! Que bom ter você aqui. Vamos organizar suas tarefas?
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card p-4 text-center shadow-card">
            <p className="text-3xl font-extrabold text-primary">{tarefas.length}</p>
            <p className="text-sm text-muted-foreground">Tarefas cadastradas</p>
          </div>
          <div className="rounded-2xl bg-card p-4 text-center shadow-card">
            <p className="text-3xl font-extrabold text-primary">{concluidas}</p>
            <p className="text-sm text-muted-foreground">Tarefas concluídas</p>
          </div>
        </section>

        {/* Semana */}
        <section className="rounded-2xl bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Esta semana</h2>
            {diaFiltro && (
              <button onClick={() => setDiaFiltro(null)} className="text-sm font-semibold text-primary">
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {semana.map((d) => {
              const hoje = agora && mesmoDia(d, agora);
              const sel = diaFiltro && mesmoDia(d, new Date(diaFiltro));
              const qtd = tarefas.filter(
                (t) => t.lista === listaAtiva && t.agendadaPara && mesmoDia(new Date(t.agendadaPara), d),
              ).length;
              return (
                <button
                  key={d.toDateString()}
                  onClick={() => setDiaFiltro(sel ? null : d.toISOString())}
                  className={`rounded-xl px-1 py-2 text-center transition ${
                    sel ? "bg-primary text-primary-foreground" : hoje ? "bg-accent text-accent-foreground" : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  <p className="text-xs font-semibold">{DIAS[d.getDay()]}</p>
                  <p className="text-lg font-extrabold">{d.getDate()}</p>
                  <p className="text-[10px] opacity-80">{qtd > 0 ? `${qtd} tarefa${qtd > 1 ? "s" : ""}` : "\u00a0"}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Listas */}
        <section className="rounded-2xl bg-card p-4 shadow-card">
          <h2 className="mb-3 font-bold text-foreground">Minhas listas</h2>
          <div className="flex flex-wrap gap-2">
            {listas.map((n) => (
              <span
                key={n}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  n === listaAtiva ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <button onClick={() => setListaAtiva(n)}>{n}</button>
                {n !== "Geral" && (
                  <button onClick={() => excluirLista(n)} aria-label={`Excluir lista ${n}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          <form onSubmit={criarLista} className="mt-3 flex gap-2">
            <input
              value={novaLista}
              onChange={(e) => setNovaLista(e.target.value)}
              placeholder="Nova lista (ex.: Matemática)"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground hover:bg-accent">
              Criar lista
            </button>
          </form>
        </section>

        {/* Nova tarefa */}
        <form onSubmit={adicionar} className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
          <h2 className="font-bold text-foreground">Nova tarefa em “{listaAtiva}”</h2>
          <div className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite uma nova tarefa..."
              aria-label="Nova tarefa"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-sm text-muted-foreground">Prioridade:</span>
              {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPrioridade(p)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition ${
                    prioridade === p ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${PRIORIDADES[p].bolinha}`} />
                  {PRIORIDADES[p].rotulo}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Agendar:
              <input
                type="datetime-local"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1 text-foreground"
              />
            </label>
          </div>
        </form>

        {/* Lista */}
        <section className="space-y-3">
          {visiveis.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              Nenhuma tarefa aqui ainda. Adicione a primeira acima!
            </p>
          ) : (
            visiveis.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-2xl border-l-4 bg-card p-4 shadow-card ${PRIORIDADES[t.prioridade].borda}`}
              >
                <button
                  onClick={() => alternar(t.id)}
                  aria-label={t.concluida ? "Marcar como pendente" : "Marcar como concluída"}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary transition ${t.concluida ? "bg-primary text-primary-foreground" : "text-transparent hover:bg-accent"}`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`break-words font-semibold ${t.concluida ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {t.texto}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${PRIORIDADES[t.prioridade].bolinha}`} />
                      {PRIORIDADES[t.prioridade].rotulo}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Criada em {fmt(t.criadaEm)}
                    </span>
                    {t.agendadaPara && (
                      <span className="flex items-center gap-1 font-semibold text-primary">
                        <CalendarClock className="h-3 w-3" /> {DIAS[new Date(t.agendadaPara).getDay()]}, {fmt(t.agendadaPara)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => excluir(t.id)}
                  aria-label="Excluir tarefa"
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </section>

        {/* SMS */}
        <section className="rounded-2xl bg-card p-4 shadow-card">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-foreground">
            <Bell className="h-4 w-4 text-primary" /> Lembretes por SMS
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Receba um SMS 30 minutos antes de cada tarefa agendada (com esta página aberta).
          </p>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value.replace(/[^\d+]/g, ""))}
            placeholder="+5511999999999"
            aria-label="Celular para lembretes"
            className="w-full rounded-xl border border-input bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          {aviso && <p className="mt-2 text-sm font-semibold text-primary">{aviso}</p>}
        </section>
      </div>
    </main>
  );
}
