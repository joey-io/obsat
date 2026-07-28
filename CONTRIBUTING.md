# Contributing

## Add an adapter

1. Create one file in `src/adapters`.
2. Export one adapter object.
3. Register and export it from `src/index.js`.
4. Add mocked tests. Tests must not depend on a live provider.
5. Document coverage, credentials, attribution, license, and limitations in the README.

Adapters must return an array of observations. The runtime converts each observation to the stable Obsat evidence shape.

## Required adapter fields

- `id`
- `name`
- `observe(request, context)`

Recommended fields:

- `kind`
- `provider`
- `collections`
- `coverage`
- `status`
- `env`
- `attribution`
- `license`

## Checks

```bash
npm run check
```

Keep the core dependency-free unless a dependency is clearly necessary and approved.
