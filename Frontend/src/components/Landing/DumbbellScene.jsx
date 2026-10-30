import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * DumbbellScene — one 3D dumbbell, driven entirely from outside.
 *
 * This component no longer owns any scroll logic, waypoint tables or smoothing.
 * Landing_Page.jsx runs ONE GSAP master timeline / ScrollTrigger and pushes the
 * result in through `ref.setPose(...)`. That makes the scroll progress the single
 * source of truth and the GSAP `scrub` the only smoothing layer.
 *
 * Pose (all optional, merged into the current pose):
 *   x, y   position as a fraction of the canvas (0,0 = top-left, 1,1 = bottom-right)
 *   size   on-screen length of the dumbbell in CSS pixels (kept constant => consistent size)
 *   rx, ry, rz   Euler rotation in radians (ry is the turntable spin)
 *   s      extra scale multiplier (used only for the fade-in)
 *   o      opacity 0..1 (applied to the container; 0 also skips painting)
 *
 * Because the camera looks straight down -Z with no tilt, world +X is screen-right
 * and world -X is screen-left. A pose x that decreases therefore moves the model
 * from world +X toward world -X.
 *
 * With `overlay` the canvas is a fixed, full-viewport, pointer-transparent layer.
 */

const CAMERA_FOV = 20; // narrow FOV + far camera => little perspective stretch at the screen edges
const CAMERA_Z = 12;
const VISIBLE_HEIGHT = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));

const DEFAULT_POSE = { x: 0.5, y: 0.5, size: 160, rx: 0.3, ry: 0.0, rz: -0.18, s: 1, o: 1 };

