// parser.js

/**
 * Parse a single prediction string into an object.
 * @param {string} prediction - The prediction string.
 * @returns {Object} - The parsed prediction object.
 */
function parsePrediction(prediction) {
    const [nameStatus, confidence] = prediction.split(" (Confidence: ");
    const [name, status] = nameStatus.split(": ");
    return {
        name: name.trim(),
        status: status.split(" ")[1].trim(),
        //confidence: parseFloat(confidence)
    };
}

/**
 * Parse the predictions array into an array of objects asynchronously.
 * @param {Object} data - The data object containing the predictions array.
 * @returns {Promise<Array>} - The promise that resolves with an array of parsed prediction objects.
 */
async function parsePredictions(data) {
    return new Promise((resolve, reject) => {
        try {
            if (!data.predictions || !Array.isArray(data.predictions)) {
                throw new Error("Invalid predictions data format.");
            }
            const parsed = data.predictions.map(parsePrediction);
            resolve(parsed);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    parsePredictions
};