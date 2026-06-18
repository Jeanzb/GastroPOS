import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { DiningService } from '@/services/operations';
import type {
  CreateDiningTableRequest,
  CreateDiningZoneRequest,
  UpdateDiningTableRequest,
  UpdateDiningTableStatusRequest,
  UpdateDiningZoneRequest,
} from '@/types/dining';

export function useDiningRoom() {
  const queryClient = useQueryClient();

  const zonesQuery = useQuery({
    queryKey: [QUERY_KEYS.diningZones],
    queryFn: () => DiningService.getZones(),
  });

  const invalidateDiningRoom = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.diningZones] });

  const createZoneMutation = useMutation({
    mutationFn: (payload: CreateDiningZoneRequest) => DiningService.createZone(payload),
    onSuccess: invalidateDiningRoom,
  });

  const updateZoneMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateDiningZoneRequest }) =>
      DiningService.updateZone(input.id, input.payload),
    onSuccess: invalidateDiningRoom,
  });

  const createTableMutation = useMutation({
    mutationFn: (input: { zoneId: string; payload: CreateDiningTableRequest }) =>
      DiningService.createTable(input.zoneId, input.payload),
    onSuccess: invalidateDiningRoom,
  });

  const updateTableMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateDiningTableRequest }) =>
      DiningService.updateTable(input.id, input.payload),
    onSuccess: invalidateDiningRoom,
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateDiningTableStatusRequest }) =>
      DiningService.updateTableStatus(input.id, input.payload),
    onSuccess: invalidateDiningRoom,
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => DiningService.deleteZone(id),
    onSuccess: invalidateDiningRoom,
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => DiningService.deleteTable(id),
    onSuccess: invalidateDiningRoom,
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
