import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { openDB } from 'idb';
import {
  Archive, ArrowLeft, BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, Crown, Flame, Lightbulb, MoreHorizontal, Pencil, Plus, RotateCcw,
  Sparkles, Target, X, Zap
} from 'lucide-react';
import './styles.css';

type GoalType = 'checkbox' | 'timed';
type Log = { date: string; done: boolean; duration?: number; note?: string };
type Goal = { id: string; title: string; description: string; type: GoalType; minuteCredit?: number; color: string; createdAt: string; archived: boolean; logs: Log[] };
type RangeMode = 'last-month' | 'last-year';

type DateRange = { start: string; end: string };
type DailyCopy = { headline: string; accent: string; subline: string; quote: string; author: string };

// Primary-text quotations with verifiable literary or historical sources.
const DAILY_COPY: DailyCopy[] = [
  { headline: 'Begin with', accent: 'what matters', subline: 'A clear first step changes the day.', quote: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { headline: 'Make the', accent: 'next move', subline: 'Momentum starts smaller than you think.', quote: 'For the great doesn’t happen through impulse alone; it is a succession of little things that are brought together.', author: 'Vincent van Gogh' },
  { headline: 'Choose your', accent: 'next right thing', subline: 'Attention turns intention into action.', quote: 'The readiness is all.', author: 'William Shakespeare' },
  { headline: 'Keep faith with', accent: 'the process', subline: 'What you repeat becomes your rhythm.', quote: 'Our doubts are traitors, and make us lose the good we oft might win by fearing to attempt.', author: 'William Shakespeare' },
  { headline: 'Build the day', accent: 'you want', subline: 'Small acts give shape to a life.', quote: 'The fault, dear Brutus, is not in our stars, but in ourselves, that we are underlings.', author: 'William Shakespeare' },
  { headline: 'Start where', accent: 'your feet are', subline: 'Today is the only place progress happens.', quote: 'To strive, to seek, to find, and not to yield.', author: 'Alfred, Lord Tennyson' },
  { headline: 'Make room for', accent: 'progress', subline: 'A little forward is still forward.', quote: 'The best way out is always through.', author: 'Robert Frost' },
  { headline: 'Practice the', accent: 'promise', subline: 'Consistency gives effort a memory.', quote: 'Forever—is composed of Nows—', author: 'Emily Dickinson' },
  { headline: 'Let the work', accent: 'compound', subline: 'Patient steps carry you farther.', quote: '“Hope” is the thing with feathers—That perches in the soul—', author: 'Emily Dickinson' },
  { headline: 'Turn intention', accent: 'into motion', subline: 'One completed thing can change the tone.', quote: 'I’m not afraid of storms, for I’m learning how to sail my ship.', author: 'Louisa May Alcott' },
  { headline: 'Stay with the', accent: 'becoming', subline: 'The work is allowed to take time.', quote: 'Nothing great was ever achieved without enthusiasm.', author: 'Ralph Waldo Emerson' },
  { headline: 'Give today', accent: 'your attention', subline: 'Presence makes ordinary effort count.', quote: 'Act well your part; there all the honour lies.', author: 'Alexander Pope' },
  { headline: 'Rise to the', accent: 'next attempt', subline: 'A steady return is its own kind of strength.', quote: 'Our greatest glory is, not in never falling, but in rising every time we fall.', author: 'Oliver Goldsmith' },
  { headline: 'Take the', accent: 'first step', subline: 'A journey becomes real when you begin.', quote: 'A journey of a thousand miles begins with a single step.', author: 'Laozi' },
  { headline: 'Honor the', accent: 'beginning', subline: 'Starting well gives the day direction.', quote: 'The beginning is thought to be more than half of the whole.', author: 'Aristotle' },
  { headline: 'Shape the', accent: 'moment', subline: 'The day is built from what you choose now.', quote: 'We are such stuff as dreams are made on.', author: 'William Shakespeare' },
];

function dailyCopyFor(date: string) {
  const seed = Number(date.replace(/-/g, ''));
  return DAILY_COPY[seed % DAILY_COPY.length];
}
function useDailyCopy() {
  const [dateKey, setDateKey] = useState(today());
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(() => { setDateKey(today()); schedule(); }, nextMidnight.getTime() - now.getTime() + 10);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);
  return dailyCopyFor(dateKey);
}
const palette = ['#C8102E', '#8C0B20', '#D4AF37', '#DC143C', '#5E0E1D'];
const pad = (value: number) => String(value).padStart(2, '0');
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const today = () => isoDate(new Date());
const fromIso = (iso: string) => { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day, 12); };
const formatDay = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(fromIso(iso));
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const addDays = (iso: string, amount: number) => { const date = fromIso(iso); date.setDate(date.getDate() + amount); return isoDate(date); };
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 12);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
const monthName = (date: Date) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

