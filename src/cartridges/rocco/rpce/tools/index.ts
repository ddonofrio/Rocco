export interface RpceDeveloperJumpTarget {
  id: string;
  title: string;
  targetLevelId: string;
}

export interface RpceDeveloperJumpGroup {
  id: string;
  title: string;
  levels: readonly RpceDeveloperJumpTarget[];
}

export interface RpceDeveloperEventToggle {
  id: string;
  text: string;
  enabled: boolean;
}

export interface RpceDeveloperEventGroup {
  id: string;
  title: string;
  events: readonly RpceDeveloperEventToggle[];
}
