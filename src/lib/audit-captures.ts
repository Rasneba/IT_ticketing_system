export interface CaptureField {
  key: string;
  label: string;
  placeholder?: string;
  sensitive?: boolean;
  required?: boolean;
}

export interface CaptureType {
  label: string;
  description: string;
  fields: CaptureField[];
}

/**
 * Technical audit captures recorded from the Resolution Workbench.
 * Sensitive values (license keys, registration codes) are masked for roles
 * without `revealSecrets` permission — masking happens server-side.
 */
export const CAPTURE_TYPES: Record<string, CaptureType> = {
  LICENSE_KEY: {
    label: "License key registration",
    description: "Commercial module / software activation (FreePBX, NVR, ZKBio, POS)",
    fields: [
      { key: "product", label: "Product / module", placeholder: "FreePBX Commercial – EndPoint Manager", required: true },
      { key: "licenseKey", label: "License key", placeholder: "XXXX-XXXX-XXXX-XXXX", sensitive: true, required: true },
      { key: "deploymentId", label: "Deployment ID / MAC", placeholder: "Deployment 812345 / 00:15:5D:0A:01:05" },
      { key: "seats", label: "Seats / channels", placeholder: "25" },
      { key: "expiry", label: "Expiry", placeholder: "2027-03-31" },
    ],
  },
  ENCODER_REGISTRATION: {
    label: "Encoder registration",
    description: "Smart-card lock encoder / proUSB–eLock software registration",
    fields: [
      { key: "encoderSerial", label: "Encoder serial", placeholder: "PU-ENC-2203-0417", required: true },
      { key: "software", label: "Software & version", placeholder: "proUSB V9.3 / eLock" },
      { key: "systemCode", label: "Building / system code", placeholder: "Hotel/system code", sensitive: true },
      { key: "registrationCode", label: "Registration code", placeholder: "Vendor registration code", sensitive: true, required: true },
      { key: "workstation", label: "Workstation / COM port", placeholder: "RECEPTION-PC01 · USB HID" },
    ],
  },
  IP_CONFIGURATION: {
    label: "IP configuration change",
    description: "Static IP / VLAN mapping for networked devices",
    fields: [
      { key: "device", label: "Device", placeholder: "ZKTeco SpeedFace-V5L", required: true },
      { key: "previousIp", label: "Previous IP", placeholder: "192.168.1.201" },
      { key: "newIp", label: "New IP", placeholder: "192.168.10.21", required: true },
      { key: "subnetGateway", label: "Subnet / gateway", placeholder: "255.255.255.0 / 192.168.10.1" },
      { key: "vlanPort", label: "VLAN / port", placeholder: "VLAN 10 · TCP 4370" },
    ],
  },
  FIRMWARE_UPDATE: {
    label: "Firmware update",
    description: "Firmware / BIOS / module version change",
    fields: [
      { key: "device", label: "Device", required: true },
      { key: "fromVersion", label: "From version" },
      { key: "toVersion", label: "To version", required: true },
      { key: "method", label: "Method", placeholder: "Web UI / USB / vendor tool" },
    ],
  },
  PART_REPLACEMENT: {
    label: "Part replacement",
    description: "Hardware component swap with serial traceability",
    fields: [
      { key: "partName", label: "Part", placeholder: "Thermal print head", required: true },
      { key: "partNumber", label: "Part number" },
      { key: "serialRemoved", label: "Serial removed" },
      { key: "serialInstalled", label: "Serial installed" },
      { key: "supplier", label: "Supplier / PO" },
    ],
  },
  BOOT_RECOVERY: {
    label: "Boot recovery (GRUB / Hyper-V)",
    description: "VM or host boot repair with checkpoint reference",
    fields: [
      { key: "host", label: "Host / VM", placeholder: "HV-01 / PBX-01", required: true },
      { key: "failureMode", label: "Failure mode", placeholder: "grub> prompt after kernel update", required: true },
      { key: "kernel", label: "Kernel booted", placeholder: "3.10.0-1160.el7.x86_64" },
      { key: "actionTaken", label: "Action taken", placeholder: "Manual boot + grub2-mkconfig", required: true },
      { key: "checkpoint", label: "Checkpoint", placeholder: "pre-grub-fix-2026-03-01" },
    ],
  },
};

export function maskSecret(value: string): string {
  if (!value) return "";
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(4, Math.min(12, value.length - 4)))}${tail}`;
}
