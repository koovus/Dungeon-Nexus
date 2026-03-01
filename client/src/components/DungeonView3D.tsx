import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/gameLogic';
import type { GameStateSnapshot } from '@/lib/gameLogic';

const TILE_SIZE = 1;
const WALL_HEIGHT = 1.2;
const ENTITY_HEIGHT = 0.6;
const CAM_OFFSET = new THREE.Vector3(0, 8, 6);
const CAM_LERP = 0.08;

const COLOR_FLOOR = 0x1a1a2e;
const COLOR_FLOOR_ALT = 0x16162a;
const COLOR_WALL = 0x3a3a5c;
const COLOR_STAIRS = 0x44aa44;
const COLOR_PLAYER = 0xffdd44;
const COLOR_ENEMY = 0xff4444;
const COLOR_ITEM = 0x44ddff;
const COLOR_OTHER_PLAYER = 0x4488ff;
const COLOR_RIFT_AMBIENT = 0x8844cc;

interface EntityMeshData {
  mesh: THREE.Mesh;
  targetX: number;
  targetZ: number;
  baseY: number;
  animOffset: number;
  isItem: boolean;
  id: string;
}

function createTextGeometry(char: string): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const size = 0.4;
  const half = size / 2;

  switch (char) {
    case '@':
      shape.absarc(0, 0.1, half * 0.8, 0, Math.PI * 2, false);
      break;
    case '#':
      shape.moveTo(-half, -half);
      shape.lineTo(half, -half);
      shape.lineTo(half, half);
      shape.lineTo(-half, half);
      shape.closePath();
      break;
    case 'T':
      shape.moveTo(-half, half);
      shape.lineTo(half, half);
      shape.lineTo(half, half * 0.6);
      shape.lineTo(half * 0.15, half * 0.6);
      shape.lineTo(half * 0.15, -half);
      shape.lineTo(-half * 0.15, -half);
      shape.lineTo(-half * 0.15, half * 0.6);
      shape.lineTo(-half, half * 0.6);
      shape.closePath();
      break;
    case 'D':
      shape.moveTo(-half, -half);
      shape.lineTo(-half, half);
      shape.lineTo(0, half);
      shape.quadraticCurveTo(half, half, half, 0);
      shape.quadraticCurveTo(half, -half, 0, -half);
      shape.closePath();
      break;
    case '!':
      shape.moveTo(-half * 0.2, half);
      shape.lineTo(half * 0.2, half);
      shape.lineTo(half * 0.15, -half * 0.3);
      shape.lineTo(-half * 0.15, -half * 0.3);
      shape.closePath();
      const dot = new THREE.Path();
      dot.absarc(0, -half * 0.6, half * 0.15, 0, Math.PI * 2, false);
      shape.holes.push(dot);
      break;
    case '?':
      shape.absarc(0, half * 0.3, half * 0.4, 0, Math.PI, false);
      shape.lineTo(-half * 0.15, -half * 0.1);
      shape.lineTo(half * 0.15, -half * 0.1);
      shape.lineTo(half * 0.4, half * 0.3);
      shape.closePath();
      break;
    default:
      shape.moveTo(-half * 0.7, -half * 0.7);
      shape.lineTo(half * 0.7, -half * 0.7);
      shape.lineTo(half * 0.7, half * 0.7);
      shape.lineTo(-half * 0.7, half * 0.7);
      shape.closePath();
      break;
  }

  const extrudeSettings = { depth: 0.15, bevelEnabled: false };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function getCachedGeo(char: string): THREE.BufferGeometry {
  if (!geoCache.has(char)) {
    geoCache.set(char, createTextGeometry(char));
  }
  return geoCache.get(char)!;
}

