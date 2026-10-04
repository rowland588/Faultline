"""Fill the PDF fonts' gaps — run once after the fonts are re-cut. Safe to re-run.

The PDFs print in Instrument Sans (src/assets/pdf-fonts), cut from the
fontsource variable font. Instrument Sans has no ± µ ² ³ ¹ ¼ ½ ¾ ¤ ¦ ¬, and
jsPDF, meeting a character its embedded font cannot draw, drops the REST OF
THE LINE: "Within ±1.5 g over 200 packs" printed as "Within" on the client
report. A screen never shows this — the browser borrows the glyph from another
font — so it only appears on paper, which is where a tolerance matters.

This copies those glyphs from Outfit (the app's name face, already shipped,
same 1000-unit em) at the same weight, so every character lib/reportKit san()
lets through has a glyph. src/lib/__tests__/pdfFonts.test.ts holds that true.

    python3 scripts/make-pdf-fonts.py      (needs: pip install fonttools brotli)
"""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.ttGlyphPen import TTGlyphPen

OUTFIT = 'node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2'
TARGETS = [('src/assets/pdf-fonts/InstrumentSans-Regular.ttf', 400),
           ('src/assets/pdf-fonts/InstrumentSans-Bold.ttf', 700)]
# Everything san() keeps: printable ASCII, Latin-1 (less the soft hyphen, which
# san drops), and the dashes, quotes and ellipsis.
WANT = [*range(0x20, 0x7F), *(c for c in range(0xA0, 0x100) if c != 0xAD),
        0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026]

for path, weight in TARGETS:
    font = TTFont(path)
    cmap = font.getBestCmap()
    gaps = [c for c in WANT if c not in cmap]
    if not gaps:
        print(path, 'complete'); continue
    donor = instancer.instantiateVariableFont(TTFont(OUTFIT), {'wght': weight})
    dcmap, dset = donor.getBestCmap(), donor.getGlyphSet()
    order = list(font.getGlyphOrder())
    added = []
    for c in gaps:
        if c not in dcmap:
            print('  no donor glyph for', hex(c)); continue
        name = 'uni%04X' % c
        pen = TTGlyphPen(dset)
        dset[dcmap[c]].draw(pen)  # draws through components, so the copy stands alone
        glyph = pen.glyph()
        glyph.recalcBounds(font['glyf'])
        font['glyf'][name] = glyph
        font['hmtx'][name] = (donor['hmtx'][dcmap[c]][0], getattr(glyph, 'xMin', 0))
        order.append(name)
        for table in font['cmap'].tables:
            if table.isUnicode():
                table.cmap[c] = name
        added.append(chr(c))
    font.setGlyphOrder(order)
    for t in ('hdmx', 'LTSH'):  # per-glyph caches that would now be short
        if t in font:
            del font[t]
    font.save(path)
    print(path, 'added', ''.join(added))
