import { useEffect, useRef, useState } from "react";
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
 * Transforms flat, statue-like GLTF materials into realistic, lifelike PBR materials:
 * 1. Zeros out emissive blowout (which causes flat white glowing statue look).
 * 2. Repurposes emissive map as Ambient Occlusion (aoMap) to deepen muscle/crease shadows.
 * 3. Tunes roughness, metalness, and environment reflection for realistic athletic skin & fabric.
 * 4. Calibrates normalMap intensity and 16x anisotropic filtering for crisp anatomical definition.
 */
const enhanceModelMaterials = (model, renderer) => {
  const maxAniso = renderer.capabilities.getMaxAnisotropy() || 16;

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const tuneMaterial = (mat) => {
      // If basic material, convert to Standard PBR
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

      // Eliminate unlit white emissive blowout that causes statue-like appearance
      if (mat.emissive) {
        mat.emissive.set(0x000000);
      }
      mat.emissiveIntensity = 0;

      // Re-route dummy emissive map into Ambient Occlusion for natural muscle shading
      if (mat.emissiveMap) {
        mat.aoMap = mat.emissiveMap;
        mat.aoMapIntensity = 0.85;
        mat.emissiveMap = null;
      }

      // Natural athletic skin & performance fabric micro-surface response
      mat.roughness = 0.52;
      mat.metalness = 0.04;
      mat.envMapIntensity = 1.35;

      // Ensure proper color spaces and high quality filtering on all textures
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

const FitnessModelScene = ({
  modelUrl,
  variant = "coach", // "hero-features-sticky" | "coach" | "workout"
  scrollTriggerElement = null,
}) => {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

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
    // Adjusted camera distance and height so the entire model (head to shoes) fits with ample headroom
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
    // ENVIRONMENT MAP (Physically Based Studio Reflections)
    // --------------------------------------------------
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // --------------------------------------------------
    // CINEMATIC 4-POINT ATHLETIC LIGHTING RIG
    // --------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);

    const hemisphereLight = new THREE.HemisphereLight(
      0xa5b4fc, // Soft cool sky
      0x0a0a14, // Dark ground
      0.65
    );

    // Key Light: Warm directional light casting soft shadows
    const keyLight = new THREE.DirectionalLight(0xfff5eb, 3.4);
    keyLight.position.set(4, 5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.radius = 4;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;

    // Fill Light: Soft cyan/indigo fill for realistic shadow contrast
    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.1);
    fillLight.position.set(-4, 2, 3.5);

    // Rim Light 1: Vivid cyan athletic edge rim
    const rimLight1 = new THREE.DirectionalLight(0x06b6d4, 3.6);
    rimLight1.position.set(-4.5, 4, -4.5);

    // Rim Light 2: Neon violet/magenta athletic edge rim
    const rimLight2 = new THREE.DirectionalLight(0xa855f7, 3.0);
    rimLight2.position.set(4.5, 3.5, -4);

    // Floor accent up-light: adds subtle ground bounce
    const groundBounceLight = new THREE.PointLight(0x38bdf8, 1.2, 8);
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
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.visible = false;
    scene.add(ground);

    // --------------------------------------------------
    // MOUSE PARALLAX TRACKING
    // --------------------------------------------------
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const handleMouseMove = (e) => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      mouse.targetX = (e.clientX / windowWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / windowHeight) * 2 + 1;
    };

    window.addEventListener("pointermove", handleMouseMove, { passive: true });

    // --------------------------------------------------
    // RESIZE HANDLER (DYNMIC CAMERA PROJECTION FOR ALL DEVICES)
    // --------------------------------------------------
    const resizeRenderer = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const aspect = width / Math.max(height, 1);
      camera.aspect = aspect;

      // Dynamically calculate camera Z distance so the model fits with headroom on all screens:
      // - Tall mobile phones (portrait): aspect < 0.7 -> Z = 10.4
      // - Tablets / Foldables: 0.7 <= aspect < 1.3 -> Z = 9.2
      // - Laptops (13"-16", MacBook, 1080p): 1.3 <= aspect < 1.8 -> Z = 8.4
      // - Ultrawide / 4K desktops: aspect >= 1.8 -> Z = 8.2
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
    // MODEL & ANIMATION STATE
    // --------------------------------------------------
    let model = null;
    let baseScale = 1;
    let basePosition = new THREE.Vector3(0, 0, 0);
    let baseRotation = new THREE.Euler(0, 0, 0);
    let scrollTimeline = null;
    let scrollTriggerInstance = null;
    let animationFrameId = null;

    const clock = new THREE.Clock();

    // --------------------------------------------------
    // SCROLL ANIMATIONS CONFIGURATION
    // --------------------------------------------------
    const setupScrollAnimation = (loadedModel) => {
      const getOffsets = () => {
        const w = window.innerWidth;
        if (w < 768) return { startX: 0, midRightX: 0 };
        if (w < 1024) return { startX: -1.35, midRightX: 1.35 };
        if (w < 1280) return { startX: -1.6, midRightX: 1.6 };
        if (w < 1536) return { startX: -1.85, midRightX: 1.85 };
        return { startX: -2.1, midRightX: 2.1 };
      };

      const { startX, midRightX } = getOffsets();

      // ==================================================
      // 1. UNIFIED CONTINUOUS JOURNEY (STARTING FROM HOME):
      // Starts in Hero (Page 1) on the left side with FACE FORWARD (rotation.y = 0).
      // Immediately on scroll: glides left -> right (-x to +x) on Slide 1,
      // glides right -> left (+x to -x) on Slide 2,
      // and glides left -> right (-x to +x) on Slide 3,
      // rotating continuously with each transition!
      // ==================================================
      if (
        variant === "unified-journey" ||
        variant === "hero-features-sticky" ||
        variant === "features" ||
        variant === "hero" ||
        variant === "coach"
      ) {
        const FACE_FORWARD = 0; // Starts face-forward facing camera directly

        basePosition.set(startX, 0, 0);
        baseRotation.set(0, FACE_FORWARD, 0);

        loadedModel.position.x = startX;
        loadedModel.rotation.y = FACE_FORWARD;

        const triggerTarget =
          scrollTriggerElement ||
          document.querySelector("#home-features-pin") ||
          document.querySelector("#home") ||
          container;

        scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: triggerTarget,
            start: "top top",
            end: "+=360%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // Step 1 (Home -> Slide 1): Glides from LEFT (-x) to RIGHT (+x) & rotates 180° to face Slide 1 text on left
        scrollTimeline
          .to(
            basePosition,
            {
              x: midRightX,
              ease: "power1.inOut",
              duration: 1.2,
            },
            0
          )
          .to(
            baseRotation,
            {
              y: FACE_FORWARD + Math.PI, // 180 deg turn, facing left toward Slide 1 text
              ease: "power1.inOut",
              duration: 1.2,
            },
            0
          )
          // Step 2 (Slide 1 -> Slide 2): Glides from RIGHT (+x) to LEFT (-x) & rotates to 360° to face Slide 2 text on right
          .to(
            basePosition,
            {
              x: startX,
              ease: "power1.inOut",
              duration: 1.2,
            },
            1.4
          )
          .to(
            baseRotation,
            {
              y: FACE_FORWARD + Math.PI * 2, // 360 deg full turn, facing right toward Slide 2 text
              ease: "power1.inOut",
              duration: 1.2,
            },
            1.4
          )
          // Step 3 (Slide 2 -> Slide 3): Glides from LEFT (-x) to RIGHT (+x) & rotates to 540° to face Slide 3 text on left
          .to(
            basePosition,
            {
              x: midRightX,
              ease: "power1.inOut",
              duration: 1.2,
            },
            2.8
          )
          .to(
            baseRotation,
            {
              y: FACE_FORWARD + Math.PI * 3, // 540 deg turn, facing left toward Slide 3 text
              ease: "power1.inOut",
              duration: 1.2,
            },
            2.8
          );

        return;
      }

      // ==================================================
      // 2ND MODEL (AVA STEELE - DUMBBELL TRAINER):
      // Kept at a dynamic 3/4 front athletic angle (-0.38 rad).
      // Her face, eyes, shoulders, and dumbbells are clearly visible.
      // Her backside/glutes are NOT facing the camera!
      // Slides in gracefully on scroll from the left.
      // ==================================================
      if (variant === "workout") {
        const isMobile = window.innerWidth < 768;
        const triggerSection = container.closest("[data-model-section]") || container;
        // Dynamic 3/4 athletic front angle (~22 deg) where face and dumbbells are visible
        const TARGET_ROTATION = -0.38;
        const targetX = isMobile ? 0 : 0.05;
        const offscreenLeftX = isMobile ? -3.5 : -5.0;

        // Start off-screen left and angled slightly
        basePosition.set(offscreenLeftX, 0, 0);
        baseRotation.set(0, TARGET_ROTATION - 0.4, 0);
        loadedModel.position.x = offscreenLeftX;
        loadedModel.rotation.y = TARGET_ROTATION - 0.4;
        gsap.set(container, { opacity: 0, scale: 0.95 });

        scrollTriggerInstance = ScrollTrigger.create({
          trigger: triggerSection,
          start: "top 78%",
          onEnter: () => {
            // Animate container fade & scale
            gsap.to(container, {
              opacity: 1,
              scale: 1,
              duration: 1.2,
              ease: "power3.out",
            });

            // Smoothly slide 3D model in from left to resting position
            gsap.to(basePosition, {
              x: targetX,
              duration: 1.4,
              ease: "power3.out",
            });

            // Settle into ready stance with face and dumbbells clearly visible
            gsap.to(baseRotation, {
              y: TARGET_ROTATION,
              duration: 1.4,
              ease: "power3.out",
            });
          },
          onLeaveBack: () => {
            gsap.to(container, {
              opacity: 0,
              scale: 0.95,
              duration: 0.7,
              ease: "power2.in",
            });
            gsap.to(basePosition, {
              x: offscreenLeftX,
              duration: 0.8,
              ease: "power2.in",
            });
            gsap.to(baseRotation, {
              y: TARGET_ROTATION - 0.4,
              duration: 0.8,
              ease: "power2.in",
            });
          },
        });
      }
    };

    // --------------------------------------------------
    // LOAD GLB MODEL
    // --------------------------------------------------
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        model = gltf.scene;

        // Calibrated heights so head, torso, dumbbells, and shoes fit cleanly with headroom
        const targetHeight = variant === "hero-features-sticky" || variant === "coach" ? 3.55 : 3.4;
        const { scale, bounds } = centerAndScaleModel(model, targetHeight);
        baseScale = scale;

        // Apply realistic PBR materials, remove emissive glow, setup AO
        enhanceModelMaterials(model, renderer);

        // Ground shadow plane alignment
        ground.position.y = bounds.min.y;
        ground.visible = true;

        scene.add(model);
        setupScrollAnimation(model);
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

      // Smooth mouse lerping for reactive pointer parallax
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      if (model) {
        // 1. Lifelike diaphragmatic breathing (sinusoidal chest elevation + subtle expansion)
        const breathY = Math.sin(elapsedTime * 1.9) * 0.025;
        const breathScale = 1.0 + Math.sin(elapsedTime * 1.9) * 0.003;

        // 2. Natural organic posture sway (micro weight shifting on Z & X)
        const idleSwayZ = Math.sin(elapsedTime * 0.9) * 0.01;
        const idleSwayX = Math.cos(elapsedTime * 1.3) * 0.007;

        // Apply dynamic positions
        model.position.x = basePosition.x;
        model.position.y = basePosition.y + breathY;
        model.position.z = basePosition.z;

        // Apply dynamic rotations with mouse parallax follow
        model.rotation.x = baseRotation.x + mouse.y * 0.1 + idleSwayX;
        model.rotation.y = baseRotation.y + mouse.x * 0.2;
        model.rotation.z = baseRotation.z + idleSwayZ;

        // Subtle micro-pulse on torso for organic breathing
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
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("resize", resizeRenderer);

      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
      scrollTriggerInstance?.kill();

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
  }, [modelUrl, variant, scrollTriggerElement]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden will-change-transform"
      aria-hidden="true"
    >
      {loadError && (
        <p className="absolute inset-0 grid place-items-center text-sm text-violet-200">
          Model unavailable.
        </p>
      )}
    </div>
  );
};

export default FitnessModelScene;