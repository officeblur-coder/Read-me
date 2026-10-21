import { Sparkles, Database, ShieldCheck, Cpu } from 'lucide-react';
import { Card, PageHeader, Badge } from '../components/ui';
import { Chat } from '../features/intelligence/Chat';

export function IntelligencePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Atlas Intelligence"
        title="Asistent de analiză a activității"
        subtitle="Întreabă în limbaj natural despre profitabilitate, bugete, termene, echipe și materiale. Răspunsurile sunt calculate din datele platformei."
        actions={<Badge tone="warn">Simulare · fără model AI extern</Badge>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="flex h-[calc(100vh-230px)] min-h-[520px] flex-col"><Chat /></Card>
        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-ink-900"><Database size={16} className="text-brand-600" /> Cum funcționează în demo</div>
            <p className="text-[13px] leading-relaxed text-ink-600">Întrebarea este recunoscută după cuvinte-cheie și transformată într-o interogare asupra proiectelor, costurilor, rapoartelor de șantier, solicitărilor și planificării. Fiecare răspuns indică datele folosite.</p>
          </Card>
          <Card>
            <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-ink-900"><ShieldCheck size={16} className="text-brand-600" /> Ce nu face</div>
            <p className="text-[13px] leading-relaxed text-ink-600">Nu inventează cifre și nu estimează în afara datelor existente. Dacă o întrebare nu poate primi răspuns din date, spune acest lucru.</p>
          </Card>
          <Card>
            <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-ink-900"><Cpu size={16} className="text-brand-600" /> În producție</div>
            <p className="text-[13px] leading-relaxed text-ink-600">Un model de limbaj (de exemplu Claude) primește aceleași funcții de interogare ca „unelte”, cu permisiunile rolului utilizatorului. Modelul formulează răspunsul, dar cifrele provin exclusiv din apelurile la date.</p>
          </Card>
          <div className="flex items-center gap-2 px-1 text-[12px] text-ink-400"><Sparkles size={13} /> Încearcă și: „Care este situația proiectului din Bacău?”</div>
        </div>
      </div>
    </div>
  );
}
