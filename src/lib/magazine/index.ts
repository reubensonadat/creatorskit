// index.ts — the magazine engine's front door. The system is 15
// independent files, each owning one issue:
//   units        pure math (rect algebra, seeded rng, contrast)
//   debug        the unit-grammar guard
//   types        pipeline contracts (Grid alias, SolverResult)
//   field        photo → 24×30 measurement field
//   zones        negative space → candidate zone pool
//   copy         semantics + line-width fitness
//   ladder       the type hierarchy solver
//   assign       Hungarian + k-best
//   archetypes   the brand library (10 templates, 6 masthead bands)
//   signatures   decoration signatures + runtime presets
//   decorations  the device emitters
//   laws         the 12-law verifier + report
//   skeleton     apply-to-cover + nothing-collides relaxation
//   solver       the orchestrator + public API
//   (this file)  the barrel

export * from './solver';
