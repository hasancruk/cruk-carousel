const supported = "onscrollend" in window;

if (!supported) {
  await import("./scrollend-polyfill.js");
}

class Carousel extends HTMLElement {
  static tagName = "cruk-carousel";
  static attrs = {
    startPosition: "start-position",
  };

  static css = `
    img, svg, video, picture, ::slotted(img), ::slotted(svg), ::slotted(video), ::slotted(picture) {
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
      --_carousel__image-width: 85vw;
      --_carousel__gap: 1rem;
      --_carousel__arrow-size: 1.25em;

      --_carousel__controls-color: var(--cruk-carousel__controls-color, #00007e);
      --_carousel__controls-disabled-color: var(--cruk-carousel__controls-disabled-color, #e6e6e6);
    }
    
    @media (min-width: 576px) {
      :host {
        --_carousel__image-width: 500px;
        --_carousel__gap: 2.5rem;
      }
    }

    ::slotted(img) {
      width: var(--_carousel__image-width);
      display: block;
      scroll-snap-align: center;
    }
    
    #content {
      display: flex;
      gap: var(--_carousel__gap);
      overflow-x: scroll;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
    }

    #controls {
      max-width: fit-content;
      display: flex;
      margin: 0 auto;
      padding-block: 1rem;
      touch-action: none;
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
    
    #controls svg, #controls ::slotted(svg) {
      display: block;
      width: var(--_carousel__arrow-size);
      stroke: var(--_carousel__controls-color);
    }
    
    #controls button:disabled svg, #controls button:disabled ::slotted(svg) {
      stroke: var(--_carousel__controls-disabled-color);
    }
    
    #dots {
      list-style: none;
      padding: unset;
      display: flex;
      gap: 2rem;
      padding-inline: 1rem;
    }

    /* Styling inspired by Kevin Powell https://youtu.be/fyuao3G-2qg?si=Z4YJ5VrxXJx45Eik */
    #dots input[type="radio"] {
      appearance: none; 
      cursor: pointer;
      width: 0.8rem;
      height: 0.8rem;
      outline: 3px solid var(--_carousel__controls-color);
      outline-offset: 3px;
      border-radius: 50%;
      transition: color 0.3s ease 0s, transform 0.3s ease 0s;
    }

    #dots input[type="radio"]:checked {
      background-color: var(--_carousel__controls-color);
    }
  `;

