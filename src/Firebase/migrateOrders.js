// src/Firebase/migrateOrders.js
import { migrateExistingOrders } from './ordersDb';

/**
 * This utility file contains a function to migrate existing orders to the new nested collection structure.
 * Run this function once to move data from the flat structure to the nested structure.
 */

export const runOrdersMigration = async () => {
    try {
        console.log("🔄 Starting order migration process...");
        await migrateExistingOrders();
        console.log("✅ Order migration completed successfully!");
        return { success: true, message: "Migration completed successfully" };
    } catch (error) {
        console.error("❌ Error during order migration:", error);
        return { success: false, message: error.message || "Migration failed" };
    }
};

export default runOrdersMigration;
