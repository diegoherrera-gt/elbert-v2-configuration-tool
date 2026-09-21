# Elbert V2 Configuration Tool

A modern desktop configuration and programming tool for the **Numato Lab Elbert V2 Spartan-3A FPGA development board**.

The project provides a graphical interface for selecting the Elbert V2 serial port, loading a Xilinx FPGA `.bin` file, programming the onboard SPI flash, monitoring the programming process, and booting the FPGA.

The application is currently tested on **Windows 11**.

---

## Features

- Desktop GUI for programming the Elbert V2
- Automatic serial port discovery
- Native `.bin` file selection
- Real-time programming output
- Real-time flash programming progress
- SPI flash detection
- Flash erase, program, and verification
- FPGA boot after successful programming
- Bundled programming backend
- No Python installation required for end users
- No pySerial installation required for end users
- Windows installer support through Tauri

---

## Current Platform Support

| Platform | Status |
|---|---|
| Windows 11 x64 | ✅ Tested |
| Windows 10 x64 | 🟡 Expected to work, not yet fully tested |
| Linux x64 | 🚧 Planned |
| macOS Intel | 🚧 Planned |
| macOS Apple Silicon | 🚧 Planned |

The application architecture is designed to support multiple platforms, but currently only the Windows build has been tested with real Elbert V2 hardware.

---

## Hardware

This tool is intended for:

**Numato Lab Elbert V2 FPGA Development Board**

FPGA:

```text
Xilinx Spartan-3A
XC3S50A-TQ144-4
```

SPI Flash:

```text
Micron M25P16
```

The Elbert V2 communicates with the computer through its onboard USB serial interface.

---

## Screenshots

Screenshots will be added in a future release.

---

## How It Works

The application is composed of several layers:

```text
Angular
   │
   │ Tauri invoke / IPC
   ▼
Rust / Tauri
   │
   │ Sidecar process
   ▼
elbert-core
   │
   │ pySerial
   ▼
Serial Port
   │
   ▼
Elbert V2
   │
   ▼
M25P16 SPI Flash
   │
   ▼
Spartan-3A FPGA
```

The frontend is built with Angular.

Tauri provides the native desktop application and communication between Angular and Rust.

The FPGA programming logic is based on the original Numato Lab Elbert V2 Python configuration utility.

For distribution, the Python programming backend is packaged as a standalone executable and included in the Tauri application as a sidecar.

This means that end users do **not** need to install:

```text
Python
pip
pySerial
```

---

## Programming Process

The application performs approximately the following sequence:

```text
1. Open the selected serial port
2. Put the FPGA into configuration state
3. Initialize SPI communication
4. Detect the SPI flash
5. Load the selected .bin file
6. Erase the required flash sectors
7. Program the flash
8. Report programming progress
9. Verify the flash contents
10. Boot the FPGA
```

Typical output:

```text
****************************************
* Numato Lab Elbert Configuration Tool *
****************************************

Micron M25P16 SPI Flash detected
Loading file...
Erasing flash sectors...
Writing to flash...
Verifying flash contents...
Flash verification successful...
Booting FPGA...
Done.
```

---

# Installation

## Windows

Download the latest Windows installer from the **Releases** section.

Run the installer and launch:

```text
Elbert V2 Configuration Tool
```

Python and pySerial are not required.

---

# Usage

1. Connect the Elbert V2 to the computer using USB.
2. Open **Elbert V2 Configuration Tool**.
3. Select the serial port assigned to the Elbert V2.
4. Click **Select BIN file**.
5. Choose the FPGA `.bin` configuration file.
6. Click **Flash FPGA**.
7. Monitor the programming output and progress.
8. Wait until flash verification completes successfully.

After successful verification, the FPGA is automatically booted from the newly programmed SPI flash.

---

# Generating a `.bin` File

The application expects a binary FPGA configuration file:

```text
*.bin
```

For the Elbert V2, a `.bin` file can be generated using Xilinx ISE.

Example target device:

```text
Family: Spartan3A and Spartan3AN
Device: XC3S50A
Package: TQ144
Speed: -4
```

Enable:

```text
Create Binary Configuration File
```

when generating the programming file in Xilinx ISE.

---

# Development

## Technology Stack

### Frontend

```text
Angular
TypeScript
HTML
CSS
```

### Desktop

```text
Tauri 2
Rust
```

### FPGA Programming Backend

```text
Python 3
pySerial
PyInstaller
```

### FPGA Toolchain

The FPGA bitstream itself can be synthesized using tools such as:

```text
Xilinx ISE 14.7
```

---

## Repository Structure

A simplified project layout:

