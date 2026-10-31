import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const MacBookScene = forwardRef(function MacBookScene(
  { modelUrl, videoUrl, onLoaded, className = "" },
  ref
) {
  const containerRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef({
    openProgress: 0,
    rotYProgress: 0,
    slideX: 0,
    exitProgress: 0,
    isMounted: false,
    isPlaying: false,
  });

  // Keep the latest onLoaded without making it an effect dependency. A parent that
  // passes a new function each render used to tear down and rebuild the whole scene
  // (reloading the GLB and resetting the lid) on every parent re-render.
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useImperativeHandle(ref, () => ({
    updateScroll(open = 0, rotY = 0, slideX = 0, exit = 0) {
      const s = stateRef.current;
      s.openProgress = THREE.MathUtils.clamp(open, 0, 1);
      s.rotYProgress = THREE.MathUtils.clamp(rotY, 0, 1);
      s.slideX = slideX;
      s.exitProgress = THREE.MathUtils.clamp(exit, 0, 1);
      if (s.video && s.openProgress > 0.05 && s.video.paused) {
        s.video.play().then(() => { s.isPlaying = true; }).catch(() => {});
      } else if (s.video && s.openProgress <= 0.05 && !s.video.paused) {
        s.video.pause();
        s.isPlaying = false;
      }
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !modelUrl) return undefined;

    // Scroll state is intentionally NOT reset here: if the page is loaded or this
    // effect re-runs mid-scroll, the lid must follow the real scroll position.
    const s = stateRef.current;
    s.isMounted = true;
    let disposed = false;
    let animationId = null;
    let resizeObserver = null;

    // Respect the user's motion preference and react to changes.
    const reducedMotionQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reducedMotion = reducedMotionQuery ? reducedMotionQuery.matches : false;
    const onMotionChange = (event) => {
      reducedMotion = event.matches;
    };
    reducedMotionQuery?.addEventListener("change", onMotionChange);

    // Pause the render loop while the tab is hidden to save CPU/GPU.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else if (!disposed && !animationId) {
        animationId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    let model = null;
    let lid = null;
    // Lid hinge angles (radians about the lid node's X axis). The lid node's origin
    // sits on the hinge line, so rotating the node is a true hinge rotation.
    // 0 = lid flat on the base (closed); the model's baked pose is open (~ -1.925).
    const LID_CLOSED = 0;
    let lidOpen = -1.9;
    // Model half-extents (union of closed + open poses), set once the GLB loads.
    let fit = null;
    let video = null;
    let videoTexture = null;
    let screenMaterial = null;
    let originalScreenMaterial = null;
    let pmrem = null;

    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;
    const mobile = window.innerWidth < 768;
    const tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const camera = new THREE.PerspectiveCamera(mobile ? 36 : tablet ? 32 : 28, width / Math.max(height, 1), 1, 50);
    camera.position.set(0, 0.3, mobile ? 7.5 : tablet ? 6.8 : 6.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (error) {
      console.error("MacBook WebGL initialization failed:", error);
      setHasError(true);
      return undefined;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xfff8f0, 2.8);
    key.position.set(3, 5, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc7d2fe, 1.6);
    fill.position.set(-4, 2, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xa5f3fc, 1.4);
    rim.position.set(-2, 4, -4);
    scene.add(rim);

    try {
      pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    } catch (error) {
      console.warn("MacBook environment setup skipped:", error);
    }

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.18 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1;
    shadow.receiveShadow = true;
    scene.add(shadow);

    const masterGroup = new THREE.Group();
    masterGroup.name = "macbookMaster";
    scene.add(masterGroup);

    if (videoUrl) {
      video = document.createElement("video");
      video.src = videoUrl;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      // Lazy-load: don't fetch the (large) video until playback is actually requested.
      video.preload = "none";
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      s.video = video;
      videoTexture = new THREE.VideoTexture(video);
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      videoTexture.generateMipmaps = false;
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.wrapS = THREE.ClampToEdgeWrapping;
      videoTexture.wrapT = THREE.ClampToEdgeWrapping;
      s.videoTexture = videoTexture;

      const fitVideo = () => {
        if (!video.videoWidth || !video.videoHeight) return;
        const videoAspect = video.videoWidth / video.videoHeight;
        const screenAspect = 2.93 / 1.826;
        if (videoAspect > screenAspect) {
          const repeatX = screenAspect / videoAspect;
          videoTexture.repeat.set(repeatX, 1);
          videoTexture.offset.set((1 - repeatX) / 2, 0);
        } else {
          const repeatY = videoAspect / screenAspect;
          videoTexture.repeat.set(1, repeatY);
          videoTexture.offset.set(0, (1 - repeatY) / 2);
        }
        videoTexture.needsUpdate = true;
      };
      video.addEventListener("loadedmetadata", fitVideo);
      video.addEventListener("loadeddata", fitVideo);
      const onVideoError = () => {
        console.error("MacBook screen video failed to load:", video.error);
      };
      video.addEventListener("error", onVideoError);
      s.cleanupVideo = () => {
        video.removeEventListener("loadedmetadata", fitVideo);
        video.removeEventListener("loadeddata", fitVideo);
        video.removeEventListener("error", onVideoError);
      };
    }

    const BASE_Y = 0;
    const TILT_X = 0.18;
    const CLOSED_TILT_EXTRA = 0.4;
    const baseScale = () => (window.innerWidth < 768 ? 0.8 : window.innerWidth < 1024 ? 0.95 : 1.08);

    // Sizes the renderer and places the camera so the whole laptop (including the
    // fully open lid) fits the container at its current size and aspect ratio.
    const layout = () => {
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 500;
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      camera.aspect = w / Math.max(h, 1);
      camera.fov = isMobile ? 36 : isTablet ? 32 : 28;
      let distance = isMobile ? 7.5 : isTablet ? 6.8 : 6.2;
      if (fit) {
        const sc = baseScale();
        const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const margin = 1.1;
        const halfH = (fit.halfY + fit.halfZ * Math.sin(TILT_X)) * sc;
        const halfW = fit.halfX * sc;
        const nearGap = fit.halfZ * sc; // front edge is closer to the camera than the center
        const needV = (halfH * margin) / tanHalfFov + nearGap;
        const needH = (halfW * margin) / (tanHalfFov * camera.aspect) + nearGap;
        // Fit tightly to the container (the designed distances above are only the
        // pre-load fallback), so the laptop is as large as the canvas allows.
        distance = Math.max(needV, needH);
      }
      camera.position.set(0, 0, distance);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    let currentLidRotation = LID_CLOSED;
    let currentRotationY = 0;
    let currentSlideX = 0;
    let currentY = BASE_Y;

    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        if (disposed || !s.isMounted) return;
        model = gltf.scene;
        const screen = model.getObjectByName("Object_21");
        // GLTFLoader strips "." from node names, so the Blender name "Cube.016_2"
        // loads as "Cube016_2" (looking up the dotted name returned null, which is why
        // the lid never moved). Fall back to the screen's parent, which is the lid.
        lid =
          model.getObjectByName("Cube016_2") ||
          model.getObjectByName("Cube.016_2") ||
          screen?.parent ||
          null;
        s.lidNode = lid;
        s.masterGroup = masterGroup;

        if (!lid) console.warn("MacBook lid/hinge node not found in macbook.glb.");
        if (!screen) console.error('Screen mesh "Object_21" not found in macbook.glb.');
        // The GLB ships with the lid open; use its authored open angle as the open pose.
        if (lid && Math.abs(lid.rotation.x) > 0.5) lidOpen = lid.rotation.x;
        // Closed is the initial pose; scroll progress drives opening.
        if (lid) lid.rotation.x = LID_CLOSED;

        // The MacBook asset should contain only the laptop. Some exported GLBs
        // include stray demo/weight meshes; remove those without touching the
        // separate DumbbellScene section on the landing page.
        const strayMeshes = [];
        model.traverse((object) => {
          if (/dumbbell|dumbell|weight/i.test(object.name || "")) strayMeshes.push(object);
        });
        strayMeshes.forEach((object) => {
          object.parent?.remove(object);
          object.traverse?.((child) => {
            child.geometry?.dispose?.();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.filter(Boolean).forEach((material) => material.dispose?.());
          });
        });

        model.traverse((object) => {
          if (!object.isMesh) return;
          object.castShadow = true;
          object.receiveShadow = true;
          if (object !== screen && object.material) {
            const mats = Array.isArray(object.material) ? object.material : [object.material];
            mats.forEach((mat) => { mat.envMapIntensity = 1.4; mat.needsUpdate = true; });
          }
        });

        // The logo mesh is modeled coplanar with the lid shell, which z-fights (tears)
        // at shallow viewing angles. Bias it toward the camera in depth.
        const logo = model.getObjectByName("Object_23");
        if (logo?.material) {
          const logoMats = Array.isArray(logo.material) ? logo.material : [logo.material];
          logoMats.forEach((mat) => {
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = -4;
            mat.polygonOffsetUnits = -4;
            mat.needsUpdate = true;
          });
        }

        if (screen && videoTexture) {
          originalScreenMaterial = screen.material;
          screenMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, toneMapped: false, side: THREE.DoubleSide });
          screen.material = screenMaterial;
          s.screenMesh = screen;
        }

        // Center on the union of the closed and open poses so the laptop is framed
        // the same way at every lid angle (the old code centered on the open pose
        // only, which left the closed laptop low and cropped).
        const poseBounds = (angle) => {
          if (lid) lid.rotation.x = angle;
          model.updateMatrixWorld(true);
          return new THREE.Box3().setFromObject(model);
        };
        const closedBounds = poseBounds(LID_CLOSED);
        const bounds = closedBounds.clone().union(poseBounds(lidOpen));
        if (lid) lid.rotation.x = LID_CLOSED;
        model.updateMatrixWorld(true);
        const boundsSize = bounds.getSize(new THREE.Vector3());
        const unionCenter = bounds.getCenter(new THREE.Vector3());
        fit = {
          halfX: boundsSize.x / 2,
          halfY: boundsSize.y / 2,
          halfZ: boundsSize.z / 2,
          // How far the closed laptop's center sits below the framing center. The
          // animate loop eases this out as the lid opens so the closed laptop is
          // vertically centered instead of sitting low in the canvas.
          closedLift: unionCenter.y - closedBounds.getCenter(new THREE.Vector3()).y,
        };
        model.position.sub(unionCenter);
        masterGroup.add(model);
        masterGroup.visible = true;
        masterGroup.rotation.x = 0.18;
        masterGroup.scale.setScalar(baseScale());
        masterGroup.position.set(0, BASE_Y, 0);
        layout();
        // If the page was already scrolled when the model finished loading, start the video.
        if (video && s.openProgress > 0.05) video.play().catch(() => {});
        setIsLoaded(true);
        onLoadedRef.current?.();
      },
      undefined,
      (error) => {
        if (!disposed) {
          console.error("MacBook model failed to load:", error);
          setHasError(true);
        }
      }
    );

    const animate = () => {
      if (disposed || !s.isMounted) return;
      if (document.hidden) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      if (s.masterGroup) {
        // Hide the laptop once its final scroll exit completes. Visibility is
        // reversible, so scrolling upward brings it back into the same scene.
        s.masterGroup.visible = s.exitProgress < 0.985;

        // Skip rendering work while the model is fully exited.
        if (!s.masterGroup.visible) {
          animationId = requestAnimationFrame(animate);
          return;
        }

        const lerpFactor = reducedMotion ? 1 : 0.1;
        // 0 = lid closed, 1 = lid open. Keep the lid at its closed pose on load.
        const targetLid = THREE.MathUtils.lerp(LID_CLOSED, lidOpen, s.openProgress);
        currentLidRotation += (targetLid - currentLidRotation) * lerpFactor;
        if (s.lidNode) s.lidNode.rotation.x = currentLidRotation;

        // 0 = closed, 1 = open (follows the actual lid, so lift and tilt ease with it)
        const openAmount = THREE.MathUtils.clamp(
          lidOpen === 0 ? 0 : currentLidRotation / lidOpen,
          0,
          1
        );
        // Under reduced motion keep a stable tilt (no closed-extra tilt animation).
        s.masterGroup.rotation.x = reducedMotion
          ? TILT_X
          : TILT_X + CLOSED_TILT_EXTRA * (1 - openAmount);

        const targetRotY = reducedMotion ? 0 : s.rotYProgress * Math.PI * 2;
        currentRotationY += (targetRotY - currentRotationY) * (reducedMotion ? 1 : 0.09);
        s.masterGroup.rotation.y = currentRotationY;
        // Keep the laptop inside the visible area horizontally: limit the requested
        // slide to the room left after accounting for the model's current yaw and
        // perspective, so it can't be pushed off the left/right edge of the canvas.
        let targetSlideX = s.slideX;
        if (fit) {
          const sc = s.masterGroup.scale.x;
          const camZ = camera.position.z;
          const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const halfVisible = tanHalfFov * camera.aspect * camZ;
          const halfW =
            (Math.abs(Math.cos(currentRotationY)) * fit.halfX +
              Math.abs(Math.sin(currentRotationY)) * fit.halfZ) * sc;
          const nearDist = Math.max(camZ - fit.halfZ * sc, 0.1);
          const maxSlide = Math.max(0, halfVisible - (halfW * camZ) / nearDist);
          targetSlideX = THREE.MathUtils.clamp(s.slideX, -maxSlide, maxSlide);
        }
        currentSlideX += (targetSlideX - currentSlideX) * (reducedMotion ? 1 : 0.08);
        s.masterGroup.position.x = currentSlideX;
        const targetY = BASE_Y + s.exitProgress * 0.9;
        currentY += (targetY - currentY) * (reducedMotion ? 1 : 0.09);
        const scale = baseScale();
        // Shrink to nothing as it exits, then hide it completely.
        const targetScale = scale * Math.max(0.001, 1 - s.exitProgress);
        const nextScale =
          s.masterGroup.scale.x + (targetScale - s.masterGroup.scale.x) * (reducedMotion ? 1 : 0.09);
        s.masterGroup.scale.setScalar(nextScale);
        const liftY = reducedMotion
          ? 0
          : fit
          ? fit.closedLift * (1 - openAmount) * nextScale
          : 0;
        const floatTerm = reducedMotion ? 0 : Math.sin(performance.now() * 0.0011) * 0.011;
        s.masterGroup.position.y = currentY + liftY + floatTerm;
      }
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    const onResize = () => {
      if (disposed) return;
      layout();
    };
    window.addEventListener("resize", onResize);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(container);
    }

    return () => {
      disposed = true;
      s.isMounted = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotionQuery?.removeEventListener("change", onMotionChange);
      resizeObserver?.disconnect();
      s.cleanupVideo?.();
      if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
      if (s.screenMesh && originalScreenMaterial) s.screenMesh.material = originalScreenMaterial;
      screenMaterial?.dispose();
      videoTexture?.dispose();
      pmrem?.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch { /* ignore */ }
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry?.dispose();
          const mats = Array.isArray(object.material) ? object.material : [object.material];
          mats.filter(Boolean).forEach((m) => {
            Object.values(m).forEach((v) => v && v.isTexture && v.dispose && v.dispose());
            m.dispose && m.dispose();
          });
        }
      });
      s.video = null;
      s.videoTexture = null;
      s.lidNode = null;
      s.masterGroup = null;
      s.screenMesh = null;
    };
  }, [modelUrl, videoUrl]);

  return (
    <div ref={containerRef} className={`relative h-full w-full ${className}`} aria-label="Interactive 3D MacBook">
      {hasError && <div className="absolute inset-0 z-10 flex items-center justify-center text-center text-sm text-white/70">Unable to load the 3D MacBook. Check the model file and WebGL support.</div>}
      {!isLoaded && !hasError && <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-white/60">Loading MacBook...</div>}
    </div>
  );
});

export default MacBookScene;