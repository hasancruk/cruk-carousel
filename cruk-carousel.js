const supported = "onscrollend" in window;

if (!supported) {
  await import("./scrollend-polyfill.js");
}

const createDotTemplate = (imageId) => {
  const template = document.createElement("template");
  template.innerHTML = `
    <li>
      <label for="image-${imageId}">
        <span class="sr-only">Scroll carousel to index ${imageId}</span>
      </label>
      <input type="radio" id="image-${imageId}" value="image-${imageId}" name="scroll-to-image" />
    </li>
  `;

  return template;
};

class Carousel extends HTMLElement {
  static tagName = "cruk-carousel";
  static css = `
    img, svg, video, picture {
      display: block;
      max-width: 100%;
    }

    .sr-only {
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      height: 1px;
      overflow: hidden;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    :host {
      --image-width: 85vw;
      --gap: 1rem;
      --arrow-size: 1.25em;
      --controls-color: #00007e;
      --controls-disabled-color: #e6e6e6;
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
      display: flex;
      gap: var(--gap);
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
    }

    #controls {
      max-width: fit-content;
      display: flex;
      margin: 0 auto;
      padding-block: 1rem;
    }

    #controls button {
      cursor: pointer;
      background-color: transparent;
      border: medium;
      padding: unset;
      transition: color 0.3s ease 0s, transform 0.3s ease 0s;
      transform: scale(0.8);
      vertical-align: center;
      font-size: 1.75rem;
    }

    #controls button:hover:enabled {
      transform: scale(1);
    }
    
    #controls button:disabled {
      cursor: not-allowed;
    }
    
    #controls svg {
      display: block;
      width: var(--arrow-size);
      stroke: var(--controls-color);
    }
    
    #controls button:disabled svg {
      stroke: var(--controls-disabled-color);
    }
    
    #dots {
      list-style: none;
      padding: unset;
      display: flex;
      gap: 1rem;
    }

    /* Styling inspired by Kevin Powell https://youtu.be/fyuao3G-2qg?si=Z4YJ5VrxXJx45Eik */
    #dots input[type="radio"] {
      appearance: none; 
      width: 1rem;
      height: 1rem;
      outline: 3px solid var(--controls-color, currentColor);
      outline-offset: 3px;
      border-radius: 50%;
      transition: color 0.3s ease 0s, transform 0.3s ease 0s;
      transform: scale(0.8);
    }

    #dots input[type="radio"]:hover {
      transform: scale(1);
    }

    #dots input[type="radio"]:checked {
      background-color: var(--controls-color);
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
          <button type="button" id="previous"> <!-- https://heroicons.com/ --> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span class="sr-only">
              Scroll carousel to previous index
            </span>
          </button>
          <ul id="dots"></ul>
          <button type="button" id="next">
            <!-- https://heroicons.com/ -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span class="sr-only">
              Scroll carousel to next index
            </span>
          </button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(template.content.cloneNode(true));
    
    const content = shadowRoot.querySelector("#content");
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

    /*
     * Resources:
     * - https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
     * - https://stackoverflow.com/questions/66852102/css-scroll-snap-get-active-item
     */
    const startImage = this.#children.find((node) => (node.getBoundingClientRect().left - content.getBoundingClientRect().left) >= 0);
    const startImageId = startImage.getAttribute("data-image");
    const startInput = shadowRoot.querySelector(`#${startImageId}`);

    if (startInput && !startInput.checked) {
      startInput.checked = true;
    }

    // Listen scroll event ending. This works correctly because scroll snapping is enabled.
    content.addEventListener("scrollend", (_) => {
      const currentFocus = this.#children.find((node) => (node.getBoundingClientRect().left - content.getBoundingClientRect().left) >= 0);
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
        image?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    countSpan.textContent = this.#children.length.toString();
  }
}

if ("customElements" in window) {
  customElements.define(Carousel.tagName, Carousel);
}
