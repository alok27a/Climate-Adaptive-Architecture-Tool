// src/ClimateAdaptiveTool.js
import React, { useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  StatGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  List,
  ListItem,
  ListIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tag,
  HStack,
  Wrap,
  WrapItem,
  useToast,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, CloseIcon } from '@chakra-ui/icons';

// --- Hardcoded Options from resilienceFeatures.json for Dropdowns ---
const FOUNDATION_OPTIONS = [
  "Slab-on-Grade (lowest floor at or below current grade)",
  "Crawlspace (vented, lowest floor at or below current BFE)",
  "Raised Slab (lowest floor 1-3 ft above current BFE)",
  "Piers/Columns (lowest floor 5-10 ft above current BFE)",
  "Pilings (lowest floor 10+ ft above current BFE, deep anchorage)",
  "Amphibious Foundation (dynamic elevation)",
];

const MATERIAL_OPTIONS = [
  "Standard Drywall, Fiberglass Batt, Carpet",
  "Moisture/Mold-Resistant Drywall, Closed-Cell Spray Foam, Ceramic/Vinyl Tile",
  "Stainless Steel/Hot-Dip Galvanized Connectors/Fasteners",
];

const MITIGATION_OPTIONS = [
  "Flood Vents (properly sized and installed for enclosed spaces)",
  "Breakaway Walls (in V-zones)",
  "Elevated Mechanical Systems (HVAC, electrical, water heater above projected FBFE)",
  "Dry Floodproofing (non-residential, shallow floods, watertight)",
  "Wet Floodproofing (non-habitable spaces, flood-resistant materials)",
  "Graded Landscape, French Drains, Swales",
  "Permeable Paving, Rain Gardens, Green Roofs",
];

const API_ENDPOINT = 'http://localhost:5002/api/simulations'; // Ensure this matches your backend API URL (e.g., 3000, not 5002)

