import { TreeSystem } from './environment/tree';
import { PopupSystem } from './ui/popup';

/**
 * Simple test script to demonstrate the updated tree popup
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create a mock scene
    const mockScene = {
        events: {
            on: () => {}
        },
        add: {
            group: () => ({})
        },
        children: {
            list: []
        }
    };

    // Create a mock map manager
    const mockMapManager = {
        latLngToPixel: (lat, lng) => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    };

    // Create the popup system
    const popupSystem = new PopupSystem(mockScene, mockMapManager);

    // Create the tree system
    const treeSystem = new TreeSystem(mockScene, {});
    treeSystem.setPopupSystem(popupSystem);

    // Create a test button for regular tree
    const testButton = document.createElement('button');
    testButton.textContent = 'Show Oak Tree Popup';
    testButton.style.position = 'fixed';
    testButton.style.top = '20px';
    testButton.style.left = '20px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px 20px';
    testButton.style.backgroundColor = '#4a7eb5';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    testButton.style.fontFamily = 'Cinzel, serif';
    testButton.style.fontWeight = 'bold';

    // Add click event
    testButton.addEventListener('click', () => {
        treeSystem.testTreePopup();
    });

    // Create a test button for healing spruce
    const spruceButton = document.createElement('button');
    spruceButton.textContent = 'Show Healing Spruce Popup';
    spruceButton.style.position = 'fixed';
    spruceButton.style.top = '20px';
    spruceButton.style.left = '200px';
    spruceButton.style.zIndex = '9999';
    spruceButton.style.padding = '10px 20px';
    spruceButton.style.backgroundColor = '#5a9d5a';
    spruceButton.style.color = 'white';
    spruceButton.style.border = 'none';
    spruceButton.style.borderRadius = '4px';
    spruceButton.style.cursor = 'pointer';
    spruceButton.style.fontFamily = 'Cinzel, serif';
    spruceButton.style.fontWeight = 'bold';

    // Add click event
    spruceButton.addEventListener('click', () => {
        treeSystem.testHealingSprucePopup();
    });

    // Add the buttons to the document
    document.body.appendChild(testButton);
    document.body.appendChild(spruceButton);

    // Show the oak tree popup automatically after 1 second
    setTimeout(() => {
        treeSystem.testTreePopup();
    }, 1000);
}); 