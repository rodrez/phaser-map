// CoordinateCache.js
// A utility class to optimize coordinate conversions during map operations

export class CoordinateCache {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.cache = new Map(); // Map of object IDs to cached pixel positions
        this.transformVersion = 0; // Incremented when map transform changes
        this.currentTransform = null; // Current map transform state
        this.batchUpdateScheduled = false;
        this.dirtyObjects = new Set(); // Objects that need position updates
        
        // Bind methods
        this.updateTransform = this.updateTransform.bind(this);
        this.scheduleUpdate = this.scheduleUpdate.bind(this);
        this.processBatchUpdate = this.processBatchUpdate.bind(this);
        
        // Initialize
        this.setupMapListeners();
    }
    
    /**
     * Set up listeners for map events that change the transform
     */
    setupMapListeners() {
        const map = this.mapManager.getMap();
        if (!map) return;
        
        // Update transform on map movement events
        map.on('move', this.updateTransform);
        map.on('zoom', this.updateTransform);
        map.on('resize', this.updateTransform);
        
        // Initial transform capture
        this.updateTransform();
    }
    
    /**
     * Update the current transform state and increment version
     */
    updateTransform() {
        const map = this.mapManager.getMap();
        if (!map) return;
        
        // Capture current map state (zoom, center, bounds)
        this.currentTransform = {
            zoom: map.getZoom(),
            center: map.getCenter(),
            bounds: map.getBounds(),
            size: map.getSize()
        };
        
        // Increment transform version to invalidate cache
        this.transformVersion++;
        
        // Schedule a batch update for all cached objects
        this.scheduleUpdate(null); // null means update all
    }
    
    /**
     * Register an object for coordinate caching
     * @param {Object} obj - The game object to register
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} id - Optional ID, defaults to obj.id or a generated ID
     * @returns {string} The object's ID in the cache
     */
    register(obj, lat, lng, id = null) {
        // Use provided ID, object ID, or generate one
        const objId = id || obj.id || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the object's lat/lng and initial pixel position
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        
        this.cache.set(objId, {
            obj,
            lat,
            lng,
            pixelPos,
            transformVersion: this.transformVersion
        });
        
        // Set the object's position
        obj.x = pixelPos.x;
        obj.y = pixelPos.y;
        
        // Store the cache ID on the object for easy reference
        if (obj.setData) {
            obj.setData('cacheId', objId);
        } else {
            obj.cacheId = objId;
        }
        
        return objId;
    }
    
    /**
     * Update an object's lat/lng
     * @param {string} id - The object's ID in the cache
     * @param {number} lat - New latitude
     * @param {number} lng - New longitude
     */
    updateLatLng(id, lat, lng) {
        const entry = this.cache.get(id);
        if (!entry) return;
        
        entry.lat = lat;
        entry.lng = lng;
        
        // Mark as dirty to update in next batch
        this.dirtyObjects.add(id);
        this.scheduleUpdate(id);
    }
    
    /**
     * Get an object's current pixel position
     * @param {string} id - The object's ID in the cache
     * @returns {Object|null} The pixel position {x, y} or null if not found
     */
    getPixelPosition(id) {
        const entry = this.cache.get(id);
        if (!entry) return null;
        
        // If transform has changed since last update, recalculate
        if (entry.transformVersion !== this.transformVersion) {
            entry.pixelPos = this.mapManager.latLngToPixel(entry.lat, entry.lng);
            entry.transformVersion = this.transformVersion;
        }
        
        return entry.pixelPos;
    }
    
    /**
     * Schedule a batch update of object positions
     * @param {string|null} id - Specific object ID to update, or null for all
     */
    scheduleUpdate(id) {
        if (id) {
            this.dirtyObjects.add(id);
        } else {
            // Mark all objects as dirty
            for (const id of this.cache.keys()) {
                this.dirtyObjects.add(id);
            }
        }
        
        // Schedule batch update if not already scheduled
        if (!this.batchUpdateScheduled) {
            this.batchUpdateScheduled = true;
            requestAnimationFrame(this.processBatchUpdate);
        }
    }
    
    /**
     * Process all pending position updates in a batch
     */
    processBatchUpdate() {
        this.batchUpdateScheduled = false;
        
        // Update all dirty objects
        for (const id of this.dirtyObjects) {
            const entry = this.cache.get(id);
            if (!entry) continue;
            
            // Recalculate pixel position
            entry.pixelPos = this.mapManager.latLngToPixel(entry.lat, entry.lng);
            entry.transformVersion = this.transformVersion;
            
            // Update object position
            if (entry.obj) {
                // Check if object is destroyed or inactive
                const isDestroyed = entry.obj.destroyed === true || 
                                   (typeof entry.obj.active === 'boolean' && entry.obj.active === false);
                
                if (!isDestroyed) {
                    entry.obj.x = entry.pixelPos.x;
                    entry.obj.y = entry.pixelPos.y;
                } else {
                    // Remove destroyed objects from cache
                    this.unregister(id);
                }
            }
        }
        
        // Clear dirty set
        this.dirtyObjects.clear();
    }
    
    /**
     * Remove an object from the cache
     * @param {string} id - The object's ID in the cache
     */
    unregister(id) {
        this.cache.delete(id);
        this.dirtyObjects.delete(id);
    }
    
    /**
     * Clear the entire cache
     */
    clear() {
        this.cache.clear();
        this.dirtyObjects.clear();
    }
    
    /**
     * Force an update of all registered objects
     * Useful when returning from another scene to ensure all objects have the correct positions
     */
    refreshAllObjects() {
        // Log the refresh operation
        console.log(`Refreshing all objects in coordinate cache (${this.cache.size} objects)`);
        
        // Increment transform version to force recalculation
        this.transformVersion++;
        
        // Mark all objects as dirty
        for (const id of this.cache.keys()) {
            this.dirtyObjects.add(id);
        }
        
        // Process updates immediately instead of waiting for next frame
        this.processBatchUpdate();
        
        return this.cache.size; // Return number of refreshed objects
    }
    
    /**
     * Clean up resources and remove event listeners
     */
    destroy() {
        const map = this.mapManager.getMap();
        if (map) {
            map.off('move', this.updateTransform);
            map.off('zoom', this.updateTransform);
            map.off('resize', this.updateTransform);
        }
        
        this.clear();
    }
} 