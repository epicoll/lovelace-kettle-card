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
        <div class="card-content">
          <h2>Чайник</h2>
          <p>Температура: ${currentTemp}°C</p>
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

console.info("KettleCard: Elements registered");// == SHARED MODULES (LitElement, html, css) ==
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
        <div class="card-content">
          <h2>Чайник</h2>
          <p>Температура: ${currentTemp}°C</p>
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