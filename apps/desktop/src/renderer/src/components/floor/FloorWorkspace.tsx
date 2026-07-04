import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDiningRoom } from '@/hooks/operations';
import { cn } from '@/lib/utils';
import type { DiningTableDto, DiningZoneDto } from '@/types/dining';

interface PendingDelete {
  type: 'zone' | 'table';
  id: string;
  label: string;
}

function countSeats(zone: DiningZoneDto): number {
  return zone.tables.reduce((total, table) => total + table.seats, 0);
}

function nextTableNumber(zones: DiningZoneDto[]): string {
  const numbers = zones
    .flatMap((zone) => zone.tables)
    .map((table) => Number.parseInt(table.number, 10))
    .filter(Number.isFinite);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return String(next).padStart(2, '0');
}

function nextZoneName(zones: DiningZoneDto[]): string {
  const existingNames = new Set(zones.map((zone) => zone.name.trim().toLowerCase()));
  let index = zones.length + 1;
  let candidate = `Zona ${index}`;

  while (existingNames.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `Zona ${index}`;
  }

  return candidate;
}

function InlineEdit({
  value,
  onCommit,
  ariaLabel,
  className,
}: {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onCommit(trimmed);
      return;
    }
    setDraft(value);
  };

  return (
    <input
      value={draft}
      aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      className={cn(
        'w-full rounded-md border border-transparent bg-transparent px-1 outline-none transition-colors hover:border-border focus:border-orange focus:bg-card',
        className,
      )}
    />
  );
}

function SeatStepper({
  seats,
  disabled,
  onChange,
}: {
  seats: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || seats <= 1}
        onClick={() => onChange(seats - 1)}
        aria-label="Quitar puesto"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="nums w-5 text-center text-sm font-semibold">{seats}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(seats + 1)}
        aria-label="Agregar puesto"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function FloorWorkspace() {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const diningRoom = useDiningRoom();
  const zones = diningRoom.zonesQuery.data ?? [];
  const isSaving =
    diningRoom.createZoneMutation.isPending ||
    diningRoom.updateZoneMutation.isPending ||
    diningRoom.createTableMutation.isPending ||
    diningRoom.updateTableMutation.isPending ||
    diningRoom.deleteZoneMutation.isPending ||
    diningRoom.deleteTableMutation.isPending;

  const onCreateZone = async () => {
    try {
      const name = nextZoneName(zones);
      await diningRoom.createZoneMutation.mutateAsync({
        name,
        sortOrder: zones.length + 1,
      });
      toast.success('Zona creada', { description: 'Renombrala y agrega sus mesas.' });
    } catch (error) {
      toast.error('No se pudo crear la zona', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const onRenameZone = async (zone: DiningZoneDto, name: string) => {
    try {
      await diningRoom.updateZoneMutation.mutateAsync({ id: zone.id, payload: { name } });
    } catch (error) {
      toast.error('No se pudo renombrar la zona', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const onCreateTable = async (zone: DiningZoneDto) => {
    try {
      await diningRoom.createTableMutation.mutateAsync({
        zoneId: zone.id,
        payload: { number: nextTableNumber(zones), seats: 4 },
      });
    } catch (error) {
      toast.error('No se pudo crear la mesa', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const onRenameTable = async (table: DiningTableDto, number: string) => {
    try {
      await diningRoom.updateTableMutation.mutateAsync({ id: table.id, payload: { number } });
    } catch (error) {
      toast.error('No se pudo actualizar la mesa', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const onChangeSeats = async (table: DiningTableDto, seats: number) => {
    try {
      await diningRoom.updateTableMutation.mutateAsync({ id: table.id, payload: { seats } });
    } catch (error) {
      toast.error('No se pudieron actualizar los puestos', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      if (target.type === 'zone') {
        await diningRoom.deleteZoneMutation.mutateAsync(target.id);
        toast.success('Zona eliminada', { description: `${target.label} salio del salon.` });
      } else {
        await diningRoom.deleteTableMutation.mutateAsync(target.id);
        toast.success('Mesa eliminada', { description: `Mesa ${target.label} eliminada.` });
      }
    } catch (error) {
      toast.error('No se pudo eliminar', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const renderTable = (table: DiningTableDto) => (
    <div
      key={table.id}
      className="relative flex flex-col gap-3 rounded-lg border border-border bg-background p-3 shadow-sm"
    >
      <button
        type="button"
        disabled={isSaving}
        onClick={() => setPendingDelete({ type: 'table', id: table.id, label: table.number })}
        aria-label={`Eliminar mesa ${table.number}`}
        className="absolute right-2 top-2 text-muted-foreground/60 transition-colors hover:text-destructive disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Mesa
        </p>
        <InlineEdit
          value={table.number}
          ariaLabel={`Numero de la mesa ${table.number}`}
          onCommit={(next) => void onRenameTable(table, next)}
          className="nums -ml-1 text-2xl font-bold text-foreground"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Puestos
        </span>
        <SeatStepper
          seats={table.seats}
          disabled={isSaving}
          onChange={(next) => void onChangeSeats(table, next)}
        />
      </div>
    </div>
  );

  const renderZone = (zone: DiningZoneDto) => (
    <Card key={zone.id} className="border-border/80 bg-surface-raised shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <InlineEdit
              value={zone.name}
              ariaLabel={`Nombre de la zona ${zone.name}`}
              onCommit={(next) => void onRenameZone(zone, next)}
              className="font-display max-w-xs text-lg font-semibold tracking-tight"
            />
            <StatusPill tone="neutral">{`${zone.tables.length} mesas · ${countSeats(zone)} puestos`}</StatusPill>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={() => setPendingDelete({ type: 'zone', id: zone.id, label: zone.name })}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar zona
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {zone.tables.map(renderTable)}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void onCreateTable(zone)}
            className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-orange hover:text-orange disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Mesa</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  if (diningRoom.zonesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );
  }

  if (diningRoom.zonesQuery.isError) {
    return (
      <Card className="border-border/80 bg-surface-raised shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">No se pudo cargar el salon.</p>
            <p className="mt-1 text-sm text-muted-foreground">Verifica la API y vuelve a intentar.</p>
          </div>
          <Button onClick={() => void diningRoom.zonesQuery.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Editor de zonas y mesas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organiza la distribucion del salon, los puestos por mesa y las zonas activas.
          </p>
        </div>
        <Button type="button" disabled={isSaving} onClick={() => void onCreateZone()}>
          <Plus className="h-4 w-4" />
          Nueva zona
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card className="border-dashed border-border bg-surface-raised">
          <CardContent className="p-10 text-center">
            <p className="font-medium">Aun no hay zonas configuradas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea la primera zona para empezar a ubicar mesas.
            </p>
            <Button className="mt-4" disabled={isSaving} onClick={() => void onCreateZone()}>
              <Plus className="h-4 w-4" />
              Nueva zona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">{zones.map(renderZone)}</div>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.type === 'zone' ? 'Eliminar zona' : 'Eliminar mesa'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === 'zone'
                ? `Se eliminaran "${pendingDelete?.label}" y todas sus mesas. Esta accion no se puede deshacer.`
                : `Se eliminara la mesa ${pendingDelete?.label}. Esta accion no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void onConfirmDelete()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
