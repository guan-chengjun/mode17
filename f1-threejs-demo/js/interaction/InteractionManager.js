/**
 * 交互管理
 * - Raycaster 点击拾取部件（区分拖拽与点击）
 * - 选中高亮（emissive 脉冲）
 * - 点击目录/部件后镜头平滑聚焦
 * - 讲解卡片锚定到部件的 3D 锚点（跟随相机移动）
 */
import * as THREE from 'three';
import { PART_INFO } from '../data/parts.js';

export class InteractionManager {
  constructor(camera, domElement, descriptor, controls, infoCard) {
    this.camera = camera;
    this.dom = domElement;
    this.descriptor = descriptor;
    this.controls = controls;
    this.infoCard = infoCard; // { el, refs... } 由 Panel 传入 DOM 工具
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.selectedId = null;
    this.highlightMats = new Set();
    this._focus = null; // 相机动画状态

    this._downPos = null;

    this.dom.addEventListener('pointerdown', (e) => {
      this._downPos = { x: e.clientX, y: e.clientY };
    });
    this.dom.addEventListener('pointerup', (e) => {
      if (!this._downPos) return;
      const dx = e.clientX - this._downPos.x;
      const dy = e.clientY - this._downPos.y;
      this._downPos = null;
      if (dx * dx + dy * dy > 25) return; // 拖拽中，不视为点击
      this._handleClick(e);
    });
  }

  setCar(descriptor) {
    this.clearSelection();
    this.descriptor = descriptor;
  }

  _partFromObject(obj) {
    // 沿父链向上找带 partId 的对象
    let cur = obj;
    while (cur && cur !== this.descriptor.group) {
      if (cur.userData && cur.userData.partId) return cur.userData.partId;
      cur = cur.parent;
    }
    // 再查根节点反向表
    cur = obj;
    while (cur) {
      if (this.descriptor.rootsOf.has(cur)) return this.descriptor.rootsOf.get(cur);
      cur = cur.parent;
    }
    return null;
  }

  _handleClick(event) {
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.descriptor.group, true);
    if (!hits.length) {
      this.clearSelection();
      return;
    }
    const id = this._partFromObject(hits[0].object);
    if (id) this.selectPart(id);
  }

  selectPart(id) {
    if (!this.descriptor.registry.has(id)) id = 'generic';
    this.clearSelection();
    this.selectedId = id;

    // 高亮：给该部件所有材质加 emissive
    const entry = this.descriptor.registry.get(id);
    if (entry) {
      for (const root of entry.roots) {
        root.traverse((o) => {
          if (!o.isMesh) return;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (m && 'emissive' in m) {
              m.userData._baseEmissive = m.emissive.getHex();
              m.userData._baseIntensity = m.emissiveIntensity ?? 1;
              m.emissive.setHex(0xff5533);
              m.emissiveIntensity = 0.55;
              this.highlightMats.add(m);
            }
          }
        });
      }
    }

    this.infoCard.show(id);
    this.infoCard.onCatalog?.(id);
  }

  clearSelection() {
    for (const m of this.highlightMats) {
      m.emissive.setHex(m.userData._baseEmissive ?? 0x000000);
      m.emissiveIntensity = m.userData._baseIntensity ?? 1;
    }
    this.highlightMats.clear();
    this.selectedId = null;
    this.infoCard.hide();
    this.infoCard.onCatalog?.(null);
  }

  /** 镜头平滑聚焦到某部件 */
  focusPart(id) {
    const entry = this.descriptor.registry.get(id) || this.descriptor.registry.get('generic');
    if (!entry) return;

    const target = entry.anchor.clone();
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const dist = THREE.MathUtils.clamp(offset.length() * 0.55, 1.4, 3.2);
    const camPos = target.clone().add(offset.normalize().multiplyScalar(dist));

    this._focus = {
      t: 0,
      camFrom: this.camera.position.clone(),
      camTo: camPos,
      tgtFrom: this.controls.target.clone(),
      tgtTo: target,
    };
    this.controls.enabled = false;
  }

  resetCamera(defaultPos, defaultTarget) {
    this._focus = {
      t: 0,
      camFrom: this.camera.position.clone(),
      camTo: defaultPos.clone(),
      tgtFrom: this.controls.target.clone(),
      tgtTo: defaultTarget.clone(),
    };
    this.controls.enabled = false;
  }

  update(dt) {
    // 相机动画
    if (this._focus) {
      this._focus.t = Math.min(1, this._focus.t + dt * 1.8);
      const k = this._focus.t < 0.5
        ? 2 * this._focus.t * this._focus.t
        : 1 - Math.pow(-2 * this._focus.t + 2, 2) / 2;
      this.camera.position.lerpVectors(this._focus.camFrom, this._focus.camTo, k);
      this.controls.target.lerpVectors(this._focus.tgtFrom, this._focus.tgtTo, k);
      if (this._focus.t >= 1) {
        this._focus = null;
        this.controls.enabled = true;
      }
    }

    // 高亮呼吸 + 卡片跟随锚点
    if (this.selectedId) {
      const pulse = 0.45 + Math.sin(performance.now() * 0.005) * 0.2;
      for (const m of this.highlightMats) m.emissiveIntensity = pulse;

      const entry = this.descriptor.registry.get(this.selectedId);
      if (entry) this.infoCard.updateAnchor(entry.anchor, this.camera, this.dom);
    }
  }
}
