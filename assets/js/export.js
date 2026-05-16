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
		 * Export the current Konva stage (page + annotations) as a PNG.
		 */
		exportImage: function (stage, project) {
			var name = (project.name || 'project').replace(/[^\w\-]+/g, '_');
			var url = stage.toDataURL({ pixelRatio: 2 });
			var a = document.createElement('a');
			a.href = url;
			a.download = name + '-page' + (project.activePage + 1) + '.png';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	};

})(window.PMT = window.PMT || {});
