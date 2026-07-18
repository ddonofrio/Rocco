import type { RoccoPoint, RoccoSpriteWalkMap, RoccoSpriteWalkMapColumn } from './types';

const EPSILON = 0.0001;
const DEFAULT_WALK_MAP_WAYPOINT_EDGE_MARGIN = 18;

interface WalkMapPathNode {
  x: number;
  spanIndex: number;
  yMin: number;
  yMax: number;
}

export interface RoccoWalkMapProjectedPoint {
  x: number;
  y: number;
  blocked: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildWalkMapGroundPath(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  startGround: RoccoPoint,
  goalGround: RoccoPoint,
): RoccoPoint[] | undefined {
  const startNode = resolveWalkMapPathNode(walkMap, columnIndex, startGround);
  const goalNode = resolveWalkMapPathNode(walkMap, columnIndex, goalGround);
  if (!startNode || !goalNode) {
    return undefined;
  }

  const nodePath = findWalkMapNodePath(columnIndex, startNode, goalNode);
  if (!nodePath) {
    return undefined;
  }

  return buildGroundWaypointsFromWalkMapNodePath(
    walkMap,
    columnIndex,
    nodePath,
    startGround,
    goalGround,
  );
}

export function resolveWalkMapPoint(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  worldX: number,
  worldY: number,
): RoccoWalkMapProjectedPoint | undefined {
  const localX = Math.round(worldX - walkMap.origin.x);
  const localY = worldY - walkMap.origin.y;
  const column = resolveWalkMapColumn(walkMap, columnIndex, localX);
  if (!column) {
    return undefined;
  }

  const span = resolveNearestSpan(column, localY);
  if (!span) {
    return undefined;
  }

  const clampedY = clamp(localY, span.yMin, span.yMax);
  return {
    x: walkMap.origin.x + column.x,
    y: walkMap.origin.y + clampedY,
    blocked: column.x !== localX,
  };
}

function resolveWalkMapPathNode(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  groundPoint: RoccoPoint,
): WalkMapPathNode | undefined {
  const localX = Math.round(groundPoint.x - walkMap.origin.x);
  const localY = groundPoint.y - walkMap.origin.y;
  const column = resolveWalkMapColumn(walkMap, columnIndex, localX);
  if (!column || column.spans.length === 0) {
    return undefined;
  }

  const spanIndex = resolveNearestSpanIndex(column, localY);
  const span = column.spans[spanIndex];
  if (!span) {
    return undefined;
  }

  return {
    x: column.x,
    spanIndex,
    yMin: span.yMin,
    yMax: span.yMax,
  };
}

function resolveNearestSpanIndex(column: RoccoSpriteWalkMapColumn, localY: number): number {
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  for (let index = 0; index < column.spans.length; index += 1) {
    const span = column.spans[index];
    if (!span) {
      continue;
    }

    if (localY >= span.yMin && localY <= span.yMax) {
      return index;
    }

    const distance = Math.min(Math.abs(localY - span.yMin), Math.abs(localY - span.yMax));
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  }

  return nearestIndex;
}

function findWalkMapNodePath(
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  startNode: WalkMapPathNode,
  goalNode: WalkMapPathNode,
): WalkMapPathNode[] | undefined {
  if (!columnIndex) {
    return undefined;
  }

  const startKey = createWalkMapPathNodeKey(startNode);
  const goalKey = createWalkMapPathNodeKey(goalNode);
  const queue: WalkMapPathNode[] = [startNode];
  const visited = new Set<string>([startKey]);
  const parentByKey = new Map<string, string | undefined>([[startKey, undefined]]);
  const nodeByKey = new Map<string, WalkMapPathNode>([[startKey, startNode]]);

  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index];
    if (!node) {
      continue;
    }

    const nodeKey = createWalkMapPathNodeKey(node);
    if (nodeKey === goalKey) {
      break;
    }

    for (const nextNode of listAdjacentWalkMapPathNodes(columnIndex, node)) {
      const nextKey = createWalkMapPathNodeKey(nextNode);
      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        parentByKey.set(nextKey, nodeKey);
        nodeByKey.set(nextKey, nextNode);
        queue.push(nextNode);
      }
    }
  }

  if (!visited.has(goalKey)) {
    return undefined;
  }

  const path: WalkMapPathNode[] = [];
  let cursorKey: string | undefined = goalKey;
  while (cursorKey) {
    const node = nodeByKey.get(cursorKey);
    if (!node) {
      break;
    }
    path.push(node);
    cursorKey = parentByKey.get(cursorKey);
  }

  path.reverse();
  return path;
}

