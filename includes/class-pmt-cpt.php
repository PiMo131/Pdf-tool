<?php
/**
 * Custom post type that stores measurement projects.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PMT_CPT {

	const POST_TYPE = 'pmt_project';

	/** @var PMT_CPT */
	private static $instance;

	public static function instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', array( __CLASS__, 'register' ) );
	}

	/**
	 * Register the (private) project post type.
	 */
	public static function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'label'               => __( 'PDF Measure Projects', 'pdf-measure-tool' ),
				'public'              => false,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'exclude_from_search' => true,
				'publicly_queryable'  => false,
				'hierarchical'        => false,
				'supports'            => array( 'title', 'author' ),
				'capability_type'     => 'post',
				'map_meta_cap'        => true,
			)
		);
	}
}
