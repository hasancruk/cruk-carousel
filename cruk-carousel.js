class Carousel extends HTMLElement {
  static tagName = "cruk-carousel";
  static css = `
    :host {
      --image-width: 85vw;
      --gap: 1rem;
      --container-width: calc(var(--image-width) + 4rem);
    }
    
    @media (min-width: 576px) {
      :host {
        --image-width: 500px;
        --gap: 2.5rem;
      }
    }

    ::slotted(img) {
      width: var(--image-width);
      display: block;
      scroll-snap-align: center;
    }
    
    #content {
      // max-width: var(--container-width);

      display: flex;
      gap: var(--gap);
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
    }
  `;

  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: "open" });
    const template = document.createElement("template");

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(Carousel.css);
    shadowRoot.adoptedStyleSheets = [sheet];

    template.innerHTML = `
      <div>
        <p>Carousel: Images (<span id="count">0</span>)</p>
        <div id="content">
          <slot></slot>
        </div>
      </div>
    `;

    shadowRoot.appendChild(template.content.cloneNode(true));
    
    const slots = shadowRoot.querySelector("slot");
    const countSpan = shadowRoot.querySelector("#count");
    const count = slots.assignedElements().length;
    countSpan.textContent = count.toString();
  }
}

if ("customElements" in window) {
  customElements.define(Carousel.tagName, Carousel);
}
