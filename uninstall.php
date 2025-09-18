<?php
// If uninstall not called from WordPress, exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Clean up stored options
delete_option('wp_link_scanner_api_key');
delete_option('wp_link_scanner_user_id');

