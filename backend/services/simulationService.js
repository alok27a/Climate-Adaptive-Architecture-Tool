// src/services/simulationService.js
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch'; // For Node.js 18+, you can also just use global fetch
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const climateProjections = JSON.parse(
  readFileSync(new URL('../data/climateProjections.json', import.meta.url), 'utf-8')
);

const resilienceFeatures = JSON.parse(
  readFileSync(new URL('../data/resilienceFeatures.json', import.meta.url), 'utf-8')
);

const costData = JSON.parse(
  readFileSync(new URL('../data/costData.json', import.meta.url), 'utf-8')
);



// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

class SimulationService {
    DEFAULT_TARGET_FUTURE_YEAR = 2055;
    // IMPORTANT: Changed to 'Intermediate-High' to match the single scenario in the new climateProjections.json
    DEFAULT_CLIMATE_SCENARIO = 'Intermediate-High';
    DEFAULT_BUILDING_TYPE = 'residential';

    /**
     * Calculates the projected future flood level (FFL) above a generalized datum for a given year.
     * Now directly uses 'projectedRelativeSeaLevelRiseInches' from the data.
     * @param {number} targetYear - The specific year for which to calculate the flood level.
     * @param {string} climateScenario - The climate scenario to consider (e.g., 'Intermediate-High').
     * @returns {number} Projected flood level in feet above datum.
     * @private
     */
    _calculateFutureFloodLevel(targetYear, climateScenario) {
        const projection = climateProjections.find(
            p => p.year === targetYear && p.scenario === climateScenario
        );

        if (!projection) {
            console.warn(`No direct climate projection found for year ${targetYear} and scenario ${climateScenario}. Attempting interpolation.`);
            const relevantProjections = climateProjections.filter(p => p.scenario === climateScenario);
            if (relevantProjections.length === 0) return 0;

            let lower = relevantProjections.filter(p => p.year <= targetYear).sort((a, b) => b.year - a.year)[0];
            let upper = relevantProjections.filter(p => p.year >= targetYear).sort((a, b) => a.year - b.year)[0];

            if (!lower) lower = upper;
            if (!upper) upper = lower;

            if (lower.year === upper.year) {
                return lower.projectedRelativeSeaLevelRiseInches / 12;
            }

            const ratio = (targetYear - lower.year) / (upper.year - lower.year);
            const interpolatedSLR = lower.projectedRelativeSeaLevelRiseInches + ratio * (upper.projectedRelativeSeaLevelRiseInches - lower.projectedRelativeSeaLevelRiseInches);
            
            return interpolatedSLR / 12;
        }

        return projection.projectedRelativeSeaLevelRiseInches / 12; // Use the combined value, convert to feet
    }


