"""
Hydro & CamIP Simulation Cloud Backend — Optimized for Render Free Tier (<45MB RAM)
- Không phụ thuộc RTSP nội bộ hay PyTorch/OpenCV nặng
- Đồng bộ trực tiếp dữ liệu thủy điện thời gian thực từ PCTT Đà Nẵng + 9 trạm sông hạ du
- Cung cấp API & WebSocket mô phỏng trực quan Trạm CamIP (Vùng nước, Giả lập sự cố 20s 10s Trước + 10s Sau)
"""

import asyncio
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import hydrology_service

VN_TZ = timezone(timedelta(hours=7))


def _vn_now_str() -> str:
    return datetime.now(VN_TZ).strftime("%Y-%m-%d %H:%M:%S")


app = FastAPI(
    title="Hydro & CamIP Simulation Cloud API",
    version="3.0.0-cloud",
    description="Backend Cloud chạy trên Render cho Dashboard Bão Lũ & Mô Phỏng CamIP (Frontend Vercel)",
)

# Cấu hình CORS chuẩn cho phép mọi domain Vercel (*.vercel.app) và localhost gọi API + WebSocket
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trạng thái mô phỏng dùng chung giữa các phiên truy cập
water_zone_points: List[Tuple[float, float]] = [
    (0.08, 0.46),
    (0.92, 0.44),
    (0.96, 0.94),
    (0.04, 0.94),
]
current_threat_level: str = "SAFE"
active_websockets: List[WebSocket] = []

# Khởi tạo sẵn 2 bản ghi mô phỏng mẫu để Kho Video 20s có dữ liệu trình diễn ngay khi mở trang
_seed_ts_1 = (datetime.now(VN_TZ) - timedelta(minutes=25)).strftime("%Y-%m-%d %H:%M:%S")
_seed_ts_2 = (datetime.now(VN_TZ) - timedelta(hours=1, minutes=40)).strftime("%Y-%m-%d %H:%M:%S")

simulated_recordings: List[Dict[str, Any]] = [
    {
        "id": "sim_fall_demo_02",
        "filename": "sim_fall_demo_02.webm",
        "station_id": "cam-dbt-primary",
        "station_name": "Trạm CamIP — Điện Bàn Tây (Gò Nổi)",
        "created_at": _seed_ts_1,
        "duration": 20.0,
        "fall_time_offset": 10.0,
        "fall_ratio": 0.5,
        "size_mb": 2.4,
        "is_test": True,
        "simulation": True,
        "video_url": "sim://sim_fall_demo_02",
        "web_video_url": "sim://sim_fall_demo_02",
    },
    {
        "id": "sim_fall_demo_01",
        "filename": "sim_fall_demo_01.webm",
        "station_id": "cam-caulau-ha-du",
        "station_name": "Trạm CamIP — Cầu Câu Lâu (Hạ Du)",
        "created_at": _seed_ts_2,
        "duration": 20.0,
        "fall_time_offset": 10.0,
        "fall_ratio": 0.5,
        "size_mb": 2.6,
        "is_test": False,
        "simulation": True,
        "video_url": "sim://sim_fall_demo_01",
        "web_video_url": "sim://sim_fall_demo_01",
    },
]

alert_history: List[Dict[str, Any]] = [
    {
        "id": "sim_fall_demo_02",
        "type": "WATER_FALL_DETECTED",
        "title": "[MÔ PHỎNG] PHÁT HIỆN NGƯỜI RƠI XUỐNG NƯỚC!",
        "message": "Mô phỏng kịch bản trượt chân tại bến sông Thu Bồn — Điện Bàn Tây (đã lưu 10s trước & 10s sau).",
        "track_id": 99,
        "confidence": 0.98,
        "timestamp": _seed_ts_1,
        "video_url": "sim://sim_fall_demo_02",
        "web_video_url": "sim://sim_fall_demo_02",
        "video_status": "READY",
        "video_duration": 20.0,
        "fall_ratio": 0.5,
        "is_test": True,
        "simulation": True,
    },
    {
        "id": "sim_fall_demo_01",
        "type": "WATER_FALL_DETECTED",
        "title": "CẢNH BÁO MÔ PHỎNG: NGƯỜI RƠI VÀO VÙNG NƯỚC SÂU!",
        "message": "Kịch bản mẫu kiểm thử quy trình cảnh báo khẩn cấp & trích xuất 20s sự cố tại Cầu Câu Lâu.",
        "track_id": 14,
        "confidence": 0.95,
        "timestamp": _seed_ts_2,
        "video_url": "sim://sim_fall_demo_01",
        "web_video_url": "sim://sim_fall_demo_01",
        "video_status": "READY",
        "video_duration": 20.0,
        "fall_ratio": 0.5,
        "is_test": False,
        "simulation": True,
    },
]


