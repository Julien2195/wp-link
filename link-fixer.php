<?php
/**
 * Plugin Name:       LinkFixer SEO
 * Description:       Scanner de liens pour WordPress: détecte les liens brisés, fournit des rapports détaillés (PDF), historique et planification des scans. Peut se connecter à LinkFixer Cloud pour exécuter les analyses — aucune donnée n'est envoyée sans votre consentement.
 * Version:           0.1.1
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Julien LEMAITRE
 * Author URI:        https://linkfixer.io
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       linkfixer-seo
 * Domain Path:       /languages
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

if (!class_exists('WP_Link_Scanner')) {
    class WP_Link_Scanner
    {
        private static $instance = null;
        private static $menu_hook = '';
        private const SLUG = 'linkfixer-seo';

        public static function instance()
        {
            if (null === self::$instance) {
                self::$instance = new self();
            }
            return self::$instance;
        }

        private function __construct()
        {
            // i18n
            add_action('init', function () {
                // Traductions chargées automatiquement par WordPress >= 4.6
                // Add privacy policy content (admin only)
                if (function_exists('wp_add_privacy_policy_content') && is_admin()) {
                    $content = sprintf(
                        '<p>%s</p><p>%s</p><p>%s</p>',
                        esc_html__(
                            'LinkFixer SEO can connect to the LinkFixer Cloud service to perform link scans.',
                            'link-fixer'
                        ),
                        esc_html__(
                            'When you explicitly choose to connect, your site URL and the WordPress admin email are sent to create a service account and generate an access key.',
                            'link-fixer'
                        ),
                        esc_html__(
                            'No data is sent without your consent. You can disconnect at any time from the plugin settings, which removes the stored access key from your site.',
                            'link-fixer'
                        )
                    );
                    wp_add_privacy_policy_content(__('LinkFixer SEO', 'link-fixer'), wp_kses_post($content));
                }
            });

            add_action('admin_menu', [$this, 'register_admin_page']);
            add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
            add_action('rest_api_init', [$this, 'register_rest_proxy_routes']);

            // Force type="module" on our script tag in case another plugin or theme strips it
            add_filter('script_loader_tag', function ($tag, $handle, $src) {
                if ($handle === 'link-fixer-app' && strpos($tag, ' type=') === false) {
                    $tag = str_replace(' src=', " type=\"module\" src=", $tag);
                }
                return $tag;
            }, 10, 3);

            // Ensure binary (e.g., PDF) responses are served raw by the REST server
            add_filter('rest_pre_serve_request', function ($served, $result, $request, $server) {
                if (!($result instanceof \WP_HTTP_Response)) {
                    return $served;
                }
                $headers = $result->get_headers();
                $ctype = '';
                foreach ($headers as $name => $value) {
                    if (strtolower($name) === 'content-type') {
                        $ctype = $value;
                        break;
                    }
                }
                if ($ctype && stripos($ctype, 'application/pdf') !== false) {
                    $data = $result->get_data();
                    if (is_string($data)) {
                        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Outputting raw PDF binary; escaping would corrupt the file.
                        echo $data;
                        return true; // tell WP we already served the response
                    }
                }
                return $served;
            }, 10, 4);
        }

        public function register_admin_page()
        {
            // Enregistre une page d'administration de premier niveau
            self::$menu_hook = add_menu_page(
                __('LinkFixer SEO', 'link-fixer'),
                __('LinkFixer SEO', 'link-fixer'),
                'manage_options',
                self::SLUG,
                [$this, 'render_admin_page'],
                'dashicons-admin-links',
                80
            );
        }

        public function enqueue_assets($hook)
        {
            // Ne charger les assets que sur la page du plugin
            if (empty(self::$menu_hook) || $hook !== self::$menu_hook) {
                return;
            }

            $build_dir      = plugin_dir_path(__FILE__) . 'build/';
            $build_url      = plugin_dir_url(__FILE__) . 'build/';
            // Supporte Vite qui peut écrire le manifest dans build/manifest.json ou build/.vite/manifest.json
            $manifest_path  = '';
            foreach (['manifest.json', '.vite/manifest.json'] as $candidate) {
                $candidate_path = $build_dir . $candidate;
                if (file_exists($candidate_path)) {
                    $manifest_path = $candidate_path;
                    break;
                }
            }
            $handle = 'link-fixer-app';

            // Lecture du manifest Vite pour récupérer les vrais noms de fichiers
            if (!empty($manifest_path) && file_exists($manifest_path)) {
                $manifest = json_decode(file_get_contents($manifest_path), true);
                $entry = null;

                // Entrée par défaut configurée dans vite.config.js
                if (isset($manifest['src/main.jsx'])) {
                    $entry = $manifest['src/main.jsx'];
                } elseif (isset($manifest['src/main.tsx'])) {
                    $entry = $manifest['src/main.tsx'];
                }

                if ($entry && isset($entry['file'])) {
                    $script_url = $build_url . $entry['file'];
                    wp_enqueue_script($handle, $script_url, [], null, true);
                    // Ensure ESM entry is loaded as a module
                    if (function_exists('wp_script_add_data')) {
                        wp_script_add_data($handle, 'type', 'module');
                    }

                    if (!empty($entry['css']) && is_array($entry['css'])) {
                        foreach ($entry['css'] as $i => $css_file) {
                            wp_enqueue_style($handle . '-css-' . $i, $build_url . $css_file, [], null);
                        }
                    }

                    // Expose minimal context to the frontend + REST nonce
                    wp_localize_script($handle, 'LINK_FIXER_SETTINGS', [
                        'locale'      => get_locale(),
                        'restNonce'   => wp_create_nonce('wp_rest'),
                        'restUrl'     => esc_url_raw(rest_url()),
                        'adminEmail'  => sanitize_email(get_bloginfo('admin_email')),
                    ]);
                    // Backward compat: expose legacy global used by older builds
                    if (function_exists('wp_add_inline_script')) {
                        wp_add_inline_script($handle, 'window.WPLS_SETTINGS = window.LINK_FIXER_SETTINGS;', 'after');
                    }
                } else {
                    // Fallback basique si manifest présent mais entrée absente
                    $this->enqueue_basic_fallback($build_dir, $build_url);
                }
            } else {
                // Fallback si aucun build n'a encore été généré
                $this->enqueue_basic_fallback($build_dir, $build_url);
            }
        }

        private function enqueue_basic_fallback($build_dir, $build_url)
        {
            // Essaie de charger le premier JS/CSS trouvé dans build/assets/*
            $js_files  = glob($build_dir . 'assets/*.js');
            $css_files = glob($build_dir . 'assets/*.css');

            if (!empty($js_files)) {
                // Convertit le chemin disque en URL relative au plugin
                $main_js = '';
                foreach ($js_files as $f) {
                    if (preg_match('#/assets/main-.*\\.js$#', $f)) { $main_js = basename($f); break; }
                }
                if ($main_js === '') { $main_js = basename($js_files[0]); }
                wp_enqueue_script('link-fixer-app', $build_url . 'assets/' . $main_js, [], null, true);
                if (function_exists('wp_script_add_data')) {
                    wp_script_add_data('link-fixer-app', 'type', 'module');
                }

                // Expose minimal context in fallback mode as well
                wp_localize_script('link-fixer-app', 'LINK_FIXER_SETTINGS', [
                    'locale'      => get_locale(),
                    'restNonce'   => wp_create_nonce('wp_rest'),
                    'restUrl'     => esc_url_raw(rest_url()),
                    'adminEmail'  => sanitize_email(get_bloginfo('admin_email')),
                ]);
                if (function_exists('wp_add_inline_script')) {
                    wp_add_inline_script('link-fixer-app', 'window.WPLS_SETTINGS = window.LINK_FIXER_SETTINGS;', 'after');
                }
            }

            if (!empty($css_files)) {
                $first_css = basename($css_files[0]);
                wp_enqueue_style('link-fixer-app-css', $build_url . 'assets/' . $first_css, [], null);
            }
        }

        public function render_admin_page()
        {
            echo '<div class="wrap">';
            echo '<h1 style="margin-bottom:16px">' . esc_html__('LinkFixer SEO', 'link-fixer') . '</h1>';
            echo '<div id="link-fixer-root" style="min-height: 500px;"></div>';
            echo '<noscript>' . esc_html__('Veuillez activer JavaScript pour utiliser LinkFixer SEO.', 'link-fixer') . '</noscript>';
            echo '</div>';
        }

        /**
         * Register WP REST proxy routes to forward requests to the remote API
         * while injecting the stored API key server-side.
         */
        public function register_rest_proxy_routes()
        {
            $namespace = 'link-fixer/v1';

            $routes = [
                // Local status (no forward)
                ['GET', '/status'],
                // Local disconnect (clear local credentials)
                ['POST', '/disconnect'],
                // Local delete account (remote + local cleanup)
                ['DELETE', '/delete-account'],
                // Public info
                ['GET', '/health'],
                ['GET', '/plans'],

                // User connect (explicit opt-in)
                ['POST', '/connect'],
                // User consent (WordPress context)
                ['POST', '/consent'],
                // Auth refresh (for maintaining session)
                ['POST', '/auth/refresh'],
                // User profile (for debugging/user context)
                ['GET', '/users/profile'],

                // Subscription (single endpoint; cancel/resume via payload)
                ['GET', '/me/subscription'],
                ['POST', '/me/subscription'],

                // Billing
                ['POST', '/billing/checkout/session'],
                ['POST', '/billing/checkout/session/hosted'],

                // Scans
                ['GET', '/scans'],
                ['POST', '/scans'],
                ['GET', '/scans/(?P<id>[\w\-]+)'],
                ['POST', '/scans/(?P<id>[\w\-]+)/cancel'],
                ['GET', '/scans/(?P<id>[\w\-]+)/links'],
                ['GET', '/scans/(?P<id>[\w\-]+)/report'],

                // Schedules
                ['GET', '/schedules'],
                ['POST', '/schedules'],
                ['PUT', '/schedules/(?P<sid>[\w\-]+)'],
                ['DELETE', '/schedules/(?P<sid>[\w\-]+)'],
                ['DELETE', '/schedules/history'],

                // Settings
                ['GET', '/settings/scan-defaults'],
                ['PUT', '/settings/scan-defaults'],
            ];

            foreach ($routes as [$method, $route]) {
                register_rest_route($namespace, $route, [
                    'methods'  => $method,
                    'callback' => function ($request) use ($route, $method) {
                        // Local status endpoint
                        if ($route === '/status' && $method === 'GET') {
                            $connected = !empty($this->get_api_key());
                            return new \WP_REST_Response(['connected' => $connected], 200);
                        }
                        // Local disconnect endpoint
                        if ($route === '/disconnect' && $method === 'POST') {
                            if (!current_user_can('manage_options')) {
                                return new \WP_REST_Response(['error' => 'forbidden'], 403);
                            }
                            delete_option('wp_link_scanner_api_key');
                            delete_option('wp_link_scanner_user_id');
                            return new \WP_REST_Response(['ok' => true], 200);
                        }
                        // Special case: connect route performs registration and stores API key
                        if ($route === '/connect' && $method === 'POST') {
                            return $this->handle_connect($request);
                        }
                        // Special case: consent route for WordPress context
                        if ($route === '/consent' && $method === 'POST') {
                            return $this->handle_consent($request);
                        }
                        // Special case: delete-account triggers remote deletion then clears local options
                        if ($route === '/delete-account' && $method === 'DELETE') {
                            return $this->handle_delete_account($request);
                        }

                        return $this->forward_to_remote_api($request, $route, $method);
                    },
                    'permission_callback' => function () use ($route) {
                        // Allow some endpoints to be more permissive for logged-in users
                        if (in_array($route, ['/status', '/connect', '/consent'])) {
                            return current_user_can('read');
                        }
                        // For other routes, require admin permissions
                        return current_user_can('manage_options');
                    },
                    'args' => [],
                ]);
            }
        }

        private function get_remote_base_url(): string
        {
            $default = 'https://api.linkfixer.io/api';
            // Allow filtering the remote API base if needed
            return apply_filters('wplf_remote_api_base', $default);
        }

        private function get_api_key(): string
        {
            // Reuse existing option key for backward compatibility
            return (string) get_option('wp_link_scanner_api_key', '');
        }

        private function forward_to_remote_api(\WP_REST_Request $request, string $route, string $method)
        {
            $remote_base = rtrim($this->get_remote_base_url(), '/');
            $path = ltrim($request->get_route(), '/');
            // Replace our namespace prefix from the request route to map to remote path
            $namespace_prefix = 'link-fixer/v1/';
            if (strpos($path, $namespace_prefix) === 0) {
                $path = substr($path, strlen($namespace_prefix));
            } else {
                // Fallback to explicit $route without leading slash
                $path = ltrim($route, '/');
            }

            $url = $remote_base . '/' . $path;

            $headers = [
                'Accept' => 'application/json',
            ];

            $api_key = $this->get_api_key();
            error_log('[LinkFixer] forward_to_remote_api: api_key = ' . ($api_key ? '[PRESENT]' : '[EMPTY]'));
            if (!empty($api_key)) {
                $headers['X-API-Key'] = $api_key;
            }

            $args = [
                'method'  => $method,
                'headers' => $headers,
                'timeout' => 30,
            ];

            // Query params for GET/DELETE
            $query_params = $request->get_query_params();
            if (!empty($query_params)) {
                $url = add_query_arg($query_params, $url);
            }

            // Body for POST/PUT
            if (in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
                $args['headers']['Content-Type'] = 'application/json';
                $body = $request->get_body();
                if ($body === '' || $body === null) {
                    $json = $request->get_json_params();
                    $body = $json ? wp_json_encode($json) : '';
                }
                $args['body'] = $body;
            }

            // For report PDF, accept PDF (support both leading/trailing forms)
            if (preg_match('#(^|/)scans/[^/]+/report$#', $path)) {
                $args['headers']['Accept'] = 'application/pdf';
            }

            $response = wp_remote_request($url, $args);
            if (is_wp_error($response)) {
                return new \WP_REST_Response([
                    'error' => $response->get_error_message(),
                ], 500);
            }

            $status      = wp_remote_retrieve_response_code($response) ?: 200;
            $body        = wp_remote_retrieve_body($response);
            $ctype       = wp_remote_retrieve_header($response, 'content-type');
            $disposition = wp_remote_retrieve_header($response, 'content-disposition');

            // If response is JSON or empty content type defaults to JSON
            if ($ctype && stripos($ctype, 'application/pdf') !== false) {
                $res = new \WP_REST_Response($body, $status);
                $res->header('Content-Type', 'application/pdf');
                if (!empty($disposition)) {
                    $res->header('Content-Disposition', $disposition);
                }
                return $res;
            }

            $decoded = null;
            if (!empty($body)) {
                $decoded = json_decode($body, true);
            }
            if (json_last_error() === JSON_ERROR_NONE && $decoded !== null) {
                return new \WP_REST_Response($decoded, $status);
            }
            // Fallback: return raw body
            return new \WP_REST_Response($body, $status);
        }

        private function handle_connect(\WP_REST_Request $request)
        {
            // Debug logging
            error_log('[LinkFixer] handle_connect called, user_logged_in: ' . (is_user_logged_in() ? 'YES' : 'NO'));

            if (!is_user_logged_in()) {
                error_log('[LinkFixer] User not logged in');
                return new \WP_REST_Response(['error' => 'not_logged_in'], 401);
            }

            $remote_base = rtrim($this->get_remote_base_url(), '/');
            $url = $remote_base . '/connect';

            $admin_email = sanitize_email(get_bloginfo('admin_email'));
            $site_url    = esc_url_raw(home_url());

            if (empty($admin_email)) {
                return new \WP_REST_Response(['error' => 'admin_email_missing'], 400);
            }

            $response = wp_remote_post($url, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-WP-User-Email' => $admin_email,
                    'X-WP-Site-URL' => $site_url,
                ],
                'timeout' => 30,
                'body'    => '{}', // Empty body for WordPress context
            ]);

            if (is_wp_error($response)) {
                return new \WP_REST_Response(['error' => $response->get_error_message()], 500);
            }

            $status = wp_remote_retrieve_response_code($response) ?: 200;
            $body   = wp_remote_retrieve_body($response);
            $data   = json_decode($body, true);

            if ($status >= 400) {
                return new \WP_REST_Response([
                    'error' => 'connect_failed',
                    'details' => $data,
                ], $status);
            }

            // Handle different response types
            if (isset($data['requires_consent']) && $data['requires_consent']) {
                // User doesn't exist, requires consent
                return new \WP_REST_Response([
                    'requires_consent' => true,
                    'email' => $data['email'] ?? $admin_email,
                    'message' => 'User consent required'
                ], 200);
            }

            if (isset($data['auto_connected']) && $data['auto_connected']) {
                // User exists, auto-connected
                $api_key = $data['user']['api_key'] ?? '';
                error_log('[LinkFixer] handle_connect: received api_key = ' . ($api_key ? '[PRESENT]' : '[EMPTY]'));
                if (!empty($api_key)) {
                    update_option('wp_link_scanner_api_key', sanitize_text_field($api_key));
                    error_log('[LinkFixer] handle_connect: saved api_key to wp_link_scanner_api_key');
                    if (!empty($data['user']['id'])) {
                        update_option('wp_link_scanner_user_id', intval($data['user']['id']));
                    }
                }
                return new \WP_REST_Response([
                    'ok' => true,
                    'auto_connected' => true
                ], 200);
            }

            // Fallback for unexpected response
            return new \WP_REST_Response([
                'error' => 'unexpected_response',
                'details' => $data,
            ], 500);
        }

        private function handle_consent(\WP_REST_Request $request)
        {
            if (!is_user_logged_in()) {
                return new \WP_REST_Response(['error' => 'not_logged_in'], 401);
            }

            $remote_base = rtrim($this->get_remote_base_url(), '/');
            $url = $remote_base . '/consent';

            $admin_email = sanitize_email(get_bloginfo('admin_email'));
            $site_url    = esc_url_raw(home_url());

            if (empty($admin_email)) {
                return new \WP_REST_Response(['error' => 'admin_email_missing'], 400);
            }

            $response = wp_remote_post($url, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-WP-User-Email' => $admin_email,
                    'X-WP-Site-URL' => $site_url,
                ],
                'timeout' => 30,
                'body'    => wp_json_encode(['consent' => true]),
            ]);

            if (is_wp_error($response)) {
                return new \WP_REST_Response(['error' => $response->get_error_message()], 500);
            }

            $status = wp_remote_retrieve_response_code($response) ?: 200;
            $body   = wp_remote_retrieve_body($response);
            $data   = json_decode($body, true);

            if ($status >= 400) {
                return new \WP_REST_Response([
                    'error' => 'consent_failed',
                    'details' => $data,
                ], $status);
            }

            // User created and auto-connected after consent
            if (isset($data['auto_connected']) && $data['auto_connected']) {
                $api_key = $data['user']['api_key'] ?? '';
                error_log('[LinkFixer] handle_consent: received api_key = ' . ($api_key ? '[PRESENT]' : '[EMPTY]'));
                if (!empty($api_key)) {
                    update_option('wp_link_scanner_api_key', sanitize_text_field($api_key));
                    error_log('[LinkFixer] handle_consent: saved api_key to wp_link_scanner_api_key');
                    if (!empty($data['user']['id'])) {
                        update_option('wp_link_scanner_user_id', intval($data['user']['id']));
                    }
                }
                return new \WP_REST_Response([
                    'ok' => true,
                    'auto_connected' => true
                ], 200);
            }

            return new \WP_REST_Response([
                'error' => 'unexpected_response',
                'details' => $data,
            ], 500);
        }

        /**
         * Delete the remote account then clear local credentials.
         */
        private function handle_delete_account(\WP_REST_Request $request)
        {
            if (!current_user_can('manage_options')) {
                return new \WP_REST_Response(['error' => 'forbidden'], 403);
            }

            $api_key = $this->get_api_key();
            if (empty($api_key)) {
                // Nothing to delete remotely; ensure local cleanup
                delete_option('wp_link_scanner_api_key');
                delete_option('wp_link_scanner_user_id');
                return new \WP_REST_Response(['ok' => true, 'note' => 'no_api_key'], 200);
            }

            $remote_base = rtrim($this->get_remote_base_url(), '/');
            $url = $remote_base . '/users/delete';

            $response = wp_remote_request($url, [
                'method'  => 'DELETE',
                'timeout' => 30,
                'headers' => [
                    'Accept'     => 'application/json',
                    'X-API-Key'  => $api_key,
                ],
            ]);

            // Always clear local credentials, even if remote deletion fails
            delete_option('wp_link_scanner_api_key');
            delete_option('wp_link_scanner_user_id');

            if (is_wp_error($response)) {
                return new \WP_REST_Response([
                    'ok' => true,
                    'remote_error' => $response->get_error_message(),
                ], 200);
            }

            $status = wp_remote_retrieve_response_code($response) ?: 200;
            $body   = wp_remote_retrieve_body($response);
            $data   = json_decode($body, true);

            if ($status >= 400) {
                return new \WP_REST_Response([
                    'ok' => true,
                    'remote_status' => $status,
                    'remote_body' => $data ?: $body,
                ], 200);
            }

            return new \WP_REST_Response(['ok' => true], 200);
        }
    }
}

WP_Link_Scanner::instance();
