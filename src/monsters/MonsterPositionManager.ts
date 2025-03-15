import type { Scene } from 'phaser';
import type { BaseMonster } from './BaseMonster';
import { MapManager } from '../utils/MapManager';
import { logger, LogCategory } from '../utils/Logger';

/**
 * MonsterPositionManager class
 * Manages monster positions using the CoordinateCache system for efficient updates during map drag
 */
export class MonsterPositionManager {
    private scene: Scene;
    private mapManager: MapManager;
    private coordinateCache: any; // Using any type since CoordinateCache doesn't have TypeScript definitions
    private monsters: Map<string, BaseMonster> = new Map();
    
    constructor(scene: Scene, mapManager: MapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.coordinateCache = this.mapManager.getCoordinateCache();
        
        if (!this.coordinateCache) {
            logger.warn(LogCategory.MONSTER, 'CoordinateCache not available in MapManager');
        }
    }
    
    /**
     * Register a monster with the position manager
     * @param monster The monster to register
     * @param lat Latitude
     * @param lng Longitude
     * @returns The monster's cache ID
     */
    public registerMonster(monster: BaseMonster, lat: number, lng: number): string | null {
        // Store lat/lng on the monster for reference
        monster.setData('lat', lat);
        monster.setData('lng', lng);
        
        // Generate a unique ID for the monster
        const monsterId = `monster_${monster.monsterType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Register with coordinate cache if available
        if (this.coordinateCache) {
            const cacheId = this.coordinateCache.register(monster, lat, lng);
            monster.setData('cacheId', cacheId);
            this.monsters.set(cacheId, monster);
            return cacheId;
        }
        
        // Fall back to direct positioning if cache not available
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        monster.x = pixelPos.x;
        monster.y = pixelPos.y;
        
        return null;
    }
    
    /**
     * Update a monster's lat/lng position
     * @param monster The monster to update
     * @param lat New latitude
     * @param lng New longitude
     */
    public updateMonsterPosition(monster: BaseMonster, lat: number, lng: number): void {
        // Update stored lat/lng
        monster.setData('lat', lat);
        monster.setData('lng', lng);
        
        // Update in coordinate cache if available
        const cacheId = monster.getData('cacheId');
        if (this.coordinateCache && cacheId) {
            this.coordinateCache.updateLatLng(cacheId, lat, lng);
            return;
        }
        
        // Fall back to direct positioning if cache not available
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        monster.x = pixelPos.x;
        monster.y = pixelPos.y;
    }
    
    /**
     * Convert pixel coordinates to lat/lng
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Lat/lng coordinates
     */
    public pixelToLatLng(x: number, y: number): { lat: number, lng: number } {
        return this.mapManager.pixelToLatLng(x, y);
    }
    
    /**
     * Convert lat/lng to pixel coordinates
     * @param lat Latitude
     * @param lng Longitude
     * @returns Pixel coordinates
     */
    public latLngToPixel(lat: number, lng: number): { x: number, y: number } {
        return this.mapManager.latLngToPixel(lat, lng);
    }
    
    /**
     * Generate a random position around a center point
     * @param centerLat Center latitude
     * @param centerLng Center longitude
     * @param radiusMeters Radius in meters
     * @returns Random position as {lat, lng}
     */
    public generateRandomPosition(centerLat: number, centerLng: number, radiusMeters: number): { lat: number, lng: number } {
        // Generate random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radiusMeters;
        
        // Calculate position using MapManager's destinationPoint function
        const position = this.mapManager.destinationPoint(
            { lat: centerLat, lng: centerLng }, 
            angle, 
            distance
        );
        
        return { lat: position.lat, lng: position.lng };
    }
    
    /**
     * Unregister a monster from the position manager
     * @param monster The monster to unregister
     */
    public unregisterMonster(monster: BaseMonster): void {
        const cacheId = monster.getData('cacheId');
        if (this.coordinateCache && cacheId) {
            this.coordinateCache.unregister(cacheId);
            this.monsters.delete(cacheId);
        }
    }
    
    /**
     * Clean up resources
     */
    public destroy(): void {
        // Unregister all monsters
        for (const [cacheId, monster] of this.monsters.entries()) {
            if (this.coordinateCache) {
                this.coordinateCache.unregister(cacheId);
            }
        }
        
        this.monsters.clear();
    }
} 