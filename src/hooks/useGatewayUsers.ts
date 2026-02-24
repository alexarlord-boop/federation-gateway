/**
 * Hook: gateway user management.
 *
 * Users are a **gateway-only** concept — the Admin API OAS does not define
 * user endpoints.  These hooks call `GATEWAY_BASE/api/v1/users` directly.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatewayUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_name?: string;
  status?: string;
  created_at?: string;
}

export interface GatewayUserCreate {
  name: string;
  email: string;
  password?: string;
  role?: string;
  organization_name?: string;
}

export interface GatewayUserUpdate {
  name?: string;
  role?: string;
  organization_name?: string;
}

export interface ChangePasswordPayload {
  new_password: string;
}

export interface AssignRBACRolePayload {
  role_id: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const userKeys = {
  all: ['gateway', 'users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** List all users known to the gateway. */
export function useGatewayUsers() {
  const queryClient = useQueryClient();

  const query = useQuery<GatewayUser[]>({
    queryKey: userKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<GatewayUser[]>({
        path: '/api/v1/users',
        softFail: [403, 404],
      });
      return data ?? [];
    },
  });

  const createUser = useMutation({
    mutationFn: (payload: GatewayUserCreate) =>
      gatewayFetch<GatewayUser>({
        path: '/api/v1/users',
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, ...payload }: GatewayUserUpdate & { userId: string }) =>
      gatewayFetch<GatewayUser>({
        path: `/api/v1/users/${userId}`,
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) =>
      gatewayFetch<void>({
        path: `/api/v1/users/${userId}`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  const resetPassword = useMutation({
    mutationFn: ({ userId, new_password }: ChangePasswordPayload & { userId: string }) =>
      gatewayFetch<{ message: string }>({
        path: `/api/v1/users/${userId}/password`,
        method: 'PUT',
        body: { new_password },
      }),
  });

  const assignRBACRole = useMutation({
    mutationFn: ({ userId, role_id }: AssignRBACRolePayload & { userId: string }) =>
      gatewayFetch<{ message: string }>({
        path: `/api/v1/users/${userId}/rbac-role`,
        method: 'PUT',
        body: { role_id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    assignRBACRole,
  };
}
