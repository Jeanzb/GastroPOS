import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { useActiveBranch } from '@/hooks/tenancy';
import { DiningService } from '@/services/operations';
import type {
  CreateDiningTableRequest,
  CreateDiningZoneRequest,
  DiningTableDto,
  DiningZoneDto,
  UpdateDiningTableRequest,
  UpdateDiningTableStatusRequest,
  UpdateDiningZoneRequest,
} from '@/types/dining';

export function useDiningRoom() {
  const queryClient = useQueryClient();
  const activeBranch = useActiveBranch();
  const activeBranchId = activeBranch?.id;
  const scopedDiningZonesKey = [QUERY_KEYS.diningZones, activeBranchId] as const;

  const zonesQuery = useQuery({
    queryKey: scopedDiningZonesKey,
    queryFn: () => DiningService.getZones(),
    enabled: Boolean(activeBranchId),
  });

  const setZones = (updater: (zones: DiningZoneDto[]) => DiningZoneDto[]) => {
    queryClient.setQueryData<DiningZoneDto[]>(scopedDiningZonesKey, (current) =>
      updater(current ?? []),
    );
  };

  const createZoneMutation = useMutation({
    mutationFn: (payload: CreateDiningZoneRequest) => DiningService.createZone(payload),
    onSuccess: (created) => {
      setZones((zones) => sortZones([...zones, created]));
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateDiningZoneRequest }) =>
      DiningService.updateZone(input.id, input.payload),
    onSuccess: (updated) => {
      setZones((zones) =>
        sortZones(
          zones.map((zone) =>
            zone.id === updated.id ? { ...zone, ...updated, tables: zone.tables } : zone,
          ),
        ),
      );
    },
  });

  const createTableMutation = useMutation({
    mutationFn: (input: { zoneId: string; payload: CreateDiningTableRequest }) =>
      DiningService.createTable(input.zoneId, input.payload),
    onSuccess: (created) => {
      setZones((zones) =>
        zones.map((zone) =>
          zone.id === created.zoneId
            ? { ...zone, tables: sortTables([...zone.tables, created]) }
            : zone,
        ),
      );
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateDiningTableRequest }) =>
      DiningService.updateTable(input.id, input.payload),
    onSuccess: (updated) => {
      setZones((zones) => replaceTable(zones, updated));
    },
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateDiningTableStatusRequest }) =>
      DiningService.updateTableStatus(input.id, input.payload),
    onSuccess: (updated) => {
      setZones((zones) => replaceTable(zones, updated));
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => DiningService.deleteZone(id),
    onSuccess: (_result, id) => {
      setZones((zones) => zones.filter((zone) => zone.id !== id));
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => DiningService.deleteTable(id),
    onSuccess: (_result, id) => {
      setZones((zones) =>
        zones.map((zone) => ({
          ...zone,
          tables: zone.tables.filter((table) => table.id !== id),
        })),
      );
    },
  });

  return {
    zonesQuery,
    createZoneMutation,
    updateZoneMutation,
    createTableMutation,
    updateTableMutation,
    updateTableStatusMutation,
    deleteZoneMutation,
    deleteTableMutation,
  };
}

function replaceTable(zones: DiningZoneDto[], updated: DiningTableDto): DiningZoneDto[] {
  const withoutUpdated = zones.map((zone) => ({
    ...zone,
    tables: zone.tables.filter((table) => table.id !== updated.id),
  }));

  return withoutUpdated.map((zone) =>
    zone.id === updated.zoneId
      ? { ...zone, tables: sortTables([...zone.tables, updated]) }
      : zone,
  );
}

function sortZones(zones: DiningZoneDto[]): DiningZoneDto[] {
  return [...zones].sort((left, right) => {
    const byOrder = left.sortOrder - right.sortOrder;
    return byOrder === 0 ? left.name.localeCompare(right.name) : byOrder;
  });
}

function sortTables(tables: DiningTableDto[]): DiningTableDto[] {
  return [...tables].sort((left, right) =>
    left.number.localeCompare(right.number, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}
