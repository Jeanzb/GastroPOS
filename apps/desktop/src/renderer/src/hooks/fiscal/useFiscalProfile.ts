import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { FiscalService } from '@/services/fiscal';
import { useActiveBranch } from '@/hooks/tenancy';
import type {
  CreateFiscalCreditNotePayload,
  UpsertBranchFiscalConfigurationPayload,
  UpsertFactusConnectionPayload,
  UpsertFiscalProfilePayload,
} from '@/types/fiscal';

export function useFiscalProfile() {
  const queryClient = useQueryClient();
  const activeBranch = useActiveBranch();
  const branchScope = activeBranch?.id ?? 'no-branch';

  const profileQuery = useQuery({
    queryKey: [QUERY_KEYS.fiscalProfile],
    queryFn: () => FiscalService.getProfile(),
  });

  const connectionQuery = useQuery({
    queryKey: [QUERY_KEYS.fiscalProfile, 'connection'],
    queryFn: () => FiscalService.getConnection(),
  });

  const branchConfigurationQuery = useQuery({
    queryKey: [QUERY_KEYS.fiscalProfile, 'branch-configuration', branchScope],
    queryFn: () => FiscalService.getBranchConfiguration(),
    enabled: Boolean(activeBranch?.id),
  });

  const documentsQuery = useQuery({
    queryKey: [QUERY_KEYS.fiscalDocuments, branchScope],
    queryFn: () => FiscalService.listDocuments(),
    enabled: Boolean(activeBranch?.id),
  });

  const rangesQuery = useQuery({
    queryKey: [QUERY_KEYS.fiscalNumberingRanges],
    queryFn: () => FiscalService.listNumberingRanges(),
    enabled: false,
  });

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalProfile] });
  const invalidateDocuments = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalDocuments, branchScope] });
  const invalidateRanges = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalNumberingRanges] });

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertFiscalProfilePayload) => FiscalService.upsertProfile(payload),
    onSuccess: invalidateProfile,
  });

  const configureConnectionMutation = useMutation({
    mutationFn: (payload: UpsertFactusConnectionPayload) => FiscalService.configureConnection(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalProfile, 'connection'] }),
  });

  const verifyConnectionMutation = useMutation({
    mutationFn: () => FiscalService.verifyConnection(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalProfile, 'connection'] }),
  });

  const upsertBranchConfigurationMutation = useMutation({
    mutationFn: (payload: UpsertBranchFiscalConfigurationPayload) =>
      FiscalService.upsertBranchConfiguration(payload),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.fiscalProfile, 'branch-configuration', branchScope],
    }),
  });

  const retryDocumentMutation = useMutation({
    mutationFn: (id: string) => FiscalService.retryDocument(id),
    onSuccess: invalidateDocuments,
  });

  const downloadArtifactsMutation = useMutation({
    mutationFn: (id: string) => FiscalService.downloadArtifacts(id),
    onSuccess: invalidateDocuments,
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: (input: { id: string; payload: CreateFiscalCreditNotePayload }) =>
      FiscalService.createCreditNote(input.id, input.payload),
    onSuccess: () => {
      invalidateDocuments();
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalDocument, branchScope] });
    },
  });

  return {
    profileQuery,
    connectionQuery,
    branchConfigurationQuery,
    documentsQuery,
    rangesQuery,
    upsertMutation,
    configureConnectionMutation,
    verifyConnectionMutation,
    upsertBranchConfigurationMutation,
    retryDocumentMutation,
    downloadArtifactsMutation,
    createCreditNoteMutation,
    invalidateRanges,
  };
}

export function useFiscalDocument(id: string | null) {
  const activeBranch = useActiveBranch();
  const branchScope = activeBranch?.id ?? 'no-branch';
  return useQuery({
    queryKey: [QUERY_KEYS.fiscalDocument, branchScope, id],
    queryFn: () => FiscalService.getDocumentDetail(id ?? ''),
    enabled: Boolean(id && activeBranch?.id),
  });
}
