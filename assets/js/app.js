/**
 * PDF Measure Tool — application shell, UI, state & wiring.
 */
(function (PMT) {
	'use strict';

	var G = PMT.Geometry;
	var P = PMT.Project;

	/* ============================================================ DOM helper */

	function el(tag, props, children) {
		var e = document.createElement(tag);
		if (props) {
			Object.keys(props).forEach(function (k) {
				var v = props[k];
				if (v == null) { return; }
				if (k === 'class') { e.className = v; }
				else if (k === 'text') { e.textContent = v; }
				else if (k === 'html') { e.innerHTML = v; }
				else if (k === 'style') { Object.assign(e.style, v); }
				else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
					e.addEventListener(k.slice(2).toLowerCase(), v);
				} else { e.setAttribute(k, v); }
			});
		}
		(children || []).forEach(function (c) {
			if (c == null) { return; }
			e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
		});
		return e;
	}

	function clone(o) { return JSON.parse(JSON.stringify(o)); }

	var TOOLS = [
		['select', 'Select'], ['pan', 'Pan'], ['calibrate', 'Set scale'],
		['verify', 'Verify scale'],
		['linear', 'Line'], ['polyline', 'Polyline'], ['area', 'Area'],
		['rect', 'Rectangle'], ['circle', 'Circle'], ['count', 'Count'],
		['angle', 'Pitch angle'], ['text', 'Text'], ['arrow', 'Arrow']
	];

	var UNITS = ['mm', 'cm', 'm', 'in', 'ft'];

	/* ============================================================ App */

	function App(root) {
		this.root = root;
		this.project = P.create();
		this.history = [];
		this.histIndex = -1;

		this.currentTool = 'select';
		this.selectedId = null;
		this.currentColor = P.PALETTE[0];
		this.currentStrokeWidth = 2;
		this.currentFontSize = 18;
		this.currentLegendId = null;

		this._pendingFile = null;
		this._renderedPage = -1;
		this._hasDoc = false;

		this._buildUI();
		this.viewer = new PMT.Viewer(this.canvasEl);
		this.tools = PMT.createTools(this);
		this.renderer = new PMT.Renderer(this.viewer, this._rendererCtx());

		this._bindStage();
		this._bindKeyboard();

		this._initEmpty();
	}

	App.prototype._initEmpty = function () {
		this.project = P.create();
		var leg = P.newLegendItem(this.project, 'area');
		this.project.legend.push(leg);
		this.currentLegendId = leg.id;
		this.history = [];
		this.histIndex = -1;
		this._pushHistory();
		this.setTool('select');
		this._afterChange();
		this._status('Click "New" to upload a PDF, JPG or PNG plan.');
	};

	/* ----------------------------------------------------- UI build */

	App.prototype._buildUI = function () {
		var self = this;
		this.root.innerHTML = '';

		/* ---- topbar ---- */
		this.nameInput = el('input', {
			class: 'pmt-name', type: 'text', value: this.project.name,
			onchange: function () { self.project.name = self.nameInput.value; }
		});

		this.statusEl = el('span', { class: 'pmt-status' });

		this.unitSelect = el('select', {
			class: 'pmt-select',
			onchange: function () {
				self.project.settings.displayUnit = self.unitSelect.value;
				self._unitTouched = true;
				self.commit();
			}
		}, UNITS.map(function (u) { return el('option', { value: u, text: u }); }));

		function tbtn(label, fn, cls) {
			return el('button', { class: 'pmt-btn ' + (cls || ''), text: label, onclick: fn });
		}

		var topbar = el('div', { class: 'pmt-topbar' }, [
			el('strong', { class: 'pmt-logo', text: 'PDF Measure' }),
			this.nameInput,
			tbtn('New', function () { self._newProject(); }),
			tbtn('Open', function () { self._openDialog(); }),
			tbtn('Save', function () { self._save(); }, 'pmt-primary'),
			tbtn('CSV', function () { PMT.Export.exportTakeoff(self.project); }),
			tbtn('PNG', function () { PMT.Export.exportImage(self.viewer, self.project); }),
			tbtn('Plan PDF', function () { PMT.Export.exportPlanPdf(self.viewer, self.project); }),
			tbtn('Report', function () { PMT.Export.exportReportPdf(self.project); }),
			el('span', { class: 'pmt-sep' }),
			tbtn('↶', function () { self.undo(); }),
			tbtn('↷', function () { self.redo(); }),
			el('span', { class: 'pmt-sep' }),
			tbtn('−', function () { self.viewer.zoomBy(1 / 1.2); self.renderer.refreshScale(); }),
			tbtn('Fit', function () { self.viewer.fit(); self.renderer.refreshScale(); }),
			tbtn('+', function () { self.viewer.zoomBy(1.2); self.renderer.refreshScale(); }),
			el('label', { class: 'pmt-unitlabel' }, ['Units', this.unitSelect]),
			this.statusEl
		]);

		/* ---- toolbar ---- */
		this.toolButtons = {};
		var toolbar = el('div', { class: 'pmt-toolbar' });
		TOOLS.forEach(function (t) {
			var b = el('button', {
				class: 'pmt-tool', text: t[1], title: t[1],
				onclick: function () { self.setTool(t[0]); }
			});
			self.toolButtons[t[0]] = b;
			toolbar.appendChild(b);
		});

		/* ---- canvas ---- */
		this.canvasEl = el('div', { class: 'pmt-canvas' });
		this.dropHint = el('div', { class: 'pmt-drop', text: 'Click "New" to upload a PDF, JPG or PNG plan.' });

		this.pageLabel = el('span', { class: 'pmt-pageinfo', text: '—' });
		var pagebar = el('div', { class: 'pmt-pagebar' }, [
			el('button', { class: 'pmt-btn', text: '‹ Prev', onclick: function () { self._gotoPage(self.project.activePage - 1); } }),
			this.pageLabel,
			el('button', { class: 'pmt-btn', text: 'Next ›', onclick: function () { self._gotoPage(self.project.activePage + 1); } })
		]);

		var canvasWrap = el('div', { class: 'pmt-canvas-wrap' }, [this.canvasEl, this.dropHint, pagebar]);

		/* ---- side panels ---- */
		this.drawPanel = el('div', { class: 'pmt-section' });
		this.legendPanel = el('div', { class: 'pmt-section' });
		this.slopePanel = el('div', { class: 'pmt-section' });
		this.propsPanel = el('div', { class: 'pmt-section' });
		var side = el('div', { class: 'pmt-side' }, [
			this.drawPanel, this.propsPanel, this.legendPanel, this.slopePanel
		]);

		var body = el('div', { class: 'pmt-body' }, [toolbar, canvasWrap, side]);

		this.modalHost = el('div', { class: 'pmt-modal-host' });

		this.root.appendChild(topbar);
		this.root.appendChild(body);
		this.root.appendChild(this.modalHost);
	};

	/* ----------------------------------------------------- renderer ctx */

	App.prototype._rendererCtx = function () {
		var self = this;
		return {
			getProject: function () { return self.project; },
			getPage: function () { return self.page(); },
			getSelectedId: function () { return self.selectedId; },
			getTool: function () { return self.currentTool; },
			onSelect: function (id) { self.select(id); },
			onCommit: function () { self.commit(); }
		};
	};

	/* ----------------------------------------------------- state access */

	App.prototype.page = function () {
		return this.project.pages[this.project.activePage] || null;
	};

	App.prototype.shapeDefaults = function (type) {
		var kind = PMT.Measure.kindOf(type);
		return {
			color: this.currentColor,
			strokeWidth: this.currentStrokeWidth,
			fontSize: this.currentFontSize,
			legendId: kind ? this._defaultLegendFor(kind) : null
		};
	};

	App.prototype._defaultLegendFor = function (kind) {
		var cur = P.findLegend(this.project, this.currentLegendId);
		if (cur && cur.kind === kind) { return cur.id; }
		for (var i = 0; i < this.project.legend.length; i++) {
			if (this.project.legend[i].kind === kind) { return this.project.legend[i].id; }
		}
		return null;
	};

	/* ----------------------------------------------------- mutations */

	App.prototype.addShape = function (shape) {
		var page = this.page();
		if (!page) { return; }
		page.shapes.push(shape);
		this.commit();
		this.select(shape.id);
	};

	App.prototype.deleteSelected = function () {
		if (!this.selectedId) { return; }
		var page = this.page();
		page.shapes = page.shapes.filter(function (s) { return s.id !== this.selectedId; }, this);
		this.selectedId = null;
		this.commit();
	};

	App.prototype.select = function (id) {
		var page = this.page();
		if (id && page) {
			var ok = page.shapes.some(function (s) { return s.id === id; });
			if (!ok) { id = null; }
		}
		this.selectedId = id;
		this.renderer.render();
		this._renderProps();
	};

	App.prototype.commit = function () {
		this._pushHistory();
		this._afterChange();
	};

	App.prototype._afterChange = function () {
		this.renderer.render();
		this._renderLegend();
		this._renderSlopes();
		this._renderProps();
		this._renderDrawPanel();
		this.nameInput.value = this.project.name;
		this.unitSelect.value = this.project.settings.displayUnit;
	};

	/* ----------------------------------------------------- history */

	App.prototype._pushHistory = function () {
		this.history = this.history.slice(0, this.histIndex + 1);
		this.history.push(clone(this.project));
		if (this.history.length > 60) { this.history.shift(); }
		this.histIndex = this.history.length - 1;
	};

	App.prototype._restore = function (snapshot) {
		this.project = clone(snapshot);
		if (this.selectedId) {
			var page = this.page();
			var ok = page && page.shapes.some(function (s) { return s.id === this.selectedId; }, this);
			if (!ok) { this.selectedId = null; }
		}
		var self = this;
		if (this._hasDoc && this._renderedPage !== this.project.activePage) {
			this._renderPage(this.project.activePage).then(function () { self._afterChange(); });
		} else {
			this._afterChange();
		}
	};

	App.prototype.undo = function () {
		if (this.histIndex > 0) {
			this.histIndex -= 1;
			this._restore(this.history[this.histIndex]);
		}
	};

	App.prototype.redo = function () {
		if (this.histIndex < this.history.length - 1) {
			this.histIndex += 1;
			this._restore(this.history[this.histIndex]);
		}
	};

	/* ----------------------------------------------------- tools */

	App.prototype.setTool = function (name) {
		var prev = this.tools[this.currentTool];
		if (prev && prev.onDeactivate) { prev.onDeactivate(); }

		this.currentTool = name;
		Object.keys(this.toolButtons).forEach(function (k) {
			this.toolButtons[k].classList.toggle('active', k === name);
		}, this);

		this.viewer.setPanMode(name === 'pan');
		this.canvasEl.style.cursor = (name === 'select' || name === 'pan') ? '' : 'crosshair';

		var next = this.tools[name];
		if (next && next.onActivate) { next.onActivate(); }
		this.renderer.render();
	};

	App.prototype._bindStage = function () {
		var self = this;
		var stage = this.viewer.stage;

		function route(method, e) {
			if (self.currentTool === 'pan' || self._spacePan || !self.page()) { return; }
			var t = self.tools[self.currentTool];
			if (t && t[method]) { t[method](self.viewer.docPointer(), e.evt); }
		}

		stage.on('mousedown touchstart', function (e) { route('onDown', e); });
		stage.on('mousemove touchmove', function (e) { route('onMove', e); });
		stage.on('mouseup touchend', function (e) { route('onUp', e); });
		stage.on('dblclick dbltap', function (e) { route('onDblClick', e); });
		stage.on('wheel', function () { self.renderer.refreshScale(); });
	};

	App.prototype._bindKeyboard = function () {
		var self = this;
		document.addEventListener('keydown', function (e) {
			var tag = (document.activeElement && document.activeElement.tagName) || '';
			var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				if (e.shiftKey) { self.redo(); } else { self.undo(); }
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
				e.preventDefault(); self.redo(); return;
			}
			if (typing) { return; }

			var t = self.tools[self.currentTool];
			if (e.key === 'Escape') {
				if (t && t.cancel) { t.cancel(); }
				self.setTool('select');
			} else if (e.key === 'Enter') {
				if (t && t.finish) { t.finish(); }
			} else if (e.key === 'Delete' || e.key === 'Backspace') {
				self.deleteSelected();
			} else if (e.key === ' ' && self.currentTool !== 'pan') {
				e.preventDefault();
				self.viewer.setPanMode(true);
				self._spacePan = true;
			}
		});
		document.addEventListener('keyup', function (e) {
			if (e.key === ' ' && self._spacePan) {
				self._spacePan = false;
				self.viewer.setPanMode(self.currentTool === 'pan');
			}
		});
	};

	/* ----------------------------------------------------- calibration / pitch / text */

	App.prototype.onCalibrationLine = function (a, b) {
		var self = this;
		var lengthPx = G.dist(a, b);
		var valInput = el('input', { class: 'pmt-input', type: 'number', step: 'any', value: '1', min: '0' });
		var unitSel = el('select', { class: 'pmt-select' },
			UNITS.map(function (u) {
				return el('option', { value: u, text: u, selected: u === self.project.settings.unit ? 'selected' : null });
			}));

		this._modal({
			title: 'Set scale',
			body: el('div', {}, [
				el('p', { class: 'pmt-hint', text: 'You drew a line of ' + Math.round(lengthPx) + ' px. Enter the real-world distance it represents.' }),
				el('div', { class: 'pmt-row' }, [valInput, unitSel])
			]),
			buttons: [
				{ label: 'Cancel' },
				{
					label: 'Apply scale', primary: true, onClick: function () {
						var v = parseFloat(valInput.value);
						if (!v || v <= 0) { return false; }
						var unit = unitSel.value;
						self.page().calibration = { ppu: lengthPx / v, unit: unit };
						self.project.settings.unit = unit;
						if (!self._unitTouched) { self.project.settings.displayUnit = unit; }
						self.commit();
						self.setTool('select');
					}
				}
			]
		});
	};

	App.prototype.onAngleLine = function (a, b) {
		var self = this;
		var measured = G.angleFromHorizontalDeg(a, b);

		var nameInput = el('input', { class: 'pmt-input', type: 'text', value: 'Slope ' + (this.project.slopes.length + 1) });
		var modeAngle = el('input', { type: 'radio', name: 'pmtslope', checked: 'checked' });
		var modePitch = el('input', { type: 'radio', name: 'pmtslope' });
		var angleInput = el('input', { class: 'pmt-input', type: 'number', step: 'any', value: PMT.Format.round(measured, 1) });
		var riseInput = el('input', { class: 'pmt-input pmt-small', type: 'number', step: 'any', value: '6' });
		var runInput = el('input', { class: 'pmt-input pmt-small', type: 'number', step: 'any', value: '12' });

		this._modal({
			title: 'Roof pitch / slope',
			body: el('div', {}, [
				el('p', { class: 'pmt-hint', text: 'Measured angle from horizontal: ' + PMT.Format.round(measured, 1) + '°. Save it as a reusable slope, then apply it to plan-view areas.' }),
				el('label', { class: 'pmt-field' }, ['Name', nameInput]),
				el('label', { class: 'pmt-field' }, [modeAngle, ' Use angle (°)', angleInput]),
				el('label', { class: 'pmt-field' }, [modePitch, ' Use pitch (rise : run)',
					el('span', { class: 'pmt-row' }, [riseInput, el('span', { text: ':' }), runInput])])
			]),
			buttons: [
				{ label: 'Cancel', onClick: function () { self.setTool('select'); } },
				{
					label: 'Save slope', primary: true, onClick: function () {
						var angleDeg;
						if (modePitch.checked) {
							angleDeg = G.pitchToAngleDeg(parseFloat(riseInput.value) || 0, parseFloat(runInput.value) || 1);
						} else {
							angleDeg = parseFloat(angleInput.value) || 0;
						}
						var slope = P.newSlope(self.project, nameInput.value, angleDeg);
						self.project.slopes.push(slope);

						var sh = {
							id: P.uid('sh'), type: 'angle', points: [a, b],
							legendId: null, slopeId: null,
							color: self.currentColor, strokeWidth: self.currentStrokeWidth,
							fontSize: self.currentFontSize, text: slope.name, deduction: false
						};
						self.page().shapes.push(sh);
						self.commit();
						self.setTool('select');
					}
				}
			]
		});
	};

	App.prototype.onVerifyLine = function (a, b) {
		var self = this;
		var page = this.page();
		if (!page || !page.calibration) {
			this._status('Set a scale first, then verify it.');
			this.setTool('select');
			return;
		}
		var cal = page.calibration;
		var u = this.project.settings.displayUnit;
		var lengthPx = G.dist(a, b);
		var measured = G.convertLength(lengthPx / cal.ppu, cal.unit, u);

		var expInput = el('input', { class: 'pmt-input', type: 'number', step: 'any', value: PMT.Format.round(measured, 3) });
		var resultEl = el('p', { class: 'pmt-hint' });
		function recalc() {
			var exp = parseFloat(expInput.value);
			if (!exp || exp <= 0) { resultEl.textContent = ''; return; }
			var err = (measured - exp) / exp * 100;
			resultEl.textContent = 'Measured ' + PMT.Format.number(measured, 3) + ' ' + u +
				'  ·  error ' + PMT.Format.round(err, 2) + '%';
		}
		expInput.oninput = recalc;
		recalc();

		this._modal({
			title: 'Verify scale',
			body: el('div', {}, [
				el('p', { class: 'pmt-hint', text: 'This line measures ' + PMT.Format.number(measured, 3) + ' ' + u + ' at the current scale. Enter its true distance to check accuracy.' }),
				el('label', { class: 'pmt-field' }, ['True distance (' + u + ')', expInput]),
				resultEl
			]),
			buttons: [
				{ label: 'Close', onClick: function () { self.setTool('select'); } },
				{
					label: 'Recalibrate to this', primary: true, onClick: function () {
						var exp = parseFloat(expInput.value);
						if (!exp || exp <= 0) { return false; }
						var expCal = G.convertLength(exp, u, cal.unit);
						page.calibration = { ppu: lengthPx / expCal, unit: cal.unit };
						self.commit();
						self.setTool('select');
						self._status('Scale recalibrated.');
					}
				}
			]
		});
	};

	App.prototype.onSlopeDirection = function (a, b) {
		var slope = this._slopeDirTarget && P.findSlope(this.project, this._slopeDirTarget);
		if (slope) {
			slope.directionDeg = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
			this.commit();
			this._status('Downhill direction set for "' + slope.name + '".');
		}
		this._slopeDirTarget = null;
		this.setTool('select');
	};

	App.prototype.promptText = function (cb) {
		var ta = el('textarea', { class: 'pmt-input', rows: '3' });
		this._modal({
			title: 'Add text annotation',
			body: el('div', {}, [el('label', { class: 'pmt-field' }, ['Text', ta])]),
			onShown: function () { ta.focus(); },
			buttons: [
				{ label: 'Cancel' },
				{ label: 'Add', primary: true, onClick: function () { cb(ta.value.trim()); } }
			]
		});
	};

	/* ----------------------------------------------------- panels: draw settings */

	App.prototype._renderDrawPanel = function () {
		var self = this;
		var p = this.drawPanel;
		p.innerHTML = '';
		p.appendChild(el('div', { class: 'pmt-section-title', text: 'Drawing options' }));

		var palette = el('div', { class: 'pmt-palette' });
		P.PALETTE.forEach(function (c) {
			palette.appendChild(el('button', {
				class: 'pmt-swatch' + (c === self.currentColor ? ' active' : ''),
				style: { background: c },
				onclick: function () { self.currentColor = c; self._applyToSelection('color', c); self._renderDrawPanel(); }
			}));
		});
		var custom = el('input', {
			class: 'pmt-color', type: 'color', value: this.currentColor,
			onchange: function () { self.currentColor = custom.value; self._applyToSelection('color', custom.value); }
		});

		var widthSel = el('select', { class: 'pmt-select' },
			[1, 2, 3, 4, 6, 8].map(function (w) {
				return el('option', { value: w, text: w + ' px', selected: w === self.currentStrokeWidth ? 'selected' : null });
			}));
		widthSel.onchange = function () {
			self.currentStrokeWidth = parseInt(widthSel.value, 10);
			self._applyToSelection('strokeWidth', self.currentStrokeWidth);
		};

		var fontSel = el('select', { class: 'pmt-select' },
			[12, 14, 18, 24, 32, 48].map(function (f) {
				return el('option', { value: f, text: f + ' px', selected: f === self.currentFontSize ? 'selected' : null });
			}));
		fontSel.onchange = function () {
			self.currentFontSize = parseInt(fontSel.value, 10);
			self._applyToSelection('fontSize', self.currentFontSize);
		};

		var legSel = el('select', { class: 'pmt-select' });
		legSel.appendChild(el('option', { value: '', text: '— no legend item —' }));
		this.project.legend.forEach(function (item) {
			legSel.appendChild(el('option', {
				value: item.id, text: item.name + ' (' + item.kind + ')',
				selected: item.id === self.currentLegendId ? 'selected' : null
			}));
		});
		legSel.onchange = function () { self.currentLegendId = legSel.value || null; };

		p.appendChild(el('div', { class: 'pmt-field' }, ['Colour', palette, custom]));
		p.appendChild(el('div', { class: 'pmt-field' }, ['Stroke width', widthSel]));
		p.appendChild(el('div', { class: 'pmt-field' }, ['Font size', fontSel]));
		p.appendChild(el('div', { class: 'pmt-field' }, ['Active legend item', legSel]));
		p.appendChild(el('p', { class: 'pmt-hint', text: 'Hold Shift while drawing for straight (ortho) segments. Points snap to nearby vertices.' }));
	};

	App.prototype._applyToSelection = function (prop, value) {
		if (!this.selectedId) { return; }
		var s = this._selectedShape();
		if (s) { s[prop] = value; this.commit(); }
	};

	/* ----------------------------------------------------- panels: properties */

	App.prototype._selectedShape = function () {
		var page = this.page();
		if (!page || !this.selectedId) { return null; }
		for (var i = 0; i < page.shapes.length; i++) {
			if (page.shapes[i].id === this.selectedId) { return page.shapes[i]; }
		}
		return null;
	};

	App.prototype._renderProps = function () {
		var self = this;
		var p = this.propsPanel;
		p.innerHTML = '';
		var s = this._selectedShape();
		p.appendChild(el('div', { class: 'pmt-section-title', text: 'Selection' }));
		if (!s) {
			p.appendChild(el('p', { class: 'pmt-hint', text: 'Nothing selected. Use the Select tool to pick a shape.' }));
			return;
		}

		var m = PMT.Measure.compute(s, this.page(), this.project);
		p.appendChild(el('div', { class: 'pmt-readout', text: s.type + ': ' + (m.label || '—') }));

		var kind = PMT.Measure.kindOf(s.type);

		// Legend assignment.
		if (kind) {
			var legSel = el('select', { class: 'pmt-select' });
			legSel.appendChild(el('option', { value: '', text: '— none —' }));
			this.project.legend.forEach(function (item) {
				legSel.appendChild(el('option', {
					value: item.id, text: item.name + ' (' + item.kind + ')',
					selected: item.id === s.legendId ? 'selected' : null
				}));
			});
			legSel.onchange = function () { s.legendId = legSel.value || null; self.commit(); };
			p.appendChild(el('label', { class: 'pmt-field' }, ['Legend item', legSel]));
		}

		// Slope (roof) assignment for length/area.
		if (kind === 'area' || kind === 'length') {
			var slopeSel = el('select', { class: 'pmt-select' });
			slopeSel.appendChild(el('option', { value: '', text: '— flat (no slope) —' }));
			this.project.slopes.forEach(function (sl) {
				slopeSel.appendChild(el('option', {
					value: sl.id,
					text: sl.name + ' — ' + PMT.Format.round(sl.angleDeg, 1) + '° (×' + PMT.Format.round(sl.factor, 3) + ')',
					selected: sl.id === s.slopeId ? 'selected' : null
				}));
			});
			slopeSel.onchange = function () { s.slopeId = slopeSel.value || null; self.commit(); };
			p.appendChild(el('label', { class: 'pmt-field' }, ['Roof slope', slopeSel]));
		}

		// Deduction toggle for areas.
		if (kind === 'area') {
			var dedChk = el('input', { type: 'checkbox' });
			if (s.deduction) { dedChk.checked = true; }
			dedChk.onchange = function () { s.deduction = dedChk.checked; self.commit(); };
			p.appendChild(el('label', { class: 'pmt-field pmt-inline' }, [dedChk, ' Deduction (subtract from total)']));
		}

		// Text content.
		if (s.type === 'text') {
			var txt = el('textarea', { class: 'pmt-input', rows: '2' });
			txt.value = s.text || '';
			txt.onchange = function () { s.text = txt.value; self.commit(); };
			p.appendChild(el('label', { class: 'pmt-field' }, ['Text', txt]));
		}

		// Colour.
		var col = el('input', { class: 'pmt-color', type: 'color', value: s.color || '#000000' });
		col.onchange = function () { s.color = col.value; self.commit(); };
		p.appendChild(el('label', { class: 'pmt-field' }, ['Colour', col]));

		p.appendChild(el('button', {
			class: 'pmt-btn pmt-danger pmt-full', text: 'Delete shape',
			onclick: function () { self.deleteSelected(); }
		}));
	};

	/* ----------------------------------------------------- panels: legend */

	App.prototype._renderLegend = function () {
		var self = this;
		var p = this.legendPanel;
		p.innerHTML = '';
		var head = el('div', { class: 'pmt-section-title' }, [
			el('span', { text: 'Legend & totals' }),
			el('span', { class: 'pmt-row' }, [
				el('button', {
					class: 'pmt-btn pmt-mini', text: 'Templates',
					onclick: function () { self._templateDialog(); }
				}),
				el('button', {
					class: 'pmt-btn pmt-mini', text: '+ Item',
					onclick: function () {
						var item = P.newLegendItem(self.project, 'area');
						self.project.legend.push(item);
						self.currentLegendId = item.id;
						self.commit();
					}
				})
			])
		]);
		p.appendChild(head);

		if (!this.project.legend.length) {
			p.appendChild(el('p', { class: 'pmt-hint', text: 'Add a legend item, then assign measurements to it.' }));
			return;
		}

		var totals = PMT.Measure.totals(this.project);
		var u = this.project.settings.displayUnit;
		var prec = this.project.settings.precision;
		var grand = 0;

		totals.forEach(function (t) {
			grand += t.cost;
			var item = t.item;

			var nameI = el('input', { class: 'pmt-input pmt-grow', type: 'text', value: item.name });
			nameI.onchange = function () { item.name = nameI.value; self.commit(); };

			var colorI = el('input', { class: 'pmt-color', type: 'color', value: item.color });
			colorI.onchange = function () { item.color = colorI.value; self.commit(); };

			var kindSel = el('select', { class: 'pmt-select' },
				['length', 'area', 'count'].map(function (k) {
					return el('option', { value: k, text: k, selected: k === item.kind ? 'selected' : null });
				}));
			kindSel.onchange = function () { item.kind = kindSel.value; self.commit(); };

			var costI = el('input', { class: 'pmt-input pmt-small', type: 'number', step: 'any', value: item.unitCost || 0 });
			costI.onchange = function () { item.unitCost = parseFloat(costI.value) || 0; self.commit(); };

			var wasteI = el('input', { class: 'pmt-input pmt-small', type: 'number', step: 'any', value: item.waste || 0 });
			wasteI.onchange = function () { item.waste = parseFloat(wasteI.value) || 0; self.commit(); };

			var totalText;
			if (item.kind === 'count') {
				totalText = t.count + ' items';
			} else if (item.kind === 'length') {
				totalText = PMT.Format.length(t.length, u, prec);
			} else {
				totalText = PMT.Format.area(t.area, u, prec);
			}

			var row = el('div', { class: 'pmt-legend-row' }, [
				el('div', { class: 'pmt-legend-head' }, [
					colorI, nameI,
					el('button', {
						class: 'pmt-btn pmt-mini pmt-danger', text: '×',
						onclick: function () {
							self.project.legend = self.project.legend.filter(function (x) { return x.id !== item.id; });
							self.commit();
						}
					})
				]),
				el('div', { class: 'pmt-legend-grid' }, [
					el('label', {}, ['Type', kindSel]),
					el('label', {}, ['Unit cost', costI]),
					el('label', {}, ['Waste %', wasteI])
				]),
				el('div', { class: 'pmt-legend-total' }, [
					el('span', { text: t.shapes + ' measured · ' + totalText }),
					el('strong', { text: (self.project.settings.currency || '') + PMT.Format.number(t.cost, 2) })
				])
			]);
			p.appendChild(row);
		});

		p.appendChild(el('div', { class: 'pmt-grand' }, [
			el('span', { text: 'Grand total' }),
			el('strong', { text: (this.project.settings.currency || '') + PMT.Format.number(grand, 2) })
		]));
	};

	/* ----------------------------------------------------- legend templates */

	App.prototype._templates = function () {
		try { return JSON.parse(window.localStorage.getItem('pmt_legend_templates') || '[]'); }
		catch (e) { return []; }
	};

	App.prototype._saveTemplatesList = function (arr) {
		try { window.localStorage.setItem('pmt_legend_templates', JSON.stringify(arr)); }
		catch (e) { this._status('Could not save template (storage unavailable).'); }
	};

	App.prototype._templateDialog = function () {
		var self = this;
		var nameI = el('input', { class: 'pmt-input pmt-grow', type: 'text', value: (this.project.name || 'Legend') + ' template' });
		var list = el('div', { class: 'pmt-list' });

		function refresh() {
			list.innerHTML = '';
			var tpls = self._templates();
			if (!tpls.length) {
				list.appendChild(el('p', { class: 'pmt-hint', text: 'No saved templates yet.' }));
				return;
			}
			tpls.forEach(function (tpl, idx) {
				list.appendChild(el('div', { class: 'pmt-list-row' }, [
					el('span', { class: 'pmt-grow', text: tpl.name + ' (' + tpl.items.length + ' items)' }),
					el('button', {
						class: 'pmt-btn pmt-mini', text: 'Load',
						onclick: function () {
							self.project.legend = tpl.items.map(function (it) {
								return {
									id: P.uid('leg'), name: it.name, color: it.color,
									kind: it.kind, unitCost: it.unitCost || 0, waste: it.waste || 0
								};
							});
							self.currentLegendId = self.project.legend[0] ? self.project.legend[0].id : null;
							self.commit();
							self._closeModal();
						}
					}),
					el('button', {
						class: 'pmt-btn pmt-mini pmt-danger', text: '×',
						onclick: function () {
							var t = self._templates();
							t.splice(idx, 1);
							self._saveTemplatesList(t);
							refresh();
						}
					})
				]));
			});
		}
		refresh();

		this._modal({
			title: 'Legend templates',
			body: el('div', {}, [
				el('p', { class: 'pmt-hint', text: 'Save the current legend (items, colours, costs) for reuse on other projects. Loading a template replaces the current legend.' }),
				el('div', { class: 'pmt-row' }, [
					nameI,
					el('button', {
						class: 'pmt-btn pmt-primary', text: 'Save current',
						onclick: function () {
							if (!self.project.legend.length) { return; }
							var t = self._templates();
							t.push({
								name: nameI.value || 'Template',
								items: self.project.legend.map(function (i) {
									return { name: i.name, color: i.color, kind: i.kind, unitCost: i.unitCost, waste: i.waste };
								})
							});
							self._saveTemplatesList(t);
							refresh();
						}
					})
				]),
				list
			]),
			buttons: [{ label: 'Close' }]
		});
	};

	/* ----------------------------------------------------- panels: slopes */

	App.prototype._renderSlopes = function () {
		var self = this;
		var p = this.slopePanel;
		p.innerHTML = '';
		p.appendChild(el('div', { class: 'pmt-section-title' }, [
			el('span', { text: 'Roof slopes' }),
			el('button', { class: 'pmt-btn pmt-mini', text: '+ Slope', onclick: function () { self._addSlopeDialog(); } })
		]));

		if (!this.project.slopes.length) {
			p.appendChild(el('p', { class: 'pmt-hint', text: 'Use the "Pitch angle" tool on an elevation view, or add a slope manually. Then assign it to plan-view areas to get the true sloped surface.' }));
			return;
		}

		this.project.slopes.forEach(function (sl) {
			var dirText = sl.directionDeg == null
				? 'Direction: not set — linear measures use whole-length correction'
				: 'Downhill direction: ' + PMT.Format.round(sl.directionDeg, 0) + '° (per-segment correction active)';
			var row = el('div', { class: 'pmt-slope-row' }, [
				el('div', { class: 'pmt-grow' }, [
					el('div', { text: sl.name + ' — ' + PMT.Format.round(sl.angleDeg, 1) + '° · factor ×' + PMT.Format.round(sl.factor, 3) }),
					el('div', { class: 'pmt-subtle', text: dirText })
				]),
				el('button', {
					class: 'pmt-btn pmt-mini', text: '↘ dir',
					title: 'Draw the downhill direction on the plan view',
					onclick: function () {
						self._slopeDirTarget = sl.id;
						self.setTool('slopedir');
						self._status('Draw an arrow down the slope on the plan view.');
					}
				}),
				el('button', {
					class: 'pmt-btn pmt-mini pmt-danger', text: '×',
					onclick: function () {
						self.project.slopes = self.project.slopes.filter(function (x) { return x.id !== sl.id; });
						self.project.pages.forEach(function (pg) {
							pg.shapes.forEach(function (s) { if (s.slopeId === sl.id) { s.slopeId = null; } });
						});
						self.commit();
					}
				})
			]);
			p.appendChild(row);
		});
	};

	App.prototype._addSlopeDialog = function () {
		var self = this;
		var nameI = el('input', { class: 'pmt-input', type: 'text', value: 'Slope ' + (this.project.slopes.length + 1) });
		var riseI = el('input', { class: 'pmt-input pmt-small', type: 'number', step: 'any', value: '6' });
		var runI = el('input', { class: 'pmt-input pmt-small', type: 'number', step: 'any', value: '12' });
		this._modal({
			title: 'Add roof slope',
			body: el('div', {}, [
				el('label', { class: 'pmt-field' }, ['Name', nameI]),
				el('label', { class: 'pmt-field' }, ['Pitch (rise : run)',
					el('span', { class: 'pmt-row' }, [riseI, el('span', { text: ':' }), runI])])
			]),
			buttons: [
				{ label: 'Cancel' },
				{
					label: 'Add', primary: true, onClick: function () {
						var angle = G.pitchToAngleDeg(parseFloat(riseI.value) || 0, parseFloat(runI.value) || 1);
						self.project.slopes.push(P.newSlope(self.project, nameI.value, angle));
						self.commit();
					}
				}
			]
		});
	};

	/* ----------------------------------------------------- pages */

	App.prototype._gotoPage = function (idx) {
		if (!this._hasDoc || idx < 0 || idx >= this.viewer.numPages()) { return; }
		var self = this;
		this.project.activePage = idx;
		this.selectedId = null;
		this._renderPage(idx).then(function () { self._afterChange(); });
	};

	App.prototype._renderPage = function (idx) {
		var self = this;
		return this.viewer.renderPage(idx).then(function () {
			self._renderedPage = idx;
			self.pageLabel.textContent = 'Page ' + (idx + 1) + ' / ' + self.viewer.numPages();
		});
	};

	App.prototype._setupPages = function (numPages) {
		for (var i = 0; i < numPages; i++) {
			if (!this.project.pages[i]) { this.project.pages[i] = P.blankPage(i); }
		}
	};

	/* ----------------------------------------------------- new / open / save */

	App.prototype._newProject = function () {
		var self = this;
		var input = el('input', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png' });
		input.onchange = function () {
			var file = input.files && input.files[0];
			if (!file) { return; }
			self._loadNewFile(file);
		};
		input.click();
	};

	App.prototype._loadNewFile = function (file) {
		var self = this;
		this._status('Loading file…');
		var project = P.create(file.name.replace(/\.[^.]+$/, ''));
		var leg = P.newLegendItem(project, 'area');
		project.legend.push(leg);

		this.viewer.loadFile(file).then(function (doc) {
			self.project = project;
			self.currentLegendId = leg.id;
			self.selectedId = null;
			self._pendingFile = file;
			self._hasDoc = true;
			self.dropHint.style.display = 'none';
			self._setupPages(doc.numPages);
			self.project.activePage = 0;
			self.history = [];
			self.histIndex = -1;
			return self._renderPage(0);
		}).then(function () {
			self.viewer.fit();
			self._pushHistory();
			self._afterChange();
			self.setTool('calibrate');
			self._status('Loaded. Set the scale to start measuring.');
		}).catch(function (err) {
			self._status('Error: ' + err.message);
		});
	};

	App.prototype._openDialog = function () {
		var self = this;
		if (!PMT.Api.available()) { this._status('Saving is not available.'); return; }
		var list = el('div', { class: 'pmt-list', text: 'Loading…' });
		this._modal({ title: 'Open project', body: list, buttons: [{ label: 'Close' }] });

		PMT.Api.listProjects().then(function (projects) {
			list.innerHTML = '';
			if (!projects.length) {
				list.appendChild(el('p', { class: 'pmt-hint', text: 'No saved projects yet.' }));
				return;
			}
			projects.forEach(function (pr) {
				list.appendChild(el('div', { class: 'pmt-list-row' }, [
					el('button', {
						class: 'pmt-btn pmt-grow', text: pr.name,
						onclick: function () { self._closeModal(); self._openProject(pr.id); }
					}),
					el('button', {
						class: 'pmt-btn pmt-mini pmt-danger', text: '×',
						onclick: function () {
							PMT.Api.deleteProject(pr.id).then(function () { self._openDialog(); });
						}
					})
				]));
			});
		}).catch(function (err) {
			list.textContent = 'Error: ' + err.message;
		});
	};

	App.prototype._openProject = function (id) {
		var self = this;
		this._status('Opening…');
		PMT.Api.getProject(id).then(function (payload) {
			if (!payload.attachmentUrl) {
				throw new Error('This project has no attached file.');
			}
			var project = payload.data || P.create(payload.name);
			project.id = payload.id;
			project.name = payload.name;
			project.attachmentId = payload.attachmentId;
			project.attachmentUrl = payload.attachmentUrl;

			return self.viewer.loadUrl(payload.attachmentUrl, payload.attachmentMime).then(function (doc) {
				self.project = project;
				self._pendingFile = null;
				self._hasDoc = true;
				self.selectedId = null;
				self.currentLegendId = project.legend[0] ? project.legend[0].id : null;
				self.dropHint.style.display = 'none';
				self._setupPages(doc.numPages);
				if (self.project.activePage >= doc.numPages) { self.project.activePage = 0; }
				self.history = [];
				self.histIndex = -1;
				return self._renderPage(self.project.activePage);
			});
		}).then(function () {
			self.viewer.fit();
			self._pushHistory();
			self._afterChange();
			self.setTool('select');
			self._status('Project opened.');
		}).catch(function (err) {
			self._status('Error: ' + err.message);
		});
	};

	App.prototype._save = function () {
		var self = this;
		if (!PMT.Api.available()) { this._status('Saving is not available.'); return; }
		if (!this._hasDoc) { this._status('Nothing to save yet.'); return; }
		this._status('Saving…');

		var ensureUpload = Promise.resolve();
		if (this._pendingFile && !this.project.attachmentId) {
			ensureUpload = PMT.Api.uploadFile(this._pendingFile).then(function (res) {
				self.project.attachmentId = res.attachmentId;
				self.project.attachmentUrl = res.url;
				self._pendingFile = null;
			});
		}

		ensureUpload.then(function () {
			var payload = {
				name: self.project.name,
				attachmentId: self.project.attachmentId,
				data: self.project
			};
			if (self.project.id) {
				return PMT.Api.updateProject(self.project.id, payload);
			}
			return PMT.Api.createProject(payload);
		}).then(function (res) {
			self.project.id = res.id;
			self._status('Saved.');
		}).catch(function (err) {
			self._status('Save failed: ' + err.message);
		});
	};

	App.prototype._status = function (msg) {
		this.statusEl.textContent = msg || '';
	};

	/* ----------------------------------------------------- modal */

	App.prototype._modal = function (opts) {
		var self = this;
		this._closeModal();

		var buttons = el('div', { class: 'pmt-modal-buttons' });
		(opts.buttons || [{ label: 'OK' }]).forEach(function (b) {
			buttons.appendChild(el('button', {
				class: 'pmt-btn ' + (b.primary ? 'pmt-primary' : ''),
				text: b.label,
				onclick: function () {
					var keep = b.onClick && b.onClick() === false;
					if (!keep) { self._closeModal(); }
				}
			}));
		});

		var dialog = el('div', { class: 'pmt-modal' }, [
			el('div', { class: 'pmt-modal-title', text: opts.title || '' }),
			el('div', { class: 'pmt-modal-body' }, [opts.body]),
			buttons
		]);
		var overlay = el('div', { class: 'pmt-modal-overlay' }, [dialog]);
		overlay.addEventListener('mousedown', function (e) {
			if (e.target === overlay) { self._closeModal(); }
		});
		this.modalHost.appendChild(overlay);
		this._activeModal = overlay;
		if (opts.onShown) { opts.onShown(); }
	};

	App.prototype._closeModal = function () {
		if (this._activeModal) {
			this._activeModal.remove();
			this._activeModal = null;
		}
	};

	/* ============================================================ boot */

	function boot() {
		var root = document.getElementById('pmt-app');
		if (!root || root.dataset.pmtReady) { return; }
		if (!window.Konva || !window.pdfjsLib) {
			root.innerHTML = '<div class="pmt-boot">Could not load required libraries (Konva / PDF.js). Check your network policy.</div>';
			return;
		}
		root.dataset.pmtReady = '1';
		window.PMT.app = new App(root);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}

	PMT.App = App;

})(window.PMT = window.PMT || {});
