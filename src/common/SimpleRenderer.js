import { EffectComposer } from "../post-processing/EffectComposer";
import { RenderPass } from "../post-processing/RenderPass";
import { ShaderPass } from "../post-processing/ShaderPass";
import { UnrealBloomPass } from "../post-processing/UnrealBloomPass";

/**
 * @module SimpleRenderer
 * SimpleRenderer helps visualizing the entities in the BoidsController and controls the camera.
 */
export default class SimpleRenderer {
  constructor({ boidsController }) {
    this.boidsController = boidsController;
    this.isDragging = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.degX = 45;
    this.degY = 60;
    const b = this.boidsController.getBoundary();
    this.cameraMax = Math.max(b[0], b[1], b[2]);
    this.cameraRadius = (this.cameraMax * 2) / 3;
    this.lockOn = false;
  }

  init() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100000
    );
    this.camera.position.z = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.entityGeometry = new THREE.SphereGeometry(5);
    this.obstacleGeometry = new THREE.SphereGeometry(50, 15, 15);
    this.entityMaterial = new THREE.MeshNormalMaterial();
    this.obstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a9381,
      flatShading: true,
    });

    this.createGridVisual(this.boidsController.subDivisionCount);

    // create boundary
    const b = this.boidsController.getBoundary();
    const geometry = new THREE.BoxGeometry(b[0], b[1], b[2]);
    const wireframe = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(wireframe);
    line.material.color = new THREE.Color(0x000000);
    line.material.transparent = false;
    line.position.x = b[0] / 2;
    line.position.y = b[1] / 2;
    line.position.z = b[2] / 2;
    this.scene.add(line);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // composer
    this.composer = new EffectComposer(this.renderer);

    // passes
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      2,
      0,
      0
    );
    this.composer.addPass(bloomPass);

    // event registering
    this.renderer.domElement.addEventListener(
      "mousemove",
      this.onMouseMove.bind(this)
    );

    this.updateCamera();
    this.render();
  }

  createGridVisual(subdivisionCount) {
    this.gridVisual = new THREE.Group();
    const b = this.boidsController.getBoundary();
    const maxLen = Math.max(b[0], b[1], b[2]);
    const len = maxLen / subdivisionCount;
    for (let x = 0; x < subdivisionCount; x++) {
      for (let y = 0; y < subdivisionCount; y++) {
        for (let z = 0; z < subdivisionCount; z++) {
          if (
            (x + 0.5) * len > b[0] ||
            (y + 0.5) * len > b[1] ||
            (z + 0.5) * len > b[2]
          ) {
            continue;
          }

          // create boundary wireframe
          const geometry = new THREE.BoxGeometry(len, len, len);
          const wireframe = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(wireframe);
          //line.material.depthTest = false;
          line.material.color = new THREE.Color(0x999999);
          line.material.transparent = false;
          line.position.x = len / 2 + x * len;
          line.position.y = len / 2 + y * len;
          line.position.z = len / 2 + z * len;
          //this.scene.add(line);
          this.gridVisual.add(line);
        }
      }
    }

    this.scene.add(this.gridVisual);
    this.gridVisual.visible = false;
  }

  touchStart(e) {
    const t = e.changedTouches[0];
    this.mouseX = t.pageX;
    this.mouseY = t.pageY;
    this.isDragging = true;
  }

  touchEnd(e) {
    this.isDragging = false;
  }

  touchMove(e) {
    if (!this.isDragging) {
      return;
    }

    e.preventDefault();

    const t = e.changedTouches[0];

    const dx = t.pageX - this.mouseX;
    const dy = t.pageY - this.mouseY;

    this.mouseX = t.pageX;
    this.mouseY = t.pageY;

    this.degX += dx;
    if (this.degX > 360) this.degX = 0;
    if (this.degX < 0) this.degX = 360;

    this.degY += dy / 3;
    this.degY = Math.max(0.1, this.degY);
    this.degY = Math.min(179.9, this.degY);

    this.updateCamera();
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.mouseX = e.offsetX;
    this.mouseY = e.offsetY;
  }

  onMouseMove(e) {
    if (!this.isDragging) {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      return;
    }

    const dx = e.offsetX - this.mouseX;
    const dy = e.offsetY - this.mouseY;

    this.mouseX = e.offsetX;
    this.mouseY = e.offsetY;

    this.degX += dx;
    if (this.degX > 360) this.degX = 0;
    if (this.degX < 0) this.degX = 360;

    this.degY += dy / 3;
    this.degY = Math.max(0.1, this.degY);
    this.degY = Math.min(179.9, this.degY);

    this.updateCamera();
  }

  onMouseUp(e) {
    this.isDragging = false;
  }

  onMouseWheel(e) {
    e.preventDefault();
    this.cameraRadius += e.deltaY * -1;
    this.cameraRadius = Math.max(1, this.cameraRadius);
    this.cameraRadius = Math.min(this.cameraMax, this.cameraRadius);
    this.updateCamera();
  }

  updateCamera() {
    let mx = 0,
      my = 0,
      mz = 0;
    const entities = this.boidsController.getFlockEntities();
    if (this.lockOn && entities.length > 0) {
      const mesh = entities[0].mesh;
      mx = mesh.position.x;
      my = mesh.position.y;
      mz = mesh.position.z;
    } else {
      const b = this.boidsController.getBoundary();
      mx = b[0] / 2;
      my = b[1] / 2;
      mz = b[2] / 2;
    }

    const degXPI = (this.degX * Math.PI) / 180;
    const degYPI = (this.degY * Math.PI) / 180;
    this.camera.position.x = mx;
    this.camera.position.z = mz * 2;
    this.camera.position.y = my;

    this.camera.lookAt(mx, my, mz);
  }

  render() {
    const entities = this.boidsController.getFlockEntities();
    entities.forEach((entity) => {
      const x = entity.x;
      const y = entity.y;
      const z = entity.z;
      const vx = entity.vx;
      const vy = entity.vy;
      const vz = entity.vz;
      if (!entity.isAddedToScene) {
        this.scene.add(entity.group);
        entity.isAddedToScene = true;
      }

      // apply asymptotic smoothing
      entity.localVelocity.x = 0.9 * entity.localVelocity.x + 0.1 * vx;
      entity.localVelocity.y = 0.9 * entity.localVelocity.y + 0.1 * vy;
      entity.localVelocity.z = 0.9 * entity.localVelocity.z + 0.1 * vz;

      entity.group.position.set(
        0.9 * entity.group.position.x + 0.1 * x,
        0.9 * entity.group.position.y + 0.1 * y,
        0.9 * entity.group.position.z + 0.1 * z
      );

      entity.group.lookAt(
        entity.group.position.x + entity.localVelocity.x,
        entity.group.position.y + entity.localVelocity.y,
        entity.group.position.z + entity.localVelocity.z
      );
    });

    const obstacles = this.boidsController.getObstacleEntities();
    obstacles.forEach((entity) => {
      const x = entity.x;
      const y = entity.y;
      const z = entity.z;
      let mesh = entity.mesh;
      if (!mesh) {
        mesh = new THREE.Mesh(this.obstacleGeometry, this.obstacleMaterial);
        this.scene.add(mesh);
        entity.mesh = mesh;
      }

      mesh.position.x = x;
      mesh.position.y = y;
      mesh.position.z = z;
    });

    if (this.lockOn && entities.length > 0) {
      this.updateCamera();
    }

    this.composer.render();
  }
}
