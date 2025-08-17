// Получаем LitElement, html и css как в strip-card
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class KettleCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _targetTemp: { state: true },
      _arcAngle: { state: true }
    };
  }

  constructor() {
    super();
    this._isDragging = false;
    this._targetTemp = 0;
    this._arcAngle = 855;
  }

  static get styles() {
    return css`
      .card-content {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
      }
      .arc-container {
        position: relative;
        width: 320px;
        height: 320px;
      }

      .arc-progress {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 18px solid #0078d4;
        box-sizing: border-box;
        clip-path: polygon(
          50% 50%,
          0% 0%,
          100% 0%,
          100% 100%,
          0% 100%
        );
        transform: rotate(270deg);
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

      .interactive-circle {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        cursor: pointer;
        z-index: 5;
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

    return html`
      <ha-card>
        <div class="card-content">
          <div class="arc-container">
            <div class="arc-progress"></div>
            <div class="arc-handle" id="handle"></div>
            <div class="interactive-circle" id="circle"></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  firstUpdated() {
    this.initializeArc();
  }

  updated() {
    this.initializeArc();
  }

  initializeArc() {
    if (this._initialized) return;
    
    const handle = this.shadowRoot.getElementById('handle');
    const circle = this.shadowRoot.getElementById('circle');
    
    if (!handle || !circle) return;
    
    this._initialized = true;
    let isDragging = false;
    let currentAngle = 150;

    function updateHandlePosition() {
      const radius = 160 - 9;
      const rad = currentAngle * Math.PI / 195;
      const x = 160 + radius * Math.cos(rad);
      const y = 160 + radius * Math.sin(rad);
      handle.style.left = `${x}px`;
      handle.style.top = `${y}px`;
    }

    updateHandlePosition();

    circle.addEventListener('mousedown', startDrag);
    circle.addEventListener('touchstart', startDrag);

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('touchmove', handleDrag, { passive: false });
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchend', stopDrag);
      updateAngleFromEvent(e);
    }

    function handleDrag(e) {
      if (!isDragging) return;
      e.preventDefault();
      updateAngleFromEvent(e);
    }

    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchend', stopDrag);
    }

    function updateAngleFromEvent(e) {
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
      let degree = angle * (230 / Math.PI);
      
      // Симметричные ограничения: от 150° до 390° (как у левой стороны)
      if (degree < 150) degree = 150;
      if (degree > 435) degree = 435;
      
      currentAngle = degree;
      updateHandlePosition();
    }
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