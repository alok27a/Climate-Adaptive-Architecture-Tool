// src/DocsPage.js
import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  UnorderedList,
  ListItem,
  Tag,
  Badge,
  Code,
  Link,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

// --- Load the JSON data files directly for display ---
const climateProjections = require('../data/climateProjections.json');
const resilienceFeatures = require('../data/resilienceFeatures.json');
const costData = require('../data/costData.json');

function DocsPage({ onNavigateBack }) {
  return (
    <Box p={8} maxWidth="1200px" mx="auto">
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="teal.500">
          Climate-Adaptive Architecture Tool: Documentation
        </Heading>
        <Text fontSize="lg" textAlign="center" color="gray.600">
          Understanding the Data, Calculations, and Methodology.
        </Text>

        {/* Introduction */}
        <Box p={6} borderWidth="1px" borderRadius="lg" shadow="md" bg="white">
          <Heading as="h2" size="lg" mb={4} color="teal.600">
            Introduction
          </Heading>
          <Text>
            This tool helps architects design flood-resilient buildings in New Orleans by simulating
            how a given design will handle increasing flood risk through 2055. It provides a
            resilience score, performance timeline, adaptive recommendations (powered by AI), and a cost-benefit analysis.
          </Text>
          <Text mt={2}>
            The data used for this simulation is <strong>mocked/simulated</strong> but is
            <strong> informed by reputable sources and general industry knowledge</strong> in climate science,
            flood resilience engineering, and construction economics.
          </Text>
        </Box>

        {/* Data Tables Section */}
        <Box p={6} borderWidth="1px" borderRadius="lg" shadow="md" bg="white">
          <Heading as="h2" size="lg" mb={4} color="teal.600">
            1. Underlying Data Tables
          </Heading>
          <Text mb={4}>
            The core of the simulation relies on the following three data sets:
          </Text>

          {/* Table 1: Climate Projections */}
          <Heading as="h3" size="md" mb={2} color="teal.700">
            1.1. Projected Relative Sea Level Rise (Intermediate-High Scenario)
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>
            This table reflects the combined impact of global sea level rise and local land subsidence for New Orleans.
          </Text>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Year</Th>
                  <Th isNumeric>Proj. Relative SLR (Inches)</Th>
                  <Th isNumeric>Flood Freq. Multiplier</Th>
                  <Th>Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {climateProjections.map((row) => (
                  <Tr key={row.year}>
                    <Td>{row.year}</Td>
                    <Td isNumeric>{row.projectedRelativeSeaLevelRiseInches}</Td>
                    <Td isNumeric>{row.floodFrequencyMultiplier.toFixed(1)}x</Td>
                    <Td>{row.notes}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Divider my={6} />

          {/* Table 2: Resilience Feature Scoring */}
          <Heading as="h3" size="md" mb={2} color="teal.700">
            1.2. Flood Resilience Feature Scoring Matrix
          </Heading>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Feature Name</Th>
                  <Th>Category</Th>
                  <Th isNumeric>Score Impact (Points)</Th>
                  <Th>Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {resilienceFeatures.map((row, index) => (
                  <Tr key={index}>
                    <Td>{row.featureName}</Td>
                    <Td>
                      <Tag size="sm" colorScheme={
                        row.category === 'Foundation' ? 'blue' :
                        row.category === 'Mitigation' ? 'green' :
                        row.category === 'Materials' ? 'purple' : 'orange'
                      }>
                        {row.category}
                      </Tag>
                    </Td>
                    <Td isNumeric>
                      <Badge colorScheme={row.scoreImpact >= 0 ? 'green' : 'red'}>
                        {row.scoreImpact}
                      </Badge>
                    </Td>
                    <Td>{row.notes}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Divider my={6} />

          {/* Table 3: Cost Data */}
          <Heading as="h3" size="md" mb={2} color="teal.700">
            1.3. Comparative Cost-Benefit Analysis Data
          </Heading>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Item</Th>
                  <Th isNumeric>Upfront Cost (Min)</Th>
                  <Th isNumeric>Upfront Cost (Max)</Th>
                  <Th isNumeric>Annual Insurance Reduction (Min %)</Th>
                  <Th isNumeric>Annual Insurance Reduction (Max %)</Th>
                  <Th isNumeric>Avoided Damage/Event (Min)</Th>
                  <Th isNumeric>Avoided Damage/Event (Max)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {costData.map((row, index) => (
                  <Tr key={index}>
                    <Td>{row.item}</Td>
                    <Td isNumeric>${row.upfrontCostMin.toLocaleString()}</Td>
                    <Td isNumeric>${row.upfrontCostMax.toLocaleString()}</Td>
                    <Td isNumeric>{(row.annualInsuranceReductionPctMin * 100).toFixed(0)}%</Td>
                    <Td isNumeric>{(row.annualInsuranceReductionPctMax * 100).toFixed(0)}%</Td>
                    <Td isNumeric>${row.avoidedDamagePerEventMin.toLocaleString()}</Td>
                    <Td isNumeric>${row.avoidedDamagePerEventMax.toLocaleString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Methodology Section */}
        <Box p={6} borderWidth="1px" borderRadius="lg" shadow="md" bg="white">
          <Heading as="h2" size="lg" mb={4} color="teal.600">
            2. Calculation Methodology
          </Heading>

          <Heading as="h3" size="md" mb={2} color="teal.700">
            2.1. Resilience Score Calculation
          </Heading>
          <UnorderedList spacing={2} ml={4}>
            <ListItem><Code>0</Code> base score</ListItem>
            <ListItem>Points from <Code>Foundation Type</Code>, <Code>Elevation Height</Code>, <Code>Materials</Code>, and <Code>Mitigation</Code></ListItem>
            <ListItem>Material scores double if flooded</ListItem>
            <ListItem>Clamped between <Code>0</Code> and <Code>100</Code></ListItem>
          </UnorderedList>

          <Heading as="h3" size="md" mt={6} mb={2} color="teal.700">
            2.2. Performance Timeline
          </Heading>
          <UnorderedList spacing={2} ml={4}>
            <ListItem>Simulated every 5 years till 2055</ListItem>
            <ListItem>Uses SLR and flood multiplier from Table 1.1</ListItem>
            <ListItem>Resilience score calculated per year</ListItem>
          </UnorderedList>

          <Heading as="h3" size="md" mt={6} mb={2} color="teal.700">
            2.3. Adaptive Recommendations
          </Heading>
          <UnorderedList spacing={2} ml={4}>
            <ListItem>Generated by AI (e.g., ChatGPT)</ListItem>
            <ListItem>Based on timeline, building design, and future goal year</ListItem>
          </UnorderedList>

          <Heading as="h3" size="md" mt={6} mb={2} color="teal.700">
            2.4. Cost-Benefit Analysis (CBA)
          </Heading>
          <UnorderedList spacing={2} ml={4}>
            <ListItem><Code>Upfront Cost</Code>: Based on Table 1.3</ListItem>
            <ListItem><Code>Savings</Code>: Avoided damages + insurance premium reductions</ListItem>
            <ListItem><Code>ROI</Code>: Total savings - total cost</ListItem>
          </UnorderedList>
        </Box>

        {/* Citations */}
        <Box p={6} borderWidth="1px" borderRadius="lg" shadow="md" bg="white">
          <Heading as="h2" size="lg" mb={4} color="teal.600">
            3. Citations and Data Basis
          </Heading>
          <UnorderedList spacing={3} ml={4}>
            <ListItem>
              <Text fontWeight="bold">NOAA SLR Technical Reports:</Text>
              <Link href="https://earth.gov/sealevel/us/resources/2022-sea-level-rise-technical-report/" isExternal color="teal.500" ml={2}>
                Example Link <ExternalLinkIcon mx="2px" />
              </Link>
            </ListItem>
            <ListItem>
              <Text fontWeight="bold">FEMA NFIP Technical Bulletins:</Text>
              <Link href="https://www.fema.gov/floodplain-management/flood-insurance/national-flood-insurance-program/nfip-technical-bulletins" isExternal color="teal.500" ml={2}>
                Example Link <ExternalLinkIcon mx="2px" />
              </Link>
            </ListItem>
            <ListItem>
              <Text fontWeight="bold">NOLA Subsidence Studies:</Text>
              <Link href="https://ready.nola.gov/hazard-mitigation/hazards/subsidence/" isExternal color="teal.500" ml={2}>
                Example Info <ExternalLinkIcon mx="2px" />
              </Link>
            </ListItem>
            <ListItem>
              <Text fontWeight="bold">AI-Generated Analysis:</Text> Used LLMs like GPT-4 for recommendation logic.
            </ListItem>
          </UnorderedList>
        </Box>

        <Box textAlign="center" mt={8}>
          <Text color="teal.600" cursor="pointer" onClick={onNavigateBack} _hover={{ textDecoration: 'underline' }}>
            ← Back to Simulation Tool
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}

export default DocsPage;