class WaterZoneRequest(BaseModel):
    points: List[Tuple[float, float]]


class CommunityReportRequest(BaseModel):
    name: str
    content: str


class TriggerSimRequest(BaseModel):
    station_id: str = "cam-dbt-primary"
    station_name: str = "Trạm CamIP — Điện Bàn Tây (Gò Nổi)"


async def broadcast_ws(payload: Dict[str, Any]) -> None:
    dead: List[WebSocket] = []
    raw = json.dumps(payload, ensure_ascii=False)
    for ws in list(active_websockets):
        try:
            await ws.send_text(raw)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_websockets:
            active_websockets.remove(ws)


@app.get("/")
def root():
    return {
        "service": "Hydro & CamIP Simulation Cloud Backend",
        "mode": "CLOUD_SIMULATION",
        "status": "RUNNING",
        "docs": "/docs",
        "endpoints": [
            "/health",
            "/api/status",
            "/api/hydrology/snapshot",
            "/api/hydrology/history",
            "/api/hydrology/community",
            "/api/test/trigger-fall",
        ],
    }


@app.get("/health")
def health_check():
    return {"ok": True, "timestamp": _vn_now_str()}


@app.get("/api/status")
def get_status():
    return {
        "status": "ONLINE",
        "mode": "CLOUD_SIMULATION",
        "threat_level": current_threat_level,
        "is_camera_connected": True,
        "camera_info": {
            "name": "Cloud Interactive River Simulator (60 FPS)",
            "fps": 30,
            "simulation": True,
        },
        "active_clients": len(active_websockets),
        "total_alerts": len(alert_history),
        "total_recordings": len(simulated_recordings),
        "water_zone": water_zone_points,
    }


@app.post("/api/config/water-zone")
def save_water_zone(req: WaterZoneRequest):
    global water_zone_points
    if len(req.points) < 3:
        raise HTTPException(status_code=400, detail="Đa giác vùng nước cần ít nhất 3 đỉnh")
    water_zone_points = [(round(float(x), 3), round(float(y), 3)) for x, y in req.points]
    return {
        "status": "SUCCESS",
        "message": f"Đã lưu Vùng Nước mô phỏng ({len(water_zone_points)} đỉnh)",
        "points": water_zone_points,
    }


@app.post("/api/config/water-zone/auto-detect")
def auto_detect_water_zone():
    global water_zone_points
    water_zone_points = [
        (0.06, 0.45),
        (0.38, 0.43),
        (0.68, 0.44),
        (0.95, 0.46),
        (0.97, 0.95),
        (0.03, 0.95),
    ]
    return {
        "status": "SUCCESS",
        "message": f"Đã tự động khớp biên mặt nước sông ({len(water_zone_points)} đỉnh)",
        "points": water_zone_points,
    }


@app.get("/api/alerts")
def get_alerts():
    return {"alerts": alert_history}


@app.get("/api/videos")
def list_videos():
    return {"videos": simulated_recordings}


