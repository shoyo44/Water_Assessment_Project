import argparse
import asyncio
import json

import websockets


async def run(base_url: str, hostel_id: str, messages: int) -> None:
    ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{ws_url}/api/v1/dashboard/ws/live?hostel_id={hostel_id}"
    print(f"Connecting to: {ws_url}")

    received = 0
    async with websockets.connect(ws_url, ping_interval=20, ping_timeout=20) as ws:
        while received < messages:
            raw = await ws.recv()
            payload = json.loads(raw)
            print(json.dumps(payload, indent=2))
            received += 1

    print(f"Received {received} websocket messages. PASS")


def main() -> None:
    parser = argparse.ArgumentParser(description="WebSocket smoke test for live dashboard stream.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Backend HTTP base URL")
    parser.add_argument("--hostel-id", required=True, help="Hostel ID to subscribe")
    parser.add_argument("--messages", type=int, default=2, help="Number of messages to collect before exit")
    args = parser.parse_args()

    asyncio.run(run(args.base_url, args.hostel_id, args.messages))


if __name__ == "__main__":
    main()