  /**
    * @param {number} imageId 
    * @returns {HTMLTemplateElement} template
    */
  static #createDotTemplate(imageId) {
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
  }
  
  /**
    * This is used to find the image element based on the dot that was clicked.
    *
    * @type {Map<string, Element> | undefined | null}
    * @private
    */
  #children;

  /**
    * This is used to find the image that is currently in view after a native scroll.
    *
    * @type {Array<Element> | undefined | null}
    * @private
    */
  #childrenNodes;

  /**
    * This is used to programmatically change the current index of the image. This is also used to check if the selected image is either the first or the last image so the buttons can be disabled.
    *
    * @type {Array<string>}
    * @private
    */
  #imageIds;

  /**
    * @type {string | undefined | null}
    * @private
    */
  #currentImage;
    
  /**
    * @type {Element | undefined | null}
    * @private
    */
  #previousButton;

  /**
    * @type {Element | undefined | null}
    * @private
    */
  #nextButton;

  /**
    * @type {Element | undefined | null}
    * @private
    */
  #content;

  #handleImageFocused;
  #handleScrollEnd;

  /**
    * @typedef {{ element: Element, handler: (e: Event) => void}} DotsHandler
    *
    * @type {Array<DotsHandler>}
    */
  #dotsHandlers;
  #handlePreviousButton;
  #handleNextButton;

  /**
    * @type {number | undefined | null}
    */
  #initializationTimer;
  
  constructor() {
    super();
    this.#imageIds = [];
    this.#dotsHandlers = [];
    this.#childrenNodes = [];
    this.#children = new Map();
  }

  get #imageInView() {
    return this.#currentImage;
  }

  /**
    * @param {string} imageId 
    * @param {string} imageId 
    * @returns {undefined}
    */
  #setImageInView(imageId, isNativeScroll = false) {
    this.#currentImage = imageId;
    this.dispatchEvent(new CustomEvent("image-focused", {
      detail: {
        imageId,
        isNativeScroll,
      }, 
    }));
  }

  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: "open" });
    const template = document.createElement("template");
    const startPosition = parseInt(this.getAttribute(Carousel.attrs.startPosition) || "0");

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(Carousel.css);
    shadowRoot.adoptedStyleSheets = [sheet];
    template.innerHTML = `
      <div>
        <div id="content">
          <slot></slot>
        </div>
        <div id="controls">
          <button type="button" id="previous">
            <slot name="previous-btn-svg">
              <!-- https://heroicons.com/ -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </slot>
            <span class="sr-only">
              Scroll carousel to previous index
            </span>
          </button>
          <ul id="dots"></ul>
          <button type="button" id="next">
            <slot name="next-btn-svg">
              <!-- https://heroicons.com/ -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </slot>
            <span class="sr-only">
              Scroll carousel to next index
            </span>
          </button>
        </div>
      </div>
    `;
    shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.#content = shadowRoot.querySelector("#content");
    // TODO What if there is only one image in the carousel?
    this.#previousButton = shadowRoot.querySelector("#previous");
    this.#nextButton = shadowRoot.querySelector("#next");

    /* Enhance markup */
    const slot = shadowRoot.querySelector("slot");
    const dotsContainer = shadowRoot.querySelector("#dots");
    this.#childrenNodes = slot.assignedElements();
    this.#childrenNodes.forEach((node, i) => {
      const imageId = `image-${i.toString()}`;
      node.setAttribute("data-image", imageId);
      this.#children.set(imageId, node);
      this.#imageIds.push(imageId);

      dotsContainer.appendChild(Carousel.#createDotTemplate(i).content.cloneNode(true));
    });
    
    /* Attach event listeners */
    this.#handleImageFocused = (e) => {
      const { imageId, isNativeScroll } = e.detail;
      const input = shadowRoot.querySelector(`#${imageId}`);

      if (input && !input.checked) {
        input.checked = true;
      }
      
      if (imageId === this.#imageIds[0]) {
        this.#previousButton.setAttribute("disabled", "");
        this.#nextButton.removeAttribute("disabled");
      } else if (imageId === this.#imageIds[this.#imageIds.length - 1]) {
        this.#nextButton.setAttribute("disabled", "");
        this.#previousButton.removeAttribute("disabled");
      } else {
        this.#previousButton.removeAttribute("disabled");
        this.#nextButton.removeAttribute("disabled");
      }

      if (!isNativeScroll) {
        const image = this.#children.get(imageId);
        const scrollLeft = image.offsetLeft - this.#content.offsetLeft;
        this.#content.scrollLeft = scrollLeft;
      }
    };
    this.addEventListener("image-focused", this.#handleImageFocused);

    this.#handleScrollEnd = () => {
      /*
       * Resources:
       * - https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
       * - https://stackoverflow.com/questions/66852102/css-scroll-snap-get-active-item
       */
      const currentFocus = this.#childrenNodes.find((node) => (node.getBoundingClientRect().left - this.#content.getBoundingClientRect().left) >= 0);
      const imageId = currentFocus.getAttribute("data-image");

      if (this.#imageInView !== imageId) {
        this.#setImageInView(imageId, true);
      }
    }; 
    this.#content.addEventListener("scrollend", this.#handleScrollEnd);

    const dots = shadowRoot.querySelectorAll("input[type='radio'][name='scroll-to-image']");
    dots.forEach((dot) => {
      const handleDotsChanged = (e) => {
        this.#setImageInView(e.target.value);
      };
      this.#dotsHandlers.push({ element: dot, handler: handleDotsChanged });
      dot.addEventListener("change", handleDotsChanged);
    });

    this.#handlePreviousButton = () => {
      const previousId = this.#imageIds.indexOf(this.#imageInView) - 1;
      this.#setImageInView(this.#imageIds[previousId]);
    };
    this.#handleNextButton = () => {
      const nextId = this.#imageIds.indexOf(this.#imageInView) + 1;
      this.#setImageInView(this.#imageIds[nextId]);
    };
    this.#previousButton.addEventListener("click", this.#handlePreviousButton);
    this.#nextButton.addEventListener("click", this.#handleNextButton);

    /* Initialize component */
    const startImageId = this.#imageIds.at(startPosition) ?? this.#imageIds.at(0);
    
    requestAnimationFrame(() => {
      this.#initializationTimer = setTimeout(() => {
        this.#setImageInView(startImageId);
      }, 500);
    });
  }

  disconnectedCallback() {
    clearTimeout(this.#initializationTimer);
    this.#dotsHandlers.forEach(({ element, handler }) => element.removeEventListener("change", handler));
    this.#content.removeEventListener("scrollend", this.#handleScrollEnd);
    this.removeEventListener("image-focused", this.#handleImageFocused);
    this.#previousButton.removeEventListener("click", this.#handlePreviousButton);
    this.#nextButton.removeEventListener("click", this.#handleNextButton);
  }
}

if ("customElements" in window) {
  customElements.define(Carousel.tagName, Carousel);
}
