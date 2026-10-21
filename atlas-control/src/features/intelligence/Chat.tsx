import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUp, Sparkles, Database, ChevronRight } from 'lucide-react';
import { ask, SUGGESTED_QUESTIONS, type Answer } from '../../domain/intelligence';
import { useKnowledgeBase } from './useKnowledgeBase';
import { RiskDot } from '../../components/ui';

interface Msg { id: number; role: 'user' | 'assistant'; text?: string; answer?: Answer }

// Conversation is kept per session so the drawer and the full page share it.
let history: Msg[] = [];
let seq = 0;
const listeners = new Set<() => void>();
export function askAtlas(q: string) {
  window.dispatchEvent(new CustomEvent('atlas:ask', { detail: q }));
}

export function Chat({ compact = false, listen = false, onNavigate }: { compact?: boolean; listen?: boolean; onNavigate?: () => void }) {
  const kb = useKnowledgeBase();
  const [msgs, setMsgs] = useState<Msg[]>(history);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const kbRef = useRef(kb);
  kbRef.current = kb;

  useEffect(() => {
    const l = () => setMsgs([...history]);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, thinking]);

  const submit = (q: string) => {
    const text = q.trim();
    if (!text || thinking) return;
    history = [...history, { id: ++seq, role: 'user', text }];
    listeners.forEach((l) => l());
    setInput('');
    setThinking(true);
    // Short delay only for readability; the answer is computed synchronously from current data.
    setTimeout(() => {
      history = [...history, { id: ++seq, role: 'assistant', answer: ask(kbRef.current, text) }];
      listeners.forEach((l) => l());
      setThinking(false);
    }, 450);
  };

  useEffect(() => {
    if (!listen) return;
    const h = (e: Event) => {
      const q = (e as CustomEvent<string | undefined>).detail;
      if (q) submit(q);
    };
    window.addEventListener('atlas:question', h);
    return () => window.removeEventListener('atlas:question', h);
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={clsx('flex-1 overflow-y-auto', compact ? 'px-4 py-4' : 'px-1 py-2')}>
        {msgs.length === 0 && (
          <div className="py-4">
            <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-ink-900"><Sparkles size={17} className="text-brand-600" /> Ce vrei să afli despre activitate?</div>
            <p className="mb-4 text-[13px] text-ink-500">Răspunsurile sunt calculate din datele platformei în momentul întrebării. Dacă datele nu permit un răspuns, asistentul o spune.</p>
            <div className={clsx('grid gap-2', !compact && 'sm:grid-cols-2')}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} onClick={() => submit(q)} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-left text-[13px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                  {q} <ChevronRight size={14} className="shrink-0 text-ink-300" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {msgs.map((m) => m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink-900 px-4 py-2.5 text-[13.5px] text-white">{m.text}</div>
            </div>
          ) : (
            <AnswerView key={m.id} a={m.answer!} onFollow={submit} onNavigate={onNavigate} />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-[13px] text-ink-500">
              <Database size={14} className="animate-pulse text-brand-600" /> Interoghez datele…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(input); }}
        className={clsx('border-t border-ink-100 bg-white', compact ? 'p-3' : 'pt-3')}
      >
        <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: Ce șantiere au depășit bugetul?"
            className="h-8 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <button type="submit" disabled={!input.trim()} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white disabled:bg-ink-200" aria-label="Trimite"><ArrowUp size={16} /></button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-ink-400">Simulare: motor demonstrativ de interogare a datelor, fără model AI extern.</div>
      </form>
    </div>
  );
}

function AnswerView({ a, onFollow, onNavigate }: { a: Answer; onFollow: (q: string) => void; onNavigate?: () => void }) {
  return (
    <div className="animate-fade-up">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-brand-700"><Sparkles size={13} /> Atlas Intelligence</div>
      <div className="rounded-2xl rounded-tl-md border border-ink-200 bg-white p-4">
        <div className="text-[14px] font-semibold text-ink-900">{a.title}</div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">{a.summary}</p>
        {a.items.length > 0 && (
          <div className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-100">
            {a.items.map((it, i) => {
              const body = (
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <RiskDot level={it.tone === 'risk' ? 'risk' : it.tone === 'warn' ? 'warn' : 'ok'} className={clsx('mt-1.5', it.tone === 'neutral' && '!bg-ink-300')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-ink-900">{it.text}</div>
                    {it.detail && <div className="mt-0.5 text-[12px] leading-snug text-ink-500">{it.detail}</div>}
                  </div>
                  {it.value && <div className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900">{it.value}</div>}
                </div>
              );
              return it.link ? (
                <Link key={i} to={it.link} onClick={onNavigate} className="block transition-colors hover:bg-ink-50">{body}</Link>
              ) : <div key={i}>{body}</div>;
            })}
          </div>
        )}
        <div className="mt-3 flex items-start gap-1.5 text-[11.5px] text-ink-400"><Database size={12} className="mt-0.5 shrink-0" /> {a.basis}</div>
      </div>
      {a.followUps.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.followUps.map((q) => (
            <button key={q} onClick={() => onFollow(q)} className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[12px] text-ink-600 hover:border-brand-300 hover:text-brand-700">{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}
