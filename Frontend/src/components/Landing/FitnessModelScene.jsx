import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

gsap.registerPlugin(ScrollTrigger);

const disposeModel = (model) => {
  model.traverse((child) => {
    if (!child.isMesh) return;

    child.geometry.dispose();

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) {
          value.dispose();
        }
      });
      material.dispose();
    });
  });
};

/**
 * Transforms flat GLTF materials into realistic, lifelike PBR materials
 */
const enhanceModelMaterials = (model, renderer) => {
  const maxAniso = renderer.capabilities.getMaxAnisotropy() || 16;

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const tuneMaterial = (mat) => {
      if (mat.isMeshBasicMaterial) {
        const upgraded = new THREE.MeshStandardMaterial({
          map: mat.map || null,
          color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
          transparent: mat.transparent,
          opacity: mat.opacity,
          alphaMap: mat.alphaMap || null,
          side: mat.side,
          roughness: 0.52,
          metalness: 0.04,
          envMapIntensity: 1.35,
        });
        mat.dispose();
        mat = upgraded;
      }

      if (mat.emissive) {
        mat.emissive.set(0x000000);
      }
      mat.emissiveIntensity = 0;

      if (mat.emissiveMap) {
        mat.aoMap = mat.emissiveMap;
        mat.aoMapIntensity = 0.85;
        mat.emissiveMap = null;
      }

      mat.roughness = 0.52;
      mat.metalness = 0.04;
      mat.envMapIntensity = 1.35;

      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.anisotropy = maxAniso;
        mat.map.minFilter = THREE.LinearMipmapLinearFilter;
        mat.map.magFilter = THREE.LinearFilter;
        mat.map.needsUpdate = true;
      }

      if (mat.normalMap) {
        mat.normalMap.colorSpace = THREE.NoColorSpace;
        mat.normalScale.set(1.2, 1.2);
        mat.normalMap.anisotropy = maxAniso;
        mat.normalMap.needsUpdate = true;
      }

      if (mat.roughnessMap) {
        mat.roughnessMap.anisotropy = maxAniso;
      }

      mat.needsUpdate = true;
      return mat;
    };

    child.material = Array.isArray(child.material)
      ? child.material.map(tuneMaterial)
      : tuneMaterial(child.material);
  });
};

const centerAndScaleModel = (model, targetHeight) => {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());

  const scale = targetHeight / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);

  const scaledBounds = new THREE.Box3().setFromObject(model);
  const center = scaledBounds.getCenter(new THREE.Vector3());

  model.position.x -= center.x;
  model.position.y -= center.y;
  model.position.z -= center.z;

  return { scale, bounds: scaledBounds };
};

