import { Component, signal, OnInit } from "@angular/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Channel,
  invoke,
} from "@tauri-apps/api/core";

@Component({
  selector: "app-root",
  imports: [],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  ports = signal<SerialPortInfo[]>([]);
  logs = signal<string[]>([]);
  selectedBinPath = signal("");
  progress = signal(0);
  status = signal("Ready");

  async ngOnInit(): Promise<void> {
    await this.refreshPorts();
  }

  async selectBinFile(): Promise<void> {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "FPGA Binary",
          extensions: ["bin"],
        },
      ],
    });

    if (typeof selected === "string") {
      this.selectedBinPath.set(selected);

      console.log("BIN seleccionado:", selected);
    }
  }

  // flash(
  //   event: SubmitEvent,
  //   port: string,
  // ): void {
  //   event.preventDefault();

  //   const binPath = this.selectedBinPath();

  //   if (!port) {
  //     console.log("No COM port selected");
  //     return;
  //   }

  //   if (!binPath) {
  //     console.log("No BIN file selected");
  //     return;
  //   }

  //   console.log("Puerto COM:", port);
  //   console.log("Ruta BIN:", binPath);
  //   console.log("Flasheando...");

  //   this.status.set("Dummy flash started...");
  //   this.progress.set(25);
  // }

  // async flash(
  //   event: SubmitEvent,
  //   port: string,
  // ): Promise<void> {
  //   event.preventDefault();

  //   const binPath = this.selectedBinPath();

  //   if (!port) {
  //     console.error("No COM port selected");
  //     return;
  //   }

  //   if (!binPath) {
  //     console.error("No BIN file selected");
  //     return;
  //   }

  //   console.log("Calling Rust...");
  //   console.log("Port:", port);
  //   console.log("BIN:", binPath);

  //   try {
  //     const response = await invoke<string>("test_invoke", {
  //       port,
  //       binPath,
  //     });

  //     console.log("Rust response:", response);
  //   } catch (error) {
  //     console.error("Invoke failed:", error);
  //   }
  // }

  async flash(
    event: SubmitEvent,
    port: string,
  ): Promise<void> {
    event.preventDefault();

    const binPath = this.selectedBinPath();

    if (!port) {
      this.status.set("Select a COM port");
      return;
    }

    if (!binPath) {
      this.status.set("Select a BIN file");
      return;
    }

    this.progress.set(0);
    this.logs.set([]);
    this.status.set("Starting...");

    const onEvent = new Channel<FlashEvent>();

    onEvent.onmessage = (message) => {
      console.log("Flash event:", message);

      switch (message.event) {

        case "started":
          this.status.set("Starting programmer...");
          break;

        case "output":
          this.logs.update(logs => [
            ...logs,
            message.data.message,
          ]);

          this.status.set(
            message.data.message
          );

          break;

        case "progress":
          this.progress.set(
            message.data.percentage
          );

          this.status.set(
            `Writing flash... ${message.data.percentage}%`
          );

          break;

        case "error":
          this.logs.update(logs => [
            ...logs,
            `ERROR: ${message.data.message}`,
          ]);

          this.status.set("Programming error");

          break;

        case "finished":

          if (message.data.success) {
            this.progress.set(100);
            this.status.set(
              "FPGA programmed successfully"
            );
          } else {
            this.status.set(
              "Programming failed"
            );
          }

          break;
      }
    };

    try {

      await invoke("flash_elbert", {
        port,
        binPath,
        onEvent,
      });

    } catch (error) {

      console.error(
        "Flash failed:",
        error
      );

      this.logs.update(logs => [
        ...logs,
        String(error),
      ]);

      this.status.set(
        "Programming failed"
      );
    }
  }

  async testExternalProcess(): Promise<void> {
    try {
      console.log("Calling external process through Rust...");

      const result = await invoke<string>("test_external_process");

      console.log("External process response:", result);
    } catch (error) {
      console.error("External process failed:", error);
    }
  }

  // refreshPorts(): void {
  //   console.log("Refreshing COM ports...");
  // }

  // async refreshPorts(): Promise<void> {
  //   try {
  //     const ports = await invoke<string[]>("list_serial_ports");

  //     this.ports.set(ports);

  //     console.log("Serial ports:", ports);
  //   } catch (error) {
  //     console.error("Failed to list serial ports:", error);
  //   }
  // }

  async refreshPorts(): Promise<void> {
    try {
      const ports = await invoke<SerialPortInfo[]>("list_serial_ports");

      this.ports.set(ports);

      console.log("Serial ports:", ports);
    } catch (error) {
      console.error("Failed to list serial ports:", error);
    }
  }

  resetForm(): void {
    this.selectedBinPath.set("");
    this.progress.set(0);
    this.status.set("Ready");
  }
}

interface SerialPortInfo {
  port_name: string;
  label: string;
  vid: number | null;
  pid: number | null;
  manufacturer: string | null;
  product: string | null;
  serial_number: string | null;
}

type FlashEvent =
  | {
    event: "started";
  }
  | {
    event: "output";
    data: {
      message: string;
    };
  }
  | {
    event: "progress";
    data: {
      percentage: number;
    };
  }
  | {
    event: "error";
    data: {
      message: string;
    };
  }
  | {
    event: "finished";
    data: {
      success: boolean;
    };
  };