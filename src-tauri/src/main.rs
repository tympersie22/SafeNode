#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
#[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
use tauri_plugin_deep_link::DeepLinkExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            show_main_window(app);
            // On Windows/Linux, a deep link to an already-running instance is
            // delivered to this second-instance launch as an argv entry (macOS uses
            // onOpenUrl instead). Forward the raw URL to the webview, which validates
            // it strictly via parseDesktopCallback. The URL carries a one-time code,
            // so it is emitted to the app only — never logged or executed.
            if let Some(url) = argv.iter().find(|arg| arg.starts_with("safenode://")) {
                let _ = app.emit("deep-link-received", url.clone());
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            app.deep_link().register_all()?;

            let app_menu = SubmenuBuilder::new(app, "Safenode")
                .about(None)
                .separator()
                .text("lock-vault", "Lock Vault")
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .close_window()
                .build()?;
            let menu = MenuBuilder::new(app)
                .items(&[&app_menu, &edit_menu, &window_menu])
                .build()?;
            app.set_menu(menu)?;

            let show =
                tauri::menu::MenuItem::with_id(app, "show", "Open Safenode", true, None::<&str>)?;
            let lock = tauri::menu::MenuItem::with_id(
                app,
                "lock-vault",
                "Lock Vault",
                true,
                None::<&str>,
            )?;
            let quit =
                tauri::menu::MenuItem::with_id(app, "quit", "Quit Safenode", true, None::<&str>)?;
            let tray_menu = tauri::menu::Menu::with_items(app, &[&show, &lock, &quit])?;
            let mut tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("Safenode")
                .show_menu_on_left_click(false);
            if let Some(icon) = app.default_window_icon() {
                tray = tray
                    .icon(icon.clone())
                    .icon_as_template(cfg!(target_os = "macos"));
            }
            tray.on_menu_event(|app, event| match event.id().as_ref() {
                "show" => show_main_window(app),
                "lock-vault" => lock_vault(app),
                "quit" => app.exit(0),
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    show_main_window(tray.app_handle());
                }
            })
            .build(app)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "lock-vault" {
                lock_vault(app);
            }
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("safenode:lock-requested", ());
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run Safenode desktop");
}

fn lock_vault(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("safenode:lock-requested", ());
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
