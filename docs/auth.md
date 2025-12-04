# Authentication Guide

This document covers all authentication methods supported by the Metabase MCP server, including the new Google SSO support.

## Authentication Methods Overview

The MCP server supports three authentication methods:

| Method | Best For | Setup Complexity |
|--------|----------|------------------|
| **API Key** | Production, automated systems | Simple |
| **Email/Password** | Development, personal use | Simple |
| **Google SSO** | Organizations using Google Workspace | Moderate |

## Method 1: API Key Authentication (Recommended)

API key authentication is the simplest and most reliable method for production use.

### Setup

1. Generate an API key in Metabase:
   - Go to **Admin Settings > Authentication > API Keys**
   - Create a new API key with appropriate permissions

2. Configure the environment:
   ```bash
   export METABASE_URL=https://your-metabase-instance.com
   export METABASE_API_KEY=mb_your_api_key_here
   ```

### Advantages
- Stateless authentication (no session management)
- No token expiration concerns
- Works in headless/CI environments
- Recommended by Metabase for API access

### Limitations
- Requires admin access to generate keys
- May be disabled by organization policy

---

## Method 2: Email/Password Authentication

Session-based authentication using Metabase credentials.

### Setup

```bash
export METABASE_URL=https://your-metabase-instance.com
export METABASE_USER_EMAIL=your_email@example.com
export METABASE_PASSWORD=your_password
```

### How It Works
1. MCP server calls `/api/session` with credentials
2. Metabase returns a session token
3. Token is used for subsequent API requests
4. Sessions typically last 14 days

### Limitations
- Not available if SSO is enforced
- Password stored in environment variable
- Session can expire during long-running operations

---

## Method 3: Google SSO Authentication

For organizations using Google Sign-In with Metabase. This method allows users to authenticate using their Google Workspace credentials.

### Prerequisites

1. **Metabase Configuration**: Your Metabase instance must have Google Sign-In enabled
   - Admin > Settings > Authentication > Google Sign-In
   - Note the Google Client ID configured there

2. **Google OAuth Setup**: The OAuth client must allow the redirect URI used by the MCP server

### Configuration

```bash
# Required
export METABASE_URL=https://your-metabase-instance.com
export METABASE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Optional (enables automatic token refresh)
export METABASE_GOOGLE_CLIENT_SECRET=your-client-secret

# Optional (defaults shown)
export METABASE_AUTH_STORE_PATH=~/.metabase-mcp/auth.json
export METABASE_OAUTH_CALLBACK_PORT=9876
```

### Authentication Flow

Google SSO requires a one-time interactive browser authentication:

```bash
# Step 1: Check current auth status
npx metabase-mcp auth status

# Step 2: Initiate login (opens browser)
npx metabase-mcp auth login

# Step 3: Complete Google sign-in in browser

# Step 4: Verify authentication
npx metabase-mcp auth status

# Step 5: Start using the MCP server normally
npx metabase-mcp
```

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Server    │     │  Google OAuth   │     │    Metabase     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. Generate auth URL  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │ 2. Open browser       │                       │
         │                       │                       │
         │ 3. User signs in      │                       │
         │<──────────────────────│                       │
         │    (callback with     │                       │
         │     auth code)        │                       │
         │                       │                       │
         │ 4. Exchange code      │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │ 5. Receive tokens     │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │ 6. Exchange ID token for session              │
         │──────────────────────────────────────────────>│
         │                       │                       │
         │ 7. Receive Metabase session token             │
         │<──────────────────────────────────────────────│
         │                       │                       │
         │ 8. Store tokens locally                       │
         │                       │                       │
