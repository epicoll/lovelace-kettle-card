// == SHARED MODULES (LitElement, html, css) ==
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

// == MAIN CARD CLASS ==
class KettleCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _targetTemp: { state: true } // Локальное состояние
    };
  }

  constructor() {
    super();
    this._targetTemp = 0;
    this._isDragging = false;
  }

  static get styles() {
    return css`
      .arc-container {
        position: relative;
        width: 300px;
        height: 300px;
        margin: 20px auto;
      }

      /* === ДУГА (270°) === */
      .arc-bg,
      .arc-progress {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 12px solid;
        box-sizing: border-box;
        /* Обрезаем нижнюю часть (90° снизу) */
        clip-path: polygon(
          50% 50%,    /* Центр */
          0% 0%,      /* Левый верхний угол */
          100% 0%,    /* Правый верхний угол */
          100% 100%,  /* Правый нижний угол */
          0% 100%     /* Левый нижний угол */
        );
        transform: rotate(135deg); /* Начало дуги (270° = 360° - 90°) */
      }

      .arc-bg {
        border-color: #e0e0e0; /* Серый фон */
      }

      .arc-progress {
        border-color: #0000ff; /* Начальный цвет (синий) */
        transition: transform 0.3s ease-out, border-color 0.3s ease-out;
      }

      /* === ТОЧКА-ИНДИКАТОР === */
      .arc-handle {
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        border: 2px solid black;
        cursor: pointer;
        transform: translate(-50%, -50%);
        z-index: 10;
        transition: transform 0.2s ease-out;
      }

      .arc-handle:hover {
        transform: translate(-50%, -50%) scale(1.2);
      }

      /* === ТЕМПЕРАТУРА В ЦЕНТРЕ === */
      .temp-display {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: black;
        z-index: 5;
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = config;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('hass') && this.hass && this.config) {
      const targetTemp = this.hass.states[this.config.entity]?.attributes.temperature || 95;
      if (this._targetTemp !== targetTemp) {
        this._targetTemp = targetTemp;
      }
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const targetTemp = this._targetTemp;
    const minTemp = 40;
    const maxTemp = 100;

    // Рассчитываем прогресс (0-1)
    const progress = Math.max(0, Math.min(1, (targetTemp - minTemp) / (maxTemp - minTemp)));

    // Рассчитываем угол дуги (270° = 0.75 * 360°)
    const angle = 135 + progress * 270;

    // Рассчитываем цвет (от синего к красному)
    const color = this._getColorForTemp(targetTemp, minTemp, maxTemp);

    // Рассчитываем позицию точки
    const handlePosition = this._getHandlePosition(progress);

    return html`
      <ha-card>
        <div class="arc-container">
          <!-- Серый фон дуги -->
          <div class="arc-bg"></div>
          <!-- Цветная дуга -->
          <div 
            class="arc-progress" 
            style="transform: rotate(${angle}deg); border-color: ${color};"
          ></div>
          <!-- Точка-индикатор -->
          <div 
            class="arc-handle"
            style="left: ${handlePosition.x}px; top: ${handlePosition.y}px;"
            @mousedown="${this.startDrag}"
            @touchstart="${this.startDrag}"
          ></div>
          <!-- Температура в центре -->
          <div class="temp-display">${targetTemp}°C</div>
        </div>
      </ha-card>
    `;
  }

  // Получаем цвет для температуры (от синего к красному)
  _getColorForTemp(temp, minTemp, maxTemp) {
    const normalized = (temp - minTemp) / (maxTemp - minTemp);
    const r = Math.round(255 * normalized);
    const g = 0;
    const b = Math.round(255 * (1 - normalized));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Получаем позицию точки по прогрессу
  _getHandlePosition(progress) {
    const radius = 150 - 6; // 150px = радиус, 6px = половина толщины дуги
    const angle = 135 + progress * 270; // 135° = начальный угол
    const rad = angle * Math.PI / 180;
    const x = 150 + radius * Math.cos(rad);
    const y = 150 + radius * Math.sin(rad);
    return { x, y };
  }

  startDrag = (e) => {
    e.preventDefault();
    this._isDragging = true;

    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('touchmove', this.handleDrag, { passive: false });
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('touchend', this.stopDrag);

    this.updateTemperatureFromEvent(e);
  }

  handleDrag = (e) => {
    if (!this._isDragging) return;
    e.preventDefault();
    this.updateTemperatureFromEvent(e);
  };

  stopDrag = () => {
    this._isDragging = false;

    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('touchmove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchend', this.stopDrag);
  };

  updateTemperatureFromEvent(e) {
    const container = this.shadowRoot.querySelector('.arc-container');
    if (!container) return;

    let clientX, clientY;
    if (e.type.includes('touch')) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clickX = clientX - centerX;
    const clickY = clientY - centerY;

    // Рассчитываем угол (в радианах)
    let angle = Math.atan2(clickY, clickX);

    // Преобразуем угол в диапазон [0, 2π]
    if (angle < 0) {
      angle += 2 * Math.PI;
    }

    // Преобразуем угол в градусы
    let degree = angle * (180 / Math.PI);

    // Корректируем угол (от 135° до 405°)
    if (degree < 135) degree += 360;
    if (degree > 405) degree -= 360;

    // Ограничиваем диапазон
    degree = Math.max(135, Math.min(405, degree));

    // Преобразуем угол в температуру
    const minTemp = 40;
    const maxTemp = 100;
    const tempRange = maxTemp - minTemp;
    const angleRange = 270; // 405° - 135° = 270°
    const temp = Math.round(minTemp + ((degree - 135) / angleRange) * tempRange);

    this._targetTemp = temp;
    this.setTemperature(temp);
  }

  setTemperature(temp) {
    if (!this.hass) return;

    this.hass.callService('water_heater', 'set_temperature', {
      entity_id: this.config.entity,
      temperature: temp
    });
  }

  static getConfigElement() {
    return document.createElement("kettle-card-editor");
  }
}

// == EDITOR CLASS ==
class KettleCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    return html`
      <div>
        <paper-input
          label="Entity (температура)"
          .value="${this.config.entity}"
          @value-changed="${(e) => this.configChanged(e, 'entity')}">
        </paper-input>
      </div>
    `;
  }

  configChanged(ev, key) {
    const newConfig = { ...this.config };
    newConfig[key] = ev.detail.value;
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

// == REGISTER ELEMENTS ==
customElements.define("kettle-card", KettleCard);
customElements.define("kettle-card-editor", KettleCardEditor);

console.info("KettleCard: Elements registered");