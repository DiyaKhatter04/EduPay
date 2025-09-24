// Utility function to generate unique 4-digit IDs for students and donors

const User = require('../models/User');

/**
 * Generate a unique 4-digit ID for students and donors
 * @param {number} maxAttempts - Maximum number of attempts to generate unique ID
 * @returns {Promise<string>} - 4-digit unique ID
 */
async function generateUniqueID(maxAttempts = 10) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // Generate random 4-digit number (1000-9999)
        const id = Math.floor(1000 + Math.random() * 9000).toString();
        
        try {
            // Check if this ID already exists
            const existingUser = await User.findOne({ uniqueId: id });
            
            if (!existingUser) {
                return id;
            }
            
            attempts++;
        } catch (error) {
            console.error('Error checking unique ID:', error);
            attempts++;
        }
    }
    
    throw new Error('Unable to generate unique ID after maximum attempts');
}

/**
 * Generate multiple unique IDs at once
 * @param {number} count - Number of IDs to generate
 * @returns {Promise<string[]>} - Array of unique 4-digit IDs
 */
async function generateMultipleUniqueIDs(count) {
    const ids = [];
    const usedIds = new Set();
    
    // Get all existing IDs to avoid conflicts
    const existingUsers = await User.find({ uniqueId: { $exists: true } }, 'uniqueId');
    existingUsers.forEach(user => {
        if (user.uniqueId) {
            usedIds.add(user.uniqueId);
        }
    });
    
    let attempts = 0;
    const maxAttempts = count * 10;
    
    while (ids.length < count && attempts < maxAttempts) {
        const id = Math.floor(1000 + Math.random() * 9000).toString();
        
        if (!usedIds.has(id)) {
            ids.push(id);
            usedIds.add(id);
        }
        
        attempts++;
    }
    
    if (ids.length < count) {
        throw new Error(`Could only generate ${ids.length} out of ${count} requested unique IDs`);
    }
    
    return ids;
}

/**
 * Validate if an ID is in correct format
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid 4-digit ID
 */
function isValidID(id) {
    return /^\d{4}$/.test(id);
}

/**
 * Check if an ID is available (not used by any user)
 * @param {string} id - ID to check
 * @returns {Promise<boolean>} - True if ID is available
 */
async function isIDAvailable(id) {
    if (!isValidID(id)) {
        return false;
    }
    
    try {
        const existingUser = await User.findOne({ uniqueId: id });
        return !existingUser;
    } catch (error) {
        console.error('Error checking ID availability:', error);
        return false;
    }
}

/**
 * Reserve an ID for a user (mark as used)
 * @param {string} id - ID to reserve
 * @param {string} userId - User ID to associate with
 * @returns {Promise<boolean>} - True if successfully reserved
 */
async function reserveID(id, userId) {
    if (!isValidID(id)) {
        throw new Error('Invalid ID format');
    }
    
    try {
        const isAvailable = await isIDAvailable(id);
        if (!isAvailable) {
            throw new Error('ID is not available');
        }
        
        // Update user with the reserved ID
        const result = await User.findByIdAndUpdate(
            userId,
            { uniqueId: id },
            { new: true }
        );
        
        return !!result;
    } catch (error) {
        console.error('Error reserving ID:', error);
        throw error;
    }
}

/**
 * Get statistics about ID usage
 * @returns {Promise<Object>} - Statistics object
 */
async function getIDStatistics() {
    try {
        const totalPossibleIDs = 9000; // 1000-9999
        const usedIDs = await User.countDocuments({ uniqueId: { $exists: true, $ne: null } });
        const availableIDs = totalPossibleIDs - usedIDs;
        const usagePercentage = ((usedIDs / totalPossibleIDs) * 100).toFixed(2);
        
        return {
            totalPossible: totalPossibleIDs,
            used: usedIDs,
            available: availableIDs,
            usagePercentage: parseFloat(usagePercentage)
        };
    } catch (error) {
        console.error('Error getting ID statistics:', error);
        throw error;
    }
}

/**
 * Find gaps in used IDs (for optimization)
 * @returns {Promise<string[]>} - Array of available IDs in gaps
 */
async function findAvailableIDsInRange(start = 1000, end = 9999, limit = 100) {
    try {
        const usedIDs = await User.find(
            { 
                uniqueId: { 
                    $exists: true, 
                    $gte: start.toString(), 
                    $lte: end.toString() 
                } 
            },
            'uniqueId'
        ).lean();
        
        const usedSet = new Set(usedIDs.map(user => parseInt(user.uniqueId)));
        const available = [];
        
        for (let i = start; i <= end && available.length < limit; i++) {
            if (!usedSet.has(i)) {
                available.push(i.toString());
            }
        }
        
        return available;
    } catch (error) {
        console.error('Error finding available IDs in range:', error);
        throw error;
    }
}

/**
 * Cleanup orphaned IDs (IDs assigned to deleted users)
 * @returns {Promise<number>} - Number of IDs cleaned up
 */
async function cleanupOrphanedIDs() {
    try {
        // This would be used if we had soft deletes or other cleanup needs
        // For now, just return 0 as our current schema handles this automatically
        return 0;
    } catch (error) {
        console.error('Error cleaning up orphaned IDs:', error);
        throw error;
    }
}

module.exports = {
    generateUniqueID,
    generateMultipleUniqueIDs,
    isValidID,
    isIDAvailable,
    reserveID,
    getIDStatistics,
    findAvailableIDsInRange,
    cleanupOrphanedIDs
};