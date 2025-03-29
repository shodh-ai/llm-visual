#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL for the API
API_URL="https://d259-2401-4900-8821-9282-e9fd-ea41-8b61-864d.ngrok-free.app"

# Function to test an API endpoint
test_endpoint() {
    local name=$1
    local cmd=$2
    
    echo -e "\n${GREEN}Testing ${name}...${NC}"
    echo "Command: $cmd"
    echo -e "\nResponse:"
    eval $cmd
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✓ Success${NC}"
    else
        echo -e "\n${RED}✗ Failed${NC}"
    fi
    echo -e "\n----------------------------------------"
}

# Test Visualization API
test_endpoint "Visualization API" 'curl -s -X POST ${API_URL}/api/visualization \
  -H "Content-Type: application/json" \
  -d '"'"'{"topic": "shared_memory"}'"'"' | jq "."'

# Test Narration API
test_endpoint "Narration API" 'curl -s -X POST ${API_URL}/api/narration/shared_memory \
  -H "Content-Type: application/json" \
  -d '"'"'{"text": "Let us explore how CPU interacts with memory in a shared memory architecture"}'"'"' | jq "."'

# Test Doubt API
test_endpoint "Doubt API" 'curl -s -X POST ${API_URL}/api/doubt \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "topic": "shared_memory",
    "doubt": "How does CPU communicate with memory?",
    "current_time": 5000,
    "current_state": {
      "highlightedElements": ["cpu1", "memory1"]
    }
  }'"'"' | jq "."'

# Test Highlights API
test_endpoint "Highlights API" 'curl -s -X GET "${API_URL}/api/highlights/shared_memory/5000?current_state={\"highlightedElements\":[],\"currentTime\":5000}" | jq "."'

# Test Enhanced Doubt API
test_endpoint "Enhanced Doubt API" 'curl -s -X POST ${API_URL}/api/process-doubt \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "doubt": "Explain the role of interconnection network",
    "topic": "shared_nothing",
    "current_state": {
      "highlightedElements": ["network"],
      "currentTime": 12000
    }
  }'"'"' | jq "."'

echo -e "\n${GREEN}All tests completed!${NC}" 