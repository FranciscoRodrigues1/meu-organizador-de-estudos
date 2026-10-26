import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Check, Trash2, Plus, BookOpen } from "lucide-react";

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

type Tarefa = { id: number; texto: string; concluida: boolean };

function Index() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [texto, setTexto] = useState("");

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTarefas((l) => [...l, { id: Date.now(), texto: t, concluida: false }]);
    setTexto("");
  };
  const alternar = (id: number) =>
    setTarefas((l) => l.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t)));
  const excluir = (id: number) => setTarefas((l) => l.filter((t) => t.id !== id));
  const concluidas = tarefas.filter((t) => t.concluida).length;

  return (
    <main className="min-h-screen bg-background px-4 py-10 font-sans">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Meu Organizador de Estudos
          </h1>
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

        <form onSubmit={adicionar} className="flex gap-2 rounded-2xl bg-card p-3 shadow-card">
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
        </form>

        <section className="space-y-3">
          {tarefas.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              Nenhuma tarefa ainda. Adicione a primeira acima!
            </p>
          ) : (
            tarefas.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
                <button
                  onClick={() => alternar(t.id)}
                  aria-label={t.concluida ? "Marcar como pendente" : "Marcar como concluída"}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary transition ${t.concluida ? "bg-primary text-primary-foreground" : "text-transparent hover:bg-accent"}`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <span className={`flex-1 break-words ${t.concluida ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {t.texto}
                </span>
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
      </div>
    </main>
  );
}
