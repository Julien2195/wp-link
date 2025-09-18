=== LinkFixer SEO ===
Contributors: jlemaitre
Tags: links, broken links, link checker, seo
Requires at least: 6.0
Tested up to: 6.8
Stable tag: 0.1.1
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Link scanner for WordPress. Scan internal and external links, get reports, and fix issues. Optional connection to LinkFixer Cloud.

== Description ==

LinkFixer SEO scans your WordPress site to find broken links (internal and external) and provides a clear report.

- Dashboard to start scans and view results
- Basic stats and history (Pro features available via LinkFixer Cloud)
- Lightweight admin UI (React, Vite) loaded only on the plugin page

This plugin can optionally connect to the LinkFixer Cloud service to perform scans and enable advanced features.
No data is sent without your explicit consent.

== Third-party service ==
- Service: LinkFixer Cloud (api.linkfixer.io)
- Data sent upon explicit connection: site URL and WordPress admin email (to create a service account and generate an access key)
- You can disconnect at any time from the plugin settings; this removes the stored access key from your site.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/link-fixer-seo` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Go to the plugin page in the admin and click “Connect to LinkFixer Cloud” to enable scans.

== Frequently Asked Questions ==

= Does the plugin send any data without my approval? =
No. The plugin will only contact the LinkFixer Cloud service after you click the “Connect” button and consent.

= Can I disconnect later? =
Yes. In the plugin settings, click “Delete account (disconnect)” to remove the stored key.

= Is there a free plan? =
Yes. The free plan allows limited scans. Pro unlocks additional features like unlimited scans and PDF reports.

== Screenshots ==
1. Dashboard – start scans and see summary
2. Results – list of links and statuses
3. Settings – language, theme, connection

== Changelog ==

= 0.1.1 =
* Initial release

== Upgrade Notice ==

= 0.1.1 =
First release.
