# New Orleans Climate-Adaptive Architecture Tool 🌊

A prototype application to help architects design flood-resilient buildings in New Orleans, forecasting their performance against future climate conditions and providing actionable, AI-powered adaptation strategies.

---

## Project Overview

New Orleans faces increasing flood risks due to sea level rise and land subsidence. This tool acts as a "future-proofing calculator" for architects, allowing them to simulate how their building designs will perform under projected climate changes through 2055, and receive data-driven recommendations for enhanced resilience.

---

## Core Features & How It Works 

The tool takes your building's design choices (foundation type, elevation, materials, and flood mitigation features) as input. It then processes this information through a series of calculations and an integrated AI to provide four key outputs:

### 1. Resilience Score

- **What it is:** A percentage from 0% to 100%, indicating how well your building design is expected to withstand future flooding. A higher score means greater resilience. This score is calculated for each year in the future timeline.
- **How it's done:**
  - **Starts at Zero:** Every calculation for a specific year begins with a score of 0.
  - **Foundation & Elevation:** Your chosen foundation type (e.g., pilings vs. slab-on-grade) and how high your building's lowest floor is (its elevation) are the biggest factors. Being significantly above the projected flood level earns major positive points, while being below incurs penalties.
  - **Materials:** Flood-resistant materials (e.g., cement board, closed-cell foam) add points, especially if the building is projected to be wet. Vulnerable materials (e.g., standard drywall, carpet) subtract points.
  - **Mitigation Features:** Specific flood protection elements (e.g., flood vents, elevated mechanical systems, backflow valves, site drainage) add further points.
  - **Final Score:** All these impacts are added up, and the total is capped between 0% and 100%.
### Table 1: Projected Relative Sea Level Rise for New Orleans (2025–2055)

| Year | Projected Relative Sea Level Rise *(Inches, relative to 2000 Baseline)* | Notes on Flood Frequency & Intensity                      | Primary Data Source     |
|------|-------------------------------------------------------------------------|------------------------------------------------------------|--------------------------|
| 2025 | 4–6 inches *(Intermediate-High)*                                       | Minor flooding becoming more frequent.                    | NOAA                    |
| 2030 | 7–9 inches *(Intermediate-High)*                                       | Minor flooding >10× more often by 2050.                   | NOAA                    |
| 2035 | 10–12 inches *(Intermediate-High)*                                     | Moderate flooding more frequent than current minor.       | NOAA                    |
| 2040 | 13–15 inches *(Intermediate-High)*                                     | Major flooding 5× more often by 2050.                     | NOAA                    |
| 2045 | 16–18 inches *(Intermediate-High)*                                     | Increased storm surge severity.                           | NOAA                    |
| 2050 | 14–18 inches *(Gulf Coast specific)*                                   | Tropical storms/hurricanes more intense.                  | NOAA                    |
| 2055 | 19–23 inches *(Extrapolated High-End)*                                 | Continued increase in frequency and intensity.            | Extrapolated from NOAA  |

---

### 2. Performance Timeline 

- **What it is:** A step-by-step forecast showing your building's resilience score and expected flood impact year by year (every 5 years) through 2055.
- **How it's done:**
  - The tool calculates the **Projected Future Flood Level** for each specific year. This level considers scientific estimates of sea level rise and local land sinking for New Orleans under a chosen climate scenario (defaulting to "Intermediate-High").
  - For each year, it applies the "Resilience Score" calculation using that year's projected flood level.
  - It also determines the **Flood Depth (in):** how many inches of water (if any) are projected to be above your building's lowest floor in that year.

### Table 2: Flood Resilience Feature Scoring Matrix

