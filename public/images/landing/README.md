# Landing page images (v2)

Every photograph and texture in this folder is **AI-generated**, made on
2026-11-01 with the `foundry-image` MCP tool (`tools/foundry-image-mcp`), which
calls the `gpt-image-2.5-sunburst` deployment (an OpenAI GPT image model) on
Microsoft Foundry. None of them contains text: every word on the page, including
the records printed on the 3D paper, is HTML or drawn in code from the demo data.
On the page they are decorative (`alt=""`); the Open Graph image has its own alt
text in the page metadata.

**This round: 11 images (4 low, 2 medium, 5 high).** The 7 images of v1 (the navy
particle look) are no longer shipped and their files were deleted. A request that hit
the Foundry rate limit produced no image and is not counted.

## Method

Prompts are written as studio briefs: concrete nouns, lens, light, materials, wear,
a hex palette, the surface, where the empty space for type goes, and the aspect.
One fixed style paragraph opens every scene prompt so the set reads as one shoot.
Avoided on purpose: cinematic, abstract, premium, elegant, glowing, luminous,
volumetric, particles, bokeh, shallow depth of field, 3D render. Each result was
opened and checked against the page's blacklist (glow, particles or bokeh, a
symmetric orb, plastic CGI sheen, generated text). Transparent cut-outs were also
composited on paper and on vermilion to check the edges: the halo visible in the
tool's preview is preview-only (those pixels have alpha 0; about 2% of pixels are
partially transparent, all on the object's edge). No image had to be regenerated.

**Style paragraph** (scene prompts 2–4, 5, 6, 11):

