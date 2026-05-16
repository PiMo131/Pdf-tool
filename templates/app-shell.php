<?php
/**
 * Root container for the measurement app. The UI is built by assets/js/app.js.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div id="pmt-app" class="pmt-app">
	<div class="pmt-boot"><?php echo esc_html__( 'Loading PDF Measure Tool…', 'pdf-measure-tool' ); ?></div>
</div>
