/**
 * UI 控制面板
 * 负责所有 DOM 交互：视图模式、模拟启停、转速滑块、重置视角、
 * 部件清单目录、讲解悬浮卡片、模型来源切换、加载遮罩
 */
import { PART_INFO, PART_ORDER } from '../data/parts.js';

export class Panel {
  constructor(handlers) {
    this.h = handlers;
    this._catalogActive = null;

    this.el = {
      viewBtns: document.querySelectorAll('.seg-btn'),
      simToggle: document.getElementById('sim-toggle'),
      speedSlider: document.getElementById('speed-slider'),
      rpmValue: document.getElementById('rpm-value'),
      resetView: document.getElementById('reset-view'),
      partList: document.getElementById('part-list'),
      loading: document.getElementById('loading-overlay'),
      loadingText: document.getElementById('loading-text'),
      modelSelect: document.getElementById('model-select'),
      modelUrl: document.getElementById('model-url'),
      modelFile: document.getElementById('model-file'),
      reloadBtn: document.getElementById('reload-model'),
      info: document.getElementById('info-card'),
      infoTag: document.getElementById('info-tag'),
      infoTitle: document.getElementById('info-title'),
      infoRole: document.getElementById('info-role'),
      infoDesign: document.getElementById('info-design'),
      infoAero: document.getElementById('info-aero'),
      infoClose: document.getElementById('info-close'),
    };
    this._bind();
  }

  _bind() {
    // 视图模式
    this.el.viewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.el.viewBtns.forEach((b) => b.classList.toggle('active', b === btn));
        this.h.onViewMode?.(btn.dataset.mode);
      });
    });

    // 模拟启停
    this.el.simToggle.addEventListener('click', () => {
      const running = this.h.onToggleSim?.();
      this.setSimButton(running);
    });

    // 转速滑块
    this.el.speedSlider.addEventListener('input', () => {
      const v = Number(this.el.speedSlider.value) / 100;
      this.h.onSpeed?.(v);
      this._updateSliderFill();
    });
    this._updateSliderFill();

    // 重置视角
    this.el.resetView.addEventListener('click', () => this.h.onResetView?.());

    // 讲解卡片关闭
    this.el.infoClose.addEventListener('click', () => this.h.onCloseInfo?.());

    // 模型来源
    this.el.modelSelect.addEventListener('change', () => {
      const val = this.el.modelSelect.value;
      this.el.modelUrl.classList.toggle('hidden', val !== 'url');
      this.el.reloadBtn.classList.toggle('hidden', val !== 'url');
      this.el.modelFile.classList.toggle('hidden', val !== 'file');
      if (val === 'procedural') this.h.onLoadProcedural?.();
      if (val === 'file') this.el.modelFile.click();
    });
    this.el.modelFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.h.onLoadFile?.(file);
    });
    this.el.reloadBtn.addEventListener('click', () => {
      const url = this.el.modelUrl.value.trim();
      if (url) this.h.onLoadUrl?.(url);
    });
    this.el.modelUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.el.reloadBtn.click();
    });
  }

  /** 根据当前模型实际含有的部件生成目录 */
  buildCatalog(availableIds) {
    this.el.partList.innerHTML = '';
    const ids = PART_ORDER.filter((id) => availableIds.has(id));
    if (availableIds.has('generic') && !ids.includes('generic')) ids.push('generic');

    for (const id of ids) {
      const li = document.createElement('li');
      li.textContent = PART_INFO[id].label;
      li.dataset.id = id;
      li.addEventListener('click', () => {
        this.h.onFocusPart?.(id);
        this.h.onSelectPart?.(id);
      });
      this.el.partList.appendChild(li);
    }
  }

  setCatalogActive(id) {
    this._catalogActive = id;
    this.el.partList.querySelectorAll('li').forEach((li) => {
      li.classList.toggle('active', li.dataset.id === id);
    });
  }

  setSimButton(running) {
    this.el.simToggle.textContent = running ? '⏸ 停止模拟' : '▶ 启动模拟';
    this.el.simToggle.classList.toggle('running', running);
  }

  setRpm(rpm) {
    this.el.rpmValue.textContent = `${Math.round(rpm).toLocaleString()} RPM`;
  }

  setModeButton(mode) {
    this.el.viewBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  }

  /* ---------- 加载遮罩 ---------- */
  showLoading(text = '正在加载模型…') {
    this.el.loadingText.textContent = text;
    this.el.loading.classList.remove('hidden');
  }
  hideLoading() {
    this.el.loading.classList.add('hidden');
  }

  /* ---------- 讲解悬浮卡片 ---------- */
  show(id) {
    const info = PART_INFO[id] || PART_INFO.generic;
    this.el.infoTag.textContent = info.tag;
    this.el.infoTitle.textContent = info.label;
    this.el.infoRole.textContent = info.role;
    this.el.infoDesign.textContent = info.design;
    this.el.infoAero.textContent = info.aero;
    this.el.info.classList.remove('hidden');
  }

  hide() {
    this.el.info.classList.add('hidden');
  }

  /** 把卡片定位到 3D 锚点投影到屏幕的位置 */
  updateAnchor(worldPos, camera, dom) {
    const p = worldPos.clone().project(camera);
    const rect = dom.getBoundingClientRect();
    const x = (p.x * 0.5 + 0.5) * rect.width;
    const y = (-p.y * 0.5 + 0.5) * rect.height;

    const behind = p.z > 1;
    this.el.info.style.visibility = behind ? 'hidden' : 'visible';
    // 限制在视口内
    const clampedX = THREE_clamp(x, 180, rect.width - 180);
    const clampedY = THREE_clamp(y, 240, rect.height - 30);
    this.el.info.style.left = `${clampedX}px`;
    this.el.info.style.top = `${clampedY}px`;
  }

  /* 给 InteractionManager 调用的统一外观接口 */
  get infoCard() {
    return {
      show: (id) => this.show(id),
      hide: () => this.hide(),
      updateAnchor: (pos, cam, dom) => this.updateAnchor(pos, cam, dom),
      onCatalog: (id) => this.setCatalogActive(id),
    };
  }

  _updateSliderFill() {
    const v = this.el.speedSlider.value;
    this.el.speedSlider.style.background =
      `linear-gradient(90deg, var(--accent) ${v}%, #2a3140 ${v}%)`;
  }
}

function THREE_clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
