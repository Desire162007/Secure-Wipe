# Device Scanner - device_scanner.py
import psutil
import platform
import asyncio
import logging
from typing import List, Dict, Optional
import subprocess
import json

# Optional OS-specific imports
try:
    if platform.system() == "Linux":
        import pyudev
        PYUDEV_AVAILABLE = True
    else:
        PYUDEV_AVAILABLE = False
except ImportError:
    PYUDEV_AVAILABLE = False

try:
    if platform.system() == "Windows":
        import wmi
        WMI_AVAILABLE = True
    else:
        WMI_AVAILABLE = False
except ImportError:
    WMI_AVAILABLE = False

logger = logging.getLogger(__name__)

class DeviceScanner:
    """Cross-platform device scanner for storage devices"""
    
    def __init__(self):
        self.os_type = platform.system()
        logger.info(f"Initialized DeviceScanner for {self.os_type}")
        
    async def scan_devices(self) -> List[Dict]:
        """Scan for all attached storage devices"""
        devices = []
        
        # Get basic partition information using psutil
        partitions = psutil.disk_partitions(all=True)
        
        for partition in partitions:
            try:
                device_info = await self._analyze_partition(partition)
                if device_info:
                    devices.append(device_info)
            except Exception as e:
                logger.warning(f"Error analyzing partition {partition.device}: {e}")
                
        # Enhance with OS-specific information
        if self.os_type == "Linux" and PYUDEV_AVAILABLE:
            devices = await self._enhance_linux_devices(devices)
        elif self.os_type == "Windows" and WMI_AVAILABLE:
            devices = await self._enhance_windows_devices(devices)
            
        # Filter for removable/external devices
        external_devices = [d for d in devices if self._is_external_device(d)]
        
        logger.info(f"Found {len(external_devices)} external devices out of {len(devices)} total")
        return external_devices
    
    async def _analyze_partition(self, partition) -> Optional[Dict]:
        """Analyze a partition and extract device information"""
        try:
            # Get usage statistics
            try:
                usage = psutil.disk_usage(partition.mountpoint)
            except (PermissionError, OSError):
                usage = None
                
            # Determine device type
            device_type = self._determine_device_type(partition)
            
            device_info = {
                "id": self._generate_device_id(partition.device),
                "name": partition.device,
                "device_path": partition.device,
                "mountpoint": partition.mountpoint,
                "fstype": partition.fstype,
                "type": device_type,
                "total_size": usage.total if usage else 0,
                "used_size": usage.used if usage else 0,
                "free_size": usage.free if usage else 0,
                "opts": partition.opts,
                "serial": None,  # Will be populated by OS-specific enhancement
                "model": None,
                "vendor": None,
                "removable": False,
                "identification_method": "psutil",
                "os_type": self.os_type
            }
            
            return device_info
            
        except Exception as e:
            logger.error(f"Error analyzing partition {partition.device}: {e}")
            return None
    
    def _determine_device_type(self, partition) -> str:
        """Determine the type of device based on partition information"""
        device = partition.device.lower()
        opts = partition.opts.lower() if partition.opts else ""
        
        if "removable" in opts or "usb" in device:
            return "USB"
        elif "sd" in device or "mmc" in device:
            return "SD_CARD"
        elif "nvme" in device:
            return "NVME_SSD"
        elif "ssd" in device:
            return "SSD"
        elif any(x in device for x in ["hd", "disk", "drive"]):
            return "HDD"
        else:
            return "UNKNOWN"
    
    def _generate_device_id(self, device_path: str) -> str:
        """Generate a unique ID for the device"""
        return f"dev_{hash(device_path) % 10000}"
    
    async def _enhance_linux_devices(self, devices: List[Dict]) -> List[Dict]:
        """Enhance device information using Linux-specific tools"""
        if not PYUDEV_AVAILABLE:
            return devices
            
        try:
            context = pyudev.Context()
            
            for device in devices:
                try:
                    # Find the device in udev
                    udev_device = pyudev.Devices.from_device_file(context, device['device_path'])
                    
                    if udev_device:
                        # Get additional properties
                        device['serial'] = udev_device.get('ID_SERIAL_SHORT')
                        device['model'] = udev_device.get('ID_MODEL')
                        device['vendor'] = udev_device.get('ID_VENDOR')
                        device['removable'] = udev_device.get('REMOVABLE') == '1'
                        device['identification_method'] = "pyudev"
                        
                except Exception as e:
                    logger.warning(f"Could not enhance device {device['device_path']} with pyudev: {e}")
                    
        except Exception as e:
            logger.error(f"pyudev enhancement failed: {e}")
            
        return devices
    
    async def _enhance_windows_devices(self, devices: List[Dict]) -> List[Dict]:
        """Enhance device information using Windows WMI"""
        if not WMI_AVAILABLE:
            return devices
            
        try:
            c = wmi.WMI()
            
            # Get disk drives
            disk_drives = c.Win32_DiskDrive()
            
            for device in devices:
                for disk in disk_drives:
                    try:
                        # Match by device path
                        if device['device_path'].replace('\\', '').replace(':', '') in str(disk.DeviceID).replace('\\', ''):
                            device['serial'] = disk.SerialNumber
                            device['model'] = disk.Model
                            device['vendor'] = disk.Manufacturer
                            device['removable'] = disk.MediaType == 'Removable Media'
                            device['interface_type'] = disk.InterfaceType
                            device['identification_method'] = "wmi"
                            break
                            
                    except Exception as e:
                        logger.warning(f"Could not enhance device with WMI: {e}")
                        
        except Exception as e:
            logger.error(f"WMI enhancement failed: {e}")
            
        return devices
    
    def _is_external_device(self, device: Dict) -> bool:
        """Determine if a device is external/removable"""
        # Check if explicitly marked as removable
        if device.get('removable'):
            return True
            
        # Check device type
        if device['type'] in ['USB', 'SD_CARD']:
            return True
            
        # Check mount options
        opts = device.get('opts', '').lower()
        if any(keyword in opts for keyword in ['removable', 'usb', 'external']):
            return True
            
        # Check device path patterns
        device_path = device.get('device_path', '').lower()
        if self.os_type == "Linux":
            # Common USB/removable device patterns
            if any(pattern in device_path for pattern in ['/dev/sd', '/dev/usb', '/media', '/mnt']):
                return True
        elif self.os_type == "Windows":
            # Windows removable drive patterns
            if device_path.startswith(('d:', 'e:', 'f:', 'g:', 'h:', 'i:', 'j:', 'k:')):
                return True
                
        return False
    
    async def get_device_details(self, device_id: str) -> Optional[Dict]:
        """Get detailed information about a specific device"""
        devices = await self.scan_devices()
        
        for device in devices:
            if device['id'] == device_id:
                # Add additional details
                device['smart_data'] = await self._get_smart_data(device)
                device['detailed_scan_time'] = psutil.boot_time()
                return device
                
        return None
    
    async def _get_smart_data(self, device: Dict) -> Optional[Dict]:
        """Get SMART attributes if available (bonus feature)"""
        try:
            # This would require additional tools like smartctl
            # For now, return placeholder
            return {
                "available": False,
                "reason": "SMART data requires additional tools (smartctl)"
            }
        except Exception as e:
            logger.warning(f"Could not get SMART data: {e}")
            return None