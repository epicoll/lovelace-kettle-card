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

  static get styles() {
    return css`
      .arc-container {
        position: relative;
        width: 300px;
        height: 300px;
        margin: 20px auto;
      }

      .arc-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 12px solid #e0e0e0; /* Серый фон */
        box-sizing: border-box;
        /* Обрезаем нижнюю часть (90° снизу) */
        clip-path: polygon(
          50% 50%,    /* Центр */
          100% 100%,      /* Левый верхний угол */
          100% 100%,    /* Правый верхний угол */
          50% 0%,  /* Правый нижний угол */
          50% 0%     /* Левый нижний угол */
        );
        transform: rotate(135deg); /* Начало дуги (270° = 360° - 90°) */
      }

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