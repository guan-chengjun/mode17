/**
 * F1 运转模拟引擎
 * 统一由“转速”驱动，所有机构按机械传动比联动：
 *   车轮 / 刹车盘  → 轮速（与车速对应）
 *   传动轴         → 按主减速比快转
 *   曲轴 / 活塞    → 引擎转速，活塞做正弦往复
 *   变速箱齿轮     → 各挡齿比
 *   悬挂           → 随转速产生细微上下振动（模拟路感）
 */
import * as THREE from 'three';

const IDLE_RPM = 1200;
const MAX_RPM = 15000;

export class Simulation {
  constructor() {
    this.running = false;
    this.speed01 = 0.35;      // 滑块 0~1
    this.rpm = IDLE_RPM;
    this._angle = 0;          // 累计机械角
    this._desc = null;
  }

  setCar(descriptor) {
    this._desc = descriptor;
  }

  toggle() {
    this.running = !this.running;
    return this.running;
  }

  stop() {
    this.running = false;
  }

  setSpeed(v) {
    this.speed01 = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** 滑块值 → 模拟转速 */
  get targetRpm() {
    return IDLE_RPM + this.speed01 * (MAX_RPM - IDLE_RPM);
  }

  update(dt) {
    if (!this._desc) return;

    // 转速平滑跟随滑块，停止时回到怠速
    const target = this.running ? this.targetRpm : IDLE_RPM;
    this.rpm += (target - this.rpm) * Math.min(1, dt * 3);

    const refs = this._desc.animRefs;

    if (this.running) {
      // 引擎角速度（rad/s）：RPM/60*2π，再乘一个演示加速因子让动作更明显
      const engineOmega = (this.rpm / 60) * Math.PI * 2 * 0.25;
      this._angle += engineOmega * dt;
      const a = this._angle;

      // 车轮：轮速 = 引擎转速 / 主减速比（演示用 9:1）
      const wheelSpin = a / 9;
      for (const w of refs.wheels) w.rotation.z = -wheelSpin;

      // 刹车盘随车轮同步
      for (const b of refs.brakes) {
        if (b.isMesh) b.rotation.z = -wheelSpin;
        else b.rotation.z = -wheelSpin;
      }

      // 曲轴
      if (refs.crankshaft) refs.crankshaft.rotation.z = a;

      // 活塞往复：沿各自气缸轴线做正弦运动，相位错开模拟点火顺序
      for (const p of refs.pistons) {
        const stroke = Math.sin(a + p.phase) * 0.075;
        p.mesh.position.copy(p.base).addScaledVector(p.axis, stroke);
      }

      // 传动轴（按各自轴线旋转）
      refs.driveshafts.forEach((ref, i) => {
        const item = ref.isMesh ? { mesh: ref, axis: 'x' } : ref;
        const ratio = i === 0 ? 1.6 : 1.2;
        item.mesh.rotation[item.axis || 'x'] = -a * ratio;
      });

      // 变速箱齿轮（按齿比反向，支持不同旋转轴）
      for (const g of refs.gears) {
        g.mesh.rotation[g.axis || 'z'] = -a / g.ratio;
      }

      // 悬挂路感：细微高频振动
      for (const s of refs.suspension) {
        s.object.position.y = s.baseY + Math.sin(a * 2.2 + s.phase) * 0.012;
      }
    } else {
      // 停止：悬挂回位，活塞回中
      for (const s of refs.suspension) {
        s.object.position.y += (s.baseY - s.object.position.y) * Math.min(1, dt * 6);
      }
      // 活塞回中
      for (const p of refs.pistons) {
        p.mesh.position.copy(p.base);
      }
    }
  }
}
