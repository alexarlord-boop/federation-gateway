/**
 * Hook: RBAC role management.
 *
 * Roles are a **gateway-only** concept — the Admin API OAS does not define
 * `/rbac/roles`.  These hooks call `GATEWAY_BASE/api/v1/rbac/roles`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RBACRole {
  id: number;
  role_id: string;
  name: string;
  description?: string | null;
  builtin: boolean;
  permissions: string[]; // e.g. ["subordinates:list", "subordinates:create"]
}

export interface CreateRolePayload {
  role_id: string;
  name: string;
  description?: string | null;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
}

export interface AssignPermissionPayload {
  feature: string;
  operation: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const rbacRoleKeys = {
  all: ['gateway', 'rbac-roles'] as const,
  list: () => [...rbacRoleKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** CRUD for RBAC roles + permission assignment/revocation. */
export function useRBACRoles() {
  const queryClient = useQueryClient();

  const query = useQuery<RBACRole[]>({
    queryKey: rbacRoleKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<RBACRole[]>({
        path: '/api/v1/rbac/roles',
        softFail: [403, 404],
      });
      return data ?? [];
    },
  });

  const createRole = useMutation({
    mutationFn: (payload: CreateRolePayload) =>
      gatewayFetch<RBACRole>({
        path: '/api/v1/rbac/roles',
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacRoleKeys.all });
    },
  });

  const updateRole = useMutation({
    mutationFn: ({
      roleId,
      ...payload
    }: UpdateRolePayload & { roleId: string }) =>
      gatewayFetch<RBACRole>({
        path: `/api/v1/rbac/roles/${roleId}`,
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacRoleKeys.all });
    },
  });

  const deleteRole = useMutation({
    mutationFn: (roleId: string) =>
      gatewayFetch<null>({
        path: `/api/v1/rbac/roles/${roleId}`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacRoleKeys.all });
    },
  });

  const assignPermission = useMutation({
    mutationFn: ({
      roleId,
      ...payload
    }: AssignPermissionPayload & { roleId: string }) =>
      gatewayFetch<RBACRole>({
        path: `/api/v1/rbac/roles/${roleId}/permissions`,
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacRoleKeys.all });
    },
  });

  const removePermission = useMutation({
    mutationFn: ({
      roleId,
      ...payload
    }: AssignPermissionPayload & { roleId: string }) =>
      gatewayFetch<RBACRole>({
        path: `/api/v1/rbac/roles/${roleId}/permissions`,
        method: 'DELETE',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacRoleKeys.all });
    },
  });

  return {
    roles: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createRole,
    updateRole,
    deleteRole,
    assignPermission,
    removePermission,
  };
}
