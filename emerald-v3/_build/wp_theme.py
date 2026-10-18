#!/usr/bin/env python3
"""Package the built ivory site as a WordPress theme: emerald-v3/dist/emerald-ivoire.zip

The theme serves the generated pages at the same URLs as the static build
(/, /sapphire-ballroom/, /nunti-targu-mures/ ...). Any other WordPress page or
post still renders through a minimal fallback template, and wp-admin is untouched.

Run after build.py:  python3 emerald-v3/_build/wp_theme.py
"""
import glob
import json
import os
import re
import zipfile

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST = os.path.join(ROOT, "dist")
SLUG = "emerald-ivoire"
SITE = "https://emeraldluxuryevents.ro"
T = "%%T%%"  # replaced at runtime with the theme's /site URL

STYLE_HEADER = """/*
Theme Name: Emerald Ivoire
Theme URI: https://emeraldluxuryevents.ro/
Description: Tema Emerald Luxury Events, stil ivoire și champagne. Paginile site-ului sunt servite din folderul site/ al temei, la aceleași adrese ca înainte.
Version: 1.0.0
Requires at least: 5.8
Requires PHP: 7.4
Text Domain: emerald-ivoire
*/
"""

FUNCTIONS = r"""<?php
/**
 * Emerald Ivoire: serves the pre-built pages from /site at their usual URLs.
 */
if (!defined('ABSPATH')) { exit; }

function emerald_site_dir() { return get_template_directory() . '/site/'; }

function emerald_fill($html) {
    return str_replace('%%T%%', get_template_directory_uri() . '/site', $html);
}

function emerald_request_path() {
    $path = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
    $base = trim((string) parse_url(home_url('/'), PHP_URL_PATH), '/');
    if ($base !== '' && strpos($path, $base) === 0) {
        $path = trim(substr($path, strlen($base)), '/');
    }
    return $path;
}

function emerald_send($file, $type, $status = 200) {
    status_header($status);
    header('Content-Type: ' . $type . '; charset=utf-8');
    echo emerald_fill(file_get_contents($file));
    exit;
}

add_action('template_redirect', function () {
    if (is_admin() || is_preview() || is_search() || is_feed()) { return; }
    foreach (array('p', 'page_id', 's', 'preview', 'feed') as $q) {
        if (isset($_GET[$q])) { return; }
    }
    $path = emerald_request_path();
    $dir = emerald_site_dir();

    $files = array(
        'sitemap.xml'   => array('sitemap.xml', 'application/xml'),
        'llms.txt'      => array('llms.txt', 'text/plain'),
        'llms-full.txt' => array('llms-full.txt', 'text/plain'),
    );
    if (isset($files[$path])) {
        emerald_send($dir . $files[$path][0], $files[$path][1]);
    }
    if (!preg_match('~^[a-z0-9-]*$~', $path)) { return; }

    $page = $dir . 'pages/' . ($path === '' ? 'index' : $path) . '.html';
    if (is_file($page)) {
        emerald_send($page, 'text/html');
    }
    if (is_404()) {
        emerald_send($dir . 'pages/404.html', 'text/html', 404);
    }
}, 0);

/* robots.txt from the theme, so it lists the sitemap and allows AI crawlers */
add_filter('robots_txt', function ($output, $public) {
    $file = emerald_site_dir() . 'robots.txt';
    return ($public && is_file($file)) ? file_get_contents($file) : $output;
}, 99, 2);

/* the built pages carry their own sitemap; switch off the core one to avoid two */
add_filter('wp_sitemaps_enabled', '__return_false');

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
});

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('emerald-fonts', 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Figtree:wght@400;500;600&family=Pinyon+Script&display=swap', array(), null);
    wp_enqueue_style('emerald-site', get_template_directory_uri() . '/site/assets/css/style.css', array(), '1.0.0');
});
"""

INDEX = r"""<?php
/* Fallback for WordPress pages and posts that are not part of the built site. */
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<header class="site-header"><div class="wrap bar" style="grid-template-columns:1fr auto 1fr">
  <span></span>
  <a class="brand" href="<?php echo esc_url(home_url('/')); ?>"><img src="<?php echo esc_url(get_template_directory_uri() . '/site/img/logo-dark.webp'); ?>" alt="Emerald Luxury Events" width="700" height="292"></a>
  <span></span>
</div></header>
<main class="section"><div class="wrap narrow">
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <article>
    <h1><?php the_title(); ?></h1>
    <div class="text"><?php the_content(); ?></div>
  </article>
<?php endwhile; else : ?>
  <h1>Pagina nu există</h1>
  <p><a class="btn btn-green" href="<?php echo esc_url(home_url('/')); ?>">Pagina principală</a></p>
<?php endif; ?>
</div></main>
<?php wp_footer(); ?>
</body>
</html>
"""

