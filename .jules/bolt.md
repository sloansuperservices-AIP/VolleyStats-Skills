## 2024-05-22 - Video Analysis Pipelining
**Learning:** When processing video frames with async inference, `Promise.all` on batches creates "stop-and-wait" inefficiencies. The video element sits idle while waiting for network requests to finish.
**Action:** Use a sliding window concurrency pool (e.g., `Set<Promise>`) to pipeline frame extraction (serial) with inference (parallel). This keeps the video extraction loop busy and saturates the network without exceeding concurrency limits.
