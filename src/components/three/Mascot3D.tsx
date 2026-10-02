import { useRef, useState, useCallback, useEffect, useMemo, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

// ── GLB Model Path ──
const MODEL_PATH = '/models/skdquest-mascot.glb';

// ── Shared mutable mouse state (no re-renders) ──
const mouseState = { x: 0, y: 0 };

// ── Mascot Inner Scene Component ──
function MascotModel({ gltf, onReady }: { gltf: GLTF, onReady: () => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, groupRef);

  // Smoothed values for interpolation
  const smoothMouse = useRef({ x: 0, y: 0 });
  const floatPhase = useRef(Math.random() * Math.PI * 2);

  // Auto-fit model to view
  const { viewport } = useThree();

  const { scale: modelScale, positionY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetHeight = Math.min(viewport.height * 0.8, 2.8);
    const s = maxDim > 0 ? targetHeight / maxDim : 1;
    const yOffset = -center.y * s + (size.y * s * 0.05);

    return { scale: s, positionY: yOffset };
  }, [clonedScene, viewport.height]);

  // Start idle animation if available
  useEffect(() => {
    if (names && names.length > 0 && actions) {
      const idleName = names.find(n => /idle/i.test(n)) || names[0];
      const action = actions[idleName];
      if (action) {
        action.reset().fadeIn(0.4).play();
        action.setLoop(THREE.LoopRepeat, Infinity);
        return () => { action.fadeOut(0.4); };
      }
    }
  }, [actions, names]);

  // Notify ready
  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    floatPhase.current += dt * 1.2;
    const floatY = Math.sin(floatPhase.current) * 0.04;
    const floatTilt = Math.sin(floatPhase.current * 0.7) * 0.02;

    const lerpSpeed = 3 * dt;
    smoothMouse.current.x += (mouseState.x - smoothMouse.current.x) * lerpSpeed;
    smoothMouse.current.y += (mouseState.y - smoothMouse.current.y) * lerpSpeed;

    const mouseRotY = smoothMouse.current.x * 0.12;
    const mouseRotX = -smoothMouse.current.y * 0.06;
    const mousePosX = smoothMouse.current.x * 0.08;

    groupRef.current.position.set(mousePosX, positionY + floatY, 0);
    groupRef.current.rotation.set(mouseRotX + floatTilt, mouseRotY, floatTilt * 0.5);
  });

  return (
    <group ref={groupRef} scale={[modelScale, modelScale, modelScale]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ── Lighting Rig ──
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#e8ecf4" />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#fff5e6" castShadow={false} />
      <directionalLight position={[-3, 2, 3]} intensity={0.5} color="#cce0ff" />
      <directionalLight position={[0, 3, -4]} intensity={0.35} color="#d4e4ff" />
      <directionalLight position={[0, -2, 2]} intensity={0.2} color="#f0f0f0" />
    </>
  );
}

// ── Error Boundary ──
class MascotErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-error/10 rounded-xl border border-error/30">
          <span className="text-error font-bold text-sm mb-1">Mascot Render Error</span>
          <span className="text-xs text-error/80 break-all">{this.state.error?.message || 'Unknown render error'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main Export ──
export default function Mascot3D({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  // Manually load GLB outside of Canvas to avoid Suspense issues
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      (loadedGltf: GLTF) => {
        setGltf(loadedGltf);
      },
      undefined,
      (error: unknown) => {
        console.error('[Mascot3D] Failed to load GLTF:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load model');
      }
    );
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseState.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseState.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, []);

  const handlePointerLeave = useCallback(() => {
    mouseState.x = 0;
    mouseState.y = 0;
  }, []);

  if (loadError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-error/10 rounded-xl border border-error/30">
        <span className="text-error font-bold text-sm mb-1">GLB Load Error</span>
        <span className="text-xs text-error/80 break-all">{loadError}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ touchAction: 'pan-y' }}
    >
      {/* HTML loading overlay — hidden once gltf is loaded AND rendered */}
      {(!gltf || !isRendered) && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-primary">
              {!gltf ? "DOWNLOADING..." : "RENDERING..."}
            </span>
          </div>
        </div>
      )}

      {gltf && (
        <MascotErrorBoundary>
          <Canvas
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            dpr={[1, 2]}
            camera={{
              fov: 35,
              near: 0.1,
              far: 100,
              position: [0, 0.3, 5],
            }}
            style={{
              width: '100%',
              height: '100%',
              opacity: isRendered ? 1 : 0,
              transition: 'opacity 0.6s ease-out',
            }}
            frameloop="always"
          >
            <StudioLighting />
            <MascotModel gltf={gltf} onReady={() => setIsRendered(true)} />
          </Canvas>
        </MascotErrorBoundary>
      )}
    </div>
  );
}
