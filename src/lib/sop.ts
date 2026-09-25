import type { SystemDomain } from "@/db/schema";

export interface SopStep {
  action: string;
  detail: string;
  command?: string;
  expected: string;
}

export interface Sop {
  id: string;
  title: string;
  domains: SystemDomain[];
  issueCodes: string[];
  summary: string;
  estimatedMinutes: number;
  audience: string;
  tools: string[];
  safety: string[];
  steps: SopStep[];
  verification: string[];
  escalation: string[];
  captures: string[];
}

export const SOPS: Sop[] = [
  {
    id: "SOP-LCK-01",
    title: "proUSB / eLock Encoder Database Repair",
    domains: ["LOCK_ENCODER"],
    issueCodes: ["LOCK_DB_ERROR", "ENCODER_CANNOT_ISSUE", "CARD_REENCODE"],
    summary:
      "Restores the smart-card lock management software (proUSB / eLock) when its Access (.mdb) database is corrupted, locked or unreadable, then re-establishes encoder communication.",
    estimatedMinutes: 90,
    audience: "IT & Security technician",
    tools: [
      "Local admin credentials for the reception PC",
      "USB encoder, spare USB cable (rear port, no hub)",
      "Blank test card matching the lock type (e.g. Mifare 1K)",
      "Microsoft Access Database Engine 2010 (32-bit) redistributable",
      "Microsoft Access or JetComp.exe (Jet 4.0 compact utility)",
      "USB drive or NAS share for backups",
    ],
    safety: [
      "Never overwrite the live database without a verified backup — card data and lock sequence counters cannot be regenerated.",
      "Keep a manager-issued emergency card available while the encoder is offline.",
      "Registration and system codes are confidential — record them only through the workbench audit capture.",
    ],
    steps: [
      {
        action: "Triage the error",
        detail:
          "Record the exact message and time. Typical: 'Unrecognized database format', 'File already in use', 'Database connect error', 'ActiveX component can't create object'.",
        expected: "Error class identified (corruption, stale lock, DAO provider or permissions).",
      },
      {
        action: "Stop the software and release locks",
        detail:
          "Close proUSB/eLock on every workstation, end lingering processes in Task Manager, then remove the stale .ldb lock file beside the database only if no process holds it.",
        expected: "Database no longer in use; no lock file present.",
      },
      {
        action: "Back up before touching anything",
        detail: "Copy the full install folder (adjust the path, e.g. C:\\eLock) to a dated backup location.",
        command: 'robocopy "C:\\Program Files (x86)\\proUSB" "D:\\LockBackup\\2026-03-01" /E /COPY:DAT /R:1 /W:1',
        expected: "Backup verified by file size and timestamp of every *.mdb file.",
      },
      {
        action: "Fix permissions and attributes",
        detail:
          "Clear the read-only attribute and grant the local Users group Modify rights (UAC virtualisation under Program Files causes silent write failures).",
        command: 'icacls "C:\\Program Files (x86)\\proUSB" /grant *S-1-5-32-545:(OI)(CI)M',
        expected: "Database writable by the operator account.",
      },
      {
        action: "Repair the DAO / Jet provider",
        detail:
          "The lock software is 32-bit: install Access Database Engine 2010 (x86) if missing, then re-register DAO.",
        command: 'regsvr32 "C:\\Program Files (x86)\\Common Files\\Microsoft Shared\\DAO\\dao360.dll"',
        expected: "'DllRegisterServer succeeded' confirmation.",
      },
      {
        action: "Compact and repair a copy of the database",
        detail:
          "Open a COPY of the .mdb in Access (Database Tools → Compact & Repair) or run JetComp.exe source → destination. Use the vendor-supplied database password if prompted.",
        expected: "Repaired copy opens; card, room, operator and log tables readable.",
      },
      {
        action: "Swap in the repaired database",
        detail:
          "Rename the damaged file to *.corrupt and place the repaired copy under the original filename. If repair fails, restore the latest nightly backup and list cards issued since then for re-encoding.",
        expected: "Software starts without database errors.",
      },
      {
        action: "Check Windows regional settings",
        detail: "Confirm the date/time format matches the vendor requirement (commonly yyyy-MM-dd, 24-hour clock).",
        expected: "Card check-out dates encode correctly.",
      },
      {
        action: "Re-establish the encoder link",
        detail:
          "Connect the encoder to a rear USB port, confirm it enumerates in Device Manager (HID or USB-Serial), then select the right port under System Settings → Encoder.",
        expected: "Status bar shows the encoder connected; beep on card read.",
      },
      {
        action: "Functional test",
        detail: "Read an existing card, issue a test card for a test door, open the lock and confirm the event appears in lock history.",
        expected: "Test door opens (green LED) and the event is logged.",
      },
      {
        action: "Record and harden",
        detail:
          "Capture ENCODER_REGISTRATION in the workbench, schedule a nightly robocopy backup in Task Scheduler and confirm the reception PC is on UPS.",
        expected: "Audit capture saved; backup task scheduled.",
      },
    ],
    verification: [
      "Three consecutive cards issued and tested on doors",
      "No database errors after a software restart",
      "Nightly backup task executed successfully",
    ],
    escalation: [
      "Database unrecoverable and no backup: escalate to the lock vendor with the damaged file (vendor response within 2 h).",
      "Locks reject newly issued cards: check lock clock / sequence — a vendor programming card may be required.",
    ],
    captures: ["ENCODER_REGISTRATION", "PART_REPLACEMENT"],
  },
  {
    id: "SOP-ACC-02",
    title: "ZKTeco Terminal & Controller IP Configuration",
    domains: ["ACCESS_CONTROL"],
    issueCodes: ["ACCESS_DEVICE_OFFLINE", "MAIN_ENTRANCE_LOCK_FAILURE", "DOOR_READER_FAULT"],
    summary:
      "Assigns or restores static IP addressing on ZKTeco biometric terminals (SpeedFace, ProCapture, F22) and inBio door controllers, then re-links them to ZKBio CVSecurity / ZKAccess.",
    estimatedMinutes: 60,
    audience: "IT & Security / low-current technician",
    tools: [
      "Laptop with Ethernet on the access-control VLAN",
      "ZKBio CVSecurity or ZKAccess 3.5 console access",
      "Device super-admin credentials (vault)",
      "IP plan / IPAM sheet",
      "Patch lead and PoE tester",
    ],
    safety: [
      "Main entrance: confirm the fire-alarm release (fail-safe) input before and after work — never leave the door in a state that blocks egress.",
      "Post a guard, or set the door 'normally open' only with management approval, while the reader is offline.",
      "Communication keys must never be written on the device or its label.",
    ],
    steps: [
      {
        action: "Confirm the physical layer",
        detail: "Check PoE / 12 V supply LED, switch-port link LED and cable continuity.",
        expected: "Device powered and linked on the correct access VLAN port.",
      },
      {
        action: "Read the current network settings",
        detail:
          "Terminals: Menu → COMM → Ethernet (factory default is often 192.168.1.201/24). inBio panels: use Search in ZKAccess / ZKBio (broadcast discovery).",
        expected: "Current IP, mask, gateway and DHCP state noted.",
      },
      {
        action: "Test reachability from the laptop",
        detail: "Ping the device and test the ZKTeco communication port.",
        command: "ping 192.168.10.21 -n 4\nTest-NetConnection 192.168.10.21 -Port 4370",
        expected: "ICMP replies and TcpTestSucceeded = True (or conflict / wrong VLAN identified).",
      },
      {
        action: "Check for an IP conflict",
        detail: "The MAC in the ARP table must match the device label. A different MAC means a duplicate address.",
        command: "arp -a | findstr 192.168.10.21",
        expected: "Single ARP entry matching the terminal MAC.",
      },
      {
        action: "Set static addressing",
        detail:
          "Terminal: COMM → Ethernet → DHCP OFF, IP 192.168.10.21, mask 255.255.255.0, gateway 192.168.10.1. inBio: ZKAccess → Device → Search → Modify IP Address (panel reboots).",
        expected: "Device keeps the planned IP after reboot.",
      },
      {
        action: "Set the communication key and port",
        detail: "COMM → PC Connection: TCP 4370 and the comm key from the security register (key 0 / none is non-compliant).",
        expected: "Comm key matches the server configuration.",
      },
      {
        action: "Update the device in ZKBio CVSecurity",
        detail: "Access → Device → edit IP (or add by IP, port 4370, comm key), then Synchronize All Data to Devices and Sync Time.",
        expected: "Device Online; user and template counts match the server.",
      },
      {
        action: "Functional door test",
        detail: "Verify with a test face / fingerprint and card; check relay, door sensor, exit button and the real-time monitor.",
        expected: "Door releases in under 1 s; events visible in real-time monitoring.",
      },
      {
        action: "Life-safety test (main entrance)",
        detail: "With security present, trigger the fire-alarm release input test.",
        expected: "Door unlocks on alarm input.",
      },
      {
        action: "Document",
        detail:
          "Capture IP_CONFIGURATION in the workbench, update the asset IP in the registry and add a DHCP reservation / exclusion to prevent future conflicts.",
        expected: "Asset record and IPAM consistent.",
      },
    ],
    verification: [
      "Device online in ZKBio for 15 minutes without drops",
      "Test user enrolled on both device and server",
      "Fire release verified (main entrance only)",
    ],
    escalation: [
      "No link after cable / PoE swap: replace the terminal from spares (P1 main entrance) and log PART_REPLACEMENT.",
      "Firmware corruption or boot loop: escalate to ZKTeco partner support.",
    ],
    captures: ["IP_CONFIGURATION", "FIRMWARE_UPDATE", "LICENSE_KEY"],
  },
  {
    id: "SOP-PBX-03",
    title: "FreePBX / Asterisk GRUB Boot Recovery on Hyper-V",
    domains: ["VOIP_PBX"],
    issueCodes: ["PBX_HOST_DOWN", "SIP_TRUNK_DOWN"],
    summary:
      "Recovers a FreePBX (SNG7 / CentOS-based) Asterisk VM on Hyper-V that fails to boot — grub> prompt, Secure Boot violation, missing kernel or initramfs — and restores call service.",
    estimatedMinutes: 75,
    audience: "IT & Security engineer (Linux + Hyper-V)",
    tools: [
      "Hyper-V Manager / PowerShell on host HV-01 (admin)",
      "VMConnect console",
      "Root credentials (password vault)",
      "FreePBX admin UI access",
      "Mobile phone for inbound / outbound call tests",
    ],
    safety: [
      "Always take a checkpoint before modifying boot configuration.",
      "Announce the phone outage to reception and security; confirm the lift emergency line (GSM gateway) is unaffected.",
      "Do not reboot the Hyper-V host while other VMs (ZKBio, CCTV) are running without approval.",
    ],
    steps: [
      {
        action: "Check host and VM state",
        detail: "Confirm the VM state and host resource health.",
        command: "Get-VM -Name PBX-01 | Select Name,State,Status,Uptime,CPUUsage,MemoryAssigned",
        expected: "VM state known (Running / Off / Critical) and host healthy.",
      },
      {
        action: "Open the console and classify the failure",
        detail:
          "vmconnect localhost PBX-01. Classify: (a) Secure Boot 'image hash not allowed', (b) grub> / grub rescue> prompt, (c) kernel panic or dracut shell, (d) fstab emergency mode.",
        expected: "Failure mode recorded on the ticket.",
      },
      {
        action: "Checkpoint the VM",
        detail: "Create a rollback point before any change.",
        command: 'Checkpoint-VM -Name PBX-01 -SnapshotName "pre-grub-fix"',
        expected: "Checkpoint listed in Hyper-V Manager.",
      },
      {
        action: "Fix the Secure Boot template (Gen 2)",
        detail: "Linux guests require the Microsoft UEFI Certificate Authority template (or temporarily disable Secure Boot).",
        command: "Set-VMFirmware -VMName PBX-01 -SecureBootTemplate MicrosoftUEFICertificateAuthority",
        expected: "VM passes the firmware stage.",
      },
      {
        action: "Boot manually from the grub> prompt",
        detail:
          "Use (hd0,msdos1) on Generation 1 VMs. Tab-completion lists kernels; confirm the root LV name with ls.",
        command:
          "ls\nls (hd0,gpt2)/\nset root=(hd0,gpt2)\nlinux /vmlinuz-3.10.0-1160.el7.x86_64 root=/dev/mapper/SangomaVG-root ro\ninitrd /initramfs-3.10.0-1160.el7.x86_64.img\nboot",
        expected: "System boots to a login prompt.",
      },
      {
        action: "Rebuild the GRUB configuration",
        detail: "BIOS (Gen 1) uses /boot/grub2; UEFI (Gen 2) uses the vendor folder under /boot/efi/EFI.",
        command:
          "grub2-mkconfig -o /boot/grub2/grub.cfg            # Gen 1\ngrub2-install /dev/sda                           # Gen 1 only\ngrub2-mkconfig -o /boot/efi/EFI/centos/grub.cfg  # Gen 2",
        expected: "New grub.cfg lists all installed kernels.",
      },
      {
        action: "Validate kernel, initramfs and fstab",
        detail: "Hyper-V storage / network drivers must be present in the initramfs; fstab UUIDs must match blkid.",
        command:
          "rpm -q kernel\nlsinitrd /boot/initramfs-$(uname -r).img | grep hv_\nblkid && cat /etc/fstab\ndracut -f --add-drivers \"hv_vmbus hv_storvsc hv_netvsc\"",
        expected: "hv_* drivers present and fstab consistent.",
      },
      {
        action: "Set the default kernel and test a reboot",
        detail: "Reboot without touching the console.",
        command: "grub2-set-default 0 && reboot",
        expected: "VM boots unattended within 2 minutes.",
      },
      {
        action: "Verify Asterisk / FreePBX",
        detail: "Restart services and confirm trunk and endpoint registration.",
        command:
          'fwconsole restart\nasterisk -rx "core show version"\nasterisk -rx "pjsip show registrations"\nasterisk -rx "pjsip show endpoints"',
        expected: "Trunks Registered; endpoints Avail.",
      },
      {
        action: "Call tests",
        detail: "Inbound DID to reception, outbound to mobile, extension-to-extension, IVR and voicemail.",
        expected: "Two-way audio on every test.",
      },
      {
        action: "Harden and document",
        detail:
          "Enable automatic start, capture BOOT_RECOVERY (and LICENSE_KEY if commercial modules were re-activated), and remove the checkpoint after 24 h stable.",
        command:
          "Set-VM -Name PBX-01 -AutomaticStartAction Start -AutomaticStartDelay 60\nRemove-VMSnapshot -VMName PBX-01 -Name pre-grub-fix",
        expected: "VM auto-starts after host reboot; audit capture saved.",
      },
    ],
    verification: [
      "Clean reboot with no manual GRUB input",
      "Trunks registered and calls stable for 30 minutes",
      "Checkpoint removed after 24 h",
    ],
    escalation: [
      "Filesystem corruption or no bootable kernel: restore the VM from the last backup and escalate to the IT lead.",
      "Trunk unregistered on a healthy VM: escalate to the SIP carrier NOC with pjsip logs.",
    ],
    captures: ["BOOT_RECOVERY", "LICENSE_KEY"],
  },
  {
    id: "SOP-POS-04",
    title: "Thermal Printer IP Mapping (Epson TM-series)",
    domains: ["POS_PRINTER"],
    issueCodes: ["THERMAL_PRINTER_FAIL", "PRINTER_IP_REMAP", "POS_TERMINAL_DOWN"],
    summary:
      "Restores printing for networked receipt (TM-T88VI) and kitchen (TM-U220) printers by confirming the printer IP, clearing address conflicts and re-mapping POS / Windows queues on TCP 9100.",
    estimatedMinutes: 40,
    audience: "IT & Security / low-current technician",
    tools: [
      "Laptop on the POS VLAN",
      "80 mm thermal paper roll",
      "IP plan and POS back-office credentials",
      "EpsonNet Config (web UI or utility)",
    ],
    safety: [
      "Power off before opening the cover to clear jams — the print head is hot.",
      "Coordinate with the shop manager and avoid peak trading hours for reconfiguration.",
    ],
    steps: [
      {
        action: "Hardware check",
        detail: "Paper loaded thermal-side out, cover closed, error LED off, cutter not jammed.",
        expected: "Printer ready with no blinking error LED.",
      },
      {
        action: "Print the network status sheet",
        detail: "Press the push-button on the rear Ethernet interface (TM-T88VI: hold about 3 s).",
        expected: "Sheet shows IP, subnet, gateway, DHCP state and MAC.",
      },
      {
        action: "Test reachability",
        detail: "Ping the printer and test the raw printing port.",
        command: "ping 192.168.30.51 -n 4\nTest-NetConnection 192.168.30.51 -Port 9100",
        expected: "Replies and TcpTestSucceeded = True.",
      },
      {
        action: "Reset network settings if unknown",
        detail:
          "Hold the rear push-button for 10+ seconds (interface-dependent) to restore factory defaults (Epson default 192.168.192.168), then reprint the status sheet.",
        expected: "Printer at a known default address.",
      },
      {
        action: "Assign the static IP",
        detail:
          "Browse to http://<printer-ip>/ → Network → TCP/IP: Manual, 192.168.30.51 / 255.255.255.0, gateway 192.168.30.1 — or create a DHCP reservation by MAC.",
        expected: "Printer reachable at the planned IP after reboot.",
      },
      {
        action: "Map the POS software",
        detail: "POS back office → Printers: receipt printer 192.168.30.51:9100 (RAW / ESC-POS); map kitchen routing groups to the TM-U220 IP.",
        expected: "Test print from the POS succeeds.",
      },
      {
        action: "Map the Windows queue (if used)",
        detail: "Create a Standard TCP/IP port and bind the Epson APD driver to it.",
        command:
          'Add-PrinterPort -Name "IP_192.168.30.51" -PrinterHostAddress "192.168.30.51" -PortNumber 9100\nSet-Printer -Name "EPSON TM-T88VI Receipt" -PortName "IP_192.168.30.51"',
        expected: "Windows test page prints.",
      },
      {
        action: "End-to-end order test",
        detail: "Place a test order with hot and cold items; check receipt, kitchen ticket and cash drawer kick.",
        expected: "All routes print and the drawer opens.",
      },
      {
        action: "Label and document",
        detail: "Apply an IP label, update the asset IP and capture IP_CONFIGURATION (PART_REPLACEMENT if head / cutter replaced).",
        expected: "Registry and label consistent.",
      },
    ],
    verification: [
      "10 consecutive receipts without a drop",
      "Kitchen routing verified",
      "IP persists after a power-cycle",
    ],
    escalation: [
      "Print head or cutter failure: swap with a spare and send the unit to the Epson service partner.",
      "POS terminal cannot reach any printer: re-classify as UNIT_NETWORK_DOWN (P2).",
    ],
    captures: ["IP_CONFIGURATION", "PART_REPLACEMENT"],
  },
  {
    id: "SOP-ELE-05",
    title: "Total Power Outage Response",
    domains: ["ELECTRICAL"],
    issueCodes: ["TOTAL_POWER_OUTAGE", "PARTIAL_POWER_LOSS"],
    summary:
      "First-responder procedure for building-wide or floor-level power loss: confirm the source, verify generator / ATS transfer, protect life-safety systems and restore normal supply.",
    estimatedMinutes: 120,
    audience: "Electrical technician (authorised person)",
    tools: ["Arc-rated PPE and insulated gloves", "Multimeter / voltage tester", "Torch and radio", "MDB single-line diagram", "Generator log sheet"],
    safety: [
      "Only authorised electricians operate the MDB / ATS; apply LOTO before any work on isolated equipment.",
      "Check lifts for trapped passengers FIRST and call the lift contractor emergency line.",
      "Never back-feed from the generator without the ATS interlock.",
    ],
    steps: [
      { action: "Lift and life-safety sweep", detail: "Check lifts for entrapment, emergency lighting and the fire alarm panel on battery.", expected: "No entrapment; life-safety on standby power." },
      { action: "Identify scope and source", detail: "Check utility status, MDB incomer indication and whether neighbouring buildings are affected.", expected: "Utility vs internal fault determined." },
      { action: "Verify generator and ATS", detail: "GEN-01 should start within 10 s and the ATS transfer within 15 s. If not, check controller alarms (fuel, E-stop, battery).", expected: "Essential loads on generator." },
      { action: "Inspect the MDB", detail: "Check ACB / MCCB trip flags and protection relays. Do not reset a tripped incomer before locating the fault.", expected: "Fault location identified." },
      { action: "Restore or isolate", detail: "Isolate the faulty feeder, re-energise healthy sections per the switching procedure.", expected: "Healthy circuits energised." },
      { action: "Priority restoration", detail: "Order: fire & life-safety → booster pumps → lifts → access control & CCTV → PBX / comms room → common areas → tenants.", expected: "Critical services confirmed online." },
      { action: "Communicate", detail: "Post a public ticket note and broadcast an ETA to tenants.", expected: "Tenants informed." },
      { action: "Return to mains", detail: "Confirm stable utility voltage, ATS re-transfer and generator cool-down; log run hours and fuel.", expected: "Building on mains; generator in AUTO." },
    ],
    verification: ["All MDB feeders normal", "Comms-room UPS recharging", "Generator returned to AUTO"],
    escalation: ["Internal MDB or cable fault: call the licensed electrical contractor.", "Utility outage over 2 h: arrange fuel top-up and notify management."],
    captures: ["PART_REPLACEMENT"],
  },
  {
    id: "SOP-PMP-06",
    title: "Booster Pump Failure & Water Supply Loss",
    domains: ["WATER_PUMP", "PLUMBING"],
    issueCodes: ["PUMP_FAILURE_NO_SUPPLY", "PUMP_LOW_PRESSURE", "WATER_OUTAGE_TOTAL"],
    summary: "Restores domestic water supply when the booster set (e.g. Grundfos Hydro MPC) fails or header pressure collapses.",
    estimatedMinutes: 90,
    audience: "MEP technician",
    tools: ["Pump room keys", "Controller manual (CU 352)", "Calibrated pressure gauge", "Multimeter", "Spare pressure transmitter"],
    safety: [
      "Isolate electrical supply before opening pump terminal boxes (LOTO).",
      "Wet pump-room floors are an electrical hazard — wear insulated boots.",
      "Never run pumps dry — check the tank level first.",
    ],
    steps: [
      { action: "Check tank levels", detail: "Confirm break-tank level and float valve / switch status.", expected: "Adequate water in the suction tank." },
      { action: "Read controller alarms", detail: "Note active alarms on the controller: dry-running, VFD fault, sensor fault, over-temperature.", expected: "Alarm code recorded." },
      { action: "Check power and VFDs", detail: "Verify supply at the control panel and VFD fault history; reset only after the cause is known.", expected: "Pumps powered; VFD healthy or fault identified." },
      { action: "Switch to the standby pump", detail: "Enable standby / manual mode to restore supply immediately.", expected: "Header pressure restored." },
      { action: "Check the pressure transmitter", detail: "Compare transmitter vs mechanical gauge; replace if deviation exceeds 0.5 bar.", expected: "Control pressure accurate." },
      { action: "Inspect valves and suction", detail: "Isolation valves open, NRV free, strainer clean, pumps bled of air.", expected: "Hydraulic path clear." },
      { action: "Restore AUTO mode", detail: "Return the set to AUTO and verify cascade operation at the 4.5 bar setpoint.", expected: "Stable pressure under demand." },
      { action: "Verify at the top floor", detail: "Check flow and pressure at a penthouse tap.", expected: "Adequate pressure on the highest floor." },
    ],
    verification: ["Pressure stable for 30 minutes under demand", "No active alarms", "Duty / standby rotation working"],
    escalation: ["Motor or mechanical seal failure: call the pump vendor and hire a temporary pump.", "Outage over 4 h: arrange a water tanker and notify tenants."],
    captures: ["PART_REPLACEMENT"],
  },
  {
    id: "SOP-MTR-07",
    title: "Sub-Meter Verification & Reading Audit",
    domains: ["SUB_METER"],
    issueCodes: ["METER_READING_CHECK", "METER_NOT_REGISTERING", "CONSUMPTION_ANOMALY", "METER_BILLING_INQUIRY"],
    summary: "Verifies tenant electricity (kWh) and water (m³) sub-meters and validates readings before billing, including anomaly investigation.",
    estimatedMinutes: 30,
    audience: "Electrical / MEP technician",
    tools: ["Phone camera for photo evidence", "Clamp meter", "Meter register", "Service-desk Meters module"],
    safety: ["Do not break utility / authority seals on meter terminal covers.", "Use the clamp meter only on insulated conductors."],
    steps: [
      { action: "Identify the meter", detail: "Match asset tag and serial to the unit; photograph the display and serial plate.", expected: "Correct meter confirmed." },
      { action: "Record the reading", detail: "Enter the cumulative register value in the Meters module with timestamp.", expected: "Reading saved and consumption delta calculated." },
      { action: "Validate against history", detail: "The system flags daily consumption above 2× the trailing 7-day average as an anomaly.", expected: "Anomaly status known." },
      { action: "Electrical check (kWh)", detail: "With a known load running, confirm the pulse LED / register advances; compare clamp current with expected load.", expected: "Meter registers load." },
      { action: "Water check (m³)", detail: "Close all outlets — the dial must stop. Movement indicates a leak.", expected: "Leak / no-leak determined." },
      { action: "Resolve", detail: "Leak → raise a PLUMBING ticket; faulty meter → replace and record PART_REPLACEMENT with final and initial readings.", expected: "Root cause addressed." },
    ],
    verification: ["Reading accepted, or anomaly explained on the ticket", "Photo evidence referenced in ticket notes"],
    escalation: ["Disputed bills: forward the evidence pack to the property manager.", "Suspected tampering: notify security and management."],
    captures: ["PART_REPLACEMENT"],
  },
  {
    id: "SOP-CCTV-08",
    title: "NVR Recording Failure Recovery",
    domains: ["CCTV"],
    issueCodes: ["NVR_RECORDING_FAILURE", "CAMERA_OFFLINE", "FOOTAGE_REQUEST"],
    summary: "Restores continuous recording on the Hikvision NVR and recovers offline cameras while preserving evidential footage.",
    estimatedMinutes: 60,
    audience: "Low-current technician",
    tools: ["NVR admin credentials (vault)", "Monitor and mouse for the NVR", "Laptop with Hikvision SADP tool", "Spare surveillance-rated HDD", "PoE tester"],
    safety: [
      "Export incident clips BEFORE formatting or replacing any disk.",
      "Footage exports require management approval and are logged for privacy compliance.",
    ],
    steps: [
      { action: "Check NVR health", detail: "Local UI → Maintenance → HDD: Normal / Abnormal / Sleeping; confirm the recording schedule.", expected: "Disk and schedule state known." },
      { action: "Review exception logs", detail: "Maintenance → Log: HDD error, network disconnected, video loss, illegal login.", expected: "Failure cause identified." },
      { action: "Recover offline cameras", detail: "Discover cameras with SADP, check the PoE power budget and ping each camera.", expected: "Camera reachable, or cable / PoE fault isolated." },
      { action: "Replace a failed disk", detail: "Export required footage, power down, fit a surveillance HDD, initialise it and verify recording.", expected: "HDD Normal and recording resumed." },
      { action: "Verify retention", detail: "Confirm retention meets policy (30 days).", expected: "Retention compliant." },
      { action: "Document", detail: "Capture PART_REPLACEMENT / FIRMWARE_UPDATE and update the asset record.", expected: "Records updated." },
    ],
    verification: ["All channels recording for 30 minutes", "Playback test from each affected camera"],
    escalation: ["NVR mainboard failure: vendor RMA and a temporary NVR.", "Security incident with lost footage: inform management immediately."],
    captures: ["PART_REPLACEMENT", "FIRMWARE_UPDATE", "LICENSE_KEY"],
  },
];

export function getSop(id: string) {
  return SOPS.find((s) => s.id.toLowerCase() === id.toLowerCase());
}

export function sopsForTicket(domain: SystemDomain, issueCode?: string) {
  const exact = issueCode ? SOPS.filter((s) => s.issueCodes.includes(issueCode)) : [];
  const byDomain = SOPS.filter((s) => s.domains.includes(domain) && !exact.includes(s));
  return [...exact, ...byDomain];
}
