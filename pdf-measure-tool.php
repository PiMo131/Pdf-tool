<?php
/**
 * Plugin Name:       PDF Measure Tool
 * Plugin URI:        https://example.com/pdf-measure-tool
 * Description:       Upload PDF/JPG/PNG plans, set a scale, take linear & area measurements, manage a legend with totals, annotate, and compute true roof surface areas from slope angles.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            PDF Measure Tool
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pdf-measure-tool
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PMT_VERSION', '1.0.0' );
define( 'PMT_FILE', __FILE__ );
define( 'PMT_DIR', plugin_dir_path( __FILE__ ) );
define( 'PMT_URL', plugin_dir_url( __FILE__ ) );

require_once PMT_DIR . 'includes/class-pmt-cpt.php';
require_once PMT_DIR . 'includes/class-pmt-rest.php';
require_once PMT_DIR . 'includes/class-pmt-shortcode.php';

/**
 * Boot the plugin once WordPress is ready.
 */
function pmt_init() {
	PMT_CPT::instance();
	PMT_REST::instance();
	PMT_Shortcode::instance();
}
add_action( 'plugins_loaded', 'pmt_init' );

register_activation_hook( __FILE__, function () {
	PMT_CPT::register();
	flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, function () {
	flush_rewrite_rules();
} );
