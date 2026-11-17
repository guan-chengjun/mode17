/**
 * 视图模式管理：solid（实体）/ xray（透视）/ exploded（剖切爆炸）
 * - 透视：外壳材质切换为半透明，内部结构可见
 * - 爆炸：各部件根节点沿预计算方向分离（同时自动开启半透明）
 * - 每帧调用 update() 做平滑插值过渡
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class ViewManager {
  constructor() {
    this.mode = 'solid';
    this.descriptor = null;
    this.t = 1; // 过渡进度 0~1

    this._states = new Map(); // root -> { basePos, current, target, dir }
    this._materialCache = new Map(); // material -> 原始参数快照
  }

  setCar(descriptor) {
    this.descriptor = descriptor;
    this.t = 1;
    this._states.clear();
    this._materialCache.clear();

    descriptor.group.updateMatrixWorld(true);
    for (const entry of descriptor.registry.values()) {
      for (const root of entry.roots) {
        this._states.set(root, {
          basePos: root.position.clone(),
          current: root.position.clone(),
          target: root.position.clone(),
          dir: root.userData.explodeDir || this._defaultDir(entry.anchor),
        });
      }
    }
    this.applyMode(this.mode, true);
  }

  _defaultDir(anchor) {
    // 程序化模型没有预计算方向时，按部件在整车中的位置推导
    const d = anchor.clone();
    d.y = Math.max(d.y, 0.5);
    if (d.lengthSq() < 0.04) d.set(0, 1, 0);
    return d.normalize();
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.applyMode(mode, false);
  }

  applyMode(mode, instant) {
    const d = this.descriptor;
    if (!d) return;

    const exploded = mode === 'exploded';
    const transparent = mode === 'xray' || exploded;

    /* 1. 材质：外壳半透明 */
    for (const mat of d.bodyMaterials) {
      if (!this._materialCache.has(mat)) {
        this._materialCache.set(mat, {
          transparent: mat.transparent,
          opacity: mat.opacity,
          depthWrite: mat.depthWrite,
        });
      }
      const snap = this._materialCache.get(mat);
      if (transparent) {
        mat.transparent = true;
        mat.opacity = exploded ? 0.55 : CONFIG.xrayOpacity;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      } else {
        mat.transparent = snap.transparent;
        mat.opacity = snap.opacity;
        mat.depthWrite = snap.depthWrite;
        mat.needsUpdate = true;
      }
    }

    /* 2. 爆炸位移目标 */
    for (const [root, st] of this._states) {
      if (exploded) {
        st.target.copy(st.basePos).addScaledVector(st.dir, CONFIG.explodeDistance);
      } else {
        st.target.copy(st.basePos);
      }
      if (instant) {
        st.current.copy(st.target);
        root.position.copy(st.target);
      }
    }
    if (instant) this.t = 1; else this.t = 0;
  }

  /** 每帧平滑过渡 */
  update(dt) {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt * 2.6);
    const k = this._ease(this.t);
    for (const [root, st] of this._states) {
      st.current.lerpVectors(st.basePos, st.target, k);
      root.position.copy(st.current);
    }
  }

  _ease(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  /** 部件是否处于半透明模式（供高亮逻辑参考） */
  get isTransparent() {
    return this.mode !== 'solid';
  }
}