async function db() { return openDB('daymark-db', 1, { upgrade(database) { if (!database.objectStoreNames.contains('goals')) database.createObjectStore('goals', { keyPath: 'id' }); } }); }
async function loadGoals(): Promise<Goal[]> {
  const database = await db();
  const values = await database.getAll('goals') as Goal[];
  return values.filter(goal => !['move', 'read', 'focus'].includes(goal.id)).map(goal => ({
    ...goal,
    minuteCredit: goal.type === 'checkbox' ? Math.max(0, Math.round(goal.minuteCredit || 0)) : undefined,
    logs: (goal.logs || []).map(log => ({ ...log, duration: goal.type === 'checkbox' ? (log.done ? Math.max(0, Math.round(goal.minuteCredit || 0)) : 0) : log.duration }))
  }));
}
async function saveGoals(goals: Goal[]) { const database = await db(); const tx = database.transaction('goals', 'readwrite'); await tx.store.clear(); await Promise.all(goals.map(goal => tx.store.put(goal))); await tx.done; }
function getLog(goal: Goal, date = today()) { return goal.logs.find(log => log.date === date); }
function goalMinutes(goal: Goal, log?: Log) { return goal.type === 'checkbox' ? (log?.done ? goal.minuteCredit || 0 : 0) : log?.duration || 0; }
function stats(goal: Goal) {
  const doneDates = new Set(goal.logs.filter(log => log.done).map(log => log.date));
  let best = 0, run = 0;
  const cursor = fromIso(today());
  while (doneDates.has(isoDate(cursor))) { run++; cursor.setDate(cursor.getDate() - 1); }
  const dates = [...doneDates].sort();
  let streak = 0;
  dates.forEach((date, index) => { streak = index && addDays(dates[index - 1], 1) === date ? streak + 1 : 1; best = Math.max(best, streak); });
  return { current: run, best, total: goal.logs.reduce((sum, log) => sum + goalMinutes(goal, log), 0) };
}
function rangeFor(mode: RangeMode): DateRange {
  const now = new Date();
  if (mode === 'last-year') return { start: isoDate(new Date(now.getFullYear() - 1, 0, 1, 12)), end: isoDate(new Date(now.getFullYear() - 1, 11, 31, 12)) };
  return { start: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1, 12)), end: isoDate(new Date(now.getFullYear(), now.getMonth(), 0, 12)) };
}
function dateList(range: DateRange) { const dates: string[] = []; for (let date = range.start; date <= range.end; date = addDays(date, 1)) dates.push(date); return dates; }
function rangeMetrics(goals: Goal[], range: DateRange) {
  const dates = dateList(range);
  const completionDays = dates.filter(date => goals.some(goal => getLog(goal, date)?.done));
  let current = 0;
  for (let index = completionDays.length - 1; index >= 0 && completionDays[index] === addDays(range.end, -(completionDays.length - 1 - index)); index--) current++;
  let best = 0, run = 0;
  dates.forEach(date => { if (completionDays.includes(date)) { run++; best = Math.max(best, run); } else run = 0; });
  return {
    current, best,
    completions: goals.reduce((sum, goal) => sum + goal.logs.filter(log => log.done && log.date >= range.start && log.date <= range.end).length, 0),
    minutes: goals.reduce((sum, goal) => sum + goal.logs.filter(log => log.date >= range.start && log.date <= range.end).reduce((total, log) => total + goalMinutes(goal, log), 0), 0),
    completionDays
  };
}
function initials(text: string) { return text.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }

