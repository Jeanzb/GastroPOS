import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiningRoom } from '@/hooks/operations';
import { cn } from '@/lib/utils';
import { useOrderStore } from '@/stores';
import type { DiningTableDto, DiningTableStatus, DiningZoneDto } from '@/types/dining';

type StatusTone = 'green' | 'red' | 'amber' | 'neutral';

const STATUS_CONFIG: Record<
  DiningTableStatus,
  { label: string; tone: StatusTone; strip: string; dot: string }
> = {
  FREE: { label: 'Libre', tone: 'green', strip: 'bg-emerald-400', dot: 'bg-emerald-500' },
  OCCUPIED: { label: 'Ocupada', tone: 'red', strip: 'bg-orange', dot: 'bg-orange' },
  PENDING_BILL: { label: 'Cuenta pendiente', tone: 'amber', strip: 'bg-amber-400', dot: 'bg-amber-500' },
  RESERVED: { label: 'Reservada', tone: 'neutral', strip: 'bg-muted-foreground/40', dot: 'bg-muted-foreground/60' },
};

const ALL = 'all';

function countByStatus(tables: DiningTableDto[], status: DiningTableStatus): number {
  return tables.filter((table) => table.status === status).length;
}

function activeCount(tables: DiningTableDto[]): number {
  return tables.filter(
    (table) => table.status === 'OCCUPIED' || table.status === 'PENDING_BILL',
  ).length;
}

function getMinutes(table: DiningTableDto): number | null {
  if (!table.openedAt) {
    return null;
  }
  return Math.max(0, Math.round((Date.now() - new Date(table.openedAt).getTime()) / 60_000));
}

function tableDetail(table: DiningTableDto): string | null {
  if (table.status === 'OCCUPIED' || table.status === 'PENDING_BILL') {
    const minutes = getMinutes(table);
    return `${minutes ?? 0} min - ${table.waiterName ?? 'Sin mesero'}`;
  }
  if (table.status === 'RESERVED') {
    return `${table.reservationTime ?? 'Sin hora'} - ${table.reservationName ?? 'Reserva'}`;
  }
  return null;
}

function LegendItem({ tone, label }: { tone: StatusTone; label: string }) {
  const dot = STATUS_CONFIG[
    (Object.keys(STATUS_CONFIG) as DiningTableStatus[]).find(
      (status) => STATUS_CONFIG[status].tone === tone,
    ) ?? 'FREE'
  ].dot;
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  );
}

function ZoneTabs({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: { id: string; label: string; count: number }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const active = container.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (active) {
      setPill({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
    }
  }, [activeId, tabs.length]);

  return (
    <div className="w-full overflow-x-auto pb-1 sm:w-auto sm:pb-0">
      <div
        ref={ref}
        className="relative flex w-max min-w-full items-center rounded-xl border border-border bg-surface-raised p-1 sm:min-w-0"
      >
      {pill.ready ? (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-0 rounded-lg bg-carbon shadow-sm ease-[cubic-bezier(.34,1.38,.46,1)] [transition:transform_360ms,width_360ms] motion-reduce:transition-none"
          style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
        />
      ) : null}
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            data-active={isActive}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'relative z-10 flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span className={cn('nums text-xs', isActive ? 'text-white/65' : 'text-muted-foreground/70')}>
              {tab.count}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}

function TableCard({ table, onOpen }: { table: DiningTableDto; onOpen: (table: DiningTableDto) => void }) {
  const status = STATUS_CONFIG[table.status];
  const detail = tableDetail(table);

  return (
    <button
      type="button"
      onClick={() => onOpen(table)}
      data-cy="dining-table-card"
      data-table-status={table.status}
      className={cn(
        'group relative flex min-h-[148px] flex-col overflow-hidden rounded-[14px] border border-border bg-card text-left transition sm:min-h-[156px]',
        'hover:-translate-y-[3px] hover:border-orange/45 hover:shadow-md hover:shadow-carbon/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40',
      )}
    >
      <span className={cn('h-1 w-full', status.strip)} />
      <div className="flex flex-1 flex-col p-[15px]">
        <div className="flex items-start justify-between">
          <div>
            <p className="nums text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Mesa</p>
            <p className="font-display mt-0.5 text-3xl font-bold leading-none">{table.number}</p>
          </div>
          <span className="nums flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {table.seats}
          </span>
        </div>
        <div className="mt-auto pt-3">
          <span
            className={cn(
              'nums inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2 text-[11px] font-bold',
              status.tone === 'green' && 'bg-success-soft text-success',
              status.tone === 'red' && 'bg-danger-soft text-[#C0431A]',
              status.tone === 'amber' && 'bg-warning-soft text-[#9A6A1C]',
              status.tone === 'neutral' && 'bg-surface-quiet text-[#6B6359]',
            )}
          >
            <span className={cn('size-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          {detail ? (
            <p className="nums mt-2.5 border-t border-dashed border-[#ECE6DD] pt-2.5 text-[11px] text-muted-foreground">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function TablesWorkspace() {
  const [activeZone, setActiveZone] = useState<string>(ALL);
  const navigate = useNavigate();
  const setActiveTableId = useOrderStore((state) => state.setActiveTableId);
  const diningRoom = useDiningRoom();
  const zones = diningRoom.zonesQuery.data ?? [];
  const allTables = useMemo(() => zones.flatMap((zone) => zone.tables), [zones]);

  const visibleZones = activeZone === ALL ? zones : zones.filter((zone) => zone.id === activeZone);

  const zoneTabs = useMemo(
    () => [
      { id: ALL, label: 'Todas', count: allTables.length },
      ...zones.map((zone) => ({ id: zone.id, label: zone.name, count: zone.tables.length })),
    ],
    [allTables.length, zones],
  );

  const onOpenTable = (table: DiningTableDto) => {
    setActiveTableId(table.id);
    void navigate({ to: '/pos' });
  };

  const renderTable = (table: DiningTableDto) => (
    <TableCard key={table.id} table={table} onOpen={onOpenTable} />
  );

  const renderZone = (zone: DiningZoneDto) => (
    <section key={zone.id} className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-[17px] font-bold tracking-tight">{zone.name}</h2>
        <StatusPill tone="neutral">{`${zone.tables.length} mesas - ${activeCount(zone.tables)} activas`}</StatusPill>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-[13px] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
        {zone.tables.map(renderTable)}
      </div>
    </section>
  );

  if (diningRoom.zonesQuery.isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-[13px] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
        {Array.from({ length: 1 }, (_, index) => (
          <Skeleton key={index} className="h-[140px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (diningRoom.zonesQuery.isError) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">No se pudieron cargar las mesas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifica que la API esté corriendo y la sesión activa.
            </p>
          </div>
          <Button onClick={() => void diningRoom.zonesQuery.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  if (zones.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No hay zonas configuradas. Crea zonas y mesas desde el editor del salón.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5" data-cy="tables-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ZoneTabs tabs={zoneTabs} activeId={activeZone} onSelect={setActiveZone} />
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <LegendItem tone="green" label="Libre" />
          <LegendItem tone="red" label="Ocupada" />
          <LegendItem tone="amber" label="Cuenta pendiente" />
          <LegendItem tone="neutral" label="Reservada" />
        </div>
      </div>

      <p className="nums text-sm text-muted-foreground">
        {countByStatus(allTables, 'FREE')} libres - {activeCount(allTables)} activas -{' '}
        {allTables.length} mesas en total
      </p>

      <div key={activeZone} className="dc-view-in space-y-6">
        {visibleZones.map(renderZone)}
      </div>
    </div>
  );
}
