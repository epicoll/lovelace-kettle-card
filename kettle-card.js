// Получаем LitElement, html и css как в strip-card
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class KettleCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  static get styles() {
    return css`
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .modes {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .mode-button {
        flex: 1;
        min-width: 70px;
        padding: 8px;
        border: none;
        border-radius: 12px;
        background: var(--secondary-background-color);
        cursor: pointer;
        font-size: 12px;
      }
      .mode-button.active {
        background: var(--primary-color);
        color: white;
      }
      .temperature-control {
        margin: 16px 0;
        text-align: center;
      }
      .power-button {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 12px;
        background: var(--primary-color);
        color: white;
        font-size: 18px;
        cursor: pointer;
      }
      .power-button.off {
        background: var(--error-color);
      }
      .status {
        text-align: center;
        margin: 8px 0;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .circle-container {
        position: relative;
        width: 225px; /* 150 * 1.5 */
        height: 225px; /* 150 * 1.5 */
        margin: 0 auto;
        transform: rotate(90deg); /* Поворот на 90° вправо */
      }
      .circle-bg {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 22.5px solid var(--secondary-background-color); /* 15 * 1.5 */
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
      }
      .circle-progress {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 22.5px solid var(--primary-color); /* 15 * 1.5 */
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
        clip-path: polygon(50% 50%, 50% 0%, 0% 0%, 0% 100%, 100% 100%);
        transform: rotate(90deg);
      }
      .center-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-size: 48px; /* 32 * 1.5 */
        font-weight: bold;
        color: var(--primary-color);
      }
      .value {
        font-size: 48px; /* 32 * 1.5 */
        font-weight: bold;
      }
      .unit {
        font-size: 24px; /* 16 * 1.5 */
      }
      .controls {
        display: flex;
        justify-content: center;
        gap: 36px;
        margin-top: 16px;
      }
      .control-button {
        width: 75px; /* 50 * 1.5 */
        height: 75px; /* 50 * 1.5 */
        border: 4.5px solid var(--primary-color); /* 3 * 1.5 */
        border-radius: 50%;
        background: transparent;
        color: var(--primary-color);
        font-size: 36px; /* 24 * 1.5 */
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .control-button:hover {
        background: var(--primary-color);
        color: white;
      }
      .mode-switch {
        width: 100%;
        padding: 24px;
        border: none;
        border-radius: 12px;
        background: var(--primary-color);
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-top: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mode-switch.off {
        background: var(--error-color);
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const currentTemp = this.hass.states[this.config.entity]?.state || '--';
    const targetTemp = this.hass.states[this.config.entity]?.attributes.temperature || 95;
    const isOn = this.hass.states[this.config.switch_entity]?.state === 'on' || false;

    // Рассчитываем прогресс для круга
    const progress = Math.min(targetTemp / 100, 1);

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
              <div class="circle-progress" style="transform: rotate(${progress * 360}deg);"></div>
              <div class="center-text">
                <div class="value">${targetTemp}</div>
                <div class="unit">°C</div>
              </div>
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