function App() {
  const dailyCopy = useDailyCopy();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<'today' | 'calendar' | 'insights' | 'archived'>('today');
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [editor, setEditor] = useState<{ mode: 'add' | 'edit'; goal?: Goal } | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => { loadGoals().then(data => { setGoals(data); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) saveGoals(goals); }, [goals, loaded]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2400); return () => clearTimeout(timer); }, [toast]);

  const active = goals.filter(goal => !goal.archived);
  const archived = goals.filter(goal => goal.archived);
  const doneCount = active.filter(goal => getLog(goal)?.done).length;
  const progress = active.length ? Math.round(doneCount / active.length * 100) : 0;
  const updateGoal = (id: string, update: Partial<Goal>) => setGoals(current => current.map(goal => goal.id === id ? { ...goal, ...update } : goal));
  const updateLog = (goal: Goal, patch: Partial<Log>) => {
    const date = today(); const old = getLog(goal, date) || { date, done: false }; const merged = { ...old, ...patch };
    if (goal.type === 'checkbox') merged.duration = merged.done ? goal.minuteCredit || 0 : 0;
    const logs = [...goal.logs.filter(log => log.date !== date), merged].filter(log => log.done || (log.duration || 0) > 0 || log.note);
    updateGoal(goal.id, { logs }); setToast(patch.done !== undefined ? (patch.done ? 'Nice work — today is marked complete.' : 'Today unchecked.') : 'Today updated.');
  };
  const addGoal = (data: Omit<Goal, 'id' | 'createdAt' | 'archived' | 'logs'>) => { setGoals(current => [...current, { ...data, id: uid(), createdAt: today(), archived: false, logs: [] }]); setEditor(null); setToast('Goal added to your day.'); };
  const editGoal = (data: Omit<Goal, 'id' | 'createdAt' | 'archived' | 'logs'>) => {
    if (!editor?.goal) return;
    const normalized = data.type === 'checkbox' ? { ...data, minuteCredit: data.minuteCredit || 0, logs: editor.goal.logs.map(log => ({ ...log, duration: log.done ? data.minuteCredit || 0 : 0 })) } : data;
    updateGoal(editor.goal.id, normalized); setEditor(null); setToast('Goal updated.');
  };
  const archiveGoal = (goal: Goal) => { updateGoal(goal.id, { archived: !goal.archived }); setActiveGoal(null); setToast(goal.archived ? 'Goal restored.' : 'Goal archived.'); };

  if (!loaded) return <div className="loading"><div className="brand-mark"><Target size={22} /></div><span>Loading your day…</span></div>;
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Crown size={21} strokeWidth={2.2} /></div><span>Reign</span></div><div className="topbar-date"><CalendarDays size={16} /> {formatDay(today())}</div><div className="avatar">{initials('Bricked Solid')}</div></header>
    <main className="layout">
      <aside className="sidebar">
        <div className="hello"><p className="eyebrow">{formatDay(today()).toUpperCase()}</p><h1>{dailyCopy.headline}<br /><em>{dailyCopy.accent}.</em></h1><p className="muted">{dailyCopy.subline}</p></div>
        <nav><button className={view === 'today' ? 'nav-item active' : 'nav-item'} onClick={() => setView('today')}><CheckCircle2 size={18} /> Today <span>{doneCount}/{active.length}</span></button><button className={view === 'calendar' ? 'nav-item active' : 'nav-item'} onClick={() => setView('calendar')}><CalendarDays size={18} /> Calendar</button><button className={view === 'insights' ? 'nav-item active' : 'nav-item'} onClick={() => setView('insights')}><BarChart3 size={18} /> Insights</button></nav>
        <button className={view === 'archived' ? 'archive-link active' : 'archive-link'} onClick={() => setView('archived')}><Archive size={15} /> Archived <span>{archived.length}</span></button>
        <div className="sidebar-card"><Sparkles size={18} /><div><strong>Keep the chain alive</strong><p>Consistency beats intensity. You've got this.</p></div></div>
      </aside>
      <section className="content">
        {view === 'today' && <TodayView goals={active} doneCount={doneCount} progress={progress} dailyCopy={dailyCopy} onAdd={() => setEditor({ mode: 'add' })} onEdit={goal => setEditor({ mode: 'edit', goal })} onOpen={setActiveGoal} onLog={updateLog} />}
        {view === 'calendar' && <CalendarView goals={active} onOpen={setActiveGoal} />}
        {view === 'insights' && <Insights goals={active} onOpen={setActiveGoal} />}
        {view === 'archived' && <ArchiveView goals={archived} onRestore={archiveGoal} onOpen={setActiveGoal} />}
      </section>
    </main>
    {activeGoal && <GoalDetails goal={goals.find(goal => goal.id === activeGoal.id) || activeGoal} onClose={() => setActiveGoal(null)} onEdit={goal => { setActiveGoal(null); setEditor({ mode: 'edit', goal }); }} onArchive={archiveGoal} />}
    {editor && <GoalEditor mode={editor.mode} goal={editor.goal} onClose={() => setEditor(null)} onSave={editor.mode === 'add' ? addGoal : editGoal} />}
    {toast && <div className="toast"><Check size={16} /> {toast}</div>}
  </div>;
}

