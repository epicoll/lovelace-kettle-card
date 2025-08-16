// Получаем LitElement, html и css как в strip-card
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class KettleCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _targetTemp: { state: true }, // Локальное состояние
      _progress: { state: true }     // Прогресс дуги (0-1)
    };
  }

  constructor() {
    super();
    this._isDragging = false;
    this._targetTemp = 0;
    this._progress = 0; // По умолчанию дуга невидима
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
        width: 337.5px;
        height: 337.5px;
        margin: 0 auto;
        transform: rotate(0deg);
      }
      .circle-bg {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 33.75px solid var(--secondary-background-color);
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
      }
      .circle-progress {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 33.75px solid var(--primary-color);
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
        clip-path: polygon(50% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%);
        transform: rotate(210deg);
        transition: transform 0.1s ease-out;
      }
      .center-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-size: 72px;
        font-weight: bold;
        color: var(--primary-color);
      }
      .value {
        font-size: 72px;
        font-weight: bold;
      }
      .unit {
        font-size: 36px;
      }
      .controls {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 16px;
      }
      .control-button {
        width: 75px;
        height: 75px;
        border: 4.5px solid var(--primary-color);
        border-radius: 50%;
        background: transparent;
        color: var(--primary-color);
        font-size: 36px;
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
      const targetTemp = this.hass.states[this.config.entity]?.attributes.temperature || 95;
      if (this._targetTemp !== targetTemp) {
        this._targetTemp = targetTemp;
        // Обновляем прогресс при изменении температуры
        this._progress = 1;
      }
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const currentTemp = this.hass.states[this.config.entity]?.state || '--';
    const targetTemp = this._targetTemp;
    const minTemp = 40;
    const maxTemp = 100;
    const isOn = this.hass.states[this.config.switch_entity]?.state === 'on' || false;

    // Рассчитываем угол дуги
    const progress = Math.max(0, Math.min(1, (targetTemp - minTemp) / (maxTemp - minTemp)));
    const angle = 210 + progress * 120;

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
                style="transform: rotate(${210 + this._progress * 120}deg);"
              ></div>
              <div class="center-text">
                <div class="value">${targetTemp}</div>
                <div class="unit">°C</div>
              </div>
              <!-- Интерактивный круг -->
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
    this._progress = 0.2; // Начинаем с 20%

    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('touchmove', this.handleDrag, { passive: false });
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('touchend', this.stopDrag);

    this.updateProgressFromEvent(e);
  }

  handleDrag = (e) => {
    if (!this._isDragging) return;
    e.preventDefault();
    this.updateProgressFromEvent(e);
  };

  stopDrag = () => {
    this._isDragging = false;
    this._progress = 1; // После отпускания — полная дуга

    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('touchmove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchend', this.stopDrag);
  };

  updateProgressFromEvent(e) {
    const circle = e.currentTarget?.closest('.circle-container');
    if (!circle) return;

    let clientX, clientY;
    if (e.type.includes('touch')) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = circle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clickX = clientX - centerX;
    const clickY = clientY - centerY;

    let angle = Math.atan2(clickY, clickX);
    if (angle < 0) angle += 2 * Math.PI;
    let degree = angle * (180 / Math.PI);

    // Корректируем угол (от 210° до 330°)
    if (degree < 210) degree += 360;
    if (degree > 330) degree -= 360;
    degree = Math.max(210, Math.min(330, degree));

    // Преобразуем угол в прогресс (0-1)
    const progress = (degree - 210) / 120;
    this._progress = Math.max(0.2, Math.min(1, progress)); // Минимум 20%
  }

  setTemperature(temp) {
    if (!this.hass) return;
    
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

// Класс редактора
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

// Регистрация элементов
try {
  customElements.define('kettle-card', KettleCard);
  customElements.define('kettle-card-editor', KettleCardEditor);
  console.log('KettleCard: Elements registered successfully');
} catch (error) {
  console.error('KettleCard: Error registering elements:', error);
}