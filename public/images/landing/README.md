# Landing page images

All images in this folder are **AI-generated**. They were made on 2026-11-01
with the `foundry-image` MCP tool (`tools/foundry-image-mcp`), which calls the
`gpt-image-2.5-sunburst` deployment (an OpenAI GPT image model) on Microsoft
Foundry. They contain no text; every word on the page is HTML.

## Shipped files

| File | Used for | Source render | Processing |
| --- | --- | --- | --- |
| `hero-seal.webp` | Fixed stage poster: hero backdrop, the no-WebGL / reduced-motion fallback, and the image under the live particle scene | Prompt 5, `quality: high`, 1536×1024 | WebP q86 (210 KB); `next/image` serves resized WebP |
| `fractured-card.webp` | Problem section art | Prompt 6, `quality: high`, 1536×1024 | WebP q86 (87 KB) |
| `vellum-dossier.webp` | Final call-to-action backdrop | Prompt 7, `quality: high`, 1536×1024 | WebP q86 (129 KB) |
| `og.jpg` | Open Graph / Twitter card | Crop of prompt 5 | 1200×630 JPEG q84 (160 KB) |

All are decorative on the page (`alt=""`); the Open Graph image has its own alt text in the page metadata.

## Generation log (7 images in total)

| # | Quality, size | Purpose | Kept? |
| --- | --- | --- | --- |
| 1 | low, 1024×1024 | Connectivity check required before starting ("a single small dark navy sphere on a plain light grey background, minimal studio render") | No |
| 2 | low, 1536×1024 | Exploration: hero convergence | No (direction confirmed) |
| 3 | low, 1536×1024 | Exploration: fractured glass card | No (direction confirmed) |
| 4 | low, 1536×1024 | Exploration: vellum sheets (first attempt hit the Foundry rate limit and was retried; failed calls produce no image) | No (direction confirmed) |
| 5 | high, 1536×1024 | Final hero / poster | Yes |
| 6 | high, 1536×1024 | Final fractured card | Yes |
| 7 | high, 1536×1024 | Final vellum dossier | Yes |

### Final prompts

**5 — hero-seal**

> Abstract cinematic 3D render, wide composition. Deep ink-navy darkness (#070b16) filling the frame. On the left third, thousands of tiny luminous particles and small faceted crystal fragments drift scattered and out of focus, some glowing warm amber, most cool white. From the center they organise into graceful curved strands of fine glowing filaments and beaded particles that stream toward the right third, where they converge into a precise circular seal made of fine concentric rings and radial hairlines, glowing pale teal-white with a soft bright core. Keep the left-center area dark and calm for overlaid headline typography. Volumetric soft light, shallow depth of field, subtle film grain, restrained, premium, elegant. Absolutely no text, no letters, no numbers, no logos, no symbols.

**6 — fractured-card**

> Abstract macro 3D render of a thin rectangular plate of dark smoked glass, the proportions of a payment card, floating at a slight angle in a deep navy-black void (#070b16). A single jagged hairline fracture runs diagonally across it, glowing warm amber-orange from inside like molten light; a few small glass shards and fine dust particles drift away from the crack toward the right. Cool muted teal rim light on the glass edges. Composition: the plate occupies the right two-thirds, the left third is dark empty space. Cinematic, minimal, shallow depth of field, subtle film grain, premium editorial mood. Absolutely no text, no letters, no numbers, no logos, no chip, no card markings.

**7 — vellum-dossier**

> Top-down abstract still life, wide composition: five blank sheets of translucent frosted vellum layered at slight, precise angles, resting on a deep ink-navy matte surface (#0a1020). Every sheet is perfectly blank, with no writing or marks. The top sheet carries a single small round blank blind-embossed seal impression made of fine concentric rings, catching a thin pale teal highlight. Edges of the sheets catch thin lines of cool teal-white light; soft caustic light patterns fall across the right side. The stack sits right of center, leaving calm dark space on the left. Precise, forensic, archival, quiet, premium editorial photography, subtle grain. Absolutely no text, no writing, no letters, no numbers, no logos.

### Exploration prompts (low quality, not shipped)

2. Abstract cinematic 3D render. Deep ink-navy darkness (#060a14). Thousands of tiny luminous particles and very thin glowing filaments drift as scattered fragments on the left side, then stream in graceful curved strands toward the right side where they converge into a precise circular seal made of fine concentric rings and radial hairlines, glowing pale teal-white. A few stray fragments on the far left glow warm amber. Volumetric soft light, shallow depth of field, subtle film grain, restrained, premium, elegant, lots of negative space in the left-center for headline typography. Absolutely no text, no letters, no numbers, no logos, no symbols.
3. Abstract macro 3D render of a thin plate of dark smoked glass floating in a deep navy-black void. A single jagged hairline fracture runs diagonally across it, glowing warm amber-orange from inside like molten light; tiny shards and dust particles separate from the crack. Cool rim light in muted teal on the glass edges. Cinematic, minimal, shallow depth of field, subtle film grain, premium editorial mood. Absolutely no text, no letters, no numbers, no logos.
4. Top-down abstract still life: several blank sheets of translucent frosted vellum and thin glass slides layered at slight angles on a deep navy-black surface, each perfectly blank with no writing, edges catching a thin line of pale teal light, soft caustic reflections, one sheet has a small round blank embossed seal impression. Precise, forensic, archival, calm, premium editorial photography look, subtle grain. Absolutely no text, no writing, no letters, no numbers, no logos.

The raw PNGs stay in `generated-images/` (git-ignored) and are not committed.
