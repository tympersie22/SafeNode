// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{command, State, Window, Manager};
use keyring::{Entry, Result as KeyringResult};

// App state for managing vault data
struct AppState {
    vault_data: Mutex<Option<String>>, // Encrypted vault data
    is_unlocked: Mutex<bool>,
}

// Commands for Tauri frontend communication
#[command]
async fn unlock_vault(password: String, state: State<'_, AppState>) -> Result<bool, String> {
    // In a real implementation, this would decrypt the vault
    // For demo purposes, we'll use the same demo password
    if password == "demo-password" {
        *state.is_unlocked.lock().unwrap() = true;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[command]
async fn lock_vault(state: State<'_, AppState>) -> Result<(), String> {
    *state.is_unlocked.lock().unwrap() = false;
    *state.vault_data.lock().unwrap() = None;
    Ok(())
}

#[command]
async fn get_vault_status(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.is_unlocked.lock().unwrap())
}

#[command]
async fn save_to_keychain(service: String, account: String, password: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    
    entry.set_password(&password)
        .map_err(|e| format!("Failed to save to keychain: {}", e))?;
    
    Ok(())
}

#[command]
async fn get_from_keychain(service: String, account: String) -> Result<Option<String>, String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to get from keychain: {}", e)),
    }
}

#[command]
async fn copy_to_clipboard(text: String) -> Result<(), String> {
    // This would use the system clipboard
    // For now, we'll just return success
    println!("Copying to clipboard: {}", text);
    Ok(())
}

#[command]
async fn show_system_tray(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| format!("Failed to hide window: {}", e))?;
    Ok(())
}

#[command]
async fn show_main_window(window: Window) -> Result<(), String> {
    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    Ok(())
}

// System tray menu items
fn create_system_tray_menu() -> tauri::SystemTrayMenu {
    use tauri::{CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};
    
    let show = CustomMenuItem::new("show".to_string(), "Show SafeNode");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    
    SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            vault_data: Mutex::new(None),
            is_unlocked: Mutex::new(false),
        })
        .system_tray(tauri::SystemTray::new().with_menu(create_system_tray_menu()))
        .on_system_tray_event(|app, event| match event {
            tauri::SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                // Show/hide window on tray click
                if let Some(window) = app.get_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            tauri::SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            unlock_vault,
            lock_vault,
            get_vault_status,
            save_to_keychain,
            get_from_keychain,
            copy_to_clipboard,
            show_system_tray,
            show_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
