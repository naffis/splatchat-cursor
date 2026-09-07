---
name: splatchat-connect
description: Connect an agent to SplatChat MCP. Use when installing the plugin, minting an API key, verifying the hosted MCP URL, or choosing workspace scopes for characters, chat, meetings, phone, KB, broadcasts, clips, embeds, or X.
---

# Connect to SplatChat MCP

SplatChat's hosted MCP is Streamable HTTP at `https://mcp.splatchat.com/mcp`. Auth is `Authorization: Bearer pk_…`. Do not invent a different MCP URL. The workers.dev host is a smoke-test fallback only.

## Get an API key

1. Sign in at [splatchat.com/workspace](https://splatchat.com/workspace).
2. Create a key. Copy it once. Keys look like `pk_…`.
3. Grant only the scopes the job needs (table below).
4. In Cursor, open **Plugins → Configure** on SplatChat and paste the key into `SPLATCHAT_API_KEY`.

Never write the key into the repo, `mcp.json`, or chat logs.

## Install the plugin

- Cursor Marketplace: install **SplatChat**, then configure `SPLATCHAT_API_KEY`.
- This repo: add `https://github.com/naffis/splatchat-cursor` as a plugin.
- Other clients: same URL and Bearer header. Claude Desktop can use `npx mcp-remote https://mcp.splatchat.com/mcp --header 'Authorization:Bearer pk_YOUR_KEY'`.

## Verify the connection

1. Confirm the client loaded the `splatchat` MCP server.
2. `initialize` should return `serverInfo.name = "splatchat"` and `protocolVersion` `2025-03-26`.
3. Call `list_characters`. A valid key returns public characters. A missing or invalid key fails writes and scoped reads with 401 or 403.
4. If the user wants a write check, call `get_character` on a character they own.

`tools/list` can succeed without a key because the catalog is public. A successful `list_characters` or a scoped write is the real auth check.

## Scopes

| Scope | Use when | Tools |
| --- | --- | --- |
| `characters` | Create or inspect personas | `list_characters`, `get_character`, `create_character`, `start_avatar_training`, `get_avatar_status` |
| `kb` | Seed creator knowledge | `list_kb_documents`, `get_kb_document`, `add_kb_document`, `upload_kb_document`, `delete_kb_document`, `search_kb` |
| `sessions` / `memory` | Text chat and memory | `chat`, `read_memories`, `write_memory`, `delete_memories` |
| `bots` | Meeting presence | `join_meeting`, `leave_meeting`, `get_meeting_bot`, `list_meeting_bots`, `get_bot_recording`, `get_bot_deliverables` |
| `phone_calls` | Dial or answer a line | `make_phone_call`, `end_phone_call`, `get_phone_call`, `list_phone_calls`, `list_scheduled_phone_calls`, `cancel_scheduled_phone_call`, `list_phone_numbers`, `provision_phone_number`, `map_phone_number`, `release_phone_number`, `list_do_not_call`, `add_do_not_call`, `remove_do_not_call` |
| `broadcasts` | Solo livestream | `start_broadcast`, `stop_broadcast`, `get_broadcast`, `list_broadcasts`, `send_broadcast_chat` |
| `clips` | Talking-head clips | `create_clip`, `get_clip`, `list_clips` |
| `embeds` | Site widgets | `list_embed_tokens`, `create_embed_token`, `update_embed_token`, `delete_embed_token` |
| `x` | X presence | `x_status`, `x_post`, `x_reply`, `x_quote`, `x_read_mentions`, `x_search`, `x_send_dm`, `x_like`, `x_follow`, `x_observe` |

Also present: `create_linear_ticket`, `draft_email` (character-connected tools). REST lives at `https://splatchat.com/api/v1` with the same Bearer key.

## Agent rules

- Use `https://mcp.splatchat.com/mcp` only.
- Ask the user for a key. Do not scrape one from their machine or invent a placeholder that looks real.
- Confirm before calls, meetings, broadcasts, clips, or X posts. Those spend credits or contact people.
- Phone, meeting, and broadcast surfaces disclose that the speaker is an AI. Do not try to hide that.
- For SDR dials see `splatchat-sdr`. For Meet/Zoom/Teams see `splatchat-meeting-bot`.