function disposeMapResources(ctx: SceneContext) {
  if (ctx.wallMesh) {
    ctx.scene.remove(ctx.wallMesh);
    ctx.wallMesh.geometry.dispose();
    (ctx.wallMesh.material as THREE.Material).dispose();
    ctx.wallMesh = null;
  }
  if (ctx.floorMesh) {
    ctx.scene.remove(ctx.floorMesh);
    ctx.floorMesh.geometry.dispose();
    (ctx.floorMesh.material as THREE.Material).dispose();
    ctx.floorMesh = null;
  }
  if (ctx.stairsGeo) { ctx.stairsGeo.dispose(); ctx.stairsGeo = null; }
  if (ctx.stairsMat) { ctx.stairsMat.dispose(); ctx.stairsMat = null; }
  for (const sm of ctx.stairsMeshes) { ctx.scene.remove(sm); }
  ctx.stairsMeshes = [];
}

function disposeEntityMeshes(ctx: SceneContext) {
  for (const em of ctx.entityMeshes) {
    ctx.scene.remove(em.mesh);
    em.mesh.geometry.dispose();
    (em.mesh.material as THREE.Material).dispose();
  }
  ctx.entityMeshes = [];
}

interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  animId: number;
  camTarget: THREE.Vector3;
  playerLight: THREE.PointLight;
  entityMeshes: EntityMeshData[];
  wallMesh: THREE.InstancedMesh | null;
  floorMesh: THREE.InstancedMesh | null;
  stairsMeshes: THREE.Mesh[];
  stairsGeo: THREE.PlaneGeometry | null;
  stairsMat: THREE.MeshLambertMaterial | null;
  lastDepth: number;
  clock: THREE.Clock;
}