```

### Token Storage

Tokens are stored locally at `~/.metabase-mcp/auth.json` (configurable via `METABASE_AUTH_STORE_PATH`).

The stored data includes:
- Metabase session token
- Google OAuth tokens (for refresh)
- Session expiration timestamp
- Metabase URL (to prevent using tokens with wrong instance)

**Security**: Tokens are encrypted at rest using AES-256-GCM. The encryption key is derived from machine-specific data, providing obfuscation but not strong security. For high-security environments, consider using API key authentication instead.

### Token Refresh

If `METABASE_GOOGLE_CLIENT_SECRET` is provided:
- Google tokens can be refreshed automatically
- Session can be renewed without user interaction
- Recommended for unattended/long-running use

Without the client secret:
- Tokens cannot be refreshed
- User must re-authenticate when session expires (typically 14 days)

### CLI Commands

```bash
# Show authentication status
npx metabase-mcp auth status

# Authenticate with Google (opens browser)
npx metabase-mcp auth login

# Clear stored credentials
npx metabase-mcp auth logout

# Show help
npx metabase-mcp auth
npx metabase-mcp --help
```

### Troubleshooting

#### Error: "redirect_uri_mismatch"

The Google OAuth client doesn't have the MCP callback URL authorized.

**Solution**: Add `http://localhost:9876/callback` to the authorized redirect URIs in Google Cloud Console, or use a different port:

```bash
export METABASE_OAUTH_CALLBACK_PORT=3000
```

#### Error: "No valid Google SSO session found"

The stored session has expired or doesn't exist.

**Solution**: Re-authenticate:
```bash
npx metabase-mcp auth login
```

#### Error: "Google authentication failed"

Your Google account may not have access to the Metabase instance.

**Solution**: Verify that:
1. Your Google account email has access to Metabase
2. The Google Client ID matches what Metabase is configured with
3. Google Sign-In is enabled in Metabase admin settings

#### Using Wrong Metabase Instance

If you switch between Metabase instances, clear the stored auth:

```bash
npx metabase-mcp auth logout
export METABASE_URL=https://new-metabase-instance.com
npx metabase-mcp auth login
```

---

## Current Limitations

### Google SSO Limitations

1. **No UI Integration**: Claude Desktop doesn't currently support custom UI elements like a "Login with Google" button. Authentication must be done via CLI command before using the MCP server.

2. **Interactive Setup Required**: The initial authentication requires a browser-based OAuth flow. This cannot be done in fully headless environments without human interaction.

3. **Redirect URI Configuration**: The Google OAuth client must have `http://localhost:9876/callback` (or custom port) as an authorized redirect URI. This may require coordination with your Google Workspace admin.

4. **Single Instance**: Token storage is per-Metabase-instance. Switching between instances requires re-authentication.

5. **Token Security**: While tokens are encrypted at rest, the encryption is primarily for obfuscation. For high-security requirements, API key authentication is recommended.

### Future Improvements

The following improvements are planned or under consideration:

- [ ] System keychain integration for more secure token storage
- [ ] Support for multiple Metabase instance profiles
- [ ] MCP tool for triggering authentication from chat
- [ ] Automatic re-authentication prompts when session expires

---

## Authentication Priority

When multiple authentication methods are configured, the MCP server uses this priority:

1. **API Key** (`METABASE_API_KEY`) - highest priority
2. **Google SSO** (`METABASE_GOOGLE_CLIENT_ID`)
3. **Email/Password** (`METABASE_USER_EMAIL` + `METABASE_PASSWORD`)

To use a specific method, only configure the environment variables for that method.

---

## Security Best Practices

1. **Use API Keys for Production**: They're stateless, don't expire, and don't require browser interaction.

2. **Rotate Credentials Regularly**: Especially for shared environments.

3. **Use Environment Variables**: Never hardcode credentials in configuration files committed to version control.

4. **Limit API Key Permissions**: Create API keys with minimum necessary permissions.

5. **Secure Token Storage**: The default token storage location (`~/.metabase-mcp/`) should have appropriate file permissions (mode 0600).

6. **Clear Credentials When Done**: Use `npx metabase-mcp auth logout` to remove stored tokens when no longer needed.
