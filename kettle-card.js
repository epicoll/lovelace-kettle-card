(() => {
  // Попытка получить LitElement из разных источников
  const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("hui-view"));

  // Попытка получить html и css
  const html = window.LitHtml || (LitElement && LitElement.prototype.html) || (() => '');
  const css = window.LitCss || (LitElement && LitElement.prototype.css) || (() => '');

  if (!LitElement) {
    return;
  }

  class KettleCard extends LitElement {
    static get properties() {
      return {
        hass: {},
        config: {}
      };
    }

    static get styles() {
      if (typeof css !== 'function') return null;
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
        }
        .power-button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 12px;
          background: var(--primary-color);
          color: white;
          font-size: 16px;
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
      const isOn = this.config.switch_entity ? 
        this.hass.states[this.config.switch_entity]?.state === 'on' : false;

      return html`
        <ha-card>
          <div class="card-content">
            <div class="card-header">
              <div class="name">${this.config.name || 'Чайник'}</div>
              <div class="temp">${currentTemp}°C</div>
            </div>

            ${this.config.modes ? html`
              <div class="modes">
                ${this.config.modes.map(mode => html`
                  <button class="mode-button" 
                          @click="${() => this.setTemperature(mode.temperature)}">
                    <ha-icon .icon="${mode.icon || 'mdi:kettle'}"></ha-icon>
                    <div>${mode.name}</div>
                  </button>
                `)}
              </div>
            ` : ''}

            <div class="temperature-control">
              <ha-slider
                min="40"
                max="100"
                step="1"
                .value="${currentTemp}"
                @change="${(e) => this.setTemperature(e.target.value)}"
                pin>
              </ha-slider>
              <div style="text-align: center;">Целевая: ${currentTemp}°C</div>
            </div>

            ${this.config.show_status !== false ? html`
              <div class="status">
                ${isOn ? 'Нагревается...' : 'Выключен'}
              </div>
            ` : ''}

            ${this.config.switch_entity ? html`
              <button class="power-button ${isOn ? 'off' : ''}" 
                      @click="${this.togglePower}">
                ${isOn ? 'Выключить' : 'Включить'}
              </button>
            ` : ''}
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

  // Класс редактора (только один раз!)
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
  } catch (error) {
    console.error('KettleCard: Error registering elements:', error);
  }
})();