function TodayView({ goals, doneCount, progress, dailyCopy, onAdd, onEdit, onOpen, onLog }: { goals: Goal[]; doneCount: number; progress: number; dailyCopy: DailyCopy; onAdd: () => void; onEdit: (goal: Goal) => void; onOpen: (goal: Goal) => void; onLog: (goal: Goal, patch: Partial<Log>) => void }) {
  const remaining = goals.length - doneCount;
  return <><div className="page-heading"><div><p className="eyebrow">YOUR DAILY PRACTICE</p><h2>Today <span className="date-pill">{formatDay(today())}</span></h2><p className="muted">{remaining ? `${remaining} ${remaining === 1 ? 'goal' : 'goals'} left in your practice today.` : 'Everything checked off. What a day.'}</p></div><button className="primary-btn" onClick={onAdd}><Plus size={18} /> New goal</button></div>
    <div className="progress-panel"><div className="progress-copy"><div className="progress-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties}><span>{progress}<small>%</small></span></div><div><strong>{doneCount} of {goals.length} complete</strong><p>Progress for today</p></div></div><div className="progress-bar"><i style={{ width: `${progress}%` }} /></div><span className="progress-spark">{progress === 100 ? 'Perfect day' : progress > 50 ? 'You’re on a roll' : 'Start small'}</span></div>
    <div className="section-label"><span>DAILY GOALS</span><span>{goals.length} active</span></div>
    {goals.length ? <div className="goal-list">{goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={onEdit} onOpen={onOpen} onLog={onLog} />)}</div> : <EmptyState onAdd={onAdd} />}
    <div className="quote"><Lightbulb size={19} /><span>“{dailyCopy.quote}”</span><small>— {dailyCopy.author}</small></div>
  </>;
}

