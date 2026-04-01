import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

export function useApiQuery<T>(key: string[], endpoint: string, options?: { enabled?: boolean }) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api.get<T>(endpoint),
    ...options,
  })
}

export function useApiMutation<TData, TVariables>(
  endpoint: string,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post',
  invalidateKeys?: string[][]
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => api[method]<TData>(endpoint, variables),
    onSuccess: () => {
      invalidateKeys?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
    },
  })
}

interface SignatureData {
  signature: string
  signature_name: string
  signed_at?: string
}

interface SignatureInfo {
  signature?: string
  signature_name?: string
  signed_at?: string
}

export function useDocumentSignature(docType: string, docId: string) {
  const queryClient = useQueryClient()

  // Fetch signature data
  const { data: signatureData, isLoading, error } = useQuery({
    queryKey: ['signature', docType, docId],
    queryFn: async () => {
      const response = await api.get<{ data: SignatureInfo }>(`/go-live/signature/${docType}/${docId}`)
      return response.data
    },
    enabled: !!docId && !!docType,
  })

  // Save signature
  const saveSignatureMutation = useMutation({
    mutationFn: async (signatureData: SignatureData) => {
      return await api.post(`/go-live/signature/${docType}/${docId}`, {
        ...signatureData,
        signed_at: signatureData.signed_at || new Date().toISOString(),
      })
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['signature', docType, docId] })
      // Also invalidate document queries to refresh the document data
      queryClient.invalidateQueries({ queryKey: [docType, docId] })
    },
  })

  // Delete signature
  const deleteSignatureMutation = useMutation({
    mutationFn: async () => {
      // To delete a signature, we save an empty signature
      return await api.post(`/go-live/signature/${docType}/${docId}`, {
        signature: '',
        signature_name: '',
        signed_at: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature', docType, docId] })
      queryClient.invalidateQueries({ queryKey: [docType, docId] })
    },
  })

  return {
    signatureData,
    isLoading,
    error,
    saveSignature: saveSignatureMutation.mutateAsync,
    isSaving: saveSignatureMutation.isPending,
    deleteSignature: deleteSignatureMutation.mutateAsync,
    isDeleting: deleteSignatureMutation.isPending,
  }
}

interface PickerNotification {
  id: string
  delivery_number: string
  delivery_date: string
  customer_name: string
  warehouse_id: string
  status: string
  notes: string
  delivery_created_at: string
}

export function usePickerNotifications() {
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['picker-notifications'],
    queryFn: async () => {
      const response = await api.get<{ data: PickerNotification[] }>('/go-live/notifications/pickers')
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  return {
    notifications,
    isLoading,
    error,
    refresh: refetch,
  }
}

interface EmailConfig {
  email_provider: string
  email_from_address: string
  email_from_name: string
  email_domain?: string
  azure_client_id?: string
  azure_tenant_id?: string
}

export function useEmailConfig() {
  const queryClient = useQueryClient()
  
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const response = await api.get<{ data: EmailConfig }>('/go-live/email/config')
      return response.data
    },
  })

  const updateConfig = useMutation({
    mutationFn: async (newConfig: Partial<EmailConfig>) => {
      return await api.put('/go-live/email/config', newConfig)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] })
    },
  })

  const setDefaultConfig = useMutation({
    mutationFn: async () => {
      return await api.post('/go-live/email/config/default')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] })
    },
  })

  return {
    config,
    isLoading,
    error,
    updateConfig: updateConfig.mutateAsync,
    isUpdating: updateConfig.isPending,
    setDefaultConfig: setDefaultConfig.mutateAsync,
    isSettingDefault: setDefaultConfig.isPending,
  }
}
