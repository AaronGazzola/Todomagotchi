# Development Port Configuration

## Overview

The development server port is dynamically configured based on the `BETTER_AUTH_URL` environment variable to ensure consistency between the authentication URL and the actual server port.

## Implementation

### Package.json Dev Script

```json
"dev": "sh -c 'export $(cat .env | grep BETTER_AUTH_URL | xargs) && next dev --turbopack -p ${BETTER_AUTH_URL##*:}'"
```

### How It Works

1. **Load Environment Variable**: `export $(cat .env | grep BETTER_AUTH_URL | xargs)`

   - Reads the `.env` file
   - Filters for the `BETTER_AUTH_URL` line
   - Exports it as an environment variable in the shell

2. **Extract Port**: `${BETTER_AUTH_URL##*:}`

   - Uses bash parameter expansion to extract the port number
   - Removes everything up to and including the last colon
   - Example: `http://localhost:3002` → `3002`

3. **Start Next.js**: `next dev --turbopack -p ${BETTER_AUTH_URL##*:}`
   - Starts the Next.js development server with Turbopack
   - Uses the extracted port number via the `-p` flag

## Configuration

Set the desired port in `.env`:

```env
BETTER_AUTH_URL="http://localhost:3002"
```

The development server will automatically start on port `3002`.

## Why This Approach

- Ensures the server port matches the `BETTER_AUTH_URL` configuration
- Maintains a single source of truth for the port number
- Prevents authentication issues caused by port mismatches
- Works with npm scripts which don't automatically load `.env` files
