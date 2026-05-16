<?php
/**
 * [pdf_measure_tool] shortcode + asset loading.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PMT_Shortcode {

	const KONVA_SRC      = 'https://unpkg.com/konva@9/konva.min.js';
	const PDFJS_SRC      = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js';
	const PDFJS_WORKER   = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

	/** @var PMT_Shortcode */
	private static $instance;

	public static function instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_shortcode( 'pdf_measure_tool', array( $this, 'render' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
	}

	/**
	 * Register (but do not enqueue) all assets.
	 */
	public function register_assets() {
		wp_register_script( 'pmt-konva', self::KONVA_SRC, array(), '9', true );
		wp_register_script( 'pmt-pdfjs', self::PDFJS_SRC, array(), '3.11.174', true );

		$v = PMT_VERSION;
		wp_register_script( 'pmt-core', PMT_URL . 'assets/js/core.js', array(), $v, true );
		wp_register_script( 'pmt-api', PMT_URL . 'assets/js/api.js', array( 'pmt-core' ), $v, true );
		wp_register_script( 'pmt-export', PMT_URL . 'assets/js/export.js', array( 'pmt-core' ), $v, true );
		wp_register_script( 'pmt-viewer', PMT_URL . 'assets/js/viewer.js', array( 'pmt-core', 'pmt-konva', 'pmt-pdfjs' ), $v, true );
		wp_register_script( 'pmt-renderer', PMT_URL . 'assets/js/renderer.js', array( 'pmt-core', 'pmt-konva' ), $v, true );
		wp_register_script( 'pmt-tools', PMT_URL . 'assets/js/tools.js', array( 'pmt-core', 'pmt-konva' ), $v, true );
		wp_register_script(
			'pmt-app',
			PMT_URL . 'assets/js/app.js',
			array( 'pmt-core', 'pmt-api', 'pmt-export', 'pmt-viewer', 'pmt-renderer', 'pmt-tools' ),
			$v,
			true
		);

		wp_register_style( 'pmt-style', PMT_URL . 'assets/css/app.css', array(), $v );
	}

	private function enqueue_assets() {
		wp_enqueue_style( 'pmt-style' );
		wp_enqueue_script( 'pmt-app' );

		// Localised on pmt-core so the config is defined before viewer.js runs.
		wp_localize_script(
			'pmt-core',
			'PMT_CONFIG',
			array(
				'restUrl'   => esc_url_raw( rest_url( PMT_REST::NS ) ),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'pdfWorker' => self::PDFJS_WORKER,
				'userId'    => get_current_user_id(),
			)
		);
	}

	/**
	 * Shortcode output.
	 */
	public function render( $atts ) {
		if ( ! is_user_logged_in() ) {
			return '<div class="pmt-login-required">' .
				esc_html__( 'Please log in to use the PDF Measure Tool.', 'pdf-measure-tool' ) .
				'</div>';
		}

		$this->enqueue_assets();

		ob_start();
		include PMT_DIR . 'templates/app-shell.php';
		return ob_get_clean();
	}
}
