/**
 * SkillIconHelper - Utility class for skill icons
 */
export class SkillIconHelper {
    /**
     * Gets an appropriate icon for a skill
     */
    static getSkillIcon(skill) {
        // Map skill categories to icons
        const categoryIcons = {
            COMBAT: '⚔️',
            CRAFTING: '🔨',
            GATHERING: '🌾',
            SOCIAL: '👥',
            EXPLORATION: '🧭'
        };
        
        // Map specific skills to icons
        const skillIcons = {
            martial_arts: '👊',
            sunder: '🪓',
            archery: '🏹',
            strategy: '📜'
        };
        
        // Return specific icon if available, otherwise use category icon
        return skillIcons[skill.id] || categoryIcons[skill.category] || '✨';
    }
} 