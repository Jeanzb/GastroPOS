import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { EmployeeService } from '@/services/employees';
import type {
  CreateEmployeePayload,
  EmployeeListParams,
  UpdateEmployeeAccessPayload,
  UpdateEmployeePayload,
} from '@/types/employees';

export function useEmployees() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<EmployeeListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.employees, params],
    queryFn: () => EmployeeService.getEmployees(params),
  });

  const onMutationSuccess = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.employees] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateEmployeePayload) => EmployeeService.createEmployee(payload),
    onSuccess: onMutationSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateEmployeePayload }) =>
      EmployeeService.updateEmployee(input.id, input.payload),
    onSuccess: onMutationSuccess,
  });

  const accessMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateEmployeeAccessPayload }) =>
      EmployeeService.updateEmployeeAccess(input.id, input.payload),
    onSuccess: onMutationSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => EmployeeService.deleteEmployee(id),
    onSuccess: onMutationSuccess,
  });

  return {
    params,
    setParams,
    listQuery,
    createMutation,
    updateMutation,
    accessMutation,
    deleteMutation,
  };
}
