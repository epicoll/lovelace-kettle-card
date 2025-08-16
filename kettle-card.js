// == SHARED MODULES (LitElement, html, css) ==
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

// == MAIN CARD CLASS ==
class KettleCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  static get styles() {
    return css`
      .arc-container {
        position: relative;
        width: 300px;
        height: 225px; /* Увеличено на 1.5x */
        margin: 20px auto;
        overflow: hidden;
        border-radius: 50%; /* Закругление */
      }

      .arc-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 200%;
        border-radius: 50%;
        border: 20px solid #e0e0e0; /* Серый цвет дуги */
        box-sizing: border-box;
        border-top-color: transparent;
        border-bottom-color: transparent;
        transform: rotate(45deg);
      }

      .temp-display {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: #333;
      }
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const currentTemp = this.hass.states[this.config.entity]?.state || "--";
    
    return html`
      <ha-card>
        <div class="arc-container">
          <div class="arc-bg"></div>
          <div class="temp-display">${currentTemp}°C</div>
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