# PDF Measure Tool — Handleiding

Een webgebaseerd meetgereedschap voor PDF-, JPG- en PNG-tekeningen. Je stelt
een schaal in en meet daarna lengtes, oppervlaktes en aantallen rechtstreeks
op de tekening. Met legenda, totalen, kosten, annotaties en dakhelling-
berekening.

---

## 1. De tool openen

Er zijn twee manieren:

- **Volledig scherm:** ga naar `jouwsite.nl/pdf-tool`
- **In een pagina:** plaats de shortcode `[pdf_measure_tool]` op een
  WordPress-pagina.

Je moet ingelogd zijn. Werkt `/pdf-tool` niet, ga dan eenmalig naar
**Instellingen → Permalinks → Wijzigingen opslaan**.

---

## 2. Het scherm

| Onderdeel | Plaats | Functie |
|-----------|--------|---------|
| Bovenbalk | boven | Project, opslaan/openen, exporteren, eenheden, zoom, ongedaan maken |
| Gereedschapsbalk | links | Alle teken- en meetgereedschappen |
| Tekenvlak | midden | De tekening met je metingen |
| Zijpaneel | rechts | Tekenopties, selectie, legenda, dakhellingen |

---

## 3. Werkvolgorde in het kort

1. **New** → kies een PDF/JPG/PNG-bestand.
2. **Set scale** → teken een lijn over een bekende maat en vul de echte
   afstand in.
3. Maak een **legenda-item** aan (rechts) voor wat je gaat meten.
4. Kies een **meetgereedschap** en teken je metingen.
5. Lees de **totalen** af in de legenda.
6. **Save** om het project te bewaren, of exporteer naar CSV/PDF.

---

## 4. Een bestand laden

- Klik linksboven op **New** en kies een PDF, JPG of PNG.
- Een PDF met meerdere pagina's: navigeer onderaan met **‹ Prev** en
  **Next ›**. Elke pagina heeft zijn eigen schaal en eigen metingen.
- Zoomen: muiswiel. Verschuiven: gereedschap **Pan**, of houd de
  **spatiebalk** ingedrukt en sleep. Knop **Fit** past de tekening passend.

---

## 5. De schaal instellen (kalibreren) — verplicht

Zonder schaal toont een meting "set scale".

1. Kies **Set scale**.
2. Klik op twee punten met een bekende afstand (bijv. een maatlijn van
   5 meter, of een bekende muur).
3. Vul de **echte afstand** en de **eenheid** in → **Apply scale**.

> Tip: gebruik een zo lang mogelijke bekende maat — dat is nauwkeuriger.

### Schaal controleren

Met **Verify scale** teken je een lijn over een tweede bekende maat. De tool
toont de gemeten waarde en de **afwijking in %**. Klopt het niet, dan kun je
met één klik opnieuw kalibreren op die lijn.

---

## 6. Meetgereedschappen

| Gereedschap | Meet | Hoe |
|-------------|------|-----|
| **Line** | lengte | Klik begin- en eindpunt |
| **Polyline** | totale lengte | Klik meerdere punten, dubbelklik of Enter om af te ronden |
| **Area** | oppervlakte + omtrek | Klik de hoekpunten van een vlak, klik op het beginpunt of dubbelklik om te sluiten |
| **Rectangle** | oppervlakte | Sleep een rechthoek |
| **Circle** | oppervlakte + omtrek | Klik het midden, sleep de straal |
| **Count** | aantal | Klik per stuk; tikken worden geteld per legenda-item |

Hulpmiddelen tijdens het tekenen:
- **Shift ingedrukt** = rechte (horizontale/verticale) segmenten.
- Punten **klikken vast** op bestaande hoekpunten in de buurt.
- **Esc** annuleert de huidige tekening, **Enter** rondt af.

---

## 7. Annotaties

Voor aantekeningen die niets meten:

- **Text** — klik en typ een tekst.
- **Arrow** — sleep een pijl.

Kleur, lijndikte en lettergrootte stel je in bij **Drawing options** in het
zijpaneel — vóór het tekenen, of achteraf bij een geselecteerde vorm.

---

## 8. Selecteren en bewerken

1. Kies het gereedschap **Select**.
2. Klik op een meting of annotatie → die wordt blauw gemarkeerd.
3. **Verslepen** = de hele vorm verplaatsen.
4. **Witte bolletjes** op de hoekpunten = sleep ze om de vorm aan te passen.
5. Het paneel **Selection** rechts toont de meetwaarde en instellingen.
6. **Delete** of **Backspace** verwijdert de geselecteerde vorm.

---

## 9. Legenda en totalen

De legenda groepeert je metingen en telt ze per item op.

1. Klik bij **Legend & totals** op **+ Item**.
2. Stel per item in:
   - **Naam** en **kleur**
   - **Type**: `length` (lengte), `area` (oppervlakte) of `count` (aantal)
   - **Unit cost** — prijs per eenheid (optioneel)
   - **Waste %** — afvalpercentage (optioneel)
