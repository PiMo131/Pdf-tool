<?php
/**
 * Full-screen editor at /pdf-tool (rewrite endpoint, theme-free).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PMT_Page {

	const QUERY_VAR = 'pmt_fullscreen';
	const SLUG      = 'pdf-tool';

	/** @var PMT_Page */
	private static $instance;

	public static function instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', array( __CLASS__, 'add_rewrite_rules' ) );
		add_filter( 'query_vars', array( $this, 'register_query_var' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue' ) );
		add_action( 'template_redirect', array( $this, 'maybe_render' ) );
	}

	/**
	 * Map /pdf-tool to the full-screen query var. Also called on activation.
	 */
	public static function add_rewrite_rules() {
		add_rewrite_rule( '^' . self::SLUG . '/?$', 'index.php?' . self::QUERY_VAR . '=1', 'top' );
	}

	public function register_query_var( $vars ) {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	private function is_endpoint() {
		return (bool) get_query_var( self::QUERY_VAR );
	}

	public function maybe_enqueue() {
		if ( $this->is_endpoint() ) {
			PMT_Shortcode::instance()->enqueue_assets();
		}
	}

	public function maybe_render() {
		if ( ! $this->is_endpoint() ) {
			return;
		}
		if ( ! is_user_logged_in() ) {
			auth_redirect();
			exit;
		}
		add_filter( 'show_admin_bar', '__return_false' );
		status_header( 200 );
		include PMT_DIR . 'templates/fullscreen.php';
		exit;
	}
}
