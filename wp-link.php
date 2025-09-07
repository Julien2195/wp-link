<?php
/**
 * Plugin Name:       WP Link Fixer
 * Description:       Interface d'administration (React) pour scanner les liens d'un site WordPress. Cette v1 inclut uniquement le frontend.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Your Name
 * Text Domain:       wp-link-fixer
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Hook d'activation du plugin
register_activation_hook(__FILE__, 'wp_link_scanner_activate');

function wp_link_scanner_activate()
{
    // Enregistrer l'utilisateur lors de l'activation du plugin
    wp_link_scanner_register_user();
}

function wp_link_scanner_register_user()
{
    $admin_email = get_bloginfo('admin_email');
    $site_url = home_url();

    if (empty($admin_email)) {
        return; // Pas d'email admin configuré
    }

    // URL de l'API (à configurer selon votre environnement)
    $api_url = 'https://api.linkfixer.io/api/users/register';

    $data = array(
        'email' => $admin_email,
        'site_url' => $site_url
    );

    $response = wp_remote_post($api_url, array(
        'method' => 'POST',
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'application/json',
        ),
        'body' => json_encode($data)
    ));

    if (!is_wp_error($response)) {
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (isset($result['user']['api_key'])) {
            // Stocker la clé API dans les options WordPress
            update_option('wp_link_scanner_api_key', $result['user']['api_key']);
            update_option('wp_link_scanner_user_id', $result['user']['id']);
        }
    }
}

if (!class_exists('WP_Link_Scanner')) {
    class WP_Link_Scanner
    {
        private static $instance = null;
        private static $menu_hook = '';
        private const SLUG = 'wp-link-fixer';

        public static function instance()
        {
            if (null === self::$instance) {
                self::$instance = new self();
            }
            return self::$instance;
        }

        private function __construct()
        {
            add_action('admin_menu', [$this, 'register_admin_page']);
            add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        }

        public function register_admin_page()
        {
            // Enregistre une page d'administration de premier niveau
            self::$menu_hook = add_menu_page(
                __('WP Link Fixer', 'wp-link-fixer'),
                __('WP Link Fixer', 'wp-link-fixer'),
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
            $handle = 'wp-link-fixer-app';

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

                    if (!empty($entry['css']) && is_array($entry['css'])) {
                        foreach ($entry['css'] as $i => $css_file) {
                            wp_enqueue_style($handle . '-css-' . $i, $build_url . $css_file, [], null);
                        }
                    }

                    // Expose WordPress context to the frontend (admin email, site url, API key)
                    $admin_email = get_bloginfo('admin_email');
                    $site_url    = home_url();
                    $api_key = get_option('wp_link_scanner_api_key', '');
                    wp_localize_script($handle, 'WPLS_SETTINGS', [
                        'adminEmail' => $admin_email,
                        'siteUrl'    => $site_url,
                        'apiKey' => $api_key,
                    ]);
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
                $first_js = basename($js_files[0]);
                wp_enqueue_script('wp-link-fixer-app', $build_url . 'assets/' . $first_js, [], null, true);

                // Expose WordPress context in fallback mode as well
                $admin_email = get_bloginfo('admin_email');
                $site_url    = home_url();
                $api_key = get_option('wp_link_scanner_api_key', '');
                wp_localize_script('wp-link-fixer-app', 'WPLS_SETTINGS', [
                    'adminEmail' => $admin_email,
                    'siteUrl'    => $site_url,
                    'apiKey' => $api_key,
                ]);
            }

            if (!empty($css_files)) {
                $first_css = basename($css_files[0]);
                wp_enqueue_style('wp-link-fixer-app-css', $build_url . 'assets/' . $first_css, [], null);
            }
        }

        public function render_admin_page()
        {
            echo '<div class="wrap">';
            echo '<h1 style="margin-bottom:16px">' . esc_html__('WP Link Fixer', 'wp-link-fixer') . '</h1>';
            echo '<div id="wp-link-fixer-root" style="min-height: 500px;"></div>';
            echo '<noscript>' . esc_html__('Veuillez activer JavaScript pour utiliser WP Link Fixer.', 'wp-link-fixer') . '</noscript>';
            echo '</div>';
        }
    }
}

WP_Link_Scanner::instance();
