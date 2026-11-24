# Spider-River
A little web-swinging phone game made for River. Original characters and art, fan-made, not affiliated with any comic publisher.
Open index.html in a phone browser. v5: pick a world on the title screen (1 Neon City, 2 Ketchikan, Alaska, 3 Jungle Volcano Island); NEXT LEVEL after a win; ⏸ pauses. Controls (from v4): ◀ ▶ to run left or right (stop or turn back anytime), JUMP (tap again to flip), hold up top or SWING to web-swing either way, ZAP bad guys. SUIT UP! spends tokens & comic pages on gear; "Reset Progress" at the bottom of SUIT UP! (or ?reset=1) starts fresh in all 3 worlds.
Change the hero name in `game.js` (`HERO_NAME`).

## v5: three worlds
- Level art in img/lv/ (painted props + panoramas); the Ketchikan red truss bridge, school sign, signs, water, waterfalls and portals are drawn in code.
- Per-world progress in localStorage `spider-river-levels-v1`; one-time wipe marker `spider-river-reset-v5`.
