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
