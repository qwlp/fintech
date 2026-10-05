import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export function createStudyPassport() {
  const group = new THREE.Group();
  const coverMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x18324e,
    roughness: 0.48,
    metalness: 0.25,
    clearcoat: 0.45,
  });
  const paper = new THREE.Mesh(
    new RoundedBoxGeometry(1.48, 2.02, 0.085, 3, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xe6e7e4, roughness: 0.9 }),
  );
  group.add(paper);
  for (const z of [-0.065, 0.065]) {
    const cover = new THREE.Mesh(
      new RoundedBoxGeometry(1.56, 2.1, 0.035, 4, 0.06),
      coverMaterial,
    );
    cover.position.z = z;
    group.add(cover);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const paint = () => {
    ctx.clearRect(0, 0, 768, 1024);
    ctx.textAlign = "center";
    ctx.fillStyle = "#d8e5f3";
    ctx.font = "600 57px Manrope, sans-serif";
    ctx.fillText("FINANCIAL", 384, 165);
    ctx.font = "400 44px Manrope, sans-serif";
    ctx.fillText("PASSPORT", 384, 232);
    ctx.strokeStyle = "#9cb1c9";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(384, 520, 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(384, 520, 65, 130, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(384, 520, 130, 40, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(254, 520);
    ctx.lineTo(514, 520);
    ctx.stroke();
    ctx.font = '400 24px "IBM Plex Mono", monospace';
    ctx.fillText("STUDY / PLAN / MOVE", 384, 840);
    ctx.strokeStyle = "#7b97b7";
    ctx.lineWidth = 2;
    ctx.strokeRect(315, 905, 138, 45);
    ctx.beginPath();
    ctx.arc(384, 927, 14, 0, Math.PI * 2);
    ctx.stroke();
    texture.needsUpdate = true;
  };
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  paint();
  const lettering = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.96),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.35,
      metalness: 0.4,
      depthWrite: false,
    }),
  );
  lettering.position.z = 0.086;
  group.add(lettering);
  let disposed = false;
  void Promise.all([
    document.fonts.load("600 57px Manrope"),
    document.fonts.load('24px "IBM Plex Mono"'),
  ]).then(() => {
    if (!disposed) paint();
  });
  group.userData.dispose = () => {
    disposed = true;
    texture.dispose();
  };
  return group;
}
