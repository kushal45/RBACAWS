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

export interface RouteMapping {
  pattern: RegExp;
  service: string;
  stripPrefix?: boolean;
  rewrite?: string;
}