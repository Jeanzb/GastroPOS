import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiningRoom } from '@/hooks/operations';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { DiningTableDto, DiningTableStatus, DiningZoneDto } from '@/types/dining';

type StatusTone = 'green' | 'red' | 'amber' | 'neutral';

const STATUS_CONFIG: Record<
  DiningTableStatus,
  { label: string; tone: StatusTone; topBorder: string; dot: string }
> = {
  FREE: { label: 'Libre', tone: 'green', topBorder: 'bg-emerald-400', dot: 'bg-emerald-500' },
  OCCUPIED: { label: 'Ocupada', tone: 'red', topBorder: 'bg-red-400', dot: 'bg-red-500' },
  PENDING_BILL: { label: 'Cuenta pendiente', tone: 'amber', topBorder: 'bg-amber-400', dot: 'bg-amber-500' },
  RESERVED: { label: 'Reservada', tone: 'neutral', topBorder: 'bg-muted-foreground/40', dot: 'bg-muted-foreground/60' },
};

const NEXT_STATUS: Record<DiningTableStatus, DiningTableStatus> = {
  FREE: 'OCCUPIED',
  OCCUPIED: 'PENDING_BILL',
  PENDING_BILL: 'FREE',
  RESERVED: 'OCCUPIED',
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
    return `${minutes ?? 0} min · ${table.waiterName ?? 'Sin mesero'}`;
  }
  if (table.status === 'RESERVED') {
    return `${table.reservationTime ?? 'Sin hora'} · ${table.reservationName ?? 'Reserva'}`;
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

function ZoneFilterButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-carbon text-white shadow-sm'
          : 'text-muted-foreground hover:bg-card hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('nums text-xs', isActive ? 'text-white/70' : 'text-muted-foreground/70')}>
        {count}
      </span>
    </button>
  );
}

function TableCard({
  table,
  isMutating,
  onCycle,
}: {
  table: DiningTableDto;
  isMutating: boolean;
  onCycle: (table: DiningTableDto) => void;
}) {
  const status = STATUS_CONFIG[table.status];
  const detail = tableDetail(table);

  return (
    <button
      type="button"
      disabled={isMutating}
      onClick={() => onCycle(table)}
      title={`Cambiar a ${STATUS_CONFIG[NEXT_STATUS[table.status]].label}`}
      className={cn(
        'group relative flex min-h-[132px] flex-col overflow-hidden rounded-xl border border-border bg-card p-4 text-left shadow-sm transition',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 disabled:opacity-60',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', status.topBorder)} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Mesa
          </p>
          <p className="nums mt-0.5 text-3xl font-bold leading-none text-foreground">
            {table.number}
          </p>
        </div>
        <span className="nums flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {table.seats}
        </span>
      </div>

      <div className="mt-3">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {detail ? (
        <p className="nums mt-auto pt-3 text-xs text-muted-foreground">{detail}</p>
      ) : (
        <span className="mt-auto" />
      )}
    </button>
  );
}

export function TablesWorkspace() {
  const [activeZone, setActiveZone] = useState<string>(ALL);
  const user = useAuthStore((state) => state.user);
  const diningRoom = useDiningRoom();
  const zones = diningRoom.zonesQuery.data ?? [];
  const allTables = useMemo(() => zones.flatMap((zone) => zone.tables), [zones]);
  const isMutating = diningRoom.updateTableStatusMutation.isPending;

  const visibleZones = activeZone === ALL ? zones : zones.filter((zone) => zone.id === activeZone);

  const onCycle = async (table: DiningTableDto) => {
    const nextStatus = NEXT_STATUS[table.status];
    try {
      await diningRoom.updateTableStatusMutation.mutateAsync({
        id: table.id,
        payload: {
          status: nextStatus,
          waiterName:
            table.status === 'FREE' || table.status === 'RESERVED'
              ? (user?.fullName ?? 'Mesero')
              : table.waiterName,
        },
      });
      toast.success(`Mesa ${table.number} · ${STATUS_CONFIG[nextStatus].label}`);
    } catch (error) {
      toast.error('No se pudo actualizar la mesa', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const renderTable = (table: DiningTableDto) => (
    <TableCard key={table.id} table={table} isMutating={isMutating} onCycle={onCycle} />
  );

  const renderZone = (zone: DiningZoneDto) => (
    <section key={zone.id} className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight">{zone.name}</h2>
        <StatusPill tone="neutral">{`${zone.tables.length} mesas · ${activeCount(zone.tables)} activas`}</StatusPill>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {zone.tables.map(renderTable)}
      </div>
    </section>
  );

  const renderZoneFilter = (zone: DiningZoneDto) => (
    <ZoneFilterButton
      key={zone.id}
      label={zone.name}
      count={zone.tables.length}
      isActive={activeZone === zone.id}
      onClick={() => setActiveZone(zone.id)}
    />
  );

  if (diningRoom.zonesQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-xl" />
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
              Verifica que la API este corriendo y la sesion activa.
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
          No hay zonas configuradas. Crea zonas y mesas desde el editor del salon.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
          <ZoneFilterButton
            label="Todas"
            count={allTables.length}
            isActive={activeZone === ALL}
            onClick={() => setActiveZone(ALL)}
          />
          {zones.map(renderZoneFilter)}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <LegendItem tone="green" label="Libre" />
          <LegendItem tone="red" label="Ocupada" />
          <LegendItem tone="amber" label="Cuenta pendiente" />
          <LegendItem tone="neutral" label="Reservada" />
        </div>
      </div>

      <p className="nums text-sm text-muted-foreground">
        {countByStatus(allTables, 'FREE')} libres · {activeCount(allTables)} activas ·{' '}
        {allTables.length} mesas en total
      </p>

      <div className="space-y-6">{visibleZones.map(renderZone)}</div>
    </div>
  );
}
