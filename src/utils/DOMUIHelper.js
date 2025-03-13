import { logger, LogCategory } from '../utils/Logger';
/**
 * DOMUIHelper - Utility class to help integrate HTML/CSS UI with Phaser
 * Handles loading CSS files and managing DOM elements
 * @class DOMUIHelper
 * @constructor
 * @param {Phaser.Scene} scene - The Phaser scene instance
 * @param {string[]} cssFiles - The CSS files to load
 * @param {Set} loadedCssFiles - The loaded CSS files
 */
export class DOMUIHelper {
    scene;
    cssFiles = [];
    loadedCssFiles = new Set();
    
    constructor(scene) {
        this.scene = scene;
    }
    
    /**
     * Loads a CSS file into the document if it hasn't been loaded already
     * @param cssPath Path to the CSS file
     */
    loadCSS(cssPath) {
        // Check if this CSS file has already been loaded
        if (this.loadedCssFiles.has(cssPath)) {
            return;
        }
        
        // Create a link element for the CSS file
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssPath;
        
        // Add to document head
        document.head.appendChild(link);
        
        // Track that we've loaded this file
        this.cssFiles.push(cssPath);
        this.loadedCssFiles.add(cssPath);
        
        logger.info(LogCategory.UI, `Loaded CSS file: ${cssPath}`);
    }
    
    /**
     * Creates a DOM element with the given properties
     * @param tag HTML tag name
     * @param className CSS class name(s)
     * @param styles Optional inline styles
     * @param parent Optional parent element to append to
     * @returns The created HTML element
     */
    createElement(tag, className, styles, parent) {
        logger.info(LogCategory.UI, `[DOMUIHelper] Creating element: ${tag}${className ? ` with class ${className}` : ''}`);
        const element = document.createElement(tag);
        
        if (className) {
            element.className = className;
        }
        
        if (styles) {
            Object.assign(element.style, styles);
        }
        
        if (parent) {
            parent.appendChild(element);
        }
        
        return element;
    }
    
    /**
     * Creates a container div with the given class name
     * @param className CSS class name(s)
     * @param styles Optional inline styles
     * @returns The created container element
     */
    createContainer(
        className,
        styles
    ) {
        return this.createElement(
            'div',
            className || '',
            styles
        );
    }
    
    /**
     * Creates a button with the given text and class
     * @param text Button text
     * @param className CSS class name(s)
     * @param onClick Click event handler
     * @param styles Optional inline styles
     * @returns The created button element
     */
    createButton(
        text,
        className,
        onClick,
        styles
    ) {
        logger.info(LogCategory.UI, `[DOMUIHelper] Creating button: "${text}" with class ${className}`);
        const button = this.createElement(
            'button',
            className,
            styles
        );
        
        button.textContent = text;
        
        // Add click handler with debugging
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
            logger.info(LogCategory.UI, `[DOMUIHelper] Button clicked: "${text}"`);
            logger.info(LogCategory.UI, '[DOMUIHelper] Event target:', event.target);
            onClick();
        });
        
        return button;
    }
    
    /**
     * Creates a progress bar with the given class
     * @param className CSS class name(s)
     * @param fillClassName CSS class name(s) for the fill element
     * @param initialPercent Initial fill percentage (0-100)
     * @param styles Optional inline styles
     * @returns Object containing the bar container and fill elements
     */
    createProgressBar(
        className,
        fillClassName,
        initialPercent = 100,
        styles
    ) {
        const container = this.createElement(
            'div',
            className,
            styles
        );
        
        const fill = this.createElement(
            'div',
            fillClassName,
            { width: `${initialPercent}%` }
        );
        
        container.appendChild(fill);
        
        return { container, fill };
    }
    
    /**
     * Updates a progress bar's fill percentage
     * @param fill The fill element to update
     * @param percent The new percentage (0-100)
     */
    updateProgressBar(fill, percent) {
        fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }
    
    /**
     * Creates a stat row with label and value
     * @param label The label text
     * @param value The initial value text
     * @param labelClass CSS class for the label
     * @param valueClass CSS class for the value
     * @returns Object containing the row, label, and value elements
     */
    createStatRow(
        label,
        value,
        labelClass = 'stat-label',
        valueClass= 'stat-value'
    ) {
        const row = this.createElement('div', 'stat-row');
        
        const labelElement = this.createElement(
            'div',
            labelClass,
            undefined,
            row
        );
        labelElement.textContent = label;
        
        const valueElement = this.createElement(
            'div',
            valueClass,
            undefined,
            row
        );
        valueElement.textContent = value;
        
        return { row, label: labelElement, value: valueElement };
    }
    
    /**
     * Removes all loaded CSS files from the document
     */
    cleanupCSS() {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href && this.cssFiles.includes(href)) {
                link.parentNode?.removeChild(link);
            }
        }
        
        this.cssFiles = [];
    }
} 