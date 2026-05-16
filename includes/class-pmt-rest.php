<?php
/**
 * REST API: project CRUD + file upload.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PMT_REST {

	const NS = 'pmt/v1';

	const META_DATA       = '_pmt_data';
	const META_ATTACHMENT = '_pmt_attachment_id';

	/** @var PMT_REST */
	private static $instance;

	public static function instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		register_rest_route(
			self::NS,
			'/projects',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'list_projects' ),
					'permission_callback' => array( $this, 'can_use' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_project' ),
					'permission_callback' => array( $this, 'can_use' ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/projects/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_project' ),
					'permission_callback' => array( $this, 'can_edit_project' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_project' ),
					'permission_callback' => array( $this, 'can_edit_project' ),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_project' ),
					'permission_callback' => array( $this, 'can_edit_project' ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/upload',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'upload' ),
				'permission_callback' => array( $this, 'can_upload' ),
			)
		);
	}

	/* -------------------------------------------------- permissions */

	public function can_use() {
		return is_user_logged_in();
	}

	public function can_upload() {
		return is_user_logged_in() && current_user_can( 'upload_files' );
	}

	public function can_edit_project( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() ) {
			return false;
		}
		$post = get_post( (int) $request['id'] );
		if ( ! $post || PMT_CPT::POST_TYPE !== $post->post_type ) {
			return false;
		}
		return ( (int) $post->post_author === get_current_user_id() ) || current_user_can( 'manage_options' );
	}

	/* -------------------------------------------------- handlers */

	public function list_projects() {
		$args = array(
			'post_type'      => PMT_CPT::POST_TYPE,
			'post_status'    => 'any',
			'posts_per_page' => 100,
			'orderby'        => 'modified',
			'order'          => 'DESC',
		);
		if ( ! current_user_can( 'manage_options' ) ) {
			$args['author'] = get_current_user_id();
		}

		$out = array();
		foreach ( get_posts( $args ) as $post ) {
			$out[] = array(
				'id'       => $post->ID,
				'name'     => $post->post_title,
				'modified' => $post->post_modified_gmt,
			);
		}
		return rest_ensure_response( $out );
	}

	public function create_project( WP_REST_Request $request ) {
		$name = sanitize_text_field( (string) $request->get_param( 'name' ) );
		if ( '' === $name ) {
			$name = __( 'Untitled project', 'pdf-measure-tool' );
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => PMT_CPT::POST_TYPE,
				'post_title'  => $name,
				'post_status' => 'publish',
				'post_author' => get_current_user_id(),
			),
			true
		);
		if ( is_wp_error( $post_id ) ) {
			return new WP_Error( 'pmt_create_failed', $post_id->get_error_message(), array( 'status' => 500 ) );
		}

		$data          = $request->get_param( 'data' );
		$attachment_id = (int) $request->get_param( 'attachmentId' );
		if ( is_array( $data ) || is_string( $data ) ) {
			update_post_meta( $post_id, self::META_DATA, wp_slash( wp_json_encode( $data ) ) );
		}
		if ( $attachment_id ) {
			update_post_meta( $post_id, self::META_ATTACHMENT, $attachment_id );
		}

		return rest_ensure_response( $this->project_payload( get_post( $post_id ) ) );
	}

	public function get_project( WP_REST_Request $request ) {
		return rest_ensure_response( $this->project_payload( get_post( (int) $request['id'] ) ) );
	}

	public function update_project( WP_REST_Request $request ) {
		$post_id = (int) $request['id'];

		$name = $request->get_param( 'name' );
		if ( null !== $name ) {
			wp_update_post(
				array(
					'ID'         => $post_id,
					'post_title' => sanitize_text_field( (string) $name ),
				)
			);
		}

		$data = $request->get_param( 'data' );
		if ( null !== $data ) {
			update_post_meta( $post_id, self::META_DATA, wp_slash( wp_json_encode( $data ) ) );
		}

		$attachment_id = $request->get_param( 'attachmentId' );
		if ( null !== $attachment_id ) {
			update_post_meta( $post_id, self::META_ATTACHMENT, (int) $attachment_id );
		}

		return rest_ensure_response( $this->project_payload( get_post( $post_id ) ) );
	}

	public function delete_project( WP_REST_Request $request ) {
		$ok = wp_delete_post( (int) $request['id'], true );
		if ( ! $ok ) {
			return new WP_Error( 'pmt_delete_failed', __( 'Could not delete project.', 'pdf-measure-tool' ), array( 'status' => 500 ) );
		}
		return rest_ensure_response( array( 'deleted' => true ) );
	}

	/**
	 * Receive a PDF/JPG/PNG file into the media library.
	 */
	public function upload( WP_REST_Request $request ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$files = $request->get_file_params();
		if ( empty( $files['file'] ) ) {
			return new WP_Error( 'pmt_no_file', __( 'No file received.', 'pdf-measure-tool' ), array( 'status' => 400 ) );
		}

		$allowed = array( 'application/pdf', 'image/jpeg', 'image/png' );
		$check   = wp_check_filetype_and_ext( $files['file']['tmp_name'], $files['file']['name'] );
		if ( empty( $check['type'] ) || ! in_array( $check['type'], $allowed, true ) ) {
			return new WP_Error( 'pmt_bad_type', __( 'Only PDF, JPG and PNG files are allowed.', 'pdf-measure-tool' ), array( 'status' => 400 ) );
		}

		$_FILES['pmt_file'] = $files['file'];
		$attachment_id      = media_handle_upload(
			'pmt_file',
			0,
			array(),
			array(
				'test_form' => false,
				'mimes'     => array(
					'pdf'          => 'application/pdf',
					'jpg|jpeg|jpe' => 'image/jpeg',
					'png'          => 'image/png',
				),
			)
		);

		if ( is_wp_error( $attachment_id ) ) {
			return new WP_Error( 'pmt_upload_failed', $attachment_id->get_error_message(), array( 'status' => 500 ) );
		}

		return rest_ensure_response(
			array(
				'attachmentId' => (int) $attachment_id,
				'url'          => wp_get_attachment_url( $attachment_id ),
				'mime'         => get_post_mime_type( $attachment_id ),
				'filename'     => basename( get_attached_file( $attachment_id ) ),
			)
		);
	}

	/* -------------------------------------------------- helpers */

	private function project_payload( $post ) {
		$raw  = get_post_meta( $post->ID, self::META_DATA, true );
		$data = $raw ? json_decode( $raw, true ) : null;

		$attachment_id  = (int) get_post_meta( $post->ID, self::META_ATTACHMENT, true );
		$attachment_url = $attachment_id ? wp_get_attachment_url( $attachment_id ) : '';
		$attachment_mime = $attachment_id ? get_post_mime_type( $attachment_id ) : '';

		return array(
			'id'             => $post->ID,
			'name'           => $post->post_title,
			'modified'       => $post->post_modified_gmt,
			'attachmentId'   => $attachment_id,
			'attachmentUrl'  => $attachment_url,
			'attachmentMime' => $attachment_mime,
			'data'           => $data,
		);
	}
}
