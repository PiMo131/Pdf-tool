/**
 * PDF Measure Tool — core (pure logic, no DOM).
 * Exposes: PMT.Geometry, PMT.Project, PMT.Measure, PMT.Format
 */
(function (PMT) {
	'use strict';

	/* ============================================================ Geometry */

	var UNIT_TO_M = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };

	var Geometry = {
		UNIT_TO_M: UNIT_TO_M,

		dist: function (a, b) {
			return Math.hypot(b.x - a.x, b.y - a.y);
		},

		polylineLength: function (pts, closed) {
			var n = pts.length, L = 0, i;
			for (i = 0; i < n - 1; i++) { L += Geometry.dist(pts[i], pts[i + 1]); }
			if (closed && n > 2) { L += Geometry.dist(pts[n - 1], pts[0]); }
			return L;
		},

		polygonArea: function (pts) {
			var n = pts.length, a = 0, i, j;
			if (n < 3) { return 0; }
			for (i = 0; i < n; i++) {
				j = (i + 1) % n;
				a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
			}
			return Math.abs(a) / 2;
		},

		polygonPerimeter: function (pts) {
			return Geometry.polylineLength(pts, true);
		},

		centroid: function (pts) {
			var x = 0, y = 0, i;
			for (i = 0; i < pts.length; i++) { x += pts[i].x; y += pts[i].y; }
			return { x: x / pts.length, y: y / pts.length };
		},

		/** Acute angle (deg) of segment a->b measured from the horizontal. */
		angleFromHorizontalDeg: function (a, b) {
			var d = Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) * 180 / Math.PI;
			if (d > 90) { d = 180 - d; }
			return d;
		},

		/** Slope factor = 1 / cos(angle). True (sloped) length = plan * factor. */
		slopeFactorFromAngle: function (deg) {
			var c = Math.cos(deg * Math.PI / 180);
			return c > 1e-6 ? 1 / c : 1;
		},

		/** Slope factor from a roof pitch rise:run. */
		slopeFactorFromPitch: function (rise, run) {
			if (run <= 0) { return 1; }
			return Math.hypot(run, rise) / run;
		},

		pitchToAngleDeg: function (rise, run) {
			return run > 0 ? Math.atan2(rise, run) * 180 / Math.PI : 0;
		},

		convertLength: function (value, fromUnit, toUnit) {
			return value * UNIT_TO_M[fromUnit] / UNIT_TO_M[toUnit];
		},

		convertArea: function (value, fromUnit, toUnit) {
			var f = UNIT_TO_M[fromUnit] / UNIT_TO_M[toUnit];
			return value * f * f;
		},

		/** Rectangle stored as two opposite corners -> 4 ordered corners. */
		rectCorners: function (pts) {
			if (pts.length < 2) { return pts.slice(); }
			var a = pts[0], b = pts[1];
			return [
				{ x: a.x, y: a.y },
				{ x: b.x, y: a.y },
				{ x: b.x, y: b.y },
				{ x: a.x, y: b.y }
			];
		}
	};

	/* ============================================================ Format */

	var Format = {
		round: function (v, p) {
			var m = Math.pow(10, p == null ? 2 : p);
			return Math.round(v * m) / m;
		},

		number: function (v, p) {
			if (v == null || isNaN(v)) { return '—'; }
			return Format.round(v, p).toLocaleString(undefined, {
				minimumFractionDigits: 0,
				maximumFractionDigits: p == null ? 2 : p
			});
		},

		length: function (v, unit, p) {
			return Format.number(v, p) + ' ' + unit;
		},

		area: function (v, unit, p) {
			return Format.number(v, p) + ' ' + unit + '²';
		}
	};

	/* ============================================================ Project */

	var idCounter = 0;

	function uid(prefix) {
		idCounter += 1;
		return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + idCounter.toString(36);
	}

	var PALETTE = [
		'#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
		'#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
		'#9a6324', '#800000', '#000075', '#808000', '#000000'
	];

	var Project = {
		uid: uid,
		PALETTE: PALETTE,

		create: function (name) {
			return {
				schema: 1,
				id: null,
				attachmentId: 0,
				attachmentUrl: '',
				name: name || 'Untitled project',
				settings: {
					unit: 'm',          // calibration unit
					displayUnit: 'm',   // shown to the user
					precision: 2,
					currency: ''
				},
				legend: [],
				slopes: [],
				pages: [],
				activePage: 0
			};
		},

		blankPage: function (index) {
			return {
				index: index,
				label: 'Page ' + (index + 1),
				calibration: null, // { ppu: pixels-per-unit, unit: 'm' }
				shapes: []
			};
		},

		newLegendItem: function (project, kind) {
			var color = PALETTE[project.legend.length % PALETTE.length];
			return {
				id: uid('leg'),
				name: 'Item ' + (project.legend.length + 1),
				color: color,
				kind: kind || 'area', // length | area | count
				unitCost: 0,
				waste: 0
			};
		},

		newSlope: function (project, name, angleDeg) {
			return {
				id: uid('slp'),
				name: name || 'Slope ' + (project.slopes.length + 1),
				angleDeg: angleDeg || 0,
				factor: Geometry.slopeFactorFromAngle(angleDeg || 0)
			};
		},

		findLegend: function (project, id) {
			for (var i = 0; i < project.legend.length; i++) {
				if (project.legend[i].id === id) { return project.legend[i]; }
			}
			return null;
		},

		findSlope: function (project, id) {
			for (var i = 0; i < project.slopes.length; i++) {
				if (project.slopes[i].id === id) { return project.slopes[i]; }
			}
			return null;
		}
	};

	/* ============================================================ Measure */

	// Which measurement family a shape type belongs to.
	var KIND_OF = {
		linear: 'length', polyline: 'length', area: 'area',
		rect: 'area', circle: 'area', count: 'count',
		angle: null, text: null, arrow: null
	};

	var Measure = {
		KIND_OF: KIND_OF,

		kindOf: function (type) {
			return KIND_OF[type] || null;
		},

		/**
		 * Compute real-world metrics for a shape.
		 * Returns display-unit values plus a canvas label string.
		 */
		compute: function (shape, page, project) {
			var s = project.settings;
			var cal = page.calibration;
			var baseUnit = cal ? cal.unit : s.unit;
			var dispUnit = s.displayUnit;
			var prec = s.precision;
			var pts = shape.points || [];

			var res = {
				kind: KIND_OF[shape.type] || null,
				hasScale: !!cal,
				length: null,
				perimeter: null,
				area: null,
				count: null,
				slopeFactor: 1,
				slopeName: null,
				trueLength: null,
				trueArea: null,
				label: ''
			};

			if (shape.type === 'count') {
				res.count = pts.length;
				res.label = String(pts.length);
				return res;
			}

			if (shape.type === 'angle') {
				if (pts.length >= 2) {
					var ang = Geometry.angleFromHorizontalDeg(pts[0], pts[1]);
					res.angleDeg = ang;
					res.label = Format.number(ang, 1) + '°';
				}
				return res;
			}

			if (shape.type === 'text' || shape.type === 'arrow') {
				return res;
			}

			// Slope lookup (roof correction).
			var slope = shape.slopeId ? Project.findSlope(project, shape.slopeId) : null;
			if (slope) {
				res.slopeFactor = slope.factor;
				res.slopeName = slope.name;
			}

			// Pixel-space metrics.
			var lengthPx = 0, areaPx = 0, perimPx = 0;
			if (shape.type === 'linear' || shape.type === 'polyline') {
				lengthPx = Geometry.polylineLength(pts, false);
			} else if (shape.type === 'area') {
				areaPx = Geometry.polygonArea(pts);
				perimPx = Geometry.polygonPerimeter(pts);
			} else if (shape.type === 'rect') {
				var c = Geometry.rectCorners(pts);
				areaPx = Geometry.polygonArea(c);
				perimPx = Geometry.polygonPerimeter(c);
			} else if (shape.type === 'circle') {
				if (pts.length >= 2) {
					var r = Geometry.dist(pts[0], pts[1]);
					areaPx = Math.PI * r * r;
					perimPx = 2 * Math.PI * r;
				}
			}

			if (!cal) {
				res.label = 'set scale';
				return res;
			}

			var ppu = cal.ppu;

			if (res.kind === 'length') {
				var lenBase = lengthPx / ppu;
				res.length = Geometry.convertLength(lenBase, baseUnit, dispUnit);
				res.trueLength = res.length * res.slopeFactor;
				if (slope) {
					res.label = Format.length(res.trueLength, dispUnit, prec) +
						' ↗ (' + Format.length(res.length, dispUnit, prec) + ' plan)';
				} else {
					res.label = Format.length(res.length, dispUnit, prec);
				}
			} else if (res.kind === 'area') {
				var areaBase = areaPx / (ppu * ppu);
				var perimBase = perimPx / ppu;
				res.area = Geometry.convertArea(areaBase, baseUnit, dispUnit);
				res.perimeter = Geometry.convertLength(perimBase, baseUnit, dispUnit);
				res.trueArea = res.area * res.slopeFactor;
				if (slope) {
					res.label = Format.area(res.trueArea, dispUnit, prec) +
						' ↗ (' + Format.area(res.area, dispUnit, prec) + ' plan)';
				} else {
					res.label = Format.area(res.area, dispUnit, prec);
				}
			}
			return res;
		},

		/**
		 * Aggregate every measurement into per-legend-item totals across all pages.
		 */
		totals: function (project) {
			var map = {}, i, j, item;
			for (i = 0; i < project.legend.length; i++) {
				item = project.legend[i];
				map[item.id] = {
					item: item,
					count: 0, length: 0, area: 0,
					shapes: 0
				};
			}

			for (i = 0; i < project.pages.length; i++) {
				var page = project.pages[i];
				for (j = 0; j < page.shapes.length; j++) {
					var shape = page.shapes[j];
					if (!shape.legendId || !map[shape.legendId]) { continue; }
					var bucket = map[shape.legendId];
					var m = Measure.compute(shape, page, project);
					bucket.shapes += 1;
					if (m.count != null) { bucket.count += m.count; }
					if (m.trueLength != null) { bucket.length += m.trueLength; }
					if (m.trueArea != null) {
						bucket.area += shape.deduction ? -m.trueArea : m.trueArea;
					}
				}
			}

			var out = [];
			for (i = 0; i < project.legend.length; i++) {
				item = project.legend[i];
				var b = map[item.id];
				var measured = item.kind === 'length' ? b.length
					: item.kind === 'area' ? b.area : b.count;
				var withWaste = measured * (1 + (item.waste || 0) / 100);
				out.push({
					item: item,
					shapes: b.shapes,
					count: b.count,
					length: b.length,
					area: b.area,
					measured: measured,
					withWaste: withWaste,
					cost: withWaste * (item.unitCost || 0)
				});
			}
			return out;
		}
	};

	PMT.Geometry = Geometry;
	PMT.Format = Format;
	PMT.Project = Project;
	PMT.Measure = Measure;

})(window.PMT = window.PMT || {});
