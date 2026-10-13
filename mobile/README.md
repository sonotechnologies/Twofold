# Twofold · mobile app (Phase 1)

React Native + Expo (SDK 57, TypeScript) with Expo Router. Backend is Supabase (see `../supabase/README.md`).
Visual design follows `../project/Twofold Design.dc.html`, direction 1a "Velvet".

## What's in Phase 1

| Area | Screens |
| --- | --- |
| Onboarding | Welcome · sign in with WhatsApp (you send us a code, so it's free) or Google · name + birthday (18+) · avatar builder |
| Pairing | Invite with code / WhatsApp / share link · enter a code · waiting · confirm · "You're linked" |
| Our Space | Home: both avatars, partner presence + mood, streak flame, bond score, rank, today's question |
| Chat | Realtime text, photos (compressed), voice notes, read receipts, offline cache, retry on failure |
| Daily question | Answer · partner's answer locked · reveal when both answered |
| Rank | Current rank, progress, all ranks, how points are earned |
| Couple Card | 9:16 Story and 1:1 Post, rendered to PNG (1080px wide) and shared |
| Us | Edit avatar, mood, "together since" date, sign out, delete account |

Not in Phase 1 (per the brief): pet and room, memories, leaderboard, badges, breakup UI, location, Premium, gifts, Wrapped, AI ("Soften this").
The database already supports ending a couple (used by account deletion); its screens come in Phase 2.

## Run it

```bash
cd mobile
npm install

# Try it without a backend: a built-in demo partner "Bella" joins your code, confirms, and replies.
npm run demo          # then press "a" for Android, "i" for iOS, or "w" for web

# Against Supabase (mobile/.env already points at the Twofold project)
npm start
```

Full setup (database, Google, WhatsApp, installing on a phone): [`docs/SETUP.md`](../docs/SETUP.md).

Voice notes, camera, image compression and sharing use native modules, so on a phone use a development build
(`npx expo run:android`, or `npx eas-cli@latest build --profile development`) rather than Expo Go.

Checks: `npx tsc --noEmit` (typecheck) and `npx expo-doctor`.

## Folder structure

```
mobile/
├── app.json                 Expo config: name, scheme "twofold", Android package, permissions
├── .env.example             Supabase keys / demo flag
└── src/
    ├── app/                 Routes (Expo Router). Every file is a screen.
    │   ├── _layout.tsx      Fonts, theme, session, and the gate that routes by stage
    │   ├── (onboarding)/    welcome, sign-in, about-you, avatar
    │   ├── (pair)/          invite, join, waiting, confirm
    │   ├── (main)/          Tabs: home, rank, you (custom floating tab bar)
    │   ├── chat.tsx         Full-screen chat (opened from the Chat tab)
    │   ├── question.tsx     Daily question
    │   ├── couple-card.tsx  Share card
    │   ├── linked.tsx       Pairing celebration
    │   └── edit-avatar.tsx
    ├── api/                 Backend interface + Supabase implementation + offline demo
    ├── state/               Session/stage, chat, home, presence, onboarding draft
    ├── components/
    │   ├── ui/              Text, Button, Screen, TextField, CodeInput, StepDots, BackButton
    │   ├── brand/           Logo, motion (flame, heartbeat, bob, confetti), chips, progress
    │   ├── avatar/          SVG avatar, editor, stage
    │   ├── chat/            Bubbles, voice player, composer
    │   └── cards/           Couple Card
    ├── constants/           Ranks, links, sample avatars
    ├── lib/                 Supabase client, cache, media (compression, voice preset), ids
    └── theme/               Design tokens (light/dark) and ThemeProvider
```

## How routing works

`state/session.tsx` works out a **stage** from the signed-in user, their profile and their couple:
`signedOut → needsProfile → unpaired → awaitingPartner | needsMyConfirm → active`.
The gate in `app/_layout.tsx` keeps each stage on its screens. Pairing confirmations and breakups arrive
over Supabase Realtime, so both phones move on together.

## Design notes and deviations

- Colours, type (Fredoka + Figtree), radii and motion come straight from the design. Light/dark follows the phone setting.
- Avatars are the design's geometric stand-ins, redrawn in SVG; swap `components/avatar/Avatar.tsx` when final illustration lands.
- **Rank thresholds follow the product brief** (500 / 2,000 / 5,000 / 15,000), not the sample numbers in the mock (1,000 / 3,000 / 7,500).
- The design's tab bar has Home, Chat, Memories, Map, Friends. Phase 1 ships Home, Chat, Rank, Us; Memories, Map and Friends join in later phases.
- Added for the brief's rules (not in the mock): "About you" step for the 18+ check, a confirm step for the inviter, Google sign-in, delete account.
- Phone sign-in is "Verify with WhatsApp" instead of SMS codes: the person sends a pre-filled message to the Twofold number, so nothing is paid per code.
- The invite code is 6 characters (brief) shown as `4K9·X2P`; the mock showed 7.
- Invites and cards link to the Play Store listing for `com.sonotechnologies.twofold` (`constants/links.ts`); it works once the app is published.
