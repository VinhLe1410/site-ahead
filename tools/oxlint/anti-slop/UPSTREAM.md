# Upstream

- Repository: https://github.com/dmmulroy/anti-slop
- Revision: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Installed path: `tools/oxlint/anti-slop/`
- Source path: `skills/install-anti-slop/assets/anti-slop/`

## Local policy

The project enables the generic rules except `no-array-filter-map` and `no-shape-in-symbol-names`. Effect rules remain disabled because the project does not depend on Effect. `no-runtime-typeof` allows checks inside type guards for external data handled by Convex actions and HTTP endpoints.
