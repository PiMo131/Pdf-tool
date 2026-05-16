/**
 * PDF Measure Tool — exports. Exposes PMT.Export.
 */
(function (PMT) {
	'use strict';

	function download(filename, content, mime) {
		var blob = (content instanceof Blob)
			? content
			: new Blob([content], { type: mime || 'text/plain' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
	}

	function csvCell(v) {
		var s = String(v == null ? '' : v);
		if (/[",\n]/.test(s)) { s = '"' + s.replace(/"/g, '""') + '"'; }
		return s;
	}

	function csvRow(cells) {
		return cells.map(csvCell).join(',');
	}

	PMT.Export = {
		download: download,

		/**
		 * Build a takeoff CSV from per-legend totals.
		 */
		takeoffCsv: function (project) {
			var totals = PMT.Measure.totals(project);
			var s = project.settings;
			var u = s.displayUnit;
			var rows = [];
			rows.push(csvRow([
				'Project', project.name
			]));
			rows.push(csvRow([
				'Units', u, 'Currency', s.currency || ''
			]));
			rows.push([]);
			rows.push(csvRow([
				'Legend item', 'Kind', 'Measurements', 'Count',
				'Length (' + u + ')', 'Area (' + u + '²)',
				'Measured', 'Waste %', 'With waste', 'Unit cost', 'Total cost'
			]));

			var grand = 0;
			totals.forEach(function (t) {
				grand += t.cost;
				rows.push(csvRow([
					t.item.name,
					t.item.kind,
					t.shapes,
					t.count,
					PMT.Format.round(t.length, s.precision),
					PMT.Format.round(t.area, s.precision),
					PMT.Format.round(t.measured, s.precision),
					t.item.waste || 0,
					PMT.Format.round(t.withWaste, s.precision),
					t.item.unitCost || 0,
					PMT.Format.round(t.cost, 2)
				]));
			});
			rows.push([]);
			rows.push(csvRow(['', '', '', '', '', '', '', '', '', 'Grand total', PMT.Format.round(grand, 2)]));

			return rows.join('\r\n');
		},

		exportTakeoff: function (project) {
			var name = (project.name || 'project').replace(/[^\w\-]+/g, '_');
			download(name + '-takeoff.csv', PMT.Export.takeoffCsv(project), 'text/csv');
		},

		/**
		 * Export the whole current page (background + annotations) as a PNG.
		 */
		exportImage: function (viewer, project) {
			var url = viewer.captureDataURL();
			if (!url) { window.alert('Open a plan first.'); return; }
			var name = (project.name || 'project').replace(/[^\w\-]+/g, '_');
			var a = document.createElement('a');
			a.href = url;
			a.download = name + '-page' + (project.activePage + 1) + '.png';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		},

		/**
		 * Export the current annotated page as a single-page PDF.
		 */
		exportPlanPdf: function (viewer, project) {
			if (!window.PDFLib) { window.alert('PDF export library is not available.'); return; }
			var L = window.PDFLib;
			var name = (project.name || 'project').replace(/[^\w\-]+/g, '_');
			var dataUrl = viewer.captureDataURL();
			if (!dataUrl) { window.alert('Open a plan first.'); return; }
			L.PDFDocument.create().then(function (doc) {
				return doc.embedPng(dataUrl).then(function (png) {
					var page = doc.addPage([png.width, png.height]);
					page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
					return doc.save();
				});
			}).then(function (bytes) {
				download(name + '-plan-p' + (project.activePage + 1) + '.pdf',
					new Blob([bytes], { type: 'application/pdf' }));
			}).catch(function (e) {
				window.alert('Plan PDF export failed: ' + e.message);
			});
		},

		/**
		 * Export a formatted takeoff & cost report as a PDF.
		 */
		exportReportPdf: function (project) {
			if (!window.PDFLib) { window.alert('PDF export library is not available.'); return; }
			var L = window.PDFLib;
			var s = project.settings, u = s.displayUnit;
			var totals = PMT.Measure.totals(project);
			var name = (project.name || 'project').replace(/[^\w\-]+/g, '_');

			L.PDFDocument.create().then(function (doc) {
				return Promise.all([
					doc.embedFont(L.StandardFonts.Helvetica),
					doc.embedFont(L.StandardFonts.HelveticaBold)
				]).then(function (fonts) {
					var font = fonts[0], bold = fonts[1];
					var ink = L.rgb(0.12, 0.12, 0.14), mute = L.rgb(0.42, 0.42, 0.47);
					var cols = [40, 230, 300, 372, 432, 505];
					var page, y;

					function newPage() { page = doc.addPage([595, 842]); y = 802; }
					function rule() {
						page.drawLine({ start: { x: 40, y: y }, end: { x: 555, y: y }, thickness: 0.7, color: mute });
					}
					function header() {
						['Legend item', 'Type', 'Measured', 'Waste %', 'With waste', 'Cost']
							.forEach(function (h, i) {
								page.drawText(h, { x: cols[i], y: y, size: 9, font: bold, color: ink });
							});
						y -= 5; rule(); y -= 14;
					}

					newPage();
					page.drawText('Takeoff & cost report', { x: 40, y: y, size: 18, font: bold, color: ink });
					y -= 22;
					page.drawText(project.name || 'Untitled', { x: 40, y: y, size: 11, font: font, color: mute });
					y -= 14;
					page.drawText('Units: ' + u + '    Generated: ' + new Date().toLocaleString(),
						{ x: 40, y: y, size: 9, font: font, color: mute });
					y -= 24;
					header();

					var grand = 0;
					totals.forEach(function (r) {
						if (y < 70) { newPage(); header(); }
						grand += r.cost;
						var meas = r.item.kind === 'count' ? (r.count + ' pcs')
							: r.item.kind === 'length' ? PMT.Format.number(r.length, s.precision) + ' ' + u
								: PMT.Format.number(r.area, s.precision) + ' ' + u + '²';
						var ww = r.item.kind === 'count'
							? PMT.Format.number(r.withWaste, 0) + ' pcs'
							: PMT.Format.number(r.withWaste, s.precision);
						var row = [
							r.item.name, r.item.kind, meas, (r.item.waste || 0) + '%', ww,
							(s.currency || '') + PMT.Format.number(r.cost, 2)
						];
						row.forEach(function (c, i) {
							page.drawText(String(c), { x: cols[i], y: y, size: 9, font: font, color: ink });
						});
						y -= 16;
					});

					y -= 3; rule(); y -= 16;
					page.drawText('Grand total', { x: cols[0], y: y, size: 10, font: bold, color: ink });
					page.drawText((s.currency || '') + PMT.Format.number(grand, 2),
						{ x: cols[5], y: y, size: 10, font: bold, color: ink });
					return doc.save();
				});
			}).then(function (bytes) {
				download(name + '-report.pdf', new Blob([bytes], { type: 'application/pdf' }));
			}).catch(function (e) {
				window.alert('Report export failed: ' + e.message);
			});
		}
	};

})(window.PMT = window.PMT || {});
