/**
 * PDF Measure Tool — REST client. Exposes PMT.Api.
 */
(function (PMT) {
	'use strict';

	var cfg = window.PMT_CONFIG || {};

	function request(method, path, body, isForm) {
		var opts = {
			method: method,
			headers: { 'X-WP-Nonce': cfg.nonce || '' },
			credentials: 'same-origin'
		};
		if (body != null) {
			if (isForm) {
				opts.body = body;
			} else {
				opts.headers['Content-Type'] = 'application/json';
				opts.body = JSON.stringify(body);
			}
		}
		return fetch(cfg.restUrl + path, opts).then(function (r) {
			return r.json().then(function (data) {
				if (!r.ok) {
					var msg = (data && data.message) || ('Request failed (' + r.status + ')');
					throw new Error(msg);
				}
				return data;
			});
		});
	}

	PMT.Api = {
		/** True only when a logged-in user can use the save/open endpoints. */
		available: function () {
			return !!cfg.restUrl && (cfg.userId || 0) > 0;
		},

		listProjects: function () {
			return request('GET', '/projects');
		},

		getProject: function (id) {
			return request('GET', '/projects/' + id);
		},

		createProject: function (payload) {
			return request('POST', '/projects', payload);
		},

		updateProject: function (id, payload) {
			return request('PUT', '/projects/' + id, payload);
		},

		deleteProject: function (id) {
			return request('DELETE', '/projects/' + id);
		},

		uploadFile: function (file) {
			var fd = new FormData();
			fd.append('file', file, file.name);
			return request('POST', '/upload', fd, true);
		}
	};

})(window.PMT = window.PMT || {});
