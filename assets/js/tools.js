/**
 * PDF Measure Tool — interactive drawing tools.
 * Exposes PMT.createTools(app) -> { toolName: handler }.
 *
 * app must provide:
 *   viewer, project, page(), addShape(shape), commit(), select(id),
 *   setTool(name), shapeDefaults(type), onCalibrationLine(a,b),
 *   onAngleLine(a,b), promptText(cb)
 */
(function (PMT) {
	'use strict';

	var G = PMT.Geometry;

	function createTools(app) {

		/* --------------------------------------------- shared helpers */

		function overlay() { return app.viewer.overlayLayer; }

		function clearOverlay() {
			overlay().destroyChildren();
			overlay().batchDraw();
		}

		function snap(doc, evt, last) {
			var p = { x: doc.x, y: doc.y };
			var scale = app.viewer.getScale() || 1;
			var thr = 11 / scale;
			var best = null, bd = thr;
			var shapes = app.page().shapes;
			for (var i = 0; i < shapes.length; i++) {
				var vs = shapes[i].points || [];
				for (var j = 0; j < vs.length; j++) {
					var d = G.dist(vs[j], p);
					if (d < bd) { bd = d; best = vs[j]; }
				}
			}
			if (best) { p = { x: best.x, y: best.y }; }
			if (evt && evt.shiftKey && last) {
				var dx = p.x - last.x, dy = p.y - last.y;
				if (Math.abs(dx) > Math.abs(dy)) { p = { x: p.x, y: last.y }; }
				else { p = { x: last.x, y: p.y }; }
			}
			return p;
		}

		function makeShape(type, points) {
			var d = app.shapeDefaults(type);
			return {
				id: PMT.Project.uid('sh'),
				type: type,
				points: points,
				legendId: d.legendId,
				slopeId: null,
				color: d.color,
				strokeWidth: d.strokeWidth,
				fontSize: d.fontSize,
				text: '',
				deduction: false
			};
		}

		/* --------------------------------------------- multi-point tool */

		function MultiPoint(opts) {
			// opts: { type, finishType, autoFinish, closed, calibration, angle }
			var pts = [];

			function previewLine(cursor) {
				clearOverlay();
				var all = cursor ? pts.concat([cursor]) : pts.slice();
				if (all.length < 1) { return; }
				var flat = [];
				all.forEach(function (p) { flat.push(p.x, p.y); });
				overlay().add(new Konva.Line({
					points: flat, stroke: app.currentColor,
					strokeWidth: 2, strokeScaleEnabled: false,
					closed: !!opts.closed && all.length > 2,
					fill: opts.closed ? 'rgba(30,136,229,0.12)' : undefined,
					dash: [6, 4]
				}));
				all.forEach(function (p) {
					overlay().add(new Konva.Circle({
						x: p.x, y: p.y, radius: 4,
						fill: '#fff', stroke: app.currentColor,
						strokeWidth: 1.5, strokeScaleEnabled: false
					}));
				});
				overlay().batchDraw();
			}

			function commitShape() {
				if (opts.calibration) {
					if (pts.length >= 2) { app.onCalibrationLine(pts[0], pts[1]); }
				} else if (opts.angle) {
					if (pts.length >= 2) { app.onAngleLine(pts[0], pts[1]); }
				} else {
					var min = opts.closed ? 3 : 2;
					if (pts.length >= min) {
						app.addShape(makeShape(opts.type, pts.slice()));
					}
				}
				pts = [];
				clearOverlay();
			}

			return {
				onActivate: function () { pts = []; clearOverlay(); },
				onDeactivate: function () { pts = []; clearOverlay(); },
				onDown: function (doc, evt) {
					var last = pts[pts.length - 1];
					var p = snap(doc, evt, last);
					if (opts.closed && pts.length >= 3) {
						var scale = app.viewer.getScale() || 1;
						if (G.dist(p, pts[0]) < 12 / scale) { commitShape(); return; }
					}
					pts.push(p);
					previewLine(null);
					if (opts.autoFinish && pts.length >= opts.autoFinish) { commitShape(); }
				},
				onMove: function (doc, evt) {
					if (!pts.length) { return; }
					previewLine(snap(doc, evt, pts[pts.length - 1]));
				},
				onDblClick: function () { commitShape(); },
				finish: function () { commitShape(); },
				cancel: function () { pts = []; clearOverlay(); }
			};
		}

		/* --------------------------------------------- drag tool */

		function DragTool(type) {
			var start = null;

			function preview(cur) {
				clearOverlay();
				if (!start) { return; }
				if (type === 'circle') {
					overlay().add(new Konva.Circle({
						x: start.x, y: start.y, radius: G.dist(start, cur),
						stroke: app.currentColor, strokeWidth: 2,
						strokeScaleEnabled: false, dash: [6, 4]
					}));
				} else if (type === 'arrow') {
					overlay().add(new Konva.Arrow({
						points: [start.x, start.y, cur.x, cur.y],
						stroke: app.currentColor, fill: app.currentColor,
						strokeWidth: 2, strokeScaleEnabled: false
					}));
				} else { // rect
					var c = G.rectCorners([start, cur]);
					var flat = [];
					c.forEach(function (p) { flat.push(p.x, p.y); });
					overlay().add(new Konva.Line({
						points: flat, closed: true, stroke: app.currentColor,
						strokeWidth: 2, strokeScaleEnabled: false,
						fill: 'rgba(30,136,229,0.12)', dash: [6, 4]
					}));
				}
				overlay().batchDraw();
			}

			return {
				onActivate: function () { start = null; clearOverlay(); },
				onDeactivate: function () { start = null; clearOverlay(); },
				onDown: function (doc, evt) { start = snap(doc, evt, null); },
				onMove: function (doc, evt) {
					if (start) { preview(snap(doc, evt, start)); }
				},
				onUp: function (doc, evt) {
					if (!start) { return; }
					var end = snap(doc, evt, start);
					if (G.dist(start, end) > 2) {
						app.addShape(makeShape(type, [start, end]));
					}
					start = null;
					clearOverlay();
				},
				cancel: function () { start = null; clearOverlay(); }
			};
		}

		/* --------------------------------------------- count tool */

		var countTool = {
			onDown: function (doc, evt) {
				var p = snap(doc, evt, null);
				var page = app.page();
				var legId = app.currentLegendId;
				var target = null;
				for (var i = 0; i < page.shapes.length; i++) {
					var s = page.shapes[i];
					if (s.type === 'count' && s.legendId === legId) { target = s; break; }
				}
				if (target) {
					target.points.push(p);
					app.commit();
					app.select(target.id);
				} else {
					app.addShape(makeShape('count', [p]));
				}
			}
		};

		/* --------------------------------------------- text tool */

		var textTool = {
			onDown: function (doc, evt) {
				var p = snap(doc, evt, null);
				app.promptText(function (str) {
					if (!str) { return; }
					var sh = makeShape('text', [p]);
					sh.text = str;
					app.addShape(sh);
				});
			}
		};

		/* --------------------------------------------- select tool */

		// Shape clicks are handled in the renderer (they stop propagation),
		// so any event that reaches the stage is an empty-space click.
		var selectTool = {
			onDown: function () { app.select(null); }
		};

		return {
			select: selectTool,
			calibrate: MultiPoint({ calibration: true, autoFinish: 2 }),
			linear: MultiPoint({ type: 'linear', autoFinish: 2 }),
			polyline: MultiPoint({ type: 'polyline' }),
			area: MultiPoint({ type: 'area', closed: true }),
			rect: DragTool('rect'),
			circle: DragTool('circle'),
			arrow: DragTool('arrow'),
			count: countTool,
			angle: MultiPoint({ angle: true, autoFinish: 2 }),
			text: textTool
		};
	}

	PMT.createTools = createTools;

})(window.PMT = window.PMT || {});
