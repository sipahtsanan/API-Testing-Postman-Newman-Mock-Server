# API Testing Demo -- Postman, Newman & Mock Server

This repository is a **demo project** showing how to design and run API
tests using:

-   Mock API server
-   Postman (interactive testing)
-   Newman (CI/CD automation)

It demonstrates: - Environment-per-stage - Folder-level token handling -
Lazy initialization (cross-service) - JSON Schema validation

## 1. System Overview

### Service A -- Users

-   POST /auth/token
-   POST /auth/refresh
-   POST /users
-   GET /users/:id

### Service B -- Orders

-   POST /auth/token
-   POST /auth/refresh
-   POST /orders

All mocked using a local Node.js server.

## 2. Project Structure

    .
    ├── server/
    │   └── demo-mock_server.js
    ├── postman/
    │   ├── Demo-ServiceA_B .postman_collection.json
    │   └── ENV–Example.postman_environment.json
    └── README.md

## 3. Requirements

-   Node.js
-   Postman
-   Newman (`npm install -g newman`)

## 4. Run Mock Server

    cd server
    npm install
    node server.js

Runs: - Service A on http://localhost:3001 - Service B on
http://localhost:3002

## 5. Import into Postman

Import: - Environment: `ENV–Example.postman_environment.json` -
Collection: `Demo-ServiceA_B.postman_collection.json`

## 6. Running with Newman

Run entire collection:

    newman run postman/Demo-ServiceA_B.postman_collection.json -e postman/ENV–Example.postman_environment.json

Run only Orders suite:

    newman run ... --folder "/users"
