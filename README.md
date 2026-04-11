# LambdaTest MCP Server

A Model Context Protocol (MCP) server for LambdaTest Automation. This tool allows AI assistants (like Claude, Gemini, etc.) to interact with your LambdaTest App Automation sessions to fetch failed tests, extract error logs, and retrieve video URLs for debugging.

## Features

- **get_build_failures**: List all failed test sessions in a build.
- **get_session_error**: Extract relevant error blocks from instrumentation logs (token-efficient).
- **get_session_video**: Get the direct S3 video URL for a session.

## Configuration

### Environment Variables

The server requires the following environment variables:

- `LT_USERNAME`: Your LambdaTest username.
- `LT_ACCESS_KEY`: Your LambdaTest access key.

### Usage with MCP Clients (e.g., Claude Desktop)

Add the following to your MCP configuration file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lambda-test-mcp": {
      "command": "npx",
      "args": ["-y", "lambda-test-mcp"],
      "env": {
        "LT_USERNAME": "YOUR_USERNAME",
        "LT_ACCESS_KEY": "YOUR_ACCESS_KEY"
      }
    }
  }
}
```

## Development

Build the project:

```bash
npm install
npm run build
```

Link for local testing:

```bash
npm link
```

## Publishing

This project uses GitHub Actions to publish to npm. To trigger a release:

1. Update the version in `package.json`.
2. Commit and push:

```bash
git add package.json
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin main --tags
```

Ensure you have added `NPM_TOKEN` to your GitHub repository secrets.

## License

MIT
