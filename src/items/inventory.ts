import { BaseItem, ItemStack, ItemType } from './item';

/**
 * Represents a player's inventory that can hold and manage items
 */
export class Inventory {
    // Maximum number of slots in the inventory
    private maxSlots: number;
    
    // Maximum weight the inventory can hold
    private maxWeight: number;
    
    // Array of item stacks in the inventory
    private slots: (ItemStack | null)[];
    
    // Current weight of all items in the inventory
    private currentWeight: number;
    
    /**
     * Create a new inventory
     * @param maxSlots Maximum number of slots in the inventory
     * @param maxWeight Maximum weight the inventory can hold
     */
    constructor(maxSlots: number = 20, maxWeight: number = 50) {
        this.maxSlots = maxSlots;
        this.maxWeight = maxWeight;
        this.slots = new Array(maxSlots).fill(null);
        this.currentWeight = 0;
    }
    
    /**
     * Add an item to the inventory
     * @param item The item to add
     * @param quantity The quantity of the item to add
     * @returns The number of items that couldn't be added (if any)
     */
    addItem(item: BaseItem, quantity: number = 1): number {
        if (quantity <= 0) return 0;
        
        // Check if adding this item would exceed weight limit
        if (this.currentWeight + (item.weight * quantity) > this.maxWeight) {
            // Calculate how many we can add without exceeding weight
            const maxAddable = Math.floor((this.maxWeight - this.currentWeight) / item.weight);
            if (maxAddable <= 0) return quantity; // Can't add any
            quantity = Math.min(quantity, maxAddable);
        }
        
        let remainingQuantity = quantity;
        
        // First try to add to existing stacks of the same item
        if (item.stackable) {
            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                if (slot && slot.canStackWith(item) && slot.canAddMore()) {
                    const added = slot.add(remainingQuantity);
                    this.currentWeight += item.weight * (remainingQuantity - added);
                    remainingQuantity = added;
                    
                    if (remainingQuantity <= 0) {
                        return 0; // All items added successfully
                    }
                }
            }
        }
        
        // If we still have items to add, find empty slots
        while (remainingQuantity > 0) {
            const emptySlot = this.findEmptySlot();
            if (emptySlot === -1) {
                return remainingQuantity; // No more empty slots
            }
            
            const newStack = new ItemStack(item, Math.min(remainingQuantity, item.maxStackSize));
            this.slots[emptySlot] = newStack;
            
            const addedToThisSlot = Math.min(remainingQuantity, item.maxStackSize);
            this.currentWeight += item.weight * addedToThisSlot;
            remainingQuantity -= addedToThisSlot;
        }
        