async def _complete_simulated_recording(incident_id: str, station_id: str, station_name: str, created_at: str):
    global current_threat_level
    await asyncio.sleep(10.0)
    current_threat_level = "SAFE"

    rec_item = {
        "id": incident_id,
        "filename": f"{incident_id}.webm",
        "station_id": station_id,
        "station_name": station_name,
        "created_at": created_at,
        "duration": 20.0,
        "fall_time_offset": 10.0,
        "fall_ratio": 0.5,
        "size_mb": 2.5,
        "is_test": True,
        "simulation": True,
        "video_url": f"sim://{incident_id}",
        "web_video_url": f"sim://{incident_id}",
    }
    simulated_recordings.insert(0, rec_item)
    del simulated_recordings[30:]

    for item in alert_history:
        if item.get("id") == incident_id:
            item["video_status"] = "READY"
            item["video_duration"] = 20.0
            item["fall_ratio"] = 0.5
            break

    await broadcast_ws({
        "type": "VIDEO_RECORDED",
        "id": incident_id,
        "alert_id": incident_id,
        "video_url": f"sim://{incident_id}",
        "web_video_url": f"sim://{incident_id}",
        "duration": 20.0,
        "fall_time_offset": 10.0,
        "fall_ratio": 0.5,
        "timestamp": created_at,
        "simulation": True,
    })


@app.post("/api/test/trigger-fall")
async def trigger_simulated_fall(req: TriggerSimRequest | None = None):
    global current_threat_level
    station_id = req.station_id if req else "cam-dbt-primary"
    station_name = req.station_name if req else "Trạm CamIP — Điện Bàn Tây (Gò Nổi)"

    now_epoch = int(time.time())
    incident_id = f"sim_fall_{now_epoch}"
    created_at = _vn_now_str()
    current_threat_level = "CRITICAL"

    alert_event = {
        "id": incident_id,
        "type": "WATER_FALL_DETECTED",
        "title": "[MÔ PHỎNG] PHÁT HIỆN NGƯỜI RƠI XUỐNG NƯỚC!",
        "message": f"Kích hoạt kịch bản rơi xuống nước tại {station_name}. Đang thu 10s trước & 10s sau sự cố...",
        "track_id": 99,
        "confidence": 0.98,
        "timestamp": created_at,
        "station_id": station_id,
        "station_name": station_name,
        "video_url": f"sim://{incident_id}",
        "web_video_url": f"sim://{incident_id}",
        "video_status": "RECORDING",
        "is_test": True,
        "simulation": True,
    }
    alert_history.insert(0, alert_event)
    del alert_history[50:]

    await broadcast_ws(alert_event)
    asyncio.create_task(_complete_simulated_recording(incident_id, station_id, station_name, created_at))

    return {
        "status": "SUCCESS",
        "message": f"Đã kích hoạt mô phỏng sự cố #{incident_id}",
        "alert": alert_event,
    }


@app.get("/api/hydrology/snapshot")
def api_hydrology_snapshot():
    return hydrology_service.get_hydrology_snapshot()


@app.get("/api/hydrology/history")
def api_hydrology_history(keys: str = "hoi-an,ai-nghia,cau-lau", hours: int = 24):
    key_list = [k.strip() for k in keys.split(",") if k.strip()]
    return {"series": hydrology_service.get_hydrology_history(key_list, hours=hours)}


@app.get("/api/hydrology/community")
def api_list_community():
    return {"reports": hydrology_service.list_community_reports()}


@app.post("/api/hydrology/community")
def api_create_community(req: CommunityReportRequest):
    if not req.name.strip() or not req.content.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập tên và nội dung báo cáo")
    item = hydrology_service.add_community_report(req.name, req.content)
    return {"status": "SUCCESS", "report": item}


@app.delete("/api/hydrology/community/{report_id}")
def api_delete_community(report_id: int):
    removed = hydrology_service.remove_community_report(report_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    return {"status": "SUCCESS"}


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    await websocket.send_text(json.dumps({
        "type": "CONNECTION_ESTABLISHED",
        "mode": "CLOUD_SIMULATION",
        "threat_level": current_threat_level,
        "water_zone": water_zone_points,
        "timestamp": _vn_now_str(),
    }))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception:
        if websocket in active_websockets:
            active_websockets.remove(websocket)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

