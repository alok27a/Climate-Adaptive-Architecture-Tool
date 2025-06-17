import simulationService from '../services/simulationService.js';

class SimulationController {
    /**
     * @private
     * Validates the incoming request body for required building design parameters.
     * @param {Object} body - The request body object (e.g., req.body from Express).
     * @returns {string|null} An error message string if validation fails, otherwise null.
     */
    _validateInput(body) {
        const { foundationType, elevationHeight, materials, floodMitigationFeatures } = body;

        if (!foundationType || typeof foundationType !== 'string') {
            return 'Foundation type is required and must be a string.';
        }
        if (elevationHeight === undefined || typeof elevationHeight !== 'number' || isNaN(elevationHeight)) {
            return 'Elevation height is required and must be a valid number.';
        }
        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return 'Materials must be an array and cannot be empty.';
        }
        if (!floodMitigationFeatures || !Array.isArray(floodMitigationFeatures) || floodMitigationFeatures.length === 0) {
            return 'Flood mitigation features must be an array and cannot be empty.';
        }
        return null;
    }

    /**
     * @private
     * Sends a successful HTTP response (200 OK) with the given simulation results.
     * @param {import('express').Response} res - The Express response object.
     * @param {Object} result - The simulation result object to send as JSON.
     */
    _handleSuccessResponse(res, result) {
        res.status(200).json(result);
    }

    /**
     * @private
     * Sends an error HTTP response.
     * @param {import('express').Response} res - The Express response object.
     * @param {Error} error - The error object that occurred.
     * @param {number} statusCode - The HTTP status code to send.
     * @param {string} defaultMessage - A fallback message if the error object doesn't have a specific message.
     */
    _handleErrorResponse(res, error, statusCode = 500, defaultMessage = 'Internal server error') {
        console.error('Error in simulation controller:', error);
        res.status(statusCode).json({
            message: error.message || defaultMessage,
            // errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

    /**
     * Handles the POST request to run a simulation with simplified inputs.
     * Arrow function preserves `this` context.
     * @param {import('express').Request} req - The Express request object containing the client's input.
     * @param {import('express').Response} res - The Express response object for sending back data.
     */
    runSimulation = async (req, res) => {
        try {
            const validationError = this._validateInput(req.body);
            if (validationError) {
                return this._handleErrorResponse(res, new Error(validationError), 400, 'Invalid input parameters provided.');
            }

            const {
                foundationType,
                elevationHeight,
                materials,
                floodMitigationFeatures
            } = req.body;

            const inputDesign = {
                foundationType,
                elevationHeight,
                materials,
                floodMitigationFeatures
            };

            const result = await simulationService.runSimulation(inputDesign);

            this._handleSuccessResponse(res, result);

        } catch (error) {
            this._handleErrorResponse(res, error, 500);
        }
    };
}

const simulationController = new SimulationController();
export default simulationController;
