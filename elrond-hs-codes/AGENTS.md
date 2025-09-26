# Project Elrond: HS Code Classification Dashboard

## Project Overview

This project is a web application designed to assist with the classification of products using the Harmonized System (HS) codes. It provides a dashboard interface to manage products, view their classification details, and interact with an AI-powered assistant for classification suggestions.

The application is built with **React** and **TypeScript**, utilizing the **Blueprint.js** component library for its user interface. It features a modern, dark-themed design with custom styling to create a unique look and feel.

A key feature of this project is its integration with the **Anthropic Claude API**. The application can leverage Claude to generate contextual questions about a product and analyze the provided information to suggest the most accurate HS code. Fallback mechanisms are in place to ensure functionality even when the API is not available.

## Building and Running

The project uses `npm` as its package manager and `react-scripts` for managing the development lifecycle.

*   **To install dependencies:**
    ```bash
    npm install
    ```

*   **To run the application in development mode:**
    ```bash
    npm start
    ```
    This will start the development server and open the application in your default browser at `http://localhost:3000`.

*   **To build the application for production:**
    ```bash
    npm run build
    ```
    This will create a `build` directory with the optimized, production-ready assets.

*   **To run tests:**
    ```bash
    npm test
    ```

## Development Conventions

*   **Language:** The project is written in **TypeScript**, and all new code should be as well.
*   **Component Library:** The UI is built with **Blueprint.js**. Please use Blueprint components whenever possible to maintain consistency.
*   **Styling:** A combination of inline styles and CSS files is used. The project has a custom "Gotham" and "Palantir" theme. Please adhere to the existing styling conventions.
*   **State Management:** Application state is managed within React components using the `useState` hook.
*   **Routing:** **React Router** is used for navigation between the landing page and the dashboard.
*   **Data Structures:** All data types are defined in `src/types.ts`. Please add any new types to this file.
*   **API Integration:** All interactions with the Claude API are handled in `src/utils/claudeApi.ts`. This file also contains fallback functions for development and testing.
