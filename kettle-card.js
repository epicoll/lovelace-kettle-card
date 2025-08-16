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
        height: 150px; /* Полукруг */
        margin: 20px auto;
        overflow: hidden; /* Скрываем нижнюю часть круга */
      }

      .arc-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 200%; /* Делаем полный круг, но показываем только верхнюю половину */
        border-radius: 50%;
        border: 20px solid #e0e0e0; /* Серый цвет дуги */
        box-sizing: border-box;

        /* Делаем прозрачными верхнюю и нижнюю части, оставляя боковые */
        border-top-color: transparent;
        border-bottom-color: transparent;
      }

      .arc-left {
        /* Поворачиваем левую дугу */
        transform: rotate(45deg); /* Начинаем с 45 градусов (левая сторона) */
      }

      .arc-right {
        /* Поворачиваем правую дугу */
        transform: rotate(-45deg); /* Начинаем с -45 градусов (правая сторона) */
        /* Накладываем поверх левой */
        z-index: 1;
      }

      .temp-display {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: #333;
        z-index: 2; /* Поверх дуг */
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
          <!-- Левая дуга -->
          <div class="arc-bg arc-left"></div>
          <!-- Правая дуга -->
          <div class="arc-bg arc-right"></div>
          <!-- Температура по центру -->
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