```text
elbert-v2-configuration-tool/
│
├── elbertconfig.py
│
├── elbert-config-app/
│   │
│   ├── src/
│   │   └── Angular frontend
│   │
│   └── src-tauri/
│       │
│       ├── src/
│       │   └── Rust backend
│       │
│       ├── binaries/
│       │   └── elbert-core-x86_64-pc-windows-msvc.exe
│       │
│       ├── Cargo.toml
│       └── tauri.conf.json
│
└── README.md
```

---

# Development Requirements

To build the project from source on Windows, install:

- Node.js
- npm
- Rust
- Cargo
- Tauri prerequisites
- Python 3
- pip
- pySerial
- PyInstaller

Install the frontend dependencies:

```powershell
cd elbert-config-app
npm install
```

Run the application in development mode:

```powershell
npm run tauri dev
```

---

# Python Programming Backend

Install the Python dependencies:

```powershell
pip install pyserial pyinstaller
```

The original Python programmer can be executed directly during development:

```powershell
python elbertconfig.py COM6 design.bin
```

---

# Building the Sidecar

The Python backend is converted into a standalone executable using PyInstaller.

From the repository root:

```powershell
pyinstaller --onefile --name elbert-core elbertconfig.py
```

PyInstaller generates:

```text
dist/
└── elbert-core.exe
```

For Tauri on Windows x64, copy or rename it to:

```text
elbert-config-app/
└── src-tauri/
    └── binaries/
        └── elbert-core-x86_64-pc-windows-msvc.exe
```

The sidecar is declared in `tauri.conf.json` as:

```json
{
  "bundle": {
    "externalBin": [
      "binaries/elbert-core"
    ]
  }
}
```

Tauri resolves the correct target-specific executable when building the application.

---

# Building the Windows Application

From:

```text
elbert-config-app/
```

run:

```powershell
npm run tauri build
```

Build artifacts are generated under:

```text
src-tauri/
└── target/
    └── release/
        └── bundle/
```

Depending on the configured Tauri bundle targets, this can include installers such as:

```text
NSIS .exe
MSI
```

---

# Serial Communication

The application communicates with the Elbert V2 over its USB serial interface.

On Windows, ports typically appear as:

```text
COM3
COM4
COM5
COM6
...
```

The application dynamically enumerates available serial ports and allows the user to select the appropriate device.

---

# Programming Output

The programming backend sends structured progress messages such as:

```text
PROGRESS:25
PROGRESS:50
PROGRESS:75
PROGRESS:100
```

Rust captures the sidecar output and forwards programming events to the Angular frontend through a Tauri channel.

This allows the desktop application to update:

- programming status
- console output
- progress percentage
- success state
- error state

in real time.

---

# Planned Improvements

Future development may include:

- Linux support
- macOS support
- Apple Silicon support
- Automatic Elbert V2 identification
- Improved serial device information
- Better error reporting
- Cancel programming operation
- Programming history/log export
- Automatic firmware/backend updates
- Improved device reconnect handling
- Additional Numato FPGA board support
- Automated cross-platform release builds
- GitHub Actions release pipeline

---

# Linux and macOS

The architecture is already prepared for platform-specific Tauri sidecars.

Future builds may include binaries such as:

```text
elbert-core-x86_64-pc-windows-msvc.exe
elbert-core-x86_64-unknown-linux-gnu
elbert-core-x86_64-apple-darwin
elbert-core-aarch64-apple-darwin
```

The Rust code can continue invoking:

```text
elbert-core
```

while Tauri selects the appropriate sidecar for the target platform.

PyInstaller applications should be built on the operating system for which they will be distributed.

---

# Background

The Elbert V2 is an older but still useful FPGA development board based on the Xilinx Spartan-3A family.

Modern operating systems no longer have an easily accessible official graphical configuration utility for the board, while the original Numato Lab configuration scripts remain useful for communicating with its onboard programmer.

This project aims to provide a modern, simple desktop interface around that programming process while preserving compatibility with the original hardware.

---

# Credits

The FPGA programming backend is based on the original **Elbert V2 configuration utility** published by **Numato Systems Pvt. Ltd.**

The original source states that it was published and shared under the GNU GPL.

Original hardware and programming protocol:

**Numato Lab / Numato Systems Pvt. Ltd.**

Modern desktop application and integration:

**Diego Herrera**

---

# License

The original Numato Lab programming code included in or adapted by this project retains its original GNU GPL notice.

Before redistributing modified versions of the original source or publishing packaged releases, review the applicable upstream GNU GPL licensing terms and preserve the required copyright and attribution notices.

A project-level license should be added explicitly to the repository before a formal public release.

---

# Disclaimer

This project is provided without warranty.

FPGA configuration and SPI flash programming directly modify the configuration memory of the connected hardware.

Use the software at your own risk and verify that the selected binary file is intended for the target FPGA board.

This project is not an official Numato Lab product.