function GoalCard({ goal, onEdit, onOpen, onLog }: { goal: Goal; onEdit: (goal: Goal) => void; onOpen: (goal: Goal) => void; onLog: (goal: Goal, patch: Partial<Log>) => void }) {
  const log = getLog(goal) || { date: today(), done: false }; const stat = stats(goal); const [note, setNote] = useState(log.note || ''); const [showNote, setShowNote] = useState(Boolean(log.note));
  useEffect(() => setNote(log.note || ''), [log.note]);
  return <article className={`goal-card ${log.done ? 'completed' : ''}`} style={{ '--accent': goal.color } as React.CSSProperties}>
    <div className="goal-main"><button aria-label={log.done ? 'Mark incomplete' : 'Mark complete'} className={`check-button ${log.done ? 'checked' : ''}`} onClick={() => onLog(goal, { done: !log.done })}>{log.done && <Check size={19} strokeWidth={3} />}</button><div className="goal-title"><div className="goal-title-row"><h3>{goal.title}</h3><span className={`type-tag ${goal.type}`}>{goal.type === 'timed' ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}{goal.type === 'timed' ? 'Timed' : 'Checkbox'}</span></div><p>{goal.description || 'No description'}</p></div><button className="icon-btn more" onClick={() => onEdit(goal)} aria-label="Edit goal"><MoreHorizontal size={20} /></button></div>
    <div className="goal-footer"><div className="mini-stats"><span><Flame size={14} /> <b>{stat.current}</b> day streak</span>{goal.type === 'timed' ? <span><Clock3 size={14} /> <b>{stat.total}</b> min total</span> : <span><Clock3 size={14} /> <b>{goal.minuteCredit || 0} min</b> credit</span>}</div><div className="card-actions">{goal.type === 'timed' && <DurationInput value={log.duration || 0} onChange={duration => onLog(goal, { duration, done: duration > 0 ? true : log.done })} />}{goal.type === 'checkbox' && <button className="note-toggle" onClick={() => setShowNote(value => !value)}>{showNote ? 'Hide note' : '+ Add note'}</button>}<button className="details-link" onClick={() => onOpen(goal)}>Details <ChevronRight size={15} /></button></div></div>
    {goal.type === 'timed' && <div className="note-row"><button className="note-toggle" onClick={() => setShowNote(value => !value)}>{showNote ? 'Hide note' : '+ Add a note for today'}</button></div>}
    {showNote && <div className="note-editor"><input value={note} placeholder="What did you do today?" maxLength={140} onChange={event => setNote(event.target.value)} onBlur={() => onLog(goal, { note })} /><span>{note.length}/140</span></div>}
  </article>;
}

function DurationInput({ value, onChange }: { value: number; onChange: (value: number) => void }) { const [editing, setEditing] = useState(false); return editing ? <div className="duration-edit"><input autoFocus type="number" min="0" max="999" defaultValue={value || ''} onBlur={event => { onChange(Number(event.target.value) || 0); setEditing(false); }} onKeyDown={event => { if (event.key === 'Enter') { onChange(Number(event.currentTarget.value) || 0); setEditing(false); } }} /><span>min</span></div> : <button className="duration-btn" onClick={() => setEditing(true)}><Clock3 size={15} /> {value ? `${value} min` : 'Log time'}</button>; }
function EmptyState({ onAdd }: { onAdd: () => void }) { return <div className="empty"><div className="empty-icon"><Target size={25} /></div><h3>Set your first intention</h3><p>Choose one small thing to practice today. You can always add more later.</p><button className="primary-btn" onClick={onAdd}><Plus size={17} /> Add a goal</button></div>; }

