import type { Scene } from "phaser";
import type { MapManager} from "../utils/MapManager";

/**
 * Interface for popup options
 */
export interface PopupOptions {
  className?: string;
  closeButton?: boolean;
  offset?: { x: number; y: number };
  width?: number;
  zIndex?: number;
}

/**
 * Interface for popup content
 */
export interface PopupContent {
  html: string;
  buttons?: {
    selector: string;
    onClick: () => void;
  }[];
}

/**
 * Interface for standard popup options
 */
export interface StandardPopupOptions extends PopupOptions {
  title: string;
  description: string;
  icon?: string;
  actions?: {
    text: string;
    onClick: () => void;
    className?: string;
  }[];
}

/**
 * PopupSystem - Handles custom popups that are always on top of other elements
 */
export class PopupSystem {
  private scene: Scene;
  private mapManager: MapManager;
  private activePopups: HTMLElement[] = [];
  private interactionElement: HTMLElement | null = null;

  constructor(scene: Scene, mapManager: MapManager) {
    this.scene = scene;
    this.mapManager = mapManager;
    
    // Create an interaction element if needed
    this.createInteractionElement();

    // CSS is now loaded via import statement
    console.log("PopupSystem initialized with external CSS");
  }

  /**
   * Creates an interaction element for popups if it doesn't exist
   * @private
   */
  private createInteractionElement(): void {
    // Check if an interaction element already exists
    let element = document.getElementById('popup-interaction-layer');
    if (!element) {
      // Create a new interaction element
      element = document.createElement('div');
      element.id = 'popup-interaction-layer';
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.pointerEvents = 'none';
      element.style.zIndex = '1000';
      document.body.appendChild(element);
    }
    this.interactionElement = element;
  }

  /**
   * Ensures a popup stays within the viewport boundaries
   * @private
   */
  private ensurePopupVisibility(
    customPopup: HTMLElement,
    x: number,
    y: number,
    offsetX: number,
    offsetY: number,
  ): void {
    // Position the popup at the specified coordinates
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position that keeps the popup within viewport
    let posX = Math.max(20, Math.min(viewportWidth - 20, x + offsetX));
    let posY = Math.max(20, Math.min(viewportHeight - 20, y + offsetY));
    
    // Set the position
    customPopup.style.position = "absolute";
    customPopup.style.left = `${posX}px`;
    customPopup.style.top = `${posY}px`;
    customPopup.style.transform = "translate(-50%, -50%)";
  }

