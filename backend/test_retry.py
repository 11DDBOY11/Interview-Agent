import asyncio
import time
import logging
from groq import RateLimitError
import httpx
import llm

# Setup basic logging to see tenacity output
logging.basicConfig(level=logging.WARNING)

# Override the client call temporarily
original_call = llm._call

call_count = 0

@llm._make_retry()
async def fake_call(system: str, user: str, max_tokens: int = 512) -> str:
    global call_count
    call_count += 1
    if call_count < 3:
        print(f"Simulating RateLimitError (Attempt {call_count})")
        # Throw a fake RateLimitError
        response = httpx.Response(429, request=httpx.Request("POST", "https://api.groq.com"))
        raise RateLimitError("Rate limited!", response=response, body=None)
    
    print(f"Success on attempt {call_count}!")
    return "This works now."

async def run_test():
    llm._call = fake_call
    try:
        start = time.time()
        result = await llm.generate_opening({"member": {"name": "Test", "jobRole": "Test"}})
        duration = time.time() - start
        
        assert result == "This works now."
        assert call_count == 3
        print(f"Retry test passed! Total time: {duration:.2f}s")
    finally:
        llm._call = original_call

if __name__ == "__main__":
    asyncio.run(run_test())
