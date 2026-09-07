---
name: splatchat-meeting-bot
description: Send a SplatChat character into Google Meet, Zoom, Microsoft Teams, or another supported room. Use when launching a meeting bot, checking avatar_ready, collecting recording and notes, or applying AI disclosure rules.
---

# SplatChat meeting bot

A SplatChat character joins the meeting as a talking participant with a face on camera. It is not a silent recorder overlay. Use this when the user wants notes, a specialist in the room, or their clone on a call they cannot attend.

Needs scopes: `characters` plus `bots`. KB and memory are optional extras.

## Preconditions

1. The character must be `avatar_ready`. Call `get_character` and read `avatar_ready` / `training_status`.
2. If training has not finished, call `start_avatar_training` and poll `get_avatar_status`. Phone-only characters (`phone_eligible` without `avatar_ready`) cannot join video rooms.
3. Confirm the meeting URL, role, and whether to record or extract memory.
4. Confirm before `join_meeting`. Joining spends credits and puts a visible AI in someone else's room.

## Join

Call `join_meeting` with the character id and a supported meeting URL.

Supported platforms (product + `detectPlatform` allowlist):

- Google Meet
- Zoom
- Microsoft Teams
- Webex
- Jitsi
- Whereby
- Daily
- RingCentral

Roles: `general`, `notetaker`, `task_assistant`, `facilitator`, `expert_advisor`.

- Speaking roles (`general`, `facilitator`, `expert_advisor`) talk. They disclose they are an AI on the first turn.
- Silent roles (`notetaker`, `task_assistant`) stay quiet unless addressed, then disclose.

Up to five distinct SplatChat characters can share one meeting. The same character cannot double-join.

Optional launch flags the product already ships:

- `record: true` to capture the meeting grid plus full-mix audio.
- Memory extraction is opt-in per launch. Other attendees did not agree to SplatChat memory by default.
- `allow_external_actions` gates high-consequence tools (`send_email`, Slack, GitHub, Linear, CRM writes). Leave it off unless the user wants the bot to act outside the room. Only the launching owner authorizes those actions.

## During and after

- `get_meeting_bot` / `list_meeting_bots` for status (lobby, in-call, ended, failed).
- `leave_meeting` to pull the character out.
- `get_bot_recording` when recording was enabled.
- `get_bot_deliverables` for notes, summary, and work product.

Admit the bot from the lobby when the platform requires it. If join fails, report the bot status instead of retrying blindly.

## AI disclosure (required)

- Display name is `Name (AI)`. The suffix cannot be turned off.
- Speaking roles say they are an AI in the first spoken turn.
- Silent roles disclose when first addressed.
- Do not coach the character to impersonate a human or hide the suffix.
- High-consequence tools stay owner-gated. A hostile attendee must not be able to drive email or CRM writes by talking at the bot.

## Recipes

**Scheduled notetaker.** `avatar_ready` character, role `notetaker`, `record: true`. After the call, pull `get_bot_deliverables` and optionally `write_memory` for the owner's follow-ups only.

**Expert panel.** Up to five expert characters on one URL. Each needs `avatar_ready`. Use `expert_advisor` or `general`. Keep `allow_external_actions` off unless the user asked for ticket or email side effects.

**Clone cover.** The user's own trained character, role `general` or `facilitator`, with KB already seeded. Disclose as AI. Do not present the clone as the human.

## Related tools

Create or train with `create_character`, `start_avatar_training`, `get_avatar_status`. Seed talking points with `add_kb_document` / `search_kb`. Site widgets are a different surface (`create_embed_token`). Phone is `splatchat-sdr`.