> Studio product photograph for an editorial spread. 100mm lens at f/8, everything in focus. Light: one large softbox from camera-left, a hard raking light from the right, long soft-edged shadows. Surface: a seamless sweep of warm off-white cold-pressed cotton paper (#E9E4D8). Palette strictly limited to warm paper #E9E4D8, manila #D8C79E, near-black ink #111111, stamp vermilion #E5391C and aged brass #A8834A. Real materials with honest wear: slight paper curl, softened corners, a faint fingerprint, specks of dust. Every paper surface is blank: no text, no letters, no numbers, no logos, no barcodes anywhere.

## Shipped files

| File | Used for | From | Processing |
| --- | --- | --- | --- |
| `evidence-spill.webp` | Hero still: the static composition when the 3D scene does not run (reduced motion, no or software WebGL, no JS) | #5 | WebP q84, 1536×1024 |
| `og.jpg` | Open Graph / Twitter card | #5, centre crop | JPEG q84, 1200×630 |
| `case-assembling.webp` | Pipeline still when the scene does not run | #11 | WebP q84, 1536×1024 |
| `case-filed.webp` | "Filed" section still when the scene does not run | #6 | WebP q84, 1536×1024 |
| `embosser.webp` | Verdict section: the press between the giant word and its outline | #7 (transparent) | trimmed to the object, 800 px wide, WebP q84 with alpha |
| `receipt.webp` | The receipt that crosses from the problem room into the pipeline | #8 (transparent) | trimmed, WebP q86 with alpha |
| `tex-cotton.webp` | 3D scene: paper stock under the code-drawn records, bump map | #9 | 512×512, mirrored repeat |
| `tex-manila.webp` | 3D scene: folder board and kraft tags | #10 | 512×512, mirrored repeat |

## Generation log

| # | Quality, size | Purpose | Shipped |
| --- | --- | --- | --- |
| 1 | low, 1024×1024, `background: transparent` | Test whether transparent PNG works on this deployment (it does), and first look at the embosser | No |
| 2 | low, 1536×1024 | Contact sheet: overhead spill of the case file | No (chose this art direction) |
| 3 | low, 1024×1536 | Contact sheet: rubber stamp and impression, portrait-size test (accepted) | No |
| 4 | low, 1536×1024 | Contact sheet: closed, tied file | No |
| 5 | high, 1536×1024 | Final hero spill | Yes |
| 6 | high, 1536×1024 | Final closed file | Yes |
| 7 | high, 1024×1024, transparent | Final embosser cut-out | Yes |
| 8 | high, 1024×1536, transparent | Final receipt cut-out | Yes |
| 9 | medium, 1024×1024 | Cotton paper texture | Yes |
| 10 | medium, 1024×1024 | Manila board texture | Yes |
| 11 | high, 1536×1024 | Pipeline still (added after the first review: without the scene the pipeline's right half was empty) | Yes |

## Prompts

**1** (low, transparent)
> Product photograph on a transparent background, isolated object only, no surface, no shadow plate. 100mm macro lens at f/8, camera at 30 degrees above the object. One large softbox from camera-left, a hard raking light from the right. Subject: an old desk embossing seal press made of cast iron painted near-black (#111111) with an aged brushed-brass (#A8834A) circular die and lever handle, small paint chips on the edges, brass slightly tarnished with a faint fingerprint. No text, no letters, no numbers, no logos, no engravings on the die.

**2** (low) — style paragraph, then:
> Subject, shot from directly overhead: the contents of a disputed-payment case file spilled loosely across a table. A manila case folder lying half open; three blank carbon-copy forms with perforated tear-off edges, one with a faint blue-black carbon smudge; two curling thermal receipts; a translucent glassine envelope; a kraft evidence tag tied with a waxed cotton string; a black rubber stamp with a turned wooden handle lying on its side next to a vermilion ink pad. Objects overlap at slight angles and fill the lower-left two thirds; the upper-right third is empty paper for typography. Aspect 3:2.

**3** (low) — style paragraph, then:
> Subject, seen from 40 degrees above: a black rubber stamp with a turned wooden handle, lifted a few centimetres above a single sheet of blank cotton paper, just after stamping. On the sheet, a fresh stamp impression in vermilion ink: a plain thick ring with a solid bar through its middle, slightly misregistered, ink heavier on one side with tiny voids in the coverage. A vermilion ink pad with a dented lid sits at the edge of the frame. The stamp and impression sit in the lower half; the upper half is empty paper. Aspect 2:3, portrait.

**4** (low) — style paragraph, then:
> Subject, seen from 35 degrees above, close: a squared stack of blank cotton documents inside a manila case folder, closed and in order. A kraft evidence tag on a waxed cotton string loops around the folder and hangs over its front edge; a black steel binder clip holds the top corner. On the folder's front, a blind-embossed seal: a raised circle of fine concentric ridges pressed into the manila, visible only through the raking light, no ink, no letters. The folder sits right of centre, cropped by the right edge; the left 40 percent is empty paper. Aspect 3:2.

**5** (high) — style paragraph, then:
> Subject, shot from directly overhead: the contents of a disputed-payment case file spilled loosely across a table, nothing in order. A manila case folder lying half open and skewed; three blank carbon-copy forms with perforated tear-off edges fanned at different angles, one with a faint blue-black carbon smudge; two thermal receipts curling at the ends; a translucent glassine envelope with a blank card inside; a kraft evidence tag tied with a waxed cotton string that trails across a form; a black rubber stamp with a turned wooden handle lying on its side; a small brass binder clip. No ink pad. Objects overlap at slight angles and occupy the right two thirds of the frame, bleeding off the right and bottom edges; the left third is calm empty paper for a large headline. Aspect 3:2.

**6** (high) — style paragraph, then:
> Subject, seen from 35 degrees above, close: a squared stack of blank cotton documents inside a manila case folder, closed, tied and in order, ready to be filed. A kraft evidence tag on a waxed cotton string is tied around the folder and hangs over its front edge; a black steel binder clip holds the top corner; the folder's spine edge shows the layered sheets inside. On the folder's front, a blind-embossed seal: a raised circle of fine concentric ridges pressed into the manila, visible only through the raking light, no ink, no letters. The folder sits right of centre and is cropped by the right edge; the left 40 percent of the frame is empty paper. Aspect 3:2.

**7** (high, transparent)
> Product photograph on a transparent background, isolated object only, no surface and no cast shadow. 100mm lens at f/8, everything in focus, camera 30 degrees above the object. Light: one large softbox from camera-left, a hard raking light from the right. Palette: near-black #111111 cast iron, aged brass #A8834A. Real materials with honest wear: chipped paint on the cast-iron edges, brass slightly tarnished and dulled, a faint fingerprint on the lever, specks of dust. Subject: an old desk embossing seal press. Cast-iron body painted near-black with a crinkle finish; a curved brushed-brass lever handle; two round brass dies, the upper one pressing down. The dies are plain and smooth with no engraving, no letters, no numbers, no logos. The object faces left, three-quarter view, filling 85 percent of the frame.

(The model drew it facing right; the page mirrors it in CSS.)

**8** (high, transparent)
> Product photograph on a transparent background, isolated object only, no surface and no cast shadow. 100mm lens at f/8, everything in focus, camera directly above. Light: one large softbox from camera-left, a hard raking light from the right that shows the paper's relief. Palette: thermal paper white with a faint warm grey cast, a slight greyed fade toward the curled ends. Real material with honest wear: the long strip curls up at both ends, one soft crease across the middle, a torn serrated edge at the top, a faint fingerprint smudge, light scuffing. Subject: a single long thermal-paper till receipt, about 8 cm wide, lying vertically, completely blank: no printing, no text, no letters, no numbers, no barcodes, no logos. It fills 90 percent of the frame height. Aspect 2:3, portrait.

**9** (medium)
> Seamless tileable texture, flat orthographic top-down view, perfectly even diffuse lighting with no shadows, no vignette and no gradient across the frame. Subject: the surface of a sheet of cold-pressed cotton paper, filling the entire frame edge to edge: soft irregular fibre structure, very fine felt grain, a few tiny embedded fibres and specks. Colour: warm off-white #EDE8DC with very low contrast variation. The left edge must continue seamlessly into the right edge and the top into the bottom. No objects, no edges of the sheet, no text, no letters, no numbers, no logos.

**10** (medium)
> Seamless tileable texture, flat orthographic top-down view, perfectly even diffuse lighting with no shadows, no vignette and no gradient across the frame. Subject: the surface of a manila file-folder board, filling the entire frame edge to edge: visible long paper fibres running mostly in one direction, faint mottling, a few darker flecks of recycled pulp. Colour: manila #D8C79E with low contrast variation. The left edge must continue seamlessly into the right edge and the top into the bottom. No objects, no folds, no edges, no text, no letters, no numbers, no logos.

**11** (high) — style paragraph, then:
> Subject, seen from 50 degrees above: a case file half way through being assembled. An open manila folder lies flat; on its right leaf a neatly squared stack of blank cotton documents and carbon-copy forms with perforated edges, the pages offset a few millimetres like index tabs. In front of the stack, three kraft evidence tags on waxed cotton strings stand propped in a neat row, slightly fanned. A curling thermal receipt lies across the top of the stack. A black steel binder clip waits on the left leaf. The arrangement sits in the right 60 percent of the frame, bleeding off the right edge; the left 40 percent is empty paper. Aspect 3:2.

The raw PNGs stay in `generated-images/` (git-ignored) and are not committed.
