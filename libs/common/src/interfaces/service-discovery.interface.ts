import type { RouteTransformation } from '../config/route-mapping.config';

export interface RouteMapping {
  pattern: RegExp;
  service: string;
  transformations?: RouteTransformation;
  // Legacy support for backward compatibility
  stripPrefix?: boolean;
  rewrite?: string;
}

export interface ServiceInfo {
  name: string;
  host: string;
  port: number;
  health: string;
  version: string;
  tags: string[];
  routes: string[];
}

export interface ServiceRegistry {
  register(service: ServiceInfo): Promise<void>;
  unregister(serviceName: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInfo | null>;
  discoverByRoute(route: string): Promise<ServiceInfo | null>;
  getAllServices(): Promise<ServiceInfo[]>;
  healthCheck(serviceName: string): Promise<boolean>;
}
