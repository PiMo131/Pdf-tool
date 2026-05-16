<?php
/**
 * Theme-free full-screen editor template (served at /pdf-tool).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php echo esc_html__( 'PDF Measure Tool', 'pdf-measure-tool' ); ?></title>
	<?php wp_head(); ?>
</head>
<body class="pmt-fullscreen-body">
	<div id="pmt-app" class="pmt-app pmt-fullscreen">
		<div class="pmt-boot"><?php echo esc_html__( 'Loading PDF Measure Tool…', 'pdf-measure-tool' ); ?></div>
	</div>
	<?php wp_footer(); ?>
</body>
</html>
