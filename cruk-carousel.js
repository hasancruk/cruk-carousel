const createDotTemplate = (imageId) => {
  const template = document.createElement("template");
  template.innerHTML = `
    <label for="image-${imageId}"></label>
    <input type="radio" id="image-${imageId}" value="image-${imageId}" name="scroll-to-image" />
  `;

  return template;
};

class Carousel extends HTMLElement {
  static tagName = "cruk-carousel";
  static css = `
    :host {
      --image-width: 85vw;
      --gap: 1rem;
      --container-width: 60%;
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
      max-width: var(--container-width);
      margin: 0 auto;

      display: flex;
      gap: var(--gap);
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
    }

    #controls > svg {
      width: 25px;
      display: block;
    }

    #controls {
      max-width: fit-content;
      display: flex;
      margin: 0 auto;
      padding-block: 1rem;
    }
  `;

  #children;

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
        <div id="controls">
          <!-- https://heroicons.com/ -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <div id="dots"></div>
          <!-- https://heroicons.com/ -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    `;

    shadowRoot.appendChild(template.content.cloneNode(true));
    
    const slot = shadowRoot.querySelector("slot");
    this.#children = slot.assignedElements();
    this.#children.forEach((node, i) => {
      node.setAttribute("data-image", `image-${i.toString()}`);  
    });

    const countSpan = shadowRoot.querySelector("#count");
    const dotsContainer = shadowRoot.querySelector("#dots");
    this.#children.forEach((_, i) => {
      dotsContainer.appendChild(createDotTemplate(i).content.cloneNode(true));
    });

    const content = shadowRoot.querySelector("#content");

    // Listen scroll event ending. This works correctly because scroll snapping is enabled.
    content.addEventListener("scrollend", (_) => {
      const currentFocus = this.#children.find((node) => node.getBoundingClientRect().x > 0);
      const imageId = currentFocus.getAttribute("data-image");
      const input = shadowRoot.querySelector(`#${imageId}`);

      if (input && !input.checked) {
        input.checked = true;
      }
    });

    const dots = shadowRoot.querySelectorAll("input[type='radio'][name='scroll-to-image']");
    dots.forEach((dot) => {
      dot.addEventListener("change", (e) => {
        const image = this.#children.find((node) => node.getAttribute("data-image") === e.target.value);

        if (image) {
          image.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    countSpan.textContent = this.#children.length.toString();
  }
}

if ("customElements" in window) {
  customElements.define(Carousel.tagName, Carousel);
}
