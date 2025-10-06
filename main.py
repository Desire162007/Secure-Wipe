# FastAPI Backend - main.py
from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import asyncio
import uuid
import json
import logging
from datetime import datetime
from pathlib import Path
import os

# Local imports
from device_scanner import DeviceScanner
from wipe_simulator import WipeSimulator
from pdf_generator import CertificateGenerator
from models import WipeRequest, WipeSession, Device

# Create directories
os.makedirs("logs", exist_ok=True)
os.makedirs("certificates", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/securewipe.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SecureWipe API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Global state
device_scanner = DeviceScanner()
certificate_generator = CertificateGenerator()
active_wipes = {}

@app.get("/")
async def root():
    """Serve the main application"""
    return FileResponse("frontend/index.html")

@app.get("/api/devices")
async def get_devices():
    """Get list of all attached storage devices"""
    try:
        devices = await device_scanner.scan_devices()
        logger.info(f"Found {len(devices)} devices")
        return {"devices": devices}
    except Exception as e:
        logger.error(f"Device scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/device/{device_id}")
async def get_device_details(device_id: str):
    """Get detailed information about a specific device"""
    try:
        device = await device_scanner.get_device_details(device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        return device
    except Exception as e:
        logger.error(f"Device details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/wipe/start")
async def start_wipe(wipe_request: WipeRequest):
    """Start a wipe operation (simulation mode)"""
    try:
        wipe_id = str(uuid.uuid4())
        
        # Create wipe session
        session = WipeSession(
            wipe_id=wipe_id,
            device_id=wipe_request.device_id,
            mode=wipe_request.mode,
            passes=wipe_request.passes,
            standard=wipe_request.standard,
            started_at=datetime.utcnow()
        )
        
        # Initialize wipe simulator
        simulator = WipeSimulator(session)
        active_wipes[wipe_id] = {
            "session": session,
            "simulator": simulator
        }
        
        logger.info(f"Started wipe {wipe_id} for device {wipe_request.device_id}")
        
        return {
            "wipe_id": wipe_id,
            "status": "started",
            "mode": "SIMULATION",
            "estimated_duration": simulator.estimated_duration
        }
    except Exception as e:
        logger.error(f"Wipe start error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/progress/{wipe_id}")
async def websocket_progress(websocket: WebSocket, wipe_id: str):
    """WebSocket endpoint for real-time wipe progress"""
    await websocket.accept()
    
    if wipe_id not in active_wipes:
        await websocket.send_json({"error": "Wipe session not found"})
        await websocket.close()
        return
    
    simulator = active_wipes[wipe_id]["simulator"]
    session = active_wipes[wipe_id]["session"]
    
    try:
        # Start the simulation
        async for progress in simulator.simulate_wipe():
            await websocket.send_json(progress)
            
            if progress.get("completed"):
                # Generate certificate
                cert_id = await certificate_generator.generate_certificate(session, progress)
                await websocket.send_json({
                    "completed": True,
                    "certificate_id": cert_id,
                    "download_url": f"/api/certificate/{cert_id}"
                })
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        # Clean up
        if wipe_id in active_wipes:
            del active_wipes[wipe_id]
        await websocket.close()

@app.get("/api/certificate/{cert_id}")
async def download_certificate(cert_id: str):
    """Download a generated certificate"""
    cert_path = f"certificates/{cert_id}.pdf"
    if os.path.exists(cert_path):
        return FileResponse(
            cert_path,
            media_type="application/pdf",
            filename=f"SecureWipe_Certificate_{cert_id}.pdf"
        )
    raise HTTPException(status_code=404, detail="Certificate not found")

@app.post("/api/demo/fake-wipe")
async def demo_fake_wipe():
    """Demo endpoint that creates a fake wipe for investor presentations"""
    fake_device = {
        "id": "demo_device",
        "name": "Demo USB Drive",
        "type": "USB",
        "size": "16GB",
        "path": "/demo/device"
    }
    
    wipe_request = WipeRequest(
        device_id="demo_device",
        mode="simulation",
        passes=3,
        standard="dod"
    )
    
    return await start_wipe(wipe_request)

@app.get("/api/logs")
async def get_audit_logs():
    """Get audit logs (local only)"""
    try:
        log_file = "logs/securewipe.log"
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = f.readlines()[-100:]  # Last 100 lines
            return {"logs": logs}
        return {"logs": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)