const DumbbellScene = forwardRef(
  ({ modelUrl, onLoaded, overlay = false, className = "" }, ref) => {
    const containerRef = useRef(null);
    const onLoadedRef = useRef(onLoaded);
    const poseRef = useRef({ ...DEFAULT_POSE, o: overlay ? 0 : 1 });
    const dirtyRef = useRef(true);
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Keep the latest callback without rebuilding the renderer when the parent re-renders.
    useEffect(() => {
      onLoadedRef.current = onLoaded;
    }, [onLoaded]);

    useImperativeHandle(
      ref,
      () => ({
        setPose(next) {
          const pose = poseRef.current;
          for (const key in next) {
            if (key in DEFAULT_POSE && Number.isFinite(next[key])) pose[key] = next[key];
          }
          pose.o = Math.min(1, Math.max(0, pose.o));
          dirtyRef.current = true;
          const el = containerRef.current;
          if (el) {
            el.style.opacity = String(pose.o);
            el.style.visibility = pose.o <= 0.004 ? "hidden" : "visible";
          }
        },
      }),
      []
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;

      let disposed = false;
      let reqId = 0;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch (err) {
        console.error("WebGL unavailable:", err);
        setHasError(true);
        return undefined;
      }

      let viewW = container.clientWidth || (overlay ? window.innerWidth : 600);
      let viewH = container.clientHeight || (overlay ? window.innerHeight : 500);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, viewW / Math.max(viewH, 1), 0.1, 100);
      camera.position.set(0, 0, CAMERA_Z);
      camera.lookAt(0, 0, 0); // no tilt: world X maps 1:1 to screen X

      renderer.setSize(viewW, viewH, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";
      container.appendChild(renderer.domElement);
      container.style.opacity = String(poseRef.current.o);
      container.style.visibility = poseRef.current.o <= 0.004 ? "hidden" : "visible";

      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      // Lighting is unchanged from the original scene.
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const key = new THREE.DirectionalLight(0xfff8f0, 3.4);
      key.position.set(5, 6, 4);
      scene.add(key);
      const cyanRim = new THREE.DirectionalLight(0x67e8f9, 2.8);
      cyanRim.position.set(-5, 2, -3);
      scene.add(cyanRim);
      const violetRim = new THREE.DirectionalLight(0xc4b5fd, 2.4);
      violetRim.position.set(4, -3, -3);
      scene.add(violetRim);
      const bottomFill = new THREE.DirectionalLight(0xe0f2fe, 1.2);
      bottomFill.position.set(0, -4, 2);
      scene.add(bottomFill);

      // group = what the scroll journey moves/rotates/scales. It holds a unit-length model.
      const group = new THREE.Group();
      group.name = "dumbbellMaster";
      scene.add(group);

      new GLTFLoader().load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;

          // Centre the geometry on its own pivot and normalise its longest side to 1 unit.
          // (Scale first, then offset by the scaled centre — otherwise the pivot is off-centre.)
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const unit = 1 / Math.max(size.x, size.y, size.z, 0.0001);
          model.scale.setScalar(unit);
          model.position.copy(center).multiplyScalar(-unit);

          // dumbell.glb is authored with its bar along local Z (pointing at the camera).
          // Lay the longest axis along X so the bar reads horizontally on screen.
          const orient = new THREE.Group();
          orient.name = "dumbbellOrient";
          if (size.z >= size.x && size.z >= size.y) orient.rotation.y = Math.PI / 2;
          else if (size.y >= size.x && size.y >= size.z) orient.rotation.z = Math.PI / 2;
          orient.add(model);

          model.traverse((c) => {
            if (!c.isMesh || !c.material) return;
            (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => {
              m.envMapIntensity = 2.2;
              m.roughness = 0.25;
              m.metalness = 0.92;
              m.needsUpdate = true;
            });
          });

          group.add(orient);
          dirtyRef.current = true;
          setIsLoaded(true);
          if (onLoadedRef.current) onLoadedRef.current();
        },
        undefined,
        (err) => {
          console.error("Dumbbell model load failed:", err);
          setHasError(true);
        }
      );

      // Paint only when the pose (or the viewport) changed.
      const frame = () => {
        if (disposed) return;
        reqId = requestAnimationFrame(frame);
        if (!dirtyRef.current) return;
        dirtyRef.current = false;

        const p = poseRef.current;
        const visibleW = VISIBLE_HEIGHT * camera.aspect;
        group.visible = p.o > 0.004;
        group.position.set((p.x - 0.5) * visibleW, (0.5 - p.y) * VISIBLE_HEIGHT, 0);
        group.scale.setScalar((p.size / Math.max(viewH, 1)) * VISIBLE_HEIGHT * p.s);
        group.rotation.set(p.rx, p.ry, p.rz);
        renderer.render(scene, camera);
      };
      reqId = requestAnimationFrame(frame);

      const onResize = () => {
        viewW = container.clientWidth || viewW;
        viewH = container.clientHeight || viewH;
        camera.aspect = viewW / Math.max(viewH, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(viewW, viewH, false);
        dirtyRef.current = true;
      };
      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(container);

      return () => {
        disposed = true;
        resizeObserver.disconnect();
        if (reqId) cancelAnimationFrame(reqId);
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => {
              Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
              m.dispose();
            });
          }
        });
        if (scene.environment) scene.environment.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.forceContextLoss(); // frees the GL context right away (React Strict Mode remounts)
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
      };
    }, [modelUrl, overlay]);

    if (hasError) {
      if (overlay) return null;
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <div className="rounded-lg border border-slate-200 bg-white/80 p-6 text-center text-xs text-slate-500 backdrop-blur-md">
            3D interactive preview unavailable on this device.
          </div>
        </div>
      );
    }

    // NOTE: the original class string always contained `relative`, which wins over `fixed`
    // in Tailwind's generated CSS, so the "overlay" was never actually fixed. Position
    // classes are now mutually exclusive.
    const rootClass = overlay
      ? `fixed inset-0 z-30 select-none overflow-hidden pointer-events-none ${className}`
      : `relative h-full w-full select-none overflow-hidden ${className}`;

    return (
      <div
        ref={containerRef}
        className={rootClass}
        aria-hidden={overlay ? true : undefined}
        style={{
          opacity: overlay ? 0 : 1,
          visibility: overlay ? "hidden" : "visible",
        }}
      >
        {!overlay && !isLoaded && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
            <span className="text-xs font-medium text-slate-400">Loading 3D asset…</span>
          </div>
        )}
      </div>
    );
  }
);

DumbbellScene.displayName = "DumbbellScene";

export default DumbbellScene;