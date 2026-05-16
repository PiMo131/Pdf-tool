/**
 * PDF Measure Tool — draws shapes + edit handles onto the Konva layers.
 * Exposes PMT.Renderer.
 *
 * ctx must provide:
 *   getProject(), getPage(), getSelectedId(), getTool(),
 *   onSelect(id), onCommit()
 */
(function (PMT) {
	'use strict';

	var G = PMT.Geometry;

	function hexToRgba(hex, alpha) {
		var h = (hex || '#000000').replace('#', '');
		if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
		var n = parseInt(h, 16);
		return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
	}

	function flat(points) {
		var out = [], i;
		for (i = 0; i < points.length; i++) { out.push(points[i].x, points[i].y); }
		return out;
	}

	function Renderer(viewer, ctx) {
		this.viewer = viewer;
		this.ctx = ctx;
		this.shapeLayer = viewer.shapeLayer;
		this.handleLayer = viewer.handleLayer;
	}

	Renderer.prototype._color = function (shape) {
		if (shape.color) { return shape.color; }
		var leg = shape.legendId && PMT.Project.findLegend(this.ctx.getProject(), shape.legendId);
		return leg ? leg.color : '#e6194b';
	};

	Renderer.prototype.render = function () {
		this.shapeLayer.destroyChildren();
		var page = this.ctx.getPage();
		if (page) {
			for (var i = 0; i < page.shapes.length; i++) {
				this._drawShape(page.shapes[i]);
			}
		}
		this.applySelection();
	};

	/** Update selection highlight + edit handles WITHOUT rebuilding shapes. */
	Renderer.prototype.applySelection = function () {
		var selId = this.ctx.getSelectedId();
		this.shapeLayer.getChildren().forEach(function (group) {
			var on = group.pmtId === selId;
			group.find('.pmt-geom').forEach(function (n) { n.shadowEnabled(on); });
		});
		this.handleLayer.destroyChildren();
		var page = this.ctx.getPage();
		if (selId && page) {
			var sel = this._find(selId);
			if (sel) { this._drawHandles(sel); }
		}
		this.shapeLayer.batchDraw();
		this.handleLayer.batchDraw();
	};

	Renderer.prototype._redrawShapesOnly = function () {
		this.shapeLayer.destroyChildren();
		var page = this.ctx.getPage();
		for (var i = 0; i < page.shapes.length; i++) {
			this._drawShape(page.shapes[i]);
		}
		var selId = this.ctx.getSelectedId();
		this.shapeLayer.getChildren().forEach(function (group) {
			var on = group.pmtId === selId;
			group.find('.pmt-geom').forEach(function (n) { n.shadowEnabled(on); });
		});
		this.shapeLayer.batchDraw();
	};

	Renderer.prototype._find = function (id) {
		var page = this.ctx.getPage();
		for (var i = 0; i < page.shapes.length; i++) {
			if (page.shapes[i].id === id) { return page.shapes[i]; }
		}
		return null;
	};

	/* ----------------------------------------------------- draw a shape */

	Renderer.prototype._drawShape = function (shape) {
		var self = this;
		var color = this._color(shape);
		var sw = shape.strokeWidth || 2;

		var group = new Konva.Group({ id: 'g_' + shape.id, name: 'pmt-shape' });
		group.pmtId = shape.id;

		var nodes = [];
		var pts = shape.points || [];

		if (shape.type === 'linear' || shape.type === 'polyline' || shape.type === 'angle') {
			nodes.push(new Konva.Line({
				points: flat(pts), stroke: color, strokeWidth: sw,
				strokeScaleEnabled: false, linejoin: 'round', lineCap: 'round',
				dash: shape.type === 'angle' ? [8, 6] : undefined,
				hitStrokeWidth: 14
			}));
		} else if (shape.type === 'arrow') {
			nodes.push(new Konva.Arrow({
				points: flat(pts), stroke: color, fill: color,
				strokeWidth: sw, strokeScaleEnabled: false,
				pointerLength: 12, pointerWidth: 12, hitStrokeWidth: 14
			}));
		} else if (shape.type === 'area' || shape.type === 'rect') {
			var poly = shape.type === 'rect' ? G.rectCorners(pts) : pts;
			nodes.push(new Konva.Line({
				points: flat(poly), closed: true,
				stroke: color, strokeWidth: sw, strokeScaleEnabled: false,
				fill: hexToRgba(color, shape.deduction ? 0.32 : 0.16),
				dash: shape.deduction ? [10, 6] : undefined,
				linejoin: 'round'
			}));
		} else if (shape.type === 'circle') {
			if (pts.length >= 2) {
				nodes.push(new Konva.Circle({
					x: pts[0].x, y: pts[0].y,
					radius: G.dist(pts[0], pts[1]),
					stroke: color, strokeWidth: sw, strokeScaleEnabled: false,
					fill: hexToRgba(color, 0.16)
				}));
			}
		} else if (shape.type === 'count') {
			for (var k = 0; k < pts.length; k++) {
				nodes.push(new Konva.Circle({
					x: pts[k].x, y: pts[k].y, radius: 7,
					fill: color, stroke: '#fff', strokeWidth: 1.5,
					strokeScaleEnabled: false
				}));
			}
		} else if (shape.type === 'text') {
			if (pts.length) {
				nodes.push(new Konva.Text({
					x: pts[0].x, y: pts[0].y,
					text: shape.text || 'Text',
					fontSize: shape.fontSize || 18,
					fill: color, fontStyle: 'bold'
				}));
			}
		}

		nodes.forEach(function (n) {
			n.name('pmt-geom');
			n.shadowColor('#1e88e5');
			n.shadowBlur(8);
			n.shadowOpacity(0.9);
			n.shadowEnabled(false);
			group.add(n);
		});

		// Measurement label.
		var label = this._buildLabel(shape, color);
		if (label) { group.add(label); }

		// Whole-shape dragging in select mode.
		var canDrag = this.ctx.getTool() === 'select';
		group.draggable(canDrag);
		group.on('mousedown touchstart', function (e) {
			if (self.ctx.getTool() === 'select') {
				e.cancelBubble = true;
				self.ctx.onSelect(shape.id);
			}
		});
		group.on('dragstart', function () {
			self.ctx.onSelect(shape.id);
		});
		group.on('dragend', function () {
			var dx = group.x(), dy = group.y();
			if (dx || dy) {
				shape.points = pts.map(function (p) {
					return { x: p.x + dx, y: p.y + dy };
				});
			}
			group.position({ x: 0, y: 0 });
			self.ctx.onCommit();
		});

		this.shapeLayer.add(group);
	};

	Renderer.prototype._buildLabel = function (shape, color) {
		if (shape.type === 'text' || shape.type === 'arrow') { return null; }
		var m = PMT.Measure.compute(shape, this.ctx.getPage(), this.ctx.getProject());
		if (!m.label) { return null; }

		var pts = shape.points || [];
		var anchor;
		if (shape.type === 'circle') {
			anchor = pts[0] ? { x: pts[0].x, y: pts[0].y } : { x: 0, y: 0 };
		} else if (shape.type === 'count') {
			anchor = pts.length ? { x: pts[0].x, y: pts[0].y - 16 } : { x: 0, y: 0 };
		} else if (pts.length) {
			anchor = G.centroid(shape.type === 'rect' ? G.rectCorners(pts) : pts);
		} else {
			return null;
		}

		var label = new Konva.Label({ x: anchor.x, y: anchor.y, listening: false });
		label.add(new Konva.Tag({
			fill: 'rgba(20,22,28,0.86)', cornerRadius: 3,
			stroke: color, strokeWidth: 1
		}));
		label.add(new Konva.Text({
			text: m.label, fontSize: 13, padding: 4, fill: '#fff'
		}));
		label.offsetX(label.width() / 2);
		label.offsetY(label.height() / 2);
		return label;
	};

	/* ----------------------------------------------------- edit handles */

	Renderer.prototype._drawHandles = function (shape) {
		var self = this;
		var pts = shape.points || [];
		if (!pts.length) { return; }
		var scale = this.viewer.getScale() || 1;
		var r = 6 / scale;

		pts.forEach(function (p, idx) {
			var anchor = new Konva.Circle({
				x: p.x, y: p.y, radius: r,
				fill: '#fff', stroke: '#1e88e5', strokeWidth: 2 / scale,
				draggable: true
			});
			anchor.on('dragmove', function () {
				pts[idx] = { x: anchor.x(), y: anchor.y() };
				self._redrawShapesOnly();
			});
			anchor.on('dragend', function () {
				self.ctx.onCommit();
			});
			anchor.on('mousedown touchstart', function (e) { e.cancelBubble = true; });
			self.handleLayer.add(anchor);
		});
	};

	/** Resize handles after a zoom change. */
	Renderer.prototype.refreshScale = function () {
		var scale = this.viewer.getScale() || 1;
		var r = 6 / scale;
		this.handleLayer.getChildren().forEach(function (n) {
			if (n.radius) { n.radius(r); n.strokeWidth(2 / scale); }
		});
		this.handleLayer.batchDraw();
	};

	PMT.Renderer = Renderer;

})(window.PMT = window.PMT || {});
