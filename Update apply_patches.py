#!/usr/bin/env python3
import os

BASE = "openwrt"

def patch_leds():
    fpath = f"{BASE}/target/linux/ath79/generic/base-files/etc/board.d/01_leds"
    if not os.path.exists(fpath):
        print("!!! 01_leds not found")
        return
    with open(fpath, "r") as f:
        content = f.read()
    patch = '\ncomfast,cf-wa350)\n\tucidef_set_led_switch "wan" "WAN" "red:wan" "switch0" "0x02"\n\tucidef_set_led_switch "lan" "LAN" "green:lan" "switch0" "0x04"\n\tucidef_set_led_wlan "wlan2g" "WLAN2G" "blue:wlan2g" "phy1radio"\n\t;;\n'
    if "comfast,cf-wa350)" in content:
        print(">>> 01_leds already patched")
        return
    content = content.replace('comfast,cf-e375ac)\n\t;;', 'comfast,cf-e375ac)\n\t;;' + patch)
    with open(fpath, "w") as f:
        f.write(content)
    print(">>> 01_leds patched")

def patch_network():
    fpath = f"{BASE}/target/linux/ath79/generic/base-files/etc/board.d/02_network"
    if not os.path.exists(fpath):
        print("!!! 02_network not found")
        return
    with open(fpath, "r") as f:
        content = f.read()
    patch = '\ncomfast,cf-wa350)\n\tucidef_add_switch "switch0" "0@eth0" "1:wan" "2:lan"\n\t;;\n'
    if "comfast,cf-wa350)" in content:
        print(">>> 02_network already patched")
        return
    content = content.replace('comfast,cf-e375ac)\n\t\t;;', 'comfast,cf-e375ac)\n\t\t;;' + patch)
    with open(fpath, "w") as f:
        f.write(content)
    print(">>> 02_network patched")

def patch_network_mac():
    fpath = f"{BASE}/target/linux/ath79/generic/base-files/etc/board.d/02_network"
    with open(fpath, "r") as f:
        content = f.read()
    patch = '\tcomfast,cf-wa350)\n\t\twan_mac=$(macaddr_add $(mtd_get_mac_binary art 0x0) 1)\n\t\t;;\n'
    if "comfast,cf-wa350)" in content and "wan_mac=" in content:
        print(">>> 02_network MAC already patched")
        return
    # Add before the last "esac" in ath79_setup_macs function
    content = content.replace('\tesac\n}\n\n', '\tcomfast,cf-wa350)\n\t\twan_mac=$(macaddr_add $(mtd_get_mac_binary art 0x0) 1)\n\t\t;;\n\tesac\n}\n\n')
    with open(fpath, "w") as f:
        f.write(content)
    print(">>> 02_network MAC patched")

def patch_caldata():
    fpath = f"{BASE}/target/linux/ath79/generic/base-files/etc/hotplug.d/firmware/11-ath10k-caldata"
    if not os.path.exists(fpath):
        print("!!! 11-ath10k-caldata not found")
        return
    with open(fpath, "r") as f:
        content = f.read()
    if "comfast,cf-wa350)|\\" in content:
        print(">>> 11-ath10k-caldata already patched")
        return
    content = content.replace('comfast,cf-e375ac)|\\', 'comfast,cf-wa350)|\\\n\tcomfast,cf-e375ac)|\\')
    with open(fpath, "w") as f:
        f.write(content)
    print(">>> 11-ath10k-caldata patched")

def patch_generic_mk():
    fpath = f"{BASE}/target/linux/ath79/image/generic.mk"
    if not os.path.exists(fpath):
        print("!!! generic.mk not found")
        return
    with open(fpath, "r") as f:
        content = f.read()
    patch = '\ndefine Device/comfast_cf-wa350\n $(Device/uimage-lzma-loader)\n  SOC := qca9563\n  DEVICE_VENDOR := COMFAST\n  DEVICE_MODEL := CF-WA350\n  DEVICE_PACKAGES := kmod-ath10k-ct-smallbuffers \\\n    ath10k-firmware-qca9888-ct  -uboot-envtools\n  IMAGE_SIZE := 16000k\n  SUPPORTED_DEVICES += comfast,cf-wa350\nendef\nTARGET_DEVICES += comfast_cf-wa350\n'
    if "comfast_cf-wa350" in content:
        print(">>> generic.mk already patched")
        return
    with open(fpath, "a") as f:
        f.write(patch)
    print(">>> generic.mk patched")

def copy_dts():
    src = "dts/qca9563_comfast_cf-wa350.dts"
    dst = f"{BASE}/target/linux/ath79/dts/qca9563_comfast_cf-wa350.dts"
    if not os.path.exists(src):
        print("!!! DTS source not found")
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(src, "r") as f:
        data = f.read()
    with open(dst, "w") as f:
        f.write(data)
    print(">>> DTS copied")

if __name__ == "__main__":
    copy_dts()
    patch_generic_mk()
    patch_leds()
    patch_network()
    patch_network_mac()
    patch_caldata()
    print(">>> All patches applied!")
