import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

export interface DeploymentInstance {
  id: string;
  name: string;
  public_base_url: string;
  admin_base_url: string;
  public_port?: number;
  admin_port?: number;
  deployment_managed: boolean;
  selected_by_default: boolean;
}

export function useInstances() {
  return useQuery({
    queryKey: ['gateway', 'instances'],
    queryFn: () =>
      gatewayFetch<{ instances: DeploymentInstance[] }>({
        path: '/api/v1/admin/instances',
      }),
    select: (data) => data?.instances ?? [],
  });
}