function CalendarView({ goals, onOpen }: { goals: Goal[]; onOpen: (goal: Goal) => void }) {
  const [mode, setMode] = useState<RangeMode>('last-month');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const range = rangeFor(mode); const metrics = rangeMetrics(goals, range);
  const months = useMemo(() => { const items: { title: string; cells: string[] }[] = []; const cursor = startOfMonth(fromIso(range.start)); const end = startOfMonth(fromIso(range.end)); while (cursor <= end) { const gridStart = new Date(cursor); gridStart.setDate(1 - cursor.getDay()); const gridEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12); gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay())); const cells: string[] = []; for (let date = gridStart; date <= gridEnd; date.setDate(date.getDate() + 1)) cells.push(isoDate(date)); items.push({ title: monthName(cursor), cells }); cursor.setMonth(cursor.getMonth() + 1); } return items; }, [range.start, range.end]);
  const selectedLogs = selectedDay ? goals.flatMap(goal => { const log = getLog(goal, selectedDay); return log?.done || (log?.duration || 0) > 0 || log?.note ? [{ goal, log }] : []; }) : [];
  return <><div className="page-heading calendar-heading"><div><p className="eyebrow">YOUR YEAR IN PRACTICE</p><h2>Calendar</h2><p className="muted">See the days, minutes, and momentum adding up.</p></div><div className="range-toggle"><button className={mode === 'last-month' ? 'selected' : ''} onClick={() => { setMode('last-month'); setSelectedDay(null); }}>Last month</button><button className={mode === 'last-year' ? 'selected' : ''} onClick={() => { setMode('last-year'); setSelectedDay(null); }}>Last year</button></div></div>
    <div className="insight-grid calendar-stats"><div className="insight-stat accent"><span><Flame size={18} /></span><strong>{metrics.current}</strong><label>Current streak <small>days</small></label></div><div className="insight-stat"><span><Zap size={18} /></span><strong>{metrics.best}</strong><label>Best streak <small>days</small></label></div><div className="insight-stat"><span><Clock3 size={18} /></span><strong>{metrics.minutes}</strong><label>Minutes invested</label></div><div className="insight-stat"><span><CheckCircle2 size={18} /></span><strong>{metrics.completions}</strong><label>Completions</label></div></div>
    <div className="calendar-panel">{months.map(month => <div className="month-block" key={month.title}><h3>{month.title}</h3><div className="weekday-row">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day.slice(0, 2)}</span>)}</div><div className="calendar-grid">{month.cells.map(date => { const inRange = date >= range.start && date <= range.end; const dayGoals = goals.filter(goal => getLog(goal, date)?.done); const minutes = goals.reduce((sum, goal) => sum + goalMinutes(goal, getLog(goal, date)), 0); return <button key={date} disabled={!inRange} className={`calendar-day ${inRange ? '' : 'outside'} ${dayGoals.length ? 'has-completion' : ''} ${minutes ? 'has-minutes' : ''} ${selectedDay === date ? 'selected' : ''}`} onClick={() => inRange && setSelectedDay(date)}><span>{fromIso(date).getDate()}</span>{inRange && (dayGoals.length > 0 || minutes > 0) && <small>{minutes ? `${minutes}m` : '✓'}</small>}</button>; })}</div></div>)}</div>
    {selectedDay && <div className="day-detail"><div className="panel-head"><div><h3>{formatDay(selectedDay)}</h3><p className="muted">{selectedLogs.length ? `${selectedLogs.length} logged ${selectedLogs.length === 1 ? 'practice' : 'practices'}` : 'A quiet day.'}</p></div><button className="icon-btn" onClick={() => setSelectedDay(null)} aria-label="Close day details"><X size={17} /></button></div>{selectedLogs.length ? <div className="day-log-list">{selectedLogs.map(({ goal, log }) => <button className="day-log" key={goal.id} onClick={() => onOpen(goal)}><span className="color-dot" style={{ background: goal.color }} /><b>{goal.title}</b><span>{goalMinutes(goal, log)} min</span><ChevronRight size={15} /></button>)}</div> : <p className="history-empty">No logs for this day.</p>}</div>}
    <div className="section-label calendar-breakdown-label"><span>RANGE BREAKDOWN</span><span>{formatDay(range.start)} — {formatDay(range.end)}</span></div><div className="goal-list compact-list">{goals.map(goal => { const total = goal.logs.filter(log => log.date >= range.start && log.date <= range.end).reduce((sum, log) => sum + goalMinutes(goal, log), 0); const completions = goal.logs.filter(log => log.done && log.date >= range.start && log.date <= range.end).length; return <button className="breakdown" key={goal.id} onClick={() => onOpen(goal)}><span className="color-dot" style={{ background: goal.color }} /><span className="breakdown-title"><b>{goal.title}</b><small>{completions} completions · {total} minutes</small></span><span className="breakdown-streak"><Flame size={14} /> {stats(goal).current}</span><ChevronRight size={17} /></button>; })}</div>
  </>;
}

