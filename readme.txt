=== PDF Measure Tool ===
Contributors: pdfmeasuretool
Tags: pdf, measurement, takeoff, annotations, blueprint
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

On-screen measurement and takeoff tool for PDF, JPG and PNG plans.

== Description ==

PDF Measure Tool lets logged-in users upload a PDF, JPG or PNG plan, set a
real-world scale and take measurements directly in the browser.

Features:

* Upload PDF / JPG / PNG (multi-page PDFs supported).
* Scale calibration from a known dimension.
* Linear, polyline, polygon area, rectangle and circle measurements.
* Count / tally tool.
* Legend with per-item totals (length, area, count) and optional costing
  (unit cost + waste %).
* Annotations: text, arrows and shapes with a colour palette and font sizes.
* Roof / slope tool: measure a pitch angle from an elevation view and apply it
  to plan-view areas to recover the true sloped surface area.
* Optional downhill direction per slope for accurate per-segment sloped lengths.
* Verify-scale tool to check calibration accuracy against a known dimension.
* Reusable legend templates (saved in the browser).
* Deductions (subtract openings from an area total).
* Undo / redo, snapping, metric & imperial units.
* Exports: CSV takeoff, annotated PNG, annotated plan PDF, cost report PDF.
* Projects saved per user.
* Full-screen editor at /pdf-tool.

== Usage ==

Place the shortcode `[pdf_measure_tool]` on any page, or visit /pdf-tool for the
full-screen editor (after the plugin is activated and permalinks are flushed).

== Changelog ==

= 1.1.0 =
* Annotated plan PDF and cost report PDF exports.
* Verify-scale tool and per-slope downhill direction.
* Reusable legend templates.
* Full-screen editor at /pdf-tool.

= 1.0.0 =
* Initial release.
