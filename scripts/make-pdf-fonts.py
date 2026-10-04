"""Fill the PDF fonts' gaps — run once after the fonts are re-cut. Safe to re-run.

The PDFs print in Instrument Sans (src/assets/pdf-fonts), cut from the
fontsource variable font. Instrument Sans has no ± µ ² ³ ¹ ¼ ½ ¾ ¤ ¦ ¬, and
jsPDF, meeting a character its embedded font cannot draw, drops the REST OF
THE LINE: "Within ±1.5 g over 200 packs" printed as "Within" on the client
report. A screen never shows this — the browser borrows the glyph from another
font — so it only appears on paper, which is where a tolerance matters.

The same trap drops a person's name: the latin cut has no Ł ś ę Ş č ő, so
"Łukasz Wójcik" printed as "ukasz Wójcik" (found 4 Oct by the random-job
stress run). So this first copies Instrument Sans's OWN latin-ext letters
(same face, same weight — the names read as one family), then fills what is
still missing from Outfit (the app's name face, already shipped, same
1000-unit em). Every character lib/reportKit san() lets through then has a
glyph; src/lib/__tests__/pdfFonts.test.ts holds that true.

    python3 scripts/make-pdf-fonts.py      (needs: pip install fonttools brotli)
"""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import DecomposingRecordingPen

OUTFIT = 'node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2'
OWN_EXT = 'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-ext-wght-normal.woff2'
DONORS = [OWN_EXT, OUTFIT]
TARGETS = [('src/assets/pdf-fonts/InstrumentSans-Regular.ttf', 400),
           ('src/assets/pdf-fonts/InstrumentSans-Bold.ttf', 700)]
# Everything san() keeps: printable ASCII, Latin-1 (less the soft hyphen, which
# san drops), the European letters (lib/reportKit EXTENDED — the same list),
# the euro, and the dashes, quotes and ellipsis.
EXTENDED = ('ĀāĂăĄąĆćĊċČčĎďĐđĒēĖėĘęĚěĞğĠġĢģĦħĪīĮįİıĲĳĶķĹĺĻļĽľŁłŃńŅņŇňŊŋŌōŐőŒœ'
            'ŔŕŖŗŘřŚśŞşŠšŤťŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžǍǎȘșȚțẀẁẂẃẄẅẞỲỳ€™−')
WANT = [*range(0x20, 0x7F), *(c for c in range(0xA0, 0x100) if c != 0xAD),
        *(ord(ch) for ch in EXTENDED),
        0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026]

for path, weight in TARGETS:
    font = TTFont(path)
    cmap = font.getBestCmap()
    gaps = [c for c in WANT if c not in cmap]
    if not gaps:
        print(path, 'complete'); continue
    donors = [instancer.instantiateVariableFont(TTFont(d), {'wght': weight}) for d in DONORS]
    order = list(font.getGlyphOrder())
    added = []
    for c in gaps:
        donor = next((d for d in donors if c in d.getBestCmap()), None)
        if donor is None:
            print('  no donor glyph for', hex(c)); continue
        dcmap, dset = donor.getBestCmap(), donor.getGlyphSet()
        name = 'uni%04X' % c
        assert name not in font['glyf'], name
        # Accented letters are built from parts (Ł is L + a stroke): drawn out
        # flat, so the copy stands alone in a font that has none of the parts.
        flat = DecomposingRecordingPen(dset)
        dset[dcmap[c]].draw(flat)
        pen = TTGlyphPen(None)
        flat.replay(pen)
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
