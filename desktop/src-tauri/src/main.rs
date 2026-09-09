// Sem console preto atrás da janela no Windows em release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .setup(|app| {
            // Ícone de bandeja: é ele que mantém os lembretes vivos com a janela fechada.
            let abrir = MenuItem::with_id(app, "abrir", "Abrir", true, None::<&str>)?;
            let sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&abrir, &sair])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Segundo Cérebro")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "abrir" => mostrar_janela(app),
                    "sair" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Fechar a janela apenas esconde — o app segue na bandeja lembrando das coisas.
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Segundo Cérebro");
}

fn mostrar_janela<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(janela) = app.get_webview_window("main") {
        let _ = janela.show();
        let _ = janela.unminimize();
        let _ = janela.set_focus();
    }
}
