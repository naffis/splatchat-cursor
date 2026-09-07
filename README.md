# SplatChat for Cursor

Official Cursor plugin for the [SplatChat](https://splatchat.com) MCP server. Agents can create AI characters, seed knowledge, join meetings with a face on camera, place phone calls, chat with memory, publish clips and embeds, and operate an X presence.

This is a single Cursor Plugin (`.cursor-plugin/plugin.json` at the repo root). Submit this repository URL at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). Do not package it as a multi-plugin marketplace.

## What SplatChat is

SplatChat is a face-to-face AI video chat platform. Characters have a 3D avatar, a voice, and memory that lasts between sessions. The same character can:

- Talk on a live video call
- Join Google Meet, Zoom, Microsoft Teams, Webex, and other browser rooms as a visible participant
- Place or answer US and Canada phone calls
- Host a solo livestream to any RTMP, RTMPS, or SRT destination
- Sit on a website as an embed
- Post talking-head clips and operate on X

The hosted MCP server exposes those surfaces as tools. Consumers still talk to characters on [splatchat.com](https://splatchat.com) or the widget. This plugin is for creators and operators who want an agent to build and run those characters.

## Install from Cursor

1. Install **SplatChat** from the Cursor Marketplace, or add this GitHub repository as a plugin.
2. Create an API key at [splatchat.com/workspace](https://splatchat.com/workspace). Copy it once. Keys look like `pk_…`.
3. In Cursor, open **Plugins → Configure** on SplatChat and paste the key into `SPLATCHAT_API_KEY`.

The plugin only declares the variable name. Cursor substitutes `${SPLATCHAT_API_KEY}` at runtime. Never commit a real key.

## MCP connection

| | |
| --- | --- |
| MCP URL | `https://mcp.splatchat.com/mcp` |
| Transport | Streamable HTTP |
| Auth | `Authorization: Bearer pk_…` |
| Docs | [splatchat.com/docs#mcp](https://splatchat.com/docs#mcp) |

```json
{
  "mcpServers": {
    "splatchat": {
      "url": "https://mcp.splatchat.com/mcp",
      "headers": {
        "Authorization": "Bearer ${SPLATCHAT_API_KEY}"
      }
    }
  }
}
```

Do not point this plugin at a different MCP URL. The workers.dev host is a smoke-test fallback only.

## Other MCP clients

The same URL and Bearer header work in Claude Desktop, Hermes, OpenClaw, and other Streamable HTTP clients.

Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "splatchat": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.splatchat.com/mcp",
        "--header",
        "Authorization:Bearer ${SPLATCHAT_API_KEY}"
      ]
    }
  }
}
```

Set `SPLATCHAT_API_KEY` in the client environment, or replace the placeholder with your key locally. Do not commit the key.

Remote clients that accept a URL plus headers can use the `mcp.json` snippet above as-is.

## Scopes

Mint the smallest key that covers the job. Common scopes:

| Scope | Typical tools |
| --- | --- |
| `characters` | `list_characters`, `get_character`, `create_character`, `start_avatar_training`, `get_avatar_status` |
| `kb` | `list_kb_documents`, `add_kb_document`, `upload_kb_document`, `search_kb` |
| `sessions` / `memory` | `chat`, `read_memories`, `write_memory`, `delete_memories` |
| `bots` | `join_meeting`, `leave_meeting`, `get_bot_recording`, `get_bot_deliverables` |
| `phone_calls` | `make_phone_call`, `provision_phone_number`, DNC tools |
| `broadcasts` | `start_broadcast`, `stop_broadcast`, `send_broadcast_chat` |
| `clips` | `create_clip`, `get_clip`, `list_clips` |
| `embeds` | `list_embed_tokens`, `create_embed_token` |
| `x` | `x_status`, `x_post`, `x_reply`, `x_quote`, `x_read_mentions`, `x_observe` |

Write tools fail with 401 or 403 when the key is missing or the scope is too narrow. `list_characters` is a good first check after install.

## Skills

- `splatchat-connect` : get a key, install, verify, and pick scopes
- `splatchat-sdr` : create a character, seed KB, provision a number, dial
- `splatchat-meeting-bot` : send an `avatar_ready` character into Meet, Zoom, or Teams

## Security

- Never commit `pk_` keys, stream keys, or phone numbers you do not own.
- Treat anyone who holds the key as able to launch bots, place calls, and post as the connected X account.
- Phone calls require a stored consent basis, US/Canada numbers, and 8am to 9pm callee-local hours. Cold-calling purchased lists is not supported.
- Meeting bots join as `Name (AI)`. Do not ask the product to hide that disclosure.
- Confirm with the user before `make_phone_call`, `join_meeting`, `start_broadcast`, `x_post`, or other actions that spend credits or contact people.

## Validate locally

```bash
node scripts/validate-plugin.mjs
```

## License

MIT © SplatChat
