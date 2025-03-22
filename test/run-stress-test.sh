#!/bin/bash

# Stress test runner script
# This script executes the stress test with configurable parameters

# Default values
SERVER_URL=${SERVER_URL:-"ws://localhost:8080"}
NUM_USERS=${NUM_USERS:-10}
TEST_DURATION=${TEST_DURATION:-60}
LOG_FILE=${LOG_FILE:-"stress-test-results.log"}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-url=*)
      SERVER_URL="${1#*=}"
      shift
      ;;
    --num-users=*)
      NUM_USERS="${1#*=}"
      shift
      ;;
    --duration=*)
      TEST_DURATION="${1#*=}"
      shift
      ;;
    --log-file=*)
      LOG_FILE="${1#*=}"
      shift
      ;;
    --help)
      echo "Usage: ./run-stress-test.sh [options]"
      echo ""
      echo "Options:"
      echo "  --server-url=URL     Set the WebSocket server URL (default: ws://localhost:8080)"
      echo "  --num-users=N        Set the number of simulated users (default: 10)"
      echo "  --duration=N         Set the test duration in seconds (default: 60)"
      echo "  --log-file=FILE      Set the log file path (default: stress-test-results.log)"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate numeric parameters
if ! [[ "$NUM_USERS" =~ ^[0-9]+$ ]]; then
  echo "Error: Number of users must be a positive integer"
  exit 1
fi

if ! [[ "$TEST_DURATION" =~ ^[0-9]+$ ]]; then
  echo "Error: Test duration must be a positive integer"
  exit 1
fi

# Check if server is running
echo "Checking if server is running at $SERVER_URL..."
if ! curl -s --head "${SERVER_URL/ws:/http:}" > /dev/null; then
  echo "Warning: Server at $SERVER_URL may not be running. Continuing anyway..."
fi

# Export variables for the test script
export SERVER_URL
export NUM_USERS
export TEST_DURATION
export LOG_FILE

echo "Starting stress test with the following parameters:"
echo "Server URL:    $SERVER_URL"
echo "Users:         $NUM_USERS"
echo "Duration:      $TEST_DURATION seconds"
echo "Log file:      $LOG_FILE"
echo ""

# Run the stress test
node test/stress-test.js

# Check if test was successful
if [ $? -eq 0 ]; then
  echo "Stress test completed successfully"
  echo "Results written to $LOG_FILE"
else
  echo "Stress test failed"
  exit 1
fi 