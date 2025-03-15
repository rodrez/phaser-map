import { logger, LogCategory } from "./Logger";

/**
 * MapEntity class
 * Base class for any entity that needs to be positioned on the map
 * This class provides common functionality for entities that need to be positioned
 * using lat/lng coordinates and the coordinate cache system
 */
export class MapEntity {
    /**
     * Register an entity with the coordinate cache
     * @param {Object} entity - The entity to register (Phaser game object)
     * @param {Object} environment - The environment object with coordinate cache
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string|null} - The entity's cache ID or null if registration failed
     */
    static registerWithCache(entity, environment, lat, lng) {
        if (!entity || !environment) {
            logger.warn(LogCategory.MAP, "Cannot register entity: missing entity or environment");
            return null;
        }
        
        // Store lat/lng on the entity for reference
        entity.setData('lat', lat);
        entity.setData('lng', lng);
        
        // Register with coordinate cache if available
        if (environment.registerEnvironmentObject) {
            const cacheId = environment.registerEnvironmentObject(entity, lat, lng);
            return cacheId;
        }
        
        // Fall back to direct positioning if cache not available
        const mapManager = environment.mapManager || environment.scene?.mapManager;
        if (mapManager) {
            const pixelPos = mapManager.latLngToPixel(lat, lng);
            entity.x = pixelPos.x;
            entity.y = pixelPos.y;
        }
        
        return null;
    }
    
    /**
     * Update an entity's position in the coordinate cache
     * @param {Object} entity - The entity to update (Phaser game object)
     * @param {Object} environment - The environment object with coordinate cache
     * @param {number} lat - New latitude
     * @param {number} lng - New longitude
     */
    static updatePosition(entity, environment, lat, lng) {
        if (!entity || !environment) {
            logger.warn(LogCategory.MAP, "Cannot update entity position: missing entity or environment");
            return;
        }
        
        // Update stored lat/lng
        entity.setData('lat', lat);
        entity.setData('lng', lng);
        
        // Update in coordinate cache if available
        if (environment.updateEnvironmentObjectPosition) {
            environment.updateEnvironmentObjectPosition(entity, lat, lng);
            return;
        }
        
        // Fall back to direct positioning if cache not available
        const mapManager = environment.mapManager || environment.scene?.mapManager;
        if (mapManager) {
            const pixelPos = mapManager.latLngToPixel(lat, lng);
            entity.x = pixelPos.x;
            entity.y = pixelPos.y;
        }
    }
    
    /**
     * Generate a random position around a center point
     * @param {Object} mapManager - The map manager
     * @param {number} centerLat - Center latitude
     * @param {number} centerLng - Center longitude
     * @param {number} radiusMeters - Radius in meters
     * @returns {Object} - Random position as {lat, lng}
     */
    static generateRandomPosition(mapManager, centerLat, centerLng, radiusMeters) {
        if (!mapManager) {
            logger.warn(LogCategory.MAP, "Cannot generate random position: missing map manager");
            return { lat: centerLat, lng: centerLng };
        }
        
        // Generate random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radiusMeters;
        
        // Calculate position using MapManager's destinationPoint function
        const position = mapManager.destinationPoint(
            { lat: centerLat, lng: centerLng }, 
            angle, 
            distance
        );
        
        return { lat: position.lat, lng: position.lng };
    }
    
    /**
     * Unregister an entity from the coordinate cache
     * @param {Object} entity - The entity to unregister (Phaser game object)
     * @param {Object} environment - The environment object with coordinate cache
     */
    static unregisterFromCache(entity, environment) {
        if (!entity || !environment) {
            return;
        }
        
        const cacheId = entity.getData('cacheId');
        if (cacheId && environment.coordinateCache) {
            environment.coordinateCache.unregister(cacheId);
        }
    }
} 