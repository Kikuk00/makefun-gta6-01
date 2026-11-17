// The 3D stage: renderer, a gradient sunset sky dome, warm sun with shadows, fog, and
// the third-person chase camera that follows Mara on foot and behind the wheel.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2a56b, 180, 620);

  // Gradient sky dome: amber at the horizon fading to blue overhead.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 horizon; void main(){ float h = normalize(vPos).y; float t = smoothstep(-0.05, 0.5, h); gl_FragColor = vec4(mix(horizon, top, t), 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 24, 16), skyMat);
  scene.add(sky);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.2);
  sun.position.set(120, 160, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 500;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x8fb8dd, 0x8a6a4a, 1.25));

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1600);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Camera rig: yaw follows the player's heading (or the mouse drag), pitch and distance
  // are set by the wheel and the mouse; it eases toward its target every frame.
  const rig = {
    yaw: 0, pitch: 0.26, dist: 10, targetYaw: 0, targetPitch: 0.26, targetDist: 10,
    pos: new THREE.Vector3(0, 10, -20),
    look: new THREE.Vector3(),
  };

  function updateCamera(G, dt) {
    const p = G.player.state;
    const focus = p.inCar ? p.inCar.pos : p.pos;
    const heading = p.inCar ? p.inCar.heading : p.heading;
    // Ease the yaw toward the player's heading unless the player is steering the camera.
    if (G.camFreeUntil < G.time) {
      let dh = heading - rig.targetYaw;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      rig.targetYaw += dh * Math.min(1, 1.6 * dt);
    }
    rig.yaw += (rig.targetYaw - rig.yaw) * Math.min(1, 8 * dt);
    rig.pitch += (rig.targetPitch - rig.pitch) * Math.min(1, 8 * dt);
    rig.dist += (rig.targetDist - rig.dist) * Math.min(1, 8 * dt);
    const dist = p.inCar ? rig.dist + 2 : rig.dist;
    const height = p.inCar ? 3.8 : 2.8;
    const cx = focus.x - Math.sin(rig.yaw) * Math.cos(rig.pitch) * dist;
    const cz = focus.z - Math.cos(rig.yaw) * Math.cos(rig.pitch) * dist;
    const cy = focus.y + height + Math.sin(rig.pitch) * dist;
    rig.pos.x += (cx - rig.pos.x) * Math.min(1, 10 * dt);
    rig.pos.y += (cy - rig.pos.y) * Math.min(1, 10 * dt);
    rig.pos.z += (cz - rig.pos.z) * Math.min(1, 10 * dt);
    rig.look.set(focus.x + Math.sin(rig.yaw) * 2, focus.y + 1.6, focus.z + Math.cos(rig.yaw) * 2);
    camera.position.copy(rig.pos);
    camera.lookAt(rig.look);
    // The shadow camera follows the player so shadows stay crisp nearby.
    sun.position.set(focus.x + 120, 160, focus.z + 60);
    sun.target.position.set(focus.x, 0, focus.z);
    sun.target.updateMatrixWorld();
  }

  return { renderer, scene, camera, rig, updateCamera };
}