    /**
     * Calculates a resilience score for a building design against a given projected flood level.
     * Score is from 0-100%, with 100% being highly resilient.
     * @param {Object} design - The building design properties (foundationType, elevationHeight, materials, floodMitigationFeatures).
     * @param {number} projectedFloodLevel - The flood level (in feet above datum) for comparison.
     * @returns {{ score: number, floodDepthInches: number }} An object containing the calculated score and flood depth.
     * @private
     */
    _calculateResilienceScore(design, projectedFloodLevel) {
        let score = 0;
        console.log("\n--- START _calculateResilienceScore ---");
        console.log("Initial score:", score);
        console.log("Design input:", JSON.stringify(design, null, 2)); // Log full design input
        console.log("Projected Flood Level:", projectedFloodLevel);

        const lowestFloorElevation = design.elevationHeight;
        console.log("Lowest Floor Elevation (from design.elevationHeight):", lowestFloorElevation);

        // 1. Foundation Type & Elevation Impact
        const foundationFeature = resilienceFeatures.find(f => f.featureName === design.foundationType && f.category === 'Foundation');
        console.log("Attempting to find foundation feature:", design.foundationType);
        if (foundationFeature) {
            score += foundationFeature.scoreImpact;
            console.log("Found foundation feature:", foundationFeature.featureName, "Impact:", foundationFeature.scoreImpact);
            console.log("Score after Foundation Impact:", score);
        } else {
            console.warn("Foundation feature NOT found for:", design.foundationType);
        }

        const elevationDifference = lowestFloorElevation - projectedFloodLevel;
        console.log("Elevation Difference (Lowest Floor - Projected Flood Level):", elevationDifference);

        if (elevationDifference >= 3) {
            score += 40;
            console.log("Score after Elevation Bonus (>= 3ft above flood):", score);
        } else if (elevationDifference >= 1) {
            score += 20;
            console.log("Score after Elevation Bonus (1-2ft above flood):", score);
        } else if (elevationDifference >= 0) {
            // score += 0; // No change for 0-1ft above
            console.log("Score unchanged (0-1ft above flood):", score);
        } else if (elevationDifference >= -3) {
            score -= 20;
            console.log("Score after Elevation Penalty (0 to -3ft below flood):", score);
        } else {
            score -= 50;
            console.log("Score after Elevation Penalty (> -3ft below flood):", score);
        }

        const floodDepthInches = elevationDifference < 0 ? Math.abs(elevationDifference) * 12 : 0;
        console.log("Calculated Flood Depth (inches):", floodDepthInches);
        const materialMultiplier = floodDepthInches > 0 ? 2 : 1;
        console.log("Material Score Multiplier (1 if dry, 2 if wet):", materialMultiplier);


        // 2. Materials Impact (more weight if expected to be wet)
        console.log("Processing Materials Impact...");
        design.materials.forEach(materialName => {
            const materialFeature = resilienceFeatures.find(f => f.featureName === materialName && f.category === 'Materials');
            console.log(`- Attempting to find material feature: "${materialName}"`);
            if (materialFeature) {
                const impact = materialFeature.scoreImpact * materialMultiplier;
                score += impact;
                console.log(`  Found material: "${materialFeature.featureName}", Impact: ${impact}, Current Score: ${score}`);
            } else {
                console.warn(`  Material feature NOT found for: "${materialName}"`);
            }
        });
        console.log("Score after Materials Impact:", score);


        // 3. Flood Mitigation Features Impact
        console.log("Processing Flood Mitigation Features Impact...");
        design.floodMitigationFeatures.forEach(featureName => {
            const mitigationFeature = resilienceFeatures.find(f => f.featureName === featureName && f.category === 'Mitigation');
            console.log(`- Attempting to find mitigation feature: "${featureName}"`);
            if (mitigationFeature) {
                score += mitigationFeature.scoreImpact;
                console.log(`  Found mitigation: "${mitigationFeature.featureName}", Impact: ${mitigationFeature.scoreImpact}, Current Score: ${score}`);
            } else {
                console.warn(`  Mitigation feature NOT found for: "${featureName}"`);
            }
        });
        console.log("Score after Flood Mitigation Features Impact:", score);

        // Also consider Site Drainage if selected (new category from Table 2)
        console.log("Checking Site Drainage Impact...");
        // Check if any of the provided floodMitigationFeatures belong to the 'Site Drainage' category
        const hasSiteDrainageFeatureInInput = design.floodMitigationFeatures.some(inputFeatureName => {
            return resilienceFeatures.some(rf => rf.featureName === inputFeatureName && rf.category === 'Site Drainage');
        });
        
        console.log("Input contains a Site Drainage feature:", hasSiteDrainageFeatureInInput);

        if (hasSiteDrainageFeatureInInput) {
            // Find the *specific* site drainage feature that was selected by the user from resilienceFeatures.
            // If there can be multiple, you might need to sum their impacts.
            // For simplicity, we'll find the first one and use its score if multiple apply,
            // or if the JSON only contains one generic Site Drainage feature.
            const selectedSiteDrainageFeature = resilienceFeatures.find(f => f.category === 'Site Drainage' && design.floodMitigationFeatures.includes(f.featureName));
            
            if (selectedSiteDrainageFeature) {
                score += selectedSiteDrainageFeature.scoreImpact;
                console.log("Added Site Drainage Impact:", selectedSiteDrainageFeature.scoreImpact, ", Current Score:", score);
            } else {
                console.warn("Site Drainage feature found in input category, but not matching a specific feature in resilienceFeatures.json for scoring.");
            }
        } else {
            console.log("No Site Drainage feature selected in input, skipping Site Drainage Impact.");
        }


        const finalScoreBeforeClamp = score;
        score = Math.max(0, Math.min(100, score));
        console.log("Final Score (before clamping 0-100):", finalScoreBeforeClamp);
        console.log("Final Score (after clamping 0-100):", score);
        console.log("--- END _calculateResilienceScore ---");

        return { score, floodDepthInches };
    }

