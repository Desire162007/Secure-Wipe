# Wipe Simulator - wipe_simulator.py
import asyncio
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, AsyncGenerator
from models import WipeSession

logger = logging.getLogger(__name__)

class WipeSimulator:
    """Safe wipe simulation with realistic progress and timing"""
    
    def __init__(self, session: WipeSession):
        self.session = session
        self.start_time = datetime.utcnow()
        self.current_pass = 0
        self.progress_percent = 0
        self.is_cancelled = False
        
        # Calculate realistic timing based on standard and device size
        self.estimated_duration = self._calculate_duration()
        
        logger.info(f"Initialized WipeSimulator for {session.wipe_id}")
    
    def _calculate_duration(self) -> int:
        """Calculate realistic duration based on wipe standard and simulated device size"""
        # Simulated device size (in practice, would get from actual device)
        simulated_size_gb = 16  # 16GB USB drive simulation
        
        # Time per GB for different standards
        time_per_gb = {
            "nist": 2,      # 2 minutes per GB for NIST SP 800-88
            "dod": 6,       # 6 minutes per GB for DoD 5220.22-M
            "gutmann": 70   # 70 minutes per GB for Gutmann 35-pass
        }
        
        base_time = time_per_gb.get(self.session.standard, 6)
        total_minutes = simulated_size_gb * base_time
        
        # Convert to seconds for simulation (scaled down for demo)
        return min(total_minutes * 2, 120)  # Max 2 minutes for demo
    
    async def simulate_wipe(self) -> AsyncGenerator[Dict, None]:
        """Simulate the wipe process with realistic progress updates"""
        logger.info(f"Starting wipe simulation for {self.session.wipe_id}")
        
        # Initial status
        yield {
            "wipe_id": self.session.wipe_id,
            "status": "initializing",
            "progress": 0,
            "current_pass": 0,
            "total_passes": self.session.passes,
            "phase": "Device verification",
            "elapsed_time": 0,
            "estimated_remaining": self.estimated_duration,
            "mode": "SIMULATION"
        }
        
        await asyncio.sleep(1)
        
        # Phase 1: Device verification
        yield {
            "wipe_id": self.session.wipe_id,
            "status": "verifying",
            "progress": 5,
            "current_pass": 0,
            "total_passes": self.session.passes,
            "phase": "Device verification and preparation",
            "elapsed_time": 1,
            "estimated_remaining": self.estimated_duration - 1,
            "mode": "SIMULATION",
            "details": "Verifying device accessibility and preparing secure channels"
        }
        
        await asyncio.sleep(2)
        
        # Phase 2: Security initialization
        yield {
            "wipe_id": self.session.wipe_id,
            "status": "initializing_security",
            "progress": 10,
            "current_pass": 0,
            "total_passes": self.session.passes,
            "phase": "Security protocol initialization",
            "elapsed_time": 3,
            "estimated_remaining": self.estimated_duration - 3,
            "mode": "SIMULATION",
            "details": f"Initializing {self.session.standard.upper()} security protocols"
        }
        
        await asyncio.sleep(2)
        
        # Phase 3: Data overwrite passes
        progress_per_pass = 80 / self.session.passes  # 80% of progress for actual wiping
        
        for pass_num in range(1, self.session.passes + 1):
            self.current_pass = pass_num
            
            # Simulate pass progress
            for pass_progress in range(0, 101, 5):
                if self.is_cancelled:
                    yield self._cancelled_status()
                    return
                
                overall_progress = 10 + ((pass_num - 1) * progress_per_pass) + (pass_progress * progress_per_pass / 100)
                elapsed = time.time() - self.start_time.timestamp()
                
                yield {
                    "wipe_id": self.session.wipe_id,
                    "status": "wiping",
                    "progress": round(overall_progress, 1),
                    "current_pass": pass_num,
                    "total_passes": self.session.passes,
                    "pass_progress": pass_progress,
                    "phase": f"Data overwrite pass {pass_num}/{self.session.passes}",
                    "elapsed_time": round(elapsed, 1),
                    "estimated_remaining": max(0, self.estimated_duration - elapsed),
                    "mode": "SIMULATION",
                    "details": self._get_pass_details(pass_num),
                    "pattern": self._get_overwrite_pattern(pass_num)
                }
                
                # Variable delay to simulate realistic I/O patterns
                delay = 0.3 + (0.2 * (pass_num / self.session.passes))
                await asyncio.sleep(delay)
        
        # Phase 4: Verification
        yield {
            "wipe_id": self.session.wipe_id,
            "status": "verifying",
            "progress": 92,
            "current_pass": self.session.passes,
            "total_passes": self.session.passes,
            "phase": "Verification and validation",
            "elapsed_time": round(time.time() - self.start_time.timestamp(), 1),
            "estimated_remaining": 5,
            "mode": "SIMULATION",
            "details": "Verifying successful data destruction"
        }
        
        await asyncio.sleep(3)
        
        # Phase 5: Completion
        elapsed_total = time.time() - self.start_time.timestamp()
        completion_time = datetime.utcnow()
        
        yield {
            "wipe_id": self.session.wipe_id,
            "status": "completed",
            "progress": 100,
            "current_pass": self.session.passes,
            "total_passes": self.session.passes,
            "phase": "Wipe completed successfully",
            "elapsed_time": round(elapsed_total, 1),
            "estimated_remaining": 0,
            "mode": "SIMULATION",
            "details": "Secure wipe completed - generating certificate",
            "completed": True,
            "completed_at": completion_time.isoformat(),
            "summary": {
                "standard": self.session.standard.upper(),
                "passes": self.session.passes,
                "mode": "SIMULATION",
                "duration": round(elapsed_total, 1),
                "device_id": self.session.device_id
            }
        }
        
        logger.info(f"Wipe simulation completed for {self.session.wipe_id}")
    
    def _get_pass_details(self, pass_num: int) -> str:
        """Get detailed description of what happens in each pass"""
        if self.session.standard == "nist":
            return "Cryptographic erase using secure random patterns"
        elif self.session.standard == "dod":
            if pass_num == 1:
                return "Pass 1/3: Writing 0x00 (zeros) to all sectors"
            elif pass_num == 2:
                return "Pass 2/3: Writing 0xFF (ones) to all sectors"
            else:
                return "Pass 3/3: Writing cryptographic random data"
        elif self.session.standard == "gutmann":
            return f"Gutmann pass {pass_num}/35: Specialized overwrite pattern"
        else:
            return f"Secure overwrite pass {pass_num}/{self.session.passes}"
    
    def _get_overwrite_pattern(self, pass_num: int) -> str:
        """Get the overwrite pattern being used"""
        if self.session.standard == "dod":
            patterns = ["0x00", "0xFF", "Random"]
            return patterns[min(pass_num - 1, len(patterns) - 1)]
        elif self.session.standard == "gutmann":
            # Simplified Gutmann patterns for display
            gutmann_patterns = [
                "Random", "0x55", "0xAA", "0x92", "0x49", "0x24", "0x00", "0x11",
                "0x22", "0x33", "0x44", "0x55", "0x66", "0x77", "0x88", "0x99",
                "0xAA", "0xBB", "0xCC", "0xDD", "0xEE", "0xFF", "Random", "Random",
                "Random", "Random", "0x6D", "0xB6", "0xDB", "Random", "Random",
                "Random", "Random", "Random", "Random"
            ]
            return gutmann_patterns[min(pass_num - 1, len(gutmann_patterns) - 1)]
        else:
            return "Cryptographic Random"
    
    def cancel(self):
        """Cancel the wipe operation"""
        self.is_cancelled = True
        logger.info(f"Wipe {self.session.wipe_id} cancelled")
    
    def _cancelled_status(self) -> Dict:
        """Return cancellation status"""
        return {
            "wipe_id": self.session.wipe_id,
            "status": "cancelled",
            "progress": self.progress_percent,
            "current_pass": self.current_pass,
            "total_passes": self.session.passes,
            "phase": "Operation cancelled by user",
            "mode": "SIMULATION",
            "cancelled": True,
            "cancelled_at": datetime.utcnow().isoformat()
        }