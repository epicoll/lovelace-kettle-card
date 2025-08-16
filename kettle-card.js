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
  }

  static get styles() {
    return css`
      .arc-container {
        position: relative;
        width: 300px;
        height: 150px;
        margin: 20px auto;
        overflow: hidden;
      }

      /* === НОВАЯ ДУГА ИЗ ТЕРМОСТАТА === */
      .arc-bg {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 20px solid var(--secondary-background-color);
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
      }
      .arc-progress {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 20px solid var(--primary-color);
        box-sizing: border-box;
        position: absolute;
        top: 0;
        left: 0;
        clip-path: polygon(50% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%);
        transform: rotate(0deg);
        transition: transform 0.3s ease-out;
      }
      /* === КОНЕЦ НОВОЙ ДУГИ === */

      .temp-display {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: var(--primary-text-color);
        z-index: 2;
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
    // Обновляем _targetTemp при изменении hass
    if (changedProperties.has('hass') && this.hass && this.config) {
      const targetTemp = this.hass.states[this.config.entity]?.attributes.temperature || 95;
      if (this._targetTemp !== targetTemp) {
        this._targetTemp = targetTemp;
      }
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const currentTemp = this.hass.states[this.config.entity]?.state || "--";
    const targetTemp = this._targetTemp; // Используем локальное состояние
    const minTemp = 40;
    const maxTemp = 100;

    // Рассчитываем прогресс для круга (0-1)
    const progress = Math.max(0, Math.min(1, (targetTemp - minTemp) / (maxTemp - minTemp)));

    // Рассчитываем угол дуги (от 0° до 180°)
    const angle = progress * 180;

    return html`
      <ha-card>
        <div class="arc-container">
          <div class="arc-bg"></div>
          <div class="arc-progress" style="transform: rotate(${angle}deg);"></div>
          <div class="temp-display">${targetTemp}°C</div>
        </div>
      </ha-card>
    `;
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