export interface MutabaahActivation {
    id: string;
    employeeId: string;
    monthKey: string;
    createdAt: string;
}

/**
 * Activation Service
 * Handles employee month activations via internal API
 */
export const activationService = {
    // Get all activated months for an employee
    async getActivations(employeeId: string): Promise<string[]> {
        try {
            const response = await fetch(`/api/activated-months?employeeId=${employeeId}`, { credentials: 'include' });
            if (!response.ok) return [];
            const result = await response.json();
            return result.activatedMonths || [];
        } catch (error) {
            console.error('Error fetching activations:', error);
            return [];
        }
    },

    // Activate a specific month for an employee
    async activateMonth(employeeId: string, monthKey: string): Promise<boolean> {
        try {
            const response = await fetch('/api/activated-months', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, monthKey }),
                credentials: 'include'
            });

            if (!response.ok) {
                const err = await response.json();
                console.error(`Error activating month ${monthKey}:`, err.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Error activating month ${monthKey}:`, error);
            throw error;
        }
    },

    // Check if a month is activated
    async isMonthActivated(employeeId: string, monthKey: string): Promise<boolean> {
        const activations = await this.getActivations(employeeId);
        return activations.includes(monthKey);
    }
};
