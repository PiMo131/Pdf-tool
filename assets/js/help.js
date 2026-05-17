/**
 * PDF Measure Tool — Nederlandse handleiding (HTML), getoond via de Help-knop.
 * Exposes PMT.helpHtml
 */
(function (PMT) {
	'use strict';

	PMT.helpHtml = [
		'<div class="pmt-help">',

		'<p>Webgebaseerd meetgereedschap voor PDF-, JPG- en PNG-tekeningen. Stel een schaal in en meet lengtes, oppervlaktes en aantallen rechtstreeks op de tekening, met legenda, totalen, kosten, annotaties en dakhelling-berekening.</p>',

		'<h2>1. Werkvolgorde in het kort</h2>',
		'<ol>',
		'<li><b>New</b> &rarr; kies een PDF/JPG/PNG-bestand.</li>',
		'<li><b>Set scale</b> &rarr; teken een lijn over een bekende maat en vul de echte afstand in.</li>',
		'<li>Maak rechts een <b>legenda-item</b> aan voor wat je gaat meten.</li>',
		'<li>Kies een <b>meetgereedschap</b> en teken je metingen.</li>',
		'<li>Lees de <b>totalen</b> af in de legenda.</li>',
		'<li><b>Save</b> om te bewaren, of exporteer naar CSV/PDF.</li>',
		'</ol>',

		'<h2>2. Het scherm</h2>',
		'<table>',
		'<tr><th>Onderdeel</th><th>Plaats</th><th>Functie</th></tr>',
		'<tr><td>Bovenbalk</td><td>boven</td><td>Project, opslaan/openen, exporteren, eenheden, zoom, ongedaan maken</td></tr>',
		'<tr><td>Gereedschapsbalk</td><td>links</td><td>Alle teken- en meetgereedschappen</td></tr>',
		'<tr><td>Tekenvlak</td><td>midden</td><td>De tekening met je metingen</td></tr>',
		'<tr><td>Zijpaneel</td><td>rechts</td><td>Tekenopties, selectie, legenda, dakhellingen</td></tr>',
		'</table>',

		'<h2>3. Een bestand laden</h2>',
		'<ul>',
		'<li>Klik linksboven op <b>New</b> en kies een PDF, JPG of PNG.</li>',
		'<li>PDF met meerdere pagina&apos;s: navigeer onderaan met <b>&lsaquo; Prev</b> en <b>Next &rsaquo;</b>. Elke pagina heeft een eigen schaal en eigen metingen.</li>',
		'<li>Zoomen met het muiswiel. Verschuiven met het gereedschap <b>Pan</b>, of houd de <kbd>spatiebalk</kbd> ingedrukt en sleep. Knop <b>Fit</b> past de tekening passend.</li>',
		'</ul>',

		'<h2>4. De schaal instellen (kalibreren) &mdash; verplicht</h2>',
		'<p>Zonder schaal toont een meting &quot;set scale&quot;.</p>',
		'<ol>',
		'<li>Kies <b>Set scale</b>.</li>',
		'<li>Klik op twee punten met een bekende afstand (bijv. een maatlijn of een bekende muur).</li>',
		'<li>Vul de echte afstand en de eenheid in &rarr; <b>Apply scale</b>.</li>',
		'</ol>',
		'<p>Tip: gebruik een zo lang mogelijke bekende maat &mdash; dat is nauwkeuriger.</p>',
		'<h3>Schaal controleren</h3>',
		'<p>Met <b>Verify scale</b> teken je een lijn over een tweede bekende maat. De tool toont de gemeten waarde en de afwijking in %. Klopt het niet, dan kun je met &eacute;&eacute;n klik opnieuw kalibreren op die lijn.</p>',

		'<h2>5. Meetgereedschappen</h2>',
		'<table>',
		'<tr><th>Gereedschap</th><th>Meet</th><th>Hoe</th></tr>',
		'<tr><td>Line</td><td>lengte</td><td>Klik begin- en eindpunt</td></tr>',
		'<tr><td>Polyline</td><td>totale lengte</td><td>Klik meerdere punten, dubbelklik of Enter om af te ronden</td></tr>',
		'<tr><td>Area</td><td>oppervlakte + omtrek</td><td>Klik de hoekpunten, klik op het beginpunt of dubbelklik om te sluiten</td></tr>',
		'<tr><td>Rectangle</td><td>oppervlakte</td><td>Sleep een rechthoek</td></tr>',
		'<tr><td>Circle</td><td>oppervlakte + omtrek</td><td>Klik het midden, sleep de straal</td></tr>',
		'<tr><td>Count</td><td>aantal</td><td>Klik per stuk; tikken worden geteld per legenda-item</td></tr>',
		'</table>',
		'<p>Tijdens het tekenen: <kbd>Shift</kbd> ingedrukt = rechte segmenten; punten klikken vast op bestaande hoekpunten in de buurt; <kbd>Esc</kbd> annuleert, <kbd>Enter</kbd> rondt af.</p>',

		'<h2>6. Annotaties</h2>',
		'<p><b>Text</b> &mdash; klik en typ een tekst. <b>Arrow</b> &mdash; sleep een pijl. Kleur, lijndikte en lettergrootte stel je in bij <b>Drawing options</b> in het zijpaneel, vooraf of achteraf bij een geselecteerde vorm.</p>',

		'<h2>7. Selecteren en bewerken</h2>',
		'<ol>',
		'<li>Kies het gereedschap <b>Select</b>.</li>',
		'<li>Klik op een meting of annotatie &rarr; die wordt blauw gemarkeerd.</li>',
		'<li>Verslepen = de hele vorm verplaatsen.</li>',
		'<li>Witte bolletjes op de hoekpunten = sleep ze om de vorm aan te passen.</li>',
		'<li>Het paneel <b>Selection</b> toont de meetwaarde en instellingen.</li>',
		'<li><kbd>Delete</kbd> verwijdert de geselecteerde vorm.</li>',
		'</ol>',

		'<h2>8. Legenda en totalen</h2>',
		'<ol>',
		'<li>Klik bij <b>Legend &amp; totals</b> op <b>+ Item</b>.</li>',
		'<li>Stel per item in: naam, kleur, type (<code>length</code>, <code>area</code> of <code>count</code>), eventueel <b>Unit cost</b> (prijs per eenheid) en <b>Waste %</b> (afval).</li>',
		'<li>Kies bij <b>Drawing options</b> het <b>Active legend item</b> v&oacute;&oacute;r het meten, of wijs een meting achteraf toe via het Selection-paneel.</li>',
		'</ol>',
		'<p>De legenda toont per item het totaal en, met kosten, de prijs inclusief afval. Onderaan staat het eindtotaal.</p>',
		'<h3>Aftrekposten</h3>',
		'<p>Selecteer een oppervlaktemeting en zet <b>Deduction</b> aan. Die oppervlakte wordt van het itemtotaal afgetrokken &mdash; handig voor sparingen, dakramen of gevelopeningen.</p>',
		'<h3>Legenda-sjablonen</h3>',
		'<p>Met de knop <b>Templates</b> sla je een legenda (items, kleuren, kosten) op om later op een ander project opnieuw te gebruiken. Sjablonen worden in je browser bewaard.</p>',

		'<h2>9. Daken: oppervlakte van schuine vlakken</h2>',
		'<p>Een dakvlak op een plattegrond is verkort weergegeven: je ziet alleen de horizontale projectie. De echte (schuine) oppervlakte is groter.</p>',
		'<ol>',
		'<li>Open een gevel- of doorsnedeaanzicht waar de dakhelling zichtbaar is.</li>',
		'<li>Kies <b>Pitch angle</b> en teken een lijn langs de helling. De tool meet de hoek; je kunt ook een dakhelling als verhouding invoeren (bijv. 6 : 12).</li>',
		'<li>Geef de helling een naam en sla hem op &rarr; hij verschijnt in het paneel <b>Roof slopes</b>.</li>',
		'<li>Selecteer op de plattegrond een oppervlaktemeting van het dak en kies de helling bij <b>Roof slope</b> in het Selection-paneel.</li>',
		'<li>Het label toont nu de ware oppervlakte met daarachter de platte maat, bijv. <code>48,2 m&sup2; &#8599; (41,8 m&sup2; plan)</code>.</li>',
		'</ol>',
		'<p>Formule: ware oppervlakte = platte oppervlakte &divide; cos(hoek).</p>',
		'<h3>Hellingsrichting (voor schuine lengtes)</h3>',
		'<p>Voor lengtes op een dak is alleen het deel dat de helling op loopt verkort; een lijn langs de nok blijft op ware grootte. Klik in het paneel <b>Roof slopes</b> bij een helling op <b>&#8600; dir</b> en teken op de plattegrond een pijl in de afloeprichting. Daarna berekent de tool per lijnsegment de exacte schuine lengte.</p>',

		'<h2>10. Project opslaan en openen</h2>',
		'<p>Opslaan en openen werkt <b>alleen wanneer je ingelogd bent</b>. Meten, annoteren en exporteren werkt ook zonder login.</p>',
		'<p><b>Save</b> bewaart het project (bestand naar de mediabibliotheek, metingen opgeslagen). <b>Open</b> toont je opgeslagen projecten. <b>New</b> start een nieuw project. Elke gebruiker ziet zijn eigen projecten.</p>',

		'<h2>11. Exporteren</h2>',
		'<table>',
		'<tr><th>Knop</th><th>Resultaat</th></tr>',
		'<tr><td>CSV</td><td>Calculatie-overzicht met alle legenda-totalen en kosten</td></tr>',
		'<tr><td>PNG</td><td>Afbeelding van de huidige pagina m&eacute;t metingen</td></tr>',
		'<tr><td>Plan PDF</td><td>PDF van de huidige pagina m&eacute;t metingen</td></tr>',
		'<tr><td>Report</td><td>Verzorgd PDF-rapport: legenda, hoeveelheden, afval, kosten, eindtotaal</td></tr>',
		'</table>',

		'<h2>12. Sneltoetsen</h2>',
		'<table>',
		'<tr><th>Toets</th><th>Functie</th></tr>',
		'<tr><td><kbd>Esc</kbd></td><td>Tekening annuleren / terug naar Select</td></tr>',
		'<tr><td><kbd>Enter</kbd></td><td>Tekening afronden (polylijn, vlak)</td></tr>',
		'<tr><td><kbd>Delete</kbd></td><td>Geselecteerde vorm verwijderen</td></tr>',
		'<tr><td><kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd></td><td>Ongedaan maken</td></tr>',
		'<tr><td><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td><td>Opnieuw</td></tr>',
		'<tr><td><kbd>Spatiebalk</kbd></td><td>Tijdelijk verschuiven (pan)</td></tr>',
		'<tr><td>Muiswiel</td><td>Zoomen</td></tr>',
		'<tr><td><kbd>Shift</kbd></td><td>Rechte segmenten tijdens tekenen</td></tr>',
		'</table>',

		'<h2>13. Eenheden</h2>',
		'<p>Rechtsboven kies je de weergave-eenheid (mm, cm, m, in, ft). Je kunt altijd wisselen; bestaande metingen worden automatisch omgerekend. Oppervlaktes worden in de gekozen eenheid in het kwadraat getoond.</p>',

		'<h2>14. Veelgestelde vragen</h2>',
		'<p><b>&quot;set scale&quot; blijft op mijn meting staan.</b> De pagina is niet gekalibreerd. Gebruik eerst Set scale; elke pagina heeft een eigen schaal.</p>',
		'<p><b>Mijn meting telt niet mee in de legenda.</b> De meting heeft geen legenda-item, of het item heeft het verkeerde type. Pas dit aan in het Selection-paneel.</p>',
		'<p><b>/pdf-tool geeft een 404.</b> Ga &eacute;&eacute;n keer naar Instellingen &rarr; Permalinks &rarr; Wijzigingen opslaan.</p>',
		'<p><b>Exporteren naar PDF doet niets.</b> De PDF-bibliotheek kon niet laden (netwerk geblokkeerd). CSV en PNG werken dan meestal nog wel.</p>',

		'</div>'
	].join('');

})(window.PMT = window.PMT || {});
