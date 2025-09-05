#!/bin/bash

# Test script for /api/items/extract endpoint
# This script demonstrates how to call the new AI extraction endpoint

echo "🧪 Testing /api/items/extract endpoint"
echo "========================================="

# Check if server is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ Backend server is not running on localhost:8000"
    echo "Please start the server with: uvicorn main:app --reload"
    exit 1
fi

echo "✅ Backend server is running"

# Test data
TEST_IMAGE_URL="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
TEST_SOURCE_URL="https://example.com/modern-chair"
TEST_TITLE="Modern Accent Chair"
TEST_TOKEN="dev-test-token-12345"

echo "📸 Testing image: $TEST_IMAGE_URL"
echo "🌐 Source URL: $TEST_SOURCE_URL"
echo "📝 Title: $TEST_TITLE"
echo ""

# Make the API call
echo "🚀 Making API call..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d "{
    \"imageUrl\": \"$TEST_IMAGE_URL\",
    \"sourceUrl\": \"$TEST_SOURCE_URL\",
    \"title\": \"$TEST_TITLE\"
  }" \
  http://localhost:8000/api/items/extract)

# Extract HTTP status
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

echo "📊 HTTP Status: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ SUCCESS! AI extraction completed"
    echo "📋 Extracted data:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
elif [ "$http_code" -eq 401 ]; then
    echo "🔐 Authentication required - this is expected for the demo"
    echo "Response: $body"
elif [ "$http_code" -eq 422 ]; then
    echo "⚠️  Validation error or AI extraction issue"
    echo "Response: $body"
else
    echo "❌ Error (HTTP $http_code)"
    echo "Response: $body"
fi

echo ""
echo "📝 Note: To test with a real OpenAI API key:"
echo "   1. Set OPENAI_API_KEY in your .env file"
echo "   2. Ensure you have a valid bearer token for authentication"
echo "   3. Run: uvicorn main:app --reload"