function Home() { // Renamed from 'Home' for clarity in app structure
  const [foundationType, setFoundationType] = useState('');
  const [elevationHeight, setElevationHeight] = useState('');
  const [materials, setMaterials] = useState([]);
  const [floodMitigationFeatures, setFloodMitigationFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const toast = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResults(null);
    setIsLoading(true);

    const inputData = {
      foundationType,
      elevationHeight: parseFloat(elevationHeight),
      materials,
      floodMitigationFeatures,
    };

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Something went wrong with the API request.');
      }

      const data = await response.json();
      setResults(data);
      toast({
        title: "Simulation successful!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

    } catch (err) {
      console.error("API Call Error:", err);
      setError(err.message || 'Failed to connect to the server. Please try again.');
      toast({
        title: "Simulation failed.",
        description: err.message || "Could not connect to the API.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMaterial = (materialToRemove) => {
    setMaterials(materials.filter((material) => material !== materialToRemove));
  };

  const handleRemoveMitigationFeature = (featureToRemove) => {
    setFloodMitigationFeatures(floodMitigationFeatures.filter((feature) => feature !== featureToRemove));
  };


  return (
    <Box p={8} maxWidth="1200px" mx="auto">
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="teal.500">
          New Orleans Climate-Adaptive Architecture Tool
        </Heading>
        <Text fontSize="lg" textAlign="center" color="gray.600">
          Design your building for a flood-resilient future by 2055.
        </Text>

        <Box p={6} borderWidth="1px" borderRadius="lg" shadow="md" bg="white">
          <Heading as="h2" size="lg" mb={6} color="teal.600">
            Building Design Parameters
          </Heading>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl id="foundation-type" isRequired>
                <FormLabel>Foundation Type</FormLabel>
                <Select
                  placeholder="Select foundation type"
                  value={foundationType}
                  onChange={(e) => setFoundationType(e.target.value)}
                >
                  {FOUNDATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl id="elevation-height" isRequired>
                <FormLabel>Elevation Height (Lowest Floor in Feet above Datum)</FormLabel>
                <Input
                  type="number"
                  placeholder="e.g., 12.0"
                  value={elevationHeight}
                  onChange={(e) => setElevationHeight(e.target.value)}
                  step="0.5"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  This is the height of your lowest floor above current average sea level.
                </Text>
              </FormControl>

              <FormControl id="materials" isRequired>
                <FormLabel>Materials (Flood-Vulnerable Areas)</FormLabel>
                <Select
                  placeholder="Select materials (multi-select)"
                  value={materials}
                  onChange={(e) => {
                    const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                    setMaterials(selectedValues);
                  }}
                  multiple
                  height="100px"
                >
                  {MATERIAL_OPTIONS.map((option) => (
                    <option key={option} value={option} selected={materials.includes(option)}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Select materials used in areas potentially exposed to flooding.
                </Text>
                <Wrap mt={2}>
                  {materials.map((material) => (
                    <WrapItem key={material}>
                      <Tag size="md" variant="subtle" colorScheme="blue">
                        {material}
                        <CloseIcon ml={2} cursor="pointer" onClick={() => handleRemoveMaterial(material)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </FormControl>

              <FormControl id="mitigation-features" isRequired>
                <FormLabel>Flood Mitigation Features</FormLabel>
                <Select
                  placeholder="Select mitigation features (multi-select)"
                  value={floodMitigationFeatures}
                  onChange={(e) => {
                    const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                    setFloodMitigationFeatures(selectedValues);
                  }}
                  multiple
                  height="150px"
                >
                  {MITIGATION_OPTIONS.map((option) => (
                    <option key={option} value={option} selected={floodMitigationFeatures.includes(option)}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Choose features installed for flood protection.
                </Text>
                <Wrap mt={2}>
                  {floodMitigationFeatures.map((feature) => (
                    <WrapItem key={feature}>
                      <Tag size="md" variant="subtle" colorScheme="purple">
                        {feature}
                        <CloseIcon ml={2} cursor="pointer" onClick={() => handleRemoveMitigationFeature(feature)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </FormControl>

              <Button type="submit" colorScheme="teal" size="lg" isLoading={isLoading} width="full" mt={6}>
                Simulate Resilience
              </Button>
            </VStack>
          </form>
        </Box>

        {error && (
          <Alert status="error" mt={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {results && (
          <Box p={6} borderWidth="1px" borderRadius="lg" shadow="md" bg="white">
            <Heading as="h2" size="lg" mb={6} color="teal.600">
              Simulation Results
            </Heading>

            <StatGroup mb={6} spacing={8}>
              <Stat>
                <StatLabel fontSize="lg">Overall Resilience Score (2055)</StatLabel>
                <StatNumber
                  fontSize="5xl"
                  color={results.overallResilienceScore >= 80 ? 'green.500' : results.overallResilienceScore >= 50 ? 'orange.500' : 'red.500'}
                >
                  {results.overallResilienceScore}%
                </StatNumber>
                <StatHelpText>
                  {results.overallResilienceScore >= 80 ? 'Excellent resilience!' :
                   results.overallResilienceScore >= 50 ? 'Moderate resilience, consider improvements.' :
                   'Low resilience, significant adaptations needed.'}
                </StatHelpText>
              </Stat>
            </StatGroup>
            
          
            
         

            <Divider my={6} />

            <Heading as="h3" size="md" mb={4} color="teal.600">
              Performance Timeline (Through 2055, Intermediate-High Scenario)
            </Heading>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Year</Th>
                    <Th isNumeric>Projected Flood Level (ft)</Th>
                    <Th isNumeric>Resilience Score (%)</Th>
                    <Th isNumeric>Flood Depth (in)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {results.performanceTimeline.map((entry) => (
                    <Tr key={entry.year}>
                      <Td>{entry.year}</Td>
                      <Td isNumeric>{entry.projectedFloodLevel}</Td>
                      <Td isNumeric>{entry.resilienceScoreAtYear}</Td>
                      <Td isNumeric>{entry.floodDepthInches}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            <Divider my={6} />

            <Heading as="h3" size="md" mb={4} color="teal.600">
              Adaptive Recommendations
            </Heading>
            <List spacing={3}>
              {results.adaptiveRecommendations.length > 0 ? (
                results.adaptiveRecommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    <Text as="span" dangerouslySetInnerHTML={{ __html: rec }} />
                  </ListItem>
                ))
              ) : (
                <Text>No specific recommendations generated for this design.</Text>
              )}
            </List>
            <Divider my={6} />
            
            <Heading as="h3" size="md" mb={4} color="teal.600">
                Cost-Benefit Analysis
            </Heading>
            <Text fontSize="md" mb={4} fontWeight="bold">
                {results.costBenefitAnalysis.roiDescription}
            </Text>

            <List spacing={2} mb={4}>
                <Text fontWeight="semibold" mb={2}>Upfront Cost Breakdown:</Text>
                {results.costBenefitAnalysis.upfrontCostBreakdown.map((item, index) => (
                    <ListItem key={`upfront-${index}`}>
                        <ListIcon as={CheckCircleIcon} color="blue.500" />
                        {item}
                    </ListItem>
                ))}
            </List>

            <List spacing={2} mb={4}>
                <Text fontWeight="semibold" mb={2}>Long-Term Savings Breakdown:</Text>
                {results.costBenefitAnalysis.longTermSavingsBreakdown.map((item, index) => (
                    <ListItem key={`savings-${index}`}>
                        <ListIcon as={CheckCircleIcon} color="green.500" />
                        {item}
                    </ListItem>
                ))}
            </List>


          </Box>
        )}
      </VStack>
    </Box>
  );
}

export default Home; 