use tauri::{
    webview::{NewWindowFeatures, NewWindowResponse},
    AppHandle, Url, WebviewUrl, WebviewWindowBuilder, Wry,
};
use uuid::Uuid;

const PRINT_PREVIEW_TITLE: &str = "Alhangeul 인쇄 미리보기";

pub(crate) fn handler(
    app: &AppHandle,
) -> impl Fn(Url, NewWindowFeatures) -> NewWindowResponse<Wry> + Send + Sync + 'static {
    let app = app.clone();
    move |url, features| {
        if !is_allowed_url(&url) {
            eprintln!("[print] 허용되지 않은 새 창 요청 거부: {}", url);
            return NewWindowResponse::Deny;
        }

        let label = format!("print{}", Uuid::new_v4().simple());
        let builder = WebviewWindowBuilder::new(
            &app,
            label,
            WebviewUrl::External("about:blank".parse().expect("valid about:blank URL")),
        )
        .window_features(features)
        .title(PRINT_PREVIEW_TITLE)
        .on_document_title_changed(|window, title| {
            let _ = window.set_title(&title);
        });

        match builder.build() {
            Ok(window) => NewWindowResponse::Create { window },
            Err(error) => {
                eprintln!("[print] 인쇄 미리보기 창 생성 실패: {}", error);
                NewWindowResponse::Deny
            }
        }
    }
}

fn is_allowed_url(url: &Url) -> bool {
    is_allowed_url_for_mode(url, cfg!(debug_assertions))
}

fn is_allowed_url_for_mode(url: &Url, allow_dev_origin: bool) -> bool {
    if url.path() != "/print.html"
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return false;
    }

    let production_origin = matches!(
        (url.scheme(), url.host_str(), url.port()),
        ("tauri", Some("localhost"), None)
            | ("http", Some("tauri.localhost"), None)
            | ("https", Some("tauri.localhost"), None)
    );
    let dev_origin = allow_dev_origin
        && matches!(
            (url.scheme(), url.host_str(), url.port()),
            ("http", Some("127.0.0.1"), Some(7700))
        );

    production_origin || dev_origin
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_only_exact_production_surface() {
        for url in [
            "tauri://localhost/print.html",
            "http://tauri.localhost/print.html",
            "https://tauri.localhost/print.html",
        ] {
            assert!(is_allowed_url_for_mode(&Url::parse(url).unwrap(), false));
        }

        for url in [
            "https://example.com/print.html",
            "http://tauri.localhost/index.html",
            "http://tauri.localhost/print.html?source=editor",
            "http://tauri.localhost:7700/print.html",
            "file:///print.html",
        ] {
            assert!(!is_allowed_url_for_mode(&Url::parse(url).unwrap(), false));
        }
    }

    #[test]
    fn allows_only_pinned_dev_origin_in_debug_mode() {
        assert!(is_allowed_url_for_mode(
            &Url::parse("http://127.0.0.1:7700/print.html").unwrap(),
            true
        ));
        assert!(!is_allowed_url_for_mode(
            &Url::parse("http://localhost:7700/print.html").unwrap(),
            true
        ));
        assert!(!is_allowed_url_for_mode(
            &Url::parse("http://127.0.0.1:7701/print.html").unwrap(),
            true
        ));
        assert!(!is_allowed_url_for_mode(
            &Url::parse("http://127.0.0.1:7700/print.html").unwrap(),
            false
        ));
    }
}
