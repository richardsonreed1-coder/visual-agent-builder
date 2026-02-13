# Visual Agent Builder

A powerful, drag-and-drop interface for architecting, configuring, and deploying AI agent workflows. Built with React Flow, TypeScript, and Node.js.

![Visual Agent Builder](https://placeholder-image-url.com)

## 🚀 Features

*   **Visual Canvas**: Infinite canvas with drag-and-drop support for agents, skills, tools, and plugins.
*   **Component Library**: Auto-discovers components from your local `Master-Agent` inventory.
*   **Properties Editor**: Dynamic configuration forms based on node types (schema-driven).
*   **Export System**: Generate deployable `workflow.json` configurations and `CLAUDE.md` documentation.
*   **Real-time Validation**: Connection typing and property validation.

## 🛠️ Architecture

*   **Frontend**: Vite, React 18, TypeScript, React Flow, Zustand, TailwindCSS, React Query.
*   **Backend**: Node.js, Express (serves as a bridge to the local file system).
*   **Data**: Local file system access for reading component definitions; In-memory state for the graph.

## 🏁 Getting Started

### Prerequisites

*   Node.js v18+
*   The `Master-Agent` directory located at `/Users/reedrichardson/Desktop/Master-Agent` (configurable in `server/services/inventory.ts`).

### Installation

1.  **Clone the repository** (or use the created directory):
    ```bash
    cd visual-agent-builder
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    cd server && npm install
    ```

### Running the Application

1.  **Start the Backend Server**:
    ```bash
    cd server
    npm start
    ```
    *Server runs on `http://localhost:3001`*

2.  **Start the Frontend**:
    ```bash
    # In a new terminal window
    npm run dev
    ```
    *Frontend runs on `http://localhost:5173`*

## 📖 Usage Guide

1.  **Browse Library**: Use the left sidebar to search and filter available Agents, Skills, and Tools.
2.  **Add Nodes**: Drag items from the library onto the canvas.
3.  **Connect**: Drag from one node's handle to another to create relationships (e.g., Agent uses Tool).
4.  **Configure**: Click a node to open the **Properties Panel** on the right. Edit names, models, prompts, and parameters.
5.  **Export**: Use the toolbar at the top of the canvas to:
    *   **Run**: Simulate the workflow execution.
    *   **Export JSON**: Save the workflow structure.
    *   **Export Markdown**: Generate a `CLAUDE.md` documentation file.

## 🤝 Contributing

This project is a prototype. Future phases will include:
*   Real-time execution via Agent Protocol.
*   Plugin marketplace integration.
*   Collaborative editing (WebSocket).
