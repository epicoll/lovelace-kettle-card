(() => {
  // Получаем LitElement, html и css как в strip-card
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class KettleCard extends LitElement {
    static get properties() {
      return {
        hass: {},
        config: {},
        _targetTemp: { state: true } // Локальное состояние для анимации
      };
    }

    constructor() {
      super();
      this._isDragging = false;
      this._targetTemp = 0;
      this._circleElement = null;
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
          width: 320px;
          height: 320px;
          margin: 0 auto;
          transform: rotate(0deg);
        }
        .circle-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          /* Убираем серый фон */
          border: 18px solid transparent; 
          box-sizing: border-box;
        }
        .circle-progress {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          /* Синий цвет */
          border: 18px solid #0078d4; 
          box-sizing: border-box;
          /* Зафиксированная дуга */
          transform: rotate(210deg); 
          /* Длина дуги (от 210° до 330°) */
          stroke-dasharray: 176; 
          /* Смещение дуги */
          stroke-dashoffset: 0; 
          transition: stroke-dashoffset 0.3s ease-out, stroke 0.3s ease-out;
        }
        .arc-handle {
          position: absolute;
          top: 50%;
          left: 50%;
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
        .center-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          font-size: 48px;
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
          width: 48px;
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
        const targetTemp = this.hass.states[this.config.entity]?.attributes.temperature || 95;
        if (this._targetTemp !== targetTemp) {
          this._targetTemp = targetTemp;
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

      // Рассчитываем прогресс (0-1)
      const progress = Math.max(0, Math.min(1, (targetTemp - minTemp) / (maxTemp - minTemp)));

      // Рассчитываем смещение дуги (0-176)
      const offset = 176 - progress * 176;

      // Рассчитываем позицию ползунка
      const handlePosition = this._getHandlePosition(progress);

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
                  style="stroke-dashoffset: ${offset};"
                ></div>
                <div 
                  class="arc-handle"
                  style="left: ${handlePosition.x}px; top: ${handlePosition.y}px;"
                  @mousedown="${this.startDrag}"
                  @touchstart="${this.startDrag}"
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

    // Получаем позицию ползунка по прогрессу
    _getHandlePosition(progress) {
      const radius = 160 - 9; // 160px = радиус, 9px = половина толщины дуги
      const angle = 210 + progress * 120; // 210° - 330° = 120°
      const rad = angle * Math.PI / 180;
      const x = 160 + radius * Math.cos(rad);
      const y = 160 + radius * Math.sin(rad);
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
      if (!this._circleElement) return;

      let clientX, clientY;
      if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = this._circleElement.getBoundingClientRect();
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
      
      // Корректируем угол (от 210° до 330°)
      if (degree < 210) degree += 360;
      if (degree > 330) degree -= 360;
      
      // Ограничиваем диапазон
      degree = Math.max(210, Math.min(330, degree));
      
      // Преобразуем угол в температуру
      const minTemp = 40;
      const maxTemp = 100;
      const tempRange = maxTemp - minTemp;
      const angleRange = 120; // 330° - 210° = 120°
      const temp = Math.round(minTemp + ((degree - 210) / angleRange) * tempRange);

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
})();