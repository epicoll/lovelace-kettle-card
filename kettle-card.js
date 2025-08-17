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
      _targetTemp: { state: true }, // Локальное состояние для анимации
      _arcAngle: { state: true }     // Угол дуги
    };
  }

  constructor() {
    super();
    this._isDragging = false;
    this._targetTemp = 40; // Начальная температура 40°C
    this._arcAngle = 0;   // Начальный угол 0°
  }

  static get styles() {
    return css`
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .temperature-control {
        margin: 16px 0;
        text-align: center;
      }
      .mode-switch {
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        font-size: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 16px auto 0;
      }
      .mode-switch.off {
        background: var(--error-color);
      }
      .circle-container {
        position: relative;
        width: 320px; /* Ширина как на скриншотах */
        height: 320px; /* Высота как на скриншотах */
        margin: 0 auto;
      }
      .circle-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        /* Серый фон как на скриншотах */
        border: 18px solid #e0e0e0; 
        box-sizing: border-box;
        /* Обрезаем нижнюю часть (90° снизу) */
        clip-path: polygon(
          50% 50%,    /* Центр */
          10% 0%,     /* Левый верхний угол */
          90% 0%,     /* Правый верхний угол */
          90% 100%,   /* Правый нижний угол */
          10% 100%    /* Левый нижний угол */
        );
      }
      .circle-progress {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        /* Синий цвет как на скриншотах */
        border: 18px solid #0078d4; 
        box-sizing: border-box;
        /* Обрезаем нижнюю часть (90° снизу) */
        clip-path: polygon(
          50% 50%,    /* Центр */
          10% 0%,     /* Левый верхний угол */
          90% 0%,     /* Правый верхний угол */
          90% 100%,   /* Правый нижний угол */
          10% 100%    /* Левый нижний угол */
        );
        transform: rotate(0deg);
        transition: transform 0.1s ease-out;
      }
      .center-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-size: 48px; /* Размер шрифта как на скриншотах */
        font-weight: bold;
        color: var(--primary-color);
      }
      .value {
        font-size: 72px; /* Значение температуры крупнее */
        font-weight: bold;
      }
      .unit {
        font-size: 36px; /* Единицы измерения поменьше */
      }
      .controls {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 16px;
      }
      .control-button {
        width: 48px; /* Размер кнопок как на скриншотах */
        height: 48px;
        border: 1px solid var(--primary-color);
        border-radius: 50%;
        background: transparent;
        color: var(--primary-color);
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .control-button:hover {
        background: var(--primary-color);
        color: white;
      }
      .interactive-circle {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        cursor: pointer;
        z-index: 10;
        touch-action: none;
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this.config = config;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('hass') && this.hass && this.config) {
      const targetTemp = this.hass.states[this.config.entity]?.attributes.temperature || 40;
      if (this._targetTemp !== targetTemp) {
        this._targetTemp = targetTemp;
        // Обновляем угол дуги при изменении температуры
        this._arcAngle = ((targetTemp - 40) / 60) * 270; // 270° = 360° - 90°
      }
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const currentTemp = this.hass.states[this.config.entity]?.state || '--';
    const targetTemp = this._targetTemp;
    const isOn = this.hass.states[this.config.switch_entity]?.state === 'on' || false;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-header">
            <div class="name">${this.config.name || 'Чайник'}</div>
            <div class="temp">${currentTemp}°C</div>
          </div>

          <div class="temperature-control">
            <div class="circle-container">
              <div class="circle-bg"></div>
              <div 
                class="circle-progress" 
                style="transform: rotate(${this._arcAngle}deg);"
              ></div>
              <div class="center-text">
                <div class="value">${targetTemp}</div>
                <div class="unit">°C</div>
              </div>
              <!-- Интерактивный круг для регулировки температуры -->
              <div 
                class="interactive-circle"
                @mousedown="${this.startDrag}"
                @touchstart="${this.startDrag}"
              ></div>
            </div>

            <div class="controls">
              <button class="control-button" @click="${() => this.setTemperature(targetTemp - 1)}">−</button>
              <button class="control-button" @click="${() => this.setTemperature(targetTemp + 1)}">+</button>
            </div>

            ${this.config.switch_entity ? html`
              <button class="mode-switch ${isOn ? 'off' : ''}" 
                      @click="${this.togglePower}">
                ${isOn ? 'Выключить' : 'Включить'}
              </button>
            ` : ''}
          </div>
        </div>
      </ha-card>
    `;
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
    const container = this.shadowRoot.querySelector('.circle-container');
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
    
    // Корректируем угол (от 0° до 270°)
    if (degree < 0) degree += 360;
    if (degree > 270) degree -= 360;
    
    // Ограничиваем диапазон
    degree = Math.max(0, Math.min(270, degree));
    
    // Преобразуем угол в температуру
    const minTemp = 40;
    const maxTemp = 100;
    const tempRange = maxTemp - minTemp;
    const angleRange = 270; // 270° = 360° - 90°
    const temp = Math.round(minTemp + (degree / angleRange) * tempRange);

    this._targetTemp = temp;
    this.setTemperature(temp);
  }

  setTemperature(temp) {
    if (!this.hass) return;
    
    // Ограничиваем температуру
    const minTemp = 40;
    const maxTemp = 100;
    temp = Math.max(minTemp, Math.min(maxTemp, temp));
    
    this.hass.callService('water_heater', 'set_temperature', {
      entity_id: this.config.entity,
      temperature: temp
    });
  }

  togglePower() {
    if (!this.hass || !this.config.switch_entity) return;
    
    const service = this.hass.states[this.config.switch_entity]?.state === 'on' 
      ? 'turn_off' : 'turn_on';
    
    this.hass.callService('switch', service, {
      entity_id: this.config.switch_entity
    });
  }

  static getConfigElement() {
    return document.createElement('kettle-card-editor');
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
      <div class="card-config">
        <paper-input
          label="Entity (температура)"
          .value="${this.config.entity}"
          @value-changed="${(e) => this.configChanged(e, 'entity')}">
        </paper-input>
        <paper-input
          label="Switch Entity (включение)"
          .value="${this.config.switch_entity}"
          @value-changed="${(e) => this.configChanged(e, 'switch_entity')}">
        </paper-input>
        <paper-input
          label="Name"
          .value="${this.config.name}"
          @value-changed="${(e) => this.configChanged(e, 'name')}">
        </paper-input>
      </div>
    `;
  }

  configChanged(ev, key) {
    const newConfig = { ...this.config };
    newConfig[key] = ev.detail.value;
    const event = new CustomEvent('config-changed', {
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