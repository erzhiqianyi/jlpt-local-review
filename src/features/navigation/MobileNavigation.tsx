import { Check, Filter, Menu, MoreHorizontal, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { AppView, Deck, StudyPage } from '../../types';

type NavItem = { view: AppView; label: string };

export function DesktopUtilityMenu({ activeView, items, labels, onNavigate }: {
  activeView: AppView;
  items: NavItem[];
  labels: Record<string, string>;
  onNavigate: (view: AppView) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden lg:block">
      <button type="button" aria-label={labels.mobileMenu} title={labels.mobileMenu} onClick={() => setOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-md text-[#31564c] hover:bg-[#edf2ed]">
        <MoreHorizontal size={21} />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-56 rounded-md border border-[#d7dfd6] bg-white p-2 shadow-lg">
          {items.map((item) => (
            <button key={item.view} type="button" onClick={() => { setOpen(false); onNavigate(item.view); }} className="flex min-h-10 w-full items-center justify-between rounded px-3 text-left text-sm font-semibold text-[#4f5b55] hover:bg-[#f3f6f2]">
              <span>{item.label}</span>
              {activeView === item.view ? <Check size={16} className="text-[#31564c]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DesktopStudyToolbar({ mode, labels, deckLabels, selectedDeck, allowDeckFilter, onModeChange, onDeckChange }: {
  mode: StudyPage;
  labels: Record<string, string>;
  deckLabels: Record<Deck | 'all', string>;
  selectedDeck: Deck | 'all';
  allowDeckFilter: boolean;
  onModeChange: (mode: StudyPage) => void;
  onDeckChange: (deck: Deck | 'all') => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const modes: Array<{ value: StudyPage; label: string }> = [
    { value: 'questions', label: labels.questionPage },
    { value: 'words', label: labels.wordPage },
    { value: 'review', label: labels.reviewPage },
  ];

  return (
    <div className="hidden min-h-12 items-center justify-between gap-4 border-b border-[#d7dfd6] lg:flex">
      <div className="flex items-center" role="group" aria-label={labels.studyMode}>
        {modes.map((item) => (
          <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => onModeChange(item.value)} className={`min-h-12 border-b-2 px-5 text-sm font-semibold ${mode === item.value ? 'border-[#31564c] text-[#31564c]' : 'border-transparent text-[#707a74] hover:text-[#34413b]'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {allowDeckFilter ? (
        <div className="relative">
          <button type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[#52645c] hover:bg-[#edf2ed]">
            <Filter size={16} /> {deckLabels[selectedDeck]}
          </button>
          {filterOpen ? (
            <div className="absolute right-0 top-11 z-30 w-52 rounded-md border border-[#d7dfd6] bg-white p-2 shadow-lg">
              {(Object.keys(deckLabels) as Array<Deck | 'all'>).map((deck) => (
                <button key={deck} type="button" onClick={() => { onDeckChange(deck); setFilterOpen(false); }} className="flex min-h-10 w-full items-center justify-between rounded px-3 text-left text-sm font-semibold text-[#4f5b55] hover:bg-[#f3f6f2]">
                  <span>{deckLabels[deck]}</span>
                  {selectedDeck === deck ? <Check size={16} className="text-[#31564c]" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MobileHeader({
  brand,
  activeView,
  items,
  labels,
  searchContent,
  onHome,
  onNavigate,
}: {
  brand: string;
  activeView: AppView;
  items: NavItem[];
  labels: Record<string, string>;
  searchContent: ReactNode;
  onHome: () => void;
  onNavigate: (view: AppView) => void;
}) {
  const [panel, setPanel] = useState<'menu' | 'search' | null>(null);
  const currentLabel = items.find((item) => item.view === activeView)?.label ?? brand;

  useEffect(() => setPanel(null), [activeView]);
  useEffect(() => {
    document.body.style.overflow = panel ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [panel]);

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-3 lg:hidden">
        <button type="button" onClick={onHome} className="min-w-0 text-left">
          <span className="block truncate text-sm font-semibold text-[#173d35]">{brand}</span>
          {activeView !== 'home' ? <span className="block truncate text-xs text-[#707a74]">{currentLabel}</span> : null}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={labels.searchOpen} onClick={() => setPanel('search')}><Search size={20} /></IconButton>
          <IconButton label={labels.mobileMenu} onClick={() => setPanel('menu')}><Menu size={21} /></IconButton>
        </div>
      </div>

      {panel ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f8f5] lg:hidden" role="dialog" aria-modal="true" aria-label={panel === 'search' ? labels.searchOpen : labels.mobileNavigation}>
          <div className="mx-auto min-h-full w-full max-w-lg px-4 pb-10">
            <header className="flex h-16 items-center justify-between border-b border-[#d8dfd8]">
              <div>
                <p className="text-xs font-semibold text-[#7d6032]">{brand}</p>
                <h2 className="mt-0.5 text-lg font-semibold text-[#27312c]">{panel === 'search' ? labels.searchOpen : labels.mobileNavigation}</h2>
              </div>
              <IconButton label={labels.mobileClose} onClick={() => setPanel(null)}><X size={22} /></IconButton>
            </header>

            {panel === 'search' ? (
              <div className="pt-5">{searchContent}</div>
            ) : (
              <nav className="divide-y divide-[#dfe5df] border-b border-[#dfe5df] pt-2">
                {items.map((item) => (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => { setPanel(null); onNavigate(item.view); }}
                    className="flex min-h-14 w-full items-center justify-between py-3 text-left text-base font-semibold text-[#34413b]"
                  >
                    <span>{item.label}</span>
                    {activeView === item.view ? <Check size={19} className="text-[#31564c]" /> : null}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MobileStudyControls({
  mode,
  labels,
  deckLabels,
  selectedDeck,
  allowDeckFilter,
  onModeChange,
  onDeckChange,
}: {
  mode: StudyPage;
  labels: Record<string, string>;
  deckLabels: Record<Deck | 'all', string>;
  selectedDeck: Deck | 'all';
  allowDeckFilter: boolean;
  onModeChange: (mode: StudyPage) => void;
  onDeckChange: (deck: Deck | 'all') => void;
}) {
  const [panel, setPanel] = useState<'task' | 'filter' | null>(null);
  const modes: Array<{ value: StudyPage; label: string }> = [
    { value: 'questions', label: labels.questionPage },
    { value: 'words', label: labels.wordPage },
    { value: 'review', label: labels.reviewPage },
  ];
  const currentMode = modes.find((item) => item.value === mode)?.label ?? labels.questionPage;

  useEffect(() => setPanel(null), [mode, selectedDeck]);
  useEffect(() => {
    document.body.style.overflow = panel ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [panel]);

  return (
    <>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[#dbe2dc] bg-white px-4 lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#7d6032]">{labels.mobileCurrentTask}</p>
          <p className="truncate text-sm font-semibold text-[#27312c]">
            {currentMode}{allowDeckFilter ? ` · ${deckLabels[selectedDeck]}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={labels.mobileSwitchTask} onClick={() => setPanel('task')}><SlidersHorizontal size={19} /></IconButton>
          {allowDeckFilter ? <IconButton label={labels.filters} onClick={() => setPanel('filter')}><Filter size={19} /></IconButton> : null}
        </div>
      </div>

      {panel ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f8f5] lg:hidden" role="dialog" aria-modal="true">
          <div className="mx-auto min-h-full w-full max-w-lg px-4 pb-10">
            <header className="flex h-16 items-center justify-between border-b border-[#d8dfd8]">
              <h2 className="text-lg font-semibold text-[#27312c]">{panel === 'task' ? labels.mobileSwitchTask : labels.filters}</h2>
              <IconButton label={labels.mobileClose} onClick={() => setPanel(null)}><X size={22} /></IconButton>
            </header>
            <div className="divide-y divide-[#dfe5df] border-b border-[#dfe5df] pt-2">
              {panel === 'task' ? modes.map((item) => (
                <SheetChoice key={item.value} active={mode === item.value} label={item.label} onClick={() => onModeChange(item.value)} />
              )) : (Object.keys(deckLabels) as Array<Deck | 'all'>).map((deck) => (
                <SheetChoice key={deck} active={selectedDeck === deck} label={deckLabels[deck]} onClick={() => onDeckChange(deck)} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-md text-[#31564c] hover:bg-[#edf2ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31564c]">
      {children}
    </button>
  );
}

function SheetChoice({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between py-3 text-left text-base font-semibold text-[#34413b]">
      <span>{label}</span>
      {active ? <Check size={19} className="text-[#31564c]" /> : null}
    </button>
  );
}
