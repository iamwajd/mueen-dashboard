import sys
import time
import subprocess
import cv2
import numpy as np
import imageio_ffmpeg
from ultralytics import YOLO

input_video_path = "d:/mueen/data/input.mp4"
model_path = "d:/mueen/weights/best.pt"
temp_output_path = "d:/GP-Front-re-main - Copy (2)/public/temp_boxes.mp4"
final_output_path = "d:/GP-Front-re-main - Copy (2)/public/output_result_boxes.mp4"

print("Loading YOLO model from:", model_path)
model = YOLO(model_path)

cap = cv2.VideoCapture(input_video_path)
if not cap.isOpened():
    print("Error: Could not open input video:", input_video_path)
    sys.exit(1)

w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
total_frames = 194  # match original output_result.mp4 length for seamless looping

print(f"Input video properties: {w}x{h} @ {fps:.2f} FPS. Processing {total_frames} frames...")

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
writer = cv2.VideoWriter(temp_output_path, fourcc, fps, (w, h))

frame_idx = 0
start_time = time.time()

# Sleek bounding box color: Emerald green BGR (115, 230, 0)
BOX_COLOR = (115, 230, 0)
CORNER_COLOR = (140, 255, 60)

while frame_idx < total_frames and cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Track pedestrians with ByteTrack (NO HEATMAP)
    results = model.track(
        frame,
        persist=True,
        tracker="bytetrack.yaml",
        conf=0.25,
        iou=0.5,
        verbose=False,
    )[0]

    boxes = results.boxes
    if boxes is not None and boxes.xyxy is not None:
        coords = boxes.xyxy.cpu().numpy()
        ids = boxes.id.int().cpu().tolist() if boxes.id is not None else [None] * len(coords)

        for box, tid in zip(coords, ids):
            x1, y1, x2, y2 = map(int, box)
            bw = x2 - x1

            # Draw clean tracking bounding box (NO HEATMAP)
            cv2.rectangle(frame, (x1, y1), (x2, y2), BOX_COLOR, 1, cv2.LINE_AA)

            # Draw subtle corner accents
            c_len = min(8, max(4, bw // 4))
            cv2.line(frame, (x1, y1), (x1 + c_len, y1), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x1, y1), (x1, y1 + c_len), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x2, y1), (x2 - c_len, y1), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x2, y1), (x2, y1 + c_len), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x1, y2), (x1 + c_len, y2), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x1, y2), (x1, y2 - c_len), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x2, y2), (x2 - c_len, y2), CORNER_COLOR, 2, cv2.LINE_AA)
            cv2.line(frame, (x2, y2), (x2, y2 - c_len), CORNER_COLOR, 2, cv2.LINE_AA)

            # Optional ID tag
            if tid is not None:
                id_text = str(tid)
                font_scale = 0.35
                thickness = 1
                (tw, th), _ = cv2.getTextSize(id_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                ty = max(y1 - 3, th + 2)
                cv2.rectangle(frame, (x1, ty - th - 2), (x1 + tw + 4, ty + 2), (10, 24, 18), -1)
                cv2.putText(frame, id_text, (x1 + 2, ty), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (180, 255, 200), thickness, cv2.LINE_AA)

    writer.write(frame)
    frame_idx += 1
    if frame_idx % 25 == 0 or frame_idx == total_frames:
        elapsed = time.time() - start_time
        print(f"Processed {frame_idx}/{total_frames} frames ({(frame_idx/elapsed):.1f} fps)...", flush=True)

cap.release()
writer.release()
print("OpenCV rendering complete in", round(time.time() - start_time, 1), "seconds. Transcoding to H.264...", flush=True)

# Transcode to standard H.264 (AVC1) with faststart
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_cmd = [
    ffmpeg_exe,
    "-y",
    "-i", temp_output_path,
    "-c:v", "libx264",
    "-profile:v", "baseline",
    "-level", "3.0",
    "-pix_fmt", "yuv420p",
    "-preset", "fast",
    "-crf", "22",
    "-movflags", "+faststart",
    final_output_path,
]

res = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
if res.returncode == 0:
    print("Success! Created H.264 video with boxes only (NO heatmap):", final_output_path, flush=True)
else:
    print("FFmpeg error:", res.stderr, flush=True)
