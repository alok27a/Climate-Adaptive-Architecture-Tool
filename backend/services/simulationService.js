import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch'; // Use 'node-fetch' for Node.js versions < 18, otherwise fetch is native
import dotenv from 'dotenv';
import { readFileSync } from 'fs'; // For reading local JSON files

// Load environment variables immediately
dotenv.config();

// --- Load JSON data files ---
// Using readFileSync with import.meta.url for ESM compatibility in Node.js
const climateProjections = JSON.parse(
  readFileSync(new URL('../data/climateProjections.json', import.meta.url), 'utf-8')
);

const resilienceFeatures = JSON.parse(
  readFileSync(new URL('../data/resilienceFeatures.json', import.meta.url), 'utf-8')
);

const costData = JSON.parse(
  readFileSync(new URL('../data/costData.json', import.meta.url), 'utf-8')
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

class SimulationService {
    DEFAULT_TARGET_FUTURE_YEAR = 2055;
    DEFAULT_CLIMATE_SCENARIO = 'Intermediate-High'; // Matches the single scenario in climateProjections.json
    DEFAULT_BUILDING_TYPE = 'residential'; // Default for recommendations context

    /**
     * Calculates the projected future flood level (FFL) above a generalized datum for a given year.
     * This now directly uses 'projectedRelativeSeaLevelRiseInches' from the data.
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
        console.log("Design input:", JSON.stringify(design, null, 2));
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
            console.warn("Foundation feature NOT found for:", design.foundationType + ". Score not updated by foundation.");
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
                console.warn(`  Material feature NOT found for: "${materialName}". Score not updated by this material.`);
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
                console.warn(`  Mitigation feature NOT found for: "${featureName}". Score not updated by this mitigation feature.`);
            }
        });
        console.log("Score after Flood Mitigation Features Impact:", score);

        // Also consider Site Drainage if selected (new category from Table 2)
        console.log("Checking Site Drainage Impact...");
        const hasSiteDrainageFeatureInInput = design.floodMitigationFeatures.some(inputFeatureName => {
            return resilienceFeatures.some(rf => rf.featureName === inputFeatureName && rf.category === 'Site Drainage');
        });
        
        console.log("Input contains a Site Drainage feature:", hasSiteDrainageFeatureInInput);

        if (hasSiteDrainageFeatureInInput) {
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
     * Performs a cost-benefit analysis, now generating a textual breakdown.
     * @param {Object} design - The building design properties.
     * @param {string[]} recommendations - An array of proposed adaptive recommendations.
     * @param {Array<Object>} timeline - The simulated performance timeline.
     * @param {number} targetFutureYear - The final year of simulation for savings calculation.
     * @returns {Object} CostBenefitAnalysis object with numerical totals and textual breakdowns.
     * @private
     */
    _performCostBenefitAnalysis(design, recommendations, timeline, targetFutureYear) {
        let upfrontCostEstimate = 0;
        let longTermSavingsEstimate = 0;
        const upfrontCostBreakdown = []; // NEW: Array for textual breakdown of upfront costs
        const longTermSavingsBreakdown = []; // NEW: Array for textual breakdown of savings

        console.log("\n--- START _performCostBenefitAnalysis ---");
        console.log("Recommendations received:", recommendations);
        console.log("Loaded costData items:", costData.map(c => c.item));


        // --- Estimating Upfront Costs for Recommendations ---
        console.log("\n--- Estimating Upfront Costs for Recommendations ---");
        upfrontCostBreakdown.push("Upfront Cost Estimation:");
        recommendations.forEach(rec => {
            let costItem = null;
            let itemDescription = "";
            let costAddedManually = false;

            // Foundation/Elevation recommendations
            if (rec.includes("elevate") || rec.includes("elevation") || rec.includes("foundation") || rec.includes("pilings") || rec.includes("structure stability") || rec.includes("Piers/Columns")) {
                if (rec.includes("pilings") || rec.includes("reinforced concrete or steel pilings") || design.foundationType.includes("Pilings")) {
                     costItem = costData.find(c => c.item.includes("Pilings (15 ft above grade"));
                } else if (rec.includes("Elevated Slab") || rec.includes("raise the structure")) {
                    costItem = costData.find(c => c.item.includes("Elevated Slab (5 ft above grade)"));
                } else { // Generic elevation increase
                    costItem = costData.find(c => c.item.includes("House Elevation (Adding"));
                }
                itemDescription = costItem ? costItem.item : "Generic House Elevation";
            } else if (rec.includes("Amphibious system") || rec.includes("Amphibious Foundation")) {
                costItem = costData.find(c => c.item === "Amphibious Foundation");
                itemDescription = "Amphibious Foundation";
            }
            // Mitigation features
            else if (rec.includes("Flood Vents") || rec.includes("Enhanced Flood Vents")) {
                costItem = costData.find(c => c.item.includes("Add Flood Vents"));
                itemDescription = "Add Flood Vents (per unit)";
                if (costItem) {
                    const cost = ((costItem.upfrontCostMin + costItem.upfrontCostMax) / 2) * 6; // Assume 6 units
                    upfrontCostEstimate += cost;
                    upfrontCostBreakdown.push(`- "${rec}" (Matched: ${itemDescription}, est. 6 units): $${cost.toLocaleString()}`);
                    costAddedManually = true;
                }
            } else if (rec.includes("Breakaway Walls") || rec.includes("Breakaway Wall")) {
                costItem = costData.find(c => c.item.includes("Install Breakaway Walls"));
                itemDescription = "Install Breakaway Walls (project cost est.)";
            } else if (rec.includes("Elevate Mechanical Systems") || rec.includes("Elevate Electrical Panel") || rec.includes("critical mechanical systems") || rec.includes("Adaptable Mechanical Systems") || rec.includes("Elevated Systems")) { // Added Elevate Systems for LLM output
                costItem = costData.find(c => c.item === "Elevate Electrical Panel/HVAC");
                itemDescription = "Elevate Electrical Panel/HVAC";
            } else if (rec.includes("Backflow Valves") || rec.includes("backflow preventers")) {
                costItem = costData.find(c => c.item.includes("Backflow Valve Installation"));
                itemDescription = "Backflow Valve Installation";
            } else if (rec.includes("Sump Pump")) {
                costItem = costData.find(c => c.item.includes("Sump Pump with Battery Backup"));
                itemDescription = "Sump Pump with Battery Backup";
            }
            // Material upgrades
            else if (rec.includes("Flood-Resistant Drywall") || rec.includes("Replace standard drywall") || rec.includes("fiber-cement siding") || rec.includes("exterior cladding")) { // Added exterior cladding
                costItem = costData.find(c => c.item.includes("Use Flood-Resistant Drywall"));
                itemDescription = "Use Flood-Resistant Drywall (material difference)";
                if (costItem) {
                    const cost = ((costItem.upfrontCostMin + costItem.upfrontCostMax) / 2) * 500; // Assume 500 sq ft
                    upfrontCostEstimate += cost;
                    upfrontCostBreakdown.push(`- "${rec}" (Matched: ${itemDescription}, est. 500 sq ft): $${cost.toLocaleString()}`);
                    costAddedManually = true;
                }
            } else if (rec.includes("Closed-Cell Spray Foam") || rec.includes("Replace fiberglass insulation")) {
                costItem = costData.find(c => c.item.includes("Use Closed-Cell Spray Foam"));
                itemDescription = "Use Closed-Cell Spray Foam (material difference)";
                if (costItem) {
                    const cost = ((costItem.upfrontCostMin + costItem.upfrontCostMax) / 2) * 500; // Assume 500 sq ft
                    upfrontCostEstimate += cost;
                    upfrontCostBreakdown.push(`- "${rec}" (Matched: ${itemDescription}, est. 500 sq ft): $${cost.toLocaleString()}`);
                    costAddedManually = true;
                }
            } else if (rec.includes("corrosion-resistant materials") || rec.includes("exterior metal fixtures")) {
                const cost = 2000; // Manual estimate
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Corrosion-resistant materials): $${cost.toLocaleString()}`);
                costAddedManually = true;
            }
            // Site Drainage & Green Infrastructure
            else if (rec.includes("Landscape Drainage") || rec.includes("rain gardens") || rec.includes("swales") || rec.includes("Permeable Paving") || rec.includes("vegetation buffers")) {
                 costItem = costData.find(c => c.item.includes("Graded Landscape, French Drains, Swales") || c.item.includes("Permeable Paving"));
                 if (costItem) {
                     const cost = (costItem.upfrontCostMin + costItem.upfrontCostMax) / 2;
                     upfrontCostEstimate += cost;
                     upfrontCostBreakdown.push(`- "${rec}" (Matched: ${costItem.item}): $${cost.toLocaleString()}`);
                 } else {
                     const cost = 5000; // Manual estimate
                     upfrontCostEstimate += cost;
                     upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Landscape/Drainage Improvements): $${cost.toLocaleString()}`);
                 }
                 costAddedManually = true;
            }
            // LLM specific recommendations not in simple costData (more robust manual estimates)
            else if (rec.includes("deployable flood barriers") || rec.includes("automatic flood gates")) {
                const cost = 15000; // Manual estimate
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Deployable Flood Barriers): $${cost.toLocaleString()}`);
                costAddedManually = true;
            } else if (rec.includes("Upgrade window and door seals") || rec.includes("flood-resistant windows and doors")) {
                const cost = 8000; // Manual estimate
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Flood-Resistant Windows/Doors): $${cost.toLocaleString()}`);
                costAddedManually = true;
            } else if (rec.includes("Reinforce Roof")) {
                const cost = 7000; // Manual estimate
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Reinforce Roof): $${cost.toLocaleString()}`);
                costAddedManually = true;
            } else if (rec.includes("real-time water level monitoring") || rec.includes("smart building technology")) {
                const cost = 2500; // Manual estimate
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Smart Monitoring Systems): $${cost.toLocaleString()}`);
                costAddedManually = true;
            } else if (rec.includes("Backup Power Systems") || rec.includes("backup generator") || rec.includes("solar panels")) { // Added solar panels
                const cost = 10000; // Manual estimate
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Manual Est: Backup/Solar Power Systems): $${cost.toLocaleString()}`);
                costAddedManually = true;
            } else if (rec.includes("Community Coordination") || rec.includes("Annual Risk Assessment") || rec.includes("Regular Maintenance and Inspection") || rec.includes("Monitor and Adjust Elevation") || rec.includes("Adaptable Landscaping") || rec.includes("Green Roof Maintenance") || rec.includes("Foundation and Structure Enhancement")) {
                // These are more service/planning/maintenance/conceptual related, less about direct upfront capital cost
                // If they include specific actions, those are covered above.
                upfrontCostBreakdown.push(`- "${rec}" (Planning/Maintenance/Operational - No direct capital cost estimated).`);
                costAddedManually = true; // Mark as handled to avoid "NOT found" warning
            }


            // Only add cost if not already handled by a specific block above
            // This 'else if' block will catch items that found a costItem but weren't "manually" added in a specific 'if' block
            if (costItem && !costAddedManually) {
                const cost = (costItem.upfrontCostMin + costItem.upfrontCostMax) / 2;
                upfrontCostEstimate += cost;
                upfrontCostBreakdown.push(`- "${rec}" (Matched: ${itemDescription}): $${cost.toLocaleString()}`);
            } else if (!costAddedManually) { // For recommendations that didn't match any condition
                // This warning should now only appear for truly unhandled recommendations
                upfrontCostBreakdown.push(`- "${rec}" (No direct cost item match found).`);
                console.warn(`  Recommendation "${rec}" did NOT find a direct costItem match, and no specific manual estimate applied. Skipping upfront cost for this item.`);
            }
        });
        console.log("Total Upfront Cost Estimate:", upfrontCostEstimate);
        console.log("Upfront Cost Breakdown:", upfrontCostBreakdown);


        // --- Long-Term Savings Estimation ---
        console.log("\n--- Estimating Long-Term Savings ---");
        longTermSavingsBreakdown.push("Long-Term Savings Estimation:");

        const totalSimulatedFloodEvents = timeline.filter(entry => entry.floodDepthInches > 0).length;
        console.log("Total simulated flood events with flood depth > 0:", totalSimulatedFloodEvents);

        if (totalSimulatedFloodEvents > 0) {
            const damageItem = costData.find(c => c.item.includes("Slab-on-Grade (Baseline Damage)"));
            if (damageItem) {
                const avgAvoidedDamagePerEvent = (damageItem.avoidedDamagePerEventMin + damageItem.avoidedDamagePerEventMax) / 2;
                const avoidedDamageTotal = avgAvoidedDamagePerEvent * Math.min(totalSimulatedFloodEvents, 5); 
                longTermSavingsEstimate += avoidedDamageTotal;
                longTermSavingsBreakdown.push(`- Avoided property damage from ${Math.min(totalSimulatedFloodEvents, 5)} major flood events (based on baseline damage): $${avoidedDamageTotal.toLocaleString()}`);
            } else {
                console.warn("Baseline Damage cost item not found in costData. Cannot estimate avoided damage.");
                longTermSavingsBreakdown.push("- Could not estimate avoided damage as 'Slab-on-Grade (Baseline Damage)' item not found in cost data.");
            }
        } else {
            longTermSavingsBreakdown.push("- No direct property damage from flooding projected in the timeline, so no avoided damage costs from this source.");
        }

        let overallInsuranceReductionPercentage = 0;
        console.log("\n--- Summing Insurance Reduction Percentages ---");
        longTermSavingsBreakdown.push("Insurance Premium Reductions:");
        recommendations.forEach(rec => {
            let costItem = null;
            let recType = "";
            // Use similar broadened matching as for upfront costs
            if (rec.includes("elevating your foundation") || rec.includes("Increase Elevation") || rec.includes("Amphibious system") || rec.includes("Amphibious Foundation") || rec.includes("raise the structure") || rec.includes("pilings") || rec.includes("structure stability")) {
                costItem = costData.find(c => c.item.includes("House Elevation") || c.item.includes("Amphibious Foundation") || c.item.includes("Piers/Columns") || c.item.includes("Pilings"));
                recType = costItem ? costItem.item : "Generic Elevation";
            } else if (rec.includes("Flood Vents") || rec.includes("Enhanced Flood Vents")) {
                costItem = costData.find(c => c.item.includes("Add Flood Vents"));
                recType = "Add Flood Vents";
            } else if (rec.includes("Elevate Mechanical Systems") || rec.includes("Elevate Electrical Panel") || rec.includes("critical mechanical systems") || rec.includes("Adaptable Mechanical Systems") || rec.includes("Elevated Systems")) {
                costItem = costData.find(c => c.item === "Elevate Electrical Panel/HVAC");
                recType = "Elevate Electrical Panel/HVAC";
            } else if (rec.includes("Backflow Valves") || rec.includes("backflow preventers")) {
                costItem = costData.find(c => c.item.includes("Backflow Valve Installation"));
                recType = "Backflow Valve Installation";
            } else if (rec.includes("Sump Pump")) {
                costItem = costData.find(c => c.item.includes("Sump Pump with Battery Backup"));
                recType = "Sump Pump with Battery Backup";
            }
            // Add conditions for other specific recommendations that grant insurance reductions
            // Note: Many LLM recommendations like "Reinforce Roof" or "Smart Tech" typically don't directly qualify for NFIP insurance reductions.

            if (costItem && costItem.annualInsuranceReductionPctMin !== undefined) {
                const avgReduction = (costItem.annualInsuranceReductionPctMin + costItem.annualInsuranceReductionPctMax) / 2;
                overallInsuranceReductionPercentage += avgReduction;
                longTermSavingsBreakdown.push(`- Insurance reduction from "${recType}" (avg. ${avgReduction * 100}% reduction).`);
            } else {
                console.log(`  Recommendation "${rec}" did not find a matching costItem with insurance reduction data or not applicable.`);
                longTermSavingsBreakdown.push(`- Recommendation "${rec}" (no direct insurance reduction estimated).`);
            }
        });
        
        overallInsuranceReductionPercentage = Math.min(overallInsuranceReductionPercentage, 0.50);
        const averageAnnualPremium = 3000; // Baseline annual flood insurance premium estimate for New Orleans
        const yearsProjected = targetFutureYear - new Date().getFullYear();
        const totalInsuranceSavings = (averageAnnualPremium * overallInsuranceReductionPercentage) * yearsProjected;
        longTermSavingsEstimate += totalInsuranceSavings;
        longTermSavingsBreakdown.push(`- Total estimated flood insurance savings over ${yearsProjected} years (at ${overallInsuranceReductionPercentage * 100}% overall reduction): $${totalInsuranceSavings.toLocaleString()}`);


        console.log("Total Long-Term Savings Estimate:", longTermSavingsEstimate);
        console.log("Long-Term Savings Breakdown:", longTermSavingsBreakdown);


        let roiDescription = "";
        if (upfrontCostEstimate > 0) {
            const netBenefit = longTermSavingsEstimate - upfrontCostEstimate;
            if (netBenefit > 0) {
                roiDescription = `Investing approximately $${upfrontCostEstimate.toLocaleString()} could lead to estimated long-term savings of $${longTermSavingsEstimate.toLocaleString()} by ${targetFutureYear}, resulting in a net benefit of $${netBenefit.toLocaleString()}.`;
            } else {
                roiDescription = `The estimated upfront cost is $${upfrontCostEstimate.toLocaleString()}. While long-term savings are projected at $${longTermSavingsEstimate.toLocaleString()}, the initial investment is higher, resulting in a net cost of $${Math.abs(netBenefit).toLocaleString()}.`;
            }
        } else {
            roiDescription = "No significant additional upfront costs estimated for current design with these recommendations.";
        }
        console.log("ROI Description:", roiDescription);
        console.log("--- END _performCostBenefitAnalysis ---");

        return {
            upfrontCostEstimate: parseFloat(upfrontCostEstimate.toFixed(0)),
            longTermSavingsEstimate: parseFloat(longTermSavingsEstimate.toFixed(0)),
            roiDescription,
            upfrontCostBreakdown, // NEW
            longTermSavingsBreakdown // NEW
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