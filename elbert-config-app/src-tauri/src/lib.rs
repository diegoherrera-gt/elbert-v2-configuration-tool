// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::Serialize;
use std::{
    io::{BufRead, BufReader},
    path::PathBuf,
    process::{Command, Stdio},
};
use tauri::ipc::Channel;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn test_invoke(port: String, bin_path: String) -> String {
    println!("=== INVOKE RECEIVED ===");
    println!("Port: {}", port);
    println!("BIN path: {}", bin_path);

    format!("Rust received {} and {}", port, bin_path)
}

#[tauri::command]
fn test_external_process() -> Result<String, String> {
    let output = Command::new("cmd")
        .args(["/C", "echo Hola desde proceso externo"])
        .output()
        .map_err(|e| format!("Failed to execute process: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    println!("External process output:");
    println!("{}", stdout);

    Ok(stdout)
}

#[derive(Serialize)]
struct SerialPortInfoDto {
    port_name: String,
    label: String,
    vid: Option<u16>,
    pid: Option<u16>,
    manufacturer: Option<String>,
    product: Option<String>,
    serial_number: Option<String>,
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<SerialPortInfoDto>, String> {
    let ports =
        serialport::available_ports().map_err(|e| format!("Failed to list serial ports: {}", e))?;

    let result = ports
        .into_iter()
        .map(|port| {
            let mut vid = None;
            let mut pid = None;
            let mut manufacturer = None;
            let mut product = None;
            let mut serial_number = None;

            if let serialport::SerialPortType::UsbPort(usb_info) = port.port_type {
                vid = Some(usb_info.vid);
                pid = Some(usb_info.pid);
                manufacturer = usb_info.manufacturer.clone();
                product = usb_info.product.clone();
                serial_number = usb_info.serial_number.clone();
            }

            let description = product
                .clone()
                .or_else(|| manufacturer.clone())
                .unwrap_or_else(|| "Serial Port".to_string());

            SerialPortInfoDto {
                label: format!("{} — {}", port.port_name, description),
                port_name: port.port_name,
                vid,
                pid,
                manufacturer,
                product,
                serial_number,
            }
        })
        .collect();

    Ok(result)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum FlashEvent {
    Started,

    Output { message: String },

    Progress { percentage: u8 },

    Error { message: String },

    Finished { success: bool },
}

#[tauri::command]
fn flash_elbert(
    port: String,
    bin_path: String,
    on_event: Channel<FlashEvent>,
) -> Result<(), String> {
    on_event
        .send(FlashEvent::Started)
        .map_err(|e| e.to_string())?;

    println!("Starting Elbert flash...");
    println!("Port: {}", port);
    println!("BIN: {}", bin_path);

    // src-tauri/
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    // repo-root/elbertconfig.py
    let script_path = manifest_dir
        .join("../../elbertconfig.py")
        .canonicalize()
        .map_err(|e| format!("Could not locate elbertconfig.py: {}", e))?;

    println!("Python script: {:?}", script_path);

    let mut child = Command::new("python")
        .arg("-u")
        .arg(&script_path)
        .arg(&port)
        .arg(&bin_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Python: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Unable to capture Python stdout")?;

    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;

        println!("[PYTHON] {}", line);

        if let Some(value) = line.strip_prefix("PROGRESS:") {
            if let Ok(percentage) = value.trim().parse::<u8>() {
                let _ = on_event.send(FlashEvent::Progress { percentage });

                continue;
            }
        }

        let _ = on_event.send(FlashEvent::Output { message: line });
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed waiting for Python: {}", e))?;

    if !output.stderr.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);

        for line in stderr.lines() {
            println!("[PYTHON ERROR] {}", line);

            let _ = on_event.send(FlashEvent::Error {
                message: line.to_string(),
            });
        }
    }

    let success = output.status.success();

    let _ = on_event.send(FlashEvent::Finished { success });

    if success {
        Ok(())
    } else {
        Err(format!(
            "Python exited with code {:?}",
            output.status.code()
        ))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            test_invoke,
            test_external_process,
            list_serial_ports,
            flash_elbert
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
