#!/usr/bin/env python3
"""
Test script for socket_bridge.py
"""

import subprocess
import json
import time

def test_doubt_mode():
    """Test the doubt mode of socket_bridge.py"""
    print("Testing socket_bridge.py in doubt mode...")
    
    # Sample doubt data
    doubt_data = {
        "topic": "test_topic",
        "doubt": "How does this work?",
        "current_state": {
            "highlightedElements": [],
            "currentTime": 0,
            "isOriginalNarration": True,
            "currentNarration": ""
        }
    }
    
    # Start the socket_bridge.py process
    process = subprocess.Popen(
        ["python", "socket_bridge.py", "--mode", "doubt"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Send the doubt data
    process.stdin.write(json.dumps(doubt_data) + "\n")
    process.stdin.flush()
    
    # Read the output
    responses = []
    for _ in range(3):  # Expect 3 responses: text_chunk, response_data, end
        line = process.stdout.readline().strip()
        if line:
            try:
                response = json.loads(line)
                responses.append(response)
                print(f"Received response: {response['type']}")
            except json.JSONDecodeError as e:
                print(f"Error parsing response: {e}")
                print(f"Problematic line: {line}")
    
    # Check if we got all expected responses
    expected_types = ["text_chunk", "response_data", "end"]
    received_types = [r["type"] for r in responses]
    
    if all(t in received_types for t in expected_types):
        print("✅ Test passed! All expected response types received.")
    else:
        print(f"❌ Test failed! Expected {expected_types}, got {received_types}")
    
    # Close the process
    process.terminate()
    
if __name__ == "__main__":
    test_doubt_mode() 