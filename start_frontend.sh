#!/bin/bash

echo "Game Theory Platform - Starting Frontend..."

cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting frontend server on http://localhost:3000"
npm start