README = """Emerald Ivoire – temă WordPress
================================

Instalare: Aspect → Teme → Adaugă temă → Încarcă temă → emerald-ivoire.zip → Instalează → Activează.
Necesar: Setări → Legături permanente = „Numele articolului” (/%postname%/).

Paginile sunt în site/pages/*.html și se servesc la adresele:
  /  /sapphire-ballroom/  /gold-ballroom/  /diamond-ballroom/  /salonul-gourmet/
  /terasa-emerald/  /gradina-emerald/  /emerald-boutique-hotel/  /servicii-all-inclusive/
  /nunti-targu-mures/  /botez-targu-mures/  /evenimente-corporate/  /galeria-foto-video/
  /despre-noi/  /contact/  /intrebari-frecvente/
plus /sitemap.xml, /robots.txt, /llms.txt, /llms-full.txt.

Textele se modifică în proiect (emerald-v3/_build/build.py), apoi se reconstruiește tema.
După activare, goliți cache-ul (dacă există un plugin de cache) și dezactivați sitemap-ul
din pluginul SEO, dacă există, ca să nu fie două sitemap-uri.
"""


def rewrite(text):
    # absolute site URLs for files the theme ships (JSON-LD, Open Graph, sitemap)
    text = re.sub(re.escape(SITE) + r"/(img|media|assets)/", T + r"/\1/", text)
    # relative and root-relative asset paths, including srcset entries and url('...')
    text = re.sub(r'(?<=["\'\s,(])(?:\.\./)*/?(img|assets|media)/', T + r"/\1/", text)
    text = re.sub(r'(?<=["\'\s,(])(?:\.\./)*site\.webmanifest', T + "/site.webmanifest", text)
    # internal page links become root-relative
    text = re.sub(r'href="(?:\./|(?:\.\./)+)"', 'href="/"', text)
    text = re.sub(r'href="(?:\.\./)*((?:[a-z0-9-]+/)+)(#[a-z-]+)?"', r'href="/\1\2"', text)
    return text


def main():
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, f"{SLUG}.zip")
    pages = {}
    for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        rel = os.path.relpath(os.path.dirname(f), ROOT)
        if rel.startswith(("dist", "_build")):
            continue
        pages["index" if rel == "." else rel] = rewrite(open(f, encoding="utf-8").read())
    pages["404"] = rewrite(open(os.path.join(ROOT, "404.html"), encoding="utf-8").read())

    used = set()
    for h in pages.values():
        used |= set(re.findall(r"%%T%%/((?:img|media|assets)/[A-Za-z0-9_./-]+)", h))
    used |= {"img/icon-192.png", "img/icon-512.png", "img/logo-dark.webp", "assets/css/style.css", "assets/js/main.js"}

    manifest = json.loads(open(os.path.join(ROOT, "site.webmanifest"), encoding="utf-8").read())
    for i in manifest["icons"]:
        i["src"] = i["src"].lstrip("/")
    manifest["start_url"] = "/"

    shot = os.path.join(DIST, ".screenshot.png")
    src = os.path.join(ROOT, "img", "g03.webp")
    im = Image.open(src).convert("RGB")
    w, h = im.size
    th = int(w * 3 / 4)
    im = im.crop((0, max(0, (h - th) // 2), w, max(0, (h - th) // 2) + min(h, th))).resize((1200, 900))
    im.save(shot)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{SLUG}/style.css", STYLE_HEADER)
        z.writestr(f"{SLUG}/functions.php", FUNCTIONS)
        z.writestr(f"{SLUG}/index.php", INDEX)
        z.writestr(f"{SLUG}/README.txt", README)
        z.write(shot, f"{SLUG}/screenshot.png")
        for name, html_ in pages.items():
            z.writestr(f"{SLUG}/site/pages/{name}.html", html_)
        for f in ("sitemap.xml", "llms.txt", "llms-full.txt", "robots.txt"):
            text = rewrite(open(os.path.join(ROOT, f), encoding="utf-8").read())
            if f == "sitemap.xml":
                # list only images the theme actually ships
                text = re.sub(r"\s*<image:image><image:loc>%%T%%/([^<]+)</image:loc></image:image>",
                              lambda m: m.group(0) if m.group(1) in used else "", text)
            z.writestr(f"{SLUG}/site/{f}", text)
        z.writestr(f"{SLUG}/site/site.webmanifest", json.dumps(manifest, ensure_ascii=False, indent=2))
        for rel in sorted(used):
            z.write(os.path.join(ROOT, rel), f"{SLUG}/site/{rel}",
                    compress_type=zipfile.ZIP_STORED if rel.endswith((".webp", ".png", ".mp4")) else zipfile.ZIP_DEFLATED)
    print(out, f"{os.path.getsize(out) / 1e6:.1f} MB", len(pages), "pages", len(used), "assets")


if __name__ == "__main__":
    main()