function listAdjacentWalkMapPathNodes(
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn>,
  node: WalkMapPathNode,
): WalkMapPathNode[] {
  const currentSpan = { yMin: node.yMin, yMax: node.yMax };
  const adjacent: WalkMapPathNode[] = [];

  for (const direction of [-1, 1] as const) {
    const neighborColumn = columnIndex.get(node.x + direction);
    if (!neighborColumn) {
      continue;
    }

    for (let spanIndex = 0; spanIndex < neighborColumn.spans.length; spanIndex += 1) {
      const span = neighborColumn.spans[spanIndex];
      if (span && isWalkMapSpansOverlap(currentSpan, span)) {
        adjacent.push({
          x: neighborColumn.x,
          spanIndex,
          yMin: span.yMin,
          yMax: span.yMax,
        });
      }
    }
  }

  return adjacent;
}

function isWalkMapSpansOverlap(
  left: { yMin: number; yMax: number },
  right: { yMin: number; yMax: number },
): boolean {
  return Math.max(left.yMin, right.yMin) <= Math.min(left.yMax, right.yMax);
}

function buildGroundWaypointsFromWalkMapNodePath(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  nodePath: readonly WalkMapPathNode[],
  startGround: RoccoPoint,
  goalGround: RoccoPoint,
): RoccoPoint[] {
  const densePath = buildDenseGroundPathFromWalkMapNodePath(
    walkMap,
    nodePath,
    startGround,
    goalGround,
  );
  const simplifiedPath = simplifyWalkMapGroundPath(walkMap, columnIndex, densePath);
  if (simplifiedPath.length <= 1) {
    return [];
  }

  return simplifiedPath.slice(1);
}

function buildDenseGroundPathFromWalkMapNodePath(
  walkMap: RoccoSpriteWalkMap,
  nodePath: readonly WalkMapPathNode[],
  startGround: RoccoPoint,
  goalGround: RoccoPoint,
): RoccoPoint[] {
  const origin = walkMap.origin;
  const waypoints: RoccoPoint[] = [];
  const startY = startGround.y - origin.y;
  const totalSegments = Math.max(1, nodePath.length - 1);
  let currentX = startGround.x - origin.x;
  let currentY = startGround.y - origin.y;
  const goalX = goalGround.x - origin.x;
  const goalY = goalGround.y - origin.y;

  pushWalkMapWaypoint(waypoints, origin, currentX, currentY);

  for (let index = 0; index < nodePath.length - 1; index += 1) {
    const currentNode = nodePath[index];
    const nextNode = nodePath[index + 1];
    if (!currentNode || !nextNode) {
      continue;
    }

    const overlapYMin = Math.max(currentNode.yMin, nextNode.yMin);
    const overlapYMax = Math.min(currentNode.yMax, nextNode.yMax);
    const progress = (index + 1) / totalSegments;
    const desiredY = startY + (goalY - startY) * progress;
    const crossingY = resolveWalkMapInteriorY(desiredY, overlapYMin, overlapYMax);

    if (Math.abs(crossingY - currentY) > EPSILON) {
      pushWalkMapWaypoint(waypoints, origin, currentNode.x, currentY);
      pushWalkMapWaypoint(waypoints, origin, currentNode.x, crossingY);
      currentY = crossingY;
    }

    currentX = nextNode.x;
    pushWalkMapWaypoint(waypoints, origin, currentX, currentY);
  }

  if (Math.abs(currentX - goalX) > EPSILON) {
    pushWalkMapWaypoint(waypoints, origin, goalX, currentY);
  }

  if (Math.abs(currentY - goalY) > EPSILON) {
    pushWalkMapWaypoint(waypoints, origin, goalX, goalY);
  }

  if (waypoints.length === 0) {
    pushWalkMapWaypoint(waypoints, origin, goalX, goalY);
  }

  return waypoints;
}