3. Kies bij **Drawing options** het **Active legend item** voordat je meet,
   of wijs een meting achteraf toe via het Selection-paneel.

De legenda toont per item het totaal en, als je kosten invult, de prijs
inclusief afval. Onderaan staat het **eindtotaal**.

### Aftrekposten (deductions)

Selecteer een oppervlaktemeting en zet **Deduction** aan. Die oppervlakte
wordt dan van het totaal van het legenda-item **afgetrokken** — handig voor
sparingen, dakramen of gevelopeningen.

### Legenda-sjablonen

Met de knop **Templates** sla je een legenda (items, kleuren, kosten) op om
later op een ander project opnieuw te gebruiken. Sjablonen worden in je
browser bewaard.

---

## 10. Daken: oppervlakte van schuine vlakken

Een dakvlak op een plattegrond is **verkort weergegeven**: je ziet alleen de
horizontale projectie. De echte (schuine) oppervlakte is groter.

**Werkwijze:**

1. Open een **gevel- of doorsnedeaanzicht** waar de dakhelling zichtbaar is.
2. Kies **Pitch angle** en teken een lijn langs de helling. De tool meet de
   hoek. Je kunt ook een dakhelling als verhouding invoeren (bijv. 6 : 12).
3. Geef de helling een naam en sla hem op → hij verschijnt in het paneel
   **Roof slopes**.
4. Ga naar de **plattegrond**, selecteer een oppervlaktemeting van het dak en
   kies de helling bij **Roof slope** in het Selection-paneel.
5. Het label toont nu de **ware oppervlakte** met daarachter de platte maat,
   bijv. `48,2 m² ↗ (41,8 m² plan)`.

Formule: ware oppervlakte = platte oppervlakte ÷ cos(hoek).

### Hellingsrichting (voor schuine lengtes)

Voor **lengtes** op een dak is alleen het deel dat de helling op loopt
verkort — een lijn langs de nok blijft op ware grootte. Geef daarom de
helling een richting:

1. Klik in het paneel **Roof slopes** bij een helling op **↘ dir**.
2. Teken op de plattegrond een pijl in de richting waarin het dak afloopt.

Daarna berekent de tool per lijnsegment de exacte schuine lengte. Zonder
richting gebruikt de tool een eenvoudige correctie over de hele lengte.

---

## 11. Project opslaan en openen

- **Save** bewaart het project (het bestand wordt naar de mediabibliotheek
  geüpload en de metingen worden opgeslagen). Elke gebruiker ziet zijn eigen
  projecten.
- **Open** toont je opgeslagen projecten; klik om te openen of × om te
  verwijderen.
- **New** start een nieuw project.

---

## 12. Exporteren

| Knop | Resultaat |
|------|-----------|
| **CSV** | Calculatie-overzicht met alle legenda-totalen en kosten |
| **PNG** | Afbeelding van de huidige pagina mét metingen |
| **Plan PDF** | PDF van de huidige pagina mét metingen |
| **Report** | Verzorgd PDF-rapport: legenda, hoeveelheden, afval, kosten, eindtotaal |

---

## 13. Sneltoetsen

| Toets | Functie |
|-------|---------|
| Esc | Tekening annuleren / terug naar Select |
| Enter | Tekening afronden (polylijn, vlak) |
| Delete / Backspace | Geselecteerde vorm verwijderen |
| Ctrl/Cmd + Z | Ongedaan maken |
| Ctrl/Cmd + Shift + Z | Opnieuw |
| Spatiebalk (ingedrukt) | Tijdelijk verschuiven (pan) |
| Muiswiel | Zoomen |
| Shift (tijdens tekenen) | Rechte segmenten |

---

## 14. Eenheden

Rechtsboven kies je de **weergave-eenheid** (mm, cm, m, in, ft). Je kunt
altijd wisselen; bestaande metingen worden automatisch omgerekend.
Oppervlaktes worden in de gekozen eenheid in het kwadraat getoond.

---

## 15. Veelvoorkomende vragen

**"set scale" blijft op mijn meting staan.**
De pagina is nog niet gekalibreerd. Gebruik eerst **Set scale**. Elke pagina
heeft een eigen schaal.

**Mijn meting telt niet mee in de legenda.**
De meting heeft geen legenda-item, of het legenda-item heeft het verkeerde
type (een `count`-meting hoort bij een `count`-item, enz.). Pas dit aan in
het Selection-paneel.

**`/pdf-tool` geeft een 404.**
Ga één keer naar **Instellingen → Permalinks → Wijzigingen opslaan**.

**Exporteren naar PDF doet niets.**
De PDF-bibliotheek kon niet laden (netwerk geblokkeerd). CSV en PNG werken
dan meestal nog wel.
