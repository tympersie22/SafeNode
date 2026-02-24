// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use std::time::Instant;
use tauri::{command, State, Window, Manager, AppHandle};
use keyring::Entry;

mod biometrics;

// Note: For production biometric authentication on desktop:
// - macOS: Use LocalAuthentication framework via Objective-C/Swift bridge or a crate like `localauth`
// - Windows: Use Windows Hello APIs (Windows.Security.Credentials.UI)
// - Linux: Use fprintd or other biometric services
// For now, we provide placeholder implementations that return success for demo purposes

// App state for managing vault data
struct AppState {
    vault_data: Mutex<Option<String>>, // Encrypted vault data
    is_unlocked: Mutex<bool>,
    last_activity: Mutex<Option<Instant>>, // Track last activity for auto-lock
    auto_lock_timer: Mutex<Option<u64>>, // Auto-lock timeout in seconds (None = disabled)
}

// Commands for Tauri frontend communication
#[command]
async fn unlock_vault(password: String, state: State<'_, AppState>, app: AppHandle) -> Result<bool, String> {
    // In a real implementation, this would decrypt the vault
    // For demo purposes, we'll use the same demo password
    if password == "demo-password" {
        *state.is_unlocked.lock().unwrap() = true;
        *state.last_activity.lock().unwrap() = Some(Instant::now());
        
        // Update system tray menu to show lock option
        if let Some(tray) = app.tray_handle_by_id("main") {
            let is_unlocked = *state.is_unlocked.lock().unwrap();
            let _ = tray.set_menu(create_system_tray_menu(is_unlocked));
        }
        
        Ok(true)
    } else {
        Ok(false)
    }
}

#[command]
async fn lock_vault(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    *state.is_unlocked.lock().unwrap() = false;
    *state.vault_data.lock().unwrap() = None;
    *state.last_activity.lock().unwrap() = None;
    
    // Update system tray menu
    if let Some(tray) = app.tray_handle_by_id("main") {
        let _ = tray.set_menu(create_system_tray_menu(false));
    }
    
    Ok(())
}

#[command]
async fn get_vault_status(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.is_unlocked.lock().unwrap())
}

#[command]
async fn update_activity(state: State<'_, AppState>) -> Result<(), String> {
    let mut last_activity = state.last_activity.lock().unwrap();
    *last_activity = Some(Instant::now());
    Ok(())
}

#[command]
async fn set_auto_lock_timer(seconds: Option<u64>, state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let mut timer = state.auto_lock_timer.lock().unwrap();
    *timer = seconds;
    
    // Update system tray menu to reflect auto-lock setting
    if let Some(tray) = app.tray_handle_by_id("main") {
        let is_unlocked = *state.is_unlocked.lock().unwrap();
        let _ = tray.set_menu(create_system_tray_menu(is_unlocked));
    }
    
    Ok(())
}

