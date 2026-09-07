---
name: splatchat-sdr
description: Prep a SplatChat SDR character that can dial. Use when creating a sales or callback persona, seeding creator KB, provisioning a US/Canada number, or placing an outbound phone call with phone_calls scope.
---

# SplatChat SDR recipe

Build a dialable character in four steps: create the persona, seed knowledge, provision a number, then dial. Audio phone works as soon as the character is `phone_eligible`. Avatar training is optional and is required only for video, meeting bots, and clips.

Needs scopes: `characters`, `kb`, `phone_calls`.

## 1. Create the character

Call `create_character` with a name, tagline, backstory, speaking style, and profession. Category `expert` or `assistant` fits outbound callbacks. Voice presets include Eve, Ara, Sal, Rex, Leo.

`create_character` returns `phone_eligible=true` without avatar training. For video later, call `start_avatar_training` and poll `get_avatar_status` until `avatar_ready`.

Confirm the id with `get_character`. Read `phone_eligible` before you dial.

## 2. Seed the knowledge base

Use creator-scope KB so the character can answer product questions on the call.

- `add_kb_document` for short copy (offer, pricing, FAQ, objection notes).
- `upload_kb_document` for files.
- `search_kb` to confirm the material is retrievable.
- `list_kb_documents` / `get_kb_document` / `delete_kb_document` to inspect or replace stale docs.

Keep the KB factual. Do not load purchased lead lists or third-party personal data the user does not have rights to use.

## 3. Provision a number

- `list_phone_numbers` first. Reuse a mapped number when one exists.
- `provision_phone_number` to get a SplatChat US/Canada number for the character.
- `map_phone_number` to point an existing number at this character for inbound.
- `release_phone_number` only when the user asks to tear the line down.

Inbound: customers can call the mapped number and the character answers. Outbound: you still pass `to_number` on `make_phone_call`.

## 4. Dial

Call `make_phone_call` only after the user confirms the callee, the goal, and the consent basis.

Required launch fields (public phone docs):

- `character_id`
- `to_number` (E.164, US or Canada only; +1-900 is blocked)
- `call_goal` (what to accomplish)
- `on_behalf_of` (who the character represents)
- `consent_basis` (why this number may be called; stored as an immutable record)
- `callee_timezone` when you know it (calling hours are 8am to 9pm callee-local)

Sandbox keys can only call the account's own number.

Then:

- `get_phone_call` for status, transcript, notes, and callback-requested.
- `end_phone_call` to hang up.
- `list_phone_calls` / `list_scheduled_phone_calls` / `cancel_scheduled_phone_call` for the queue.

Billing is answered minutes only. Busy and no-answer do not charge.

## Compliance (do not skip)

- The character says it is an AI in its first sentence, names who it is calling for, and offers a callback number.
- Calling hours are enforced. A scheduled call is re-checked before it dials.
- If the person says to stop calling, the character records it and hangs up. Use `add_do_not_call` / `list_do_not_call` / `remove_do_not_call` for the account block list.
- Cold-calling purchased lists is not a supported use case.
- Confirm every outbound dial with the user. Anyone holding the `phone_calls` key can place calls.

## After the call

Read `get_phone_call` notes: summary, outcome, action items, callback-requested. Write durable facts with `write_memory` only when the user wants the character to remember this person on the next chat. Do not store other participants' personal data without a reason the user states.
