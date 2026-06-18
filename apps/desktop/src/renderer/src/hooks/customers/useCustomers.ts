import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { CustomerService } from '@/services/customers';
import type {
  CreateCustomerPayload,
  CustomerListParams,
  UpdateCustomerPayload,
} from '@/types/customers';

export function useCustomers() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomerListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.customers, params],
    queryFn: () => CustomerService.getCustomers(params),
  });

  const onMutationSuccess = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.customers] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      CustomerService.createCustomer(payload),
    onSuccess: onMutationSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateCustomerPayload }) =>
      CustomerService.updateCustomer(input.id, input.payload),
    onSuccess: onMutationSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CustomerService.deleteCustomer(id),
    onSuccess: onMutationSuccess,
  });

  return {
    params,
    setParams,
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