#[command]
async fn get_auto_lock_timer(state: State<'_, AppState>) -> Result<Option<u64>, String> {
    Ok(*state.auto_lock_timer.lock().unwrap())
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
async fn delete_from_keychain(service: String, account: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    
    entry.delete_password()
        .map_err(|e| format!("Failed to delete from keychain: {}", e))?;
    
    Ok(())
}

#[command]
async fn list_keychain_accounts(_service: String) -> Result<Vec<String>, String> {
    // Note: The keyring crate doesn't directly support listing accounts
    // This is a limitation - we return an empty vec for now
    // In a production app, you might need platform-specific implementations
    // For macOS: use Security framework
    // For Windows: use Credential Manager API
    // For Linux: use Secret Service API
    Ok(vec![])
}

#[command]
async fn check_biometric_available() -> Result<serde_json::Value, String> {
    biometrics::check_biometric_available()
}

#[command]
async fn authenticate_biometric(prompt: String) -> Result<serde_json::Value, String> {
    biometrics::authenticate_biometric(&prompt)
}

#[command]
async fn copy_to_clipboard(text: String) -> Result<(), String> {
    // This would use the system clipboard
    // For now, we'll just return success
    println!("Copying to clipboard: {}", text);
    Ok(())
}

#[command]
async fn show_system_tray(window: Window, state: State<'_, AppState>) -> Result<(), String> {
    window.hide().map_err(|e| format!("Failed to hide window: {}", e))?;
    // Update activity on hide
    let _ = update_activity(state).await;
    Ok(())
}

#[command]
async fn show_main_window(window: Window, state: State<'_, AppState>) -> Result<(), String> {
    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    // Update activity on show
    let _ = update_activity(state).await;
    Ok(())
}

// System tray menu items
fn create_system_tray_menu(is_unlocked: bool) -> tauri::SystemTrayMenu {
    use tauri::{CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};
    
    let show = CustomMenuItem::new("show".to_string(), "Show SafeNode");
    let lock = CustomMenuItem::new("lock".to_string(), "Lock Vault");
    let separator = SystemTrayMenuItem::Separator;
    let auto_lock_1min = CustomMenuItem::new("auto_lock_1".to_string(), "Auto-lock: 1 min");
    let auto_lock_5min = CustomMenuItem::new("auto_lock_5".to_string(), "Auto-lock: 5 min");
    let auto_lock_15min = CustomMenuItem::new("auto_lock_15".to_string(), "Auto-lock: 15 min");
    let auto_lock_30min = CustomMenuItem::new("auto_lock_30".to_string(), "Auto-lock: 30 min");
    let auto_lock_off = CustomMenuItem::new("auto_lock_off".to_string(), "Auto-lock: Off");
    let separator2 = SystemTrayMenuItem::Separator;
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    
    let mut menu = SystemTrayMenu::new()
        .add_item(show);
    
    if is_unlocked {
        menu = menu.add_item(lock);
    }
    
    menu = menu
        .add_native_item(separator)
        .add_item(auto_lock_1min)
        .add_item(auto_lock_5min)
        .add_item(auto_lock_15min)
        .add_item(auto_lock_30min)
        .add_item(auto_lock_off)
        .add_native_item(separator2)
        .add_item(quit);
    
    menu
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            vault_data: Mutex::new(None),
            is_unlocked: Mutex::new(false),
            last_activity: Mutex::new(None),
            auto_lock_timer: Mutex::new(Some(300)), // Default: 5 minutes
        })
        .system_tray(tauri::SystemTray::new().with_id("main").with_menu(create_system_tray_menu(false)))
        .on_system_tray_event(|app, event| {
            match event {
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
                            
                            // Update activity on show
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_handle.state::<AppState>();
                                let mut last_activity = state.last_activity.lock().unwrap();
                                *last_activity = Some(Instant::now());
                            });
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
                                
                                // Update activity on show
                                let app_handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let state = app_handle.state::<AppState>();
                                    let mut last_activity = state.last_activity.lock().unwrap();
                                    *last_activity = Some(Instant::now());
                                });
                            }
                        }
                        "lock" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = lock_vault(state, app_clone.clone()).await;
                            });
                        }
                        "auto_lock_1" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = set_auto_lock_timer(Some(60), state, app_clone.clone()).await;
                            });
                        }
                        "auto_lock_5" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = set_auto_lock_timer(Some(300), state, app_clone.clone()).await;
                            });
                        }
                        "auto_lock_15" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = set_auto_lock_timer(Some(900), state, app_clone.clone()).await;
                            });
                        }
                        "auto_lock_30" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = set_auto_lock_timer(Some(1800), state, app_clone.clone()).await;
                            });
                        }
                        "auto_lock_off" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = set_auto_lock_timer(None, state, app_clone.clone()).await;
                            });
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Start auto-lock monitoring task
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    
                    let state = app_handle.state::<AppState>();
                    let is_unlocked = *state.is_unlocked.lock().unwrap();
                    if !is_unlocked {
                        continue;
                    }
                    
                    let auto_lock_timer = *state.auto_lock_timer.lock().unwrap();
                    if auto_lock_timer.is_none() {
                        continue; // Auto-lock disabled
                    }
                    
                    let last_activity = *state.last_activity.lock().unwrap();
                    if let Some(last) = last_activity {
                        let elapsed = last.elapsed().as_secs();
                        if elapsed >= auto_lock_timer.unwrap() {
                            // Auto-lock triggered
                            let app_clone = app_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let _ = lock_vault(state, app_clone.clone()).await;
                                
                                // Hide window
                                if let Some(window) = app_clone.get_window("main") {
                                    let _ = window.hide();
                                }
                            });
                        }
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            unlock_vault,
            lock_vault,
            get_vault_status,
            update_activity,
            set_auto_lock_timer,
            get_auto_lock_timer,
            save_to_keychain,
            get_from_keychain,
            delete_from_keychain,
            list_keychain_accounts,
            check_biometric_available,
            authenticate_biometric,
            copy_to_clipboard,
            show_system_tray,
            show_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
