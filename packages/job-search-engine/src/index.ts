// ============================================================================
// JOB SEARCH ENGINE
// ============================================================================
// Main package entry point.
// Re-exports all schemas, types, normalizers, and agents.
// ============================================================================

// Export all schemas and types
export * from "./schemas/index.js";

// Export normalizers (deterministic, pure functions, NO AI)
export * from "./normalizers/index.js";

// Export agents (AI-powered reasoning steps)
export * from "./agents/index.js";

// Export example objects for testing/documentation
export * from "./schemas/__tests__/examples.js";
