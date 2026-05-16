/**
 * PDF Measure Tool — document viewer (PDF.js + Konva stage / zoom / pan).
 * Exposes PMT.Viewer.
 */
(function (PMT) {
	'use strict';

	var cfg = window.PMT_CONFIG || {};
	if (window.pdfjsLib && cfg.pdfWorker) {
		window.pdfjsLib.GlobalWorkerOptions.workerSrc = cfg.pdfWorker;
	}

	var RENDER_TARGET = 2200; // longest rendered side, px

	function Viewer(container) {
		this.container = container;

		this.stage = new Konva.Stage({
			container: container,
			width: container.clientWidth || 800,
			height: container.clientHeight || 600
		});

		this.bgLayer = new Konva.Layer({ listening: false });
		this.shapeLayer = new Konva.Layer();
		this.handleLayer = new Konva.Layer();
		this.overlayLayer = new Konva.Layer({ listening: false });
		this.stage.add(this.bgLayer, this.shapeLayer, this.handleLayer, this.overlayLayer);

		this.doc = null;          // { type, pdf, image, numPages }
		this.pageCanvas = {};     // index -> rendered canvas/image
		this.docWidth = 0;
		this.docHeight = 0;
		this.bgImage = null;
		this._fitted = false;

		this._bindZoom();
		this._bindResize();
	}

	Viewer.prototype.numPages = function () {
		return this.doc ? this.doc.numPages : 0;
	};

	/* ----------------------------------------------------- loading */

	Viewer.prototype.loadFile = function (file) {
		var self = this;
		var type = file.type;
		if (!type) {
			if (/\.pdf$/i.test(file.name)) { type = 'application/pdf'; }
			else if (/\.png$/i.test(file.name)) { type = 'image/png'; }
			else { type = 'image/jpeg'; }
		}
		if (type === 'application/pdf') {
			return file.arrayBuffer().then(function (buf) {
				return self._loadPdf(buf);
			});
		}
		return new Promise(function (resolve, reject) {
			var url = URL.createObjectURL(file);
			self._loadImage(url).then(resolve, reject);
		});
	};

	Viewer.prototype.loadUrl = function (url, mime) {
		var self = this;
		var isPdf = (mime === 'application/pdf') || /\.pdf(\?|$)/i.test(url);
		if (isPdf) {
			return fetch(url, { credentials: 'same-origin' })
				.then(function (r) { return r.arrayBuffer(); })
				.then(function (buf) { return self._loadPdf(buf); });
		}
		return this._loadImage(url);
	};

	Viewer.prototype._loadPdf = function (buf) {
		var self = this;
		return window.pdfjsLib.getDocument({ data: buf }).promise.then(function (pdf) {
			self.doc = { type: 'pdf', pdf: pdf, numPages: pdf.numPages };
			self.pageCanvas = {};
			return self.doc;
		});
	};

	Viewer.prototype._loadImage = function (url) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var img = new Image();
			img.onload = function () {
				self.doc = { type: 'image', image: img, numPages: 1 };
				self.pageCanvas = {};
				resolve(self.doc);
			};
			img.onerror = function () { reject(new Error('Could not load image.')); };
			img.crossOrigin = 'anonymous';
			img.src = url;
		});
	};

	/* ----------------------------------------------------- page render */

	Viewer.prototype.renderPage = function (index) {
		var self = this;
		if (!this.doc) { return Promise.reject(new Error('No document loaded.')); }

		return this._getPageCanvas(index).then(function (canvas) {
			self.docWidth = canvas.width;
			self.docHeight = canvas.height;

			self.bgLayer.destroyChildren();
			self.bgImage = new Konva.Image({
				image: canvas, x: 0, y: 0,
				width: canvas.width, height: canvas.height
			});
			self.bgLayer.add(self.bgImage);
			self.bgLayer.draw();

			if (!self._fitted) {
				self.fit();
				self._fitted = true;
			}
			return { width: canvas.width, height: canvas.height };
		});
	};

	Viewer.prototype._getPageCanvas = function (index) {
		var self = this;
		if (this.pageCanvas[index]) {
			return Promise.resolve(this.pageCanvas[index]);
		}
		if (this.doc.type === 'image') {
			this.pageCanvas[index] = this.doc.image;
			return Promise.resolve(this.doc.image);
		}
		return this.doc.pdf.getPage(index + 1).then(function (page) {
			var base = page.getViewport({ scale: 1 });
			var scale = Math.min(3, RENDER_TARGET / Math.max(base.width, base.height));
			var viewport = page.getViewport({ scale: scale });
			var canvas = document.createElement('canvas');
			canvas.width = Math.ceil(viewport.width);
			canvas.height = Math.ceil(viewport.height);
			return page.render({
				canvasContext: canvas.getContext('2d'),
				viewport: viewport
			}).promise.then(function () {
				self.pageCanvas[index] = canvas;
				return canvas;
			});
		});
	};

	/* ----------------------------------------------------- view transforms */

	Viewer.prototype.fit = function () {
		if (!this.docWidth) { return; }
		var sw = this.stage.width(), sh = this.stage.height();
		var scale = Math.min(sw / this.docWidth, sh / this.docHeight) * 0.96;
		if (!isFinite(scale) || scale <= 0) { scale = 1; }
		this.stage.scale({ x: scale, y: scale });
		this.stage.position({
			x: (sw - this.docWidth * scale) / 2,
			y: (sh - this.docHeight * scale) / 2
		});
		this.stage.batchDraw();
	};

	Viewer.prototype.zoomBy = function (factor, center) {
		var oldScale = this.stage.scaleX();
		var c = center || { x: this.stage.width() / 2, y: this.stage.height() / 2 };
		var pointTo = {
			x: (c.x - this.stage.x()) / oldScale,
			y: (c.y - this.stage.y()) / oldScale
		};
		var newScale = Math.max(0.05, Math.min(20, oldScale * factor));
		this.stage.scale({ x: newScale, y: newScale });
		this.stage.position({
			x: c.x - pointTo.x * newScale,
			y: c.y - pointTo.y * newScale
		});
		this.stage.batchDraw();
	};

	Viewer.prototype.getScale = function () {
		return this.stage.scaleX();
	};

	/** Pointer position in document coordinates. */
	Viewer.prototype.docPointer = function () {
		return this.stage.getRelativePointerPosition();
	};

	Viewer.prototype.setPanMode = function (on) {
		this.stage.draggable(!!on);
		this.container.style.cursor = on ? 'grab' : 'default';
	};

	/* ----------------------------------------------------- events */

	Viewer.prototype._bindZoom = function () {
		var self = this;
		this.stage.on('wheel', function (e) {
			e.evt.preventDefault();
			var dir = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
			self.zoomBy(dir, self.stage.getPointerPosition());
		});
	};

	Viewer.prototype._bindResize = function () {
		var self = this;
		this._onResize = function () {
			self.stage.width(self.container.clientWidth || 800);
			self.stage.height(self.container.clientHeight || 600);
			self.stage.batchDraw();
		};
		window.addEventListener('resize', this._onResize);
	};

	Viewer.prototype.destroy = function () {
		window.removeEventListener('resize', this._onResize);
		this.stage.destroy();
	};

	PMT.Viewer = Viewer;

})(window.PMT = window.PMT || {});
