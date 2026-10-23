# PRD: LAST LIFT

**Pixathon problem statement 2: Puzzle Passwords.**
**Goal line (shown on screen):** Find the clues, build the elevator passcode, and escape before Chime reaches you.

## 1. Concept
Pocket Palace, a children's arcade inside a mall, closed for good in June 1987. You are locked inside at night. The only way out is the elevator, which needs a 6-character passcode. The passcode is hidden in the room as 8 clues. A 3-minute timer runs, and a mascot robot named Chime creeps closer. If time runs out, Chime gets you.

Between attempts, short 8-bit lore scenes reveal what happened to the six children who never left Pocket Palace. The passcode is the last thing they left behind.

## 2. PS2 must-haves
| Requirement | How we meet it |
|---|---|
| Runs in the browser | Static web app, no build step |
| At least 8 rules, clues or levels | 8 clues, each mapped to one passcode rule |
| Live feedback on which rules pass and fail | Keypad checklist ticks green or red as the player types. A rule appears once its clue is found |
| A clear win state | Elevator opens, ending scene plays |
| Visible "don't use a real password" note | On the keypad: "Demo only. Never enter a real password." |
| Original, not a clone of a famous password game | A deduction escape room with lore. The password is found in the world, not typed against rules |

## 3. Judging map (100 points)
- **Smart use of AI (40):** keep AI_LOG.md current. Use a brute-force validator to prove one valid passcode. Record one real AI mistake.
- **Creativity and originality (20):** password-as-escape-room plus lore minigames tied to the clues.
- **Usability (15):** goal line, first clue highlighted, visible timer, no instructions needed.
- **Feel and design (10):** pixel art, ambient audio, Chime's 3 approach stages, jumpscare.
- **Pitch (10):** 60 seconds, 30 of them on how AI was used.
- **Fun factor (5):** "one more try" from the timer and lore scenes.

## 4. Story (original IP, implied horror only)
- **Setting:** Pocket Palace Arcade, Sunnyday Plaza mall. Closed June 1987, six weeks after a birthday party.
- **Mascots:** three animal mascots built by the owner, Mr. Orrin Vale.
  - **Chime**, the bellhop bunny. Guards the elevator. Main antagonist.
  - **Biscuit**, the baker bear. Lobby statue.
  - **Pip**, the ringmaster parrot. Prize counter statue.
- **What happened:** six children went to a birthday party at Pocket Palace and never came home. The mascots were found in the workshop afterward, and the mall quietly closed. The children's spirits are bound to the mascots, and at night the mascots wander, looking for someone to stay with them.
- **You:** the night cleaner's kid, sneaking in to find out what happened to your older sister, Mia, the first name on the missing poster.
- **Tone rule:** the children are never shown being harmed. Everything is implied: empty shoes, a stopped clock, a party that never ended. No gore, no on-screen death of children.

## 5. Core loop
1. Title screen: name, goal line, "contains a jumpscare" notice, mute toggle, Play.
2. Room screen: one pixel scene with 8 clickable objects. A highlight pulses on the first object.
3. Clicking an object shows its clue and unlocks one rule on the keypad checklist.
4. Keypad: 6-character input, live checklist, "Demo only. Never enter a real password."
5. Timer: 3:00 countdown, always visible.
6. Chime stages: far at 3:00, mid at 1:30, at the door at 0:30. Audio and visuals escalate each stage.
7. Win: correct code, elevator opens, final lore scene, "Play again".
8. Lose: timer hits 0, jumpscare, lore scene, "Try again" (no reload).

## 6. The 8 clues and the passcode
Passcode: **3M5#76** (spoiler, keep off screen). A brute-force check across the alphabet (digits, A-Z, `#*!`) confirms this is the only code that satisfies all rules.

| # | Object | Clue shown | Rule on keypad |
|---|---|---|---|
| 1 | Party table | Six paper hats | Passcode has 6 characters |
| 2 | Lobby | Three mascot statues | First character is a digit equal to the number of statues (3) |
| 3 | Missing poster | First name is Mia | Second character is the letter M |
| 4 | Wall calendar | Torn at June | Last character is the digit for the month Pocket Palace closed (6) |
| 5 | Radio | Three beats, then a hiss | The 4th character is the symbol `#` |
| 6 | Ticket stub | "ADMIT 21" | The four digits add up to 21 |
| 7 | Plaque | "No two children alike" | No character repeats |
| 8 | Elevator panel | Buttons 5 and 7 are worn, lowest pressed first | The digits on each side of `#` are 5 and 7, in that order |

Round 2 (stretch): shorter timer, 2 new rules, same room.

## 7. Lore scenes (8-bit, 20 to 40 seconds each)
Shown in order, one after each attempt (win or lose). Progress saved in localStorage (try/catch).
1. **The Party:** side-scroller. Walk right through the arcade collecting 6 balloons. Each balloon shows a child's name.
2. **Closing Day:** hide-and-seek. Dodge Biscuit and Pip to reach the elevator. The screen goes dark before the doors close. Nothing is shown after that.
3. **The Elevator (win only, final):** the six children's lights appear one by one. The mascots go still. Mia waves.
Tier 2: static pixel panels with text. Tier 3: playable minigames.

## 8. Art and audio
- **Art:** 16-bit pixel style, one palette (4 to 6 colors) and one font, via CSS variables. Dark room, warm lamp light, cold red for Chime.
- **Audio:** low ambient loop (Suno), Web Audio blips for UI (`audio.js`), creak, radio hiss, jumpscare sting (ElevenLabs).
- **Jumpscare:** at most 1 second, loud but not extreme. No flashing faster than 3 times per second.

## 9. Safety and usability
- "Contains a jumpscare" notice on the title screen.
- Mute toggle always visible.
- Reduced-motion setting disables shake and flashing.
- Works on keyboard, mouse and touch.
- No real-password entry anywhere. Keep the note visible.

## 10. Scope tiers
- **Tier 1 (must ship by 4:20):** room, 8 clues, keypad with live checklist, timer, win, lose with jumpscare, restart.
- **Tier 2 (by 5:10):** Chime stages, ambient audio, pixel sprites, title screen, static lore panels.
- **Tier 3 (stretch):** playable lore minigames, Round 2.

## 11. Timeline
- 4:00 to 4:20: Tier 1 playable. Commit.
- 4:20 to 5:10: clues, rule engine, Chime stages, lore panels.
- 5:10 to 5:35: art, sound, jumpscare, polish.
- 5:35 to 5:50: deploy to GitHub Pages, one stranger playtests.
- 5:50 to 6:00: 60-second pitch.

## 12. Acceptance checklist
- [ ] Opens and plays from the live link on a phone.
- [ ] All 8 rules show live pass/fail.
- [ ] Only `3M5#76` unlocks the elevator.
- [ ] Timer and Chime stages work, jumpscare plays on loss.
- [ ] Restart works without reloading.
- [ ] "Demo only. Never enter a real password." is visible.
- [ ] Mute works. No console errors.
- [ ] AI_LOG.md has 5 to 10 prompts, the tools, and one real AI mistake.

## 13. Pitch outline (60 seconds)
- 0 to 10 s: the hook. "Escape a closed arcade by deducing a password from clues before a mascot reaches you."
- 10 to 30 s: live demo. Find a clue, watch a rule tick, beat the timer.
- 30 to 55 s: how we used AI. Brainstormed the twist, built with Antigravity, Claude Code and Codex, and the validator that proved one valid code and caught a broken clue.
- 55 to 60 s: the lore line and the call to play.