function simplifyWalkMapGroundPath(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  points: readonly RoccoPoint[],
): RoccoPoint[] {
  if (points.length <= 2) {
    return [...points];
  }

  const firstPoint = points[0];
  if (!firstPoint) {
    return [];
  }

  const simplified: RoccoPoint[] = [firstPoint];
  let anchorIndex = 0;
  while (anchorIndex < points.length - 1) {
    const anchorPoint = points[anchorIndex];
    if (!anchorPoint) {
      break;
    }

    let nextIndex = anchorIndex + 1;
    let canAdvance = true;
    while (nextIndex + 1 < points.length && canAdvance) {
      const candidatePoint = points[nextIndex + 1];
      if (
        candidatePoint &&
        isWalkMapSegmentTraversable(walkMap, columnIndex, anchorPoint, candidatePoint)
      ) {
        nextIndex += 1;
      } else {
        canAdvance = false;
      }
    }

    const nextPoint = points[nextIndex];
    if (nextPoint) {
      pushDistinctPoint(simplified, nextPoint);
    }
    anchorIndex = nextIndex;
  }

  return simplified;
}

function resolveWalkMapInteriorY(value: number, yMin: number, yMax: number): number {
  const spanHeight = Math.max(0, yMax - yMin);
  const edgeMargin = Math.min(DEFAULT_WALK_MAP_WAYPOINT_EDGE_MARGIN, spanHeight * 0.2);
  const safeMin = yMin + edgeMargin;
  const safeMax = yMax - edgeMargin;
  if (safeMin > safeMax) {
    return clamp(value, yMin, yMax);
  }

  return clamp(value, safeMin, safeMax);
}

function pushWalkMapWaypoint(
  waypoints: RoccoPoint[],
  origin: RoccoPoint,
  localX: number,
  localY: number,
): void {
  const point: RoccoPoint = {
    x: origin.x + localX,
    y: origin.y + localY,
  };
  pushDistinctPoint(waypoints, point);
}

function pushDistinctPoint(points: RoccoPoint[], point: RoccoPoint): void {
  const previous = points.at(-1);
  if (
    previous &&
    Math.abs(previous.x - point.x) <= EPSILON &&
    Math.abs(previous.y - point.y) <= EPSILON
  ) {
    return;
  }

  points.push(point);
}

function isWalkMapSegmentTraversable(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  start: RoccoPoint,
  end: RoccoPoint,
): boolean {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const maximumDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  const steps = Math.max(1, Math.ceil(maximumDelta));
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const sampleX = start.x + deltaX * progress;
    const sampleY = start.y + deltaY * progress;
    if (!isWalkMapPointWalkable(walkMap, columnIndex, sampleX, sampleY)) {
      return false;
    }
  }

  return true;
}

function isWalkMapPointWalkable(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  worldX: number,
  worldY: number,
): boolean {
  const localX = Math.round(worldX - walkMap.origin.x);
  if (localX < 0 || localX >= walkMap.width) {
    return false;
  }

  const column = columnIndex?.get(localX);
  if (!column) {
    return false;
  }

  const localY = worldY - walkMap.origin.y;
  return column.spans.some((span) => localY >= span.yMin && localY <= span.yMax);
}

function createWalkMapPathNodeKey(node: WalkMapPathNode): string {
  return `${node.x}:${node.spanIndex}`;
}

function resolveWalkMapColumn(
  walkMap: RoccoSpriteWalkMap,
  columnIndex: ReadonlyMap<number, RoccoSpriteWalkMapColumn> | undefined,
  localX: number,
): RoccoSpriteWalkMapColumn | undefined {
  if (!columnIndex || walkMap.columns.length === 0) {
    return undefined;
  }

  const clampedX = clamp(localX, 0, walkMap.width - 1);
  const exact = columnIndex.get(clampedX);
  if (exact) {
    return exact;
  }

  let nearest: RoccoSpriteWalkMapColumn | undefined;
  let nearestDistance = Infinity;
  for (const column of walkMap.columns) {
    const distance = Math.abs(column.x - clampedX);
    if (distance < nearestDistance) {
      nearest = column;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function resolveNearestSpan(
  column: RoccoSpriteWalkMapColumn,
  localY: number,
): { yMin: number; yMax: number } | undefined {
  let nearest = column.spans[0];
  let nearestDistance = Infinity;
  for (const span of column.spans) {
    if (localY >= span.yMin && localY <= span.yMax) {
      return span;
    }

    const distance = Math.min(Math.abs(localY - span.yMin), Math.abs(localY - span.yMax));
    if (distance < nearestDistance) {
      nearest = span;
      nearestDistance = distance;
    }
  }
  return nearest;
}