function Insights({ goals, onOpen }: { goals: Goal[]; onOpen: (goal: Goal) => void }) { const week = [...Array(7)].map((_, index) => { const iso = addDays(today(), -6 + index); return { iso, label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(fromIso(iso)).slice(0, 2) }; }); const totalLogs = goals.reduce((sum, goal) => sum + goal.logs.filter(log => log.done).length, 0); const best = Math.max(0, ...goals.map(goal => stats(goal).best)); return <><div className="page-heading"><div><p className="eyebrow">YOUR MOMENTUM</p><h2>Insights</h2><p className="muted">A little perspective on your consistency.</p></div></div><div className="insight-grid"><div className="insight-stat accent"><span><Flame size={18} /></span><strong>{best}</strong><label>Best streak <small>days</small></label></div><div className="insight-stat"><span><CheckCircle2 size={18} /></span><strong>{totalLogs}</strong><label>Goals completed <small>all time</small></label></div><div className="insight-stat"><span><Clock3 size={18} /></span><strong>{goals.reduce((s, g) => s + stats(g).total, 0)}</strong><label>Minutes invested <small>all time</small></label></div></div><div className="chart-panel"><div className="panel-head"><div><h3>Last 7 days</h3><p className="muted">Goals completed each day</p></div><BarChart3 size={19} /></div><div className="bar-chart">{week.map(day => { const count = goals.filter(goal => getLog(goal, day.iso)?.done).length; const height = goals.length ? Math.max(8, count / goals.length * 100) : 8; return <div className="bar-col" key={day.iso}><span>{count || ''}</span><div className="bar-track"><i style={{ height: `${height}%` }} /></div><label>{day.label}</label></div>; })}</div></div><div className="section-label"><span>GOAL BREAKDOWN</span></div><div className="goal-list compact-list">{goals.map(goal => { const stat = stats(goal); return <button className="breakdown" key={goal.id} onClick={() => onOpen(goal)}><span className="color-dot" style={{ background: goal.color }} /><span className="breakdown-title"><b>{goal.title}</b><small>{goal.type === 'checkbox' ? `${goal.minuteCredit || 0} min credit · ${stat.total} invested` : `${stat.total} minutes logged`}</small></span><span className="breakdown-streak"><Flame size={14} /> {stat.current} current</span><ChevronRight size={17} /></button>; })}</div></>; }
function ArchiveView({ goals, onRestore, onOpen }: { goals: Goal[]; onRestore: (goal: Goal) => void; onOpen: (goal: Goal) => void }) { return <><div className="page-heading"><div><p className="eyebrow">PAST PRACTICES</p><h2>Archived</h2><p className="muted">Goals you’ve set aside. Nothing is ever lost.</p></div></div>{goals.length ? <div className="goal-list">{goals.map(goal => <div className="archived-card" key={goal.id}><span className="color-dot" style={{ background: goal.color }} /><div><h3>{goal.title}</h3><p>{goal.description}</p></div><button className="secondary-btn" onClick={() => onRestore(goal)}><RotateCcw size={15} /> Restore</button><button className="icon-btn" onClick={() => onOpen(goal)}><ChevronRight size={18} /></button></div>)}</div> : <div className="empty"><div className="empty-icon"><Archive size={25} /></div><h3>No archived goals</h3><p>When a goal has run its course, you’ll find it here.</p></div>}</>; }