export default function DungeonView3D({ state }: { state: GameStateSnapshot }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneContext | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const mapKey = useMemo(() => {
    return `${state.depth}-${state.riftActive ? 'rift' : 'normal'}`;
  }, [state.depth, state.riftActive]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.FogExp2(0x0a0a15, 0.04);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(state.player.pos.x, CAM_OFFSET.y, state.player.pos.y + CAM_OFFSET.z);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x222244, 0.6);
    scene.add(ambient);

    const playerLight = new THREE.PointLight(0xffaa44, 1.5, 15);
    playerLight.position.set(state.player.pos.x, 2, state.player.pos.y);
    scene.add(playerLight);

    const dirLight = new THREE.DirectionalLight(0x334466, 0.3);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const ctx: SceneContext = {
      scene,
      camera,
      renderer,
      animId: 0,
      camTarget: new THREE.Vector3(state.player.pos.x, 0, state.player.pos.y),
      playerLight,
      entityMeshes: [],
      wallMesh: null,
      floorMesh: null,
      stairsMeshes: [],
      stairsGeo: null,
      stairsMat: null,
      lastDepth: -1,
      clock: new THREE.Clock(),
    };
    sceneRef.current = ctx;

    const animate = () => {
      ctx.animId = requestAnimationFrame(animate);
      const s = stateRef.current;
      const elapsed = ctx.clock.getElapsedTime();

      const targetPos = new THREE.Vector3(s.player.pos.x * TILE_SIZE, 0, s.player.pos.y * TILE_SIZE);
      ctx.camTarget.lerp(targetPos, CAM_LERP);

      camera.position.lerp(
        new THREE.Vector3(
          ctx.camTarget.x + CAM_OFFSET.x,
          CAM_OFFSET.y,
          ctx.camTarget.z + CAM_OFFSET.z
        ),
        CAM_LERP
      );
      camera.lookAt(ctx.camTarget.x, 0.5, ctx.camTarget.z);

      ctx.playerLight.position.set(ctx.camTarget.x, 2, ctx.camTarget.z);

      for (const em of ctx.entityMeshes) {
        em.mesh.position.x += (em.targetX - em.mesh.position.x) * 0.12;
        em.mesh.position.z += (em.targetZ - em.mesh.position.z) * 0.12;

        if (em.isItem) {
          em.mesh.rotation.y = elapsed * 1.5 + em.animOffset;
          em.mesh.position.y = em.baseY + Math.sin(elapsed * 2 + em.animOffset) * 0.08;
        } else {
          em.mesh.position.y = em.baseY + Math.sin(elapsed * 1.5 + em.animOffset) * 0.05;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(ctx.animId);
      disposeMapResources(ctx);
      disposeEntityMeshes(ctx);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    disposeMapResources(ctx);

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const wallMat = new THREE.MeshLambertMaterial({ color: COLOR_WALL });

    const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshLambertMaterial({ color: COLOR_FLOOR });

    let wallCount = 0;
    let floorCount = 0;
    const stairsPositions: { x: number; z: number }[] = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = state.map[y]?.[x];
        if (!tile) continue;
        if (tile.char === '#') wallCount++;
        else {
          floorCount++;
          if (tile.char === '>') stairsPositions.push({ x, z: y });
        }
      }
    }

    const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    const floorInst = new THREE.InstancedMesh(floorGeo, floorMat, floorCount);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let wi = 0;
    let fi = 0;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = state.map[y]?.[x];
        if (!tile) continue;

        if (tile.char === '#') {
          matrix.makeTranslation(x * TILE_SIZE, WALL_HEIGHT / 2, y * TILE_SIZE);
          wallInst.setMatrixAt(wi, matrix);
          const shade = 0.85 + Math.random() * 0.3;
          color.setHex(COLOR_WALL).multiplyScalar(shade);
          wallInst.setColorAt(wi, color);
          wi++;
        } else {
          matrix.makeTranslation(x * TILE_SIZE, 0, y * TILE_SIZE);
          floorInst.setMatrixAt(fi, matrix);
          const floorShade = (x + y) % 2 === 0 ? COLOR_FLOOR : COLOR_FLOOR_ALT;
          color.setHex(floorShade);
          floorInst.setColorAt(fi, color);
          fi++;
        }
      }
    }

    wallInst.instanceMatrix.needsUpdate = true;
    if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
    floorInst.instanceMatrix.needsUpdate = true;
    if (floorInst.instanceColor) floorInst.instanceColor.needsUpdate = true;

    ctx.scene.add(wallInst);
    ctx.scene.add(floorInst);
    ctx.wallMesh = wallInst;
    ctx.floorMesh = floorInst;

    const stairsGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
    stairsGeo.rotateX(-Math.PI / 2);
    const stairsMat = new THREE.MeshLambertMaterial({ color: COLOR_STAIRS, emissive: COLOR_STAIRS, emissiveIntensity: 0.3 });
    ctx.stairsGeo = stairsGeo;
    ctx.stairsMat = stairsMat;
    for (const sp of stairsPositions) {
      const sm = new THREE.Mesh(stairsGeo, stairsMat);
      sm.position.set(sp.x * TILE_SIZE, 0.02, sp.z * TILE_SIZE);
      ctx.scene.add(sm);
      ctx.stairsMeshes.push(sm);
    }

    if (state.riftActive) {
      ctx.scene.fog = new THREE.FogExp2(0x1a0a2e, 0.035);
      ctx.scene.background = new THREE.Color(0x0a0518);
      ctx.playerLight.color.setHex(COLOR_RIFT_AMBIENT);
      ctx.playerLight.intensity = 2.0;
    } else {
      ctx.scene.fog = new THREE.FogExp2(0x0a0a15, 0.04);
      ctx.scene.background = new THREE.Color(0x0a0a15);
      ctx.playerLight.color.setHex(0xffaa44);
      ctx.playerLight.intensity = 1.5;
    }

    ctx.lastDepth = state.depth;
  }, [mapKey]);

  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    const entityKey = (type: string, id: string) => `${type}:${id}`;
    const existingMap = new Map<string, EntityMeshData>();
    for (const em of ctx.entityMeshes) {
      existingMap.set(em.id, em);
    }

    const neededIds = new Set<string>();

    const playerKey = entityKey('player', 'self');
    neededIds.add(playerKey);
    const px = state.player.pos.x * TILE_SIZE;
    const pz = state.player.pos.y * TILE_SIZE;
    const existingPlayer = existingMap.get(playerKey);
    if (existingPlayer) {
      existingPlayer.targetX = px;
      existingPlayer.targetZ = pz;
    } else {
      const geo = getCachedGeo('@');
      const mat = new THREE.MeshLambertMaterial({ color: COLOR_PLAYER, emissive: COLOR_PLAYER, emissiveIntensity: 0.4 });
      const mesh = new THREE.Mesh(geo.clone(), mat);
      mesh.scale.set(1.2, 1.2, 1.2);
      mesh.position.set(px, ENTITY_HEIGHT, pz);
      ctx.scene.add(mesh);
      ctx.entityMeshes.push({ mesh, targetX: px, targetZ: pz, baseY: ENTITY_HEIGHT, animOffset: 0, isItem: false, id: playerKey });
    }

    for (const entity of state.entities) {
      if (entity.type === 'stairs_down') continue;
      const isItem = entity.type === 'item';
      const key = entityKey(entity.type, entity.id);
      neededIds.add(key);

      const ex = entity.pos.x * TILE_SIZE;
      const ez = entity.pos.y * TILE_SIZE;
      const existing = existingMap.get(key);
      if (existing) {
        existing.targetX = ex;
        existing.targetZ = ez;
      } else {
        const geo = getCachedGeo(entity.char);
        const entityColor = isItem ? COLOR_ITEM : COLOR_ENEMY;
        const mat = new THREE.MeshLambertMaterial({ color: entityColor, emissive: entityColor, emissiveIntensity: isItem ? 0.3 : 0.2 });
        const mesh = new THREE.Mesh(geo.clone(), mat);
        const baseY = isItem ? ENTITY_HEIGHT + 0.1 : ENTITY_HEIGHT;
        mesh.position.set(ex, baseY, ez);
        mesh.scale.set(0.9, 0.9, 0.9);
        ctx.scene.add(mesh);
        ctx.entityMeshes.push({ mesh, targetX: ex, targetZ: ez, baseY, animOffset: Math.random() * Math.PI * 2, isItem, id: key });
      }
    }

    for (const op of state.otherPlayers) {
      const key = entityKey('otherPlayer', op.name);
      neededIds.add(key);
      const ox = op.pos.x * TILE_SIZE;
      const oz = op.pos.y * TILE_SIZE;
      const existing = existingMap.get(key);
      if (existing) {
        existing.targetX = ox;
        existing.targetZ = oz;
      } else {
        const geo = getCachedGeo('@');
        const mat = new THREE.MeshLambertMaterial({ color: COLOR_OTHER_PLAYER, emissive: COLOR_OTHER_PLAYER, emissiveIntensity: 0.3 });
        const mesh = new THREE.Mesh(geo.clone(), mat);
        mesh.position.set(ox, ENTITY_HEIGHT, oz);
        ctx.scene.add(mesh);
        ctx.entityMeshes.push({ mesh, targetX: ox, targetZ: oz, baseY: ENTITY_HEIGHT, animOffset: Math.random() * Math.PI * 2, isItem: false, id: key });
      }
    }

    ctx.entityMeshes = ctx.entityMeshes.filter(em => {
      if (!neededIds.has(em.id)) {
        ctx.scene.remove(em.mesh);
        em.mesh.geometry.dispose();
        (em.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });
  }, [state.player.pos.x, state.player.pos.y, state.entities, state.otherPlayers]);

  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    if (state.riftActive) {
      ctx.scene.fog = new THREE.FogExp2(0x1a0a2e, 0.035);
      ctx.scene.background = new THREE.Color(0x0a0518);
      ctx.playerLight.color.setHex(COLOR_RIFT_AMBIENT);
      ctx.playerLight.intensity = 2.0;
    } else {
      ctx.scene.fog = new THREE.FogExp2(0x0a0a15, 0.04);
      ctx.scene.background = new THREE.Color(0x0a0a15);
      ctx.playerLight.color.setHex(0xffaa44);
      ctx.playerLight.intensity = 1.5;
    }
  }, [state.riftActive]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="dungeon-view-3d"
      style={{ minHeight: '400px' }}
    />
  );
}