| Feature Category              | Specific Feature / Parameter                                                   | Resilience Score Impact (Points)       | Notes / Considerations                                                                 |
|------------------------------|--------------------------------------------------------------------------------|----------------------------------------|----------------------------------------------------------------------------------------|
| **Foundation Type & Elevation** | Slab-on-Grade (lowest floor at or below current grade)                         | 0–10 *(Very Low)*                      | Highly vulnerable to all flood types.                                                  |
|                              | Crawlspace (vented, lowest floor at or below current BFE)                      | 10–30 *(Low)*                          | Vulnerable, but allows water passage; requires flood-resistant materials.              |
|                              | Raised Slab (lowest floor 1–3 ft above current BFE)                            | 30–50 *(Moderate)*                     | Improved, but may not withstand future elevated flood levels.                          |
|                              | Piers/Columns (lowest floor 5–10 ft above current BFE)                         | 50–75 *(Good)*                         | Significant protection, good for A/AE zones.                                           |
|                              | Pilings (lowest floor 10+ ft above current BFE, deep anchorage)               | 75–90 *(Excellent)*                    | Ideal for V-zones, high-velocity water, unstable soils.                                |
|                              | Amphibious Foundation (dynamic elevation)                                     | 80–95 *(Exceptional)*                  | Adapts to rising water; currently not NFIP-eligible, which is a significant barrier.   |
| **Flood Mitigation Features** | Flood Vents (properly sized and installed for enclosed spaces)                | +5 to +10                              | Essential for pressure equalization in Zone A enclosures; can lower insurance.         |
|                              | Breakaway Walls (in V-zones)                                                  | +5 to +10                              | Designed to fail; not covered by flood insurance for replacement.                      |
|                              | Elevated Mechanical Systems (HVAC, electrical, water heater above projected FBFE) | +10 to +15                         | Protects critical infrastructure, aids rapid recovery.                                 |
|                              | Dry Floodproofing (non-residential, shallow floods, watertight)               | +10 to +20                             | Not allowed in V-zones; effective only for limited flood depths.                       |
|                              | Wet Floodproofing (non-habitable spaces, flood-resistant materials)           | +5 to +10                              | Allows water in, reduces pressure; for non-living areas.                               |
| **Material Choices** *(for areas below projected FBFE)* | Standard Drywall, Fiberglass Batt, Carpet                      | –10 to –20 *(Negative Impact)*         | Highly susceptible to damage, mold, and contamination.                                 |
|                              | Moisture/Mold-Resistant Drywall, Closed-Cell Spray Foam, Ceramic/Vinyl Tile   | +10 to +20 *(Positive Impact)*         | Resists water damage, easier to clean, inhibits mold.                                  |
|                              | Stainless Steel/Hot-Dip Galvanized Connectors/Fasteners                       | +5                                     | Prevents corrosion and structural degradation.                                         |
| **Site Drainage & Green Infrastructure** | Graded Landscape, French Drains, Swales                            | +5 to +10                              | Directs water away from foundation, reduces pooling.                                   |
|                              | Permeable Paving, Rain Gardens, Green Roofs                                   | +5 to +10                              | Reduces surface runoff, alleviates strain on municipal drainage.                       |



---

### 3. Adaptive Recommendations *(Smart Advice from an AI Architect)*

- **What it is:** A list of specific, practical, and actionable suggestions to improve your building's flood resilience and "future-proof" it over the long term. These come from an Artificial Intelligence model.
- **How it's done:**
  - The tool compiles all your building's initial design details and its complete "Performance Timeline."
  - It sends this information as a detailed query to an external Large Language Model (LLM), like OpenAI's ChatGPT.
  - Acting as an expert architect, the LLM analyzes the current design and its future performance and generates relevant recommendations covering areas like structural enhancements, advanced materials, and maintenance strategies.

---

### 4. Cost-Benefit Analysis

- **What it is:** An estimation of the potential costs of implementing the recommended adaptive measures versus the financial benefits (savings) you might gain over the 30-year projection.
- **How it's done:**
  - **Upfront Cost Estimate:**
    - For each adaptive recommendation from the AI, the tool tries to match it to a predefined list of common mitigation "cost items" (e.g., "House Elevation," "Add Flood Vents").
    - It then adds the average estimated cost for each matched item to a running total. For very broad recommendations, it uses a general manual estimate.
  - **Long-Term Savings Estimate:**
    - **Avoided Damage Costs:** If the original building design was projected to get flooded, the tool estimates savings from not having to fix future damages. (If your original design is already dry, this saving is zero).
    - **Insurance Premium Reduction:** Flood-resilient features can lower flood insurance premiums. The tool estimates potential annual percentage reductions and projects these savings over 30 years.
  - **Overall ROI Description:** It compares total Upfront Cost vs. Long-Term Savings to summarize the net financial outcome (net benefit or cost).



---

## Underlying Data & Methodology

The data used in this prototype is simulated but rigorously informed by scientific and industry sources. It’s intended to demonstrate the tool’s capabilities, not provide real-time, address-specific predictions.

### Primary Data Basis:
- **Climate Projections:** NOAA Sea Level Rise Technical Reports (e.g., 2022 Report), plus New Orleans-specific land subsidence research.
- **Resilient Design Features:** FEMA NFIP Technical Bulletins (e.g., TB 2), and general architectural flood-resistant best practices.
- **Cost & Benefit Data:** Construction cost estimators, typical flood repair cost studies, and NFIP Risk Rating 2.0 (e.g., Florida Sea Grant on RR2.0).

---

## Setup & Usage

To run this project, you will need **Node.js** and **npm** installed.

### Clone the Repository

```bash
git clone [your-repo-link]
cd [your-repo-name]
```
## Backend Setup

1. Navigate to the backend directory:
```bash
   cd backend
```
2. Install dependencies:
```bash
npm install
```
3. Create a .env file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=YOUR_ACTUAL_OPENAI_API_KEY
```

4. Start the backend server:

```
npm run dev
```

## Frontend Setup
1. Navigate to the frontend directory:
```bash
   cd backend
```
2. Install dependencies:
```bash
npm install
```
3. Start the server:
```
npm run start
```

Technologies Used
- Backend: Node.js, Express.js
- Frontend: React.js, Chakra UI
- AI: OpenAI API (for Adaptive Recommendations)
- Data Storage: Local JSON files (for prototype)

Future Enhancements
- Integration with real-time NOAA and local flood data APIs.
- More advanced AI models for recommendations and risk scoring.
- User accounts with project saving features.
- Interactive flood zone maps.
- Integration with architectural design software.