        return 0; // All items added successfully
    }
    
    /**
     * Remove an item from the inventory
     * @param slotIndex The index of the slot to remove from
     * @param quantity The quantity to remove
     * @returns The actual quantity removed
     */
    removeItem(slotIndex: number, quantity: number = 1): number {
        if (slotIndex < 0 || slotIndex >= this.slots.length) return 0;
        
        const slot = this.slots[slotIndex];
        if (!slot) return 0;
        
        const removed = slot.remove(quantity);
        this.currentWeight -= slot.item.weight * removed;
        
        // If the stack is now empty, remove it
        if (slot.isEmpty()) {
            this.slots[slotIndex] = null;
        }
        
        return removed;
    }
    
    /**
     * Find an empty slot in the inventory
     * @returns The index of the empty slot, or -1 if no empty slots
     */
    private findEmptySlot(): number {
        return this.slots.findIndex(slot => slot === null);
    }
    
    /**
     * Get all items in the inventory
     * @returns Array of all non-empty slots
     */
    getAllItems(): ItemStack[] {
        return this.slots.filter(slot => slot !== null) as ItemStack[];
    }
    
    /**
     * Get items of a specific type
     * @param type The type of items to get
     * @returns Array of slots containing items of the specified type
     */
    getItemsByType(type: ItemType): ItemStack[] {
        return this.slots.filter(slot => slot !== null && slot.item.type === type) as ItemStack[];
    }
    
    /**
     * Get the total weight of all items in the inventory
     * @returns The total weight
     */
    getTotalWeight(): number {
        return this.currentWeight;
    }
    
    /**
     * Get the maximum weight the inventory can hold
     * @returns The maximum weight
     */
    getMaxWeight(): number {
        return this.maxWeight;
    }
    
    /**
     * Get the weight capacity remaining in the inventory
     * @returns The remaining weight capacity
     */
    getRemainingWeightCapacity(): number {
        return this.maxWeight - this.currentWeight;
    }
    
    /**
     * Get the number of empty slots in the inventory
     * @returns The number of empty slots
     */
    getEmptySlotsCount(): number {
        return this.slots.filter(slot => slot === null).length;
    }
    
    /**
     * Check if the inventory is full (no empty slots)
     * @returns True if the inventory is full
     */
    isFull(): boolean {
        return this.getEmptySlotsCount() === 0;
    }
    
    /**
     * Get the total value of all items in the inventory
     * @returns The total value
     */
    getTotalValue(): number {
        return this.slots.reduce((total, slot) => {
            if (slot) {
                return total + slot.getTotalValue();
            }
            return total;
        }, 0);
    }
    
    /**
     * Clear the inventory (remove all items)
     */
    clear(): void {
        this.slots = new Array(this.maxSlots).fill(null);
        this.currentWeight = 0;
    }
    
    /**
     * Get a specific slot
     * @param index The index of the slot to get
     * @returns The item stack at the specified slot, or null if empty
     */
    getSlot(index: number): ItemStack | null {
        if (index < 0 || index >= this.slots.length) return null;
        return this.slots[index];
    }
    
    /**
     * Get all slots (including empty ones)
     * @returns Array of all slots
     */
    getAllSlots(): (ItemStack | null)[] {
        return [...this.slots];
    }
    
    /**
     * Add an item to a specific slot
     * @param slotIndex The index of the slot to add to
     * @param item The item to add
     * @param quantity The quantity to add
     * @returns The number of items that couldn't be added (if any)
     */
    addItemToSlot(slotIndex: number, item: BaseItem, quantity: number = 1): number {
        if (slotIndex < 0 || slotIndex >= this.slots.length) return quantity;
        if (quantity <= 0) return 0;
        
        // Check if adding this item would exceed weight limit
        if (this.currentWeight + (item.weight * quantity) > this.maxWeight) {
            // Calculate how many we can add without exceeding weight
            const maxAddable = Math.floor((this.maxWeight - this.currentWeight) / item.weight);
            if (maxAddable <= 0) return quantity; // Can't add any
            quantity = Math.min(quantity, maxAddable);
        }
        
        const targetSlot = this.slots[slotIndex];
        
        // If the slot is empty, create a new stack
        if (targetSlot === null) {
            const newStack = new ItemStack(item, Math.min(quantity, item.maxStackSize));
            this.slots[slotIndex] = newStack;
            
            const addedToThisSlot = Math.min(quantity, item.maxStackSize);
            this.currentWeight += item.weight * addedToThisSlot;
            
            return quantity - addedToThisSlot;
        }
        
        // If the slot has an item, check if it can stack
        if (targetSlot.canStackWith(item) && targetSlot.canAddMore()) {
            const added = targetSlot.add(quantity);
            this.currentWeight += item.weight * (quantity - added);
            
            return added;
        }
        
        // Can't add to this slot
        return quantity;
    }
    
    /**
     * Move an item from one slot to another
     * @param fromSlot The source slot index
     * @param toSlot The destination slot index
     * @param quantity The quantity to move
     * @returns Whether the move was successful
     */
    moveItem(fromSlot: number, toSlot: number, quantity: number): boolean {
        if (fromSlot < 0 || fromSlot >= this.slots.length || toSlot < 0 || toSlot >= this.slots.length) {
            return false;
        }
        
        const sourceStack = this.slots[fromSlot];
        if (!sourceStack) return false;
        
        // Ensure we're not trying to move more than exists
        quantity = Math.min(quantity, sourceStack.quantity);
        if (quantity <= 0) return false;
        
        const targetStack = this.slots[toSlot];
        
        // If target slot is empty, move the items directly
        if (targetStack === null) {
            // Create a new stack with the moved items
            const movedItem = sourceStack.item;
            const newStack = new ItemStack(movedItem, quantity);
            this.slots[toSlot] = newStack;
            
            // Remove the items from the source stack
            this.removeItem(fromSlot, quantity);
            
            return true;
        }
        
        // If target slot has the same item and can stack
        if (targetStack.canStackWith(sourceStack.item)) {
            // Calculate how many items can be added to the target stack
            const spaceInTarget = targetStack.item.maxStackSize - targetStack.quantity;
            const amountToMove = Math.min(quantity, spaceInTarget);
            
            if (amountToMove <= 0) return false;
            
            // Add to target stack
            targetStack.add(amountToMove);
            
            // Remove from source stack
            this.removeItem(fromSlot, amountToMove);
            
            return true;
        }
        
        // Items can't be stacked
        return false;
    }
    
    /**
     * Swap the contents of two slots
     * @param slotA The first slot index
     * @param slotB The second slot index
     * @returns Whether the swap was successful
     */
    swapSlots(slotA: number, slotB: number): boolean {
        if (slotA < 0 || slotA >= this.slots.length || slotB < 0 || slotB >= this.slots.length) {
            return false;
        }
        
        // Swap the slots
        [this.slots[slotA], this.slots[slotB]] = [this.slots[slotB], this.slots[slotA]];
        
        return true;
    }
    
    /**
     * Check if the inventory contains a specific item
     * @param itemId The ID of the item to check for
     * @param quantity The minimum quantity required
     * @returns Whether the inventory contains the required quantity of the item
     */
    hasItem(itemId: string, quantity: number = 1): boolean {
        const totalQuantity = this.getItemQuantity(itemId);
        return totalQuantity >= quantity;
    }
    
    /**
     * Get the total quantity of a specific item in the inventory
     * @param itemId The ID of the item to check for
     * @returns The total quantity of the item in the inventory
     */
    getItemQuantity(itemId: string): number {
        return this.slots.reduce((total, slot) => {
            if (slot && slot.item.id === itemId) {
                return total + slot.quantity;
            }
            return total;
        }, 0);
    }
} 