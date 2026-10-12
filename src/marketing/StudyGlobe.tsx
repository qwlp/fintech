import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStudyPassport } from "./createStudyPassport";

// A stylized globe: the routes illustrate studying across borders, not live transfers.
export default function StudyGlobe({
  passportOnly = false,
}: {
  passportOnly?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 7.8);
    const world = new THREE.Group();
    world.rotation.set(0.15, -0.45, -0.18);
    scene.add(world);
    world.visible = !passportOnly;
    world.scale.setScalar(0.84);
    world.position.set(0.5, 0.2, -0.2);
    const passport = createStudyPassport();
    passport.position.set(
      passportOnly ? 0 : -1.05,
      passportOnly ? 0 : -0.45,
      1.2,
    );
    passport.scale.setScalar(passportOnly ? 1.25 : 0.94);
    passport.rotation.set(-0.12, -0.34, -0.2);
    scene.add(passport);
    if (passportOnly) camera.position.z = 6;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.65, 64, 48),
      new THREE.MeshPhysicalMaterial({
        color:
          document.documentElement.dataset.theme === "dark"
            ? 0x18324e
            : 0xbdcbdb,
        metalness: 0.22,
        roughness: 0.48,
        clearcoat: 0.7,
      }),
    );
    world.add(globe);
    const point = (lat: number, lon: number, radius = 1.665) => {
      const a = (lat * Math.PI) / 180,
        b = (lon * Math.PI) / 180;
      return new THREE.Vector3(
        radius * Math.cos(a) * Math.sin(b),
        radius * Math.sin(a),
        radius * Math.cos(a) * Math.cos(b),
      );
    };
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x8296b0,
      transparent: true,
      opacity: 0.3,
    });
    for (let lat = -60; lat <= 60; lat += 20) {
      world.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            Array.from({ length: 181 }, (_, i) => point(lat, i * 2)),
          ),
          gridMaterial,
        ),
      );
    }
    for (let lon = 0; lon < 180; lon += 20) {
      const points = Array.from({ length: 181 }, (_, i) => {
        const t = (i * Math.PI) / 90;
        return new THREE.Vector3(
          1.665 * Math.cos(t) * Math.sin((lon * Math.PI) / 180),
          1.665 * Math.sin(t),
          1.665 * Math.cos(t) * Math.cos((lon * Math.PI) / 180),
        );
      });
      world.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          gridMaterial,
        ),
      );
    }
    const cities = [
      [51, -0.1],
      [40, 116],
      [30, 120],
      [40, -74],
    ];
    const routeMaterial = new THREE.MeshStandardMaterial({
      color: 0x5b7da4,
      emissive: 0x5071af,
      emissiveIntensity: 0.7,
      metalness: 0.3,
      roughness: 0.4,
    });
    const travelers: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3 }[] = [];
    cities.forEach(([lat, lon], index) => {
      const pos = point(lat, lon, 1.69);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 12, 8),
        routeMaterial,
      );
      marker.position.copy(pos);
      world.add(marker);
      if (!index) return;
      const start = point(cities[0][0], cities[0][1], 1.69);
      const middle = start
        .clone()
        .add(pos)
        .normalize()
        .multiplyScalar(2.12 + index * 0.04);
      const curve = new THREE.CatmullRomCurve3([start, middle, pos]);
      world.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 64, 0.009, 6, false),
          routeMaterial,
        ),
      );
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      world.add(mesh);
      travelers.push({ mesh, curve });
    });
    scene.add(new THREE.HemisphereLight(0xebf2f9, 0x0c1927, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6397cf, 4);
    rim.position.set(4, 0, -2);
    scene.add(rim);
    let frame = 0,
      visible = true;
    const pointer = { x: 0, y: 0 };
    const easedPointer = { x: 0, y: 0 };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (time = 0) => {
      if (visible) {
        const t = motion.matches ? 0 : time * 0.001;
        easedPointer.x += (pointer.x - easedPointer.x) * 0.045;
        easedPointer.y += (pointer.y - easedPointer.y) * 0.045;
        world.rotation.y =
          -0.45 +
          (motion.matches ? 0 : Math.sin(t * 0.13) * 0.38) +
          easedPointer.x * 0.38;
        world.rotation.x = 0.15 + easedPointer.y * 0.22;
        passport.rotation.y =
          -0.34 +
          easedPointer.x * 0.32 +
          (motion.matches ? 0 : Math.sin(t * 0.4) * 0.1);
        passport.rotation.x = -0.12 + easedPointer.y * 0.18;
        passport.position.y =
          (passportOnly ? 0 : -0.45) +
          (motion.matches ? 0 : Math.sin(t * 0.65) * 0.07);
        travelers.forEach(({ mesh, curve }, i) =>
          mesh.position.copy(curve.getPoint((t * 0.09 + i * 0.19) % 1)),
        );
        renderer.render(scene, camera);
      }
      if (!motion.matches) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      if (motion.matches) draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(container);
    const move = (e: PointerEvent) => {
      if (motion.matches) return;
      const rect = container.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
    };
    const leave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    const themeObserver = new MutationObserver(() => {
      globe.material.color.setHex(
        document.documentElement.dataset.theme === "dark" ? 0x18324e : 0xbdcbdb,
      );
      if (motion.matches) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const change = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerleave", leave);
    motion.addEventListener("change", change);
    resize();
    draw();
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      container.removeEventListener("pointerleave", leave);
      visibility.disconnect();
      motion.removeEventListener("change", change);
      container.removeEventListener("pointermove", move);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
      passport.userData.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [passportOnly]);
  return (
    <div
      className={`study-globe ${ready ? "is-ready" : ""}`}
      ref={host}
      role="img"
      aria-label={
        passportOnly
          ? "3D MoveWise booklet"
          : "3D MoveWise booklet beside a globe with study routes"
      }
    >
      <div className="globe-fallback" aria-hidden="true">
        ◎
      </div>
    </div>
  );
}