    /**
     * Generates a performance timeline for the building design.
     * @param {Object} design - The building design properties.
     * @param {number} targetFutureYear - The final year for which to generate the timeline.
     * @param {string} climateScenario - The climate scenario to use for projections.
     * @returns {Array<Object>}
     * @private
     */
    _generatePerformanceTimeline(design, targetFutureYear, climateScenario) {
        const timeline = [];
        const currentYear = new Date().getFullYear();

        for (let year = currentYear; year <= targetFutureYear; year += 5) {
            const projectedFloodLevel = this._calculateFutureFloodLevel(year, climateScenario);
            const { score, floodDepthInches } = this._calculateResilienceScore(design, projectedFloodLevel);

            timeline.push({
                year,
                projectedFloodLevel: parseFloat(projectedFloodLevel.toFixed(2)),
                resilienceScoreAtYear: score,
                floodDepthInches: parseFloat(floodDepthInches.toFixed(2))
            });
        }
        return timeline;
    }

    /**
     * Generates specific, actionable recommendations using an external LLM API.
     * @param {Object} design - The building design properties.
     * @param {Array<Object>} timeline - The simulated performance timeline.
     * @param {number} targetFutureYear - The final year of simulation.
     * @param {string} climateScenario - The climate scenario used.
     * @returns {Promise<string[]>}
     * @private
     */
    async _generateRecommendations(design, timeline, targetFutureYear, climateScenario) {
        if (!OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY is not set. Cannot generate AI recommendations.');
            return ["Error: AI recommendations not available (API key missing)."];
        }

        const initialDesignDetails = `
            Foundation Type: ${design.foundationType}
            Elevation (Lowest Floor): ${design.elevationHeight} feet above datum
            Materials (relevant to flood zone): ${design.materials.join(', ') || 'N/A'}
            Flood Mitigation Features: ${design.floodMitigationFeatures.join(', ') || 'N/A'}
        `;

        const timelineSummary = timeline.map(entry => {
            return `By ${entry.year}: Resilience Score: ${entry.resilienceScoreAtYear}%, Projected Flood Level: ${entry.projectedFloodLevel}ft, Flood Depth Above Lowest Floor: ${entry.floodDepthInches} inches.`;
        }).join('\n');

        const prompt = `
            You are an expert architect specializing in climate-adaptive and flood-resilient design for coastal areas like New Orleans.
            A client has provided details for a building design and a simulation of its flood resilience performance through ${targetFutureYear} under an '${climateScenario}' climate scenario.

            Here are the details of the initial building design:
            ${initialDesignDetails}

            Here is the simulated performance timeline:
            ${timelineSummary}

            Based on this information, provide specific, actionable, and practical recommendations to improve the building's flood resilience and "future-proof" it through ${targetFutureYear}. Focus on architectural and material interventions. Provide recommendations as a concise bulleted list.
            Example recommendation: "- Elevate HVAC unit to 13 feet by 2035."
        `;

        try {
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are an expert architect specializing in flood-resilient design. Provide concise, actionable recommendations." },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 500,
                    temperature: 0.7,
                })
            });

            const data = await response.json();

            if (response.ok && data.choices && data.choices.length > 0) {
                const llmOutput = data.choices[0].message.content;
                return llmOutput.split('\n')
                               .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().match(/^\d+\./))
                               .map(line => line.trim().replace(/^[-*]\s*|^\d+\.\s*/, ''));
            } else {
                console.error("LLM API error:", data);
                return ["Failed to get AI recommendations: " + (data.error ? data.error.message : "Unknown error")];
            }
        } catch (error) {
            console.error("Error calling LLM API:", error);
            return ["Failed to generate AI recommendations due to an API error."];
        }
    }

    /**
     * Performs a cost-benefit analysis of the current design and potential recommendations.
     * Updated to use Min/Max percentages for insurance reduction from new costData.json.
     * @param {Object} design - The building design properties.
     * @param {string[]} recommendations - An array of proposed adaptive recommendations.
     * @param {Array<Object>} timeline - The simulated performance timeline.
     * @param {number} targetFutureYear - The final year of simulation for savings calculation.
     * @returns {Object} CostBenefitAnalysis object.
     * @private
     */
    _performCostBenefitAnalysis(design, recommendations, timeline, targetFutureYear) {
        let upfrontCostEstimate = 0;
        let longTermSavingsEstimate = 0;

        recommendations.forEach(rec => {
            let costItem = null;
            if (rec.includes("elevating your foundation to piers/columns") || rec.includes("Increase your building's elevation height")) {
                costItem = costData.find(c => c.item.includes("House Elevation (Slab to Piers/Columns") || c.item.includes("House Elevation (Adding"));
            } else if (rec.includes("Amphibious system")) {
                costItem = costData.find(c => c.item === "Amphibious Foundation");
            } else if (rec.includes("Automatic Flood Vents")) {
                costItem = costData.find(c => c.item.includes("Add Flood Vents"));
            } else if (rec.includes("Breakaway walls")) {
                costItem = costData.find(c => c.item.includes("Install Breakaway Walls"));
            } else if (rec.includes("Elevate all mechanicals")) {
                // Combine costs for HVAC and Electrical Panel elevation
                const hvacCost = costData.find(c => c.item === "Elevated Electrical Panel/HVAC");
                if (hvacCost) upfrontCostEstimate += (hvacCost.upfrontCostMin + hvacCost.upfrontCostMax) / 2;
                return; // Skip further processing for this combined recommendation
            } else if (rec.includes("Replace standard drywall")) {
                costItem = costData.find(c => c.item.includes("Use Flood-Resistant Drywall"));
            } else if (rec.includes("Replace fiberglass insulation")) {
                costItem = costData.find(c => c.item.includes("Use Closed-Cell Spray Foam"));
            } else if (rec.includes("Backflow Valves")) {
                costItem = costData.find(c => c.item.includes("Backflow Valve Installation"));
            } else if (rec.includes("Sump Pump")) {
                costItem = costData.find(c => c.item.includes("Sump Pump with Battery Backup"));
            }
            // Add more conditions for other specific recommendations and their costs/savings

            if (costItem) {
                upfrontCostEstimate += (costItem.upfrontCostMin + costItem.upfrontCostMax) / 2;
            }
        });

        const totalSimulatedFloodEvents = timeline.filter(entry => entry.floodDepthInches > 0).length;

        if (totalSimulatedFloodEvents > 0) {
            // Find the most appropriate "avoided damage" item from costData.json
            const damageItem = costData.find(c => c.item.includes("Standard Slab-on-Grade (Baseline Damage)")); // Use this for context
            if (damageItem) {
                const avgAvoidedDamagePerEvent = (damageItem.avoidedDamagePerEventMin + damageItem.avoidedDamagePerEventMax) / 2;
                // This is a proxy: assume that mitigation avoids a certain amount of damage for each significant flood event projected
                longTermSavingsEstimate += avgAvoidedDamagePerEvent * Math.min(totalSimulatedFloodEvents, 5); // Example: cap at 5 major events avoided
            }
        }

        let overallInsuranceReductionPercentage = 0;
        // Sum up potential insurance reductions based on recommendations
        recommendations.forEach(rec => {
            let costItem = null;
            if (rec.includes("elevating your foundation") || rec.includes("Amphibious system")) {
                costItem = costData.find(c => c.item.includes("House Elevation") || c.item.includes("Amphibious Foundation"));
            } else if (rec.includes("Automatic Flood Vents")) {
                costItem = costData.find(c => c.item.includes("Add Flood Vents"));
            } else if (rec.includes("Elevate all mechanicals")) {
                costItem = costData.find(c => c.item.includes("Elevate Electrical Panel/HVAC"));
            }
            // Add more conditions for other specific recommendations

            if (costItem && costItem.annualInsuranceReductionPctMin !== undefined) {
                overallInsuranceReductionPercentage += (costItem.annualInsuranceReductionPctMin + costItem.annualInsuranceReductionPctMax) / 2;
            }
        });
        
        // Cap overall percentage to avoid overestimation
        overallInsuranceReductionPercentage = Math.min(overallInsuranceReductionPercentage, 0.50); // Max 50% reduction

        const averageAnnualPremium = 3000; // Baseline annual flood insurance premium estimate for New Orleans
        longTermSavingsEstimate += (averageAnnualPremium * overallInsuranceReductionPercentage) * (targetFutureYear - new Date().getFullYear());


        let roiDescription = "";
        if (upfrontCostEstimate > 0) {
            const netBenefit = longTermSavingsEstimate - upfrontCostEstimate;
            if (netBenefit > 0) {
                roiDescription = `Investing approximately $${upfrontCostEstimate.toLocaleString()} in recommended measures could lead to estimated long-term savings of $${longTermSavingsEstimate.toLocaleString()} by ${targetFutureYear}, resulting in a net benefit of $${netBenefit.toLocaleString()}.`;
            } else {
                roiDescription = `The estimated upfront cost is $${upfrontCostEstimate.toLocaleString()}. While long-term savings are projected at $${longTermSavingsEstimate.toLocaleString()}, the initial investment is higher, resulting in a net cost of $${Math.abs(netBenefit).toLocaleString()}.`;
            }
        } else {
            roiDescription = "No significant additional upfront costs estimated for current design with these recommendations.";
        }

        return {
            upfrontCostEstimate: parseFloat(upfrontCostEstimate.toFixed(0)),
            longTermSavingsEstimate: parseFloat(longTermSavingsEstimate.toFixed(0)),
            roiDescription
        };
    }


    /**
     * Public method to run the complete simulation and generate all outputs.
     * This is the primary interface for the controller to interact with the service.
     * @param {BuildingDesignInput} inputDesign - Contains only foundationType, elevationHeight, materials, floodMitigationFeatures.
     * @returns {Promise<Object>} A promise that resolves to the complete simulation result object.
     */
    async runSimulation(inputDesign) {
        const id = uuidv4();

        // Augment the input design with hardcoded defaults for internal use
        const completeDesign = {
            ...inputDesign,
            targetFutureYear: this.DEFAULT_TARGET_FUTURE_YEAR,
            climateScenario: this.DEFAULT_CLIMATE_SCENARIO,
            buildingType: this.DEFAULT_BUILDING_TYPE // Default for recommendations context
        };

        // 1. Generate Performance Timeline
        const performanceTimeline = this._generatePerformanceTimeline(
            completeDesign,
            completeDesign.targetFutureYear,
            completeDesign.climateScenario
        );

        // Get overall resilience score for the target year from the timeline
        const targetYearEntry = performanceTimeline.find(entry => entry.year === completeDesign.targetFutureYear);
        const overallResilienceScore = targetYearEntry ? targetYearEntry.resilienceScoreAtYear : 0;

        // 2. Generate Adaptive Recommendations using the LLM
        const adaptiveRecommendations = await this._generateRecommendations(
            completeDesign,
            performanceTimeline,
            completeDesign.targetFutureYear,
            completeDesign.climateScenario
        );

        // 3. Perform Cost-Benefit Analysis
        const costBenefitAnalysis = this._performCostBenefitAnalysis(
            completeDesign,
            adaptiveRecommendations,
            performanceTimeline,
            completeDesign.targetFutureYear
        );

        // Assemble and return the final simulation result
        return {
            id,
            buildingDesign: completeDesign, // Echo the complete design for reference in output
            overallResilienceScore,
            performanceTimeline,
            adaptiveRecommendations,
            costBenefitAnalysis,
            timestamp: new Date()
        };
    }
}

const simulationService = new SimulationService();
export default simulationService;
