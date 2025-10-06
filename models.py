# Data Models - models.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict

class Device(BaseModel):
    """Device information model"""
    id: str
    name: str
    device_path: str
    mountpoint: str
    fstype: str
    type: str
    total_size: int
    used_size: int
    free_size: int
    serial: Optional[str] = None
    model: Optional[str] = None
    vendor: Optional[str] = None
    removable: bool = False
    identification_method: str = "psutil"
    os_type: str

class WipeRequest(BaseModel):
    """Request to start a wipe operation"""
    device_id: str
    mode: str = "simulation"  # simulation, dry-run, or real (disabled)
    passes: int = 3
    standard: str = "dod"  # nist, dod, gutmann

class WipeSession(BaseModel):
    """Wipe session information"""
    wipe_id: str
    device_id: str
    mode: str
    passes: int
    standard: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str = "initialized"

class WipeProgress(BaseModel):
    """Wipe progress update"""
    wipe_id: str
    status: str
    progress: float
    current_pass: int
    total_passes: int
    phase: str
    elapsed_time: float
    estimated_remaining: float
    mode: str
    details: Optional[str] = None

class Certificate(BaseModel):
    """Certificate information"""
    cert_id: str
    wipe_id: str
    device_id: str
    generated_at: datetime
    file_path: str