function GoalDetails({ goal, onClose, onEdit, onArchive }: { goal: Goal; onClose: () => void; onEdit: (goal: Goal) => void; onArchive: (goal: Goal) => void }) { const stat = stats(goal); const logs = [...goal.logs].sort((a, b) => b.date.localeCompare(a.date)); return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="details-modal"><div className="modal-top"><button className="back-btn" onClick={onClose}><ArrowLeft size={17} /> Back</button><button className="icon-btn" onClick={() => onEdit(goal)}><Pencil size={17} /></button></div><div className="detail-hero"><span className="detail-dot" style={{ background: goal.color }} /><div><h2>{goal.title}</h2><p>{goal.description || 'No description'}</p></div></div><div className="detail-stats"><div><Flame size={17} /><strong>{stat.current}</strong><span>Current streak</span></div><div><Zap size={17} /><strong>{stat.best}</strong><span>Best streak</span></div><div><Clock3 size={17} /><strong>{stat.total}</strong><span>Total minutes</span></div></div><div className="history-heading"><h3>History</h3><span>{logs.length} logged {logs.length === 1 ? 'day' : 'days'}</span></div>{logs.length ? <div className="history-list">{logs.map(log => <div className="history-row" key={log.date}><div className={`history-check ${log.done ? 'done' : ''}`}>{log.done && <Check size={13} />}</div><div><b>{formatDay(log.date)}</b>{log.note && <p>“{log.note}”</p>}</div><span className="history-time"><Clock3 size={13} /> {goalMinutes(goal, log)} min</span></div>)}</div> : <p className="history-empty">Your completed days and notes will appear here.</p>}<button className="archive-action" onClick={() => onArchive(goal)}>{goal.archived ? <><RotateCcw size={16} /> Restore goal</> : <><Archive size={16} /> Archive goal</>}</button></div></div>; }

function GoalEditor({ mode, goal, onClose, onSave }: { mode: 'add' | 'edit'; goal?: Goal; onClose: () => void; onSave: (data: Omit<Goal, 'id' | 'createdAt' | 'archived' | 'logs'>) => void }) { const [title, setTitle] = useState(goal?.title || ''); const [description, setDescription] = useState(goal?.description || ''); const [type, setType] = useState<GoalType>(goal?.type || 'checkbox'); const [minuteCredit, setMinuteCredit] = useState(String(goal?.minuteCredit ?? '')); const [color, setColor] = useState(goal?.color || palette[Math.floor(Math.random() * palette.length)]); const submit = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) return; const minutes = Math.min(1440, Math.max(0, Math.round(Number(minuteCredit) || 0))); onSave({ title: title.trim(), description: description.trim(), type, minuteCredit: type === 'checkbox' ? minutes : undefined, color }); }; return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="editor-modal" onSubmit={submit}><div className="modal-top"><div><p className="eyebrow">{mode === 'add' ? 'NEW PRACTICE' : 'EDIT PRACTICE'}</p><h2>{mode === 'add' ? 'What matters today?' : 'Tune your goal'}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={19} /></button></div><label>Goal name<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Walk outside" maxLength={60} /></label><label>Description <span className="optional">optional</span><input value={description} onChange={event => setDescription(event.target.value)} placeholder="A short reminder of why it matters" maxLength={90} /></label><label>How do you want to track it?</label><div className="type-picker"><button type="button" className={type === 'checkbox' ? 'selected' : ''} onClick={() => setType('checkbox')}><CheckCircle2 size={20} /><b>Checkbox</b><small>Done or not done</small></button><button type="button" className={type === 'timed' ? 'selected' : ''} onClick={() => setType('timed')}><Clock3 size={20} /><b>Timed</b><small>Log minutes spent</small></button></div>{type === 'checkbox' && <label className="minute-field">Minutes credited when checked<input type="number" min="0" max="1440" value={minuteCredit} onChange={event => setMinuteCredit(event.target.value)} placeholder="e.g. 10" /><small>Every completed day adds this fixed amount to your totals.</small></label>}<label>Color</label><div className="color-picker">{palette.map(option => <button type="button" aria-label={`Choose ${option}`} key={option} className={color === option ? 'chosen' : ''} style={{ background: option }} onClick={() => setColor(option)} />)}</div><div className="form-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit">{mode === 'add' ? <><Plus size={17} /> Add goal</> : <><Check size={17} /> Save changes</>}</button></div></form></div>; }

if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/Goal-tracker/sw.js', { scope: '/Goal-tracker/', updateViaCache: 'none' }).catch(() => undefined); });
createRoot(document.getElementById('root')!).render(<App />);