  /**
   * Create a popup at a specific lat/lon position
   */
  createPopup(
    lat: number,
    lon: number,
    content: PopupContent,
    options: PopupOptions = {},
  ): HTMLElement | null {
    try {
      // Remove any existing popups with the same class
      if (options.className) {
        this.closePopupsByClass(options.className);
      }

      // Create an overlay to capture all events
      const overlay = document.createElement("div");
      overlay.className = "popup-overlay";
      // Set overlay styles to block all events
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.pointerEvents = "auto"; // This is crucial - make sure it captures all pointer events
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.1)"; // Slight darkening to show modal effect
      overlay.style.zIndex = options.zIndex ? `${options.zIndex - 1}` : "99998"; // Just below the popup
      
      // Add click handler to close when clicking outside the popup
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          this.closePopup(overlay);
        }
        event.stopPropagation();
      });

      // Get screen coordinates for the popup using MapManager's latLngToPixel method
      const screenPos = this.mapManager.latLngToPixel(lat, lon);
      if (!screenPos) return null;

      // Create a custom popup container
      const customPopup = document.createElement("div");
      customPopup.className = `custom-popup ${options.className || ""}`;
      customPopup.style.position = "relative";

      // Apply offset
      const offsetX = options.offset?.x || 0;
      const offsetY = options.offset?.y || -30; // Default offset above the target

      // Set custom width if provided
      if (options.width) {
        customPopup.style.width = `${options.width}px`;
        customPopup.style.minWidth = `${options.width}px`;
      }

      // Set custom z-index if provided
      if (options.zIndex) {
        customPopup.style.zIndex = `${options.zIndex}`;
      } else {
        customPopup.style.zIndex = "99999";
      }

      // Set content
      customPopup.innerHTML = content.html;

      // Add close button if requested
      if (options.closeButton !== false) {
        const closeButton = document.createElement("div");
        closeButton.className = "close-button";
        closeButton.innerHTML = "×";
        closeButton.addEventListener("click", (event) => {
          // Prevent event from propagating to elements behind the popup
          event.stopPropagation();
          this.closePopup(overlay);
        });
        customPopup.appendChild(closeButton);
      }

      // Add the popup to the overlay
      overlay.appendChild(customPopup);

      // Add the overlay to the interaction layer or body
      if (this.interactionElement) {
        this.interactionElement.appendChild(overlay);
      } else {
        document.body.appendChild(overlay);
      }

      // Ensure popup stays within viewport boundaries
      this.ensurePopupVisibility(
        customPopup,
        screenPos.x,
        screenPos.y,
        offsetX,
        offsetY,
      );

      // Make sure the popup is positioned relative to the viewport, not the overlay
      customPopup.style.position = "absolute";
      customPopup.style.zIndex = options.zIndex ? options.zIndex.toString() : "99999";

      // Prevent all mouse events from propagating through the popup
      const mouseEvents = [
        "click",
        "mousedown",
        "mouseup",
        "mousemove",
        "mouseover",
        "mouseout",
        "mouseenter",
        "mouseleave",
        "contextmenu",
      ];
      for (const eventType of mouseEvents) {
        customPopup.addEventListener(eventType, (event) => {
          event.stopPropagation();
          event.preventDefault();
        });
      }

      // Register event handlers for buttons
      if (content.buttons) {
        for (const button of content.buttons) {
          const elements = customPopup.querySelectorAll(button.selector);
          for (const element of elements) {
            element.addEventListener("click", (event) => {
              // Prevent event from propagating to elements behind the popup
              event.stopPropagation();
              event.preventDefault();
              button.onClick();
            });
          }
        }
      }

      // Add a subtle entrance animation
      customPopup.style.opacity = "0";
      customPopup.style.transform = "translateY(10px)";
      customPopup.style.transition = "opacity 0.3s ease, transform 0.3s ease";

      // Trigger animation after a small delay
      setTimeout(() => {
        customPopup.style.opacity = "1";
        customPopup.style.transform = "translateY(0)";
      }, 10);

      // Add to active popups list
      this.activePopups.push(overlay);

      return overlay;
    } catch (error) {
      console.error("Error creating popup:", error);
      return null;
    }
  }

  /**
   * Create a popup at a specific screen position
   */
  createPopupAtScreenPosition(
    x: number,
    y: number,
    content: PopupContent,
    options: PopupOptions = {},
  ): HTMLElement | null {
    try {
      // Remove any existing popups with the same class
      if (options.className) {
        this.closePopupsByClass(options.className);
      }

      // Create an overlay to capture all events
      const overlay = document.createElement("div");
      overlay.className = "popup-overlay";
      // Set overlay styles to block all events
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.pointerEvents = "auto"; // This is crucial - make sure it captures all pointer events
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.3)"; // Slight darkening to show modal effect
      overlay.style.zIndex = options.zIndex ? (options.zIndex - 1).toString() : "99998"; // Just below the popup
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      
      // Add click handler to close when clicking outside the popup
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          this.closePopup(overlay);
        }
        event.stopPropagation();
      });

      // Get screen position
      const screenPos = { x, y };

      // Create a custom popup container
      const customPopup = document.createElement("div");
      customPopup.className = `custom-popup ${options.className || ""}`;
      customPopup.style.position = "relative";

      // Apply offset
      const offsetX = options.offset?.x || 0;
      const offsetY = options.offset?.y || -30; // Default offset above the target

      // Set custom width if provided
      if (options.width) {
        customPopup.style.width = `${options.width}px`;
        customPopup.style.minWidth = `${options.width}px`;
      }

      // Set custom z-index if provided
      if (options.zIndex) {
        customPopup.style.zIndex = `${options.zIndex}`;
      } else {
        customPopup.style.zIndex = "99999";
      }

      // Set content
      customPopup.innerHTML = content.html;

      // Add close button if requested
      if (options.closeButton !== false) {
        const closeButton = document.createElement("div");
        closeButton.className = "close-button";
        closeButton.innerHTML = "×";
        closeButton.addEventListener("click", (event) => {
          // Prevent event from propagating to elements behind the popup
          event.stopPropagation();
          this.closePopup(overlay);
        });
        customPopup.appendChild(closeButton);
      }

      // Add the popup to the overlay
      overlay.appendChild(customPopup);

      // Add the overlay to the interaction layer or body
      if (this.interactionElement) {
        this.interactionElement.appendChild(overlay);
      } else {
        document.body.appendChild(overlay);
      }

      // Ensure popup stays within viewport boundaries
      this.ensurePopupVisibility(
        customPopup,
        screenPos.x,
        screenPos.y,
        offsetX,
        offsetY,
      );

      // Make sure the popup is positioned relative to the viewport, not the overlay
      customPopup.style.position = "absolute";
      customPopup.style.zIndex = options.zIndex ? options.zIndex.toString() : "99999";

      // Prevent all mouse events from propagating through the popup
      const mouseEvents = [
        "click",
        "mousedown",
        "mouseup",
        "mousemove",
        "mouseover",
        "mouseout",
        "mouseenter",
        "mouseleave",
        "contextmenu",
      ];
      for (const eventType of mouseEvents) {
        customPopup.addEventListener(eventType, (event) => {
          event.stopPropagation();
          event.preventDefault();
        });
      }

      // Register event handlers for buttons
      if (content.buttons) {
        for (const button of content.buttons) {
          const elements = customPopup.querySelectorAll(button.selector);
          for (const element of elements) {
            element.addEventListener("click", (event) => {
              // Prevent event from propagating to elements behind the popup
              event.stopPropagation();
              event.preventDefault();
              button.onClick();
            });
          }
        }
      }

      // Add a subtle entrance animation
      customPopup.style.opacity = "0";
      customPopup.style.transform = "translateY(10px)";
      customPopup.style.transition = "opacity 0.3s ease, transform 0.3s ease";

      // Trigger animation after a small delay
      setTimeout(() => {
        customPopup.style.opacity = "1";
        customPopup.style.transform = "translateY(0)";
      }, 10);

      // Add to active popups list
      this.activePopups.push(overlay);

      return overlay;
    } catch (error) {
      console.error("Error creating popup:", error);
      return null;
    }
  }

  /**
   * Update the content of an existing popup
   */
  updatePopupContent(popup: HTMLElement, content: PopupContent): void {
    try {
      // Store the close button if it exists
      const closeButton = popup.querySelector(".close-button");

      // Update content
      popup.innerHTML = content.html;

      // Re-add close button if it existed
      if (closeButton) {
        popup.appendChild(closeButton);
      }

      // Register event handlers for buttons
      if (content.buttons) {
        for (const button of content.buttons) {
          const elements = popup.querySelectorAll(button.selector);
          for (const element of elements) {
            element.addEventListener("click", (event) => {
              // Prevent event from propagating to elements behind the popup
              event.stopPropagation();
              event.preventDefault();
              button.onClick();
            });
          }
        }
      }

      // Prevent all mouse events from propagating through the popup
      const mouseEvents = [
        "click",
        "mousedown",
        "mouseup",
        "mousemove",
        "mouseover",
        "mouseout",
        "mouseenter",
        "mouseleave",
        "contextmenu",
      ];
      for (const eventType of mouseEvents) {
        popup.addEventListener(eventType, (event) => {
          event.stopPropagation();
          event.preventDefault();
        });
      }
    } catch (error) {
      console.error("Error updating popup content:", error);
    }
  }

  /**
   * Close a specific popup
   */
  closePopup(popup: HTMLElement): void {
    try {
      // Add exit animation
      popup.style.opacity = "0";
      popup.style.transform = "translateY(10px)";

      // Remove after animation completes
      setTimeout(() => {
        // Remove from DOM
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }

        // Remove from active popups list
        const index = this.activePopups.indexOf(popup);
        if (index !== -1) {
          this.activePopups.splice(index, 1);
        }
      }, 300); // Match the transition duration
    } catch (error) {
      console.error("Error closing popup:", error);
    }
  }

  /**
   * Close all popups with a specific class
   */
  closePopupsByClass(className: string): void {
    try {
      // Find all popups with the specified class
      const popupsToClose = this.activePopups.filter((popup) => {
        const popupElement = popup.querySelector(`.custom-popup.${className}`);
        return popupElement !== null;
      });

      // Close each popup
      for (const popup of popupsToClose) {
        this.closePopup(popup);
      }
    } catch (error) {
      console.error("Error closing popups by class:", error);
    }
  }

  /**
   * Close all active popups
   */
  closeAllPopups(): void {
    try {
      // Create a copy of the array to avoid modification during iteration
      const popupsToClose = [...this.activePopups];

      // Close each popup
      for (const popup of popupsToClose) {
        this.closePopup(popup);
      }
    } catch (error) {
      console.error("Error closing all popups:", error);
    }
  }

  /**
   * Check if any popup is currently open
   */
  isAnyPopupOpen(): boolean {
    return this.activePopups.length > 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    try {
      // Close all popups
      this.closeAllPopups();

      // Clear the active popups array
      this.activePopups = [];

      // Remove the interaction element if it exists
      if (this.interactionElement && this.interactionElement.parentNode) {
        this.interactionElement.parentNode.removeChild(this.interactionElement);
      }

      console.log("PopupSystem destroyed");
    } catch (error) {
      console.error("Error destroying PopupSystem:", error);
    }
  }

  /**
   * Create a standardized popup with title, description, and action buttons
   */
  createStandardPopup(
    x: number,
    y: number,
    options: StandardPopupOptions,
  ): HTMLElement | null {
    try {
      // Generate HTML for the popup content
      let actionsHtml = '';
      
      if (options.actions && options.actions.length > 0) {
        const buttonHtml = options.actions.map((action, index) => {
          const className = action.className || '';
          return `<button class="popup-button ${className}" data-action-index="${index}">${action.text}</button>`;
        }).join('');
        
        actionsHtml = `<div class="popup-actions">${buttonHtml}</div>`;
      }

      // Generate icon HTML if provided
      const iconHtml = options.icon ? `
        <div class="popup-icon">
          ${options.icon}
        </div>
      ` : '';

      // Create the HTML content
      const html = `
        <div class="parchment-texture"></div>
        <div class="popup-corner corner-top-left"></div>
        <div class="popup-corner corner-top-right"></div>
        <div class="popup-corner corner-bottom-left"></div>
        <div class="popup-corner corner-bottom-right"></div>
        
        ${iconHtml}
        
        <div class="popup-title">${options.title}</div>
        
        <div class="popup-content">
          ${options.description}
        </div>
        
        ${actionsHtml}
      `;

      // Create button handlers
      const buttons: { selector: string; onClick: () => void }[] = [];
      
      if (options.actions) {
        options.actions.forEach((action, index) => {
          buttons.push({
            selector: `[data-action-index="${index}"]`,
            onClick: action.onClick
          });
        });
      }

      // Create the popup content
      const content: PopupContent = {
        html,
        buttons
      };

      // Create popup options
      const popupOptions: PopupOptions = {
        className: options.className,
        closeButton: options.closeButton,
        offset: options.offset,
        width: options.width || 400, // Default width for standard popups
        zIndex: options.zIndex
      };

      // Create the popup at the specified screen position
      return this.createPopupAtScreenPosition(x, y, content, popupOptions);
    } catch (error) {
      console.error("Error creating standard popup:", error);
      return null;
    }
  }

  /**
   * Create a standardized popup at a specific lat/lon position
   */
  createStandardPopupAtLatLng(
    lat: number,
    lon: number,
    options: StandardPopupOptions,
  ): HTMLElement | null {
    try {
      // Get screen coordinates for the popup using MapManager's latLngToPixel method
      const screenPos = this.mapManager.latLngToPixel(lat, lon);
      if (!screenPos) return null;

      // Create the standard popup at the screen position
      return this.createStandardPopup(screenPos.x, screenPos.y, options);
    } catch (error) {
      console.error("Error creating standard popup at lat/lng:", error);
      return null;
    }
  }

  /**
   * Create a centered standard popup
   */
  createCenteredStandardPopup(
    options: StandardPopupOptions,
  ): HTMLElement | null {
    try {
      // Get the center of the viewport
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;

      // Create the standard popup at the center of the screen
      return this.createStandardPopup(x, y, options);
    } catch (error) {
      console.error("Error creating centered standard popup:", error);
      return null;
    }
  }

  /**
   * Example method to show how to use the standard popup
   */
  showExamplePopup(): HTMLElement | null {
    // Example SVG icon
    const exampleIcon = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c8a165" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    `;

    // Create a standard popup with title, description, and action buttons
    return this.createCenteredStandardPopup({
      title: "The King's Summons",
      description: `
        By royal decree, His Majesty King Aldric III, Sovereign of the Western Realms and Protector of the Seven Valleys, demands thine immediate presence at the Royal Court.
        
        Dark tidings have reached the castle. The Eastern Horde gathers at our borders, led by the dreaded Warlord Krizak. The kingdom requires thy valor and wit in this dire hour.
      `,
      icon: exampleIcon,
      actions: [
        {
          text: "Heed the Call",
          onClick: () => {
            console.log("User accepted the quest");
            // Add your logic here
          },
          className: "popup-button-primary"
        },
        {
          text: "Decline",
          onClick: () => {
            console.log("User declined the quest");
            // Add your logic here
          },
          className: "popup-button-danger"
        }
      ],
      width: 450,
      closeButton: true
    });
  }
}