const FitnessModelScene = forwardRef(({
  modelUrl,
  variant = "coach", // "unified-journey" | "hero" | "workout" | "coach"
  onModelLoaded = null,
}, ref) => {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const onModelLoadedRef = useRef(onModelLoaded);
  onModelLoadedRef.current = onModelLoaded;

  // Direct transform state for master timeline control
  const liveTransformRef = useRef({
    x: variant === "unified-journey" ? -1.85 : 0,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  });

  useImperativeHandle(ref, () => ({
    setTransform: (x, rotY, rotZ = 0, y = 0) => {
      liveTransformRef.current.x = x;
      liveTransformRef.current.rotY = rotY;
      liveTransformRef.current.rotZ = rotZ;
      liveTransformRef.current.y = y;
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // --------------------------------------------------
    // THREE.JS SCENE SETUP
    // --------------------------------------------------
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.set(0, -0.05, 8.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none";

    container.appendChild(renderer.domElement);

    // --------------------------------------------------
    // ENVIRONMENT MAP (Daylight Studio Reflections)
    // --------------------------------------------------
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // --------------------------------------------------
    // CINEMATIC ATHLETIC LIGHTING RIG
    // --------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);

    const hemisphereLight = new THREE.HemisphereLight(
      0xf1f5f9,
      0x1e1b4b,
      0.75
    );

    const keyLight = new THREE.DirectionalLight(0xfff5eb, 3.2);
    keyLight.position.set(4, 5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.radius = 4;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;

    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.3);
    fillLight.position.set(-4, 2, 3.5);

    const rimLight1 = new THREE.DirectionalLight(0x06b6d4, 3.0);
    rimLight1.position.set(-4.5, 4, -4.5);

    const rimLight2 = new THREE.DirectionalLight(0xa855f7, 2.6);
    rimLight2.position.set(4.5, 3.5, -4);

    const groundBounceLight = new THREE.PointLight(0x38bdf8, 1.0, 8);
    groundBounceLight.position.set(0, -2.5, 2);

    scene.add(
      ambientLight,
      hemisphereLight,
      keyLight,
      fillLight,
      rimLight1,
      rimLight2,
      groundBounceLight
    );

    // Contact shadow plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.25 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.visible = false;
    scene.add(ground);

    // --------------------------------------------------
    // HIGH-PRECISION 3D POINTER, HOVER & DRAG INTERACTION
    // --------------------------------------------------
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      isHovered: false,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragYaw: 0,
      dragPitch: 0,
      targetDragYaw: 0,
      targetDragPitch: 0,
    };

    if (variant === "workout") {
      container.style.cursor = "grab";
      container.style.touchAction = "none";
    }

    const handlePointerEnter = () => {
      pointer.isHovered = true;
    };

    const handlePointerLeave = () => {
      pointer.isHovered = false;
      if (!pointer.isDragging) {
        pointer.targetX = 0;
        pointer.targetY = 0;
      }
    };

    const handleContainerPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      pointer.targetX = Math.max(-1.4, Math.min(1.4, normX));
      pointer.targetY = Math.max(-1.4, Math.min(1.4, normY));
      pointer.isHovered = true;

      if (pointer.isDragging) {
        const deltaX = (e.clientX - pointer.dragStartX) * 0.007;
        const deltaY = (e.clientY - pointer.dragStartY) * 0.005;
        pointer.targetDragYaw = deltaX;
        pointer.targetDragPitch = deltaY;
      }
    };

    const handleContainerPointerDown = (e) => {
      if (variant !== "workout") return;
      pointer.isDragging = true;
      pointer.dragStartX = e.clientX - pointer.targetDragYaw / 0.007;
      pointer.dragStartY = e.clientY - pointer.targetDragPitch / 0.005;
      container.style.cursor = "grabbing";
    };

    const handleContainerPointerUp = () => {
      if (variant !== "workout") return;
      if (pointer.isDragging) {
        pointer.isDragging = false;
        container.style.cursor = "grab";
        gsap.to(pointer, {
          targetDragYaw: 0,
          targetDragPitch: 0,
          duration: 1.1,
          ease: "power2.out",
        });
      }
    };

    const handleWindowMouseMove = (e) => {
      if (pointer.isHovered) return;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      pointer.targetX = (e.clientX / windowWidth) * 2 - 1;
      pointer.targetY = -(e.clientY / windowHeight) * 2 + 1;
    };

    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointerleave", handlePointerLeave);
    container.addEventListener("pointermove", handleContainerPointerMove);
    container.addEventListener("pointerdown", handleContainerPointerDown);
    window.addEventListener("pointerup", handleContainerPointerUp);
    window.addEventListener("pointercancel", handleContainerPointerUp);
    window.addEventListener("pointermove", handleWindowMouseMove, { passive: true });

    // --------------------------------------------------
    // RESIZE HANDLER
    // --------------------------------------------------
    const resizeRenderer = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const aspect = width / Math.max(height, 1);
      camera.aspect = aspect;

      if (aspect < 0.7) {
        camera.position.z = 10.4;
        camera.position.y = 0.0;
      } else if (aspect < 1.0) {
        camera.position.z = 9.4;
        camera.position.y = -0.05;
      } else if (aspect < 1.35) {
        camera.position.z = 8.8;
        camera.position.y = -0.05;
      } else {
        camera.position.z = 8.4;
        camera.position.y = -0.05;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resizeRenderer();
    window.addEventListener("resize", resizeRenderer);

    // --------------------------------------------------
    // MODEL STATE
    // --------------------------------------------------
    let model = null;
    let baseScale = 1;
    let animationFrameId = null;
    const clock = new THREE.Clock();

    // Responsive start position based on viewport
    const getInitialX = () => {
      const w = window.innerWidth;
      if (w < 768) return 0;
      if (w < 1024) return -1.35;
      if (w < 1280) return -1.6;
      if (w < 1536) return -1.85;
      return -2.1;
    };

    const initialX = variant === "unified-journey" ? getInitialX() : 0;
    liveTransformRef.current.x = initialX;

    // --------------------------------------------------
    // LOAD GLB MODEL
    // --------------------------------------------------
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        model = gltf.scene;

        const targetHeight = variant === "hero-features-sticky" || variant === "coach" || variant === "unified-journey" ? 3.55 : 3.4;
        const { scale, bounds } = centerAndScaleModel(model, targetHeight);
        baseScale = scale;

        enhanceModelMaterials(model, renderer);

        ground.position.y = bounds.min.y;
        ground.visible = true;

        model.position.x = liveTransformRef.current.x;
        model.rotation.y = liveTransformRef.current.rotY;

        scene.add(model);

        if (variant === "workout") {
          // Ava Steele entry animation
          const isMobile = window.innerWidth < 768;
          const TARGET_ROTATION = -0.38;
          const targetX = isMobile ? 0 : 0.05;
          const offscreenLeftX = isMobile ? -3.5 : -5.0;

          liveTransformRef.current.x = offscreenLeftX;
          liveTransformRef.current.rotY = TARGET_ROTATION - 0.4;
          model.position.x = offscreenLeftX;
          model.rotation.y = TARGET_ROTATION - 0.4;

          ScrollTrigger.create({
            trigger: container.closest("[data-model-section]") || container,
            start: "top 78%",
            onEnter: () => {
              gsap.to(liveTransformRef.current, {
                x: targetX,
                rotY: TARGET_ROTATION,
                duration: 1.4,
                ease: "power3.out",
              });
            },
            onLeaveBack: () => {
              gsap.to(liveTransformRef.current, {
                x: offscreenLeftX,
                rotY: TARGET_ROTATION - 0.4,
                duration: 0.8,
                ease: "power2.in",
              });
            },
          });
        }

        if (onModelLoadedRef.current) onModelLoadedRef.current();
        ScrollTrigger.refresh();
      },
      undefined,
      (error) => {
        console.error("Unable to load fitness model:", error);
        setLoadError(true);
      }
    );

    // --------------------------------------------------
    // RENDER & LIFELIKE ORGANIC ANIMATION LOOP
    // --------------------------------------------------
    const renderScene = () => {
      animationFrameId = window.requestAnimationFrame(renderScene);

      const elapsedTime = clock.getElapsedTime();

      const lerpSpeed = pointer.isHovered || pointer.isDragging ? 0.08 : 0.045;
      pointer.x += (pointer.targetX - pointer.x) * lerpSpeed;
      pointer.y += (pointer.targetY - pointer.y) * lerpSpeed;

      pointer.dragYaw += (pointer.targetDragYaw - pointer.dragYaw) * 0.12;
      pointer.dragPitch += (pointer.targetDragPitch - pointer.dragPitch) * 0.12;

      if (model) {
        // 1. Lifelike breathing
        const breathY = Math.sin(elapsedTime * 1.9) * 0.025;
        const breathScale = 1.0 + Math.sin(elapsedTime * 1.9) * 0.003;

        // 2. Natural sway
        const idleSwayZ = Math.sin(elapsedTime * 0.9) * 0.01;
        const idleSwayX = Math.cos(elapsedTime * 1.3) * 0.007;

        if (variant === "workout") {
          const hoverYaw = pointer.x * 0.65;
          const hoverPitch = -pointer.y * 0.28;
          const hoverRoll = -pointer.x * 0.08;

          model.rotation.x = liveTransformRef.current.rotX + hoverPitch + pointer.dragPitch + idleSwayX;
          model.rotation.y = liveTransformRef.current.rotY + hoverYaw + pointer.dragYaw;
          model.rotation.z = liveTransformRef.current.rotZ + hoverRoll + idleSwayZ;

          const parallaxX = pointer.x * 0.28;
          const parallaxY = pointer.y * 0.2;
          const hoverPopZ = pointer.isHovered ? 0.16 : 0;

          model.position.x = liveTransformRef.current.x + parallaxX;
          model.position.y = liveTransformRef.current.y + breathY + parallaxY;
          model.position.z = liveTransformRef.current.z + hoverPopZ;

          keyLight.position.x = 4 + pointer.x * 2.2;
          keyLight.position.y = 5 + pointer.y * 1.8;
          rimLight1.position.x = -4.5 - pointer.x * 1.2;
        } else {
          // Unified hero & features model (Directly scrubs with liveTransformRef)
          model.position.x = liveTransformRef.current.x + pointer.x * 0.1;
          model.position.y = liveTransformRef.current.y + breathY + pointer.y * 0.08;
          model.position.z = liveTransformRef.current.z;

          model.rotation.x = liveTransformRef.current.rotX + pointer.y * 0.18 + idleSwayX;
          model.rotation.y = liveTransformRef.current.rotY + pointer.x * 0.35;
          model.rotation.z = liveTransformRef.current.rotZ + idleSwayZ;
        }

        model.scale.set(
          baseScale * breathScale,
          baseScale,
          baseScale * breathScale
        );
      }

      renderer.render(scene, camera);
    };

    renderScene();

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------
    return () => {
      window.cancelAnimationFrame(animationFrameId);

      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeEventListener("pointermove", handleContainerPointerMove);
      container.removeEventListener("pointerdown", handleContainerPointerDown);
      window.removeEventListener("pointerup", handleContainerPointerUp);
      window.removeEventListener("pointercancel", handleContainerPointerUp);
      window.removeEventListener("pointermove", handleWindowMouseMove);
      window.removeEventListener("resize", resizeRenderer);

      if (model) {
        scene.remove(model);
        disposeModel(model);
      }

      groundGeometry.dispose();
      groundMaterial.dispose();
      envTexture.dispose();
      pmremGenerator.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [modelUrl, variant]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden will-change-transform"
      aria-hidden="true"
    >
      {loadError && (
        <p className="absolute inset-0 grid place-items-center text-sm text-slate-400">
          Model unavailable.
        </p>
      )}
    </div>
  );
});

export default FitnessModelScene;